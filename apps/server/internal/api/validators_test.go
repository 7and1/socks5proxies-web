package api

import "testing"

func TestValidateProxyAddress(t *testing.T) {
	validCases := []string{
		"127.0.0.1:8080",
		"192.168.1.1:3128",
		"example.com:1080",
		"proxy.example.com:8888",
	}

	for _, tc := range validCases {
		errs := ValidateProxyAddress(tc)
		if len(errs) > 0 {
			t.Errorf("expected no errors for %q, got %v", tc, errs)
		}
	}
}

func TestValidateProxyAddressInvalid(t *testing.T) {
	invalidCases := []struct {
		name    string
		address string
	}{
		{"empty", ""},
		{"no_port", "127.0.0.1"},
		{"invalid_port_high", "127.0.0.1:99999"},
		{"invalid_port_zero", "127.0.0.1:0"},
		{"invalid_port_text", "127.0.0.1:abc"},
		{"sql_injection", "127.0.0.1:8080; DROP TABLE proxies--"},
		{"xss_attack", "<script>alert(1)</script>:8080"},
	}

	for _, tc := range invalidCases {
		errs := ValidateProxyAddress(tc.address)
		if len(errs) == 0 {
			t.Errorf("%s: expected errors for %q, got none", tc.name, tc.address)
		}
	}
}

func TestContainsSQLInjection(t *testing.T) {
	testCases := []struct {
		input    string
		expected bool
	}{
		{"normal text", false},
		{"127.0.0.1:8080", false},
		{"SELECT * FROM users", true},
		{"'; DROP TABLE users--", true},
		{"1 OR 1=1 AND 2=2", true},
		{"UNION SELECT password", true},
	}

	for _, tc := range testCases {
		result := ContainsSQLInjection(tc.input)
		if result != tc.expected {
			t.Errorf("ContainsSQLInjection(%q) = %v, expected %v", tc.input, result, tc.expected)
		}
	}
}

func TestContainsXSS(t *testing.T) {
	testCases := []struct {
		input    string
		expected bool
	}{
		{"normal text", false},
		{"127.0.0.1:8080", false},
		{"<script>alert(1)</script>", true},
		{"javascript:void(0)", true},
		{"onclick=alert(1)", true},
	}

	for _, tc := range testCases {
		result := ContainsXSS(tc.input)
		if result != tc.expected {
			t.Errorf("ContainsXSS(%q) = %v, expected %v", tc.input, result, tc.expected)
		}
	}
}

func TestValidateLimit(t *testing.T) {
	testCases := []struct {
		input    string
		min      int
		max      int
		def      int
		expected int
	}{
		{"", 1, 100, 50, 50},
		{"10", 1, 100, 50, 10},
		{"0", 1, 100, 50, 1},
		{"200", 1, 100, 50, 100},
		{"invalid", 1, 100, 50, 50},
	}

	for _, tc := range testCases {
		result := ValidateLimit(tc.input, tc.min, tc.max, tc.def)
		if result != tc.expected {
			t.Errorf("ValidateLimit(%q, %d, %d, %d) = %d, expected %d",
				tc.input, tc.min, tc.max, tc.def, result, tc.expected)
		}
	}
}

func TestSanitizeInput(t *testing.T) {
	testCases := []struct {
		input    string
		expected string
	}{
		{"  hello  ", "hello"},
		{"hello\x00world", "helloworld"},
		{"line1\nline2", "line1 line2"},
		{"tab\there", "tab here"},
	}

	for _, tc := range testCases {
		result := SanitizeInput(tc.input)
		if result != tc.expected {
			t.Errorf("SanitizeInput(%q) = %q, expected %q", tc.input, result, tc.expected)
		}
	}
}
