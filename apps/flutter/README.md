# Sanjari Flutter client

Sanjari's mobile app. Originally built as a phased port of a React Native
(Expo) app that has since been removed from this repo — the phase log below
is kept as a development history. It talks to the existing NestJS API — no
backend changes needed.

## Run against production

`flutter run` and normal builds use `http://37.60.238.125:3400/api/v1`.
The mobile app does not read the repository root `.env` file.

## Run against the local API

```bash
# From the repo root, with API + Postgres running:
#   docker compose up -d && pnpm db:migrate && pnpm --filter @sanjari/api dev
adb reverse tcp:4000 tcp:4000  # phone reaches the host API via localhost
cd apps/flutter
flutter pub get
flutter run --dart-define API_URL=http://localhost:4000/api/v1
```

For local development without ADB port forwarding, override `API_URL` with
the LAN IP for a physical device, e.g.
`--dart-define API_URL=http://192.168.1.10:4000/api/v1`.

## Route map

See the route table at the top of `lib/app.dart` for the current, complete
list of routes (auth, tabs, onboarding, profile view/edit/preview, block/
report, safety, settings, premium, chat, and shared-profile links).

## Auth parity

Login, register (email + password + date of birth per `RegisterDto`), phone
OTP request/verify, email verification, password-reset request, bearer
token with single 401 -> refresh -> retry (mirrors `src/api.ts`), logout
with server best-effort + local clear. Tokens live in secure storage under
the same keys as Expo (`sanjari.accessToken`, `sanjari.refreshToken`), so a
device can migrate between the two clients without forced logout.

## Phase 21 — Report/Block profile, and profile-view/shared-profile routes (done)

Closes the last gap versus the old Expo app: real `/profile/report` and
`/profile/block` screens (`POST /reports`, `POST /blocks/:id`, with a
"Report and Block" handoff between them), a `/profile/:id` route
(`GET /discovery/profile/:id`) with the like/pass/super-like footer and
Block/Report shortcuts via a new `ProfileDetailActions` on the shared
`ProfileDetailView`, and a read-only `/profile/share/:token` route
(`GET /discovery/share/:token`) for links shared outside the app. Discover's
swipe card and the Matches list now route into these instead of a
coming-soon dialog. Covered by `test/report_test.dart`.

## Phase 8 — Profile preview (done)

Port of `profile/preview.tsx` plus the shared `ProfileDetailView` and
`VerificationBadge` components, with `/profile/preview` now resolving to
the real `PreviewPage`: `GET /onboarding/preview` rendered as a paging
photo hero (fullscreen viewer with counter), name plate with badges and
location, bio, member-since, voice-intro playback, interests, languages,
and prompts, with the "how others see you" banner. The detail view and
badge live in `lib/widgets/` for reuse by public profiles later. Voice
playback uses `audioplayers` and needs on-device confirmation. Covered by
`test/profile_preview_test.dart`.

## Phase 10 — Personal information (done)

Port of `settings/personal-info.tsx`, with `/settings/personal-info` now
resolving to the real `PersonalInfoPage`: identity rows from
`GET /onboarding`, phone change with verification code
(`POST /auth/phone/request` + `/verify`), email change with confirmation
(`POST /auth/email/change/request` + `/confirm`, guarded on the confirmed
address like Expo), the name-and-gender row linking to `/profile/edit`,
and the read-only date of birth with the support note. Entry gates (phone
length, `@` email, 4+ digit codes) mirror Expo's disabled rules. Covered
by `test/personal_info_test.dart`.

## Phase 9 — Chaperone (done)

Port of `settings/chaperone.tsx`, with `/settings/chaperone` now
resolving to the real `ChaperonePage`: loads the existing chaperone (if
any), edits name/relationship/email plus the forward-copies toggle, saves
under Expo's validation rule, and removes with the form reset. Also adds
an optional `hint` to the shared `AppTextField`. Covered by
`test/chaperone_test.dart`.

