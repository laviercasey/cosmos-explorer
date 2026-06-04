package store

import (
	"context"
	"fmt"
)

const listTrajectoriesSQL = `
SELECT
    t.id, t.mission_id, t.duration, t.duration_ru,
    t.moon_pos, t.moon_orbit_arc, t.waypoints, t.phases, t.sim_duration_s,
    m.slug, m.name, m.agency, m.year, m.crew
FROM trajectories t
JOIN missions m ON m.id = t.mission_id
ORDER BY m.year, m.slug`

func (q *Queries) ListTrajectories(ctx context.Context) ([]TrajectoryRow, error) {
	rows, err := q.db.Query(ctx, listTrajectoriesSQL)
	if err != nil {
		return nil, fmt.Errorf("store: list trajectories: %w", err)
	}
	defer rows.Close()
	out := make([]TrajectoryRow, 0, 16)
	for rows.Next() {
		var r TrajectoryRow
		if err := rows.Scan(
			&r.ID, &r.MissionID, &r.Duration, &r.DurationRu,
			&r.MoonPos, &r.MoonOrbitArc, &r.Waypoints, &r.Phases, &r.SimDurationS,
			&r.MissionSlug, &r.MissionName, &r.Agency, &r.Year, &r.Crew,
		); err != nil {
			return nil, fmt.Errorf("store: list trajectories scan: %w", err)
		}
		out = append(out, r)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("store: list trajectories iterate: %w", err)
	}
	return out, nil
}

const getTrajectoryByMissionSlugSQL = `
SELECT
    t.id, t.mission_id, t.duration, t.duration_ru,
    t.moon_pos, t.moon_orbit_arc, t.waypoints, t.phases, t.sim_duration_s,
    m.slug, m.name, m.agency, m.year, m.crew
FROM trajectories t
JOIN missions m ON m.id = t.mission_id
WHERE m.slug = $1`

func (q *Queries) GetTrajectoryByMissionSlug(ctx context.Context, slug string) (TrajectoryRow, error) {
	var r TrajectoryRow
	err := q.db.QueryRow(ctx, getTrajectoryByMissionSlugSQL, slug).Scan(
		&r.ID, &r.MissionID, &r.Duration, &r.DurationRu,
		&r.MoonPos, &r.MoonOrbitArc, &r.Waypoints, &r.Phases, &r.SimDurationS,
		&r.MissionSlug, &r.MissionName, &r.Agency, &r.Year, &r.Crew,
	)
	if err != nil {
		return TrajectoryRow{}, fmt.Errorf("store: get trajectory by slug: %w", err)
	}
	return r, nil
}

type UpsertTrajectoryParams struct {
	MissionID    int64
	Duration     string
	DurationRu   *string
	MoonPos      []byte
	MoonOrbitArc float64
	Waypoints    []byte
	Phases       []byte
	SimDurationS int32
}

const upsertTrajectorySQL = `
INSERT INTO trajectories (
    mission_id, duration, duration_ru,
    moon_pos, moon_orbit_arc, waypoints, phases, sim_duration_s
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
ON CONFLICT (mission_id) DO UPDATE SET
    duration       = EXCLUDED.duration,
    duration_ru    = EXCLUDED.duration_ru,
    moon_pos       = EXCLUDED.moon_pos,
    moon_orbit_arc = EXCLUDED.moon_orbit_arc,
    waypoints      = EXCLUDED.waypoints,
    phases         = EXCLUDED.phases,
    sim_duration_s = EXCLUDED.sim_duration_s,
    updated_at     = NOW()`

func (q *Queries) UpsertTrajectory(ctx context.Context, p UpsertTrajectoryParams) error {
	_, err := q.db.Exec(ctx, upsertTrajectorySQL,
		p.MissionID, p.Duration, p.DurationRu,
		p.MoonPos, p.MoonOrbitArc, p.Waypoints, p.Phases, p.SimDurationS,
	)
	if err != nil {
		return fmt.Errorf("store: upsert trajectory: %w", err)
	}
	return nil
}
