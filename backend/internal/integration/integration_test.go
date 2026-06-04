//go:build integration

package integration

import (
	"context"
	"testing"
	"time"

	"cosmos/backend/internal/store"
	"cosmos/backend/internal/testutil"
)

func TestIntegration_Smoke(t *testing.T) {
	pool, cleanup := testutil.NewTestDB(t)
	defer cleanup()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := pool.Ping(ctx); err != nil {
		t.Fatalf("ping: %v", err)
	}

	q := store.New(pool)
	total, err := q.CountPlanets(ctx, nil)
	if err != nil {
		t.Fatalf("count planets: %v", err)
	}
	if total != 0 {

		t.Errorf("expected 0 planets on fresh DB, got %d", total)
	}
}
