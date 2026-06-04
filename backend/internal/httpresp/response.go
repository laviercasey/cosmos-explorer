package httpresp

import (
	"encoding/json"
	nethttp "net/http"

	"github.com/rs/zerolog"

	"cosmos/backend/internal/domain"
)

const contentTypeJSON = "application/json; charset=utf-8"

func WriteJSON(w nethttp.ResponseWriter, r *nethttp.Request, status int, data any, meta *domain.PaginationMeta) {
	env := domain.Envelope{Data: data, Meta: meta, Error: nil}
	writeEnvelope(w, r, status, env)
}

func WriteError(w nethttp.ResponseWriter, r *nethttp.Request, status int, code, message string, details []domain.FieldError) {
	env := domain.Envelope{
		Data: nil,
		Meta: nil,
		Error: &domain.APIError{
			Code:    code,
			Message: message,
			Details: details,
		},
	}
	writeEnvelope(w, r, status, env)
}

func writeEnvelope(w nethttp.ResponseWriter, r *nethttp.Request, status int, env domain.Envelope) {
	w.Header().Set("Content-Type", contentTypeJSON)
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(env); err != nil {
		logger := zerolog.Ctx(r.Context())
		logger.Error().Err(err).Msg("response: encode envelope failed")
	}
}
