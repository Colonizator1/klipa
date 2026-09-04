import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CryptoModule } from '../common/crypto/crypto.module';
import { RateLimitModule } from '../common/rate-limit/rate-limit.module';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtSharedModule } from './jwt-shared.module';
import { EmailToken, EmailTokenSchema } from './schemas/email-token.schema';
import {
  RefreshToken,
  RefreshTokenSchema,
} from './schemas/refresh-token.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RefreshToken.name, schema: RefreshTokenSchema },
      { name: EmailToken.name, schema: EmailTokenSchema },
    ]),
    UsersModule,
    CryptoModule,
    MailModule,
    RateLimitModule,
    JwtSharedModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
