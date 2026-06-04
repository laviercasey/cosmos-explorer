package store

import (
	"context"
	"fmt"
)

type ListPlanetsParams struct {
	Types     []string
	SortField string
	SortDesc  bool
	Limit     int32
	Offset    int32
}

const listPlanetsSQL = `
SELECT
    id, slug, name, orbit_index, type, description,
    semi_major_axis_au, eccentricity, inclination_deg, period_days, orbital_speed_km_s,
    radius_km, mass_kg, mass_earths, surface_gravity_m_s2, escape_velocity_km_s,
    density_g_cm3, obliquity_deg, rotation_period_hours, flattening_factor,
    temp_min_c, temp_max_c, temp_avg_c, albedo,
    atmosphere_surface_pressure_atm, atmosphere_has_greenhouse, atmosphere_notes,
    surface_features, facts, total_moon_count,
    color_hex, emissive_hex, roughness, metalness,
    has_atmosphere_glow, atmosphere_color_hex, atmosphere_opacity,
    has_cloud_layer, cloud_color_hex, has_rings, ring_data,
    visual_radius, orbit_distance, canvas_texture,
    created_at, updated_at
FROM planets
WHERE (cardinality($1::text[]) = 0 OR type = ANY($1::text[]))
ORDER BY
    CASE WHEN $2::text = 'name'                AND NOT $3::bool THEN name                END ASC  NULLS LAST,
    CASE WHEN $2::text = 'name'                AND     $3::bool THEN name                END DESC NULLS LAST,
    CASE WHEN $2::text = 'semi_major_axis_au'  AND NOT $3::bool THEN semi_major_axis_au  END ASC  NULLS LAST,
    CASE WHEN $2::text = 'semi_major_axis_au'  AND     $3::bool THEN semi_major_axis_au  END DESC NULLS LAST,
    CASE WHEN $2::text = 'radius_km'           AND NOT $3::bool THEN radius_km           END ASC  NULLS LAST,
    CASE WHEN $2::text = 'radius_km'           AND     $3::bool THEN radius_km           END DESC NULLS LAST,
    CASE WHEN $2::text IN ('index','')         AND     $3::bool THEN orbit_index         END DESC NULLS LAST,
    orbit_index ASC, id ASC
LIMIT $4 OFFSET $5`

func (q *Queries) ListPlanets(ctx context.Context, p ListPlanetsParams) ([]PlanetRow, error) {
	rows, err := q.db.Query(ctx, listPlanetsSQL, p.Types, p.SortField, p.SortDesc, p.Limit, p.Offset)
	if err != nil {
		return nil, fmt.Errorf("store: list planets: %w", err)
	}
	defer rows.Close()

	out := make([]PlanetRow, 0)
	for rows.Next() {
		r, err := scanPlanetRow(rows)
		if err != nil {
			return nil, fmt.Errorf("store: list planets scan: %w", err)
		}
		out = append(out, r)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("store: list planets rows: %w", err)
	}
	return out, nil
}

const countPlanetsSQL = `
SELECT COUNT(*)::bigint
FROM planets
WHERE (cardinality($1::text[]) = 0 OR type = ANY($1::text[]))`

func (q *Queries) CountPlanets(ctx context.Context, types []string) (int64, error) {
	var total int64
	if err := q.db.QueryRow(ctx, countPlanetsSQL, types).Scan(&total); err != nil {
		return 0, fmt.Errorf("store: count planets: %w", err)
	}
	return total, nil
}

const getPlanetBySlugSQL = `
SELECT
    id, slug, name, orbit_index, type, description,
    semi_major_axis_au, eccentricity, inclination_deg, period_days, orbital_speed_km_s,
    radius_km, mass_kg, mass_earths, surface_gravity_m_s2, escape_velocity_km_s,
    density_g_cm3, obliquity_deg, rotation_period_hours, flattening_factor,
    temp_min_c, temp_max_c, temp_avg_c, albedo,
    atmosphere_surface_pressure_atm, atmosphere_has_greenhouse, atmosphere_notes,
    surface_features, facts, total_moon_count,
    color_hex, emissive_hex, roughness, metalness,
    has_atmosphere_glow, atmosphere_color_hex, atmosphere_opacity,
    has_cloud_layer, cloud_color_hex, has_rings, ring_data,
    visual_radius, orbit_distance, canvas_texture,
    created_at, updated_at
FROM planets
WHERE slug = $1`

