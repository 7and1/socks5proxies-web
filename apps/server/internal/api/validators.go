package api

import (
	"net"
	"regexp"
	"strconv"
	"strings"
	"unicode"
)

var (
	sqlInjectionPattern = regexp.MustCompile(`(?i)(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b|\-\-|;|\bOR\b.*=.*\bAND\b|\bAND\b.*=.*\bOR\b)`)
	xssPattern          = regexp.MustCompile(`(?i)<script[^>]*>.*?</script>|javascript:|on\w+\s*=`)

	hostPortPattern = regexp.MustCompile(`^([a-zA-Z0-9\-\.]+|\[[a-fA-F0-9\:]+\]):(\d{1,5})$`)
	ipPortPattern   = regexp.MustCompile(`^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\:(\d{1,5})$`)
	ipv6PortPattern = regexp.MustCompile(`^\[([a-fA-F0-9\:]+)\]:(\d{1,5})$`)
)

type ProxyListRequest struct {
	Limit    int    `json:"limit" binding:"min=1,max=500"`
	Protocol string `json:"protocol" binding:"omitempty,oneof=socks4 socks4a socks5 http https"`
	Country  string `json:"country" binding:"omitempty,alpha,len=2"`
	Anonymity string `json:"anonymity" binding:"omitempty,oneof=transparent anonymous elite"`
}

func ValidateProxyListRequest(req *ProxyListRequest) []ValidationError {
	var errors []ValidationError

	if req.Limit < 1 {
		req.Limit = 100
	}
	if req.Limit > 500 {
		errors = append(errors, ValidationError{
			Field:   "limit",
			Message: "limit cannot exceed 500",
		})
		req.Limit = 500
	}

	if req.Protocol != "" {
		validProtocols := map[string]bool{
			"socks4": true, "socks4a": true, "socks5": true, "http": true, "https": true,
		}
		if !validProtocols[strings.ToLower(req.Protocol)] {
			errors = append(errors, ValidationError{
				Field:   "protocol",
				Message: "protocol must be one of: socks4, socks4a, socks5, http, https",
			})
		}
	}

	if req.Country != "" {
		if len(req.Country) != 2 || !isAlpha(req.Country) {
			errors = append(errors, ValidationError{
				Field:   "country",
				Message: "country must be a valid 2-letter ISO code",
			})
		}
	}

	return errors
}

func ValidateProxyAddress(address string) []ValidationError {
	var errors []ValidationError

	address = strings.TrimSpace(address)

	if address == "" {
		return append(errors, ValidationError{
			Field:   "address",
			Message: "address cannot be empty",
		})
	}

	if ContainsSQLInjection(address) {
		return append(errors, ValidationError{
			Field:   "address",
			Message: "address contains potentially malicious content",
		})
	}

	if ContainsXSS(address) {
		return append(errors, ValidationError{
			Field:   "address",
			Message: "address contains potentially malicious content",
		})
	}

	var host string
	var portStr string

	if matches := ipPortPattern.FindStringSubmatch(address); len(matches) == 3 {
		host = matches[1]
		portStr = matches[2]
	} else if matches := ipv6PortPattern.FindStringSubmatch(address); len(matches) == 3 {
		host = "[" + matches[1] + "]"
		portStr = matches[2]
	} else if matches := hostPortPattern.FindStringSubmatch(address); len(matches) == 3 {
		host = matches[1]
		portStr = matches[2]
	} else if strings.Contains(address, ":") {
		parts := strings.Split(address, ":")
		if len(parts) == 2 {
			host = parts[0]
			portStr = parts[1]
		}
	} else {
		errors = append(errors, ValidationError{
			Field:   "address",
			Message: "address must be in format host:port",
		})
		return errors
	}

	if net.ParseIP(host) == nil && !isValidHostname(host) {
		errors = append(errors, ValidationError{
			Field:   "address",
			Message: "invalid host or IP address",
		})
	}

	port, err := strconv.Atoi(portStr)
	if err != nil || port < 1 || port > 65535 {
		errors = append(errors, ValidationError{
			Field:   "address",
			Message: "port must be between 1 and 65535",
		})
	}

	return errors
}

func isValidHostname(host string) bool {
	if len(host) == 0 || len(host) > 253 {
		return false
	}

	if host[len(host)-1] == '.' {
		host = host[:len(host)-1]
	}

	labels := strings.Split(host, ".")
	for _, label := range labels {
		if len(label) == 0 || len(label) > 63 {
			return false
		}

		if label[0] == '-' || label[len(label)-1] == '-' {
			return false
		}

		allAlphaNum := true
		for _, r := range label {
			if !unicode.IsLetter(r) && !unicode.IsDigit(r) && r != '-' {
				allAlphaNum = false
				break
			}
		}
		if !allAlphaNum {
			return false
		}
	}

	return true
}

func SanitizeInput(input string) string {
	input = strings.TrimSpace(input)
	input = strings.ReplaceAll(input, "\x00", "")
	input = strings.ReplaceAll(input, "\r", "")
	input = strings.ReplaceAll(input, "\n", " ")
	input = strings.ReplaceAll(input, "\t", " ")
	
	for len(input) > 1 && input[0] == ' ' {
		input = input[1:]
	}
	for len(input) > 1 && input[len(input)-1] == ' ' {
		input = input[:len(input)-1]
	}

	return input
}

func ContainsSQLInjection(input string) bool {
	return sqlInjectionPattern.MatchString(input)
}

func ContainsXSS(input string) bool {
	return xssPattern.MatchString(input)
}

func ValidateLimit(input string, min, max, defaultValue int) int {
	if input == "" {
		return defaultValue
	}

	val, err := strconv.Atoi(strings.TrimSpace(input))
	if err != nil {
		return defaultValue
	}

	if val < min {
		return min
	}
	if val > max {
		return max
	}
	return val
}

func ValidateProtocol(protocol string) string {
	protocol = strings.ToLower(strings.TrimSpace(protocol))
	validProtocols := map[string]bool{
		"socks4": true, "socks4a": true, "socks5": true, "http": true, "https": true,
	}
	if !validProtocols[protocol] {
		return ""
	}
	return protocol
}

func isAlpha(s string) bool {
	for _, r := range s {
		if !unicode.IsLetter(r) {
			return false
		}
	}
	return true
}
