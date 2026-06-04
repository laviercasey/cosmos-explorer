
SELECT
    id, slug, name, agency, country, year, end_year, destination,
    type, status, description, key_fact, crew, achievements,
    created_at, updated_at
FROM missions
WHERE
    (cardinality(@agencies::text[])     = 0 OR agency      = ANY(@agencies::text[]))
    AND (cardinality(@destinations::text[]) = 0 OR destination = ANY(@destinations::text[]))
    AND (cardinality(@types::text[])        = 0 OR type        = ANY(@types::text[]))
    AND (cardinality(@statuses::text[])     = 0 OR status      = ANY(@statuses::text[]))
    AND (
        cardinality(@year_from::int[]) = 0
        OR EXISTS (
            SELECT 1 FROM unnest(@year_from::int[], @year_to::int[]) AS r(lo, hi)
            WHERE missions.year BETWEEN r.lo AND r.hi
        )
    )
ORDER BY
    CASE WHEN @sort_field::text = 'year'   AND NOT @sort_desc::bool THEN year   END ASC  NULLS LAST,
    CASE WHEN @sort_field::text = 'year'   AND     @sort_desc::bool THEN year   END DESC NULLS LAST,
    CASE WHEN @sort_field::text = 'name'   AND NOT @sort_desc::bool THEN name   END ASC  NULLS LAST,
    CASE WHEN @sort_field::text = 'name'   AND     @sort_desc::bool THEN name   END DESC NULLS LAST,
    CASE WHEN @sort_field::text = 'agency' AND NOT @sort_desc::bool THEN agency END ASC  NULLS LAST,
    CASE WHEN @sort_field::text = 'agency' AND     @sort_desc::bool THEN agency END DESC NULLS LAST,
    id ASC
LIMIT $1 OFFSET $2;

SELECT COUNT(*)::bigint AS total
FROM missions
WHERE
    (cardinality(@agencies::text[])     = 0 OR agency      = ANY(@agencies::text[]))
    AND (cardinality(@destinations::text[]) = 0 OR destination = ANY(@destinations::text[]))
    AND (cardinality(@types::text[])        = 0 OR type        = ANY(@types::text[]))
    AND (cardinality(@statuses::text[])     = 0 OR status      = ANY(@statuses::text[]))
    AND (
        cardinality(@year_from::int[]) = 0
        OR EXISTS (
            SELECT 1 FROM unnest(@year_from::int[], @year_to::int[]) AS r(lo, hi)
            WHERE missions.year BETWEEN r.lo AND r.hi
        )
    );

SELECT
    id, slug, name, agency, country, year, end_year, destination,
    type, status, description, key_fact, crew, achievements,
    created_at, updated_at
FROM missions
WHERE slug = $1;

SELECT p.slug, p.name
FROM planet_missions pm
JOIN planets p ON p.id = pm.planet_id
WHERE pm.mission_id = $1
ORDER BY pm.position;

SELECT pm.mission_id, p.slug
FROM planet_missions pm
JOIN planets p ON p.id = pm.planet_id
WHERE pm.mission_id = ANY($1::bigint[])
ORDER BY pm.mission_id, pm.position;

SELECT id FROM missions WHERE slug = $1;

INSERT INTO missions (
    slug, name, agency, country, year, end_year, destination,
    type, status, description, key_fact, crew, achievements
) VALUES (
    $1, $2, $3, $4, $5, $6, $7,
    $8, $9, $10, $11, $12, $13
)
ON CONFLICT (slug) DO UPDATE SET
    name         = EXCLUDED.name,
    agency       = EXCLUDED.agency,
    country      = EXCLUDED.country,
    year         = EXCLUDED.year,
    end_year     = EXCLUDED.end_year,
    destination  = EXCLUDED.destination,
    type         = EXCLUDED.type,
    status       = EXCLUDED.status,
    description  = EXCLUDED.description,
    key_fact     = EXCLUDED.key_fact,
    crew         = EXCLUDED.crew,
    achievements = EXCLUDED.achievements,
    updated_at   = NOW()
RETURNING id;