func (q *Queries) GetPlanetBySlug(ctx context.Context, slug string) (PlanetRow, error) {
	row := q.db.QueryRow(ctx, getPlanetBySlugSQL, slug)
	r, err := scanPlanetRow(row)
	if err != nil {
		return PlanetRow{}, fmt.Errorf("store: get planet by slug: %w", err)
	}
	return r, nil
}

const listAtmosphereComponentsByPlanetSQL = `
SELECT planet_id, position, gas, percent
FROM atmosphere_components
WHERE planet_id = ANY($1::bigint[])
ORDER BY planet_id, position`

func (q *Queries) ListAtmosphereComponentsByPlanet(ctx context.Context, planetIDs []int64) ([]AtmosphereComponentRow, error) {
	rows, err := q.db.Query(ctx, listAtmosphereComponentsByPlanetSQL, planetIDs)
	if err != nil {
		return nil, fmt.Errorf("store: list atmosphere: %w", err)
	}
	defer rows.Close()

	out := make([]AtmosphereComponentRow, 0)
	for rows.Next() {
		var r AtmosphereComponentRow
		if err := rows.Scan(&r.PlanetID, &r.Position, &r.Gas, &r.Percent); err != nil {
			return nil, fmt.Errorf("store: list atmosphere scan: %w", err)
		}
		out = append(out, r)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("store: list atmosphere rows: %w", err)
	}
	return out, nil
}

const listMoonsByPlanetSQL = `
SELECT id, planet_id, position, name, radius_km, distance_km, period_days,
       discovered_by, discovered_year, description
FROM moons
WHERE planet_id = ANY($1::bigint[])
ORDER BY planet_id, position`

func (q *Queries) ListMoonsByPlanet(ctx context.Context, planetIDs []int64) ([]MoonRow, error) {
	rows, err := q.db.Query(ctx, listMoonsByPlanetSQL, planetIDs)
	if err != nil {
		return nil, fmt.Errorf("store: list moons: %w", err)
	}
	defer rows.Close()

	out := make([]MoonRow, 0)
	for rows.Next() {
		var r MoonRow
		if err := rows.Scan(
			&r.ID, &r.PlanetID, &r.Position, &r.Name, &r.RadiusKm, &r.DistanceKm,
			&r.PeriodDays, &r.DiscoveredBy, &r.DiscoveredYear, &r.Description,
		); err != nil {
			return nil, fmt.Errorf("store: list moons scan: %w", err)
		}
		out = append(out, r)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("store: list moons rows: %w", err)
	}
	return out, nil
}

const listPlanetMissionsByPlanetSQL = `
SELECT pm.planet_id, pm.position, pm.achievement,
       m.slug, m.name, m.agency, m.year, m.type
FROM planet_missions pm
JOIN missions m ON m.id = pm.mission_id
WHERE pm.planet_id = ANY($1::bigint[])
ORDER BY pm.planet_id, pm.position`

func (q *Queries) ListPlanetMissionsByPlanet(ctx context.Context, planetIDs []int64) ([]PlanetMissionRow, error) {
	rows, err := q.db.Query(ctx, listPlanetMissionsByPlanetSQL, planetIDs)
	if err != nil {
		return nil, fmt.Errorf("store: list planet missions: %w", err)
	}
	defer rows.Close()

	out := make([]PlanetMissionRow, 0)
	for rows.Next() {
		var r PlanetMissionRow
		if err := rows.Scan(
			&r.PlanetID, &r.Position, &r.Achievement,
			&r.Slug, &r.Name, &r.Agency, &r.Year, &r.Type,
		); err != nil {
			return nil, fmt.Errorf("store: list planet missions scan: %w", err)
		}
		out = append(out, r)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("store: list planet missions rows: %w", err)
	}
	return out, nil
}

type UpsertPlanetParams struct {
	Slug                         string
	Name                         string
	OrbitIndex                   int32
	Type                         string
	Description                  string
	SemiMajorAxisAU              float64
	Eccentricity                 float64
	InclinationDeg               float64
	PeriodDays                   float64
	OrbitalSpeedKmS              float64
	RadiusKm                     float64
	MassKg                       float64
	MassEarths                   float64
	SurfaceGravityMs2            float64
	EscapeVelocityKmS            float64
	DensityGCm3                  float64
	ObliquityDeg                 float64
	RotationPeriodHours          float64
	FlatteningFactor             float64
	TempMinC                     int32
	TempMaxC                     int32
	TempAvgC                     int32
	Albedo                       float64
	AtmosphereSurfacePressureAtm float64
	AtmosphereHasGreenhouse      bool
	AtmosphereNotes              string
	SurfaceFeatures              []string
	Facts                        []string
	TotalMoonCount               int32
	ColorHex                     string
	EmissiveHex                  string
	Roughness                    float64
	Metalness                    float64
	HasAtmosphereGlow            bool
	AtmosphereColorHex           *string
	AtmosphereOpacity            float64
	HasCloudLayer                bool
	CloudColorHex                *string
	HasRings                     bool
	RingData                     []byte
	VisualRadius                 float64
	OrbitDistance                float64
	CanvasTexture                []byte
}

