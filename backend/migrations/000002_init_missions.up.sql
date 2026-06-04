
CREATE TABLE missions (
    id           BIGSERIAL   PRIMARY KEY,
    slug         TEXT        NOT NULL UNIQUE,
    name         TEXT        NOT NULL,
    agency       TEXT        NOT NULL,
    country      TEXT        NOT NULL,
    year         INTEGER     NOT NULL,
    end_year     INTEGER     NULL,
    destination  TEXT        NOT NULL,
    type         TEXT        NOT NULL,
    status       TEXT        NOT NULL,
    description  TEXT        NOT NULL,
    key_fact     TEXT        NOT NULL,
    crew         TEXT[]      NULL,
    achievements TEXT[]      NOT NULL DEFAULT '{}',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT missions_year_after_space_age
        CHECK (year > 1950),
    CONSTRAINT missions_end_year_valid
        CHECK (end_year IS NULL OR end_year >= year),
    CONSTRAINT missions_type_valid
        CHECK (type IN (
            'flyby','orbiter','lander','rover','crewed',
            'robotic','sample-return','impactor','station','telescope'
        )),
    CONSTRAINT missions_status_valid
        CHECK (status IN ('completed','active','failed','partial','planned'))
);

COMMENT ON TABLE missions IS 'Historical and planned space missions, 1957-present.';
COMMENT ON COLUMN missions.agency IS 'Free text; composite values like "NASA/ESA" are stored verbatim until v2 introduces a join table.';

CREATE TABLE planet_missions (
    planet_id   BIGINT      NOT NULL REFERENCES planets(id)  ON DELETE CASCADE,
    mission_id  BIGINT      NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    achievement TEXT        NULL,
    position    INTEGER     NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (planet_id, mission_id)
);

COMMENT ON TABLE planet_missions IS 'Many-to-many between planets and missions. `achievement` is the planet-specific summary shown in the planet panel.';
