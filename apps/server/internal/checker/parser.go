package checker

import (
	"errors"
	"net"
	"net/url"
	"strconv"
	"strings"
)

var ErrInvalidProxy = errors.New("invalid proxy format")

func ParseProxyLine(input string, defaultProtocol string) (ProxyTarget, error) {
	trimmed := strings.TrimSpace(input)
	if trimmed == "" {
		return ProxyTarget{}, ErrInvalidProxy
	}

	if strings.Contains(trimmed, "://") {
		return parseURLProxy(trimmed)
	}

	parts := strings.Split(trimmed, ":")
	if len(parts) < 2 {
		return ProxyTarget{}, ErrInvalidProxy
	}

	protocol := strings.ToLower(defaultProtocol)
	if protocol == "" {
		protocol = "socks5"
	}

	host := parts[0]
	port := parts[1]
	if host == "" || port == "" {
		return ProxyTarget{}, ErrInvalidProxy
	}

	// Validate port number
	portNum, err := strconv.Atoi(port)
	if err != nil || portNum < 1 || portNum > 65535 {
		return ProxyTarget{}, ErrInvalidProxy
	}

	if len(parts) >= 4 {
		return ProxyTarget{
			Address:  net.JoinHostPort(host, port),
			Protocol: protocol,
			Username: parts[2],
			Password: parts[3],
		}, nil
	}

	return ProxyTarget{
		Address:  net.JoinHostPort(host, port),
		Protocol: protocol,
	}, nil
}

func parseURLProxy(raw string) (ProxyTarget, error) {
	parsed, err := url.Parse(raw)
	if err != nil {
		return ProxyTarget{}, ErrInvalidProxy
	}

	if parsed.Host == "" {
		return ProxyTarget{}, ErrInvalidProxy
	}

	protocol := strings.ToLower(parsed.Scheme)
	if protocol == "" {
		protocol = "socks5"
	}

	// Validate port if specified
	if parsed.Port() != "" {
		portNum, err := strconv.Atoi(parsed.Port())
		if err != nil || portNum < 1 || portNum > 65535 {
			return ProxyTarget{}, ErrInvalidProxy
		}
	}

	var user, pass string
	if parsed.User != nil {
		user = parsed.User.Username()
		pass, _ = parsed.User.Password()
	}

	return ProxyTarget{
		Address:  parsed.Host,
		Protocol: protocol,
		Username: user,
		Password: pass,
	}, nil
}
