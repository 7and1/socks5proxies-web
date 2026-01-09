package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"socksproxies.com/server/internal/config"
	"socksproxies.com/server/internal/store"
)

func TestHealthEndpoint(t *testing.T) {
	gin.SetMode(gin.TestMode)
	cfg := config.Load()
	store, err := store.Open(t.TempDir() + "/test.db")
	if err != nil {
		t.Fatalf("store open: %v", err)
	}

	h := NewHandler(cfg, store, nil)
	router := NewRouter(cfg)
	router.GET("/api/health", h.Health)

	req := httptest.NewRequest(http.MethodGet, "/api/health", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200 got %d", rec.Code)
	}
}

func TestWhoamiEndpoint(t *testing.T) {
	gin.SetMode(gin.TestMode)
	cfg := config.Load()
	store, err := store.Open(t.TempDir() + "/test.db")
	if err != nil {
		t.Fatalf("store open: %v", err)
	}

	h := NewHandler(cfg, store, nil)
	router := NewRouter(cfg)
	router.GET("/api/whoami", h.Whoami)

	req := httptest.NewRequest(http.MethodGet, "/api/whoami", nil)
	req.Header.Set("User-Agent", "test-agent")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200 got %d", rec.Code)
	}
}
