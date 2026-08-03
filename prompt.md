# MASTER DEVELOPMENT PROMPT: PRODUCTION-READY DATING PLATFORM

Act as a senior software architect, senior React Native engineer, senior NestJS backend engineer, PostgreSQL database architect, DevOps engineer, UI/UX designer, security engineer, and QA engineer.

Build a complete, production-ready dating platform for adults aged 18 and above.

The system must include:

1. A mobile application built with React Native and the latest stable Expo SDK.
2. A REST and WebSocket API built with the latest stable NestJS version.
3. PostgreSQL as the primary database.
4. Redis for caching, queues, online status, rate limiting, and temporary data.
5. Object storage for user photos, verification media, voice introductions, and chat attachments.
6. An administrative web dashboard for moderation and platform management.
7. Docker-based local and production environments.
8. Automated testing, CI/CD, monitoring, logging, security controls, and deployment documentation.

Do not create a demonstration-only project. Build the application using production-quality architecture, validation, security, error handling, migrations, documentation, tests, and deployment configuration.

Before installing packages, check the current official documentation and use mutually compatible stable versions. Do not use beta, release-candidate, deprecated, abandoned, or unmaintained packages.

---

# 1. PRODUCT OVERVIEW

Create an adult dating application that helps users discover compatible people, form mutual matches, communicate safely, and report suspicious or abusive behaviour.

The platform must prioritize:

* Authentic profiles
* User safety
* Privacy
* High-quality recommendations
* Mutual consent before messaging
* Easy onboarding
* Fast performance
* Accessibility
* Localisation
* Low mobile-data consumption
* Scalable infrastructure
* Transparent subscription features
* Strong moderation

The application must support English and Swahili from the beginning.

Use a temporary application name such as `Connect`, but store branding values in configuration so that the name, logo, colours, support details, and legal links can be changed easily.

---

# 2. AGE AND SAFETY REQUIREMENTS

This platform is strictly for users aged 18 and above.

Implement:

* Date-of-birth collection
* Server-side age calculation
* Minimum-age validation
* Terms and age confirmation
* Age-assurance workflow
* Suspicious-age reporting
* Moderator review
* Account suspension when age eligibility is uncertain
* Prevention of date-of-birth changes without support review
* Age-validation audit records

Never allow users under 18 to create or use an account.

Do not publicly display a user's full date of birth. Only display their calculated age.

Create safety features for:

* Blocking users
* Reporting profiles
* Reporting individual messages
* Reporting photos
* Reporting voice notes
* Reporting suspected scams
* Reporting impersonation
* Reporting harassment
* Reporting fake age
* Emergency account suspension
* Moderator escalation
* Appeal submission
* Evidence preservation
* User safety education

Do not expose exact GPS coordinates, home addresses, schools, workplaces, phone numbers, email addresses, identity documents, or verification media to other users.

---

# 3. TECHNOLOGY STACK

## Mobile application

Use:

* React Native
* Latest stable Expo SDK
* TypeScript with strict mode
* Expo Router
* New Architecture
* TanStack Query for server state
* Zustand or Redux Toolkit for limited client state
* React Hook Form
* Zod
* SecureStore for sensitive local tokens
* Expo Notifications
* Expo Image
* Expo Camera
* Expo Location
* Expo AV or the currently supported Expo media package
* Expo Local Authentication where appropriate
* Reanimated
* Gesture Handler
* FlashList for large lists
* Internationalisation library supporting English and Swahili
* EAS Build
* EAS Submit
* EAS Update, with a safe update policy

Use Expo development builds where native functionality is required. Do not depend exclusively on Expo Go.

## Backend

Use:

* NestJS
* TypeScript strict mode
* REST API
* Socket.IO or a suitable NestJS-supported WebSocket implementation
* Prisma ORM
* PostgreSQL
* Redis
* BullMQ
* Swagger/OpenAPI
* class-validator or Zod-based request validation
* Passport where appropriate
* JWT access tokens
* Rotating refresh tokens
* Argon2id password hashing
* Structured logging
* Health checks
* API versioning

Use a modular monolith initially. Structure modules so high-traffic components can later be extracted into microservices without rewriting the entire system.

## Administrative portal

Build an admin web application using:

* Next.js
* TypeScript
* App Router
* Secure server-side authentication
* Role-based access control
* TanStack Query
* Accessible responsive components
* Charts for operational metrics
* Audit logging for every administrative action

