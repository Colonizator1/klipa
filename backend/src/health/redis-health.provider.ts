import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import type { AppConfig } from '../config/configuration';

export const REDIS_HEALTH_CLIENT = 'REDIS_HEALTH_CLIENT';

export const redisHealthProvider: Provider = {
  provide: REDIS_HEALTH_CLIENT,
  useFactory: (configService: ConfigService<AppConfig, true>) => {
    const redis = configService.get('redis', { infer: true });
    return new Redis({
      host: redis.host,
      port: redis.port,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
    });
  },
  inject: [ConfigService],
};
