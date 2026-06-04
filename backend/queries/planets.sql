
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
WHERE (cardinality(@types::text[]) = 0 OR type = ANY(@types::text[]))
ORDER BY orbit_index ASC, id ASC
LIMIT $1 OFFSET $2;

SELECT COUNT(*)::bigint AS total
FROM planets
WHERE (cardinality(@types::text[]) = 0 OR type = ANY(@types::text[]));

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
WHERE slug = $1;

SELECT planet_id, position, gas, percent
FROM atmosphere_components
WHERE planet_id = ANY($1::bigint[])
ORDER BY planet_id, position;

SELECT
    planet_id, position, name, radius_km, distance_km, period_days,
    discovered_by, discovered_year, description
FROM moons
WHERE planet_id = ANY($1::bigint[])
ORDER BY planet_id, position;

SELECT
    pm.planet_id, pm.position, pm.achievement,
    m.slug, m.name, m.agency, m.year, m.type
FROM planet_missions pm
JOIN missions m ON m.id = pm.mission_id
WHERE pm.planet_id = ANY($1::bigint[])
ORDER BY pm.planet_id, pm.position;

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
RETURNING id;

DELETE FROM atmosphere_components WHERE planet_id = $1;

INSERT INTO atmosphere_components (planet_id, position, gas, percent)
VALUES ($1, $2, $3, $4);

DELETE FROM moons WHERE planet_id = $1;

INSERT INTO moons (
    planet_id, position, name, radius_km, distance_km, period_days,
    discovered_by, discovered_year, description
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);

DELETE FROM planet_missions WHERE planet_id = $1;

INSERT INTO planet_missions (planet_id, mission_id, position, achievement)
VALUES ($1, $2, $3, $4)
ON CONFLICT (planet_id, mission_id) DO UPDATE SET
    position    = EXCLUDED.position,
    achievement = EXCLUDED.achievement;
