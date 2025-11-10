package middleware

import (
    "net/http"
    "strings"

    "github.com/gin-gonic/gin"
)

func CORS(allowOrigins []string, allowHeaders []string) gin.HandlerFunc {
    originSet := map[string]struct{}{}
    for _, o := range allowOrigins {
        originSet[o] = struct{}{}
    }
    allowHeadersStr := strings.Join(allowHeaders, ", ")
    return func(c *gin.Context) {
        origin := c.GetHeader("Origin")
        if origin != "" {
            if _, ok := originSet[origin]; ok || strings.HasPrefix(origin, "chrome-extension://") {
                c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
                c.Writer.Header().Set("Vary", "Origin")
                c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
                c.Writer.Header().Set("Access-Control-Allow-Headers", allowHeadersStr)
                c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
            }
        }
        if c.Request.Method == http.MethodOptions {
            c.AbortWithStatus(http.StatusNoContent)
            return
        }
        c.Next()
    }
}

