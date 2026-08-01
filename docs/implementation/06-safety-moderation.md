# W06 Safety, Risk, And Moderation

## Objective

Make user safety visible and operationally enforceable across profiles, discovery, messaging, payments, and support.

## Delivery Status

In progress. The first user-facing safety slice and moderation review engine are implemented: authenticated block/unblock and block listing, report submission with bounded evidence references, moderation-case creation, high-risk report signals, appeal submission authorization, permission-gated review queues, case transitions, reasoned moderator actions, audit events, messaging block enforcement, bounded evidence retention purge, contextual mobile report/block controls, localized Safety Centre guidance, and audited data export/account deletion requests.

The workstream remains open until the W07-owned admin authentication/session console is connected to this engine, deletion execution automation, contextual report entry points across all clients, legal approval of safety content, and operational escalation runbooks are implemented and verified.

## Scope

- Safety centre with scam signals, privacy guidance, public-meeting guidance, verification explanations, community guidelines, emergency instructions, appeals, and data controls.
- Blocks, profile/message/photo/voice reports, scam and impersonation flows, suspicious-age escalation, emergency suspension, evidence snapshots, and retention policy.
- Configurable risk signals for velocity, external links, copy/paste, device/account reuse, location anomalies, blocks, reports, image reuse, payment requests, profile edits, and login anomalies.
- Human moderation queues with triage, assignment, investigation, action, dismissal, escalation, appeal, and close states.
- Action reasons, immutable audit logs, appeals, moderator notes, and high-impact human review.
- Optional date-plan sharing and check-in reminders without continuous tracking.

## Acceptance Criteria

- Permanent bans cannot be issued solely from an unreviewed automated score.
- Every moderator action has an actor, reason, target, timestamp, and audit event.
- Reports preserve the minimum evidence needed for review and follow deletion/retention rules.
- Users can block and report from profile, match, and conversation contexts.
- Sensitive safety content is localized and legally reviewed before launch.

## Verified Implementation Slice

- `POST /api/v1/blocks/:userId`, `DELETE /api/v1/blocks/:userId`, and `GET /api/v1/blocks` are authenticated and audited.
- `POST /api/v1/reports` creates a report, moderation case, bounded evidence references, and a risk signal for high-risk categories in one transaction.
- `POST /api/v1/moderation/cases/:caseId/appeals` only accepts appeals from the reported user and records an audit event.
- Conversation authorization checks blocks dynamically, so a new block immediately prevents message access in either direction.
- `GET /api/v1/safety/guidance` powers the mobile Safety Centre and explicitly limits what verification proves.
- The moderation service exposes a permission-gated queue and case action engine for `reports.resolve`; permanent bans require an investigated or escalated case and a human reason.
- The `moderation-retention` worker purges evidence only after the configurable `MODERATION_EVIDENCE_RETENTION_DAYS` window and only for closed or dismissed cases, with a system audit event.
- Mobile discovery cards expose block/report controls and conversation messages expose report-with-evidence controls.
- Safety guidance supports English and Swahili responses through the `locale` query, and data controls provide export requests plus seven-day account-deletion scheduling.
- API integration contracts cover these flows in `apps/api/test/moderation.integration.test.ts`.
