# Requirements Traceability

This matrix maps the master prompt and brand guide to implementation workstreams. The prompt remains the source of product requirements; this document identifies where each requirement is delivered and verified.

| Prompt sections | Requirement area                                    | Plan               | Verification                          |
| --------------- | --------------------------------------------------- | ------------------ | ------------------------------------- |
| 1-4             | Product goals, stack, monorepo                      | W01, W11           | Architecture review, CI               |
| 5-6             | Roles, permissions, authentication                  | W02, W07           | API authorization tests, audit review |
| 7-9             | Onboarding, profiles, verification                  | W02, W03           | Mobile flow tests, moderation review  |
| 10-12           | Discovery, scoring, matches                         | W04                | Invariant and concurrency tests       |
| 13-15           | Chat, starters, safety centre                       | W05, W06           | WebSocket, privacy, abuse tests       |
| 16-18           | Moderation, risk, notifications                     | W06, W07           | Queue and action audit tests          |
| 19-20           | Subscriptions and admin portal                      | W07, W08           | Provider sandbox and RBAC tests       |
| 21-23           | Database, REST, WebSockets                          | W01, W04-W08       | Contract and migration tests          |
| 24-25           | Mobile screens and UX                               | W02-W06, W11       | Accessibility and device checks       |
| 26-30           | Security, privacy, performance, jobs, observability | W01, W06, W09, W10 | Security, load, restore, alert tests  |
| 31-36           | Analytics, testing, CI/CD, deployment, docs         | W09, W10           | Release gates                         |
| 37-39           | Phases and working method                           | All workstreams    | Milestone review                      |
| Brand 1-8       | Name, positioning, palette, typography              | W11                | Token and visual review               |
| Brand 9-16      | Logo, voice, messages, mobile welcome               | W02, W11           | Content and UI review                 |
| Brand 17-21     | Marketing, email identity, final package            | W09, W11           | Legal and launch review               |

## Completion Vocabulary

- Planned: requirements are defined but implementation has not started.
- In progress: code or design exists, but acceptance criteria are incomplete.
- Implemented: acceptance criteria and automated checks pass in development.
- Launch-ready: implemented plus legal, operational, security, and release gates pass.
