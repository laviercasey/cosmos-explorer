package middleware

import (
	nethttp "net/http"

	"github.com/go-chi/cors"
)

func CORS(allowedOrigins []string, devMode bool) func(nethttp.Handler) nethttp.Handler {
	origins := allowedOrigins
	allowAll := false
	if devMode && len(origins) == 0 {
		origins = []string{"*"}
		allowAll = true
	}
	opts := cors.Options{
		AllowedOrigins: origins,
		AllowedMethods: []string{
			nethttp.MethodGet,
			nethttp.MethodHead,
			nethttp.MethodOptions,
			nethttp.MethodPost,
		},
		AllowedHeaders: []string{
			"Accept",
			"Content-Type",
			"X-Request-ID",
			"Connect-Protocol-Version",
			"Connect-Timeout-Ms",
		},
		ExposedHeaders:   []string{"X-Request-ID"},
		AllowCredentials: !allowAll,
		MaxAge:           300,
	}
	return cors.Handler(opts)
}
