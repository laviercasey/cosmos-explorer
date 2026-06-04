//go:build integration

package testutil

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"cosmos/backend/internal/db"
)

func NewTestDB(t *testing.T) (*pgxpool.Pool, func()) {
	t.Helper()

	if url := os.Getenv("TEST_DATABASE_URL"); url != "" {
		return newPoolFromURL(t, url), func() {}
	}

	url, cleanup, ok := newContainerDSN(t)
	if !ok {
		t.Skip("Docker not available and TEST_DATABASE_URL not set; skipping integration test")
	}
	pool := newPoolFromURL(t, url)
	return pool, cleanup
}

func newPoolFromURL(t *testing.T, url string) *pgxpool.Pool {
	t.Helper()
	if err := db.MigrateUp(url); err != nil {
		t.Fatalf("apply migrations: %v", err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	pool, err := db.NewPool(ctx, db.PoolConfig{DatabaseURL: url, MaxConns: 4, MinConns: 1})
	if err != nil {
		t.Fatalf("new pool: %v", err)
	}
	return pool
}
