# W03 Profiles And Verification

## Objective

Create trustworthy, expressive profiles while isolating sensitive verification data and giving users control over visibility.

## Scope

- Profile editor for display name, pronouns, gender, intentions, biography, occupation, education, languages, city/broad area, optional lifestyle fields, interests, prompts, and voice introduction.
- Completion score, preview, photo reorder/primary selection, pause discovery, deactivation, deletion, export, and visibility controls.
- Signed direct uploads, MIME/size checks, malware-scan hook, EXIF stripping, safe thumbnails, moderation states, and deletion retention.
- Selfie/liveness provider interface, optional identity-document provider interface, manual review queue, confidence category, badge explanation, and access audit.

## Privacy Invariants

- Verification artifacts are private, encrypted where supported, signed-url only, access-logged, and automatically deleted according to policy.
- Exact location, identity documents, contact details, and biometric templates are never profile data.
- Verification badges describe the check performed and do not imply personal safety.

## Acceptance Criteria

- A user can save partial profile data, preview it, publish it, and later revise it.
- Profile content can be pending, approved, rejected, hidden, or under review.
- Media processing failure leaves no publicly usable object and gives a recoverable client state.
- Moderator access to verification data is permissioned and auditable.

## Implemented In This Slice

- Profile preview and persisted visibility settings for age, online status, and read receipts.
- Six-photo direct-upload contract with MIME/size validation, pending-scan moderation state, reorder, primary selection, deletion, and audit events.
- Discovery pause/resume endpoint and mobile profile editor.
- Fail-closed selfie/liveness and identity-document provider interfaces with private verification-case status responses and request audit events.

Storage signing, malware scanning, EXIF stripping, thumbnails, and production verification adapters remain worker/provider integrations that require configured infrastructure and owner credentials.
