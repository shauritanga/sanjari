import type { ApiEnvelope } from '@sanjari/types';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}

export interface CurrentUserResponse {
  id: string;
  email: string;
  ageVerified: boolean;
  onboardingStatus: string;
}

export type AuthResponse = ApiEnvelope<AuthTokens>;
export type MeResponse = ApiEnvelope<CurrentUserResponse>;
