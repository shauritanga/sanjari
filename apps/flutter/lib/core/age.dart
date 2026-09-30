const int minimumAge = 18;

/// Age on [now]. Mirrors calculateAge() in apps/api/src/auth/auth.service.ts
/// so the client can reject an under-18 date of birth immediately, before
/// any network round trip — the server re-checks this authoritatively.
int calculateAgeOn(DateTime dateOfBirth, DateTime now) {
  var age = now.year - dateOfBirth.year;
  final hadBirthdayThisYear = now.month > dateOfBirth.month ||
      (now.month == dateOfBirth.month && now.day >= dateOfBirth.day);
  if (!hadBirthdayThisYear) age -= 1;
  return age;
}
