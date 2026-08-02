#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/infrastructure/deployment/docker-compose.production.yml"
ENV_FILE="${ROOT_DIR}/infrastructure/deployment/.env"
BACKUP_DIR="${BACKUP_DIR:-${ROOT_DIR}/backups/postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_file="${BACKUP_DIR}/sanjari-${timestamp}.sql.gz"

echo "Creating ${backup_file}"
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=plain --no-owner --no-privileges' \
  | gzip -9 > "${backup_file}"

test -s "${backup_file}"
sha256sum "${backup_file}" > "${backup_file}.sha256"
find "${BACKUP_DIR}" -type f -name 'sanjari-*.sql.gz*' -mtime "+${RETENTION_DAYS}" -delete

echo "Backup complete: ${backup_file}"
