# syntax=docker/dockerfile:1.7

FROM golang:1.25-alpine AS build

ENV CGO_ENABLED=0 \
    GOOS=linux \
    GOFLAGS=-trimpath

WORKDIR /src

COPY go.mod go.su[m] ./
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go mod download

COPY . .

RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go build -ldflags="-s -w" -o /out/server ./cmd/server && \
    go build -ldflags="-s -w" -o /out/seed   ./cmd/seed

FROM gcr.io/distroless/static-debian12:nonroot AS runtime

WORKDIR /app

COPY --from=build /out/server /app/server
COPY --from=build /out/seed   /app/seed
COPY --from=build /src/seed/data /data/entities

USER nonroot:nonroot

EXPOSE 8080

ENTRYPOINT ["/app/server"]