const upsertPlanetSQL = `
INSERT INTO planets (
    slug, name, orbit_index, type, description,
    semi_major_axis_au, eccentricity, inclination_deg, period_days, orbital_speed_km_s,
    radius_km, mass_kg, mass_earths, surface_gravity_m_s2, escape_velocity_km_s,
    density_g_cm3, obliquity_deg, rotation_period_hours, flattening_factor,
    temp_min_c, temp_max_c, temp_avg_c, albedo,
    atmosphere_surface_pressure_atm, atmosphere_has_greenhouse, atmosphere_notes,
    surface_features, facts, total_moon_count,
    color_hex, emissive_hex, roughness, metalness,
    has_atmosphere_glow, atmosphere_color_hex, atmosphere_opacity,
    has_cloud_layer, cloud_color_hex, has_rings, ring_data,
    visual_radius, orbit_distance, canvas_texture
) VALUES (
    $1, $2, $3, $4, $5,
    $6, $7, $8, $9, $10,
    $11, $12, $13, $14, $15,
    $16, $17, $18, $19,
    $20, $21, $22, $23,
    $24, $25, $26,
    $27, $28, $29,
    $30, $31, $32, $33,
    $34, $35, $36,
    $37, $38, $39, $40,
    $41, $42, $43
)
ON CONFLICT (slug) DO UPDATE SET
    name                             = EXCLUDED.name,
    orbit_index                      = EXCLUDED.orbit_index,
    type                             = EXCLUDED.type,
    description                      = EXCLUDED.description,
    semi_major_axis_au               = EXCLUDED.semi_major_axis_au,
    eccentricity                     = EXCLUDED.eccentricity,
    inclination_deg                  = EXCLUDED.inclination_deg,
    period_days                      = EXCLUDED.period_days,
    orbital_speed_km_s               = EXCLUDED.orbital_speed_km_s,
    radius_km                        = EXCLUDED.radius_km,
    mass_kg                          = EXCLUDED.mass_kg,
    mass_earths                      = EXCLUDED.mass_earths,
    surface_gravity_m_s2             = EXCLUDED.surface_gravity_m_s2,
    escape_velocity_km_s             = EXCLUDED.escape_velocity_km_s,
    density_g_cm3                    = EXCLUDED.density_g_cm3,
    obliquity_deg                    = EXCLUDED.obliquity_deg,
    rotation_period_hours            = EXCLUDED.rotation_period_hours,
    flattening_factor                = EXCLUDED.flattening_factor,
    temp_min_c                       = EXCLUDED.temp_min_c,
    temp_max_c                       = EXCLUDED.temp_max_c,
    temp_avg_c                       = EXCLUDED.temp_avg_c,
    albedo                           = EXCLUDED.albedo,
    atmosphere_surface_pressure_atm  = EXCLUDED.atmosphere_surface_pressure_atm,
    atmosphere_has_greenhouse        = EXCLUDED.atmosphere_has_greenhouse,
    atmosphere_notes                 = EXCLUDED.atmosphere_notes,
    surface_features                 = EXCLUDED.surface_features,
    facts                            = EXCLUDED.facts,
    total_moon_count                 = EXCLUDED.total_moon_count,
    color_hex                        = EXCLUDED.color_hex,
    emissive_hex                     = EXCLUDED.emissive_hex,
    roughness                        = EXCLUDED.roughness,
    metalness                        = EXCLUDED.metalness,
    has_atmosphere_glow              = EXCLUDED.has_atmosphere_glow,
    atmosphere_color_hex             = EXCLUDED.atmosphere_color_hex,
    atmosphere_opacity               = EXCLUDED.atmosphere_opacity,
    has_cloud_layer                  = EXCLUDED.has_cloud_layer,
    cloud_color_hex                  = EXCLUDED.cloud_color_hex,
    has_rings                        = EXCLUDED.has_rings,
    ring_data                        = EXCLUDED.ring_data,
    visual_radius                    = EXCLUDED.visual_radius,
    orbit_distance                   = EXCLUDED.orbit_distance,
    canvas_texture                   = EXCLUDED.canvas_texture,
    updated_at                       = NOW()
RETURNING id`

