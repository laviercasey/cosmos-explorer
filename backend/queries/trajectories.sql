
SELECT
    t.id, t.mission_id, t.duration, t.duration_ru,
    t.moon_pos, t.moon_orbit_arc, t.waypoints, t.phases, t.sim_duration_s,
    m.slug  AS mission_slug,
    m.name  AS mission_name,
    m.agency, m.year, m.crew
FROM trajectories t
JOIN missions m ON m.id = t.mission_id
WHERE m.slug = $1;

SELECT
    t.id, t.mission_id, t.duration, t.duration_ru,
    t.moon_pos, t.moon_orbit_arc, t.waypoints, t.phases, t.sim_duration_s,
    m.slug  AS mission_slug,
    m.name  AS mission_name,
    m.agency, m.year, m.crew
FROM trajectories t
JOIN missions m ON m.id = t.mission_id
WHERE t.mission_id = $1;

INSERT INTO trajectories (
    mission_id, duration, duration_ru,
    moon_pos, moon_orbit_arc, waypoints, phases, sim_duration_s
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
)
ON CONFLICT (mission_id) DO UPDATE SET
    duration       = EXCLUDED.duration,
    duration_ru    = EXCLUDED.duration_ru,
    moon_pos       = EXCLUDED.moon_pos,
    moon_orbit_arc = EXCLUDED.moon_orbit_arc,
    waypoints      = EXCLUDED.waypoints,
    phases         = EXCLUDED.phases,
    sim_duration_s = EXCLUDED.sim_duration_s,
    updated_at     = NOW();
