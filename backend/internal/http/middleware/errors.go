package middleware

import (
	nethttp "net/http"

	"github.com/rs/zerolog"
)

func Recoverer() func(nethttp.Handler) nethttp.Handler {
	return func(next nethttp.Handler) nethttp.Handler {
		return nethttp.HandlerFunc(func(w nethttp.ResponseWriter, r *nethttp.Request) {
			defer func() {
				if rec := recover(); rec != nil {
					logger := zerolog.Ctx(r.Context())
					logger.Error().Interface("panic", rec).Msg("handler panic")
					w.Header().Set("Content-Type", "application/json; charset=utf-8")
					w.WriteHeader(nethttp.StatusInternalServerError)
					_, _ = w.Write([]byte(`{"data":null,"meta":null,"error":{"code":"internal_error","message":"internal server error"}}`))
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}
