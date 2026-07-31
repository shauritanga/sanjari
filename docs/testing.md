# Testing Guide

Critical test coverage targets:

- Underage registration attempts.
- Refresh-token reuse detection.
- Duplicate likes and simultaneous mutual likes.
- Permission violations in admin and moderation flows.
- Blocked or unmatched user messaging.
- Duplicate payment webhooks.
- Expired signed URLs.
- WebSocket reconnection.
- Offline message sending.

Commands:

```bash
pnpm lint
pnpm typecheck
pnpm test
```
