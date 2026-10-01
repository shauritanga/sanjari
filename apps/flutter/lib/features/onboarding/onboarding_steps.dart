/// Onboarding step catalogue. Pure-Dart port of
/// apps/mobile/src/onboarding/steps.ts: the ordered 24-step flow, 1-indexed
/// step numbers, path helpers, and the login-resume rule.
class OnboardingStep {
  const OnboardingStep({required this.key, required this.path});

  final String key;
  final String path;
}

const List<OnboardingStep> onboardingSteps = [
  OnboardingStep(key: 'age', path: '/onboarding/age'),
  OnboardingStep(key: 'terms', path: '/onboarding/terms'),
  OnboardingStep(
      key: 'registration-method', path: '/onboarding/registration-method'),
  OnboardingStep(key: 'birthday', path: '/onboarding/birthday'),
  OnboardingStep(key: 'gender', path: '/onboarding/gender'),
  OnboardingStep(key: 'who-to-meet', path: '/onboarding/who-to-meet'),
  OnboardingStep(key: 'intentions', path: '/onboarding/intentions'),
  OnboardingStep(key: 'name', path: '/onboarding/name'),
  OnboardingStep(key: 'photos', path: '/onboarding/photos'),
  OnboardingStep(key: 'country', path: '/onboarding/country'),
  OnboardingStep(key: 'city', path: '/onboarding/city'),
  OnboardingStep(key: 'bio', path: '/onboarding/bio'),
  OnboardingStep(key: 'interests', path: '/onboarding/interests'),
  OnboardingStep(key: 'prompts', path: '/onboarding/prompts'),
  OnboardingStep(key: 'languages', path: '/onboarding/languages'),
  OnboardingStep(
      key: 'discovery-preferences', path: '/onboarding/discovery-preferences'),
  OnboardingStep(key: 'location', path: '/onboarding/location'),
  OnboardingStep(key: 'privacy', path: '/onboarding/privacy'),
  OnboardingStep(key: 'verification', path: '/onboarding/verification'),
  OnboardingStep(key: 'notifications', path: '/onboarding/notifications'),
  OnboardingStep(key: 'voice-intro', path: '/onboarding/voice-intro'),
  OnboardingStep(key: 'review', path: '/onboarding/review'),
  OnboardingStep(key: 'publish', path: '/onboarding/publish'),
];

int get totalOnboardingSteps => onboardingSteps.length;

int _indexOf(String key) =>
    onboardingSteps.indexWhere((step) => step.key == key);

/// 1-indexed step number; unknown keys resolve to 1 like the TS version
/// (`stepIndex.get(key) ?? 0) + 1`).
int stepNumber(String key) {
  final index = _indexOf(key);
  return (index < 0 ? 0 : index) + 1;
}

/// Path for a step key, falling back to the first step's path.
String pathForStep(String key) {
  final index = _indexOf(key);
  if (index < 0) return onboardingSteps.first.path;
  return onboardingSteps[index].path;
}

/// Path of the step after [key], or null when [key] is the last step.
/// Unknown keys resolve to the first step's path, matching the TS version
/// (`ONBOARDING_STEPS[(stepIndex.get(key) ?? -1) + 1]`).
String? nextStepPath(String key) {
  final index = _indexOf(key);
  final next = (index < 0 ? -1 : index) + 1;
  if (next >= onboardingSteps.length) return null;
  return onboardingSteps[next].path;
}

/// Where a logging-in user resumes, given the server-tracked
/// [onboardingStep] (1-indexed, matching [stepNumber]). Registration always
/// happens after the age/terms/registration-method screens, so the earliest
/// resume point is 'birthday' even when the server step is still 1.
String resumeOnboardingPath(int onboardingStep) {
  final earliest = stepNumber('birthday') - 1;
  final index = onboardingStep > earliest ? onboardingStep : earliest;
  if (index < 0 || index >= onboardingSteps.length) {
    return pathForStep('birthday');
  }
  return onboardingSteps[index].path;
}
