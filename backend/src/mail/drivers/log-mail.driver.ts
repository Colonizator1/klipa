import { Injectable, Logger } from '@nestjs/common';
import type { MailDriver, MailMessage } from './mail-driver.interface';

/** Default driver — zero external services, matches Stage 1's DoD (SPEC.md §12). */
@Injectable()
export class LogMailDriver implements MailDriver {
  private readonly logger = new Logger('Mail');

  send(message: MailMessage): Promise<void> {
    this.logger.log(
      { to: message.to, subject: message.subject, text: message.text },
      'Outgoing mail (log driver, no SMTP configured)',
    );
    return Promise.resolve();
  }
}
