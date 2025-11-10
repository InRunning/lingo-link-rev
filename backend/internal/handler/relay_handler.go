package handler

import (
    "bytes"
    "io"
    "net/http"
    "strings"

    "github.com/gin-gonic/gin"
    "gorm.io/gorm"

    "lingo-link-rev/backend/internal/config"
    "lingo-link-rev/backend/internal/middleware"
    "lingo-link-rev/backend/internal/model"
    "lingo-link-rev/backend/internal/service"
    "lingo-link-rev/backend/pkg/response"
)

type RelayHandler struct {
    svc     *service.RelayService
    limiter *service.QuotaLimiter
}

func NewRelayHandler(cfg *config.Config, db *gorm.DB) *RelayHandler {
    limiter := service.NewQuotaLimiter()
    return &RelayHandler{svc: service.NewRelayService(cfg, db, limiter), limiter: limiter}
}

func (h *RelayHandler) ChatCompletions(c *gin.Context) {
    uval, _ := c.Get(middleware.CtxUser)
    user := uval.(*model.User)

    if user.IsGuest {
        if !h.svc.AllowGuest(user.ID) {
            response.Error(c, http.StatusTooManyRequests, 10003, "游客当日配额已用尽")
            return
        }
    }

    var buf bytes.Buffer
    if _, err := io.Copy(&buf, c.Request.Body); err != nil {
        response.Error(c, 400, 10001, "读取请求失败")
        return
    }
    resp, err := h.svc.Proxy(c.Request.Context(), user.ID, bytes.NewReader(buf.Bytes()), c.Request.Header)
    if err != nil {
        response.Error(c, 502, 10005, "上游服务不可用")
        return
    }
    defer resp.Body.Close()

    for k, v := range resp.Header { c.Writer.Header()[k] = v }
    c.Status(resp.StatusCode)

    if strings.Contains(strings.ToLower(resp.Header.Get("Content-Type")), "text/event-stream") {
        flusher, ok := c.Writer.(http.Flusher)
        if !ok { response.Error(c, 500, 10005, "不支持流式"); return }
        bytesOut := 0
        buf2 := make([]byte, 8192)
        for {
            n, er := resp.Body.Read(buf2)
            if n > 0 {
                c.Writer.Write(buf2[:n])
                flusher.Flush()
                bytesOut += n
            }
            if er != nil {
                break
            }
        }
        uid := user.ID
        h.svc.LogUsage(&uid, "/api/v1/relay/chat/completions", &bytesOut)
        return
    }

    b, _ := io.ReadAll(resp.Body)
    c.Writer.Write(b)
    bytesOut := len(b)
    uid := user.ID
    h.svc.LogUsage(&uid, "/api/v1/relay/chat/completions", &bytesOut)
}
