package model

import "time"

type RefreshToken struct {
    ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
    UserID    uint64    `gorm:"index" json:"user_id"`
    JTI       string    `gorm:"size:36;uniqueIndex" json:"jti"`
    ExpiresAt time.Time `json:"expires_at"`
    Revoked   bool      `gorm:"index" json:"revoked"`
    CreatedAt time.Time `json:"created_at"`
}

func (RefreshToken) TableName() string { return "refresh_tokens" }

