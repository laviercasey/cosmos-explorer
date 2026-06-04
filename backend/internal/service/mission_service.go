package service

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"cosmos/backend/internal/domain"
	"cosmos/backend/internal/store"
)

type MissionService struct {
	q *store.Queries
}

func NewMissionService(q *store.Queries) *MissionService {
	return &MissionService{q: q}
}

func decadeRange(decade string) (int32, int32, error) {
	s := strings.TrimSpace(strings.ToLower(decade))
	if !strings.HasSuffix(s, "s") || len(s) != 5 {
		return 0, 0, fmt.Errorf("invalid decade %q", decade)
	}
	n, err := strconv.Atoi(s[:4])
	if err != nil {
		return 0, 0, fmt.Errorf("invalid decade %q: %w", decade, err)
	}
	if n%10 != 0 {
		return 0, 0, fmt.Errorf("invalid decade %q: year not decade-aligned", decade)
	}
	return int32(n), int32(n + 9), nil
}

var ErrInvalidFilter = errors.New("service: invalid filter")

func (s *MissionService) buildListParams(f domain.MissionListFilters) (store.ListMissionsParams, error) {
	yearFrom := make([]int32, 0, len(f.Decades))
	yearTo := make([]int32, 0, len(f.Decades))
	for _, d := range f.Decades {
		lo, hi, err := decadeRange(d)
		if err != nil {
			return store.ListMissionsParams{}, fmt.Errorf("%w: %v", ErrInvalidFilter, err)
		}
		yearFrom = append(yearFrom, lo)
		yearTo = append(yearTo, hi)
	}
	sortField := "year"
	sortDesc := true
	if f.Sort != "" {
		sf, desc := parseSort(f.Sort)
		sortField = sf
		sortDesc = desc
	}
	return store.ListMissionsParams{
		Agencies:     nilIfEmpty(f.Agencies),
		Destinations: nilIfEmpty(f.Destinations),
		Types:        nilIfEmpty(f.Types),
		Statuses:     nilIfEmpty(f.Statuses),
		YearFrom:     yearFrom,
		YearTo:       yearTo,
		SortField:    sortField,
		SortDesc:     sortDesc,
		Limit:        int32(f.Limit),
		Offset:       int32(f.Offset),
	}, nil
}

func parseSort(sort string) (string, bool) {
	desc := false
	field := sort
	if strings.HasPrefix(field, "-") {
		desc = true
		field = field[1:]
	}
	return field, desc
}

func shouldTranslateMission(lang string) bool {
	l := strings.ToLower(lang)
	return l != "" && l != "ru"
}

func (s *MissionService) List(ctx context.Context, f domain.MissionListFilters, lang string) (domain.Page[domain.Mission], error) {
	params, err := s.buildListParams(f)
	if err != nil {
		return domain.Page[domain.Mission]{}, err
	}

	rows, err := s.q.ListMissions(ctx, params)
	if err != nil {
		return domain.Page[domain.Mission]{}, fmt.Errorf("service: list missions: %w", err)
	}
	total, err := s.q.CountMissions(ctx, params)
	if err != nil {
		return domain.Page[domain.Mission]{}, fmt.Errorf("service: count missions: %w", err)
	}

	ids := make([]int64, len(rows))
	for i, r := range rows {
		ids[i] = r.ID
	}
	planetPairs, err := s.q.ListMissionPlanetsBatch(ctx, ids)
	if err != nil {
		return domain.Page[domain.Mission]{}, fmt.Errorf("service: list mission planets: %w", err)
	}
	slugsByMission := make(map[int64][]string, len(rows))
	for _, p := range planetPairs {
		slugsByMission[p.MissionID] = append(slugsByMission[p.MissionID], p.Slug)
	}

	missionTx := map[int64]store.MissionTranslationRow{}
	if shouldTranslateMission(lang) {
		missionTx, err = s.q.ListMissionTranslations(ctx, ids, strings.ToLower(lang))
		if err != nil {
			return domain.Page[domain.Mission]{}, fmt.Errorf("service: list mission translations: %w", err)
		}
	}

	items := make([]domain.Mission, len(rows))
	for i, r := range rows {
		item := mapMissionRow(r, slugsByMission[r.ID], nil, nil)
		if shouldTranslateMission(lang) {
			if t, ok := missionTx[r.ID]; ok {
				applyMissionTranslation(&item, t)
			}
		}
		items[i] = item
	}
	return domain.Page[domain.Mission]{Items: items, Total: int(total)}, nil
}

func (s *MissionService) Get(ctx context.Context, slug, lang string) (domain.Mission, error) {
	row, err := s.q.GetMissionBySlug(ctx, slug)
	if err != nil {
		if isNoRows(err) {
			return domain.Mission{}, ErrNotFound
		}
		return domain.Mission{}, fmt.Errorf("service: get mission: %w", err)
	}
	planets, err := s.q.ListMissionPlanets(ctx, row.ID)
	if err != nil {
		return domain.Mission{}, fmt.Errorf("service: list mission planets: %w", err)
	}
	refs := make([]domain.PlanetRef, len(planets))
	slugs := make([]string, len(planets))
	for i, p := range planets {
		refs[i] = domain.PlanetRef{Slug: p.Slug, Name: p.Name}
		slugs[i] = p.Slug
	}
	mission := mapMissionRow(row, slugs, refs, nil)
	if shouldTranslateMission(lang) {
		tx, err := s.q.ListMissionTranslations(ctx, []int64{row.ID}, strings.ToLower(lang))
		if err != nil {
			return domain.Mission{}, fmt.Errorf("service: get mission translation: %w", err)
		}
		if t, ok := tx[row.ID]; ok {
			applyMissionTranslation(&mission, t)
		}
	}
	return mission, nil
}

func applyMissionTranslation(m *domain.Mission, t store.MissionTranslationRow) {
	if t.Description != nil {
		m.Description = *t.Description
	}
	if t.KeyFact != nil {
		m.KeyFact = *t.KeyFact
	}
	if len(t.Achievements) > 0 {
		m.Achievements = t.Achievements
	}
}

func mapMissionRow(r store.MissionRow, slugs []string, refs []domain.PlanetRef, traj *domain.Trajectory) domain.Mission {
	var end *int
	if r.EndYear != nil {
		v := int(*r.EndYear)
		end = &v
	}
	achievements := r.Achievements
	if achievements == nil {
		achievements = []string{}
	}
	planetSlugs := slugs
	if planetSlugs == nil {
		planetSlugs = []string{}
	}
	return domain.Mission{
		Slug:         r.Slug,
		Name:         r.Name,
		Agency:       r.Agency,
		Country:      r.Country,
		Year:         int(r.Year),
		EndYear:      end,
		Destination:  r.Destination,
		Type:         r.Type,
		Status:       r.Status,
		Description:  r.Description,
		KeyFact:      r.KeyFact,
		Crew:         r.Crew,
		Achievements: achievements,
		PlanetSlugs:  planetSlugs,
		Planets:      refs,
		Trajectory:   traj,
	}
}
