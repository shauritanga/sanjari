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

| Method | Route                      | Purpose                                                                                                  |
| ------ | -------------------------- | -------------------------------------------------------------------------------------------------------- |
| `POST` | `/register`                | Create a pending adult account, legal acceptances, profile draft, audit record, and verification request |
| `POST` | `/login`                   | Verify password and create a device-aware session                                                        |
| `POST` | `/email/verify`            | Verify a six-digit email code and activate the account                                                   |
| `POST` | `/email/resend`            | Request another verification code with a generic response                                                |
| `POST` | `/refresh`                 | Atomically rotate a refresh token; reuse revokes the token family                                        |
| `POST` | `/logout`                  | Revoke one refresh-token session                                                                         |
| `POST` | `/logout-all`              | Revoke all sessions for the authenticated user                                                           |
| `POST` | `/password-reset/request`  | Request a password reset link with a generic response                                                    |
| `POST` | `/password-reset/complete` | Set a new password using a single-use reset token                                                        |

New registrations remain pending until email verification succeeds. Verification codes are hashed, expire after 10 minutes, and stop accepting attempts after five failures. Password reset links are single-use, expire after 30 minutes, and revoke active sessions after completion. Access tokens are short-lived JWTs. Refresh tokens are stored only as SHA-256 hashes. Clients must store tokens in platform-secure storage; never use `AsyncStorage` for authentication tokens.

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
