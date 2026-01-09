package rate

import (
	"context"
	"fmt"
	"testing"
	"time"
)

func TestLimiterAllow(t *testing.T) {
	counter := NewMemoryCounter()
	limiter := NewLimiter(counter, 3)

	for i := 0; i < 3; i++ {
		allowed, _, err := limiter.Allow(context.Background(), "127.0.0.1")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if !allowed {
			t.Fatalf("expected allowed on request %d", i+1)
		}
	}

	allowed, _, err := limiter.Allow(context.Background(), "127.0.0.1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if allowed {
		t.Fatalf("expected rate limit to block")
	}
}

func TestLimiterResetsAfterExpiry(t *testing.T) {
	counter := NewMemoryCounter()
	limiter := NewLimiter(counter, 1)
	ctx := context.Background()

	allowed, _, err := limiter.Allow(ctx, "127.0.0.1")
	if err != nil || !allowed {
		t.Fatalf("expected initial allow, got err=%v allowed=%v", err, allowed)
	}

	now := time.Now().UTC()
	windowStart := now.Truncate(24 * time.Hour)
	key := fmt.Sprintf("ratelimit:sw:127.0.0.1:%d", windowStart.Unix())
	if err := counter.Expire(ctx, key, -1*time.Second); err != nil {
		t.Fatalf("expire failed: %v", err)
	}

	allowed, _, err = limiter.Allow(ctx, "127.0.0.1")
	if err != nil {
		t.Fatalf("unexpected error after expiry: %v", err)
	}
	if !allowed {
		t.Fatalf("expected allow after expiry reset")
	}
}

func TestLimiterGetUsage(t *testing.T) {
	counter := NewMemoryCounter()
	limiter := NewLimiter(counter, 10)
	ctx := context.Background()

	for i := 0; i < 5; i++ {
		_, _, _ = limiter.Allow(ctx, "127.0.0.1")
	}

	usage, err := limiter.GetUsage(ctx, "127.0.0.1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if usage["current"] != 5 {
		t.Fatalf("expected current=5, got %d", usage["current"])
	}
	if usage["free"] != 10 {
		t.Fatalf("expected free=10, got %d", usage["free"])
	}
}

func TestLimiterTieredLimits(t *testing.T) {
	counter := NewMemoryCounter()
	cfg := LimiterConfig{
		FreeLimit:      100,
		BasicLimit:     1000,
		ProLimit:       10000,
		WindowDuration: 24 * time.Hour,
	}
	limiter := NewLimiterWithConfig(counter, cfg)
	ctx := context.Background()

	allowedBasic, countBasic, _ := limiter.AllowTier(ctx, "127.0.0.1-basic", TierBasic)
	allowedPro, countPro, _ := limiter.AllowTier(ctx, "127.0.0.1-pro", TierPro)

	if !allowedBasic || countBasic != 1 {
		t.Fatalf("expected basic to be allowed with count=1, got allowed=%v count=%d", allowedBasic, countBasic)
	}
	if !allowedPro || countPro != 1 {
		t.Fatalf("expected pro to be allowed with count=1, got allowed=%v count=%d", allowedPro, countPro)
	}

	if limiter.basicLimit != 1000 {
		t.Fatalf("expected basic limit to be 1000, got %d", limiter.basicLimit)
	}
	if limiter.proLimit != 10000 {
		t.Fatalf("expected pro limit to be 10000, got %d", limiter.proLimit)
	}
}

func TestLimiterWebsocket(t *testing.T) {
	counter := NewMemoryCounter()
	limiter := NewLimiter(counter, 100)
	ctx := context.Background()

	clientIP := "192.168.1.1"

	for i := 0; i < 10; i++ {
		allowed, count, err := limiter.AllowWebsocket(ctx, clientIP)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if !allowed {
			t.Fatalf("expected allowed on connection %d", i+1)
		}
		if count != int64(i+1) {
			t.Fatalf("expected count=%d, got %d", i+1, count)
		}
	}

	allowed, _, _ := limiter.AllowWebsocket(ctx, clientIP)
	if allowed {
		t.Fatalf("expected rate limit to block 11th connection")
	}

	_ = limiter.ReleaseWebsocket(ctx, clientIP)
	allowed, count, _ := limiter.AllowWebsocket(ctx, clientIP)
	if !allowed {
		t.Fatalf("expected allow after release")
	}
	if count != 10 {
		t.Fatalf("expected count=10 after release, got %d", count)
	}
}
