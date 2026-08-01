import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';

export type VerificationProvider = 'selfie_liveness' | 'identity_document';

export interface VerificationProviderAdapter {
  readonly name: VerificationProvider;
  createSession(userId: string): Promise<{ providerSessionId: string }>;
}

@Injectable()
export class VerificationService {
  private readonly adapters = new Map<VerificationProvider, VerificationProviderAdapter>();

  constructor(private readonly prisma: PrismaService) {}

  register(adapter: VerificationProviderAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  async request(userId: string, type: VerificationProvider) {
    if (type !== 'selfie_liveness' && type !== 'identity_document') {
      throw new BadRequestException({
        code: 'INVALID_VERIFICATION_TYPE',
        message: 'Verification type is invalid.',
      });
    }
    const adapter = this.adapters.get(type);
    const session = adapter ? await adapter.createSession(userId) : undefined;
    const verificationCase = await this.prisma.verificationCase.create({
      data: { userId, type, status: 'submitted', provider: adapter?.name ?? 'manual_review' },
      select: { id: true, type: true, status: true, provider: true, createdAt: true },
    });
    await this.prisma.auditLog.create({
      data: {
        userId,
        actorType: 'user',
        action: 'verification.requested',
        metadata: {
          caseId: verificationCase.id,
          type,
          providerSessionId: session?.providerSessionId,
        },
      },
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
