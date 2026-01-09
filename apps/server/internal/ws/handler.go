package ws

import (
	"context"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"

	"socksproxies.com/server/internal/api"
	"socksproxies.com/server/internal/checker"
	"socksproxies.com/server/internal/config"
	"socksproxies.com/server/internal/geoip"
	"socksproxies.com/server/internal/rate"
	"socksproxies.com/server/internal/store"
)

type Handler struct {
	cfg         config.Config
	store       store.Storer
	geo         *geoip.Reader
	limiter     *rate.Limiter
	connTracker *ConnectionTracker
	upgrader    websocket.Upgrader
	alert       AlertFunc
}

type AlertFunc func(event string, meta map[string]any, err error)

type HandlerOption func(*Handler)

func WithAlert(alert AlertFunc) HandlerOption {
	return func(h *Handler) {
		h.alert = alert
	}
}

// Performance: Use RWMutex for read-heavy operations
type ConnectionTracker struct {
	mu     sync.RWMutex
	conns  map[string]int
	maxPer int
}

func NewConnectionTracker(maxPerIP int) *ConnectionTracker {
	return &ConnectionTracker{
		conns:  make(map[string]int),
		maxPer: maxPerIP,
	}
}

func (ct *ConnectionTracker) Acquire(ip string) bool {
	ct.mu.Lock()
	defer ct.mu.Unlock()

	current := ct.conns[ip]
	if current >= ct.maxPer {
		return false
	}
	ct.conns[ip] = current + 1
	return true
}

func (ct *ConnectionTracker) Release(ip string) {
	ct.mu.Lock()
	defer ct.mu.Unlock()

	if ct.conns[ip] <= 1 {
		delete(ct.conns, ip)
	} else {
		ct.conns[ip]--
	}
}

func (ct *ConnectionTracker) Count(ip string) int {
	ct.mu.RLock()
	defer ct.mu.RUnlock()
	return ct.conns[ip]
}

func NewHandler(cfg config.Config, store store.Storer, geo *geoip.Reader, limiter *rate.Limiter, opts ...HandlerOption) *Handler {
	h := &Handler{
		cfg:         cfg,
		store:       store,
		geo:         geo,
		limiter:     limiter,
		connTracker: NewConnectionTracker(cfg.MaxWebSocketConnections),
	}
	for _, opt := range opts {
		if opt != nil {
			opt(h)
		}
	}

	// Build allowed origins map from config
	allowedOrigins := make(map[string]bool)
	for _, origin := range cfg.AllowedOrigins {
		if origin != "*" {
			allowedOrigins[origin] = true
		}
	}
	// Add default production origins
	for _, origin := range defaultWSOrigins {
		allowedOrigins[origin] = true
	}

	// Create upgrader with config-aware origin checking
	h.upgrader = websocket.Upgrader{
		ReadBufferSize:    4096,
		WriteBufferSize:   4096,
		HandshakeTimeout:  10 * time.Second,
		EnableCompression: true,
		CheckOrigin: func(r *http.Request) bool {
			origin := r.Header.Get("Origin")
			if origin == "" {
				return false // Reject requests without Origin header
			}
			// Check against allowed origins from config
			if allowedOrigins[origin] {
				return true
			}
			// Allow localhost only in development mode
			if cfg.IsDevelopment() {
				if strings.HasPrefix(origin, "http://localhost:") || strings.HasPrefix(origin, "http://127.0.0.1:") {
					return true
				}
			}
			log.Printf("[SECURITY] WebSocket connection rejected from origin: %s", origin)
			return false
		},
	}

	return h
}

// defaultWSOrigins are always allowed for WebSocket connections
var defaultWSOrigins = []string{
	"https://socks5proxies.com",
	"https://www.socks5proxies.com",
	"https://api.socks5proxies.com",
}

const (
	pongWait   = 60 * time.Second
	pingPeriod = 30 * time.Second
)

type payload struct {
	Proxies  []string `json:"proxies"`
	Protocol string   `json:"protocol"`
}

