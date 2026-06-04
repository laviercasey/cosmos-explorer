
CREATE INDEX planets_type_idx                 ON planets (type);
CREATE INDEX planets_facts_gin                ON planets USING GIN (facts);
CREATE INDEX planets_surface_features_gin     ON planets USING GIN (surface_features);

CREATE INDEX moons_planet_id_position_idx     ON moons (planet_id, position);

CREATE INDEX atmosphere_components_planet_position_idx
    ON atmosphere_components (planet_id, position);

CREATE INDEX missions_agency_idx              ON missions (agency);
CREATE INDEX missions_year_idx                ON missions (year);
CREATE INDEX missions_type_idx                ON missions (type);
CREATE INDEX missions_destination_idx         ON missions (destination);
CREATE INDEX missions_status_idx              ON missions (status);
CREATE INDEX missions_year_desc_id_idx        ON missions (year DESC, id);
CREATE INDEX missions_achievements_gin        ON missions USING GIN (achievements);
CREATE INDEX missions_crew_gin                ON missions USING GIN (crew);

CREATE INDEX planet_missions_mission_planet_idx
    ON planet_missions (mission_id, planet_id);
