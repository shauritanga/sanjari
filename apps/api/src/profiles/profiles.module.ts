import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { StorageService } from './storage.service';
import { VerificationService } from './verification.service';

@Module({
  imports: [AuthModule],
  controllers: [ProfilesController],
  providers: [ProfilesService, StorageService, VerificationService],
  exports: [StorageService],
})
export class ProfilesModule {}
