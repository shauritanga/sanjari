import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);

  app.use(helmet());
  app.enableCors({
    origin: config.getOrThrow<string>('ADMIN_PUBLIC_URL'),
    credentials: true
  });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Sanjari API')
    .setDescription('Versioned API for the Sanjari dating platform.')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.createDocument(app, swaggerConfig);

  await app.listen(config.get<number>('PORT', 4000));
}

void bootstrap();
