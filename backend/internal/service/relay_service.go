package service

import (
    "context"
    "io"
    "net/http"
    "time"

    "gorm.io/gorm"

    "lingo-link-rev/backend/internal/config"
    "lingo-link-rev/backend/internal/model"
    "lingo-link-rev/backend/internal/repository"
)

type RelayService struct {
    cfg        *config.Config
    db         *gorm.DB
    usageRepo  *repository.UsageRepo
    httpClient *http.Client
    limiter    *QuotaLimiter
}

func NewRelayService(cfg *config.Config, db *gorm.DB, limiter *QuotaLimiter) *RelayService {
    tr := &http.Transport{Proxy: http.ProxyFromEnvironment}
    return &RelayService{
        cfg: cfg,
        db:  db,
        usageRepo: repository.NewUsageRepo(db),
        httpClient: &http.Client{Transport: tr, Timeout: 0},
        limiter: limiter,
    }
}

func (s *RelayService) Proxy(ctx context.Context, userID uint64, body io.Reader, headers http.Header) (*http.Response, error) {
    req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.cfg.Relay.Url, body)
    if err != nil { return nil, err }
    for k, v := range headers {
        // 仅透传部分无害头
        if k == "Content-Type" || k == "Accept" {
            for _, vv := range v { req.Header.Add(k, vv) }
        }
    }
    if s.cfg.Relay.ApiKey != "" {
        req.Header.Set("Authorization", "Bearer "+s.cfg.Relay.ApiKey)
    }
    return s.httpClient.Do(req)
}

func (s *RelayService) LogUsage(userID *uint64, route string, bytes *int) {
    l := &model.UsageLog{UserID: userID, Route: route, CreatedAt: time.Now()}
    if bytes != nil { l.Bytes = bytes }
    _ = s.usageRepo.Create(l)
}

func (s *RelayService) AllowGuest(userID uint64) bool {
    limit := s.cfg.Guest.DailyLimit
    if limit <= 0 { return true }
    return s.limiter.Allow(userID, limit)
}

