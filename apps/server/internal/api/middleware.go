package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"regexp"
	"runtime/debug"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"socksproxies.com/server/internal/config"
)

const requestIDHeader = "X-Request-ID"
const requestIDKey = "request_id"
const requestIDMaxLen = 128

type ErrorResponse struct {
	Code      string `json:"code"`
	Message   string `json:"message"`
	Details   any    `json:"details,omitempty"`
	RequestID string `json:"request_id,omitempty"`
	Timestamp string `json:"timestamp"`
	Path      string `json:"path,omitempty"`
}

type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

type PanicNotifier func(*gin.Context, any)

var globalPanicNotifier PanicNotifier

func SetPanicNotifier(notifier PanicNotifier) {
	globalPanicNotifier = notifier
}

func RespondError(c *gin.Context, statusCode int, code, message string, details any) {
	requestID, _ := c.Get(requestIDKey)
	reqID, _ := requestID.(string)

	if reqID == "" {
		reqID = c.GetHeader(requestIDHeader)
	}

	resp := ErrorResponse{
		Code:      code,
		Message:   message,
		Details:   details,
		RequestID: reqID,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Path:      c.Request.URL.Path,
	}

	c.JSON(statusCode, resp)
}

func RequestIDMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := sanitizeRequestID(c.GetHeader(requestIDHeader))
		if requestID == "" {
			requestID = uuid.New().String()
		}
		c.Set(requestIDKey, requestID)
		c.Header(requestIDHeader, requestID)
		c.Next()
	}
}

func sanitizeRequestID(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" || len(raw) > requestIDMaxLen {
		return ""
	}
	for _, r := range raw {
		if r < 33 || r > 126 {
			return ""
		}
	}
	return raw
}

type PanicLog struct {
	RequestID string `json:"request_id"`
	Method    string `json:"method"`
	Path      string `json:"path"`
	Error     string `json:"error"`
	Stack     string `json:"stack"`
	Timestamp string `json:"timestamp"`
}

func RecoveryMiddleware(logger *log.Logger, notifier ...PanicNotifier) gin.HandlerFunc {
	activeNotifier := globalPanicNotifier
	if len(notifier) > 0 && notifier[0] != nil {
		activeNotifier = notifier[0]
	}

	return func(c *gin.Context) {
		defer func() {
			if r := recover(); r != nil {
				stack := debug.Stack()

				requestID, _ := c.Get(requestIDKey)
				reqID, _ := requestID.(string)

				panicLog := PanicLog{
					RequestID: reqID,
					Method:    c.Request.Method,
					Path:      c.Request.URL.Path,
					Error:     fmt.Sprintf("%v", r),
					Stack:     string(stack),
					Timestamp: time.Now().UTC().Format(time.RFC3339),
				}

				logJSON, _ := json.Marshal(panicLog)
				logger.Printf("[PANIC] %s", logJSON)

				if activeNotifier != nil {
					activeNotifier(c, r)
				}

				RespondError(c, http.StatusInternalServerError,
					"INTERNAL_SERVER_ERROR",
					"An unexpected error occurred",
					nil)

				c.Abort()
			}
		}()
		c.Next()
	}
}

func SecurityHeadersMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// SECURITY: HSTS - enforce HTTPS for 1 year, include subdomains
		c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Header("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
		// SECURITY: Content-Security-Policy for API responses
		c.Header("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
		// SECURITY: Prevent MIME type sniffing
		c.Header("X-Download-Options", "noopen")
		// SECURITY: Prevent caching of API responses containing potentially sensitive data
		c.Header("Cache-Control", "no-store, no-cache, must-revalidate, private")
		c.Header("Pragma", "no-cache")
		c.Header("Expires", "0")
		c.Next()
	}
}

