package handler

import (
    "net/http"

    "github.com/gin-gonic/gin"
    "gorm.io/gorm"

    "lingo-link-rev/backend/internal/config"
    "lingo-link-rev/backend/internal/middleware"
    "lingo-link-rev/backend/internal/service"
    "lingo-link-rev/backend/pkg/response"
)

type AuthHandler struct {
    svc *service.AuthService
}

func NewAuthHandler(cfg *config.Config, db *gorm.DB) *AuthHandler {
    return &AuthHandler{svc: service.NewAuthService(cfg, db)}
}

type guestLoginReq struct {
    DeviceID   string `json:"device_id"`
    ExtVersion string `json:"ext_version"`
}

func (h *AuthHandler) GuestLogin(c *gin.Context) {
    var req guestLoginReq
    _ = c.ShouldBindJSON(&req)
    user, tp, err := h.svc.GuestLogin(req.DeviceID, req.ExtVersion)
    if err != nil {
        response.Error(c, http.StatusInternalServerError, 10005, err.Error())
        return
    }
    response.OK(c, gin.H{"user": user, "access_token": tp.AccessToken, "refresh_token": tp.RefreshToken, "expires_in": int(tp.ExpiresIn.Seconds())})
}

type registerReq struct {
    Email       string `json:"email"`
    Password    string `json:"password"`
    DisplayName string `json:"display_name"`
}

func (h *AuthHandler) Register(c *gin.Context) {
    var req registerReq
    if err := c.ShouldBindJSON(&req); err != nil { response.Error(c, 400, 10001, "参数错误"); return }
    user, tp, err := h.svc.Register(req.Email, req.Password, req.DisplayName)
    if err != nil { response.Error(c, 400, 10002, err.Error()); return }
    response.OK(c, gin.H{"user": user, "access_token": tp.AccessToken, "refresh_token": tp.RefreshToken, "expires_in": int(tp.ExpiresIn.Seconds())})
}

type loginReq struct { Email string `json:"email"`; Password string `json:"password"` }

func (h *AuthHandler) Login(c *gin.Context) {
    var req loginReq
    if err := c.ShouldBindJSON(&req); err != nil { response.Error(c, 400, 10001, "参数错误"); return }
    user, tp, err := h.svc.Login(req.Email, req.Password)
    if err != nil { response.Error(c, 401, 10002, err.Error()); return }
    response.OK(c, gin.H{"user": user, "access_token": tp.AccessToken, "refresh_token": tp.RefreshToken, "expires_in": int(tp.ExpiresIn.Seconds())})
}

type refreshReq struct { RefreshToken string `json:"refresh_token"` }

func (h *AuthHandler) Refresh(c *gin.Context) {
    var req refreshReq
    if err := c.ShouldBindJSON(&req); err != nil { response.Error(c, 400, 10001, "参数错误"); return }
    tp, err := h.svc.Refresh(req.RefreshToken)
    if err != nil { response.Error(c, 401, 10002, err.Error()); return }
    response.OK(c, gin.H{"access_token": tp.AccessToken, "refresh_token": tp.RefreshToken, "expires_in": int(tp.ExpiresIn.Seconds())})
}

func (h *AuthHandler) Me(c *gin.Context) {
    u, _ := c.Get(middleware.CtxUser)
    if u == nil { response.Error(c, 401, 10002, "未登录"); return }
    response.OK(c, u)
}

