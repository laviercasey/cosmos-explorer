
BEGIN;

DROP TRIGGER IF EXISTS moon_translations_set_updated_at   ON moon_translations;
DROP TRIGGER IF EXISTS planet_translations_set_updated_at ON planet_translations;

DROP INDEX IF EXISTS moon_translations_lang_idx;
DROP INDEX IF EXISTS planet_translations_lang_idx;

DROP TABLE IF EXISTS moon_translations;
DROP TABLE IF EXISTS planet_translations;

COMMIT;
