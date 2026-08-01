# W05 Communication And Notifications

## Objective

Provide reliable, consent-based communication only between active matched users.

## Scope

- REST history and recovery plus authenticated Socket.IO events for conversations, typing, presence, delivery, read receipts, reactions, and match changes.
- Text, emoji, replies, reactions, voice notes, image attachments, optimistic updates, offline queue, retry, pagination, unread counts, sender deletion, and reporting.
- Membership and match-state authorization for every operation; message rate limits, spam/repeated-text/link signals, content warnings, and attachment scanning.
- Push, email, and optional SMS notifications with category preferences, quiet hours, safe previews, and localization.
- Prompt comments, opening questions, shared-interest suggestions, and conversation-health reminders.

## Acceptance Criteria

- REST and WebSocket paths converge on the same authorization rules.
- Reconnect recovers missed events without duplicating messages.
- Attachment objects are private until scanned and use short-lived signed URLs.
- Notification payloads do not disclose sensitive content by default.
- The product does not claim end-to-end encryption unless a separate audited key-management design is approved.

## Implemented In This Slice

- Match-authorized conversation listing, lazy conversation creation, paginated REST history, text sends, read receipts, and sender deletion.
- Block-state rechecks on every conversation operation.
- Generic in-app new-message notifications and suspicious-link message review/audit state.
- Mobile conversation list and message composer with empty, error, and review-warning states.
- Authenticated Socket.IO gateway events for message send, recovery, typing, presence, and JWT handshake validation.
- Private attachment presign/complete contracts with MIME/size checks and pending-scan state.
- Reactions and server-side push-token hashing/preferences APIs.

Provider-specific push delivery, offline queue persistence, and the media scanning worker remain infrastructure integrations; notification payloads remain generic by default.