## Infrastructure

Use:

* Docker
* Docker Compose
* PostgreSQL
* Redis
* Nginx or another secure reverse proxy
* S3-compatible object storage
* GitHub Actions
* Environment-based configuration
* Sentry-compatible error monitoring
* Prometheus-compatible metrics
* Centralised structured logs

---

# 4. REPOSITORY STRUCTURE

Create a monorepo with a structure similar to:

```text
dating-platform/
├── apps/
│   ├── mobile/
│   ├── api/
│   └── admin/
├── packages/
│   ├── api-contracts/
│   ├── validation/
│   ├── types/
│   ├── eslint-config/
│   ├── tsconfig/
│   └── shared-utils/
├── infrastructure/
│   ├── docker/
│   ├── nginx/
│   ├── monitoring/
│   └── deployment/
├── docs/
├── scripts/
├── docker-compose.yml
├── pnpm-workspace.yaml
└── README.md
```

Use pnpm workspaces and Turborepo unless a better current stable solution is justified.

Do not share backend-only entities or secrets with the mobile application. Shared packages should contain safe contracts, enums, validation rules, and utility types only.

---

# 5. USER ROLES

Implement the following roles:

* User
* Support agent
* Moderator
* Senior moderator
* Verification officer
* Finance officer
* Administrator
* Super administrator

Use permissions rather than relying only on hard-coded role names.

Example permissions:

* users.read
* users.suspend
* users.ban
* profiles.review
* verification.review
* reports.assign
* reports.resolve
* moderation.content.remove
* subscriptions.read
* refunds.manage
* analytics.read
* configuration.manage
* administrators.manage
* audit.read

Enforce permissions on the backend. Never rely only on hidden mobile or web interface elements.

---

# 6. AUTHENTICATION

Support:

* Email and password
* Phone number and one-time password
* Google authentication
* Apple authentication on supported platforms
* Email verification
* Phone verification
* Password reset
* Secure logout
* Logout from all devices
* Session/device management
* Suspicious-login detection
* Account recovery
* Optional biometric application unlock

Authentication security must include:

* Short-lived access tokens
* Rotating refresh tokens
* Hashed refresh tokens in the database
* Refresh-token reuse detection
* Device/session identifiers
* Session revocation
* Rate limiting
* Brute-force protection
* Temporary account lockouts
* Generic authentication error messages
* Secure cookies for the admin portal
* CSRF protection where cookie authentication is used
* Audit logging

Never store authentication tokens in AsyncStorage.

---

# 7. ONBOARDING

Create a multi-step onboarding process:

0. Beautiful splash screen
1. Welcome screen
2. Confirm age eligibility
3. Accept terms and privacy policy
4. Choose registration method
5. Verify phone or email
6. Enter date of birth
7. Select gender identity
8. Select who the user wants to meet
9. Choose relationship intentions
10. Enter name
11. Add photos
12. Select country
13. Select city
14. Add biography
15. Select interests
16. Answer personality prompts
17. Add languages
18. Set discovery preferences
19. Set approximate location
20. Configure privacy
21. Complete selfie verification
22. Enable notifications
23. Review profile
24. Publish profile

Allow users to save progress and continue later.

Show a profile-completion indicator, but do not use manipulative or misleading design.

---

# 8. PROFILE MANAGEMENT

Profile fields should include:

* Display name
* Calculated age
* Pronouns
* Gender
* Interested-in preferences
* Relationship intentions
* Biography
* Occupation category
* Education level
* Languages
* City or broad area
* Height, only when voluntarily provided
* Drinking preference
* Smoking preference
* Exercise preference
* Children preference
* Religious or cultural preference, only when voluntarily provided
* Interests
* Personality prompts
* Voice introduction
* Profile photos
* Verification status
* Account creation period
* Last active visibility setting

Sensitive personal fields must be optional unless legally required.

Users must be able to:

* Reorder photos
* Choose a primary photo
* Crop photos
* Replace photos
* Preview their profile
* Hide selected fields
* Pause discovery
* Temporarily deactivate their account
* Permanently delete their account
* Download their data
* Edit discovery preferences
* Control online and read-receipt visibility

Create moderation states for profile content:

* Pending
* Approved
* Rejected
* Hidden
* Under review

---

# 9. PHOTO AND IDENTITY VERIFICATION

Implement layered verification:

## Selfie verification

