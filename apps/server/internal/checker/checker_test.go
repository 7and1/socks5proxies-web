package checker

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestClassifyAnonymity(t *testing.T) {
	cases := []struct {
		name     string
		exitIP   string
		proxyIP  string
		expected string
	}{
		{"same_ip_anonymous", "1.1.1.1", "1.1.1.1", "anonymous"},
		{"different_ip_unknown", "2.2.2.2", "1.1.1.1", "unknown"},
		{"empty_exit_ip", "", "1.1.1.1", "unknown"},
		{"empty_proxy_ip", "1.1.1.1", "", "unknown"},
		{"both_empty", "", "", "unknown"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			result := classifyAnonymity(tc.exitIP, tc.proxyIP)
			if result != tc.expected {
				t.Errorf("classifyAnonymity(%q, %q) = %q, expected %q",
					tc.exitIP, tc.proxyIP, result, tc.expected)
			}
		})
	}
}

func TestBuildTransport_HTTP(t *testing.T) {
	target := ProxyTarget{
		Address:  "127.0.0.1:8080",
		Protocol: "http",
	}

	transport, err := buildTransport(target)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if transport == nil {
		t.Fatal("expected transport to be created")
	}
	if transport.Proxy == nil {
		t.Error("expected Proxy function to be set for HTTP transport")
	}
}

func TestBuildTransport_HTTPWithAuth(t *testing.T) {
	target := ProxyTarget{
		Address:  "127.0.0.1:8080",
		Protocol: "http",
		Username: "user",
		Password: "pass",
	}

	transport, err := buildTransport(target)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if transport == nil {
		t.Fatal("expected transport to be created")
	}
}

func TestBuildTransport_SOCKS5(t *testing.T) {
	target := ProxyTarget{
		Address:  "127.0.0.1:1080",
		Protocol: "socks5",
	}

	transport, err := buildTransport(target)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if transport == nil {
		t.Fatal("expected transport to be created")
	}
	if transport.DialContext == nil {
		t.Error("expected DialContext to be set for SOCKS5 transport")
	}
}

func TestBuildTransport_SOCKS5WithAuth(t *testing.T) {
	target := ProxyTarget{
		Address:  "127.0.0.1:1080",
		Protocol: "socks5",
		Username: "user",
		Password: "pass",
	}

	transport, err := buildTransport(target)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if transport == nil {
		t.Fatal("expected transport to be created")
	}
}

func TestBuildTransport_SOCKS(t *testing.T) {
	target := ProxyTarget{
		Address:  "127.0.0.1:1080",
		Protocol: "socks",
	}

	transport, err := buildTransport(target)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if transport == nil {
		t.Fatal("expected transport to be created for socks alias")
	}
}

func TestBuildTransport_UnsupportedProtocol(t *testing.T) {
	target := ProxyTarget{
		Address:  "127.0.0.1:1080",
		Protocol: "ftp",
	}

	_, err := buildTransport(target)
	if err == nil {
		t.Error("expected error for unsupported protocol")
	}
	if err.Error() != "unsupported proxy protocol" {
		t.Errorf("unexpected error message: %v", err)
	}
}

func TestBuildTransport_CaseInsensitive(t *testing.T) {
	protocols := []string{"HTTP", "Http", "SOCKS5", "Socks5", "HTTPS"}

	for _, proto := range protocols {
		target := ProxyTarget{
			Address:  "127.0.0.1:8080",
			Protocol: proto,
		}

		transport, err := buildTransport(target)
		if err != nil {
			t.Errorf("unexpected error for protocol %s: %v", proto, err)
		}
		if transport == nil {
			t.Errorf("expected transport to be created for protocol %s", proto)
		}
	}
}

func TestCheckProxy_InvalidTarget(t *testing.T) {
	ctx := context.Background()
	target := ProxyTarget{
		Address:  "invalid-no-port",
		Protocol: "socks5",
	}

	result := CheckProxy(ctx, target, "http://example.com", nil)
	if result.Status {
		t.Error("expected status false for invalid target")
	}
}

func TestCheckProxy_ContextCanceled(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel() // Cancel immediately

	target := ProxyTarget{
		Address:  "127.0.0.1:1080",
		Protocol: "socks5",
	}

	result := CheckProxy(ctx, target, "http://example.com", nil)
	if result.Status {
		t.Error("expected status false for cancelled context")
	}
}

func TestCheckProxy_UnsupportedProtocol(t *testing.T) {
	ctx := context.Background()
	target := ProxyTarget{
		Address:  "127.0.0.1:1080",
		Protocol: "invalid",
	}

	result := CheckProxy(ctx, target, "http://example.com", nil)
	if result.Status {
		t.Error("expected status false for unsupported protocol")
	}
	if result.Error != "unsupported proxy protocol" {
		t.Errorf("expected 'unsupported proxy protocol' error, got %s", result.Error)
	}
}

func TestCheckProxy_IPExtraction(t *testing.T) {
	// Create a test server that returns an IP address
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Your IP is: 8.8.8.8"))
	}))
	defer server.Close()

	// We can't actually test through a proxy without one, but we can test the IP extraction
	// by examining the regex
	body := "Your IP address is 1.2.3.4 and more text"
	found := ipRegex.FindString(body)
	if found != "1.2.3.4" {
		t.Errorf("expected IP 1.2.3.4, got %s", found)
	}

	// Test with multiple IPs - should return first
	body = "Origin: 10.0.0.1, X-Forwarded-For: 192.168.1.1"
	found = ipRegex.FindString(body)
	if found != "10.0.0.1" {
		t.Errorf("expected first IP 10.0.0.1, got %s", found)
	}

	// Test with no IP
	body = "No IP here"
	found = ipRegex.FindString(body)
	if found != "" {
		t.Errorf("expected empty string, got %s", found)
	}
}

func TestProxyResult_WithCheckedAt(t *testing.T) {
	result := ProxyResult{
		Status:   true,
		Protocol: "socks5",
		IP:       "1.1.1.1",
		Port:     "8080",
	}

	// Truncate to second precision since RFC3339 format loses sub-second precision
	before := time.Now().UTC().Truncate(time.Second)
	withTime := result.WithCheckedAt()
	after := time.Now().UTC().Add(time.Second).Truncate(time.Second)

	if withTime.CheckedAt == "" {
		t.Error("expected CheckedAt to be set")
	}

	// Parse the timestamp
	parsed, err := time.Parse(time.RFC3339, withTime.CheckedAt)
	if err != nil {
		t.Fatalf("failed to parse timestamp: %v", err)
	}

	// Allow 1 second tolerance for timing
	if parsed.Before(before) || parsed.After(after) {
		t.Errorf("CheckedAt %v not within expected range [%v, %v]", parsed, before, after)
	}
}

func TestIPRegex(t *testing.T) {
	validIPs := []string{
		"1.1.1.1",
		"192.168.0.1",
		"10.0.0.1",
		"255.255.255.255",
		"0.0.0.0",
	}

	for _, ip := range validIPs {
		if !ipRegex.MatchString(ip) {
			t.Errorf("expected %s to match IP regex", ip)
		}
	}

	invalidInputs := []string{
		"not-an-ip",
		"1.2.3",
		"1.2.3.4.5",
		"a.b.c.d",
	}

	for _, input := range invalidInputs {
		if ipRegex.MatchString(input) && ipRegex.FindString(input) == input {
			t.Errorf("expected %s not to fully match IP regex", input)
		}
	}
}
