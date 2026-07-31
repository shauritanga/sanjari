# W04 Discovery And Matching

## Objective

Deliver fast, explainable discovery and mutual matching without exposing exact location or creating popularity-only feedback loops.

## Scope

- Card and list discovery with age, approximate distance, gender, intentions, verification, languages, interests, lifestyle, activity, and new-member filters.
- Protected coordinate storage, rounded/category distance responses, location-change anomaly detection, query throttling, and distance privacy.
- Candidate exclusion for blocks, passes, suspended/unapproved accounts, paused discovery, incompatible mutual preferences, and configurable pass cooldown.
- Rules-based score with versioning, feature flags, exploration, component storage, explanations, shown/action/match outcomes, and offline evaluation hooks.
- Likes, comments, priority likes, passes, idempotency, daily limits, undo entitlement, and transaction-safe mutual match creation.

## Acceptance Criteria

- No client response contains exact coordinates.
- The same candidate cannot be duplicated in a page or concurrently produce duplicate matches.
- Every shown recommendation records generation reason, component scores, ranking version, and outcome.
- A match exists only when both eligible users like each other.
- Unmatch, block, and report immediately prevent unauthorized further messaging while retaining required evidence.
