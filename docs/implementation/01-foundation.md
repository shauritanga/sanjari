# W01 Foundation And Architecture

## Objective

Provide a reproducible modular-monolith foundation that can later split high-traffic workloads without sharing backend secrets or persistence models with clients.

## Scope

- pnpm/Turborepo monorepo with `apps/mobile`, `apps/api`, `apps/admin`, and safe shared packages.
- Strict TypeScript, linting, formatting, CI, environment validation, API versioning, Swagger, and consistent response envelopes.
- PostgreSQL/PostGIS, Redis, BullMQ, S3-compatible storage, Mailpit, reverse proxy, metrics, and structured logging.
- Prisma migrations and seed data with protected database access.
- Request IDs, error codes, rate-limit primitives, health/readiness checks, and graceful shutdown.

## Acceptance Criteria

- A clean machine can install, start local dependencies, migrate, seed, lint, typecheck, test, and run all apps using documented commands.
- API modules have explicit boundaries and do not import mobile or admin implementation details.
- Secrets are absent from source control and `.env.example` contains names, not production values.
- Database migrations are reviewable, repeatable, and tested against a fresh database.
- Health checks distinguish process health from dependency readiness.

## Current State

Implemented baseline: monorepo, Docker Compose, Prisma schema/migration, shared packages, API health route, mobile/admin shells, and CI configuration. Remaining work is production observability, worker separation, readiness checks, and contract generation.
