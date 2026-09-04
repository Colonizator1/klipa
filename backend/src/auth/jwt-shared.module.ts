import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import type { AppConfig } from '../config/configuration';

/**
 * Split out so both AuthModule (signs tokens) and UsersModule (guards /me)
 * can use JwtService without a circular import between them.
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => {
        const auth = configService.get('auth', { infer: true });
        return {
          secret: auth.jwtAccessSecret,
          signOptions: {
            expiresIn: auth.jwtAccessTtl as JwtSignOptions['expiresIn'],
          },
        };
      },
    }),
  ],
  exports: [JwtModule],
})
export class JwtSharedModule {}
