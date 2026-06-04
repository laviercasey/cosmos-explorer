package http

import (
	nethttp "net/http"

	"connectrpc.com/connect"
	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog"

	"cosmos/backend/gen/proto/cosmos/v1/cosmosv1connect"
	"cosmos/backend/internal/config"
	"cosmos/backend/internal/grpcsvc"
	"cosmos/backend/internal/http/handlers"
	appmw "cosmos/backend/internal/http/middleware"
	"cosmos/backend/internal/httpresp"
	"cosmos/backend/internal/realtime"
	"cosmos/backend/internal/service"
)

func NewRouter(cfg config.Config, log zerolog.Logger, pool *pgxpool.Pool, svcs *service.Services, hub *realtime.Hub) nethttp.Handler {
	r := chi.NewRouter()

	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(appmw.Logging(log))
	r.Use(appmw.Recoverer())
	r.Use(appmw.CORS(cfg.CORSAllowedOrigins, cfg.IsDevelopment()))
	r.Use(chimw.Compress(5))

	r.NotFound(handleNotFound)
	r.MethodNotAllowed(handleMethodNotAllowed)

	health := handlers.NewHealthHandler(pool)
	r.Get("/healthz", health.Live)
	r.Get("/readyz", health.Ready)

	if hub != nil {
		wsH := handlers.NewWSHandler(hub, cfg.CORSAllowedOrigins, cfg.IsDevelopment())
		wsLimit := appmw.WSRateLimit(log, cfg.WSRateRPS, cfg.WSRateBurst)
		r.With(wsLimit).Get("/ws/iss", wsH.ServeIss)
	}

	connectSvc := grpcsvc.NewCosmosServer(svcs, log)
	connectPath, connectHandler := cosmosv1connect.NewCosmosServiceHandler(
		connectSvc,
		connect.WithInterceptors(
			grpcsvc.LoggingInterceptor(log),
			grpcsvc.RecoveryInterceptor(log),
			grpcsvc.DeadlineInterceptor(cfg.RequestTimeout),
			grpcsvc.CacheableResponseInterceptor(),
		),
	)
	connectLimit := appmw.ConnectRateLimit(log, cfg.ConnectRateRPS, cfg.ConnectRateBurst)
	r.With(connectLimit).Mount(connectPath, connectHandler)

	return r
}

func handleNotFound(w nethttp.ResponseWriter, r *nethttp.Request) {
	httpresp.WriteError(w, r, nethttp.StatusNotFound, httpresp.CodeNotFound, "route not found", nil)
}

func handleMethodNotAllowed(w nethttp.ResponseWriter, r *nethttp.Request) {
	httpresp.WriteError(w, r, nethttp.StatusMethodNotAllowed, httpresp.CodeMethodNotAllowed, "method not allowed", nil)
}
