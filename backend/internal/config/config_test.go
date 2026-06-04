package config

import (
	"errors"
	"os"
	"strings"
	"testing"
	"time"
)

func resetEnv(t *testing.T, env map[string]string) {
	t.Helper()
	keys := []string{
		"APP_ENV", "HTTP_ADDR", "DATABASE_URL",
		"DB_MAX_CONNS", "DB_MIN_CONNS", "LOG_LEVEL",
		"CORS_ALLOWED_ORIGINS", "MIGRATE_ON_BOOT",
		"REQUEST_TIMEOUT", "READ_TIMEOUT", "WRITE_TIMEOUT",
		"SEED_SOURCE_DIR",
		"CONNECT_RATE_RPS", "CONNECT_RATE_BURST",
		"WS_RATE_RPS", "WS_RATE_BURST",
	}

	originals := make(map[string]string, len(keys))
	for _, k := range keys {
		originals[k] = os.Getenv(k)
		_ = os.Unsetenv(k)
	}
	t.Cleanup(func() {
		for k, v := range originals {
			if v == "" {
				_ = os.Unsetenv(k)
			} else {
				_ = os.Setenv(k, v)
			}
		}
	})
	for k, v := range env {
		t.Setenv(k, v)
	}
}

func TestLoad_DefaultsWithMinimumRequired(t *testing.T) {
	resetEnv(t, map[string]string{
		"DATABASE_URL": "postgres://u:p@localhost/db",
	})

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() returned unexpected error: %v", err)
	}

	if cfg.AppEnv != EnvDevelopment {
		t.Errorf("AppEnv = %q, want %q", cfg.AppEnv, EnvDevelopment)
	}
	if cfg.HTTPAddr != ":8080" {
		t.Errorf("HTTPAddr = %q, want :8080", cfg.HTTPAddr)
	}
	if cfg.DBMaxConns != 10 {
		t.Errorf("DBMaxConns = %d, want 10", cfg.DBMaxConns)
	}
	if cfg.DBMinConns != 2 {
		t.Errorf("DBMinConns = %d, want 2", cfg.DBMinConns)
	}
	if cfg.RequestTimeout != 10*time.Second {
		t.Errorf("RequestTimeout = %v, want 10s", cfg.RequestTimeout)
	}
	if !cfg.MigrateOnBoot {
		t.Errorf("MigrateOnBoot default should be true")
	}
	if !cfg.IsDevelopment() || cfg.IsProduction() {
		t.Errorf("IsDevelopment/IsProduction helpers inconsistent: dev=%v prod=%v",
			cfg.IsDevelopment(), cfg.IsProduction())
	}
	if cfg.ConnectRateRPS != 20 {
		t.Errorf("ConnectRateRPS = %v, want 20", cfg.ConnectRateRPS)
	}
	if cfg.ConnectRateBurst != 40 {
		t.Errorf("ConnectRateBurst = %d, want 40", cfg.ConnectRateBurst)
	}
	if cfg.WSRateRPS != 3 {
		t.Errorf("WSRateRPS = %v, want 3", cfg.WSRateRPS)
	}
	if cfg.WSRateBurst != 5 {
		t.Errorf("WSRateBurst = %d, want 5", cfg.WSRateBurst)
	}
}

func TestLoad_RateLimitOverrides(t *testing.T) {
	resetEnv(t, map[string]string{
		"DATABASE_URL":       "postgres://u:p@localhost/db",
		"CONNECT_RATE_RPS":   "1000",
		"CONNECT_RATE_BURST": "2000",
		"WS_RATE_RPS":        "50",
		"WS_RATE_BURST":      "100",
	})

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() returned unexpected error: %v", err)
	}

	if cfg.ConnectRateRPS != 1000 {
		t.Errorf("ConnectRateRPS = %v, want 1000", cfg.ConnectRateRPS)
	}
	if cfg.ConnectRateBurst != 2000 {
		t.Errorf("ConnectRateBurst = %d, want 2000", cfg.ConnectRateBurst)
	}
	if cfg.WSRateRPS != 50 {
		t.Errorf("WSRateRPS = %v, want 50", cfg.WSRateRPS)
	}
	if cfg.WSRateBurst != 100 {
		t.Errorf("WSRateBurst = %d, want 100", cfg.WSRateBurst)
	}
}

func TestLoad_ProductionRequiresCORS(t *testing.T) {
	resetEnv(t, map[string]string{
		"APP_ENV":      "production",
		"DATABASE_URL": "postgres://u:p@localhost/db",
	})
	_, err := Load()
	if err == nil {
		t.Fatal("expected error when production lacks CORS origins")
	}
	if !errors.Is(err, ErrMissingValue) {
		t.Errorf("error wrap chain missing ErrMissingValue: %v", err)
	}
	if !strings.Contains(err.Error(), "CORS_ALLOWED_ORIGINS") {
		t.Errorf("error message should reference CORS_ALLOWED_ORIGINS: %v", err)
	}
}

