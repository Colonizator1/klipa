import { Module } from '@nestjs/common';
import { BlindIndexService } from './blind-index.service';
import { EmailCryptoService } from './email-crypto.service';
import { PasswordService } from './password.service';

@Module({
  providers: [BlindIndexService, EmailCryptoService, PasswordService],
  exports: [BlindIndexService, EmailCryptoService, PasswordService],
})
export class CryptoModule {}