func MaxBodySizeMiddleware(maxSize int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Body != nil && c.Request.ContentLength > maxSize {
			RespondError(c, http.StatusRequestEntityTooLarge,
				"REQUEST_TOO_LARGE",
				fmt.Sprintf("request body exceeds maximum size of %d bytes", maxSize),
				nil)
			c.Abort()
			return
		}

		if c.Request.Body != nil && c.Request.ContentLength > 0 {
			body, err := io.ReadAll(c.Request.Body)
			if err != nil {
				// SECURITY: Do not expose internal error details
				log.Printf("[ERROR] failed to read request body: %v", err)
				RespondError(c, http.StatusBadRequest,
					"READ_ERROR",
					"failed to read request body",
					nil)
				c.Abort()
				return
			}

			if int64(len(body)) > maxSize {
				RespondError(c, http.StatusRequestEntityTooLarge,
					"REQUEST_TOO_LARGE",
					fmt.Sprintf("request body exceeds maximum size of %d bytes", maxSize),
					nil)
				c.Abort()
				return
			}

			c.Request.Body = io.NopCloser(bytes.NewReader(body))
		}

		c.Next()
	}
}

func SlowRequestMiddleware(threshold time.Duration) gin.HandlerFunc {
	if threshold <= 0 {
		return func(c *gin.Context) { c.Next() }
	}

	return func(c *gin.Context) {
		start := time.Now()
		c.Next()

		latency := time.Since(start)
		if latency < threshold {
			return
		}

		requestID, _ := c.Get(requestIDKey)
		reqID, _ := requestID.(string)

		log.Printf("[ALERT] slow request %s %s status=%d latency=%s request_id=%s",
			c.Request.Method,
			c.Request.URL.Path,
			c.Writer.Status(),
			latency,
			reqID,
		)
	}
}

var wafTraversalPattern = regexp.MustCompile(`(?i)(\\.{2}/|%2e%2e|%2f|%5c)`) // ../ or encoded traversal

func WAFMiddleware(cfg config.Config) gin.HandlerFunc {
	if !cfg.WAFEnabled {
		return func(c *gin.Context) { c.Next() }
	}

	return func(c *gin.Context) {
		if !strings.HasPrefix(c.Request.URL.Path, "/api/") {
			c.Next()
			return
		}

		method := c.Request.Method
		if method != http.MethodGet && method != http.MethodPost && method != http.MethodOptions {
			RespondError(c, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "unsupported method", nil)
			c.Abort()
			return
		}

		raw := c.Request.URL.Path + "?" + c.Request.URL.RawQuery
		if ContainsSQLInjection(raw) || ContainsXSS(raw) || wafTraversalPattern.MatchString(raw) {
			log.Printf("[SECURITY] WAF blocked request from %s: %s", c.ClientIP(), raw)
			RespondError(c, http.StatusBadRequest, "WAF_BLOCKED", "request blocked by security rules", nil)
			c.Abort()
			return
		}

		for key, values := range c.Request.URL.Query() {
			if ContainsSQLInjection(key) || ContainsXSS(key) {
				log.Printf("[SECURITY] WAF blocked query key from %s: %s", c.ClientIP(), key)
				RespondError(c, http.StatusBadRequest, "WAF_BLOCKED", "request blocked by security rules", nil)
				c.Abort()
				return
			}
			for _, value := range values {
				if ContainsSQLInjection(value) || ContainsXSS(value) {
					log.Printf("[SECURITY] WAF blocked query value from %s: %s", c.ClientIP(), value)
					RespondError(c, http.StatusBadRequest, "WAF_BLOCKED", "request blocked by security rules", nil)
					c.Abort()
					return
				}
			}
		}

		if ua := c.Request.UserAgent(); len(ua) > 512 {
			log.Printf("[SECURITY] WAF blocked long user-agent from %s", c.ClientIP())
			RespondError(c, http.StatusBadRequest, "WAF_BLOCKED", "request blocked by security rules", nil)
			c.Abort()
			return
		}

		c.Next()
	}
}