func (h *Handler) Handle(c *gin.Context) {
	clientIP := c.ClientIP()

	if h.limiter != nil {
		allowed, count, err := h.limiter.AllowWebsocketWithLimit(
			c.Request.Context(),
			clientIP,
			h.cfg.MaxWebSocketConnections,
		)
		if err != nil {
			log.Printf("[WARN] websocket rate limiter error: %v", err)
		}
		if !allowed {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":       "too many websocket connections",
				"connections": count,
				"limit":       h.cfg.MaxWebSocketConnections,
			})
			return
		}
		defer func() {
			_ = h.limiter.ReleaseWebsocket(c.Request.Context(), clientIP)
		}()
	}

	if !h.connTracker.Acquire(clientIP) {
		c.JSON(http.StatusTooManyRequests, gin.H{
			"error":       "connection limit exceeded for this IP",
			"current":     h.connTracker.Count(clientIP),
			"limit":       h.cfg.MaxWebSocketConnections,
			"retry_after": "60s",
		})
		return
	}
	defer h.connTracker.Release(clientIP)

	conn, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("[WARN] websocket upgrade failed: %v", err)
		h.notify("ws_upgrade_failed", map[string]any{
			"ip":     clientIP,
			"origin": c.GetHeader("Origin"),
		}, err)
		return
	}
	defer func() {
		conn.Close()
		log.Printf("[INFO] websocket connection closed for %s", clientIP)
	}()

	// SECURITY: Limit message size to 64KB (sufficient for 500 proxies × ~100 bytes each)
	// Previously 1MB which was unnecessarily large and could enable memory exhaustion attacks
	conn.SetReadLimit(64 << 10)
	conn.SetReadDeadline(time.Now().Add(pongWait))
	conn.SetPongHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	done := make(chan struct{})
	go func() {
		ticker := time.NewTicker(pingPeriod)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				if err := conn.WriteControl(websocket.PingMessage, []byte{}, time.Now().Add(5*time.Second)); err != nil {
					log.Printf("[WARN] websocket ping failed for %s: %v", clientIP, err)
					h.notify("ws_ping_failed", map[string]any{"ip": clientIP}, err)
					return
				}
			case <-done:
				return
			}
		}
	}()
	defer close(done)

	for {
		var data payload
		if err := conn.ReadJSON(&data); err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("[WARN] websocket unexpected close for %s: %v", clientIP, err)
				h.notify("ws_unexpected_close", map[string]any{"ip": clientIP}, err)
			}
			return
		}

		if len(data.Proxies) == 0 {
			_ = conn.WriteJSON(gin.H{"error": "empty proxy list"})
			continue
		}

		if len(data.Proxies) > 500 {
			_ = conn.WriteJSON(gin.H{"error": "limit exceeded (max 500)"})
			continue
		}

		for _, p := range data.Proxies {
			if api.ContainsSQLInjection(p) || api.ContainsXSS(p) {
				_ = conn.WriteJSON(gin.H{"error": "invalid input detected"})
				log.Printf("[SECURITY] Potential injection attempt from %s", clientIP)
				return // Reject entire request on injection attempt
			}
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
		results := make(chan checker.ProxyResult, h.cfg.MaxConcurrent*2)
		var wg sync.WaitGroup
		sem := make(chan struct{}, h.cfg.MaxConcurrent)

		// Performance: Batch results to reduce WebSocket writes
		writerDone := make(chan struct{})
		go func() {
			defer close(writerDone)
			batch := make([]checker.ProxyResult, 0, 10)
			ticker := time.NewTicker(100 * time.Millisecond)
			defer ticker.Stop()

			flushBatch := func() {
				if len(batch) == 0 {
					return
				}
				// Send individual results for backward compatibility
				for _, r := range batch {
					if err := conn.WriteJSON(r); err != nil {
						cancel()
						return
					}
				}
				batch = batch[:0]
			}

			for {
				select {
				case result, ok := <-results:
					if !ok {
						flushBatch()
						return
					}
					batch = append(batch, result)
					if len(batch) >= 10 {
						flushBatch()
					}
				case <-ticker.C:
					flushBatch()
				}
			}
		}()

	outer:
		for _, raw := range data.Proxies {
			if ctx.Err() != nil {
				break
			}
			parsed, err := checker.ParseProxyLine(raw, data.Protocol)
			if err != nil {
				sendResult(ctx, results, checker.ProxyResult{Status: false, Protocol: data.Protocol, Error: "invalid proxy", CheckedAt: time.Now().UTC().Format(time.RFC3339)})
				continue
			}

			wg.Add(1)
			select {
			case sem <- struct{}{}:
			case <-ctx.Done():
				wg.Done()
				break outer
			}
			go func(target checker.ProxyTarget) {
				defer wg.Done()
				defer func() {
					if r := recover(); r != nil {
						log.Printf("[PANIC] Recovered in proxy check: %v", r)
					}
					<-sem
				}()

				res := checker.CheckProxy(ctx, target, h.cfg.JudgeURL, h.geo)
				_ = h.saveResult(ctx, target, res)
				sendResult(ctx, results, res)
			}(parsed)
		}

		wg.Wait()
		close(results)
		<-writerDone
		_ = conn.WriteJSON(gin.H{"status": "done"})
		cancel()
	}
}

func sendResult(ctx context.Context, results chan<- checker.ProxyResult, res checker.ProxyResult) {
	select {
	case results <- res:
	case <-ctx.Done():
	}
}

func (h *Handler) notify(event string, meta map[string]any, err error) {
	if h.alert == nil {
		return
	}
	h.alert(event, meta, err)
}

func (h *Handler) saveResult(ctx context.Context, target checker.ProxyTarget, res checker.ProxyResult) error {
	if h.store == nil {
		return nil
	}

	proxyID, err := h.store.UpsertProxy(ctx, store.ProxyRecord{
		Address:     target.Address,
		Protocol:    target.Protocol,
		Country:     res.Country,
		Anonymity:   res.Anonymity,
		LastStatus:  res.Status,
		LastLatency: res.Latency,
		LastChecked: time.Now().UTC(),
	})
	if err != nil {
		return err
	}

	return h.store.InsertCheck(ctx, store.CheckRecord{
		ProxyID:   proxyID,
		Address:   target.Address,
		Protocol:  target.Protocol,
		Status:    res.Status,
		Latency:   res.Latency,
		IP:        res.IP,
		Country:   res.Country,
		Anonymity: res.Anonymity,
		CheckedAt: time.Now().UTC(),
	})
}
