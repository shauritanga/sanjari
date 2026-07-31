# W06 Safety, Risk, And Moderation

## Objective

Make user safety visible and operationally enforceable across profiles, discovery, messaging, payments, and support.

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
