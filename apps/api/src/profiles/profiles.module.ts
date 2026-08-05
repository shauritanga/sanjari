import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from '../auth/auth.module';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { StorageService } from './storage.service';
import { VerificationService } from './verification.service';
import { PhotoScanService } from './photo-scan.service';
import { PhotoScanWorker } from './photo-scan.worker';

const workerProviders = process.env.RUN_WORKERS === 'true' ? [PhotoScanWorker] : [];

@Module({
  imports: [
    AuthModule,
    BullModule.registerQueue({
      name: 'photo-scan',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 1000,
      },
    }),
  ],
  controllers: [ProfilesController],
  providers: [ProfilesService, StorageService, VerificationService, PhotoScanService, ...workerProviders],
  exports: [ProfilesService, StorageService, PhotoScanService],
})
export class ProfilesModule {}
