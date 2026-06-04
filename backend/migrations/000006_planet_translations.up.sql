
BEGIN;

CREATE TABLE planet_translations (
    planet_id        BIGINT      NOT NULL REFERENCES planets(id) ON DELETE CASCADE,
    lang             TEXT        NOT NULL CHECK (lang IN ('en','ru')),
    name             TEXT        NOT NULL,
    description      TEXT,
    atmosphere_notes TEXT,
    facts            TEXT[]      NOT NULL DEFAULT '{}',
    surface_features TEXT[]      NOT NULL DEFAULT '{}',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (planet_id, lang)
);

CREATE INDEX planet_translations_lang_idx ON planet_translations(lang);

COMMENT ON TABLE  planet_translations IS 'Per-language overrides for planet display fields. Missing row ⇒ serve canonical English from planets.';
COMMENT ON COLUMN planet_translations.name IS 'Localized display name. Non-null because at least the name must be present in a translation row.';

CREATE TABLE moon_translations (
    moon_id     BIGINT      NOT NULL REFERENCES moons(id) ON DELETE CASCADE,
    lang        TEXT        NOT NULL CHECK (lang IN ('en','ru')),
    name        TEXT        NOT NULL,
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (moon_id, lang)
);

CREATE INDEX moon_translations_lang_idx ON moon_translations(lang);

COMMENT ON TABLE moon_translations IS 'Per-language overrides for moon name and descriptive notes.';

-- A2. Attach updated_at triggers to new tables (follows 000005 pattern).
CREATE TRIGGER planet_translations_set_updated_at
    BEFORE UPDATE ON planet_translations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER moon_translations_set_updated_at
    BEFORE UPDATE ON moon_translations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
