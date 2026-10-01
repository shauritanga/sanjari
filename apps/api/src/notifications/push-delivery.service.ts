import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { PrismaService } from '../common/database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';

export interface PushProvider {
  readonly name: string;
  send(token: string, payload: { title: string; body: string }): Promise<void>;
}

@Injectable()
export class PushDeliveryService {
  private provider?: PushProvider;
  private readonly firebase?: Messaging;
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    if (this.config.get<string>('PUSH_PROVIDER') !== 'firebase') return;
    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.config.get<string>('FIREBASE_CLIENT_EMAIL');
    let privateKey = this.config
      .get<string>('FIREBASE_PRIVATE_KEY')
      ?.replace(/\\n/g, '\n');
    const serviceAccountPath = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH');
    if ((!projectId || !clientEmail || !privateKey) && serviceAccountPath) {
      try {
        const account = JSON.parse(readFileSync(serviceAccountPath, 'utf8')) as {
          project_id?: string;
          client_email?: string;
          private_key?: string;
        };
        if (account.project_id && account.client_email && account.private_key) {
          const app = getApps()[0] ?? initializeApp({
            credential: cert({
              projectId: account.project_id,
              clientEmail: account.client_email,
              privateKey: account.private_key,
            }),
          });
          this.firebase = getMessaging(app);
        }
      } catch {
        // The provider remains unconfigured and returns a clear API error.
      }
      return;
    }
    if (!projectId || !clientEmail || !privateKey) return;
    const app = getApps()[0] ?? initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
    this.firebase = getMessaging(app);
  }
  register(provider: PushProvider) {
    this.provider = provider;
  }
  async deliverGeneric(userId: string, category: string) {
    const preference = await this.prisma.notificationPreference.findUnique({
      where: { userId_category: { userId, category } },
      select: { push: true },
    });
    if (preference?.push === false) return { delivered: false, reason: 'disabled' };
    const providerName = this.config.get<string>('PUSH_PROVIDER');
    if (providerName === 'firebase' && !this.firebase)
      throw new ServiceUnavailableException({
        code: 'PUSH_PROVIDER_NOT_CONFIGURED',
        message: 'Firebase push delivery is not configured.',
      });
    if (!this.provider && providerName !== 'local' && providerName !== 'firebase')
      throw new ServiceUnavailableException({
        code: 'PUSH_PROVIDER_NOT_CONFIGURED',
        message: 'Push delivery is not configured.',
      });
    const tokens = await this.prisma.pushToken.findMany({
      where: { userId },
      select: { token: true },
    });
    if (this.firebase)
      await Promise.all(
        tokens.map((token) =>
          this.firebase!.send({
            token: token.token,
            notification: {
              title: 'New Sanjari activity',
              body: 'You have a new notification.',
            },
            android: { priority: 'high' },
            apns: { payload: { aps: { sound: 'default' } } },
          }),
        ),
      );
    else if (this.provider)
      await Promise.all(
        tokens.map((token) =>
          this.provider!.send(token.token, {
            title: 'New Sanjari activity',
            body: 'You have a new notification.',
          }),
        ),
      );
    return { delivered: tokens.length > 0 };
  }
}
