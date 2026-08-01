# W08 Monetisation And Entitlements

## Delivery Status

In progress. The server-authoritative plan, entitlement, purchase webhook, idempotency, and subscription-status contracts are implemented. Apple/Google verification remains an owner-provider gate; local HMAC verification is available for development and integration tests.

## Objective

Offer transparent free and premium plans while keeping entitlement authority on the server and complying with app-store rules.

## Scope

- Configurable plan catalogue and entitlement service for likes, undo, advanced filters, priority likes, travel, incognito, boosts, and visibility features.
- Apple and Google purchase verification, restore, status synchronization, grace periods, renewal/cancellation/refund events, signed webhooks, idempotency, transaction history, and audit records.
- External payment-provider interface for approved local providers; no bypass of app-store rules for digital goods.
- Admin plan, subscription, purchase, payment-event, refund, and reconciliation views.

## Acceptance Criteria

- The client cannot grant or retain premium access by changing local state.
- Duplicate webhook delivery is safe and produces one business outcome.
- Invalid signatures and unknown products are rejected and logged safely.
- Cancellation, refund, grace period, restore, and expiry states are represented in UI and API contracts.

## Verified Implementation

- `GET /api/v1/subscriptions/plans` returns active plans only.
- `GET /api/v1/subscriptions/status` derives current status and entitlements from persisted server records.
- `POST /api/v1/subscriptions/webhooks` records invalid events, rejects invalid signatures and unknown products, and uses `(provider, externalEventId)` idempotency.
- Purchase state supports active, trialing, grace period, cancelled, refunded, and expired statuses.
- Client-controlled premium state is never accepted as an entitlement source.
- API verification includes invalid-signature, entitlement, and duplicate-delivery tests.

## Verification

- API: 18 test files, 47 tests passing; typecheck, lint, and build passing.
- Mobile: monetisation status screen added; lint and typecheck passing.
- Admin: existing subscription and payment-event views remain permission-gated and payload-redacted.

## Owner Gate

Apple and Google production verification still require owner-supplied provider credentials, product identifiers, and signed-notification configuration. Until those inputs are supplied, the API rejects provider events rather than granting access.