* Capture a live selfie or short selfie video
* Use liveness challenges where supported
* Compare it against profile images through a provider abstraction
* Do not permanently retain biometric templates unless required and legally authorised
* Record verification result, provider, timestamp, confidence category, and review status
* Allow manual review
* Show a verified badge only after successful verification

## Optional identity-document verification

* Use a provider abstraction
* Keep document data isolated from normal profile data
* Encrypt sensitive fields
* Use private storage
* Use short-lived signed URLs
* Restrict access to authorised verification personnel
* Log every access
* Define automatic deletion periods
* Never expose identity documents to other users

Do not pretend that verification proves a person is completely safe. Explain what each badge actually verifies.

---

# 10. DISCOVERY

Create a card-based and list-based discovery experience.

Filters should include:

* Age range
* Maximum approximate distance
* Gender preference
* Relationship intention
* Verification status
* Languages
* Interests
* Lifestyle preferences
* Recently active
* New members

Implement:

* Like
* Pass
* Super-like or priority interest
* Undo as a premium feature
* Daily recommendation limits
* Profile detail view
* Comment on a prompt or photo
* Hide or report profile
* Prevent repeated display of passed profiles for a configurable period
* Exclude blocked users
* Exclude suspended or unapproved profiles
* Exclude users outside mutual preference rules
* Exclude users who disabled discovery

Never send exact coordinates to mobile clients. The server should calculate approximate distance.

Add privacy-preserving location behaviour:

* Store protected coordinates
* Return only rounded or categorised distance
* Offer “within 5 km,” “within 10 km,” or similar labels
* Allow users to hide distance
* Detect unreasonable location changes
* Prevent location-based stalking through repeated queries

---

# 11. MATCHING ENGINE

Build an explainable initial matching system rather than claiming to use advanced artificial intelligence without evidence.

Create a configurable compatibility score using:

* Mutual gender preference
* Mutual age preference
* Distance preference
* Relationship intention
* Shared interests
* Shared languages
* Lifestyle compatibility
* Personality-prompt similarity
* Activity recency
* Profile completeness
* Verification status
* Behaviour quality signals

Do not use protected or sensitive attributes unfairly.

Store:

* Candidate-generation reason
* Individual score components
* Final score
* Ranking version
* Timestamp
* Whether the recommendation was shown
* User action
* Match outcome

The recommendation service must:

* Support feature flags
* Support ranking-version changes
* Prevent duplicate candidates
* Avoid repeatedly showing inactive accounts
* Avoid popularity-only feedback loops
* Include controlled exploration
* Support offline evaluation
* Support A/B testing
* Produce explanations such as shared interests without revealing private data

Create a future-ready interface for a machine-learning ranking service, but implement the first version using tested rules and weighted scoring.

---

# 12. MATCHES

A match is created only when both eligible users like each other.

Implement:

* Transaction-safe match creation
* Idempotency
* Duplicate-match prevention
* Match notification
* Match list
* New-match indicator
* Unmatch
* Block from match
* Report from match
* Conversation creation
* Match expiration only if enabled by configuration
* Match archival
* Match analytics

When a user unmatches another person:

* Close or hide the conversation
* Prevent further messaging
* Preserve required moderation evidence
* Respect legal and retention policies
* Do not tell the other user unnecessary private details

---

# 13. REAL-TIME CHAT

Implement one-to-one chat for matched users.

Support:

* Text messages
* Emoji
* Replies
* Reactions
* Voice notes
* Image attachments
* Message delivery status
* Read receipts controlled by privacy settings
* Typing indicators
* Online status controlled by privacy settings
* Message pagination
* Local optimistic updates
* Offline sending queue
* Retry
* Push notifications
* Unread counts
* Message deletion for the sender
* Message reporting
* Blocking
* Unmatching

Use WebSockets for real-time events and REST for history and recovery.

Security requirements:

* Verify conversation membership for every operation
* Validate attachments
* Scan uploaded files
* Limit MIME types and sizes
* Strip image metadata
* Generate safe thumbnails
* Use signed upload and download URLs
* Rate-limit messages
* Detect spam
* Detect repeated copy-and-paste messages
* Detect suspicious links
* Blur potentially inappropriate images until the receiver chooses to reveal them
* Warn users before sending potentially abusive content
* Allow moderators to access reported content only through audited workflows

