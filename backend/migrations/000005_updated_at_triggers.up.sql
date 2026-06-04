
CREATE TRIGGER planets_set_updated_at
    BEFORE UPDATE ON planets
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER missions_set_updated_at
    BEFORE UPDATE ON missions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER moons_set_updated_at
    BEFORE UPDATE ON moons
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trajectories_set_updated_at
    BEFORE UPDATE ON trajectories
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
