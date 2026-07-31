import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { appConfigSchema } from './common/config/app-config.schema';
import { DatabaseModule } from './common/database/database.module';
import { ConversationsModule } from './conversations/conversations.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { HealthModule } from './health/health.module';
import { MatchesModule } from './matches/matches.module';
import { ModerationModule } from './moderation/moderation.module';
import { ProfilesModule } from './profiles/profiles.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
      validate: (env) => appConfigSchema.parse(env)
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    DatabaseModule,
    HealthModule,
    AuthModule,
    ProfilesModule,
    DiscoveryModule,
    MatchesModule,
    ConversationsModule,
    ModerationModule,
    SubscriptionsModule
  ]
})
export class AppModule {}
