# W02 Authentication, Age, And Onboarding

## Objective

Allow only eligible adults to create and use accounts, with recoverable onboarding progress and revocable, device-aware sessions.

## Delivery Slices

1. Email/password registration, Argon2id hashing, legal acceptance, server-side age calculation, and audit records.
2. Email and phone verification with hashed OTPs, expiry, attempt limits, resend limits, and provider adapters.
3. Login, short-lived access tokens, rotating refresh tokens, reuse detection, logout, and logout-all-devices.
4. Google/Apple provider adapters, password reset, account recovery, suspicious-login signals, and optional biometric unlock.
5. Onboarding state machine covering age, identity, preferences, profile, location, privacy, verification, notifications, review, and publish.

## Completed In This Slice

- Email/password registration and login.
- Short-lived access tokens and hashed, device-aware refresh sessions.
- Atomic refresh rotation with token-family reuse detection and audit logging.
- Secure logout and authenticated logout-all-devices.
- Local migration coverage for session token families.

## Safety Invariants

- No account under 18 can be activated or discovered.
- Full DOB is never returned to another user or rendered publicly.
- DOB changes require support review and create an immutable audit record.
- Auth errors remain generic; rate limits and lockouts do not disclose account existence.
- Tokens are stored in SecureStore on mobile and secure HTTP-only cookies for admin sessions.

## Acceptance Criteria

- Registration and login work through documented versioned API contracts.
- Refresh-token rotation is atomic and reuse revokes the affected session family.
- Every onboarding step can be resumed and has validation, loading, error, and offline-safe states.
- English and Swahili strings exist for all onboarding and authentication content.
