package repository

import (
    "time"

    "gorm.io/gorm"

    "lingo-link-rev/backend/internal/model"
)

type TokenRepo struct { db *gorm.DB }

func NewTokenRepo(db *gorm.DB) *TokenRepo { return &TokenRepo{db: db} }

func (r *TokenRepo) Create(t *model.RefreshToken) error { return r.db.Create(t).Error }

func (r *TokenRepo) GetByJTI(jti string) (*model.RefreshToken, error) {
    var t model.RefreshToken
    if err := r.db.Where("jti = ?", jti).First(&t).Error; err != nil {
        return nil, err
    }
    return &t, nil
}

func (r *TokenRepo) Revoke(jti string) error {
    return r.db.Model(&model.RefreshToken{}).Where("jti = ?", jti).Update("revoked", true).Error
}

func (r *TokenRepo) DeleteExpired(now time.Time) error {
    return r.db.Where("expires_at < ?", now).Delete(&model.RefreshToken{}).Error
}

