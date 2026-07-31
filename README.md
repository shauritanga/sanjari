# Sanjari

Sanjari is a production-oriented dating platform scaffold for adults aged 18 and above. It uses a pnpm/Turborepo monorepo with Expo mobile, NestJS API, Next.js admin, PostgreSQL/PostGIS, Redis, and S3-compatible storage.

## Current Phase

Phase 1 foundation is implemented as a runnable scaffold with:

- Workspace configuration and pinned stable versions.
- Architecture and implementation docs.
- Docker Compose for PostgreSQL, Redis, MinIO, and Mailpit.
- Initial Prisma schema covering the required domain entities.
- NestJS module structure with branded configuration, validation, health, auth, profile, discovery, match, chat, moderation, and subscription boundaries.
- Expo Router route structure and branded reusable UI primitives.
- Next.js admin route structure for moderation and platform operations.

## Setup

```bash
cp .env.example .env
pnpm install
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

## Applications

- API: `apps/api`, local port `4000`, versioned routes under `/api/v1`.
- Mobile: `apps/mobile`, Expo SDK 57.
- Admin: `apps/admin`, local port `3001`.

## Important Launch Notes

Do not launch this platform without legal review, payment-provider credentials, app-store account setup, production secrets, backup testing, and a dedicated security review.
