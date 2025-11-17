package config

import (
	"errors"
	"fmt"
	"io/ioutil"
	"os"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
)

type ServerCfg struct {
	Address string `yaml:"Address"`
	Mode    string `yaml:"Mode"`
	CORS    struct {
		AllowOrigins []string `yaml:"AllowOrigins"`
		AllowHeaders []string `yaml:"AllowHeaders"`
	} `yaml:"CORS"`
}

type DBCfg struct {
	Driver string `yaml:"Driver"`
	DSN    string `yaml:"DSN"`
}

type JWTCfg struct {
	Secret     string `yaml:"Secret"`
	AccessTTL  string `yaml:"AccessTTL"`
	RefreshTTL string `yaml:"RefreshTTL"`
}

type GuestCfg struct {
	DailyLimit int `yaml:"DailyLimit"`
}

type RelayCfg struct {
	Model       string  `yaml:"Model"`
	Url         string  `yaml:"Url"`
	ApiKey      string  `yaml:"ApiKey"`
	Temperature float32 `yaml:"Temperature"`
	Stream      bool    `yaml:"Stream"`
}

type MysqlCfg struct {
	Path         string `yaml:"Path"`
	Port         string `yaml:"Port"`
	Config       string `yaml:"Config"`
	Dbname       string `yaml:"Dbname"`
	Username     string `yaml:"Username"`
	Password     string `yaml:"Password"`
	MaxIdleConns int    `yaml:"MaxIdleConns"`
	MaxOpenConns int    `yaml:"MaxOpenConns"`
	LogMode      string `yaml:"LogMode"`
	LogZap       bool   `yaml:"LogZap"`
}

type Config struct {
	Server ServerCfg `yaml:"Server"`
	DB     DBCfg     `yaml:"DB"`
	JWT    JWTCfg    `yaml:"JWT"`
	Guest  GuestCfg  `yaml:"Guest"`
	Relay  RelayCfg  `yaml:"Relay"`
	Mysql  MysqlCfg  `yaml:"Mysql"`

	// Parsed durations
	AccessTTL  time.Duration `yaml:"-"`
	RefreshTTL time.Duration `yaml:"-"`
}

func Load(path string) (*Config, error) {
	b, err := ioutil.ReadFile(path)
	if err != nil {
		return nil, err
	}
	// 环境变量替换
	s := os.ExpandEnv(string(b))

	var cfg Config
	if err := yaml.Unmarshal([]byte(s), &cfg); err != nil {
		return nil, err
	}

	if cfg.Server.Address == "" {
		cfg.Server.Address = ":8080"
	}
	if cfg.Server.Mode == "" {
		cfg.Server.Mode = "release"
	}

	if cfg.JWT.Secret == "" {
		cfg.JWT.Secret = os.Getenv("JWT_SECRET")
	}
	if cfg.JWT.Secret == "" {
		return nil, errors.New("JWT secret empty")
	}

	var aterr, rterr error
	if cfg.JWT.AccessTTL == "" {
		cfg.JWT.AccessTTL = "1h"
	}
	if cfg.JWT.RefreshTTL == "" {
		cfg.JWT.RefreshTTL = "720h"
	}
	cfg.AccessTTL, aterr = time.ParseDuration(cfg.JWT.AccessTTL)
	cfg.RefreshTTL, rterr = time.ParseDuration(cfg.JWT.RefreshTTL)
	if aterr != nil || rterr != nil {
		return nil, fmt.Errorf("parse ttl: %v %v", aterr, rterr)
	}

	// Relay ApiKey 允许放在环境变量
	if cfg.Relay.ApiKey == "" {
		cfg.Relay.ApiKey = os.Getenv("RELAY_API_KEY")
	}

	// 优先使用 Mysql 配置
	if cfg.DB.Driver == "" {
		if cfg.Mysql.Path != "" || cfg.Mysql.Dbname != "" {
			cfg.DB.Driver = "mysql"
		} else {
			cfg.DB.Driver = "sqlite"
		}
	}
	if cfg.DB.Driver == "mysql" {
		if cfg.DB.DSN == "" {
			dsn, derr := buildMySQLDSN(cfg.Mysql)
			if derr != nil {
				return nil, derr
			}
			cfg.DB.DSN = dsn
		}
	} else {
		if cfg.DB.DSN == "" {
			cfg.DB.DSN = "file:lingo.db?cache=shared&mode=rwc"
		}
	}

	// 头部标准化
	if len(cfg.Server.CORS.AllowHeaders) == 0 {
		cfg.Server.CORS.AllowHeaders = []string{"Authorization", "Content-Type", "X-Request-ID"}
	} else {
		for i := range cfg.Server.CORS.AllowHeaders {
			cfg.Server.CORS.AllowHeaders[i] = strings.TrimSpace(cfg.Server.CORS.AllowHeaders[i])
		}
	}
	return &cfg, nil
}

func buildMySQLDSN(cfg MysqlCfg) (string, error) {
	if cfg.Dbname == "" {
		return "", errors.New("mysql dbname empty")
	}
	if cfg.Path == "" {
		return "", errors.New("mysql host empty")
	}
	port := cfg.Port
	if port == "" {
		port = "3306"
	}
	conf := cfg.Config
	if conf == "" {
		conf = "charset=utf8mb4&parseTime=True&loc=Local"
	}
	user := cfg.Username
	if user == "" {
		user = "root"
	}
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?%s", user, cfg.Password, cfg.Path, port, cfg.Dbname, conf)
	return dsn, nil
}
