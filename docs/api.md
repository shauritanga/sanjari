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

## Authentication

Authentication routes are versioned under `/api/v1/auth`:

| Method | Route         | Purpose                                                                                      |
| ------ | ------------- | -------------------------------------------------------------------------------------------- |
| `POST` | `/register`   | Create an adult account, legal acceptances, profile draft, audit record, and initial session |
| `POST` | `/login`      | Verify password and create a device-aware session                                            |
| `POST` | `/refresh`    | Atomically rotate a refresh token; reuse revokes the token family                            |
| `POST` | `/logout`     | Revoke one refresh-token session                                                             |
| `POST` | `/logout-all` | Revoke all sessions for the authenticated user                                               |

Access tokens are short-lived JWTs. Refresh tokens are stored only as SHA-256 hashes. Clients must store tokens in platform-secure storage; never use `AsyncStorage` for authentication tokens.

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
