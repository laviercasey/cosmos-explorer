package config

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/kelseyhightower/envconfig"
)

const (
	EnvDevelopment = "development"
	EnvProduction  = "production"
)

type Config struct {
	AppEnv             string        `envconfig:"APP_ENV"              default:"development"`
	HTTPAddr           string        `envconfig:"HTTP_ADDR"            default:":8080"`
	DatabaseURL        string        `envconfig:"DATABASE_URL"         required:"true"`
	DBMaxConns         int32         `envconfig:"DB_MAX_CONNS"         default:"10"`
	DBMinConns         int32         `envconfig:"DB_MIN_CONNS"         default:"2"`
	LogLevel           string        `envconfig:"LOG_LEVEL"            default:"info"`
	CORSAllowedOrigins []string      `envconfig:"CORS_ALLOWED_ORIGINS"`
	MigrateOnBoot      bool          `envconfig:"MIGRATE_ON_BOOT"      default:"true"`
	RequestTimeout     time.Duration `envconfig:"REQUEST_TIMEOUT"      default:"10s"`
	ReadTimeout        time.Duration `envconfig:"READ_TIMEOUT"         default:"15s"`
	WriteTimeout       time.Duration `envconfig:"WRITE_TIMEOUT"        default:"15s"`
	SeedSourceDir      string        `envconfig:"SEED_SOURCE_DIR"      default:"../src/entities"`
	ConnectRateRPS     float64       `envconfig:"CONNECT_RATE_RPS"     default:"20"`
	ConnectRateBurst   int           `envconfig:"CONNECT_RATE_BURST"   default:"40"`
	WSRateRPS          float64       `envconfig:"WS_RATE_RPS"          default:"3"`
	WSRateBurst        int           `envconfig:"WS_RATE_BURST"        default:"5"`
}

func Load() (Config, error) {
	var cfg Config
	if err := envconfig.Process("", &cfg); err != nil {
		return Config{}, fmt.Errorf("config: process env: %w", err)
	}
	cfg.AppEnv = strings.ToLower(strings.TrimSpace(cfg.AppEnv))
	cfg.LogLevel = strings.ToLower(strings.TrimSpace(cfg.LogLevel))
	cfg.CORSAllowedOrigins = trimSlice(cfg.CORSAllowedOrigins)

	if err := cfg.validate(); err != nil {
		return Config{}, err
	}
	return cfg, nil
}

func (c Config) IsProduction() bool {
	return c.AppEnv == EnvProduction
}

func (c Config) IsDevelopment() bool {
	return c.AppEnv == EnvDevelopment
}

func (c Config) validate() error {
	if c.AppEnv != EnvDevelopment && c.AppEnv != EnvProduction {
		return fmt.Errorf("config: APP_ENV %q: %w", c.AppEnv, ErrInvalidEnv)
	}
	if strings.TrimSpace(c.DatabaseURL) == "" {
		return fmt.Errorf("config: DATABASE_URL: %w", ErrMissingValue)
	}
	if c.DBMaxConns <= 0 {
		return fmt.Errorf("config: DB_MAX_CONNS must be > 0 (got %d)", c.DBMaxConns)
	}
	if c.DBMinConns < 0 || c.DBMinConns > c.DBMaxConns {
		return fmt.Errorf("config: DB_MIN_CONNS=%d out of range [0,%d]", c.DBMinConns, c.DBMaxConns)
	}
	if c.RequestTimeout <= 0 {
		return fmt.Errorf("config: REQUEST_TIMEOUT must be > 0")
	}
	if c.ReadTimeout <= 0 || c.WriteTimeout <= 0 {
		return fmt.Errorf("config: READ_TIMEOUT and WRITE_TIMEOUT must be > 0")
	}
	if c.IsProduction() && len(c.CORSAllowedOrigins) == 0 {
		return fmt.Errorf("config: CORS_ALLOWED_ORIGINS required in production: %w", ErrMissingValue)
	}
	return nil
}

var ErrMissingValue = errors.New("missing required value")

var ErrInvalidEnv = errors.New("invalid APP_ENV")

func trimSlice(in []string) []string {
	out := make([]string, 0, len(in))
	for _, s := range in {
		s = strings.TrimSpace(s)
		if s != "" {
			out = append(out, s)
		}
	}
	return out
}
