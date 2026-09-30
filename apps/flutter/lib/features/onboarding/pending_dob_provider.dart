import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Date of birth captured on the pre-auth /onboarding/age gate, carried in
/// memory to the email/phone sign-up forms so a member isn't asked for it
/// twice. Unauthenticated screens only — there is no server-backed draft
/// to persist it in before an account exists.
final pendingDateOfBirthProvider = StateProvider<DateTime?>((ref) => null);
