package api

import (
	"net"
	"strings"

	"github.com/gin-gonic/gin"
)

func clientIP(c *gin.Context) string {
	if c == nil {
		return ""
	}
	if cf := strings.TrimSpace(c.GetHeader("CF-Connecting-IP")); cf != "" {
		if net.ParseIP(cf) != nil {
			return cf
		}
	}
	return c.ClientIP()
}
