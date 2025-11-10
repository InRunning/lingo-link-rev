package model

import "time"

type UsageLog struct {
    ID              uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
    UserID          *uint64    `gorm:"index" json:"user_id,omitempty"`
    Route           string     `gorm:"size:128;index" json:"route"`
    Tokens          *int       `json:"tokens,omitempty"`
    PromptChars     *int       `json:"prompt_chars,omitempty"`
    CompletionChars *int       `json:"completion_chars,omitempty"`
    Bytes           *int       `json:"bytes,omitempty"`
    Cost            *float64   `json:"cost,omitempty"`
    CreatedAt       time.Time  `json:"created_at"`
}

func (UsageLog) TableName() string { return "usage_logs" }

