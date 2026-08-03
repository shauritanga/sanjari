import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';
import { StorageService } from './storage.service';

export type VerificationProvider = 'selfie_liveness' | 'identity_document';

export interface VerificationProviderAdapter {
  readonly name: VerificationProvider;
  createSession(userId: string): Promise<{ providerSessionId: string }>;
}

const RETENTION_DAYS = 180;

@Injectable()
export class VerificationService {
  private readonly adapters = new Map<VerificationProvider, VerificationProviderAdapter>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  register(adapter: VerificationProviderAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  private assertType(type: VerificationProvider) {
    if (type !== 'selfie_liveness' && type !== 'identity_document') {
      throw new BadRequestException({
        code: 'INVALID_VERIFICATION_TYPE',
        message: 'Verification type is invalid.',
      });
    }
  }

  async presign(userId: string, type: VerificationProvider, mimeType: string) {
    this.assertType(type);
    return this.storage.presignVerification(userId, mimeType);
  }

  async request(userId: string, type: VerificationProvider, storageKey: string) {
    this.assertType(type);
    if (!storageKey.startsWith(`verification/${userId}/`)) {
      throw new BadRequestException({
        code: 'INVALID_VERIFICATION_ARTIFACT',
        message: 'The uploaded artifact does not belong to this account.',
      });
    }
    const adapter = this.adapters.get(type);
    const session = adapter ? await adapter.createSession(userId) : undefined;
    const verificationCase = await this.prisma.$transaction(async (tx) => {
      const created = await tx.verificationCase.create({
        data: { userId, type, status: 'submitted', provider: adapter?.name ?? 'manual_review' },
        select: { id: true, type: true, status: true, provider: true, createdAt: true },
      });
      await tx.verificationArtifact.create({
        data: {
          caseId: created.id,
          storageKey,
          artifactType: type === 'selfie_liveness' ? 'selfie' : 'identity_document',
          retentionUntil: new Date(Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000),
        },
      });
      await tx.auditLog.create({
        data: {
          userId,
          actorType: 'user',
          action: 'verification.requested',
          metadata: {
            caseId: created.id,
            type,
            storageKey,
            providerSessionId: session?.providerSessionId,
          },
        },
      });
      return created;
    });
    return verificationCase;
  }

  async status(userId: string) {
    return this.prisma.verificationCase.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        status: true,
        provider: true,
        confidence: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