## Phase 11 — Legal pages (done)

Ports of `settings/legal/terms.tsx` and `settings/legal/privacy-policy.tsx`
via a shared `LegalPage`: both routes now resolve to real content with the
Expo copy verbatim (English-only, like the source — only the screen chrome
is localized). Covered by `test/legal_test.dart`.

The profile editor, settings sub-screens (passcode,
contacts-block), the 20-step
onboarding flow, voice notes, photo attachments, uploads, push, and app
lock render a "coming soon" placeholder behind the working session guard.

## Phase 7 — Premium (done)

Port of `premium.tsx`, with `/premium` now resolving to the real
`PremiumPage`: server-verified current status (status, plan + end date,
enabled entitlements only) and plan cards with prices; the purchase
button explains the app-store flow, matching Expo (no store SDK is wired
on either client yet). Covered by `test/premium_test.dart`.

## Phase 6 — Blocked list (done)

Port of `settings/blocked.tsx`, with `/settings/blocked` now resolving
to the real `BlockedPage`: `GET /blocks` avatar rows with per-row
unblock (`DELETE /blocks/:blockedId`, optimistic removal like Expo) and
an empty state. Covered by `test/blocked_test.dart`.

## Phase 5 — Safety Centre (done)

Port of `safety.tsx`, with `/safety` now resolving to the real
`SafetyPage`: reminder card, locale-aware guidance sections (reloaded on
language switch), data export with server-status confirmation, appeal
submission for open moderation cases (marked submitted locally), and the
deactivate (signs out afterwards, like Expo) / delete flows behind
confirm dialogs. New files live under `lib/features/safety/`, covered by
`test/safety_test.dart`.

## Phase 4 — Settings hub (done)

Port of `settings.tsx`: parallel loads of device sessions, notification
push preferences, and visibility mode; per-category push toggles,
language picker (persisted under the same `sanjari.language` key Expo
uses, restored at startup), visibility picker with descriptions, profile
share link via the system share sheet, device revoke, and confirmed
logout. New files live under `lib/features/settings/`, covered by
`test/settings_test.dart`.

## Phase 3 — Chat screen, text core (done)

Port of `conversation/[id].tsx` (text messages), with `/conversation/:id`
now resolving to the real `ChatPage` instead of the removed stub:
cursor-paginated history with load-older on scroll, socket `message.send`
with REST fallback and a SecureStore offline outbox (cap 50, drain on
entry), delivered ack + 400ms delayed read mark, single/double/blue
ticks, 5-emoji reactions, reply with preview bar and reply lookup,
typing indicator (3s idle emit, 4s clear), presence subtitle with
last-seen, long-press menu (Reply/React/Delete/Report mirroring the Expo
payloads), and redacting delete. New files live under
`lib/features/chat/` plus `ChatRealtime` in `core/realtime.dart`.
Deliberate simplifications vs Expo: long-press menu instead of the
swipe-to-reply gesture, and lightweight image thumbnails for existing
attachments. Voice recording/playback, waveform, and the
presign/upload/complete attachment pipeline are explicitly out of scope
here. Covered by `test/chat_test.dart`.

## Phase 2d — Profile hub (done)

Port of the ProfileHub branch of `(tabs)/profile.tsx`, wired into the
fifth tab: `GET /onboarding` identity card (avatar, name + age,
verification badges, city, member-since, completion bar, Live/Draft
status) with Edit/Preview buttons, Settings and Safety rows, account
note, and confirmed logout. Verification badges come from
`GET /onboarding/verification` and fail soft, mirroring Expo. New
`/profile/edit`, `/profile/preview`, `/settings`, and `/safety` routes
resolve to placeholders until their phases land. The 1124-line editor
(save/publish/pause/photos/verification capture) is explicitly out of
scope here. Covered by `test/profile_hub_test.dart`.

## Phase 2c — Messages inbox (done)

