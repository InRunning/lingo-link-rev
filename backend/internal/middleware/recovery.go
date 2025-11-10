package middleware

import (
    "log"
    "runtime/debug"

    "github.com/gin-gonic/gin"
)

func Recovery() gin.HandlerFunc {
    return func(c *gin.Context) {
        defer func() {
            if r := recover(); r != nil {
                log.Printf("panic: %v\n%s", r, string(debug.Stack()))
                c.AbortWithStatus(500)
            }
        }()
        c.Next()
    }
}