Do not implement end-to-end encryption unless the full key-management, device-recovery, abuse-reporting, and multi-device design is correctly implemented and documented. Do not falsely advertise ordinary transport encryption as end-to-end encryption.

---

# 14. CONVERSATION STARTERS

Implement:

* Profile prompts
* Comments attached to likes
* Suggested opening questions
* Shared-interest suggestions
* Optional first-message rules
* Configurable opening moves
* Icebreaker cards
* Conversation-health reminders

Generated suggestions must be respectful and must not generate harassment, sexual pressure, discrimination, or requests for sensitive personal information.

---

# 15. SAFETY CENTRE

Create an in-app safety centre containing:

* Online dating safety guidance
* Scam warning signs
* Privacy guidance
* Guidance for meeting in public places
* How to block and report
* Explanation of verification badges
* Emergency support instructions
* Platform community guidelines
* Appeal process
* Data and privacy settings

Create a date-plan sharing feature that allows an adult user to voluntarily share:

* Match display name
* Meeting venue
* Date and time
* Expected end time
* Notes

The sharing destination should be selected by the user. Do not upload private contact lists unnecessarily.

Create optional check-in reminders. Do not continuously track either person.

---

# 16. MODERATION

Build a complete moderation workflow.

Report categories:

* Harassment
* Hate or discrimination
* Threatening behaviour
* Scam or fraud
* Impersonation
* Fake profile
* Inappropriate content
* Spam
* Suspected underage user
* Offline safety concern
* Other

Each report should support:

* Reporter
* Reported user
* Content reference
* Category
* Description
* Evidence snapshot
* Risk score
* Priority
* Assigned moderator
* Status
* Resolution
* Action taken
* Internal notes
* Appeal status
* Timestamps

Report statuses:

* Submitted
* Triaged
* Assigned
* Investigating
* Actioned
* Dismissed
* Escalated
* Appealed
* Closed

Moderation actions:

* Warning
* Content removal
* Temporary restriction
* Messaging restriction
* Discovery restriction
* Verification request
* Temporary suspension
* Permanent ban
* Device-level risk flag
* Appeal approval
* Appeal rejection

Require a reason for every action. Record all actions in immutable audit logs.

High-risk reports must be prioritised. Do not automatically make permanent high-impact decisions solely from an unreviewed automated score.

---

# 17. SCAM AND ABUSE PREVENTION

Create configurable risk signals, including:

* Excessive likes
* Excessive messages
* Repeated identical messages
* Many external links
* Requests to move immediately to another platform
* Account creation velocity
* Multiple accounts from the same device
* Frequent location changes
* Many blocks or reports
* Stolen or duplicate images
* Suspicious payment requests
* Suspicious profile edits
* Login anomalies

Risk responses may include:

* Additional verification
* Reduced rate limits
* Temporary messaging restriction
* Content review
* Moderator review
* Temporary account hold

Do not publicly reveal fraud-detection rules or thresholds.

---

# 18. NOTIFICATIONS

Support:

* New like
* New match
* New message
* Message reaction
* Profile verification result
* Report update
* Subscription update
* Safety alert
* Profile completion reminder
* Recommended profile digest

Notification controls must allow users to select:

* Push
* Email
* SMS where configured
* Individual notification categories
* Quiet hours

Do not include sensitive message content on lock screens unless the user explicitly enables previews.

---

# 19. SUBSCRIPTIONS AND MONETISATION

Provide free and premium plans.

Possible premium features:

* See who liked the user
* Advanced filters
* Undo
* Additional daily likes
* Priority likes
* Travel mode
* Incognito mode
* Profile boost
* Read receipts, subject to the other user's privacy settings

Do not create dark patterns.

Implement:

* Apple in-app purchases
* Google Play Billing
* Server-side purchase verification
* Subscription status synchronisation
* Restore purchases
* Grace periods
* Renewal handling
* Cancellation handling
* Refund event handling
* Webhook signature verification
* Idempotent webhook processing
* Transaction history
* Entitlement service
* Configurable plan catalogue

For external payment methods, create a payment-provider interface that can later support authorised local payment providers. Follow app-store rules for digital subscriptions.

Never trust a premium flag sent by the mobile application.

---

# 20. ADMINISTRATIVE PORTAL

Build pages for:

