package main

import (
    "log"
    "os"
    "os/signal"
    "syscall"
    "time"

    "lingo-link-rev/backend/internal/config"
    "lingo-link-rev/backend/internal/server"
)

func main() {
    cfgPath := "backend/local.yaml"
    if p := os.Getenv("CONFIG_PATH"); p != "" {
        cfgPath = p
    }

    cfg, err := config.Load(cfgPath)
    if err != nil {
        log.Fatalf("load config: %v", err)
    }

    srv, shutdown, err := server.NewHTTPServer(cfg)
    if err != nil {
        log.Fatalf("init server: %v", err)
    }

    go func() {
        if err := srv.Start(); err != nil {
            log.Fatalf("start http: %v", err)
        }
    }()

    sigCh := make(chan os.Signal, 1)
    signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
    <-sigCh
    log.Println("shutting down...")
    ctx, cancel := shutdown.ContextWithTimeout(10 * time.Second)
    defer cancel()
    if err := shutdown.Graceful(ctx); err != nil {
        log.Printf("graceful shutdown error: %v", err)
    }
}

