import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { MetricsService } from './metrics/metrics.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  const metrics = app.get(MetricsService);

  app.use(
    (
      request: {
        header(name: string): string | undefined;
        method: string;
        path: string;
      },
      response: {
        setHeader(name: string, value: string): void;
        statusCode: number;
        on(event: 'finish', listener: () => void): void;
      },
      next: () => void,
    ) => {
      const requestId = request.header('x-request-id') ?? randomUUID();
      const startedAt = Date.now();
      response.setHeader('X-Request-Id', requestId);
      // Discovery and other authenticated responses are personalized and must not be served as 304s.
      if (request.path.startsWith('/api/')) {
        response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        response.setHeader('Pragma', 'no-cache');
        response.setHeader('Expires', '0');
      }
      response.on('finish', () => {
        console.log(
          JSON.stringify({
            event: 'http.request',
            requestId,
            method: request.method,
            path: request.path,
            statusCode: response.statusCode,
          durationMs: Date.now() - startedAt,
        }),
      );
      metrics.recordRequest(request.method, request.path, response.statusCode, Date.now() - startedAt);
      });
      next();
    },
  );

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
