package store

import (
	"context"
	"fmt"
)

type PlanetTranslationRow struct {
	PlanetID        int64
	Lang            string
	Name            string
	Description     *string
	AtmosphereNotes *string
	Facts           []string
	SurfaceFeatures []string
}

type MoonTranslationRow struct {
	MoonID int64
	Lang   string
	Name   string
	Notes  *string
}

type UpsertPlanetTranslationParams struct {
	PlanetID        int64
	Lang            string
	Name            string
	Description     *string
	AtmosphereNotes *string
	Facts           []string
	SurfaceFeatures []string
}

type UpsertMissionTranslationParams struct {
	MissionID    int64
	Lang         string
	Description  *string
	KeyFact      *string
	Achievements []string
}

type UpsertMoonTranslationParams struct {
	MoonID int64
	Lang   string
	Name   string
	Notes  *string
}

const getPlanetTranslationSQL = `
SELECT planet_id, lang, name, description, atmosphere_notes, facts, surface_features
FROM planet_translations
WHERE planet_id = $1 AND lang = $2`

func (q *Queries) GetPlanetTranslation(ctx context.Context, planetID int64, lang string) (PlanetTranslationRow, error) {
	row := q.db.QueryRow(ctx, getPlanetTranslationSQL, planetID, lang)
	var r PlanetTranslationRow
	if err := row.Scan(
		&r.PlanetID, &r.Lang, &r.Name,
		&r.Description, &r.AtmosphereNotes,
		&r.Facts, &r.SurfaceFeatures,
	); err != nil {
		return PlanetTranslationRow{}, fmt.Errorf("store: get planet translation: %w", err)
	}
	return r, nil
}

const listPlanetTranslationsSQL = `
SELECT planet_id, lang, name, description, atmosphere_notes, facts, surface_features
FROM planet_translations
WHERE planet_id = ANY($1::bigint[]) AND lang = $2`

