#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/var/www/sanjari}"
BRANCH="${DEPLOY_BRANCH:-main}"
COMPOSE_FILE="$APP_DIR/infrastructure/deployment/docker-compose.production.yml"
ENV_FILE="$APP_DIR/infrastructure/deployment/.env"

cd "$APP_DIR"

# GitHub is the only deployment source. Keep production secrets outside Git.
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"
git clean -fd

test -f "$ENV_FILE" || {
  echo "Missing production environment: $ENV_FILE" >&2
  exit 1
}

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build api worker admin
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
