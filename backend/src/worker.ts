import 'reflect-metadata';
import './common/money/decimal-config';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { WorkerModule } from './worker.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  const logger = app.get(Logger);
  logger.log('Worker started');

  // No BullMQ processors are registered yet (Stage 0) — this keeps the
  // process alive so the container matches the compose topology instead of
  // exiting immediately after bootstrap.
  setInterval(() => logger.debug('Worker heartbeat'), 60_000);

  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => {
      void app.close().then(() => process.exit(0));
    });
  }
}

void bootstrap();
