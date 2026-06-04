package grpcsvc

import (
	"context"
	"fmt"
	"time"

	"connectrpc.com/connect"
	"github.com/rs/zerolog"
)

func LoggingInterceptor(log zerolog.Logger) connect.UnaryInterceptorFunc {
	return func(next connect.UnaryFunc) connect.UnaryFunc {
		return func(ctx context.Context, req connect.AnyRequest) (connect.AnyResponse, error) {
			start := time.Now()
			resp, err := next(ctx, req)
			evt := log.Info()
			if err != nil {
				evt = log.Error().Err(err)
			}
			evt.Str("rpc", req.Spec().Procedure).
				Dur("duration", time.Since(start)).
				Msg("connect rpc")
			return resp, err
		}
	}
}

func RecoveryInterceptor(log zerolog.Logger) connect.UnaryInterceptorFunc {
	return func(next connect.UnaryFunc) connect.UnaryFunc {
		return func(ctx context.Context, req connect.AnyRequest) (resp connect.AnyResponse, err error) {
			defer func() {
				if rec := recover(); rec != nil {
					log.Error().
						Str("rpc", req.Spec().Procedure).
						Str("panic_type", fmt.Sprintf("%T", rec)).
						Str("panic_summary", fmt.Sprintf("%.200s", fmt.Sprint(rec))).
						Msg("connect rpc panic")
					err = connect.NewError(connect.CodeInternal, fmt.Errorf("internal server error"))
				}
			}()
			return next(ctx, req)
		}
	}
}

func DeadlineInterceptor(timeout time.Duration) connect.UnaryInterceptorFunc {
	return func(next connect.UnaryFunc) connect.UnaryFunc {
		return func(ctx context.Context, req connect.AnyRequest) (connect.AnyResponse, error) {
			if timeout <= 0 {
				return next(ctx, req)
			}
			if dl, ok := ctx.Deadline(); ok && time.Until(dl) < timeout {
				return next(ctx, req)
			}
			deadlined, cancel := context.WithTimeout(ctx, timeout)
			defer cancel()
			return next(deadlined, req)
		}
	}
}

var cacheablePublicRPCs = map[string]struct{}{
	"/cosmos.v1.CosmosService/ListPlanets":          {},
	"/cosmos.v1.CosmosService/GetPlanet":            {},
	"/cosmos.v1.CosmosService/ListMissions":         {},
	"/cosmos.v1.CosmosService/GetMission":           {},
	"/cosmos.v1.CosmosService/ListTrajectories":     {},
	"/cosmos.v1.CosmosService/GetMissionTrajectory": {},
}

func CacheableResponseInterceptor() connect.UnaryInterceptorFunc {
	return func(next connect.UnaryFunc) connect.UnaryFunc {
		return func(ctx context.Context, req connect.AnyRequest) (connect.AnyResponse, error) {
			resp, err := next(ctx, req)
			if err != nil || resp == nil {
				return resp, err
			}
			if _, ok := cacheablePublicRPCs[req.Spec().Procedure]; ok {
				resp.Header().Set("Cache-Control", "public, max-age=60, s-maxage=120")
			}
			return resp, err
		}
	}
}
