package middleware

import (
	nethttp "net/http"
	"strings"
	"sync"
	"time"

	"github.com/rs/zerolog"
	"golang.org/x/time/rate"
)

func WSRateLimit(log zerolog.Logger, perSecond float64, burst int) func(nethttp.Handler) nethttp.Handler {
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
				log.Warn().Str("ip", ip).Str("path", r.URL.Path).Msg("ws rate limited")
				nethttp.Error(w, "too many connection attempts", nethttp.StatusTooManyRequests)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

type ipEntry struct {
	lim      *rate.Limiter
	lastSeen syncInt64
}

type syncInt64 struct{ v int64 }

func (s *syncInt64) Store(v int64) { atomicStore(&s.v, v) }
func (s *syncInt64) Load() int64   { return atomicLoad(&s.v) }

func sweepStale(m *sync.Map, ttl time.Duration) {
	t := time.NewTicker(ttl / 2)
	defer t.Stop()
	for range t.C {
		cutoff := time.Now().Add(-ttl).UnixNano()
		m.Range(func(k, v any) bool {
			e := v.(*ipEntry)
			if e.lastSeen.Load() < cutoff {
				m.Delete(k)
			}
			return true
		})
	}
}

func clientIP(r *nethttp.Request) string {
	if rip := r.Header.Get("X-Real-IP"); rip != "" {
		return rip
	}
	addr := r.RemoteAddr
	if i := strings.LastIndex(addr, ":"); i != -1 {
		return addr[:i]
	}
	return addr
}
