package rate

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"
)

type Counter interface {
	Incr(ctx context.Context, key string) (int64, error)
	Expire(ctx context.Context, key string, ttl time.Duration) error
	Get(ctx context.Context, key string) (int64, error)
	Set(ctx context.Context, key string, value int64, ttl time.Duration) error
	Del(ctx context.Context, key string) error
	Close() error
}

type Tier string

const (
	TierFree  Tier = "free"
	TierBasic Tier = "basic"
	TierPro   Tier = "pro"
)

type Limiter struct {
	counter        Counter
	freeLimit      int
	basicLimit     int
	proLimit       int
	prefix         string
	windowDuration time.Duration
}

type LimiterConfig struct {
	FreeLimit      int
	BasicLimit     int
	ProLimit       int
	WindowDuration time.Duration
}

func NewLimiter(counter Counter, limit int) *Limiter {
	return NewLimiterWithConfig(counter, LimiterConfig{
		FreeLimit:      limit,
		BasicLimit:     limit * 10,
		ProLimit:       limit * 100,
		WindowDuration: 24 * time.Hour,
	})
}

func NewLimiterWithConfig(counter Counter, cfg LimiterConfig) *Limiter {
	if cfg.FreeLimit <= 0 {
		cfg.FreeLimit = 100
	}
	if cfg.BasicLimit <= 0 {
		cfg.BasicLimit = cfg.FreeLimit * 10
	}
	if cfg.ProLimit <= 0 {
		cfg.ProLimit = cfg.FreeLimit * 100
	}
	if cfg.WindowDuration <= 0 {
		cfg.WindowDuration = 24 * time.Hour
	}

	return &Limiter{
		counter:        counter,
		freeLimit:      cfg.FreeLimit,
		basicLimit:     cfg.BasicLimit,
		proLimit:       cfg.ProLimit,
		prefix:         "ratelimit",
		windowDuration: cfg.WindowDuration,
	}
}

func (l *Limiter) Allow(ctx context.Context, subject string) (bool, int64, error) {
	return l.AllowTier(ctx, subject, TierFree)
}

func (l *Limiter) AllowTier(ctx context.Context, subject string, tier Tier) (bool, int64, error) {
	if l == nil || l.counter == nil {
		return true, 0, nil
	}

	limit := l.getLimitForTier(tier)
	return l.slidingWindowAllow(ctx, subject, limit)
}

func (l *Limiter) AllowWebsocket(ctx context.Context, subject string) (bool, int64, error) {
	return l.AllowWebsocketWithLimit(ctx, subject, 10)
}

func (l *Limiter) AllowWebsocketWithLimit(ctx context.Context, subject string, limit int) (bool, int64, error) {
	if l == nil || l.counter == nil {
		return true, 0, nil
	}

	if limit <= 0 {
		limit = 10
	}

	key := fmt.Sprintf("%s:ws:%s", l.prefix, subject)

	count, err := l.counter.Get(ctx, key)
	if err != nil {
		count = 0
	}

	if count >= int64(limit) {
		return false, count, nil
	}

	newCount := count + 1
	if err := l.counter.Set(ctx, key, newCount, l.windowDuration); err != nil {
		log.Printf("[WARN] failed to set websocket counter: %v", err)
	}

	return newCount <= int64(limit), newCount, nil
}

func (l *Limiter) ReleaseWebsocket(ctx context.Context, subject string) error {
	if l == nil || l.counter == nil {
		return nil
	}

	key := fmt.Sprintf("%s:ws:%s", l.prefix, subject)
	count, err := l.counter.Get(ctx, key)
	if err != nil || count <= 0 {
		return l.counter.Del(ctx, key)
	}

	newCount := count - 1
	if newCount <= 0 {
		return l.counter.Del(ctx, key)
	}

	return l.counter.Set(ctx, key, newCount, l.windowDuration)
}

