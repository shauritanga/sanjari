export const ONBOARDING_STEPS = [
  { key: 'age', path: '/onboarding/age' },
  { key: 'terms', path: '/onboarding/terms' },
  { key: 'registration-method', path: '/onboarding/registration-method' },
  { key: 'birthday', path: '/onboarding/birthday' },
  { key: 'gender', path: '/onboarding/gender' },
  { key: 'who-to-meet', path: '/onboarding/who-to-meet' },
  { key: 'intentions', path: '/onboarding/intentions' },
  { key: 'name', path: '/onboarding/name' },
  { key: 'photos', path: '/onboarding/photos' },
  { key: 'country', path: '/onboarding/country' },
  { key: 'city', path: '/onboarding/city' },
  { key: 'bio', path: '/onboarding/bio' },
  { key: 'interests', path: '/onboarding/interests' },
  { key: 'prompts', path: '/onboarding/prompts' },
  { key: 'languages', path: '/onboarding/languages' },
  { key: 'discovery-preferences', path: '/onboarding/discovery-preferences' },
  { key: 'location', path: '/onboarding/location' },
  { key: 'privacy', path: '/onboarding/privacy' },
  { key: 'verification', path: '/onboarding/verification' },
  { key: 'notifications', path: '/onboarding/notifications' },
  { key: 'voice-intro', path: '/onboarding/voice-intro' },
  { key: 'review', path: '/onboarding/review' },
  { key: 'publish', path: '/onboarding/publish' }
] as const;

export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number]['key'];

export const TOTAL_ONBOARDING_STEPS = ONBOARDING_STEPS.length;

const stepIndex = new Map(ONBOARDING_STEPS.map((entry, index) => [entry.key, index]));

export function stepNumber(key: OnboardingStepKey): number {
  return (stepIndex.get(key) ?? 0) + 1;
}

export function pathForStep(key: OnboardingStepKey): string {
  const index = stepIndex.get(key) ?? 0;
  return ONBOARDING_STEPS[index]?.path ?? ONBOARDING_STEPS[0].path;
}

export function nextStepPath(key: OnboardingStepKey): string | null {
  const index = stepIndex.get(key) ?? -1;
  const next = ONBOARDING_STEPS[index + 1];
  return next ? next.path : null;
}

/**
 * Resolves where a logging-in user should resume onboarding, given the
 * server-tracked `onboardingStep` (1-indexed, matching `stepNumber`).
 * Registration always happens after the age/terms/registration-method
 * screens, so the earliest possible resume point is 'birthday' even if
 * onboardingStep is still at its default of 1.
 */
export function resumeOnboardingPath(onboardingStep: number): string {
  const index = Math.max(onboardingStep, stepNumber('birthday') - 1);
  return ONBOARDING_STEPS[index]?.path ?? pathForStep('birthday');
}