* Admin login
* Dashboard
* User search
* User profile review
* Verification queue
* Reports queue
* Moderation cases
* Appeals
* Subscription overview
* Payment-event logs
* Notification management
* Feature flags
* Matching configuration
* Content configuration
* Support cases
* Audit logs
* System health
* Application versions
* Legal-document versions
* Data-deletion requests
* Analytics

The dashboard should show:

* New registrations
* Active users
* Completed profiles
* Verified profiles
* Likes
* Matches
* Conversations
* Messages
* Reports
* Suspensions
* Subscription conversion
* Retention
* Failed notifications
* Failed background jobs
* API errors

Hide sensitive information unless the administrator has the required permission.

Require multi-factor authentication for privileged administrators.

---

# 21. DATABASE DESIGN

Create normalised Prisma models and migrations for at least:

* User
* UserCredential
* UserSession
* UserDevice
* EmailVerification
* PhoneVerification
* PasswordReset
* Profile
* ProfilePhoto
* ProfilePrompt
* PromptAnswer
* Interest
* ProfileInterest
* Language
* ProfileLanguage
* DiscoveryPreference
* UserLocation
* VerificationCase
* VerificationArtifact
* Like
* Pass
* Match
* Conversation
* ConversationMember
* Message
* MessageAttachment
* MessageReaction
* MessageReceipt
* Block
* Report
* ReportEvidence
* ModerationCase
* ModerationAction
* Appeal
* RiskSignal
* RiskAssessment
* Notification
* NotificationPreference
* PushToken
* SubscriptionPlan
* Subscription
* Purchase
* PaymentEvent
* FeatureFlag
* Experiment
* ExperimentAssignment
* Recommendation
* RecommendationEvent
* SupportTicket
* LegalDocument
* LegalAcceptance
* DataExportRequest
* AccountDeletionRequest
* AdminUser
* Role
* Permission
* RolePermission
* AdminRole
* AuditLog
* BackgroundJobRecord
* ApplicationConfiguration

Add:

* Foreign keys
* Unique constraints
* Check constraints where Prisma and PostgreSQL support them
* Appropriate indexes
* Composite indexes
* Partial indexes through SQL migrations where beneficial
* Created and updated timestamps
* Soft deletion only where justified
* Retention timestamps
* Optimistic version fields where needed

Use PostgreSQL features appropriately:

* PostGIS for geographic queries
* CITEXT for case-insensitive identifiers where appropriate
* UUIDs
* JSONB only for flexible metadata, not as a replacement for proper schema
* Full-text search where needed
* Transactions
* Advisory locks where justified

Do not use database enums for values expected to change frequently unless migration implications are accepted. Prefer validated text fields or lookup tables for dynamic configuration.

---

# 22. API DESIGN

Use versioned routes under:

```text
/api/v1
```

Create controllers and services for:

* auth
* accounts
* profiles
* photos
* verification
* discovery
* likes
* matches
* conversations
* messages
* blocks
* reports
* moderation
* notifications
* subscriptions
* payments
* support
* configuration
* admin
* health

Use:

* Consistent response envelopes where useful
* Standard HTTP status codes
* Cursor pagination
* Request IDs
* Idempotency keys for critical operations
* OpenAPI documentation
* DTO validation
* Global exception handling
* Domain-specific error codes
* Safe error messages
* API rate limits
* API deprecation policy

Example endpoints:

```text
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/logout-all
GET    /api/v1/auth/sessions
DELETE /api/v1/auth/sessions/:sessionId

GET    /api/v1/profile/me
PATCH  /api/v1/profile/me
POST   /api/v1/profile/photos/presign
POST   /api/v1/profile/photos/complete
PATCH  /api/v1/profile/photos/reorder
DELETE /api/v1/profile/photos/:photoId

GET    /api/v1/discovery
POST   /api/v1/discovery/:userId/like
POST   /api/v1/discovery/:userId/pass
POST   /api/v1/discovery/:userId/report

GET    /api/v1/matches
DELETE /api/v1/matches/:matchId

GET    /api/v1/conversations
GET    /api/v1/conversations/:conversationId/messages
POST   /api/v1/conversations/:conversationId/messages
POST   /api/v1/messages/:messageId/report

POST   /api/v1/users/:userId/block
DELETE /api/v1/users/:userId/block

GET    /api/v1/subscriptions/plans
GET    /api/v1/subscriptions/me
POST   /api/v1/subscriptions/verify-purchase

POST   /api/v1/account/export
POST   /api/v1/account/delete
```

---