func (q *Queries) UpsertPlanet(ctx context.Context, p UpsertPlanetParams) (int64, error) {
	var id int64
	err := q.db.QueryRow(ctx, upsertPlanetSQL,
		p.Slug, p.Name, p.OrbitIndex, p.Type, p.Description,
		p.SemiMajorAxisAU, p.Eccentricity, p.InclinationDeg, p.PeriodDays, p.OrbitalSpeedKmS,
		p.RadiusKm, p.MassKg, p.MassEarths, p.SurfaceGravityMs2, p.EscapeVelocityKmS,
		p.DensityGCm3, p.ObliquityDeg, p.RotationPeriodHours, p.FlatteningFactor,
		p.TempMinC, p.TempMaxC, p.TempAvgC, p.Albedo,
		p.AtmosphereSurfacePressureAtm, p.AtmosphereHasGreenhouse, p.AtmosphereNotes,
		p.SurfaceFeatures, p.Facts, p.TotalMoonCount,
		p.ColorHex, p.EmissiveHex, p.Roughness, p.Metalness,
		p.HasAtmosphereGlow, p.AtmosphereColorHex, p.AtmosphereOpacity,
		p.HasCloudLayer, p.CloudColorHex, p.HasRings, p.RingData,
		p.VisualRadius, p.OrbitDistance, p.CanvasTexture,
	).Scan(&id)
	if err != nil {
		return 0, fmt.Errorf("store: upsert planet %q: %w", p.Slug, err)
	}
	return id, nil
}

func (q *Queries) DeleteAtmosphereComponentsByPlanet(ctx context.Context, planetID int64) error {
	_, err := q.db.Exec(ctx, `DELETE FROM atmosphere_components WHERE planet_id = $1`, planetID)
	if err != nil {
		return fmt.Errorf("store: delete atmosphere: %w", err)
	}
	return nil
}

func (q *Queries) InsertAtmosphereComponent(ctx context.Context, planetID int64, position int32, gas string, percent float64) error {
	_, err := q.db.Exec(ctx,
		`INSERT INTO atmosphere_components (planet_id, position, gas, percent) VALUES ($1, $2, $3, $4)`,
		planetID, position, gas, percent,
	)
	if err != nil {
		return fmt.Errorf("store: insert atmosphere: %w", err)
	}
	return nil
}

func (q *Queries) DeleteMoonsByPlanet(ctx context.Context, planetID int64) error {
	_, err := q.db.Exec(ctx, `DELETE FROM moons WHERE planet_id = $1`, planetID)
	if err != nil {
		return fmt.Errorf("store: delete moons: %w", err)
	}
	return nil
}

type InsertMoonParams struct {
	PlanetID       int64
	Position       int32
	Name           string
	RadiusKm       float64
	DistanceKm     float64
	PeriodDays     float64
	DiscoveredBy   string
	DiscoveredYear int32
	Description    string
}

func (q *Queries) InsertMoon(ctx context.Context, p InsertMoonParams) error {
	_, err := q.db.Exec(ctx,
		`INSERT INTO moons (
            planet_id, position, name, radius_km, distance_km, period_days,
            discovered_by, discovered_year, description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		p.PlanetID, p.Position, p.Name, p.RadiusKm, p.DistanceKm, p.PeriodDays,
		p.DiscoveredBy, p.DiscoveredYear, p.Description,
	)
	if err != nil {
		return fmt.Errorf("store: insert moon: %w", err)
	}
	return nil
}

func (q *Queries) DeletePlanetMissionsByPlanet(ctx context.Context, planetID int64) error {
	_, err := q.db.Exec(ctx, `DELETE FROM planet_missions WHERE planet_id = $1`, planetID)
	if err != nil {
		return fmt.Errorf("store: delete planet_missions: %w", err)
	}
	return nil
}

func (q *Queries) InsertPlanetMission(ctx context.Context, planetID, missionID int64, position int32, achievement *string) error {
	_, err := q.db.Exec(ctx,
		`INSERT INTO planet_missions (planet_id, mission_id, position, achievement)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (planet_id, mission_id) DO UPDATE SET
             position    = EXCLUDED.position,
             achievement = EXCLUDED.achievement`,
		planetID, missionID, position, achievement,
	)
	if err != nil {
		return fmt.Errorf("store: insert planet_mission: %w", err)
	}
	return nil
}