func (q *Queries) ListPlanetTranslationsByPlanets(ctx context.Context, planetIDs []int64, lang string) (map[int64]PlanetTranslationRow, error) {
	out := make(map[int64]PlanetTranslationRow)
	if len(planetIDs) == 0 {
		return out, nil
	}
	rows, err := q.db.Query(ctx, listPlanetTranslationsSQL, planetIDs, lang)
	if err != nil {
		return nil, fmt.Errorf("store: list planet translations: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var r PlanetTranslationRow
		if err := rows.Scan(
			&r.PlanetID, &r.Lang, &r.Name,
			&r.Description, &r.AtmosphereNotes,
			&r.Facts, &r.SurfaceFeatures,
		); err != nil {
			return nil, fmt.Errorf("store: list planet translations scan: %w", err)
		}
		out[r.PlanetID] = r
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("store: list planet translations rows: %w", err)
	}
	return out, nil
}

const upsertPlanetTranslationSQL = `
INSERT INTO planet_translations (
    planet_id, lang, name, description, atmosphere_notes, facts, surface_features
) VALUES ($1, $2, $3, $4, $5, $6, $7)
ON CONFLICT (planet_id, lang) DO UPDATE SET
    name             = EXCLUDED.name,
    description      = EXCLUDED.description,
    atmosphere_notes = EXCLUDED.atmosphere_notes,
    facts            = EXCLUDED.facts,
    surface_features = EXCLUDED.surface_features,
    updated_at       = NOW()`

func (q *Queries) UpsertPlanetTranslation(ctx context.Context, p UpsertPlanetTranslationParams) error {
	facts := p.Facts
	if facts == nil {
		facts = []string{}
	}
	features := p.SurfaceFeatures
	if features == nil {
		features = []string{}
	}
	_, err := q.db.Exec(ctx, upsertPlanetTranslationSQL,
		p.PlanetID, p.Lang, p.Name, p.Description, p.AtmosphereNotes, facts, features,
	)
	if err != nil {
		return fmt.Errorf("store: upsert planet translation (planet=%d lang=%s): %w", p.PlanetID, p.Lang, err)
	}
	return nil
}

const listMoonTranslationsByPlanetSQL = `
SELECT mt.moon_id, mt.lang, mt.name, mt.notes
FROM moon_translations mt
JOIN moons m ON m.id = mt.moon_id
WHERE m.planet_id = $1 AND mt.lang = $2`

func (q *Queries) GetMoonTranslations(ctx context.Context, planetID int64, lang string) (map[int64]MoonTranslationRow, error) {
	out := make(map[int64]MoonTranslationRow)
	rows, err := q.db.Query(ctx, listMoonTranslationsByPlanetSQL, planetID, lang)
	if err != nil {
		return nil, fmt.Errorf("store: list moon translations: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var r MoonTranslationRow
		if err := rows.Scan(&r.MoonID, &r.Lang, &r.Name, &r.Notes); err != nil {
			return nil, fmt.Errorf("store: list moon translations scan: %w", err)
		}
		out[r.MoonID] = r
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("store: list moon translations rows: %w", err)
	}
	return out, nil
}

const listMoonTranslationsByPlanetsSQL = `
SELECT mt.moon_id, mt.lang, mt.name, mt.notes
FROM moon_translations mt
JOIN moons m ON m.id = mt.moon_id
WHERE m.planet_id = ANY($1::bigint[]) AND mt.lang = $2`

func (q *Queries) ListMoonTranslationsByPlanets(ctx context.Context, planetIDs []int64, lang string) (map[int64]MoonTranslationRow, error) {
	out := make(map[int64]MoonTranslationRow)
	if len(planetIDs) == 0 {
		return out, nil
	}
	rows, err := q.db.Query(ctx, listMoonTranslationsByPlanetsSQL, planetIDs, lang)
	if err != nil {
		return nil, fmt.Errorf("store: list moon translations (batch): %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var r MoonTranslationRow
		if err := rows.Scan(&r.MoonID, &r.Lang, &r.Name, &r.Notes); err != nil {
			return nil, fmt.Errorf("store: list moon translations (batch) scan: %w", err)
		}
		out[r.MoonID] = r
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("store: list moon translations (batch) rows: %w", err)
	}
	return out, nil
}

func (q *Queries) LookupMoonIDByPlanetAndPosition(ctx context.Context, planetID int64, position int32) (int64, error) {
	var id int64
	err := q.db.QueryRow(ctx,
		`SELECT id FROM moons WHERE planet_id = $1 AND position = $2`,
		planetID, position,
	).Scan(&id)
	if err != nil {
		return 0, fmt.Errorf("store: lookup moon by position (planet=%d pos=%d): %w", planetID, position, err)
	}
	return id, nil
}

func (q *Queries) LookupMoonIDByPlanetAndName(ctx context.Context, planetID int64, name string) (int64, error) {
	var id int64
	err := q.db.QueryRow(ctx,
		`SELECT id FROM moons WHERE planet_id = $1 AND name = $2`,
		planetID, name,
	).Scan(&id)
	if err != nil {
		return 0, fmt.Errorf("store: lookup moon by name (planet=%d name=%s): %w", planetID, name, err)
	}
	return id, nil
}

const getMissionTranslationSQL = `
SELECT mission_id, lang, description, key_fact, achievements
FROM mission_translations
WHERE mission_id = $1 AND lang = $2`

func (q *Queries) GetMissionTranslation(ctx context.Context, missionID int64, lang string) (MissionTranslationRow, error) {
	row := q.db.QueryRow(ctx, getMissionTranslationSQL, missionID, lang)
	var r MissionTranslationRow
	if err := row.Scan(
		&r.MissionID, &r.Lang, &r.Description, &r.KeyFact, &r.Achievements,
	); err != nil {
		return MissionTranslationRow{}, fmt.Errorf("store: get mission translation: %w", err)
	}
	return r, nil
}

const listMissionTranslationsSQL = `
SELECT mission_id, lang, description, key_fact, achievements
FROM mission_translations
WHERE mission_id = ANY($1::bigint[]) AND lang = $2`

func (q *Queries) ListMissionTranslations(ctx context.Context, missionIDs []int64, lang string) (map[int64]MissionTranslationRow, error) {
	out := make(map[int64]MissionTranslationRow)
	if len(missionIDs) == 0 {
		return out, nil
	}
	rows, err := q.db.Query(ctx, listMissionTranslationsSQL, missionIDs, lang)
	if err != nil {
		return nil, fmt.Errorf("store: list mission translations: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var r MissionTranslationRow
		if err := rows.Scan(
			&r.MissionID, &r.Lang, &r.Description, &r.KeyFact, &r.Achievements,
		); err != nil {
			return nil, fmt.Errorf("store: list mission translations scan: %w", err)
		}
		out[r.MissionID] = r
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("store: list mission translations rows: %w", err)
	}
	return out, nil
}

const upsertMissionTranslationSQL = `
INSERT INTO mission_translations (
    mission_id, lang, description, key_fact, achievements
) VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (mission_id, lang) DO UPDATE SET
    description  = EXCLUDED.description,
    key_fact     = EXCLUDED.key_fact,
    achievements = EXCLUDED.achievements,
    updated_at   = NOW()`

func (q *Queries) UpsertMissionTranslation(ctx context.Context, p UpsertMissionTranslationParams) error {
	achievements := p.Achievements
	if achievements == nil {
		achievements = []string{}
	}
	_, err := q.db.Exec(ctx, upsertMissionTranslationSQL,
		p.MissionID, p.Lang, p.Description, p.KeyFact, achievements,
	)
	if err != nil {
		return fmt.Errorf("store: upsert mission translation (mission=%d lang=%s): %w", p.MissionID, p.Lang, err)
	}
	return nil
}

func (q *Queries) LookupPlanetIDByName(ctx context.Context, name string) (int64, error) {
	var id int64
	err := q.db.QueryRow(ctx,
		`SELECT id FROM planets WHERE LOWER(name) = LOWER($1)`,
		name,
	).Scan(&id)
	if err != nil {
		return 0, fmt.Errorf("store: lookup planet by name (name=%s): %w", name, err)
	}
	return id, nil
}

const upsertMoonTranslationSQL = `
INSERT INTO moon_translations (moon_id, lang, name, notes)
VALUES ($1, $2, $3, $4)
ON CONFLICT (moon_id, lang) DO UPDATE SET
    name       = EXCLUDED.name,
    notes      = EXCLUDED.notes,
    updated_at = NOW()`

func (q *Queries) UpsertMoonTranslation(ctx context.Context, p UpsertMoonTranslationParams) error {
	_, err := q.db.Exec(ctx, upsertMoonTranslationSQL, p.MoonID, p.Lang, p.Name, p.Notes)
	if err != nil {
		return fmt.Errorf("store: upsert moon translation (moon=%d lang=%s): %w", p.MoonID, p.Lang, err)
	}
	return nil
}
