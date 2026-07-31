# Launch Release Gates

This is the final go/no-go checklist. A phase can be marked complete before launch, but production launch requires every applicable gate below.

## Product And Safety

- [ ] Adult-only enforcement, age assurance, suspicious-age review, and DOB-change workflow tested.
- [ ] Block, report, moderation, appeals, emergency suspension, and evidence retention tested.
- [ ] Safety centre, community guidelines, verification explanations, and date-plan guidance reviewed.

## Privacy And Legal

- [ ] Terms, privacy policy, community guidelines, retention, deletion, export, verification, subscription, and emergency processes legally reviewed.
- [ ] Data inventory, processor agreements, access controls, retention jobs, and deletion requests verified.
- [ ] No exact GPS, identity documents, biometric data, tokens, or private content leaks through logs or APIs.

## Security

- [ ] MFA is required for privileged administration.
- [ ] Refresh rotation/reuse detection, CSRF, rate limits, lockouts, RBAC, signed URLs, upload scanning, and secret rotation tested.
- [ ] Dependency, SAST, container, and infrastructure scans reviewed.

## Reliability

- [ ] Migrations, backups, restore, queue retries, dead-letter handling, outage behavior, alerts, and rollback tested.
- [ ] Load tests cover discovery, auth, chat, notifications, and moderation queues.
- [ ] Runbooks exist for incident response, provider outages, abuse spikes, and data incidents.

## Store And Operations

- [ ] Apple/Google product IDs, purchase verification, restore, refund, grace period, and webhook tests pass.
- [ ] App metadata, screenshots, support/privacy URLs, domains, email identity, and release notes are approved.
- [ ] Production deploy has an authorized owner, protected approval, and a tested rollback.
