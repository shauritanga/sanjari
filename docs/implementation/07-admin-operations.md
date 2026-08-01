# W07 Administrative Operations

## Objective

Give authorized staff a secure, auditable operational console without exposing unnecessary user data.

## Delivery Status

In progress. The implemented W07 slice includes database-backed admin sessions, HTTP-only cookies, CSRF protection, production MFA fail-closed behavior, permission-gated moderation operations, redacted user search, reversible user suspension, role assignment, verification review, audited dashboard metrics, audited feature-flag updates, audit-log access auditing, and permission-aware admin navigation.

Remaining W07 work includes owner-supplied MFA provider integration, configuration/notification/support queues, operational incident analytics, and full admin route coverage.

## Roles And Permissions

Support agent, moderator, senior moderator, verification officer, finance officer, administrator, and super administrator are permission bundles, not UI-only role labels. Enforce permissions such as `users.read`, `users.suspend`, `profiles.review`, `verification.review`, `reports.resolve`, `subscriptions.read`, `refunds.manage`, `configuration.manage`, and `audit.read` in the API.

## Scope

- Admin login with secure cookies, CSRF protection, MFA requirement, session revocation, and permission-aware navigation.
- User search/review, verification queue, reports, cases, appeals, subscriptions, payment events, notifications, feature flags, ranking configuration, content configuration, support, audits, health, versions, legal documents, deletion requests, and analytics.
- Operational dashboard for registrations, activity, profiles, verification, likes, matches, conversations, messages, reports, suspensions, conversion, retention, notification failures, jobs, and API errors.

## Acceptance Criteria

- A staff member cannot access a route or mutation outside their permissions.
- Every administrative mutation is logged with before/after context appropriate to data minimization.
- Sensitive fields are redacted by default and access is itself auditable.
- Destructive actions require confirmation, reason, and reversible workflow where possible.

## Verified Implementation Slice

- `POST /api/v1/admin/auth/login` and logout use database-backed sessions with secure cookies; session tokens are never returned to the browser body.
- `PATCH /api/v1/admin/operations/users/:userId/suspend` requires `users.suspend`, a reason, revokes active user sessions, and records before/after status metadata.
- `GET /api/v1/admin/operations/users` requires `users.read`, returns a redacted projection, and audits access.
- `GET /api/v1/admin/operations/audit` requires `audit.read` and audits the audit-log access itself.
- Moderation queue/action endpoints require `reports.resolve` and CSRF tokens on mutations.
- `GET /api/v1/admin/operations/roles` and `PATCH /api/v1/admin/operations/admins/:adminUserId/roles` require `configuration.manage` and audit role changes.
- `GET /api/v1/admin/operations/flags` and `PATCH /api/v1/admin/operations/flags/:flagId` require `configuration.manage`, CSRF for mutations, and audit before/after flag state.
- Verification queue/review endpoints require `verification.review`; the admin UI confirms and records approve/reject decisions.
- The operations dashboard requires `analytics.read` and returns aggregate counts only.
- User, audit, report, appeal, verification, feature-flag, role, and dashboard admin pages consume live APIs; destructive mutations require browser confirmation.
- Subscription and payment-event admin views consume permission-gated APIs; payment payloads are redacted and access is audited.

## Verification

- API: 17 test files, 41 tests passing; typecheck and lint passing.
- Admin: typecheck passing; changed-route lint passing; production build passing with `/flags` and `/roles` included.
