# W10 Quality And Release

## Test Layers

- Unit: age rules, scoring, validation, entitlements, risk signals, state transitions, and localization keys.
- Integration: Prisma migrations, authorization, match concurrency, session rotation, OTP limits, signed URLs, webhook idempotency, and queue behavior.
- API contract: REST envelopes, error codes, OpenAPI, and WebSocket event payloads.
- Mobile: onboarding, auth, profile editing, discovery actions, chat recovery, offline queue, accessibility, and SecureStore behavior.
- Admin: login, RBAC, moderation actions, redaction, audit trails, and destructive-action confirmation.
- Non-functional: load, rate limits, backup restoration, dependency security, image/media handling, and privacy review.

## Required Regression Cases

- Underage and suspicious-age registration.
- Refresh-token reuse and logout-all-devices.
- Duplicate likes and simultaneous mutual likes.
- Blocked/unmatched messaging.
- Permission violations and unauthorized verification access.
- Duplicate payment webhooks and entitlement expiry.
- Expired signed URLs and failed media scans.
- WebSocket reconnect and offline message retry.

## Release Gates

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and production builds pass.
- Database migration and restore tests pass in staging.
- Accessibility review passes critical paths.
- Security and privacy review has no unresolved launch blocker.
- Legal content and provider agreements are approved.
- Monitoring, alerts, runbooks, rollback, and support escalation are ready.
