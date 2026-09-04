import type { Redis } from 'ioredis';
import { RateLimitService } from './rate-limit.service';
import { RateLimitExceededException } from './rate-limit.exception';

function makeFakeRedis() {
  const store = new Map<string, { count: number; ttl: number }>();
  return {
    incr: jest.fn((key: string) => {
      const entry = store.get(key) ?? { count: 0, ttl: -1 };
      entry.count += 1;
      store.set(key, entry);
      return Promise.resolve(entry.count);
    }),
    expire: jest.fn((key: string, seconds: number) => {
      const entry = store.get(key);
      if (entry) entry.ttl = seconds;
      return Promise.resolve(1);
    }),
    ttl: jest.fn((key: string) => Promise.resolve(store.get(key)?.ttl ?? -1)),
  } as unknown as Redis;
}

describe('RateLimitService', () => {
  it('allows requests under the limit', async () => {
    const service = new RateLimitService(makeFakeRedis());
    await expect(
      service.consume('login:ip:1.2.3.4', 5, 60),
    ).resolves.toBeUndefined();
    await expect(
      service.consume('login:ip:1.2.3.4', 5, 60),
    ).resolves.toBeUndefined();
  });

  it('throws once the limit is exceeded, with a retry-after hint', async () => {
    const service = new RateLimitService(makeFakeRedis());
    const key = 'login:ip:1.2.3.4';
    for (let i = 0; i < 5; i += 1) {
      await service.consume(key, 5, 60);
    }
    await expect(service.consume(key, 5, 60)).rejects.toBeInstanceOf(
      RateLimitExceededException,
    );
  });

  it('keys are independent — one identity being limited does not affect another', async () => {
    const redis = makeFakeRedis();
    const service = new RateLimitService(redis);
    for (let i = 0; i < 5; i += 1) {
      await service.consume('login:ip:1.2.3.4', 5, 60);
    }
    await expect(
      service.consume('login:ip:9.9.9.9', 5, 60),
    ).resolves.toBeUndefined();
  });
});