Port of `(tabs)/messages.tsx`, wired into the home shell tab:
`GET /conversations` rows with avatar, name, relative timestamp, preview
("Say hello" for fresh matches, "Message removed" for redacted bodies),
unread badges (99+ cap), pull-to-refresh, and tap-through to
`/conversation/:id`. Live `message.new` socket updates arrive through a
new shared `RealtimeService` (`<origin>/communications`, token auth,
websocket transport, per-room join/leave) that updates the row preview in
place, bumps unread only for the other user's messages, and moves the row
to the top — the same rules as Expo. Covered by `test/inbox_test.dart`
(models, time buckets, pure-state live-update rules, endpoint shape).

## Phase 2b — Likes + Matches (done)

Ports of `(tabs)/likes.tsx` and `(tabs)/matches.tsx`, wired into the home
shell tabs. Likes: `GET /discovery/likes-received` cards with photo,
verified badge, city, super-like marker, comment, and Pass / Like-back
actions; a mutual match opens the shared match dialog. Matches:
`GET /matches` cards with 48-hour New badge, city, conversation setup
hint, and Unmatch (confirmed, `POST /matches/:id/unmatch`) / Block /
Report actions (Block/Report routing landed in Phase 21). Covered by
`test/likes_matches_test.dart` (models, 48h boundary, endpoint shapes).

## Phase 2 — Discover (done)

Swipe deck ported from `(tabs)/discover.tsx`: candidate queue with cursor
pagination, drag-to-swipe card (120px threshold, rotation, LIKE/PASS
stamps), pass / undo / super-like / like actions with idempotency keys,
match celebration dialog (ports `match-celebration.tsx`), filters page
(porting `filters.tsx`: age range, distance, genders, intentions,
languages, interests, verified-only, show-distance + recently-active /
new-members toggles), and a `/conversation/:id` stub so the match dialog's
"Send a message" link already resolves. New files live under
`lib/features/discover/`, covered by `test/discover_test.dart` and
`test/discovery_repository_test.dart`.

## Phase 12 — Passcode lock (done)

Port of `src/lib/passcode.ts` plus the lock screens: SHA-256 PIN hash in
secure storage under Expo's exact keys (`sanjari.passcode.hash`,
`sanjari.passcode.biometric`), so a device migrating between clients keeps
its lock state; `local_auth` biometric unlock with the 'Unlock Sanjari'
prompt and passcode fallback in the lock-screen UI. Pure domain logic
lives in `lib/core/passcode.dart` with device backends
(`flutter_secure_storage`, `local_auth`) split into
`lib/core/passcode_devices.dart` so hashing stays unit-testable with
`dart test`. Covered by `test/passcode_test.dart`.

## Phase 13 — Onboarding core: steps + draft state (done)

Port of `src/onboarding/steps.ts`, `src/onboarding/options.ts`, and
`src/store/onboarding.ts` — everything except the per-step screens
(Phase 14 covers age..name; photos..publish still resolve to the
coming-soon stub): the ordered step catalogue
with 1-indexed numbers, path/next/resume helpers (including the exact
unknown-key fallbacks and the clamp-to-birthday login resume rule), all
nine picker option lists with API enum values, and the draft state with
`GET /onboarding` hydrate (+ best-effort discovery preferences),
`PUT /onboarding` step saves with the server progress-triple merge,
prompt/preference persistence, and the local-only photo/location/
notification/voice setters. New files live under
`lib/features/onboarding/`, covered by `test/onboarding_test.dart`.

## Phase 14 — Onboarding screens, part 1: age to name (done)

