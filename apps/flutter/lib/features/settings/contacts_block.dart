import 'dart:convert';

import 'package:crypto/crypto.dart';

/// Privacy-preserving contacts matching. Pure-Dart port of the normalize +
/// hash half of apps/mobile/app/settings/contacts-block.tsx: phone numbers
/// are normalized to E.164-ish form and SHA-256 hashed on device, so only
/// one-way fingerprints reach POST /contacts/block — raw contacts never
/// leave the phone.
String? normalizePhone(String raw) {
  final stripped = raw.replaceAll(RegExp(r'[\s().-]'), '');
  if (!RegExp(r'^\+[1-9]\d{7,14}$').hasMatch(stripped)) return null;
  return stripped;
}

/// Deduplicated SHA-256 hex fingerprints for the given raw numbers.
List<String> hashContactNumbers(Iterable<String> rawNumbers) {
  final numbers = <String>{};
  for (final raw in rawNumbers) {
    final normalized = normalizePhone(raw);
    if (normalized != null) numbers.add(normalized);
  }
  return [
    for (final number in numbers)
      sha256.convert(utf8.encode(number)).toString(),
  ];
}
