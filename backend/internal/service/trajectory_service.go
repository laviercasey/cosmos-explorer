package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"cosmos/backend/internal/domain"
	"cosmos/backend/internal/store"
)

type TrajectoryService struct {
	q *store.Queries
}

func NewTrajectoryService(q *store.Queries) *TrajectoryService {
	return &TrajectoryService{q: q}
}

var ErrMissionNotFound = errorString("mission not found")

var ErrTrajectoryNotFound = errorString("trajectory not available")

type errorString string

func (e errorString) Error() string { return string(e) }

func (s *TrajectoryService) GetByMissionSlug(ctx context.Context, slug, lang string) (domain.Trajectory, error) {

	row, err := s.q.GetTrajectoryByMissionSlug(ctx, slug)
	if err == nil {
		traj, mapErr := mapTrajectoryRowWithLang(row, lang)
		if mapErr != nil {
			return domain.Trajectory{}, fmt.Errorf("service: localize trajectory: %w", mapErr)
		}
		return traj, nil
	}
	if !isNoRows(err) {
		return domain.Trajectory{}, fmt.Errorf("service: get trajectory: %w", err)
	}
	if _, err2 := s.q.GetMissionBySlug(ctx, slug); err2 != nil {
		if isNoRows(err2) {
			return domain.Trajectory{}, ErrMissionNotFound
		}
		return domain.Trajectory{}, fmt.Errorf("service: check mission: %w", err2)
	}
	return domain.Trajectory{}, ErrTrajectoryNotFound
}

func (s *TrajectoryService) List(ctx context.Context, lang string) ([]domain.Trajectory, error) {
	rows, err := s.q.ListTrajectories(ctx)
	if err != nil {
		return nil, fmt.Errorf("service: list trajectories: %w", err)
	}
	out := make([]domain.Trajectory, 0, len(rows))
	for _, r := range rows {
		traj, mapErr := mapTrajectoryRowWithLang(r, lang)
		if mapErr != nil {
			return nil, fmt.Errorf("service: localize trajectory %s: %w", r.MissionSlug, mapErr)
		}
		out = append(out, traj)
	}
	return out, nil
}

func mapTrajectoryRowWithLang(r store.TrajectoryRow, lang string) (domain.Trajectory, error) {
	traj := mapTrajectoryRow(r)
	phases, err := localizePhases(r.Phases, lang)
	if err != nil {
		return domain.Trajectory{}, err
	}
	traj.Phases = phases
	return traj, nil
}

func localizePhases(raw []byte, lang string) ([]domain.TrajectoryPhase, error) {
	if len(raw) == 0 {
		return nil, nil
	}
	var phases []map[string]any
	if err := json.Unmarshal(raw, &phases); err != nil {
		return nil, fmt.Errorf("unmarshal phases: %w", err)
	}
	useRu := strings.EqualFold(lang, "ru")
	out := make([]domain.TrajectoryPhase, 0, len(phases))
	for _, ph := range phases {
		id, _ := ph["id"].(string)
		label, _ := ph["label"].(string)
		description, _ := ph["description"].(string)
		if useRu {
			if v, ok := ph["label_ru"].(string); ok && v != "" {
				label = v
			}
			if v, ok := ph["description_ru"].(string); ok && v != "" {
				description = v
			}
		}
		tStart, _ := toFloat64(ph["t_start"])
		tEnd, _ := toFloat64(ph["t_end"])
		out = append(out, domain.TrajectoryPhase{
			ID:          id,
			TStart:      tStart,
			TEnd:        tEnd,
			Label:       label,
			Description: description,
		})
	}
	return out, nil
}

func toFloat64(v any) (float64, bool) {
	switch n := v.(type) {
	case float64:
		return n, true
	case float32:
		return float64(n), true
	case int:
		return float64(n), true
	case int32:
		return float64(n), true
	case int64:
		return float64(n), true
	default:
		return 0, false
	}
}

func mapTrajectoryRow(r store.TrajectoryRow) domain.Trajectory {
	return domain.Trajectory{
		MissionSlug:  r.MissionSlug,
		MissionName:  r.MissionName,
		Agency:       r.Agency,
		Year:         int(r.Year),
		Duration:     r.Duration,
		DurationRu:   r.DurationRu,
		Crew:         r.Crew,
		MoonPos:      r.MoonPos,
		MoonOrbitArc: r.MoonOrbitArc,
		SimDurationS: int(r.SimDurationS),
		Waypoints:    r.Waypoints,
		Phases:       nil,
	}
}