# 23. WEBSOCKET EVENTS

Implement authenticated WebSocket connections.

Example events:

```text
connection.ready
presence.updated
conversation.join
conversation.leave
typing.started
typing.stopped
message.created
message.updated
message.deleted
message.delivered
message.read
reaction.created
reaction.deleted
match.created
match.removed
notification.created
```

Validate every payload.

Do not trust user IDs, conversation IDs, or sender IDs supplied by the client without verifying authorisation.

Support reconnection, missed-event recovery, heartbeat checks, and horizontal scaling through Redis.

---

# 24. MOBILE SCREENS

Create polished, accessible screens for:

## Authentication

* Splash
* Welcome
* Sign up
* Login
* OTP verification
* Forgot password
* Reset password
* Age confirmation
* Terms acceptance

## Onboarding

* Personal information
* Dating preferences
* Relationship intentions
* Interests
* Profile prompts
* Photo upload
* Voice introduction
* Location permission
* Notification permission
* Verification
* Profile review

## Main application

Use a bottom tab layout:

* Discover
* Likes
* Matches
* Messages
* Profile

Additional screens:

* Profile details
* Filters
* Match celebration
* Conversation
* Report
* Block confirmation
* Safety centre
* Notification settings
* Privacy settings
* Account security
* Session management
* Subscription plans
* Purchase history
* Verification status
* Help and support
* Legal documents
* Data download
* Account deletion

Handle:

* Loading
* Empty
* Error
* Offline
* Permission denied
* Suspended account
* Maintenance mode
* Mandatory application update

Do not place all logic inside screen files. Separate presentation, hooks, API services, validation, state, and domain logic.

---

# 25. UI AND USER EXPERIENCE

Create a modern, warm, trustworthy design.

Requirements:

* Consistent spacing system
* Reusable typography scale
* Light and dark themes
* Accessible contrast
* Dynamic font support
* Screen-reader labels
* Large touch targets
* Reduced-motion support
* Keyboard-safe forms
* Skeleton loaders
* Clear validation messages
* Haptic feedback used sparingly
* Smooth but efficient animations
* Responsive layouts
* Clear permission explanations
* No manipulative urgency
* No fake activity messages
* No misleading subscription buttons

Create reusable components such as:

* AppButton
* AppTextInput
* PasswordInput
* OTPInput
* ProfileCard
* PhotoCarousel
* VerificationBadge
* InterestChip
* PromptCard
* EmptyState
* ErrorState
* OfflineBanner
* ReportSheet
* ConfirmationDialog
* SubscriptionCard
* MessageBubble
* VoiceNotePlayer
* UserAvatar
* SafetyNotice

---

# 26. SECURITY

Follow OWASP recommendations for mobile applications, APIs, and web applications.

Implement:

* TLS-only production communication
* HSTS
* Secure response headers
* Strict CORS
* Input validation
* Output encoding
* SQL-injection prevention through parameterised ORM operations
* Authentication rate limiting
* Per-user and per-IP limits
* Secure password hashing
* Secret rotation
* Encryption at rest for sensitive information
* Signed object-storage URLs
* File-content validation
* Malware scanning
* EXIF metadata removal
* Token revocation
* Session monitoring
* Audit logs
* Dependency scanning
* Container scanning
* Least-privilege database access
* Separate production and staging secrets
* Backup encryption
* Restore testing
* Incident-response documentation

Never include credentials, private keys, production endpoints, or service secrets in source control.

Add `.env.example` files containing placeholders only.

Use a secrets manager in production.

---

# 27. PRIVACY AND DATA GOVERNANCE

Implement privacy by design:

* Collect only necessary information
* Explain why permissions are required
* Allow permission denial where possible
* Use approximate location
* Do not sell private user data
* Provide privacy settings
* Provide account deletion
* Provide data export
* Maintain legal-consent versions
* Maintain retention schedules
* Delete expired verification artifacts
* Anonymise analytics where possible
* Restrict administrative access
* Log sensitive-data access

Create configurable retention policies for:

* Authentication logs
* Chat messages
* Deleted accounts
* Reports
* Verification media
* Payment records
* Audit logs
* Backups

Do not claim compliance with any law merely because features exist. Add a documentation section listing items that require review by a qualified lawyer before launch.

---

# 28. PERFORMANCE AND SCALABILITY

Design for an initial target of:

* 100,000 registered users
* 10,000 daily active users
* Thousands of concurrent WebSocket connections
* Millions of messages
* Large photo storage

Implement:

* Cursor pagination
* Indexed geographic queries
* Redis caching
* Background jobs
* Asynchronous notifications
* Image resizing
* CDN-ready media delivery
* Database connection pooling
* Query analysis
* N+1 query prevention
* Graceful WebSocket scaling
* Retry policies
* Circuit breakers for external providers
* Idempotent workers
* Dead-letter queues
* Graceful shutdown

Do not prematurely split the system into many microservices. Document clear scaling boundaries.

---

# 29. BACKGROUND JOBS

Use BullMQ for:

* Email delivery
* SMS delivery
* Push notifications
* Image processing
* Image moderation
* Verification processing
* Match notifications
* Recommendation generation
* Subscription reconciliation
* Webhook retries
* Data exports
* Account deletion
* Retention cleanup
* Analytics aggregation
* Risk-score recalculation

Every job must have:

* Unique identifier
* Retry policy
* Exponential backoff
* Timeout
* Idempotency protection
* Structured logging
* Failure storage
* Dead-letter handling
* Admin visibility where appropriate

---

# 30. OBSERVABILITY

Implement:

* Structured JSON logging
* Correlation IDs
* Request IDs
* User ID logging only where appropriate
* Error monitoring
* Performance tracing
* Health checks
* Readiness checks
* Liveness checks
* Metrics
* Alert-friendly logs
* Queue metrics
* Database metrics
* WebSocket metrics
* External-provider metrics

Never log:

* Passwords
* Tokens
* OTP values
* Full identity documents
* Private message content by default
* Full payment credentials
* Exact GPS coordinates unless strictly required and protected

---

# 31. ANALYTICS

Track privacy-conscious product events:

* Registration started
* Registration completed
* Onboarding step completed
* Profile published
* Verification started
* Verification completed
* Discovery card viewed
* Like sent
* Match created
* Conversation started
* Message sent
* Report submitted
* Subscription viewed
* Purchase completed
* Account paused
* Account deleted

Create funnel and retention reports.

Avoid collecting message content for general analytics.

Add an analytics-provider abstraction so the provider can be changed.

---

# 32. TESTING

Create:

## Backend tests

* Unit tests
* Integration tests
* API end-to-end tests
* Authentication tests
* Permission tests
* Database transaction tests
* WebSocket tests
* Queue tests
* Payment-webhook tests
* Rate-limit tests
* File-upload security tests

## Mobile tests

* Unit tests
* Component tests
* Hook tests
* Form-validation tests
* Navigation tests
* API integration tests
* Offline-state tests
* Authentication-flow tests
* Detox or Maestro end-to-end tests

## Admin tests

* Component tests
* Permission tests
* Moderation-workflow tests
* End-to-end tests

Test important edge cases:

* Duplicate likes
* Simultaneous mutual likes
* Duplicate payment webhooks
* Refresh-token reuse
* Blocked-user messaging
* Unmatched-user messaging
* Deleted accounts
* Suspended accounts
* Expired signed URLs
* Failed media processing
* WebSocket reconnection
* Offline message sending
* Incomplete onboarding
* Underage registration attempt
* Moderator permission violations

Set meaningful coverage thresholds, but prioritise critical-path quality over artificially high coverage numbers.

---

# 33. CI/CD

Create GitHub Actions workflows for:

* Dependency installation
* Formatting
* Linting
* Type checking
* Unit tests
* Integration tests
* Build verification
* Prisma migration validation
* Security scanning
* Docker image building
* Staging deployment
* Production deployment with approval
* Mobile preview builds
* Mobile production builds

Production deployment must require protected branches and manual approval.

Database migrations must run as controlled release steps. Do not automatically run destructive schema operations.

---

# 34. LOCAL DEVELOPMENT

Create a complete local setup using Docker Compose for:

* PostgreSQL
* Redis
* S3-compatible local object storage
* Mail testing service
* API
* Background worker
* Admin portal

Provide commands such as:

```bash
pnpm install
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
pnpm test
pnpm lint
pnpm typecheck
```

Create safe development seed data with fictional adult users only.

Do not use real personal information or copyrighted profile images.

---

# 35. DEPLOYMENT

Provide production deployment documentation for an Ubuntu server or managed container platform.

Include:

