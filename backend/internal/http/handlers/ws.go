package handlers

import (
	nethttp "net/http"
	"strings"

	"github.com/coder/websocket"
	"github.com/rs/zerolog"

	"cosmos/backend/internal/realtime"
)

const wsReadLimit = 4096

type WSHandler struct {
	hub            *realtime.Hub
	originPatterns []string
	devMode        bool
}

func NewWSHandler(hub *realtime.Hub, allowedOrigins []string, devMode bool) *WSHandler {
	return &WSHandler{
		hub:            hub,
		originPatterns: buildOriginPatterns(allowedOrigins, devMode),
		devMode:        devMode,
	}
}

func (h *WSHandler) ServeIss(w nethttp.ResponseWriter, r *nethttp.Request) {
	logger := zerolog.Ctx(r.Context()).With().Str("component", "ws.iss").Logger()

	acceptOpts := &websocket.AcceptOptions{
		OriginPatterns: h.originPatterns,
	}
	if h.devMode && len(h.originPatterns) == 1 && h.originPatterns[0] == "*" {
		acceptOpts.InsecureSkipVerify = true
	}

	conn, err := websocket.Accept(w, r, acceptOpts)
	if err != nil {
		logger.Warn().Err(err).Msg("ws accept failed")
		return
	}
	conn.SetReadLimit(wsReadLimit)
	defer func() { _ = conn.CloseNow() }()

	ctx := conn.CloseRead(r.Context())

	c := realtime.NewClient(conn)
	if err := h.hub.Register(ctx, c); err != nil {
		logger.Warn().Err(err).Msg("hub register failed")
		_ = conn.Close(websocket.StatusInternalError, "hub unavailable")
		return
	}

	if catalog := h.hub.CatalogFrame(); catalog != nil {
		if err := conn.Write(ctx, websocket.MessageText, catalog); err != nil {
			logger.Debug().Err(err).Msg("initial catalog write failed")
			h.hub.Unregister(c)
			return
		}
	}

	h.hub.RunClientWriter(ctx, c)

	h.hub.Unregister(c)

	logger.Debug().Msg("ws connection closed")
}

func buildOriginPatterns(allowed []string, devMode bool) []string {
	if devMode && len(allowed) == 0 {
		return []string{"*"}
	}
	out := make([]string, 0, len(allowed))
	for _, raw := range allowed {
		raw = strings.TrimSpace(raw)
		if raw == "" {
			continue
		}
		host := raw
		if i := strings.Index(host, "://"); i != -1 {
			host = host[i+3:]
		}
		if i := strings.Index(host, "/"); i != -1 {
			host = host[:i]
		}
		if host != "" {
			out = append(out, host)
		}
	}
	if len(out) == 0 {
		return []string{}
	}
	return out
}
