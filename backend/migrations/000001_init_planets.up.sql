
CREATE TABLE planets (
    id                                BIGSERIAL PRIMARY KEY,
    slug                              TEXT        NOT NULL UNIQUE,
    name                              TEXT        NOT NULL,
    orbit_index                       INTEGER     NOT NULL UNIQUE,
    type                              TEXT        NOT NULL,
    description                       TEXT        NOT NULL,

    semi_major_axis_au                DOUBLE PRECISION NOT NULL,
    eccentricity                      DOUBLE PRECISION NOT NULL,
    inclination_deg                   DOUBLE PRECISION NOT NULL,
    period_days                       DOUBLE PRECISION NOT NULL,
    orbital_speed_km_s                DOUBLE PRECISION NOT NULL,

    radius_km                         DOUBLE PRECISION NOT NULL,
    mass_kg                           DOUBLE PRECISION NOT NULL,
    mass_earths                       DOUBLE PRECISION NOT NULL,
    surface_gravity_m_s2              DOUBLE PRECISION NOT NULL,
    escape_velocity_km_s              DOUBLE PRECISION NOT NULL,
    density_g_cm3                     DOUBLE PRECISION NOT NULL,
    obliquity_deg                     DOUBLE PRECISION NOT NULL,
    rotation_period_hours             DOUBLE PRECISION NOT NULL,
    flattening_factor                 DOUBLE PRECISION NOT NULL,

    temp_min_c                        INTEGER     NOT NULL,
    temp_max_c                        INTEGER     NOT NULL,
    temp_avg_c                        INTEGER     NOT NULL,
    albedo                            DOUBLE PRECISION NOT NULL,

    atmosphere_surface_pressure_atm   DOUBLE PRECISION NOT NULL,
    atmosphere_has_greenhouse         BOOLEAN     NOT NULL,
    atmosphere_notes                  TEXT        NOT NULL,

    surface_features                  TEXT[]      NOT NULL DEFAULT '{}',
    facts                             TEXT[]      NOT NULL DEFAULT '{}',

    total_moon_count                  INTEGER     NOT NULL,

    color_hex                         TEXT        NOT NULL,
    emissive_hex                      TEXT        NOT NULL,
    roughness                         DOUBLE PRECISION NOT NULL,
    metalness                         DOUBLE PRECISION NOT NULL,
    has_atmosphere_glow               BOOLEAN     NOT NULL,
    atmosphere_color_hex              TEXT        NULL,
    atmosphere_opacity                DOUBLE PRECISION NOT NULL DEFAULT 0,
    has_cloud_layer                   BOOLEAN     NOT NULL,
    cloud_color_hex                   TEXT        NULL,
    has_rings                         BOOLEAN     NOT NULL,
    ring_data                         JSONB       NULL,
    visual_radius                     DOUBLE PRECISION NOT NULL,
    orbit_distance                    DOUBLE PRECISION NOT NULL,
    canvas_texture                    JSONB       NOT NULL,

    created_at                        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT planets_type_valid
        CHECK (type IN ('terrestrial','gas_giant','ice_giant')),
    CONSTRAINT planets_eccentricity_range
        CHECK (eccentricity >= 0 AND eccentricity <= 1),
    CONSTRAINT planets_albedo_range
        CHECK (albedo >= 0 AND albedo <= 1),
    CONSTRAINT planets_obliquity_range
        CHECK (obliquity_deg >= 0 AND obliquity_deg <= 360),
    CONSTRAINT planets_roughness_range
        CHECK (roughness >= 0 AND roughness <= 1),
    CONSTRAINT planets_metalness_range
        CHECK (metalness >= 0 AND metalness <= 1),
    CONSTRAINT planets_atmosphere_opacity_range
        CHECK (atmosphere_opacity >= 0 AND atmosphere_opacity <= 1),
    CONSTRAINT planets_color_hex_format
        CHECK (color_hex ~ '^#[0-9a-fA-F]{6}$'),
    CONSTRAINT planets_emissive_hex_format
        CHECK (emissive_hex ~ '^#[0-9a-fA-F]{6}$'),
    CONSTRAINT planets_atmosphere_color_hex_format
        CHECK (atmosphere_color_hex IS NULL OR atmosphere_color_hex ~ '^#[0-9a-fA-F]{6}$'),
    CONSTRAINT planets_cloud_color_hex_format
        CHECK (cloud_color_hex IS NULL OR cloud_color_hex ~ '^#[0-9a-fA-F]{6}$'),
    CONSTRAINT planets_total_moon_count_nonneg
        CHECK (total_moon_count >= 0)
);

COMMENT ON TABLE  planets                       IS 'Solar-system planets. Slug is public identifier; orbit_index is source-JSON ordering.';
COMMENT ON COLUMN planets.ring_data             IS 'JSONB: {inner_radius_scale, outer_radius_scale, bands:[{color,start,end,opacity}]}. NULL when has_rings=false.';
COMMENT ON COLUMN planets.canvas_texture        IS 'JSONB: {technique, palette:string[], noise_scale, crater_density}. Variant shape by technique.';
COMMENT ON COLUMN planets.rotation_period_hours IS 'Negative values denote retrograde rotation (Venus, Uranus).';

CREATE TABLE atmosphere_components (
    id           BIGSERIAL   PRIMARY KEY,
    planet_id    BIGINT      NOT NULL REFERENCES planets(id) ON DELETE CASCADE,
    position     INTEGER     NOT NULL,
    gas          TEXT        NOT NULL,
    percent      DOUBLE PRECISION NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT atmosphere_components_percent_range
        CHECK (percent >= 0 AND percent <= 100),
    CONSTRAINT atmosphere_components_unique_per_planet
        UNIQUE (planet_id, position)
);

COMMENT ON TABLE atmosphere_components IS 'Ordered composition list per planet atmosphere.';

CREATE TABLE moons (
    id                BIGSERIAL   PRIMARY KEY,
    planet_id         BIGINT      NOT NULL REFERENCES planets(id) ON DELETE CASCADE,
    position          INTEGER     NOT NULL,
    name              TEXT        NOT NULL,
    radius_km         DOUBLE PRECISION NOT NULL,
    distance_km       DOUBLE PRECISION NOT NULL,
    period_days       DOUBLE PRECISION NOT NULL,
    discovered_by     TEXT        NOT NULL,
    discovered_year   INTEGER     NOT NULL,
    description       TEXT        NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT moons_unique_per_planet UNIQUE (planet_id, position),
    CONSTRAINT moons_radius_positive   CHECK (radius_km > 0),
    CONSTRAINT moons_distance_positive CHECK (distance_km > 0)
);

COMMENT ON TABLE moons IS 'Named moons of planets. Ordered by position within parent planet.';

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
