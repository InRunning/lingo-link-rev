package middleware

import (
    "net/http"
    "strings"

    "github.com/gin-gonic/gin"
    "github.com/golang-jwt/jwt/v5"
    "gorm.io/gorm"

    "lingo-link-rev/backend/internal/config"
    "lingo-link-rev/backend/internal/model"
    "lingo-link-rev/backend/pkg/response"
)

const CtxUser = "user"

func AuthRequired(cfg *config.Config, db *gorm.DB) gin.HandlerFunc {
    return func(c *gin.Context) {
        token := parseBearer(c.GetHeader("Authorization"))
        if token == "" {
            response.Error(c, http.StatusUnauthorized, 10002, "未提供令牌")
            c.Abort()
            return
        }
        claims := jwt.MapClaims{}
        _, err := jwt.ParseWithClaims(token, claims, func(t *jwt.Token) (interface{}, error) {
            return []byte(cfg.JWT.Secret), nil
        }, jwt.WithValidMethods([]string{"HS256"}))
        if err != nil {
            response.Error(c, http.StatusUnauthorized, 10002, "令牌无效")
            c.Abort()
            return
        }
        sub, _ := claims["sub"].(string)
        if sub == "" {
            response.Error(c, http.StatusUnauthorized, 10002, "令牌缺少sub")
            c.Abort()
            return
        }
        var user model.User
        if err := db.First(&user, "id = ?", sub).Error; err != nil {
            response.Error(c, http.StatusUnauthorized, 10002, "用户不存在")
            c.Abort()
            return
        }
        c.Set(CtxUser, &user)
        c.Next()
    }
}

func parseBearer(h string) string {
    if h == "" {
        return ""
    }
    parts := strings.SplitN(h, " ", 2)
    if len(parts) != 2 {
        return ""
    }
    if !strings.EqualFold(parts[0], "Bearer") {
        return ""
    }
    return strings.TrimSpace(parts[1])
}

