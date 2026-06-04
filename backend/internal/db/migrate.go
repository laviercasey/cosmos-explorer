package db

import (
	"errors"
	"fmt"
	"strings"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/pgx/v5"
	"github.com/golang-migrate/migrate/v4/source/iofs"

	"cosmos/backend/migrations"
)

func toMigrateURL(databaseURL string) string {
	if strings.HasPrefix(databaseURL, "postgres://") {
		return "pgx5://" + strings.TrimPrefix(databaseURL, "postgres://")
	}
	if strings.HasPrefix(databaseURL, "postgresql://") {
		return "pgx5://" + strings.TrimPrefix(databaseURL, "postgresql://")
	}
	return databaseURL
}

func MigrateUp(databaseURL string) error {
	return runMigrate(databaseURL, func(m *migrate.Migrate) error { return m.Up() })
}

func MigrateDown(databaseURL string) error {
	return runMigrate(databaseURL, func(m *migrate.Migrate) error { return m.Steps(-1) })
}

func runMigrate(databaseURL string, action func(*migrate.Migrate) error) error {
	src, err := iofs.New(migrations.FS, ".")
	if err != nil {
		return fmt.Errorf("db: embed migrations: %w", err)
	}
	m, err := migrate.NewWithSourceInstance("iofs", src, toMigrateURL(databaseURL))
	if err != nil {
		return fmt.Errorf("db: migrate new: %w", err)
	}
	defer func() {
		_, _ = m.Close()
	}()
	if err := action(m); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return fmt.Errorf("db: migrate run: %w", err)
	}
	return nil
}
