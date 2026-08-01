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

| Method   | Route                      | Purpose                                                                                                  |
| -------- | -------------------------- | -------------------------------------------------------------------------------------------------------- |
| `POST`   | `/register`                | Create a pending adult account, legal acceptances, profile draft, audit record, and verification request |
| `POST`   | `/login`                   | Verify password and create a device-aware session                                                        |
| `POST`   | `/email/verify`            | Verify a six-digit email code and activate the account                                                   |
| `POST`   | `/email/resend`            | Request another verification code with a generic response                                                |
| `POST`   | `/refresh`                 | Atomically rotate a refresh token; reuse revokes the token family                                        |
| `POST`   | `/logout`                  | Revoke one refresh-token session                                                                         |
| `POST`   | `/logout-all`              | Revoke all sessions for the authenticated user                                                           |
| `GET`    | `/sessions`                | List non-sensitive active device sessions for the authenticated user                                     |
| `DELETE` | `/sessions/:sessionId`     | Revoke one session owned by the authenticated user                                                       |
| `POST`   | `/password-reset/request`  | Request a password reset link with a generic response                                                    |
| `POST`   | `/password-reset/complete` | Set a new password using a single-use reset token                                                        |
| `POST`   | `/phone/request`           | Request OTP for an authenticated user's phone number                                                     |
| `POST`   | `/phone/verify`            | Verify and attach a phone number to the authenticated account                                            |
| `POST`   | `/phone/login/request`     | Request a phone-login OTP with a generic response                                                        |
| `POST`   | `/phone/login/verify`      | Verify phone OTP and create a device-aware session                                                       |

New registrations remain pending until email verification succeeds. Verification codes are hashed, expire after 10 minutes, and stop accepting attempts after five failures. Password reset links are single-use, expire after 30 minutes, and revoke active sessions after completion. Access tokens are short-lived JWTs. Refresh tokens are stored only as SHA-256 hashes. Clients must store tokens in platform-secure storage; never use `AsyncStorage` for authentication tokens.

Phone OTP delivery uses the `SmsService` provider boundary. Local development can use the Mailpit simulator with `SMS_PROVIDER=mailpit`; production must provide an approved SMS provider and must not log OTP values.

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

## Onboarding

Onboarding routes require a valid access token and persist progress server-side:

| Method | Route                        | Purpose                                                                    |
| ------ | ---------------------------- | -------------------------------------------------------------------------- |
| `GET`  | `/api/v1/onboarding`         | Read current step, completion score, age, and safe profile fields          |
| `PUT`  | `/api/v1/onboarding`         | Save validated profile fields and advance progress without moving backward |
| `POST` | `/api/v1/onboarding/publish` | Publish only when profile, media, and verification completion gates pass   |

## Profiles And Verification

Profile routes require a valid access token. Photo uploads are presigned, limited to six JPEG/PNG/WebP files up to 10 MB each, and remain pending scan/moderation until a storage worker approves them.

| Method   | Route                                           | Purpose                                                  |
| -------- | ----------------------------------------------- | -------------------------------------------------------- |
| `GET`    | `/api/v1/onboarding/preview`                    | Return the caller's safe profile preview                 |
| `POST`   | `/api/v1/onboarding/photos/presign`             | Create a short-lived direct-upload contract              |
| `POST`   | `/api/v1/onboarding/photos/complete`            | Register an uploaded photo as pending moderation         |
| `PATCH`  | `/api/v1/onboarding/photos/reorder`             | Reorder photos and select the primary photo              |
| `DELETE` | `/api/v1/onboarding/photos/:photoId`            | Delete a caller-owned photo and audit the action         |
| `PATCH`  | `/api/v1/onboarding/discovery-pause`            | Pause or resume discovery visibility                     |
| `GET`    | `/api/v1/onboarding/verification`               | Read verification case status without exposing artifacts |
| `POST`   | `/api/v1/onboarding/verification/:type/request` | Request selfie/liveness or identity-document review      |

## Discovery And Matching

Discovery routes require a valid access token. Responses contain broad distance categories only; exact coordinates are never returned.

| Method | Route                            | Purpose                                                                |
| ------ | -------------------------------- | ---------------------------------------------------------------------- |
| `GET`  | `/api/v1/discovery`              | Return privacy-safe, explainable discovery candidates                  |
| `POST` | `/api/v1/discovery/:userId/like` | Record an idempotent like and create a match on reciprocal eligibility |
| `POST` | `/api/v1/discovery/:userId/pass` | Record an idempotent pass with a cooldown                              |

## Communication

Conversation routes require an active mutual match and re-check block state for every operation. Message previews in notifications are intentionally generic.

| Method   | Route                                            | Purpose                                         |
| -------- | ------------------------------------------------ | ----------------------------------------------- |
| `GET`    | `/api/v1/conversations`                          | List active matched conversations               |
| `GET`    | `/api/v1/conversations/:conversationId/messages` | Read paginated message history                  |
| `POST`   | `/api/v1/conversations/:conversationId/messages` | Send a text message with link-risk review state |
| `POST`   | `/api/v1/conversations/:conversationId/read`     | Record a read receipt                           |
| `DELETE` | `/api/v1/conversations/messages/:messageId`      | Delete the caller's own message content         |
