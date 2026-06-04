# Testing — Cosmos Explorer Backend

## Overview

Tests are split into two tiers:

| Tier           | Scope                                                            | Docker? | How to run                               |
|----------------|------------------------------------------------------------------|---------|------------------------------------------|
| **Unit**       | Pure functions, response envelopes, middleware, parser           | No      | `go test ./...`                          |
| **Integration**| Real Postgres, full HTTP router, migrations, seed end-to-end     | Yes     | `go test -tags=integration ./...`        |

Integration tests are gated behind the `//go:build integration` build tag
so the default unit run stays Docker-free and finishes in < 5 seconds.

## Running unit tests

From `backend/`:

```bash
go test ./...                    # all unit tests
go test -race ./...              # with race detector
go test -cover ./...             # with coverage
go test -coverprofile=cover.out ./... && go tool cover -html=cover.out
```

Expected per-package coverage (unit-only targets):

| Package                       | Target |
|-------------------------------|--------|
| `internal/config`             | ≥ 80%  |
| `internal/http`               | ≥ 80%  |
| `internal/http/middleware`    | ≥ 80%  |
| `internal/service`            | ≥ 80%  |
| `internal/seed`               | ≥ 80%  |
| `internal/domain`             | ≥ 80%  |
| `internal/store`              | Excluded — hand-written to mirror sqlc output, exercised by integration tests only |

## Running integration tests

Integration tests take their database in one of two ways:

1. **External Postgres via `TEST_DATABASE_URL`** — the default path, no
   extra Go dependencies. Run `docker compose up -d db` (or point at any
   Postgres you own) and export the URL.
2. **Automatic container via testcontainers-go** — opt in with an extra
   build tag `testcontainers`. Requires Docker. The testcontainers-go
   dependency is only compiled under this tag, so the default integration
   run has no extra module requirements.

From `backend/`:

```bash
# (1) External Postgres (docker-compose / local install / CI service)
TEST_DATABASE_URL=postgres://cosmos:cosmos@localhost:5432/cosmos_test?sslmode=disable \
  go test -tags=integration ./...

# (2) Automatic testcontainers (requires docker + testcontainers-go in go.mod)
go mod tidy       # adds testcontainers-go the first time
go test -tags='integration testcontainers' ./...
```

When `TEST_DATABASE_URL` is absent AND the `testcontainers` tag is off,
every integration test calls `t.Skip(...)` so a unit-only CI job stays
green.

### What runs under `-tags=integration`

* `internal/integration/integration_test.go` — harness smoke test (pool, migrations).
* `internal/integration/migrations_test.go` — up → down → up round-trip.
* `internal/integration/api_test.go` — full HTTP server on a random port, seeded
  with a deterministic fixture (see `internal/testutil/fixtures.go`). Covers:
  * `GET /healthz`, `GET /readyz`
  * `GET /api/v1/planets` — list + pagination envelope
  * `GET /api/v1/planets/{slug}` — 200 + 404
  * `GET /api/v1/missions` — filters: agency, decade, type
  * `GET /api/v1/missions/{slug}` — 200 + 404 + nested trajectory
  * `GET /api/v1/missions/{slug}/trajectory` — 200, mission-missing 404,
    trajectory-missing 404 (ADR 003 distinguishes message)
  * `OPTIONS /api/v1/planets` — CORS preflight with allowed origin

### Dependencies

Integration tests depend on:

* `github.com/testcontainers/testcontainers-go`
* `github.com/testcontainers/testcontainers-go/modules/postgres`

These are imported **only** from files tagged `integration`, so a normal
`go mod tidy` in an environment without Docker will still pull them; they
are linked lazily when the tag is set.

## Environment variables

| Var                 | Required for | Purpose |
|---------------------|--------------|---------|
| `TEST_DATABASE_URL` | Integration (optional) | Use an externally-managed Postgres instead of spinning up a container. |

No test reads prod environment variables. Unit tests always set the env
vars they need via `t.Setenv()` so parallelism is safe.

## Conventions

* **Table-driven** — every multi-case test uses `[]struct{name string; ...}` + `t.Run(tc.name, ...)`.
* **Subtests** are the unit of retry; prefer `t.Run` over multiple top-level funcs.
* **No `time.Sleep`** — use `context` deadlines, channels, or `require.Eventually`.
* **No hand-written sleeps for sync** — if a test is flaky under load, the
  setup is wrong; do not paper over it with a sleep.
* **Per-test timeout ≤ 10 s** — integration tests bound every pgx call via
  `context.WithTimeout`.
* **Fixtures are deterministic** — slug + count assertions match
  `testutil.SeedMinimalDataset`.
* **Race detector** — `go test -race` passes on every unit test.

## CI wiring (future)

```bash
# Unit gate
go test -race -coverprofile=cover.out ./...
go tool cover -func=cover.out | awk '/total/ { print $3 }'

# Integration gate (requires docker)
go test -tags=integration -race ./...
```

## Known caveats

* **Build-health** — the original backend sandbox could not run
  `go build`, `go vet`, `gofmt -l`, or `sqlc generate`. Run these before
  committing changes to production code:

  ```bash
  go mod tidy
  go build ./...
  go vet ./...
  gofmt -l .
  ```

* **sqlc** — `internal/store/*.go` is hand-written to mirror what sqlc
  would emit from `queries/*.sql`. Rerun `make sqlc-generate` locally
  and reconcile any diff; either accept the generated files or keep the
  current manual mirror.

* **Seed data drift** — `planets.js` references `Pioneer 10 & 11` which
  has no matching entry in `missions.js`. The seeder logs a warning to
  stderr and continues. Tests account for this; they do not treat it
  as a failure.
