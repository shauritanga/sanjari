# W07 Administrative Operations

## Objective

Give authorized staff a secure, auditable operational console without exposing unnecessary user data.

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
