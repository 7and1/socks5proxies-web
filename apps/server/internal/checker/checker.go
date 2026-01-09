package checker

import (
	"context"
	"errors"
	"io"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"time"

	"golang.org/x/net/proxy"

	"socksproxies.com/server/internal/geoip"
)

var ipRegex = regexp.MustCompile(`(?:\d{1,3}\.){3}\d{1,3}`)

// Performance: HTTP client pool to reduce allocations
var clientPool = sync.Pool{
	New: func() interface{} {
		return &http.Client{
			Timeout: 12 * time.Second,
		}
	},
}

// Performance: Buffer pool for response reading
var bufPool = sync.Pool{
	New: func() interface{} {
		buf := make([]byte, 256)
		return &buf
	},
}

func CheckProxy(ctx context.Context, target ProxyTarget, judgeURL string, geo *geoip.Reader) ProxyResult {
	start := time.Now()
	result := ProxyResult{
		Protocol: strings.ToLower(target.Protocol),
		Status:   false,
	}

	host, port, err := net.SplitHostPort(target.Address)
	if err == nil {
		result.IP = host
		result.Port = port
	}

	transport, err := buildTransport(target)
	if err != nil {
		result.Error = err.Error()
		return result.WithCheckedAt()
	}

	// Performance: Get client from pool and set transport
	client := clientPool.Get().(*http.Client)
	client.Transport = transport
	defer func() {
		// Close idle connections to prevent resource leaks
		transport.CloseIdleConnections()
		client.Transport = nil
		clientPool.Put(client)
	}()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, judgeURL, nil)
	if err != nil {
		result.Error = err.Error()
		return result.WithCheckedAt()
	}

	resp, err := client.Do(req)
	if err != nil {
		result.Error = err.Error()
		return result.WithCheckedAt()
	}
	defer resp.Body.Close()

	// Performance: Use pooled buffer
	bufPtr := bufPool.Get().(*[]byte)
	buf := *bufPtr
	defer bufPool.Put(bufPtr)

	n, _ := io.ReadFull(io.LimitReader(resp.Body, 256), buf)
	body := string(buf[:n])

	result.Status = resp.StatusCode >= 200 && resp.StatusCode < 300
	result.Latency = time.Since(start).Milliseconds()

	foundIP := ipRegex.FindString(body)
	if foundIP != "" {
		result.Anonymity = classifyAnonymity(foundIP, result.IP)
		if result.IP == "" {
			result.IP = foundIP
		}
	}

	if geo != nil && result.IP != "" {
		result.Country = geo.LookupCountry(result.IP)
	}

	return result.WithCheckedAt()
}

func buildTransport(target ProxyTarget) (*http.Transport, error) {
	dialer := &net.Dialer{
		Timeout:   5 * time.Second,
		KeepAlive: 30 * time.Second,
	}

	protocol := strings.ToLower(target.Protocol)
	switch protocol {
	case "socks5", "socks":
		auth := &proxy.Auth{}
		if target.Username != "" || target.Password != "" {
			auth.User = target.Username
			auth.Password = target.Password
		} else {
			auth = nil
		}

		socksDialer, err := proxy.SOCKS5("tcp", target.Address, auth, dialer)
		if err != nil {
			return nil, err
		}

		// Use ContextDialer to properly propagate context for cancellation
		contextDialer, ok := socksDialer.(proxy.ContextDialer)
		if !ok {
			return nil, errors.New("SOCKS5 dialer does not support context")
		}

		return &http.Transport{
			DialContext:           contextDialer.DialContext,
			TLSHandshakeTimeout:   5 * time.Second,
			MaxIdleConns:          100,
			MaxIdleConnsPerHost:   10,
			IdleConnTimeout:       90 * time.Second,
			DisableCompression:    true,
			ForceAttemptHTTP2:     false,
		}, nil
	case "http", "https":
		proxyURL := &url.URL{Scheme: "http", Host: target.Address}
		if target.Username != "" || target.Password != "" {
			proxyURL.User = url.UserPassword(target.Username, target.Password)
		}

		return &http.Transport{
			Proxy:                  http.ProxyURL(proxyURL),
			DialContext:            dialer.DialContext,
			TLSHandshakeTimeout:    5 * time.Second,
			MaxIdleConns:           100,
			MaxIdleConnsPerHost:    10,
			IdleConnTimeout:        90 * time.Second,
			DisableCompression:     true,
			ForceAttemptHTTP2:      false,
		}, nil
	default:
		return nil, errors.New("unsupported proxy protocol")
	}
}

func classifyAnonymity(exitIP string, proxyIP string) string {
	if exitIP == "" {
		return "unknown"
	}

	if proxyIP != "" && exitIP == proxyIP {
		return "anonymous"
	}

	return "unknown"
}
