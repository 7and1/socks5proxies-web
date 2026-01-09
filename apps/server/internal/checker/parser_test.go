package checker

import "testing"

func TestParseProxyLine(t *testing.T) {
	cases := []struct {
		name     string
		input    string
		protocol string
		wantAddr string
		wantUser string
	}{
		{"plain", "127.0.0.1:8080", "socks5", "127.0.0.1:8080", ""},
		{"auth", "127.0.0.1:8080:user:pass", "socks5", "127.0.0.1:8080", "user"},
		{"url", "socks5://user:pass@127.0.0.1:1080", "", "127.0.0.1:1080", "user"},
		{"http", "http://127.0.0.1:3128", "", "127.0.0.1:3128", ""},
	}

	for _, tc := range cases {
		got, err := ParseProxyLine(tc.input, tc.protocol)
		if err != nil {
			t.Fatalf("%s: unexpected error: %v", tc.name, err)
		}
		if got.Address != tc.wantAddr {
			t.Fatalf("%s: expected address %s got %s", tc.name, tc.wantAddr, got.Address)
		}
		if got.Username != tc.wantUser {
			t.Fatalf("%s: expected user %s got %s", tc.name, tc.wantUser, got.Username)
		}
	}
}

func TestParseProxyLineInvalid(t *testing.T) {
	invalidCases := []struct {
		name  string
		input string
	}{
		{"empty", ""},
		{"no_port", "127.0.0.1"},
		{"invalid_port", "127.0.0.1:abc"},
		{"port_too_high", "127.0.0.1:70000"},
		{"port_zero", "127.0.0.1:0"},
		{"port_negative", "127.0.0.1:-1"},
		{"url_invalid_port", "socks5://127.0.0.1:99999"},
	}

	for _, tc := range invalidCases {
		_, err := ParseProxyLine(tc.input, "socks5")
		if err == nil {
			t.Fatalf("%s: expected error for input %q, got nil", tc.name, tc.input)
		}
	}
}
