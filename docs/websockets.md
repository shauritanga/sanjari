# WebSockets

Socket connections require an authenticated access token. User IDs, conversation IDs, sender IDs, and match status are always verified server-side.

Initial events:

- `connection.ready`
- `presence.updated`
- `conversation.join`
- `conversation.leave`
- `typing.started`
- `typing.stopped`
- `message.created`
- `message.updated`
- `message.deleted`
- `message.delivered`
- `message.read`
- `reaction.created`
- `reaction.deleted`
- `match.created`
- `match.removed`
- `notification.created`

Redis pub/sub backs horizontal scaling and missed-event recovery.