First eight per-step screens (`age`..`name`), wired to the real
`/onboarding/<step>` routes: the 18+ gate (no back button, no server
call), terms bullets with the agreement checkbox gating Continue,
email/phone registration choice (tap navigates immediately, like Expo),
server-verified age confirmation, gender cards with optional pronouns
(persisted server-side per `profiles/dto.ts`), who-to-meet multi-chips
saving `interestedIn` plus the parallel Discover gender narrowing
('everyone' means no filter), intentions capped at 3, and the name field
(2+ characters, saved trimmed). Shared `OnboardingScreen` chrome ports
`OnboardingScreen.tsx` (back, step progress bar, skip slot, footer with
primary/ghost actions and footnote); `ChipGroup`/`SelectableCard` ports
live in `lib/widgets/` since profile and filters reuse them in Expo, and
the chip toggle rule (`toggleChipSelection`, incl. the max cap) is pure
Dart covered by `test/onboarding_test.dart`. Screens seed from the
Phase 13 draft and navigate only on successful saves. Copy stays
hardcoded English, matching Expo (its i18n file covers no onboarding
strings). The name screen falls through to the coming-soon stub until the
photos screen lands.

## Phase 15 — Onboarding screens, part 2: country to languages (done)

Six more per-step screens, wired to `/onboarding/<step>`: country search
over `GET /catalog/locations` (new `LocationsRepository`, saves
`{countryCode}` and forwards it as the city query param), city picker
from the matching catalogue entry with the draft fallback and
`{cityId, city}` save, bio with starter chips that only fill an empty
field (10+ characters, failures in the footer note), interests
(min 5 / max 20 with live counter) and languages (min 1 / max 10,
error-only footer) sharing a `MinMaxChipsPage`, and prompts (exactly 3
with non-blank answers ≤300 chars, `GET /onboarding/prompts?locale=en`
via a new `OnboardingRepository.fetchPrompts`, rows reuse the tested
chip-toggle cap rule). `AppTextField` gained additive `onChanged` and
`minLines` for the multiline inputs. Covered by three new
`test/onboarding_test.dart` cases (catalogue envelope + empty fallback,
prompts endpoint shape). Photos still needs the presign/upload pipeline
and stays stubbed, so the name screen still falls through for now.

## Phase 16 — Onboarding screens, part 3: preferences to publish (done)

Four more screens, wired to `/onboarding/<step>`: match preferences
(`NumberStepper` age/distance rows with ordered ends plus a
`ToggleRow`, one merged `PUT /onboarding/discovery-preferences`),
privacy toggles (`{hideAge, hideOnlineStatus, hideReadReceipts}` in one
save), review (re-hydrate with swallowed prompt-lookup failures, tap
back into bio/photos), and publish (`POST /onboarding/publish`, then
`go('/home/discover')`, failures pinned to the step). `NumberStepper`
avoids Flutter material's `Stepper` name; the step arithmetic
(`stepperNext`, incl. the ×5 km stride clamp) is pure Dart covered by
`test/onboarding_test.dart`, as is the publish endpoint shape. The
welcome screen is skipped — Flutter's logged-out entry is `/auth/login`,
so it has no route slot. Still stubbed at the time: photos, location,
verification, notifications, voice-intro — covered next in Phase 17.

## Phase 17 — Onboarding device screens: photos to voice (done)

All five device screens, wired to `/onboarding/<step>` — onboarding is
now complete end to end (23/23 steps). New plugin deps: `image_picker`,
`geolocator`, `record`, `firebase_messaging`, `permission_handler`
(`audioplayers` was already present for playback). Following the
passcode seam pattern, all platform access hides behind pure-Dart
abstracts in `lib/core/devices.dart` (media picker, binary PUT
uploader, voice recorder/player, location, push registrar) with fakes
under `dart test` and plugin implementations in
`lib/core/devices_impl.dart`: presign → PUT → complete/replace photo
pipeline with 6-slot `PhotoGrid` (busy overlays, moderation pills,
primary star, replace/move/set-main/remove, best-effort PATCH
reorder), verification status cards with front/rear camera capture,
PostGIS location post with the draft city, push permission plus
best-effort 16+ char token registration (`ios`/`android` provider),
and 60s-capped voice recording with auto-stop, upload, playback,
re-record/remove. `ApiClient` gained the PATCH verb the reorder call
needs. No foreground-push handling was ported: the Expo app registers
the token and nothing else (single `expo-notifications` import, no
listeners/handlers), so there is no behavior to match. Covered by
`test/media_test.dart` (13 cases: WKT literal,
provider names, token rule, 60s cap, status labels, reorder math,
pipeline endpoint shapes incl. a real temp-file voice upload). What
`dart test` cannot prove: actual plugin behavior needs `android/ios`
scaffolding (this project has none yet), Firebase config files, runtime
permissions, and on-device smoke — the code is analyze-clean against
the real plugin APIs but jiggling a photo upload end to end remains
unverified.

