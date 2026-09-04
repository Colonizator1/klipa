import { ServiceUnavailableException } from '@nestjs/common';
import type { Connection } from 'mongoose';
import type { Redis } from 'ioredis';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  function makeController(
    readyState: number,
    pingImpl: () => Promise<string>,
  ): HealthController {
    const mongoConnection = { readyState } as Connection;
    const redis = { ping: pingImpl } as unknown as Redis;
    return new HealthController(mongoConnection, redis);
  }

  it('liveness always reports ok without touching dependencies', () => {
    const controller = makeController(0, () =>
      Promise.reject(new Error('unused')),
    );
    expect(controller.liveness()).toEqual({ status: 'ok' });
  });

  it('readiness reports ok when mongo is connected and redis responds', async () => {
    const controller = makeController(1, () => Promise.resolve('PONG'));
    await expect(controller.readiness()).resolves.toEqual({
      status: 'ok',
      checks: { mongo: 'ok', redis: 'ok' },
    });
  });

  it('readiness throws 503 when mongo is disconnected', async () => {
    const controller = makeController(0, () => Promise.resolve('PONG'));
    await expect(controller.readiness()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('readiness throws 503 when redis ping fails', async () => {
    const controller = makeController(1, () =>
      Promise.reject(new Error('down')),
    );
    await expect(controller.readiness()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
