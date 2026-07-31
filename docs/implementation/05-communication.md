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
