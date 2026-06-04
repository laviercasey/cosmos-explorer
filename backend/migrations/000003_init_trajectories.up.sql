
CREATE TABLE trajectories (
    id              BIGSERIAL   PRIMARY KEY,
    mission_id      BIGINT      NOT NULL UNIQUE REFERENCES missions(id) ON DELETE CASCADE,
    duration        TEXT        NOT NULL,
    duration_ru     TEXT        NULL,
    moon_pos        JSONB       NOT NULL,
    moon_orbit_arc  DOUBLE PRECISION NOT NULL,
    waypoints       JSONB       NOT NULL,
    phases          JSONB       NOT NULL,
    sim_duration_s  INTEGER     NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT trajectories_sim_duration_positive
        CHECK (sim_duration_s > 0),
    CONSTRAINT trajectories_moon_orbit_arc_finite
        CHECK (moon_orbit_arc BETWEEN -100 AND 100)
);

COMMENT ON TABLE trajectories IS 'Per-mission 3D trajectory for the MissionSimulator widget. Opaque JSONB for waypoints/phases.';
