import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import type { AppConfig } from '../../config/configuration';

export const RATE_LIMIT_REDIS_CLIENT = 'RATE_LIMIT_REDIS_CLIENT';

export const rateLimitRedisProvider: Provider = {
  provide: RATE_LIMIT_REDIS_CLIENT,
  useFactory: (configService: ConfigService<AppConfig, true>) => {
    const redis = configService.get('redis', { infer: true });
    return new Redis({ host: redis.host, port: redis.port });
  },
  inject: [ConfigService],
};
