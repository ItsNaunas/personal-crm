import { NestFactory } from '@nestjs/core';
import * as express from 'express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

function validateEnv(): void {
  const logger = new Logger('Bootstrap');
  if (!process.env.DATABASE_URL?.trim()) {
    logger.error('DATABASE_URL is required. Set it in .env or environment.');
    process.exit(1);
  }
  const aiProvider = process.env.AI_PROVIDER ?? 'openai';
  if (aiProvider === 'openai' && !process.env.OPENAI_API_KEY?.trim()) {
    logger.warn(
      'OPENAI_API_KEY is not set. AI-backed jobs (qualify_lead, analyze_call, weekly report) will fail until it is set.',
    );
  }
  if (!process.env.API_SECRET_KEY?.trim()) {
    logger.warn(
      'API_SECRET_KEY is not set. All endpoints are unauthenticated. Set this before deploying to production.',
    );
  }
}

async function bootstrap() {
  validateEnv();

  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  const logger = new Logger('Bootstrap');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  // CORS — restrict to explicit allow-list in production
  const isProd = process.env.NODE_ENV === 'production';
  const rawOrigins = (process.env.ALLOWED_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean);

  if (isProd && rawOrigins.length > 0) {
    app.enableCors({ origin: rawOrigins, methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'] });
  } else if (!isProd) {
    app.enableCors();
  }
  // In production with no ALLOWED_ORIGINS set: CORS disabled (API only, no browser access)

  // Swagger — dev only
  if (!isProd) {
    const config = new DocumentBuilder()
      .setTitle('Personal CRM API')
      .setDescription('Production-grade state-driven CRM with internal workflow engine')
      .setVersion('1.0')
      .addApiKey({ type: 'apiKey', in: 'header', name: 'x-org-id' }, 'org-id')
      .addApiKey({ type: 'apiKey', in: 'header', name: 'x-api-key' }, 'api-key')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    logger.log(`Swagger docs at http://localhost:${process.env.PORT ?? 3000}/api/docs`);
  }

  // Health check — always public, used by Railway/Docker
  app.getHttpAdapter().get('/health', (_req: unknown, res: { json: (v: unknown) => void }) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Application running on port ${port}`);
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
