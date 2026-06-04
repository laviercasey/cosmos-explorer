package store

import (
	"context"
	"fmt"
)

type ListMissionsParams struct {
	Agencies     []string
	Destinations []string
	Types        []string
	Statuses     []string
	YearFrom     []int32
	YearTo       []int32
	SortField    string
	SortDesc     bool
	Limit        int32
	Offset       int32
}

const listMissionsSQL = `
SELECT
    id, slug, name, agency, country, year, end_year, destination,
    type, status, description, key_fact, crew, achievements,
    created_at, updated_at
FROM missions
WHERE
    (cardinality($1::text[])   = 0 OR agency      = ANY($1::text[]))
    AND (cardinality($2::text[]) = 0 OR destination = ANY($2::text[]))
    AND (cardinality($3::text[]) = 0 OR type        = ANY($3::text[]))
    AND (cardinality($4::text[]) = 0 OR status      = ANY($4::text[]))
    AND (
        cardinality($5::int[]) = 0
        OR EXISTS (
            SELECT 1 FROM unnest($5::int[], $6::int[]) AS r(lo, hi)
            WHERE missions.year BETWEEN r.lo AND r.hi
        )
    )
ORDER BY
    CASE WHEN $7::text = 'year'   AND NOT $8::bool THEN year   END ASC  NULLS LAST,
    CASE WHEN $7::text = 'year'   AND     $8::bool THEN year   END DESC NULLS LAST,
    CASE WHEN $7::text = 'name'   AND NOT $8::bool THEN name   END ASC  NULLS LAST,
    CASE WHEN $7::text = 'name'   AND     $8::bool THEN name   END DESC NULLS LAST,
    CASE WHEN $7::text = 'agency' AND NOT $8::bool THEN agency END ASC  NULLS LAST,
    CASE WHEN $7::text = 'agency' AND     $8::bool THEN agency END DESC NULLS LAST,
    id ASC
LIMIT $9 OFFSET $10`

func (q *Queries) ListMissions(ctx context.Context, p ListMissionsParams) ([]MissionRow, error) {
	rows, err := q.db.Query(ctx, listMissionsSQL,
		p.Agencies, p.Destinations, p.Types, p.Statuses,
		p.YearFrom, p.YearTo,
		p.SortField, p.SortDesc,
		p.Limit, p.Offset,
	)
	if err != nil {
		return nil, fmt.Errorf("store: list missions: %w", err)
	}
	defer rows.Close()

	out := make([]MissionRow, 0)
	for rows.Next() {
		var r MissionRow
		if err := rows.Scan(
			&r.ID, &r.Slug, &r.Name, &r.Agency, &r.Country, &r.Year, &r.EndYear,
			&r.Destination, &r.Type, &r.Status, &r.Description, &r.KeyFact,
			&r.Crew, &r.Achievements, &r.CreatedAt, &r.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("store: list missions scan: %w", err)
		}
		out = append(out, r)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("store: list missions rows: %w", err)
	}
	return out, nil
}

const countMissionsSQL = `
SELECT COUNT(*)::bigint
FROM missions
WHERE
    (cardinality($1::text[])   = 0 OR agency      = ANY($1::text[]))
    AND (cardinality($2::text[]) = 0 OR destination = ANY($2::text[]))
    AND (cardinality($3::text[]) = 0 OR type        = ANY($3::text[]))
    AND (cardinality($4::text[]) = 0 OR status      = ANY($4::text[]))
    AND (
        cardinality($5::int[]) = 0
        OR EXISTS (
            SELECT 1 FROM unnest($5::int[], $6::int[]) AS r(lo, hi)
            WHERE missions.year BETWEEN r.lo AND r.hi
        )
    )`

func (q *Queries) CountMissions(ctx context.Context, p ListMissionsParams) (int64, error) {
	var total int64
	err := q.db.QueryRow(ctx, countMissionsSQL,
		p.Agencies, p.Destinations, p.Types, p.Statuses,
		p.YearFrom, p.YearTo,
	).Scan(&total)
	if err != nil {
		return 0, fmt.Errorf("store: count missions: %w", err)
	}
	return total, nil
}

const getMissionBySlugSQL = `
SELECT
    id, slug, name, agency, country, year, end_year, destination,
    type, status, description, key_fact, crew, achievements,
    created_at, updated_at
FROM missions
WHERE slug = $1`

