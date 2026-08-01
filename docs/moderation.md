# Moderation Guide

Moderation cases require human review for high-impact actions. Every action needs a reason and is written to immutable audit logs.

Report categories include harassment, hate or discrimination, threats, scam or fraud, impersonation, fake profile, inappropriate content, spam, suspected underage user, offline safety concern, and other.

High-risk reports are prioritized but automated scoring does not permanently ban users without review.

The operational response for immediate danger, suspected underage users, scams, and abuse spikes is documented in [`docs/safety-escalation-runbook.md`](safety-escalation-runbook.md). Human-reviewed `suspend` and `ban` actions update the account status transactionally and create an audit event.
