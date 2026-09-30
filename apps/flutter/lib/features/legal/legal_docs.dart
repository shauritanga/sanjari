// Legal document content. Pure Dart so section integrity stays
// unit-testable. Ports the SECTIONS arrays from
// apps/mobile/app/settings/legal/terms.tsx and
// apps/mobile/app/settings/legal/privacy-policy.tsx verbatim — like Expo,
// the legal copy itself is English-only; only the screen chrome is
// localized.
class LegalSection {
  const LegalSection({required this.title, required this.body});

  final String title;
  final String body;
}

const termsSections = [
  LegalSection(
    title: '1. Who we are',
    body:
        'Sanjari is a service for adults seeking meaningful, marriage-minded connections. By creating an account you confirm you are at least 18 years old and are using Sanjari for genuine, respectful purposes.',
  ),
  LegalSection(
    title: '2. Your account',
    body:
        'You are responsible for the accuracy of the information you provide and for keeping your login credentials secure. One person may hold only one active account.',
  ),
  LegalSection(
    title: '3. Community standards',
    body:
        'Harassment, hate speech, impersonation, solicitation, and any content that endangers another member is prohibited and may result in suspension or a permanent ban, with or without notice.',
  ),
  LegalSection(
    title: '4. Safety is shared',
    body:
        'Verification badges reflect checks Sanjari has performed; they do not guarantee a member’s identity, intentions, or safety. Always meet new connections in public and tell someone you trust.',
  ),
  LegalSection(
    title: '5. Subscriptions',
    body:
        'Paid features are billed through the app store you used to install Sanjari and are managed through your app store account settings.',
  ),
  LegalSection(
    title: '6. Changes to these terms',
    body:
        'We may update these terms as Sanjari evolves. Continued use of the app after an update means you accept the revised terms.',
  ),
  LegalSection(
    title: '7. Contact',
    body:
        'Questions about these terms can be sent to support through the Safety Centre in the app.',
  ),
];

const privacySections = [
  LegalSection(
    title: '1. What we collect',
    body:
        'Profile details you provide, photos, messages, approximate location, and device information needed to run and secure the app.',
  ),
  LegalSection(
    title: '2. How we use it',
    body:
        'To show you compatible members, protect the community from fraud and abuse, and improve matching quality. We do not sell your personal data.',
  ),
  LegalSection(
    title: '3. Who can see what',
    body:
        'Other members see the profile fields you choose to share. Fields you hide in Settings are never shown in Discover, profile pages, or shared links.',
  ),
  LegalSection(
    title: '4. Chaperone and contacts features',
    body:
        'If you enable a chaperone contact, message copies are sent only to the email you provide, only while forwarding is switched on. Contacts-based blocking sends one-way scrambled fingerprints of phone numbers, never the numbers themselves, and nothing from your contacts is stored on our servers.',
  ),
  LegalSection(
    title: '5. Your controls',
    body:
        'You can export a copy of your data, deactivate your account temporarily, or delete it permanently from the Safety Centre at any time.',
  ),
  LegalSection(
    title: '6. Retention',
    body:
        'We keep data only as long as needed to run the service or as required by law, then delete or anonymize it.',
  ),
  LegalSection(
    title: '7. Contact',
    body:
        'Privacy questions can be sent to support through the Safety Centre in the app.',
  ),
];
