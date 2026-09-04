import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ConnectionStates, type Connection } from 'mongoose';
import type { Redis } from 'ioredis';
import { REDIS_HEALTH_CLIENT } from './redis-health.provider';

@Controller()
export class HealthController {
  constructor(
    @InjectConnection() private readonly mongoConnection: Connection,
    @Inject(REDIS_HEALTH_CLIENT) private readonly redis: Redis,
  ) {}

  @Get('health')
  liveness(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('health/ready')
  async readiness(): Promise<{ status: 'ok'; checks: Record<string, 'ok'> }> {
    const mongo = this.checkMongo();
    const redis = await this.checkRedis();

    if (!mongo || !redis) {
      throw new ServiceUnavailableException({
        code: 'NOT_READY',
        checks: {
          mongo: mongo ? 'ok' : 'error',
          redis: redis ? 'ok' : 'error',
        },
      });
    }

    return { status: 'ok', checks: { mongo: 'ok', redis: 'ok' } };
  }

  private checkMongo(): boolean {
    return this.mongoConnection.readyState === ConnectionStates.connected;
  }

  private async checkRedis(): Promise<boolean> {
    try {
      return (await this.redis.ping()) === 'PONG';
    } catch {
      return false;
    }
  }
}
