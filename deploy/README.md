# Production deploy — cosmos.lavier.tech

Cosmos Explorer ships via **GitHub Actions → GHCR → SSH**. Every push to `main`
builds `backend` and `frontend` images, pushes them to GitHub Container Registry,
and deploys them to the VPS over SSH with a health-gate and automatic rollback.
The VPS never builds images; it only pulls tagged images and runs `docker compose`.

## Topology

- Deploy path on the VPS: `/opt/apps/cosmos`
- Shared reverse proxy: host Caddy container named `caddy`, on the external
  Docker network `caddy-net`
- Images: `ghcr.io/<owner>/<repo>/backend` and `ghcr.io/<owner>/<repo>/frontend`,
  tagged `latest` and the 7-char commit SHA
- Public domain `cosmos.lavier.tech` already resolves to the VPS

## 1. GitHub repository setup

### Secrets (Settings → Secrets and variables → Actions → Secrets)

| Secret | Purpose |
|--------|---------|
| `DEPLOY_HOST` | VPS hostname or IP |
| `DEPLOY_USER` | SSH user for deploys (`deploy`) |
| `DEPLOY_SSH_KEY` | Private SSH key whose public half is in `deploy`'s `authorized_keys` |

`GITHUB_TOKEN` is provided automatically and is used to push images to GHCR
(the workflow requests `packages: write`).

### Variables (Settings → Secrets and variables → Actions → Variables)

