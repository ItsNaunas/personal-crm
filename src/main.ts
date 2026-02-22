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

  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('Personal CRM API')
    .setDescription('Production-grade state-driven CRM with internal workflow engine')
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', in: 'header', name: 'x-org-id' }, 'org-id')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Application running on http://localhost:${port}`);
  logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
