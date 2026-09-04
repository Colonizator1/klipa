import { Module } from '@nestjs/common';
import { rateLimitRedisProvider } from './rate-limit-redis.provider';
import { RateLimitService } from './rate-limit.service';

@Module({
  providers: [rateLimitRedisProvider, RateLimitService],
  exports: [RateLimitService],
})
export class RateLimitModule {}