## Phase 18 — Contacts-block + app lock (done)

Two settings-adjacent slices. Contacts-block ports
`settings/contacts-block.tsx` to a real `/settings/contacts-block`
screen: address-book numbers stay on device, normalized with the exact
Expo E.164 regex and SHA-256 hashed (`hashContactNumbers`, fixture
checked against coreutils `sha256sum`), then POSTed to
`/contacts/block` with the scanned/blocked result line. Contact
reading hides behind the `ContactsReader` seam (`flutter_contacts` +
`permission_handler` impl). App lock ports `app/lock.tsx` to `/lock`:
biometric-first attempt on entry, PIN fallback (4+ digits, 6 max),
`PasscodeStore.tryBiometricUnlock()` added to mirror `passcode.ts`,
and the splash gate as an async router redirect — an enabled passcode
reroutes every cold start to `/lock?next=<destination>` until the
`appLockGateProvider` flag is satisfied by unlocking. Covered by
`test/contacts_block_test.dart` (normalize/hash/endpoint) plus a
`tryBiometricUnlock` gating case in `test/passcode_test.dart`.

## Phase 19 — Profile editor (done)

The edit branch of `(tabs)/profile.tsx` as a real `/profile/edit`
screen: hero with status pill, completion progress, 6-slot `PhotoGrid`
reuse, about (name, single-select gender, pronouns, bio, occupation +
education), lifestyle (digits-only height, drinking/smoking/exercise/
children single chips, cultural), country/city `SearchableSelect`
sheets (changing country clears the city, like Expo), looking-for
chips with the same caps (intentions 3, interests 20, languages 10),
seven privacy toggles with discovery pause (`PATCH
/onboarding/discovery-pause`, silent-server echo), camera verification
cards reusing the media pipeline, and the save (`PUT /onboarding`,
step 4, Expo's exact conditional spreads incl. empty-string
pass-through) / publish footer (publish hidden once live). New
`ProfileEditController` holds the draft; every field edit clears the
saved flag. Covered by `test/profile_editor_test.dart` (envelope
parsing, payload parity, height rule, labels, save/publish/pause
endpoint shapes).

## Phase 20 — Chat photo + voice attachments (done)

Closes the Phase 3 gap in `conversation/[id]`: multi-photo (up to 10)
and 120s voice-note sending through `POST messages` →
presign → PUT → complete with `sizeBytes` as strings, sequential
uploads so mid-batch failures keep earlier photos, per-file live merge
with the pending-attachment stash plus the safety-net parent append,
and reply-to carried onto attachment messages. Bubbles render the
220px photo grid with a swipeable fullscreen viewer, and voice notes
with play/pause, 40 waveform bars, and m:ss durations. The composer
gains the attach button, the sending-photo/voice banner, and the sheet
with the live recording counter and stop-and-send. New
`ChatAttachmentSender` + waveform/placeholder/duration rules are pure
Dart covered by `test/chat_attachments_test.dart`. One honest
deviation: the record plugin exposes no metering stream, so voice
notes send without a waveform and render the fallback bars — the same
path as pre-waveform legacy messages. As with all device work, real
recording/playback needs on-device smoke.

## Verify

```bash
flutter analyze
flutter test
```
