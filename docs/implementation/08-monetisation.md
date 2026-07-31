# W08 Monetisation And Entitlements

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
