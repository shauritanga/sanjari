# API

All routes are versioned under `/api/v1`.

Initial controllers:

- `auth`
- `accounts`
- `profiles`
- `photos`
- `verification`
- `discovery`
- `likes`
- `matches`
- `conversations`
- `messages`
- `blocks`
- `reports`
- `moderation`
- `notifications`
- `subscriptions`
- `payments`
- `support`
- `configuration`
- `admin`
- `health`

Responses use a consistent envelope:

```json
{
  "data": {},
  "meta": {
    "requestId": "req_..."
  }
}
```

Errors expose stable codes and safe messages only.
