import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { redisHealthProvider } from './redis-health.provider';

@Module({
  controllers: [HealthController],
  providers: [redisHealthProvider],
})
export class HealthModule {}