| Variable | Example | Notes |
|----------|---------|-------|
| `PRODUCTION_URL` | `https://cosmos.lavier.tech` | Used for the GitHub deployment environment URL |
| `NEXT_PUBLIC_SITE_URL` | `https://cosmos.lavier.tech` | Baked into the client bundle at build |
| `NEXT_PUBLIC_API_BASE_URL` | `https://cosmos.lavier.tech` | Browser-side API base |
| `NEXT_PUBLIC_API_ORIGIN` | `https://cosmos.lavier.tech` | Origin for `<link rel="preconnect">` |
| `NEXT_PUBLIC_GOOGLE_VERIFICATION` | (token) | Google Search Console meta token; leave empty to omit |
| `NEXT_PUBLIC_YANDEX_VERIFICATION` | (token) | Yandex Webmaster meta token; leave empty to omit |
| `NEXT_PUBLIC_YANDEX_METRIKA_ID` | (8-digit) | Yandex Metrika counter; leave empty to disable |
| `NEXT_PUBLIC_GA4_ID` | `G-XXXXXXXXXX` | GA4 measurement ID; leave empty to disable |
| `NEXT_PUBLIC_UMAMI_SRC` | `https://metrics.lavier.tech/script.js` | Umami tracker script URL |
| `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | (uuid) | Umami website ID for cosmos.lavier.tech |
| `NEXT_PUBLIC_UMAMI_ALLOWED_HOSTS` | `metrics.lavier.tech` | Hosts the Umami script is allowed to talk to |

All `NEXT_PUBLIC_*` values are compile-time constants inlined into the client
bundle, so they are passed as Docker build-args during `build-push`. Changing one
requires a new build (a fresh push to `main`), not just a container restart.

## 2. First-deploy bootstrap on the VPS

Run these once, as the `deploy` user (or root), before the first GitHub deploy.

### 2.1 Join the shared Caddy network

```bash
docker network create caddy-net 2>/dev/null || true
```

If Caddy and other apps already use `caddy-net`, this is a no-op.

### 2.2 Prepare the app directory and env

```bash
mkdir -p /opt/apps/cosmos
cd /opt/apps/cosmos
```

Copy `.env.prod.example` from the repo to `/opt/apps/cosmos/.env` and fill it in:

```bash
cp .env.prod.example .env
```

Replace every `CHANGE_ME_TO_LONG_RANDOM_STRING` with a fresh secret:

```bash
openssl rand -hex 32   # POSTGRES_PASSWORD (and matching DATABASE_URL), REVALIDATE_SECRET
```

Leave `IMAGE_PREFIX=` empty — the deploy workflow writes
`IMAGE_PREFIX=ghcr.io/<owner>/<repo>` into `.env` on every run. `IMAGE_TAG` is
likewise rewritten to the deployed commit SHA. `COMPOSE_FILE` is preset to
`docker-compose.yml:docker-compose.prod.yml` so plain `docker compose` commands
load both files (base defines the services, the prod override swaps in GHCR
images, drops published ports, adds `caddy-net`, and turns on log rotation).

The `NEXT_PUBLIC_*` runtime values in `.env` should mirror the GitHub Actions
variables; they are read by the running frontend container in addition to being
baked at build time.

### 2.3 Add the cosmos block to the host Caddyfile

The host Caddy config lives at `/opt/apps/caddy/Caddyfile` (bind-mounted
read-only into the `caddy` container). Append the contents of
`deploy/Caddyfile.example` (the `cosmos.lavier.tech` block; the
`next.cosmos.lavier.tech` canary block is optional). It proxies:

- `/ws/*` → `cosmos-api:8080` (WebSocket, with upgrade headers)
- `/cosmos.v1.*` and `/cosmos.v1.CosmosService/*` → `cosmos-api:8080` (Connect-RPC)
- everything else → `cosmos-frontend:3000`

Apply the new config. On this host `caddy reload` silently no-ops, so restart
the container instead:

```bash
docker restart caddy
```

Caddy obtains the Let's Encrypt certificate automatically on the first request.

### 2.4 Trigger the first deploy

Push to `main` (or re-run the latest `Deploy` workflow). The workflow brings up
the database, runs migrations, seeds on the first deploy only, starts `api` and
`frontend`, health-gates them, and warms the ISR cache.

## 3. What auto-deploy does

On every push to `main`, `.github/workflows/deploy.yml`:

1. Runs the full CI suite (`ci.yml`). CI does **not** run `next build` — it only
   typechecks, lints, and tests. The prerender build (which needs a live API)
   happens in this deploy workflow, not in `ci.yml`.
2. Builds and pushes `backend` and `frontend` images to GHCR, tagged `latest`
   and the short SHA. The backend image is built first with `load: true` so a
   local `cosmos-backend:ci` image is available, then a throwaway Postgres +
   backend stack is started on the runner, seeded from the image-baked data, and
   health-gated on `/healthz`. The frontend image is then built with
   `network: host` and the build-arg `API_INTERNAL_URL=http://localhost:8080` so
   its Server Component pages (`/[locale]`, `planets`, `missions`) prerender
   against that live API. The throwaway stack is always torn down afterwards.
3. Takes a pre-deploy `pg_dump` on the VPS into `/opt/backups/cosmos`
   (skipped on the very first deploy when `cosmos-db` is not yet running).
4. Copies `docker-compose.yml` and `docker-compose.prod.yml` to
   `/opt/apps/cosmos/`, writes `IMAGE_PREFIX`, `IMAGE_TAG`, and `COMPOSE_FILE`
   into `.env`, pulls the new images, brings up `db`, runs the `migrate`
   one-shot, seeds **only when the `planets` table is empty or missing**, then
   brings up the full stack.
5. Health-gates for 120s: `api` must answer `GET /healthz` on `:8080` and the
   frontend must answer `GET /` on `:3000`, both probed from inside the
   containers.
6. On success: warms the ISR cache by POSTing each cache tag to
   `/api/revalidate` with the `x-revalidate-secret` header, GETs the main
   locale routes, records the SHA in `.last-good-sha`, and prunes dangling
   images.
7. On failure: dumps recent container logs and rolls back to the SHA in
   `.last-good-sha` (re-pulls the previous images and restarts). The first
   deploy has no previous SHA, so a first-deploy failure stops with a clear
   "manual intervention" message instead.

### Seed guard

The seeder runs only when the database has no planets yet:

```bash
docker compose exec -T db psql -U cosmos -d cosmos -tAc "select count(*) from planets" 2>/dev/null || echo 0
```

A count of `0` (or a missing table on a brand-new database) triggers
`docker compose --profile tools run --rm seed`. Any positive count skips
seeding, so redeploys never re-seed. Migrations always run.

The seed data is **baked into the backend image**. The backend `Dockerfile`
copies `backend/seed/data` (the five flat files `planets.ts`, `missions.ts`,
`trajectories.ts`, `planetsTranslations.ts`, `mission_translations_en.json`)
into the runtime image at `/data/entities`. In production the `seed` service
override (`docker-compose.prod.yml`) drops the local bind mount (`volumes: []`)
and sets `SEED_SOURCE_DIR=/data/entities`, so seeding needs **zero host files**
on the VPS. For local development the base `docker-compose.yml` keeps the
`./backend/seed/data:/data/entities:ro` bind mount, so the host sources are used
unchanged.

## 4. Manual rollback

Use the `Rollback` workflow (Actions → Rollback → Run workflow). Provide a
7-char image SHA, or leave it empty to fall back to `.last-good-sha` on the VPS.
It rewrites `IMAGE_TAG`, re-pulls the matching images, restarts the stack, and
verifies health.

## 5. Backups

The deploy workflow writes a gzipped `pg_dump` to `/opt/backups/cosmos/` before
every deploy and prunes dumps older than 30 days. For an independent daily
schedule, add a cron entry on the VPS:

```bash
0 3 * * * cd /opt/apps/cosmos && docker compose exec -T db pg_dump -U cosmos -d cosmos | gzip > /opt/backups/cosmos/cron-$(date +\%F).sql.gz
```

Sync `/opt/backups/cosmos/` to off-site storage at your discretion.

## 6. Smoke checklist

After a deploy completes:

```bash
curl -s https://cosmos.lavier.tech/healthz
curl -s -A "YandexBot/3.0" https://cosmos.lavier.tech/en | head -c 500
curl -s https://cosmos.lavier.tech/sitemap.xml | head -c 500
curl -s -X POST https://cosmos.lavier.tech/cosmos.v1.CosmosService/ListPlanets \
  -H "Content-Type: application/json" -d '{"limit":3,"lang":"en"}'
```

WebSocket (websocat or a browser DevTools Network → WS tab):

```bash
websocat wss://cosmos.lavier.tech/ws/iss
```

Then verify:

- `https://cosmos.lavier.tech/en` and `/ru` render the 3D scene
- Umami events appear at `https://metrics.lavier.tech` for the cosmos website
- Lighthouse on `/en`: SEO >= 95, Performance >= 80 mobile
- securityheaders.com scan: A or A+

## 7. Search Console + Yandex Webmaster

1. **Google Search Console** (https://search.google.com/search-console):
   add the `cosmos.lavier.tech` property, verify via the HTML meta tag
   (set `NEXT_PUBLIC_GOOGLE_VERIFICATION` and redeploy), then submit
   `https://cosmos.lavier.tech/sitemap.xml`.
2. **Yandex Webmaster** (https://webmaster.yandex.ru):
   add the site, verify via the meta tag (`NEXT_PUBLIC_YANDEX_VERIFICATION`),
   submit `https://cosmos.lavier.tech/sitemap.xml`, and set the regional
   preference to Russia.

Both verification tokens are injected as `<meta>` tags by the app from the
`NEXT_PUBLIC_*_VERIFICATION` build variables, so a value change requires a new
deploy.

## 8. Cache invalidation

ISR cache tags, stamped per locale: `planets`, `planets-en`, `planets-ru`,
`missions`, `missions-en`, `missions-ru`, `trajectories`, `trajectories-en`,
`trajectories-ru`. Trigger revalidation from anywhere with the secret:

```bash
curl -X POST https://cosmos.lavier.tech/api/revalidate \
  -H "Content-Type: application/json" \
  -H "x-revalidate-secret: $REVALIDATE_SECRET" \
  -d '{"tag":"planets-en"}'
```

## 9. Canary (optional)

Deploy a parallel stack on `next.cosmos.lavier.tech` before swapping the apex by
running the same compose files under a separate project name and an `.env` that
overrides `NEXT_PUBLIC_SITE_URL`:

```bash
docker compose -p cosmos-canary up -d
```

After clean canary traffic, repoint the host Caddy `cosmos.lavier.tech` block at
the canary containers and retire the old stack.
