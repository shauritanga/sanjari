# Sanjari Implementation Plan

Status: Phase 1 foundation implemented; Phase 2 authentication is in progress.

This document is the governing roadmap for the production Sanjari platform. The detailed workstreams in [`docs/implementation/`](implementation/) convert the master prompt and brand guide into buildable increments with acceptance criteria.

## Product Direction

Sanjari is an adult-only dating platform for meaningful connections based on interests, values, and relationship intentions. The product must be safe, privacy-preserving, accessible, localized in English and Swahili, and honest about what verification and recommendations do and do not prove.

Brand anchors:

- Name: Sanjari
- Tagline: Meet someone who matches your path.
- Swahili tagline: Kutana na anayelingana nawe.
- Primary colour: `#E85D75`
- Deep plum: `#4A2545`
- Accent gold: `#F4B860`
- Background: `#FFF9F7`
- Typeface: Manrope

## Delivery Rules

- Ship vertical slices that include API, database, mobile/admin surfaces, tests, documentation, and observability where applicable.
- Treat age assurance, privacy, moderation, and auditability as product requirements, not post-launch enhancements.
- Enforce authorization on the server. A hidden control in a client is not a security boundary.
- Use explainable rules for initial recommendations and record ranking inputs and outcomes.
- Do not claim end-to-end encryption, biometric certainty, or AI capability unless the implementation and evidence support the claim.
- Every production feature needs an owner, acceptance criteria, failure states, and a rollback or disable path.
- Do not advance to the next workstream until the current workstream's acceptance criteria, hardening checklist, migrations, integration tests, operational dependencies, and documentation are complete and verified.

## Workstreams

| ID  | Workstream                          | Primary outputs                                                | Status      |
| --- | ----------------------------------- | -------------------------------------------------------------- | ----------- |
| W01 | Foundation and architecture         | Monorepo, contracts, environments, database, CI                | In progress |
| W02 | Authentication, age, and onboarding | Auth providers, sessions, OTP, onboarding state                | In progress |
| W03 | Profiles and verification           | Profile editor, media pipeline, verification review            | In progress |
| W04 | Discovery and matching              | Protected location, scoring, likes, matches                    | Implemented |
| W05 | Communication                       | Conversations, WebSockets, attachments, notifications          | Implemented |
| W06 | Safety and moderation               | Reports, blocks, risk signals, appeals, safety centre          | Planned     |
| W07 | Admin operations                    | RBAC dashboard, queues, analytics, audit views                 | Planned     |
| W08 | Monetisation                        | Entitlements, store verification, webhooks, refunds            | Planned     |
| W09 | Platform operations                 | Workers, observability, deployment, backups, incident response | Planned     |
| W10 | Quality and release                 | Test strategy, accessibility, load, store readiness            | Planned     |
| W11 | Brand and localization              | Design tokens, voice, English/Swahili, content governance      | In progress |

## Execution Order

1. Complete W01 and the core path in W02.
2. Complete profile publication and verification in W03 before exposing broad discovery.
3. Build W04 with mutual eligibility and transaction-safe matches.
4. Build W05 only after match authorization exists.
5. Build W06 and W07 alongside every user-generated-content feature.
6. Add W08 only after entitlement authority and app-store compliance are tested.
7. Finish W09 and W10 before production launch.

## Definition Of Done

A feature is complete when its API contract, persistence/migration, client state and UI, loading/empty/error states, authorization rules, localization strings, analytics events, tests, docs, and operational signals are implemented. A feature marked launch-ready must also satisfy the gates in [`implementation/09-release-gates.md`](implementation/09-release-gates.md).

## Required Owner Decisions

- Legal approval for terms, privacy, community guidelines, retention, age assurance, verification, and safety content.
- Verification provider and data-processing agreement.
- Email, SMS, push, storage, monitoring, and payment providers.
- Apple Developer and Google Play accounts and product IDs.
- Emergency and law-enforcement escalation process.
- Production domains, support addresses, and data residency requirements.
