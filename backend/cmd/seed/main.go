package main

import (
	"context"
	"flag"
	"os"
	"time"

	"cosmos/backend/internal/config"
	"cosmos/backend/internal/db"
	"cosmos/backend/internal/logger"
	"cosmos/backend/internal/seed"
)

func main() {
	srcFlag := flag.String("src", "", "path to src/entities (overrides SEED_SOURCE_DIR)")
	flag.Parse()

	cfg, err := config.Load()
	if err != nil {
		_, _ = os.Stderr.WriteString("config: " + err.Error() + "\n")
		os.Exit(2)
	}

	log := logger.New(cfg.LogLevel)

	srcDir := cfg.SeedSourceDir
	if *srcFlag != "" {
		srcDir = *srcFlag
	}
	log.Info().Str("src_dir", srcDir).Msg("starting seed")

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	pool, err := db.NewPool(ctx, db.PoolConfig{
		DatabaseURL: cfg.DatabaseURL,
		MaxConns:    cfg.DBMaxConns,
		MinConns:    cfg.DBMinConns,
	})
	if err != nil {
		log.Fatal().Err(err).Msg("db pool failed")
	}
	defer pool.Close()

	s := seed.NewSeeder(pool, srcDir)
	if err := s.Run(ctx); err != nil {
		log.Fatal().Err(err).Msg("seed failed")
	}
	log.Info().Msg("seed complete")
}