func TestLoad_ProductionWithCORS(t *testing.T) {
	resetEnv(t, map[string]string{
		"APP_ENV":              "production",
		"DATABASE_URL":         "postgres://u:p@localhost/db",
		"CORS_ALLOWED_ORIGINS": "https://a.example.com, ,https://b.example.com",
	})
	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load returned unexpected error: %v", err)
	}
	if !cfg.IsProduction() {
		t.Error("IsProduction should be true")
	}
	wantOrigins := []string{"https://a.example.com", "https://b.example.com"}
	if len(cfg.CORSAllowedOrigins) != len(wantOrigins) {
		t.Fatalf("CORS origins len=%d, want %d", len(cfg.CORSAllowedOrigins), len(wantOrigins))
	}
	for i, o := range wantOrigins {
		if cfg.CORSAllowedOrigins[i] != o {
			t.Errorf("CORS[%d]=%q want %q", i, cfg.CORSAllowedOrigins[i], o)
		}
	}
}

func TestLoad_Validation_TableDriven(t *testing.T) {
	tests := []struct {
		name    string
		env     map[string]string
		wantErr error
		contain string
	}{
		{
			name:    "missing DATABASE_URL",
			env:     map[string]string{},
			contain: "DATABASE_URL",
		},
		{
			name: "invalid APP_ENV",
			env: map[string]string{
				"APP_ENV":      "staging",
				"DATABASE_URL": "postgres://u:p@h/db",
			},
			wantErr: ErrInvalidEnv,
			contain: "APP_ENV",
		},
		{
			name: "DB_MAX_CONNS zero",
			env: map[string]string{
				"DATABASE_URL": "postgres://u:p@h/db",
				"DB_MAX_CONNS": "0",
			},
			contain: "DB_MAX_CONNS",
		},
		{
			name: "DB_MIN_CONNS > MAX",
			env: map[string]string{
				"DATABASE_URL": "postgres://u:p@h/db",
				"DB_MAX_CONNS": "4",
				"DB_MIN_CONNS": "5",
			},
			contain: "DB_MIN_CONNS",
		},
		{
			name: "REQUEST_TIMEOUT zero",
			env: map[string]string{
				"DATABASE_URL":    "postgres://u:p@h/db",
				"REQUEST_TIMEOUT": "0s",
			},
			contain: "REQUEST_TIMEOUT",
		},
		{
			name: "READ_TIMEOUT zero",
			env: map[string]string{
				"DATABASE_URL": "postgres://u:p@h/db",
				"READ_TIMEOUT": "0s",
			},
			contain: "READ_TIMEOUT",
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			resetEnv(t, tc.env)
			_, err := Load()
			if err == nil {
				t.Fatalf("expected error")
			}
			if tc.wantErr != nil && !errors.Is(err, tc.wantErr) {
				t.Errorf("error wrap chain missing %v: %v", tc.wantErr, err)
			}
			if tc.contain != "" && !strings.Contains(err.Error(), tc.contain) {
				t.Errorf("error %q should contain %q", err.Error(), tc.contain)
			}
		})
	}
}

func TestLoad_LogLevelAndAppEnv_LowerCased(t *testing.T) {
	resetEnv(t, map[string]string{
		"DATABASE_URL": "postgres://u:p@h/db",
		"APP_ENV":      "  Development ",
		"LOG_LEVEL":    " WARN ",
	})
	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load returned err: %v", err)
	}
	if cfg.AppEnv != "development" {
		t.Errorf("AppEnv = %q, want development", cfg.AppEnv)
	}
	if cfg.LogLevel != "warn" {
		t.Errorf("LogLevel = %q, want warn", cfg.LogLevel)
	}
}

func TestTrimSlice(t *testing.T) {
	tests := []struct {
		name string
		in   []string
		want []string
	}{
		{"empty", nil, []string{}},
		{"only blanks", []string{"", " ", "\t"}, []string{}},
		{"mixed", []string{" a ", "", "b"}, []string{"a", "b"}},
	}
	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			got := trimSlice(tc.in)
			if len(got) != len(tc.want) {
				t.Fatalf("len=%d want=%d (%v)", len(got), len(tc.want), got)
			}
			for i := range got {
				if got[i] != tc.want[i] {
					t.Errorf("[%d]=%q want %q", i, got[i], tc.want[i])
				}
			}
		})
	}
}
