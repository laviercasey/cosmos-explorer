
BEGIN;

CREATE TABLE mission_translations (
    mission_id   BIGINT      NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    lang         TEXT        NOT NULL CHECK (lang IN ('en','ru')),
    description  TEXT,
    key_fact     TEXT,
    achievements TEXT[]      NOT NULL DEFAULT '{}',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (mission_id, lang)
);

CREATE INDEX mission_translations_lang_idx ON mission_translations(lang);

COMMENT ON TABLE  mission_translations IS 'Per-language overrides for mission display fields. Canonical copy (RU) remains in missions; service layer applies overrides when a non-canonical lang is requested.';
COMMENT ON COLUMN mission_translations.description  IS 'Localized description override (nullable — absent ⇒ fall back to canonical).';
COMMENT ON COLUMN mission_translations.key_fact     IS 'Localized key fact override (nullable — absent ⇒ fall back to canonical).';
COMMENT ON COLUMN mission_translations.achievements IS 'Localized achievements array. Empty array means no override.';

-- Attach updated_at trigger using the shared set_updated_at() function from 000005.
CREATE TRIGGER mission_translations_set_updated_at
    BEFORE UPDATE ON mission_translations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RU backfill: copy current canonical mission text into translations as lang='ru'.
-- ON CONFLICT DO NOTHING makes this safe to re-run on environments where the
-- row already exists for any reason.
INSERT INTO mission_translations (mission_id, lang, description, key_fact, achievements)
SELECT id, 'ru', description, key_fact, COALESCE(achievements, '{}')
FROM missions
ON CONFLICT (mission_id, lang) DO NOTHING;

COMMIT;
