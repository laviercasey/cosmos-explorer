
GO              ?= go
SQLC            ?= sqlc
MIGRATE         ?= migrate
DATABASE_URL    ?= $(shell printenv DATABASE_URL)
MIGRATIONS_DIR  := migrations
BIN_DIR         := bin

.PHONY: help run build test lint migrate-up migrate-down migrate-status \
        sqlc-generate seed tidy fmt vet

help:
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

run:
	$(GO) run ./cmd/server

build:
	@mkdir -p $(BIN_DIR)
	$(GO) build -o $(BIN_DIR)/server ./cmd/server
	$(GO) build -o $(BIN_DIR)/seed   ./cmd/seed

test:
	$(GO) test -race ./...

lint:
	$(GO) vet ./...
	@test -z "$$(gofmt -l .)" || (echo "gofmt issues:"; gofmt -l .; exit 1)

fmt:
	gofmt -w .

vet:
	$(GO) vet ./...

tidy:
	$(GO) mod tidy

sqlc-generate:
	$(SQLC) generate

migrate-up:
	@[ -n "$(DATABASE_URL)" ] || (echo "DATABASE_URL is required" && exit 1)
	$(MIGRATE) -path=$(MIGRATIONS_DIR) -database="$(DATABASE_URL)" up

migrate-down:
	@[ -n "$(DATABASE_URL)" ] || (echo "DATABASE_URL is required" && exit 1)
	$(MIGRATE) -path=$(MIGRATIONS_DIR) -database="$(DATABASE_URL)" down 1

migrate-status:
	@[ -n "$(DATABASE_URL)" ] || (echo "DATABASE_URL is required" && exit 1)
	$(MIGRATE) -path=$(MIGRATIONS_DIR) -database="$(DATABASE_URL)" version

seed:
	$(GO) run ./cmd/seed
