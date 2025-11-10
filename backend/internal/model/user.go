package model

import "time"

type User struct {
    ID           uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
    Email        *string   `gorm:"uniqueIndex;size:255" json:"email,omitempty"`
    PasswordHash *string   `gorm:"size:255" json:"-"`
    Provider     string    `gorm:"size:16;index" json:"provider"`
    IsGuest      bool      `gorm:"index" json:"is_guest"`
    DeviceID     *string   `gorm:"size:64;index" json:"device_id,omitempty"`
    DisplayName  *string   `gorm:"size:255" json:"display_name,omitempty"`
    CreatedAt    time.Time `json:"created_at"`
    UpdatedAt    time.Time `json:"updated_at"`
    LastLoginAt  *time.Time `json:"last_login_at,omitempty"`
}

func (User) TableName() string { return "users" }

