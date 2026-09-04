import { Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { RATE_LIMIT_REDIS_CLIENT } from './rate-limit-redis.provider';
import { RateLimitExceededException } from './rate-limit.exception';

/**
 * Fixed-window counter (Redis INCR + EXPIRE) — coarse but simple, matches
 * SPEC.md §10's "N per window" limits (login 5/min, register 5/hour,
 * password reset 3/hour) closely enough; a precise sliding window isn't
 * required.
 */
@Injectable()
export class RateLimitService {
  constructor(@Inject(RATE_LIMIT_REDIS_CLIENT) private readonly redis: Redis) {}

  async consume(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<void> {
    const redisKey = `ratelimit:${key}`;
    const count = await this.redis.incr(redisKey);
    if (count === 1) {
      await this.redis.expire(redisKey, windowSeconds);
    }
    if (count > limit) {
      const ttl = await this.redis.ttl(redisKey);
      throw new RateLimitExceededException(ttl > 0 ? ttl : windowSeconds);
    }
  }
}