func (q *Queries) GetMissionBySlug(ctx context.Context, slug string) (MissionRow, error) {
	var r MissionRow
	err := q.db.QueryRow(ctx, getMissionBySlugSQL, slug).Scan(
		&r.ID, &r.Slug, &r.Name, &r.Agency, &r.Country, &r.Year, &r.EndYear,
		&r.Destination, &r.Type, &r.Status, &r.Description, &r.KeyFact,
		&r.Crew, &r.Achievements, &r.CreatedAt, &r.UpdatedAt,
	)
	if err != nil {
		return MissionRow{}, fmt.Errorf("store: get mission by slug: %w", err)
	}
	return r, nil
}

const listMissionPlanetsSQL = `
SELECT p.slug, p.name
FROM planet_missions pm
JOIN planets p ON p.id = pm.planet_id
WHERE pm.mission_id = $1
ORDER BY pm.position`

func (q *Queries) ListMissionPlanets(ctx context.Context, missionID int64) ([]MissionPlanetRow, error) {
	rows, err := q.db.Query(ctx, listMissionPlanetsSQL, missionID)
	if err != nil {
		return nil, fmt.Errorf("store: list mission planets: %w", err)
	}
	defer rows.Close()

	out := make([]MissionPlanetRow, 0)
	for rows.Next() {
		var r MissionPlanetRow
		if err := rows.Scan(&r.Slug, &r.Name); err != nil {
			return nil, fmt.Errorf("store: list mission planets scan: %w", err)
		}
		out = append(out, r)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("store: list mission planets rows: %w", err)
	}
	return out, nil
}

const listMissionPlanetsBatchSQL = `
SELECT pm.mission_id, p.slug
FROM planet_missions pm
JOIN planets p ON p.id = pm.planet_id
WHERE pm.mission_id = ANY($1::bigint[])
ORDER BY pm.mission_id, pm.position`

func (q *Queries) ListMissionPlanetsBatch(ctx context.Context, missionIDs []int64) ([]MissionPlanetBatchRow, error) {
	rows, err := q.db.Query(ctx, listMissionPlanetsBatchSQL, missionIDs)
	if err != nil {
		return nil, fmt.Errorf("store: list mission planets batch: %w", err)
	}
	defer rows.Close()

	out := make([]MissionPlanetBatchRow, 0)
	for rows.Next() {
		var r MissionPlanetBatchRow
		if err := rows.Scan(&r.MissionID, &r.Slug); err != nil {
			return nil, fmt.Errorf("store: list mission planets batch scan: %w", err)
		}
		out = append(out, r)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("store: list mission planets batch rows: %w", err)
	}
	return out, nil
}

func (q *Queries) GetMissionIDBySlug(ctx context.Context, slug string) (int64, error) {
	var id int64
	err := q.db.QueryRow(ctx, `SELECT id FROM missions WHERE slug = $1`, slug).Scan(&id)
	if err != nil {
		return 0, fmt.Errorf("store: get mission id by slug %q: %w", slug, err)
	}
	return id, nil
}

type UpsertMissionParams struct {
	Slug         string
	Name         string
	Agency       string
	Country      string
	Year         int32
	EndYear      *int32
	Destination  string
	Type         string
	Status       string
	Description  string
	KeyFact      string
	Crew         []string
	Achievements []string
}

const upsertMissionSQL = `
INSERT INTO missions (
    slug, name, agency, country, year, end_year, destination,
    type, status, description, key_fact, crew, achievements
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
ON CONFLICT (slug) DO UPDATE SET
    name         = EXCLUDED.name,
    agency       = EXCLUDED.agency,
    country      = EXCLUDED.country,
    year         = EXCLUDED.year,
    end_year     = EXCLUDED.end_year,
    destination  = EXCLUDED.destination,
    type         = EXCLUDED.type,
    status       = EXCLUDED.status,
    description  = EXCLUDED.description,
    key_fact     = EXCLUDED.key_fact,
    crew         = EXCLUDED.crew,
    achievements = EXCLUDED.achievements,
    updated_at   = NOW()
RETURNING id`

func (q *Queries) UpsertMission(ctx context.Context, p UpsertMissionParams) (int64, error) {
	var id int64
	err := q.db.QueryRow(ctx, upsertMissionSQL,
		p.Slug, p.Name, p.Agency, p.Country, p.Year, p.EndYear, p.Destination,
		p.Type, p.Status, p.Description, p.KeyFact, p.Crew, p.Achievements,
	).Scan(&id)
	if err != nil {
		return 0, fmt.Errorf("store: upsert mission %q: %w", p.Slug, err)
	}
	return id, nil
}
