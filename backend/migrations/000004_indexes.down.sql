
DROP INDEX IF EXISTS planet_missions_mission_planet_idx;

DROP INDEX IF EXISTS missions_crew_gin;
DROP INDEX IF EXISTS missions_achievements_gin;
DROP INDEX IF EXISTS missions_year_desc_id_idx;
DROP INDEX IF EXISTS missions_status_idx;
DROP INDEX IF EXISTS missions_destination_idx;
DROP INDEX IF EXISTS missions_type_idx;
DROP INDEX IF EXISTS missions_year_idx;
DROP INDEX IF EXISTS missions_agency_idx;

DROP INDEX IF EXISTS atmosphere_components_planet_position_idx;
DROP INDEX IF EXISTS moons_planet_id_position_idx;

DROP INDEX IF EXISTS planets_surface_features_gin;
DROP INDEX IF EXISTS planets_facts_gin;
DROP INDEX IF EXISTS planets_type_idx;
