package server

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/mysql"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"lingo-link-rev/backend/internal/config"
	"lingo-link-rev/backend/internal/handler"
	"lingo-link-rev/backend/internal/middleware"
	"lingo-link-rev/backend/internal/model"
)

type HTTPServer struct {
	cfg    *config.Config
	engine *gin.Engine
	db     *gorm.DB
	srv    *http.Server
}

type Graceful struct{}

func (g *Graceful) ContextWithTimeout(d time.Duration) (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), d)
}

func (s *HTTPServer) Start() error {
	return s.srv.ListenAndServe()
}

func (s *HTTPServer) Graceful(ctx context.Context) error {
	return s.srv.Shutdown(ctx)
}

func NewHTTPServer(cfg *config.Config) (*HTTPServer, *Graceful, error) {
	if cfg.Server.Mode == "release" {
		gin.SetMode(gin.ReleaseMode)
	}
	engine := gin.New()

	db, err := openDB(cfg)
	if err != nil {
		return nil, nil, err
	}
	if err := db.AutoMigrate(&model.User{}, &model.RefreshToken{}, &model.UsageLog{}); err != nil {
		return nil, nil, err
	}

	engine.Use(middleware.Recovery())
	engine.Use(middleware.RequestID())
	engine.Use(middleware.CORS(cfg.Server.CORS.AllowOrigins, cfg.Server.CORS.AllowHeaders))

	api := engine.Group("/api/v1")

	health := handler.NewHealthHandler()
	api.GET("/healthz", health.Healthz)

	auth := handler.NewAuthHandler(cfg, db)
	api.POST("/auth/guest-login", auth.GuestLogin)
	api.POST("/auth/register", auth.Register)
	api.POST("/auth/login", auth.Login)
	api.POST("/auth/refresh", auth.Refresh)
	api.GET("/auth/me", middleware.AuthRequired(cfg, db), auth.Me)

	relay := handler.NewRelayHandler(cfg, db)
	api.POST("/relay/chat/completions", middleware.AuthRequired(cfg, db), relay.ChatCompletions)

	srv := &http.Server{
		Addr:           cfg.Server.Address,
		Handler:        engine,
		ReadTimeout:    60 * time.Second,
		WriteTimeout:   0, // 允许流式
		MaxHeaderBytes: 1 << 20,
	}

	httpSrv := &HTTPServer{cfg: cfg, engine: engine, db: db, srv: srv}
	return httpSrv, &Graceful{}, nil
}

func openDB(cfg *config.Config) (*gorm.DB, error) {
	var (
		db  *gorm.DB
		err error
	)
	switch cfg.DB.Driver {
	case "mysql":
		db, err = gorm.Open(mysql.Open(cfg.DB.DSN), &gorm.Config{})
	case "sqlite":
		fallthrough
	default:
		db, err = gorm.Open(sqlite.Open(cfg.DB.DSN), &gorm.Config{})
	}
	if err != nil {
		return nil, err
	}

	sqlDB, _ := db.DB()
	if sqlDB != nil {
		if cfg.DB.Driver == "sqlite" {
			if _, err := sqlDB.Exec("PRAGMA journal_mode=WAL;"); err != nil {
				log.Printf("sqlite wal err: %v", err)
			}
		}
		if cfg.DB.Driver == "mysql" {
			if cfg.Mysql.MaxIdleConns > 0 {
				sqlDB.SetMaxIdleConns(cfg.Mysql.MaxIdleConns)
			}
			if cfg.Mysql.MaxOpenConns > 0 {
				sqlDB.SetMaxOpenConns(cfg.Mysql.MaxOpenConns)
			}
		}
	}
	return db, nil
}
