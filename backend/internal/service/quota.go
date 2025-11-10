package service

import (
    "sync"
    "time"
)

type QuotaLimiter struct {
    mu   sync.Mutex
    data map[string]int
}

func NewQuotaLimiter() *QuotaLimiter { return &QuotaLimiter{data: map[string]int{}} }

func (q *QuotaLimiter) key(userID uint64, day string) string { return day + ":" + fmtUint64(userID) }

func (q *QuotaLimiter) Allow(userID uint64, limit int) bool {
    day := time.Now().Format("2006-01-02")
    k := q.key(userID, day)
    q.mu.Lock()
    defer q.mu.Unlock()
    n := q.data[k]
    if n >= limit {
        return false
    }
    q.data[k] = n + 1
    return true
}

