package middleware

import (
    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
)

const CtxRequestID = "request_id"

func RequestID() gin.HandlerFunc {
    return func(c *gin.Context) {
        rid := c.GetHeader("X-Request-ID")
        if rid == "" {
            rid = uuid.NewString()
        }
        c.Set(CtxRequestID, rid)
        c.Writer.Header().Set("X-Request-ID", rid)
        c.Next()
    }
}

