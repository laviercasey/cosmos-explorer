package grpcsvc

import (
	"errors"
	"fmt"
	"regexp"
	"strings"

	"connectrpc.com/connect"

	cosmosv1 "cosmos/backend/gen/proto/cosmos/v1"
	"cosmos/backend/internal/domain"
	"cosmos/backend/internal/service"
)

const (
	minLimit          = 1
	maxLimit          = 200
	defaultLimit      = 20
	minOffset         = 0
	maxMissionDecades = 16
)

var (
	planetSortAllowed  = []string{"index", "name", "semi_major_axis_au", "radius_km"}
	missionSortAllowed = []string{"year", "name", "agency"}
	decadePattern      = regexp.MustCompile(`^[0-9]{4}s$`)
)

func errInvalidArg(fields []domain.FieldError) error {
	if len(fields) == 0 {
		return nil
	}
	parts := make([]string, len(fields))
	for i, f := range fields {
		parts[i] = fmt.Sprintf("%s: %s", f.Field, f.Message)
	}
	return connect.NewError(connect.CodeInvalidArgument, errors.New(strings.Join(parts, "; ")))
}

func ParseListPlanetsFilters(req *cosmosv1.ListPlanetsRequest) (domain.PlanetListFilters, string, error) {
	var fields []domain.FieldError

	limit, offset, fields := parseLimitOffset(req.GetLimit(), req.GetOffset(), fields)
	sort, fields := parseSort(req.GetSort(), planetSortAllowed, fields)

	lang := strings.ToLower(strings.TrimSpace(req.GetLang()))
	if !service.IsSupportedLang(lang) {
		fields = append(fields, domain.FieldError{
			Field:   "lang",
			Message: "unsupported language (expected 'en' or 'ru')",
		})
	}

	if err := errInvalidArg(fields); err != nil {
		return domain.PlanetListFilters{}, "", err
	}
	return domain.PlanetListFilters{
		Types:  cleanStrings(req.GetTypes()),
		Sort:   sort,
		Limit:  limit,
		Offset: offset,
	}, lang, nil
}

func ParseListMissionsFilters(req *cosmosv1.ListMissionsRequest) (domain.MissionListFilters, string, error) {
	var fields []domain.FieldError

	limit, offset, fields := parseLimitOffset(req.GetLimit(), req.GetOffset(), fields)
	sort, fields := parseSort(req.GetSort(), missionSortAllowed, fields)

	decades := cleanStrings(req.GetDecades())
	if len(decades) > maxMissionDecades {
		fields = append(fields, domain.FieldError{
			Field:   "decades",
			Message: fmt.Sprintf("too many decades (max %d)", maxMissionDecades),
		})
	}
	for _, d := range decades {
		if !decadePattern.MatchString(strings.ToLower(d)) {
			fields = append(fields, domain.FieldError{
				Field:   "decades",
				Message: fmt.Sprintf("invalid decade %q (expected 4 digits + 's', e.g. '1960s')", d),
			})
			break
		}
	}

	lang := strings.ToLower(strings.TrimSpace(req.GetLang()))
	if !service.IsSupportedLang(lang) {
		fields = append(fields, domain.FieldError{
			Field:   "lang",
			Message: "unsupported language (expected 'en' or 'ru')",
		})
	}

	if err := errInvalidArg(fields); err != nil {
		return domain.MissionListFilters{}, "", err
	}
	return domain.MissionListFilters{
		Agencies:     cleanStrings(req.GetAgencies()),
		Decades:      decades,
		Destinations: cleanStrings(req.GetDestinations()),
		Types:        cleanStrings(req.GetTypes()),
		Statuses:     cleanStrings(req.GetStatuses()),
		Sort:         sort,
		Limit:        limit,
		Offset:       offset,
	}, lang, nil
}

func parseLimitOffset(rawLimit, rawOffset int32, fields []domain.FieldError) (int, int, []domain.FieldError) {
	limit := int(rawLimit)
	offset := int(rawOffset)
	if limit == 0 {
		limit = defaultLimit
	} else if limit < minLimit || limit > maxLimit {
		fields = append(fields, domain.FieldError{
			Field:   "limit",
			Message: fmt.Sprintf("must be between %d and %d", minLimit, maxLimit),
		})
		limit = defaultLimit
	}
	if offset < minOffset {
		fields = append(fields, domain.FieldError{
			Field:   "offset",
			Message: "must be >= 0",
		})
		offset = minOffset
	}
	return limit, offset, fields
}

func parseSort(raw string, allowed []string, fields []domain.FieldError) (string, []domain.FieldError) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", fields
	}
	field := strings.TrimPrefix(raw, "-")
	for _, a := range allowed {
		if field == a {
			return raw, fields
		}
	}
	fields = append(fields, domain.FieldError{
		Field:   "sort",
		Message: fmt.Sprintf("must be one of: %s", strings.Join(allowed, ", ")),
	})
	return "", fields
}

func cleanStrings(in []string) []string {
	out := make([]string, 0, len(in))
	for _, s := range in {
		s = strings.TrimSpace(s)
		if s != "" {
			out = append(out, s)
		}
	}
	return out
}
