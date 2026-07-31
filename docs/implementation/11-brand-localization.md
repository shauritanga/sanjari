# W11 Brand, UX, And Localization

## Objective

Make Sanjari recognizable, calm, inclusive, and consistent across mobile, admin, notifications, and operational content.

## Design System

- Use Manrope with clear hierarchy and readable body sizes.
- Define light and dark tokens from the brand guide: coral `#E85D75`, deep plum `#4A2545`, gold `#F4B860`, warm background `#FFF9F7`, surfaces, accessible text, success, and error colors.
- Keep the logo concept as two connected paths forming a subtle S; use the approved app-icon treatment rather than recreating it ad hoc.
- Use coral for primary actions, plum for structure and contrast, and gold sparingly for highlights.
- Provide focus states, minimum touch targets, reduced-motion behavior, readable contrast, and screen-reader labels.

## Content And Voice

- Tone: warm, confident, respectful, hopeful, and human.
- Prefer “meaningful connections,” “shared interests,” “your path,” and “people who align with you.”
- Avoid manipulative urgency, guarantees, shame, exaggerated safety claims, and language implying verification proves character.
- Main tagline: “Meet someone who matches your path.”
- Swahili tagline: “Kutana na anayelingana nawe.”

## Localization

- English and Swahili are first-class locales from the first release.
- Translate product, validation, safety, legal, notification, subscription, and moderation copy; do not concatenate translated fragments.
- Support locale-aware dates, numbers, pluralization, and long-text expansion.
- Swahili content receives human review for meaning, tone, and safety terminology.

## Acceptance Criteria

- No hard-coded user-facing string remains in a production screen or notification template.
- All critical flows render correctly in both locales and dark/light themes.
- Brand tokens are shared where safe, while backend packages never import UI assets or secrets.
