
BEGIN;

DROP TRIGGER IF EXISTS mission_translations_set_updated_at ON mission_translations;

DROP INDEX IF EXISTS mission_translations_lang_idx;

DROP TABLE IF EXISTS mission_translations;

COMMIT;