func (l *Limiter) slidingWindowAllow(ctx context.Context, subject string, limit int) (bool, int64, error) {
	now := time.Now().UTC()
	windowStart := now.Truncate(l.windowDuration)
	windowKey := fmt.Sprintf("%s:sw:%s:%d", l.prefix, subject, windowStart.Unix())

	// PERFORMANCE: Use atomic IncrWithExpiry for Redis to eliminate race condition
	// between Incr and Expire calls, and reduce network round-trips from 2 to 1
	if rc, ok := l.counter.(*RedisCounter); ok {
		count, err := rc.IncrWithExpiry(ctx, windowKey, l.windowDuration+time.Minute)
		if err != nil {
			return false, count, err
		}
		return count <= int64(limit), count, nil
	}

	// Fallback for memory counter (non-atomic but acceptable for single instance)
	count, err := l.counter.Incr(ctx, windowKey)
	if err != nil {
		return false, count, err
	}

	if count == 1 {
		if err := l.counter.Expire(ctx, windowKey, l.windowDuration+time.Minute); err != nil {
			log.Printf("[WARN] failed to set expiry on rate limit key: %v", err)
		}
	}

	return count <= int64(limit), count, nil
}

func (l *Limiter) getLimitForTier(tier Tier) int {
	switch tier {
	case TierPro:
		return l.proLimit
	case TierBasic:
		return l.basicLimit
	default:
		return l.freeLimit
	}
}

func (l *Limiter) GetUsage(ctx context.Context, subject string) (map[string]int64, error) {
	if l == nil || l.counter == nil {
		return nil, nil
	}

	now := time.Now().UTC()
	windowStart := now.Truncate(l.windowDuration)
	windowKey := fmt.Sprintf("%s:sw:%s:%d", l.prefix, subject, windowStart.Unix())

	count, err := l.counter.Get(ctx, windowKey)
	if err != nil {
		return map[string]int64{"current": 0, "free": int64(l.freeLimit)}, nil
	}

	return map[string]int64{
		"current": count,
		"free":    int64(l.freeLimit),
		"basic":   int64(l.basicLimit),
		"pro":     int64(l.proLimit),
	}, nil
}

type memoryCounter struct {
	mu      sync.Mutex
	data    map[string]int64
	stamp   map[string]time.Time
	stopGC  chan struct{}
	stopped bool
}

func NewMemoryCounter() Counter {
	m := &memoryCounter{
		data:   make(map[string]int64),
		stamp:  make(map[string]time.Time),
		stopGC: make(chan struct{}),
	}
	go m.gcLoop()
	return m
}

// gcLoop periodically cleans up expired entries to prevent memory leaks
func (m *memoryCounter) gcLoop() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			m.cleanup()
		case <-m.stopGC:
			return
		}
	}
}

// cleanup removes all expired entries
func (m *memoryCounter) cleanup() {
	m.mu.Lock()
	defer m.mu.Unlock()

	now := time.Now()
	for key, expiresAt := range m.stamp {
		if now.After(expiresAt) {
			delete(m.data, key)
			delete(m.stamp, key)
		}
	}
}

// Close stops the GC goroutine
func (m *memoryCounter) Close() error {
	m.mu.Lock()
	if !m.stopped {
		m.stopped = true
		close(m.stopGC)
	}
	m.mu.Unlock()
	return nil
}

func (m *memoryCounter) Incr(_ context.Context, key string) (int64, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if expiresAt, ok := m.stamp[key]; ok && time.Now().After(expiresAt) {
		delete(m.data, key)
		delete(m.stamp, key)
	}
	m.data[key]++
	return m.data[key], nil
}

func (m *memoryCounter) Get(_ context.Context, key string) (int64, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if expiresAt, ok := m.stamp[key]; ok && time.Now().After(expiresAt) {
		delete(m.data, key)
		delete(m.stamp, key)
		return 0, nil
	}
	return m.data[key], nil
}

func (m *memoryCounter) Set(_ context.Context, key string, value int64, ttl time.Duration) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.data[key] = value
	m.stamp[key] = time.Now().Add(ttl)
	return nil
}

func (m *memoryCounter) Del(_ context.Context, key string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.data, key)
	delete(m.stamp, key)
	return nil
}

func (m *memoryCounter) Expire(_ context.Context, key string, ttl time.Duration) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if ttl <= 0 {
		delete(m.data, key)
		delete(m.stamp, key)
		return nil
	}
	m.stamp[key] = time.Now().Add(ttl)
	return nil
}
