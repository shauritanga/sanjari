import { Injectable, ServiceUnavailableException } from '@nestjs/common';

export type SocialProvider = 'google' | 'apple';

export interface SocialIdentity {
  provider: SocialProvider;
  subject: string;
  email: string;
  emailVerified: boolean;
}

export interface SocialAuthProvider {
  readonly name: SocialProvider;
  verifyCredential(credential: string): Promise<SocialIdentity>;
}

@Injectable()
export class SocialAuthService {
  private readonly providers = new Map<SocialProvider, SocialAuthProvider>();

  register(provider: SocialAuthProvider): void {
    this.providers.set(provider.name, provider);
  }

  async verify(provider: SocialProvider, credential: string): Promise<SocialIdentity> {
    const adapter = this.providers.get(provider);
    if (!adapter) {
      throw new ServiceUnavailableException({
        code: 'SOCIAL_PROVIDER_NOT_CONFIGURED',
        message: `${provider} authentication is not configured.`,
      });
    }
    return adapter.verifyCredential(credential);
  }
}
