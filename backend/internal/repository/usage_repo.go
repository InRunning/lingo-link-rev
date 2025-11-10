package repository

import (
    "gorm.io/gorm"

    "lingo-link-rev/backend/internal/model"
)

type UsageRepo struct { db *gorm.DB }

func NewUsageRepo(db *gorm.DB) *UsageRepo { return &UsageRepo{db: db} }

func (r *UsageRepo) Create(l *model.UsageLog) error { return r.db.Create(l).Error }

