package main

import (
	"context"
	"errors"
	"flag"
	"net"
	nethttp "net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/rs/zerolog"

	"cosmos/backend/internal/config"
	"cosmos/backend/internal/db"
	httpapi "cosmos/backend/internal/http"
	"cosmos/backend/internal/logger"
	"cosmos/backend/internal/realtime"
	"cosmos/backend/internal/satellites"
	"cosmos/backend/internal/service"
	"cosmos/backend/internal/store"
)

const tickInterval = time.Second

func main() {
	migrateOnly := flag.Bool("migrate-up-only", false, "Apply pending migrations and exit")
	flag.Parse()

	cfg, err := config.Load()
	if err != nil {

		_, _ = os.Stderr.WriteString("config: " + err.Error() + "\n")
		os.Exit(2)
	}

	log := logger.New(cfg.LogLevel)
	log.Info().Str("env", cfg.AppEnv).Str("addr", cfg.HTTPAddr).Msg("starting server")

	if !cfg.IsDevelopment() && len(cfg.CORSAllowedOrigins) == 0 {
		log.Warn().Msg("CORS_ALLOWED_ORIGINS empty in non-dev mode; cross-origin requests will be rejected")
	}

	if *migrateOnly {
		if err := db.MigrateUp(cfg.DatabaseURL); err != nil {
			log.Fatal().Err(err).Msg("migrate-up-only failed")
		}
		log.Info().Msg("migrations applied")
		return
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if cfg.MigrateOnBoot {
		if err := db.MigrateUp(cfg.DatabaseURL); err != nil {
			log.Fatal().Err(err).Msg("migrate on boot failed")
		}
		log.Info().Msg("migrations applied on boot")
	}

	pool, err := db.NewPool(ctx, db.PoolConfig{
		DatabaseURL: cfg.DatabaseURL,
		MaxConns:    cfg.DBMaxConns,
		MinConns:    cfg.DBMinConns,
	})
	if err != nil {
		log.Fatal().Err(err).Msg("db pool failed")
	}
	defer pool.Close()

	svcs := service.New(store.New(pool))

	refresher := satellites.NewTLERefresher(log, nil)
	if err := refresher.Boot(ctx); err != nil {
		log.Warn().Err(err).Msg("realtime: boot failed; continuing without satellites")
	}

	hub := realtime.NewHub(log)
	publishCatalog(hub, refresher, log)

	go hub.Run(ctx)
	go refresher.Run(ctx)
	go runProducer(ctx, hub, refresher, log)

	router := httpapi.NewRouter(cfg, log, pool, svcs, hub)

	srv := &nethttp.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           router,
		ReadTimeout:       cfg.ReadTimeout,
		WriteTimeout:      cfg.WriteTimeout,
		ReadHeaderTimeout: 5 * time.Second,
		IdleTimeout:       60 * time.Second,
		BaseContext:       func(_ net.Listener) context.Context { return ctx },
	}

	serveErr := make(chan error, 1)
	go func() {
		log.Info().Str("addr", cfg.HTTPAddr).Msg("listening")
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, nethttp.ErrServerClosed) {
			serveErr <- err
			return
		}
		serveErr <- nil
	}()

	select {
	case <-ctx.Done():
		log.Info().Msg("shutdown signal received")
	case err := <-serveErr:
		if err != nil {
			log.Fatal().Err(err).Msg("server failed")
		}
		return
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Error().Err(err).Msg("shutdown error")
	}
	log.Info().Msg("server stopped")
}

func publishCatalog(hub *realtime.Hub, refresher *satellites.TLERefresher, log zerolog.Logger) {
	cat := refresher.Catalog()
	entries := buildCatalogEntries(cat)
	frame := realtime.NewCatalogFrame(entries)
	data, err := realtime.MarshalFrame(frame)
	if err != nil {
		log.Error().Err(err).Msg("marshal catalog frame")
		return
	}
	hub.SetCatalog(data)
}

func buildCatalogEntries(cat *satellites.Catalog) []realtime.SatCatalogEntry {
	if cat == nil {
		return []realtime.SatCatalogEntry{}
	}
	out := make([]realtime.SatCatalogEntry, 0, len(cat.Entries))
	for _, e := range cat.Entries {
		out = append(out, realtime.SatCatalogEntry{
			ID:        e.Sat.NoradID,
			Name:      e.Sat.Name,
			ColorHint: e.Sat.ColorHint,
			Highlight: e.Sat.Highlight,
		})
	}
	return out
}

func runProducer(ctx context.Context, hub *realtime.Hub, refresher *satellites.TLERefresher, log zerolog.Logger) {
	ticker := time.NewTicker(tickInterval)
	defer ticker.Stop()
	var seq uint64
	var lastCatalogPtr *satellites.Catalog

	for {
		select {
		case <-ctx.Done():
			return
		case now := <-ticker.C:
			seq++
			cat := refresher.Catalog()
			if cat != lastCatalogPtr {
				lastCatalogPtr = cat
				publishCatalog(hub, refresher, log)
			}
			positions := satellites.Propagate(cat, now)
			satFrames := make([]realtime.SatPosition, 0, len(positions))
			for _, p := range positions {
				satFrames = append(satFrames, realtime.SatPosition{
					ID:     p.NoradID,
					Name:   p.Name,
					ECEFKm: p.ECEFKm,
					VelKms: p.VelKms,
					AltKm:  p.AltKm,
				})
			}
			frame := realtime.NewTickFrame(seq, now, satFrames)
			data, err := realtime.MarshalFrame(frame)
			if err != nil {
				log.Error().Err(err).Msg("marshal tick frame")
				continue
			}
			hub.Broadcast(data)
		}
	}
}
