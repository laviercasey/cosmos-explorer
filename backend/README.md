# Cosmos Explorer — Go Backend

A small read-only REST API that exposes the Cosmos Explorer dataset
(planets, missions, trajectories) from PostgreSQL. Built to the ADRs
under `.orchestra/decisions/` (001–006).

> **Module path.** The module is declared as `cosmos/backend` — the
> orchestrator did not supply a GitHub owner. Rename via
> `go mod edit -module github.com/<owner>/cosmos-backend` when the
> owner is known.

## Stack

- Go 1.22, chi v5 router, pgx v5 pool, golang-migrate v4, zerolog, envconfig
- `sqlc` configured via `sqlc.yaml`; hand-written equivalents live in
  `internal/store/` so the project builds even when `sqlc` is not
  installed. Regenerating is a no-op if you re-run `make sqlc-generate`
  and commit the changes — the SQL in `queries/*.sql` is authoritative.
- PostgreSQL 16 — schema in `migrations/*.up.sql`, described in
  `.orchestra/decisions/005-schema.sql`.

## Layout

```
backend/
├── cmd/
│   ├── server/      # HTTP server entry point
│   └── seed/        # Idempotent seeder for src/entities/** data
├── internal/
│   ├── config/      # envconfig + validation
│   ├── logger/      # zerolog setup
│   ├── db/          # pgx pool + golang-migrate runner
│   ├── domain/      # transport-agnostic types
│   ├── store/       # pgx-backed data access (sqlc-equivalent)
│   ├── service/     # planet/mission/trajectory business logic
│   ├── http/        # chi router, middleware, handlers, envelopes
│   └── seed/        # JS→JSON parser + upserts
├── migrations/      # *.up.sql / *.down.sql (embedded via //go:embed)
├── queries/         # sqlc input (authoritative SQL)
├── sqlc.yaml        # sqlc v2 configuration
├── .env.example     # every config key with sane defaults
└── Makefile
```

## Three-command quickstart

```bash
# 1. configure (edit DATABASE_URL if your Postgres is elsewhere)
cp .env.example .env && export $(grep -v '^#' .env | xargs)

# 2. apply migrations + seed
make migrate-up && make seed

# 3. run the server
make run
```

The server listens on `HTTP_ADDR` (default `:8080`).

## Configuration

Every key mirrors a field on `internal/config/Config`:

| Env var                  | Default                                                        | Notes |
|--------------------------|----------------------------------------------------------------|-------|
| `APP_ENV`                | `development`                                                  | `development` or `production`. |
| `HTTP_ADDR`              | `:8080`                                                        | Listener bind. |
| `DATABASE_URL`           | — (required)                                                   | pgx connection string. |
| `DB_MAX_CONNS`           | `10`                                                           | pgx pool cap. |
| `DB_MIN_CONNS`           | `2`                                                            | pgx pool minimum. |
| `LOG_LEVEL`              | `info`                                                         | `debug`, `info`, `warn`, `error`. |
| `CORS_ALLOWED_ORIGINS`   | empty                                                          | Comma-separated. Required in production. |
| `MIGRATE_ON_BOOT`        | `true`                                                         | Run pending migrations on server startup. |
| `REQUEST_TIMEOUT`        | `10s`                                                          | Per-request chi timeout. |
| `READ_TIMEOUT`           | `15s`                                                          | `http.Server` read timeout. |
| `WRITE_TIMEOUT`          | `15s`                                                          | `http.Server` write timeout. |
| `SEED_SOURCE_DIR`        | `../src/entities`                                              | Seeder input. |

## Endpoints (ADR 003)

All responses use the `{ data, meta, error }` envelope with `snake_case`
field naming. Only one of `data` / `error` is non-null.

### Operational

```bash
curl http://localhost:8080/healthz
# {"data":{"status":"ok"},"meta":null,"error":null}

curl http://localhost:8080/readyz
# {"data":{"status":"ready","checks":{"db":"ok"}},"meta":null,"error":null}
```

### Planets

```bash
# List — paginated, sortable, optional ?type=terrestrial,gas_giant
curl 'http://localhost:8080/api/v1/planets?limit=20&offset=0'
curl 'http://localhost:8080/api/v1/planets?type=terrestrial&sort=semi_major_axis_au'

# Detail — moons + missions expanded
curl http://localhost:8080/api/v1/planets/mars
```

Allowed `sort`: `index`, `name`, `semi_major_axis_au`, `radius_km`
(prefix with `-` for descending).

### Missions

```bash
# List with filters
curl 'http://localhost:8080/api/v1/missions?decade=1960s,1970s&agency=NASA,Soviet&sort=-year&limit=10'

# Detail (includes planets[] and trajectory{} if available)
curl http://localhost:8080/api/v1/missions/apollo-11
```

Filters (all comma-separated lists for `IN` semantics): `agency`,
`decade` (e.g. `1960s`), `destination`, `type`, `status`. Allowed
`sort`: `year`, `name`, `agency`.

### Mission trajectory

```bash
curl http://localhost:8080/api/v1/missions/artemis-2/trajectory
```

404 distinguishes between the two "not found" flavours via
`error.message`: `mission not found` vs `trajectory not available`.

## Migrations

`migrations/*.sql` is embedded into the binary via `//go:embed`. The
server applies pending migrations on boot when `MIGRATE_ON_BOOT=true`
(the default in dev). For manual control:

```bash
make migrate-up           # apply all pending migrations
make migrate-down         # reverse the last migration
make migrate-status       # print current version
./bin/server --migrate-up-only
```

The CLI `migrate` binary is optional — `make migrate-up` shells out to
it, but the server also embeds the same migrations package and can run
them without an external tool.

## Seeding

The seeder reads the three React-side JS data files straight from
`src/entities/**/model/*.js`. No build step is required — a small
regex-based parser strips comments, `const X =` prefixes, trailing
commas, and single-quoted strings, then feeds the result to
`encoding/json`.

```bash
SEED_SOURCE_DIR=../src/entities make seed
# or
go run ./cmd/seed --src ../src/entities
```

All upserts run inside a single transaction; on failure the DB is left
unchanged. Re-running the seed is safe (`ON CONFLICT (slug) DO UPDATE`).

### Note on the JS parser

The parser is deliberately simple. If `src/entities/**/model/*.js`
gains template literals, spread operators, or computed keys, replace
the regex approach with a pre-build step that produces JSON sidecars
(e.g. `node -e 'console.log(JSON.stringify(require("./planets.js")))'`)
and point the seeder at those.

## Development

```bash
make tidy             # go mod tidy
make fmt              # gofmt -w .
make lint             # go vet + gofmt -l
make test             # unit tests (race detector)
make sqlc-generate    # regenerate internal/store from queries/*.sql
```

## Troubleshooting

- **`DATABASE_URL: missing required value`** — the config validator
  runs before anything else; export a valid DSN.
- **`CORS_ALLOWED_ORIGINS required in production`** — set
  `APP_ENV=development` for local use, or provide an origin list.
- **`migrate on boot failed` with "no change"** — the internal runner
  treats `ErrNoChange` as success; if you see a wrapped error please
  inspect the log context for the underlying cause.
- **Seeder reports `planet "X" mission "Y" not found`** — the planet
  embeds a mission that is not declared in `missions.js`. Fix the data,
  then re-seed.