* DNS
* TLS certificates
* Reverse proxy
* Container deployment
* Environment variables
* PostgreSQL configuration
* Redis configuration
* Object storage
* Backups
* Cron or scheduled jobs
* Worker deployment
* Monitoring
* Log rotation
* Firewall
* SSH hardening
* Rollback
* Disaster recovery
* Database restoration test

Support separate environments:

* Local
* Test
* Staging
* Production

Do not use PostgreSQL beta versions in production.

---

# 36. DOCUMENTATION

Create:

* Root README
* Architecture document
* Database entity relationship documentation
* API documentation
* WebSocket documentation
* Mobile setup guide
* Admin setup guide
* Deployment guide
* Security guide
* Moderation guide
* Incident-response guide
* Backup and restoration guide
* Environment-variable reference
* Testing guide
* Release checklist
* App-store submission checklist
* Privacy and legal-review checklist

Include Mermaid diagrams for:

* System architecture
* Authentication sequence
* Matching sequence
* Chat sequence
* Media-upload sequence
* Verification workflow
* Moderation workflow
* Subscription workflow
* Deployment architecture

---

# 37. IMPLEMENTATION PHASES

Implement the system in phases.

## Phase 1: Foundation

* Monorepo
* Shared configuration
* Docker Compose
* PostgreSQL
* Redis
* NestJS API
* Expo application
* Admin portal
* CI pipeline
* Authentication foundation

## Phase 2: Profiles and onboarding

* Adult-age validation
* User profile
* Preferences
* Photos
* Interests
* Prompts
* Location
* Profile completion
* Verification foundation

## Phase 3: Discovery and matching

* Candidate generation
* Filters
* Likes
* Passes
* Mutual matches
* Match notifications
* Recommendation event tracking

## Phase 4: Communication

* Conversations
* WebSocket gateway
* Text chat
* Delivery receipts
* Read receipts
* Typing state
* Push notifications
* Attachments
* Voice notes

## Phase 5: Safety and moderation

* Blocks
* Reports
* Risk signals
* Moderation queues
* Content moderation
* Appeals
* Audit logs
* Safety centre

## Phase 6: Monetisation

* Plans
* Entitlements
* Apple purchases
* Google purchases
* Webhooks
* Restore purchases
* Subscription administration

## Phase 7: Hardening

* Security review
* Performance tests
* Load tests
* Accessibility review
* Failure testing
* Backup restoration
* Monitoring
* Store submission
* Production deployment

Complete and test each phase before beginning dependent work.

---

# 38. REQUIRED WORKING METHOD

Follow these rules while implementing:

1. Start by creating `docs/architecture.md` and `docs/implementation-plan.md`.
2. Record assumptions.
3. List exact stable package versions selected.
4. Explain compatibility decisions.
5. Generate the monorepo structure.
6. Configure linting, formatting, strict TypeScript, testing, and environment validation.
7. Implement one vertical feature at a time.
8. Run formatting, linting, type checking, and tests after every major feature.
9. Fix errors instead of disabling rules.
10. Never use `any` unnecessarily.
11. Never leave critical functions as pseudocode.
12. Never hide errors with empty catch blocks.
13. Never place business logic directly in controllers.
14. Never trust client-provided authorisation data.
15. Never hard-code secrets.
16. Never claim a feature works without testing it.
17. Add comments only where they explain non-obvious decisions.
18. Keep documentation updated as the architecture changes.
19. Use migrations for all database schema changes.
20. Stop and clearly document any external credentials or legal decisions required from the project owner.

---

# 39. FIRST DELIVERABLE

Begin by producing:

1. Architecture overview
2. Technology-version table
3. Monorepo directory tree
4. Database entity overview
5. Authentication design
6. Security model
7. Adult-age and verification design
8. Matching-system design
9. Chat architecture
10. Moderation architecture
11. Subscription architecture
12. Deployment architecture
13. Implementation milestones
14. Environment-variable list
15. Initial Docker Compose configuration
16. Initial Prisma schema
17. NestJS module structure
18. Expo Router route structure
19. Admin portal route structure
20. Setup commands

After presenting the plan, immediately begin implementing Phase 1. Do not stop after writing an outline.

At the end of each phase, provide:

* Files created
* Files modified
* Commands executed
* Tests executed
* Test results
* Remaining known issues
* Security considerations
* Next phase tasks

The final system must be runnable locally, testable, documented, deployable, and prepared for Android and iOS production releases.
