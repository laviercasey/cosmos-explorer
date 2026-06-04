-include .env
export

COMPOSE_DEV  := docker compose -f docker-compose.yml
COMPOSE_PROD := docker compose -f docker-compose.yml -f docker-compose.prod.yml

.DEFAULT_GOAL := help

.PHONY: help
help:
	@echo "Cosmos Explorer - Compose targets"
	@echo ""
	@echo "  Dev (db + api on host, Next.js on host via 'npm run dev'):"
	@echo "    make up            Start db + api in the background"
	@echo "    make down          Stop the stack (volume survives)"
	@echo "    make logs          Tail api logs"
	@echo "    make ps            Compose service status"
	@echo "    make psql          psql shell into the dev database"
	@echo "    make migrate-up    Run DB migrations (one-shot, profile=tools)"
	@echo "    make seed          Seed entities (one-shot, profile=tools)"
	@echo "    make build-api     Rebuild the api image from scratch"
	@echo "    make build-frontend  Build cosmos-frontend:local from this repo"
	@echo "    make config        Render merged dev compose config"
	@echo ""
	@echo "  Prod-style (GHCR images + Next.js standalone container):"
	@echo "    make prod-pull     Pull backend + frontend images for IMAGE_TAG"
	@echo "    make prod-up       Start the prod stack (db+api+frontend)"
	@echo "    make prod-down     Stop the prod stack"
	@echo "    make prod-logs     Tail api + frontend logs"
	@echo "    make prod-config   Render merged dev+prod compose config"
	@echo ""
	@echo "  Frontend-only (prod-parity smoke test on the host):"
	@echo "    make frontend-up   docker compose up -d frontend  (depends on api)"
	@echo "    make frontend-down docker compose stop frontend"

.PHONY: up
up:
	$(COMPOSE_DEV) up -d db api

.PHONY: down
down:
	$(COMPOSE_DEV) down

.PHONY: build-api
build-api:
	$(COMPOSE_DEV) build --no-cache api

.PHONY: build-frontend
build-frontend:
	$(COMPOSE_DEV) build frontend

.PHONY: logs
logs:
	$(COMPOSE_DEV) logs -f api

.PHONY: ps
ps:
	$(COMPOSE_DEV) ps

.PHONY: migrate-up
migrate-up:
	$(COMPOSE_DEV) --profile tools run --rm migrate

.PHONY: seed
seed:
	$(COMPOSE_DEV) --profile tools run --rm seed

.PHONY: psql
psql:
	$(COMPOSE_DEV) exec db sh -c 'psql -U "$$POSTGRES_USER" "$$POSTGRES_DB"'

.PHONY: config
config:
	$(COMPOSE_DEV) config

.PHONY: frontend-up
frontend-up:
	$(COMPOSE_DEV) up -d --build frontend

.PHONY: frontend-down
frontend-down:
	$(COMPOSE_DEV) stop frontend

.PHONY: prod-pull
prod-pull:
	$(COMPOSE_PROD) pull api frontend

.PHONY: prod-up
prod-up:
	$(COMPOSE_PROD) up -d

.PHONY: prod-down
prod-down:
	$(COMPOSE_PROD) down

.PHONY: prod-logs
prod-logs:
	$(COMPOSE_PROD) logs -f api frontend

.PHONY: prod-config
prod-config:
	$(COMPOSE_PROD) config
