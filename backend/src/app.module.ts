import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import configuration from './config/configuration';
import { validate } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import type { AppConfig } from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], validate }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => ({
        pinoHttp: {
          level: configService.get('logLevel', { infer: true }),
          genReqId: (req: {
            headers: Record<string, string | string[] | undefined>;
          }) => (req.headers['x-request-id'] as string) ?? randomUUID(),
          transport:
            configService.get('nodeEnv', { infer: true }) === 'development'
              ? { target: 'pino-pretty' }
              : undefined,
        },
      }),
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => ({
        uri: configService.get('mongodbUri', { infer: true }),
      }),
    }),
    HealthModule,
    UsersModule,
    AuthModule,
  ],
})
export class AppModule {}
