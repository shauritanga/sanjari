# W09 Platform Operations

## Objective

Operate Sanjari predictably with measurable health, controlled deployments, and tested recovery.

## Scope

- Separate API and worker processes for BullMQ jobs, retries, dead-letter handling, and job dashboards.
- Prometheus metrics, structured logs, request/correlation IDs, Sentry-compatible errors, alert thresholds, and privacy-safe telemetry.
- Docker development and production images, Nginx/TLS, environment separation, secrets management, database backups, restore drills, migration approvals, and rollback plans.
- CI/CD with dependency, SAST, container, license, test, build, migration, and protected production-deploy checks.
- Incident response, abuse escalation, data breach response, provider outage behavior, and operational runbooks.

## Acceptance Criteria

- Readiness fails when required dependencies are unavailable.
- Failed jobs retry safely, surface in monitoring, and do not silently drop user-visible work.
- A staging deployment can be rolled back and a database backup can be restored using documented procedures.
- Production logs and metrics contain no tokens, passwords, OTPs, exact GPS, private messages, payment credentials, or identity documents.

## Verified Implementation

- API liveness and dependency readiness are separate: `/api/v1/health` is lightweight, while `/api/v1/health/readiness` checks PostgreSQL and Redis and returns `503` when either dependency is unavailable.
- API request logs emit a correlation ID and only method, path, status class, and duration. Request bodies, query strings, credentials, and private content are excluded.
- `/api/v1/metrics` exposes low-cardinality Prometheus request counters and duration totals; the production scrape configuration targets this path.
- Queue processors run in a dedicated `worker` container with `RUN_WORKERS=true`; the API does not consume worker processors. BullMQ queues retry three times with exponential backoff and retain failed jobs for inspection.
- `infrastructure/deployment/backup-postgres.sh` creates compressed, checksummed backups with configurable retention. A restore into an isolated temporary database has been verified on the VPS.
- Production deployment is GitHub-based: the VPS resets tracked code to `origin/main`, preserves the ignored production environment file, and rebuilds only Sanjari containers.

## Rollback

Rollback is an explicit owner-approved operation:

```bash
cd /var/www/sanjari
git fetch origin
git reset --hard <approved-commit>
docker compose --env-file infrastructure/deployment/.env \
  -f infrastructure/deployment/docker-compose.production.yml up -d --build
```

TLS termination, public domains, external alert routing, and encrypted off-host backup storage remain deployment-owner gates rather than claims of this VPS configuration.
