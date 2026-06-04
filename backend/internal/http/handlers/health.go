package handlers

import (
	nethttp "net/http"

	"github.com/jackc/pgx/v5/pgxpool"

	"cosmos/backend/internal/db"
	"cosmos/backend/internal/httpresp"
)

type HealthHandler struct {
	pool *pgxpool.Pool
}

func NewHealthHandler(pool *pgxpool.Pool) *HealthHandler {
	return &HealthHandler{pool: pool}
}

func (h *HealthHandler) Live(w nethttp.ResponseWriter, r *nethttp.Request) {
	w.Header().Set("Cache-Control", "no-store")
	httpresp.WriteJSON(w, r, nethttp.StatusOK, map[string]string{"status": "ok"}, nil)
}

func (h *HealthHandler) Ready(w nethttp.ResponseWriter, r *nethttp.Request) {
	w.Header().Set("Cache-Control", "no-store")
	if err := db.Ping(r.Context(), h.pool); err != nil {
		httpresp.WriteError(w, r, nethttp.StatusServiceUnavailable, httpresp.CodeServiceUnavailable, "db check failed", nil)
		return
	}
	httpresp.WriteJSON(w, r, nethttp.StatusOK, map[string]any{
		"status": "ready",
		"checks": map[string]string{"db": "ok"},
	}, nil)
}
