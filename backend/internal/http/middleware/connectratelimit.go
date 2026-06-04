package middleware

import (
	nethttp "net/http"
	"sync"
	"time"

	"github.com/rs/zerolog"
	"golang.org/x/time/rate"
)

func ConnectRateLimit(log zerolog.Logger, perSecond float64, burst int) func(nethttp.Handler) nethttp.Handler {
	limiters := &sync.Map{}
	go sweepStale(limiters, 10*time.Minute)

	get := func(ip string) *rate.Limiter {
		now := time.Now()
		if v, ok := limiters.Load(ip); ok {
			e := v.(*ipEntry)
			e.lastSeen.Store(now.UnixNano())
			return e.lim
		}
		entry := &ipEntry{lim: rate.NewLimiter(rate.Limit(perSecond), burst)}
		entry.lastSeen.Store(now.UnixNano())
		actual, _ := limiters.LoadOrStore(ip, entry)
		return actual.(*ipEntry).lim
	}

	return func(next nethttp.Handler) nethttp.Handler {
		return nethttp.HandlerFunc(func(w nethttp.ResponseWriter, r *nethttp.Request) {
			ip := clientIP(r)
			if !get(ip).Allow() {
				log.Warn().Str("ip", ip).Str("path", r.URL.Path).Msg("connect rate limited")
				nethttp.Error(w, "too many requests", nethttp.StatusTooManyRequests)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
