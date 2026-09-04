import 'reflect-metadata';
import './common/money/decimal-config';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { mongoSanitize } from './common/security/mongo-sanitize.middleware';
import type { AppConfig } from './config/configuration';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  const configService = app.get(ConfigService<AppConfig, true>);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: { defaultSrc: ["'self'"], objectSrc: ["'none'"] },
      },
    }),
  );
  app.use(mongoSanitize());
  app.use(cookieParser());
  app.enableCors({
    origin: configService.get('corsOrigins', { infer: true }),
    credentials: true,
  });
  app.setGlobalPrefix('api/v1', { exclude: ['health', 'health/ready'] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(configService.get('port', { infer: true }));
}

void bootstrap();
