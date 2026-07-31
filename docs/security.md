# Security Guide

- Use TLS-only production traffic with HSTS.
- Store secrets in a secrets manager, never in source control.
- Hash passwords with Argon2id.
- Rotate refresh tokens and store only refresh-token hashes.
- Enforce permissions server-side.
- Use strict validation and reject unknown fields.
- Use signed object-storage URLs.
- Strip image metadata and scan uploads before publishing.
- Keep verification artifacts private and audited.
- Do not log secrets, tokens, OTPs, private message content, exact GPS coordinates, payment credentials, or identity documents.
- Require MFA for privileged administrators.
- Run dependency, container, and SAST scans in CI.

Legal counsel must review privacy, retention, biometrics, age assurance, consumer subscription, and safety obligations before launch.
