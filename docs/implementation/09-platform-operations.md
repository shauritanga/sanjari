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
