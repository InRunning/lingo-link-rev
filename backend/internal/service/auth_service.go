package service

import (
    "errors"
    "strconv"
    "strings"
    "time"

    "github.com/golang-jwt/jwt/v5"
    "github.com/google/uuid"
    "golang.org/x/crypto/bcrypt"
    "gorm.io/gorm"

    "lingo-link-rev/backend/internal/config"
    "lingo-link-rev/backend/internal/model"
    "lingo-link-rev/backend/internal/repository"
)

type AuthService struct {
    cfg       *config.Config
    db        *gorm.DB
    userRepo  *repository.UserRepo
    tokenRepo *repository.TokenRepo
    now       func() time.Time
}

func NewAuthService(cfg *config.Config, db *gorm.DB) *AuthService {
    return &AuthService{
        cfg:       cfg,
        db:        db,
        userRepo:  repository.NewUserRepo(db),
        tokenRepo: repository.NewTokenRepo(db),
        now:       time.Now,
    }
}

type TokenPair struct {
    AccessToken  string        `json:"access_token"`
    RefreshToken string        `json:"refresh_token,omitempty"`
    ExpiresIn    time.Duration `json:"expires_in"`
}

func (s *AuthService) GuestLogin(deviceID, extVersion string) (*model.User, *TokenPair, error) {
    var user *model.User
    var err error
    if deviceID != "" {
        user, err = s.userRepo.FindByDevice(deviceID)
        if err != nil {
            if errors.Is(err, gorm.ErrRecordNotFound) {
                user = &model.User{Provider: "guest", IsGuest: true}
                user.DeviceID = strPtr(deviceID)
                user.DisplayName = strPtr("Guest-" + shortID())
                if err := s.userRepo.Create(user); err != nil {
                    return nil, nil, err
                }
            } else {
                return nil, nil, err
            }
        }
    }
    if user == nil {
        user = &model.User{Provider: "guest", IsGuest: true}
        user.DisplayName = strPtr("Guest-" + shortID())
        if err := s.userRepo.Create(user); err != nil {
            return nil, nil, err
        }
    }
    tp, err := s.issueTokens(user.ID, true)
    if err != nil {
        return nil, nil, err
    }
    now := s.now()
    user.LastLoginAt = &now
    _ = s.userRepo.Update(user)
    return user, tp, nil
}

func (s *AuthService) Register(email, password, displayName string) (*model.User, *TokenPair, error) {
    em := strings.ToLower(strings.TrimSpace(email))
    if em == "" || password == "" {
        return nil, nil, errors.New("参数错误")
    }
    hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
    if err != nil { return nil, nil, err }
    user := &model.User{Provider: "local", IsGuest: false}
    user.Email = &em
    user.PasswordHash = strPtr(string(hash))
    if displayName != "" { user.DisplayName = &displayName }
    if err := s.userRepo.Create(user); err != nil { return nil, nil, err }
    tp, err := s.issueTokens(user.ID, false)
    if err != nil { return nil, nil, err }
    now := s.now(); user.LastLoginAt = &now; _ = s.userRepo.Update(user)
    return user, tp, nil
}

func (s *AuthService) Login(email, password string) (*model.User, *TokenPair, error) {
    em := strings.ToLower(strings.TrimSpace(email))
    u, err := s.userRepo.FindByEmail(em)
    if err != nil { return nil, nil, err }
    if u.PasswordHash == nil { return nil, nil, errors.New("账号无效") }
    if err := bcrypt.CompareHashAndPassword([]byte(*u.PasswordHash), []byte(password)); err != nil {
        return nil, nil, errors.New("邮箱或密码错误")
    }
    tp, err := s.issueTokens(u.ID, false)
    if err != nil { return nil, nil, err }
    now := s.now(); u.LastLoginAt = &now; _ = s.userRepo.Update(u)
    return u, tp, nil
}

func (s *AuthService) Refresh(refreshToken string) (*TokenPair, error) {
    claims := jwt.MapClaims{}
    t, err := jwt.ParseWithClaims(refreshToken, claims, func(t *jwt.Token) (interface{}, error) {
        return []byte(s.cfg.JWT.Secret), nil
    }, jwt.WithValidMethods([]string{"HS256"}))
    if err != nil || !t.Valid { return nil, errors.New("refresh token 无效") }
    typ, _ := claims["typ"].(string)
    if typ != "refresh" { return nil, errors.New("令牌类型错误") }
    sub, _ := claims["sub"].(string)
    jti, _ := claims["jti"].(string)
    if sub == "" || jti == "" { return nil, errors.New("令牌缺失字段") }
    rec, err := s.tokenRepo.GetByJTI(jti)
    if err != nil { return nil, errors.New("刷新凭证不存在") }
    if rec.Revoked || rec.ExpiresAt.Before(s.now()) { return nil, errors.New("刷新凭证已失效") }
    _ = s.tokenRepo.Revoke(jti)
    uid := parseUint64(sub)
    tp, err := s.issueTokens(uid, false)
    if err != nil { return nil, err }
    return tp, nil
}

func (s *AuthService) issueTokens(userID uint64, isGuest bool) (*TokenPair, error) {
    now := s.now()
    atClaims := jwt.MapClaims{
        "sub":  fmtUint64(userID),
        "typ":  "access",
        "iat":  now.Unix(),
        "exp":  now.Add(s.cfg.AccessTTL).Unix(),
        "prov": func() string { if isGuest { return "guest" } else { return "local" } }(),
    }
    at := jwt.NewWithClaims(jwt.SigningMethodHS256, atClaims)
    access, err := at.SignedString([]byte(s.cfg.JWT.Secret))
    if err != nil { return nil, err }

    jti := uuid.NewString()
    rtClaims := jwt.MapClaims{
        "sub": fmtUint64(userID),
        "typ": "refresh",
        "jti": jti,
        "iat": now.Unix(),
        "exp": now.Add(s.cfg.RefreshTTL).Unix(),
    }
    rt := jwt.NewWithClaims(jwt.SigningMethodHS256, rtClaims)
    refresh, err := rt.SignedString([]byte(s.cfg.JWT.Secret))
    if err != nil { return nil, err }

    rec := &model.RefreshToken{UserID: userID, JTI: jti, ExpiresAt: now.Add(s.cfg.RefreshTTL), Revoked: false}
    if err := s.tokenRepo.Create(rec); err != nil { return nil, err }
    return &TokenPair{AccessToken: access, RefreshToken: refresh, ExpiresIn: s.cfg.AccessTTL}, nil
}

func strPtr(s string) *string { return &s }

func shortID() string { return uuid.NewString()[:8] }

func fmtUint64(v uint64) string { return strconv.FormatUint(v, 10) }

func parseUint64(s string) uint64 { v, _ := strconv.ParseUint(s, 10, 64); return v }
