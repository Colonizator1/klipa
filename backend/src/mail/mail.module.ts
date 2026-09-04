import { Module } from '@nestjs/common';
import { LogMailDriver } from './drivers/log-mail.driver';
import { SmtpMailDriver } from './drivers/smtp-mail.driver';
import { MailService } from './mail.service';

@Module({
  providers: [LogMailDriver, SmtpMailDriver, MailService],
  exports: [MailService],
})
export class MailModule {}
