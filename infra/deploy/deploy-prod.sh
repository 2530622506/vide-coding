#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-.env.prod}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
SEED_ON_DEPLOY="${SEED_ON_DEPLOY:-false}"
IMAGE_REGISTRY="${IMAGE_REGISTRY:-ghcr.io}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required but was not found." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose plugin is required but was not found." >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  if [[ -f .env.prod.example ]]; then
    cp .env.prod.example "$ENV_FILE"
  fi
  echo "Missing $ENV_FILE. Edit it with production passwords, then rerun this script." >&2
  exit 1
fi

if [[ -n "${GHCR_USERNAME:-}" && -n "${GHCR_TOKEN:-}" ]]; then
  echo "$GHCR_TOKEN" | docker login "$IMAGE_REGISTRY" -u "$GHCR_USERNAME" --password-stdin
fi

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d

if [[ "$SEED_ON_DEPLOY" == "true" ]]; then
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" --profile seed run --rm seed
fi

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
