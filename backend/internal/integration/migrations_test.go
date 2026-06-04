//go:build integration

package integration

import (
	"context"
	"os"
	"testing"
	"time"

	"cosmos/backend/internal/db"
	"cosmos/backend/internal/testutil"
)

func TestMigrations_UpDownUp(t *testing.T) {
	pool, cleanup := testutil.NewTestDB(t)
	defer cleanup()

	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {

		url = pool.Config().ConnString()
	}

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	for i := 0; i < 10; i++ {
		if err := db.MigrateDown(url); err != nil {
			t.Fatalf("down #%d: %v", i, err)
		}
	}

	var exists bool
	err := pool.QueryRow(ctx,
		`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'planets')`,
	).Scan(&exists)
	if err != nil {
		t.Fatalf("check table existence: %v", err)
	}
	if exists {
		t.Error("planets table should not exist after full down migration")
	}

	if err := db.MigrateUp(url); err != nil {
		t.Fatalf("up (second pass): %v", err)
	}
	err = pool.QueryRow(ctx,
		`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'planets')`,
	).Scan(&exists)
	if err != nil {
		t.Fatalf("re-check table existence: %v", err)
	}
	if !exists {
		t.Error("planets table should exist after second up migration")
	}
}
