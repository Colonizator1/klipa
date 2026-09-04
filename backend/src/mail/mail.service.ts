import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../config/configuration';
import type { UserLocale } from '../users/schemas/user.schema';
import type { MailDriver } from './drivers/mail-driver.interface';
import { LogMailDriver } from './drivers/log-mail.driver';
import { SmtpMailDriver } from './drivers/smtp-mail.driver';

/**
 * The driver is the only thing that changes across stages (SPEC.md Stage 1):
 * `log` now, `smtp` pointed at mailhog in dev, a real relay from Stage 11 —
 * this interface doesn't change.
 */
@Injectable()
export class MailService {
  private readonly driver: MailDriver;

  constructor(
    configService: ConfigService<AppConfig, true>,
    logDriver: LogMailDriver,
    smtpDriver: SmtpMailDriver,
  ) {
    this.driver =
      configService.get('mail', { infer: true }).driver === 'smtp'
        ? smtpDriver
        : logDriver;
  }

  async sendVerificationEmail(
    to: string,
    locale: UserLocale,
    link: string,
  ): Promise<void> {
    const subject = locale === 'ru' ? 'Подтвердите email' : 'Verify your email';
    const text =
      locale === 'ru'
        ? `Перейдите по ссылке, чтобы подтвердить email:\n${link}\n\nСсылка действует 24 часа. Если вы не регистрировались — проигнорируйте это письмо.`
        : `Follow this link to verify your email:\n${link}\n\nThe link is valid for 24 hours. If you didn't sign up, ignore this email.`;
    await this.driver.send({ to, subject, text });
  }

  async sendPasswordResetEmail(
    to: string,
    locale: UserLocale,
    link: string,
  ): Promise<void> {
    const subject = locale === 'ru' ? 'Сброс пароля' : 'Reset your password';
    const text =
      locale === 'ru'
        ? `Перейдите по ссылке, чтобы сбросить пароль:\n${link}\n\nСсылка действует 1 час. Если вы не запрашивали сброс — проигнорируйте это письмо.`
        : `Follow this link to reset your password:\n${link}\n\nThe link is valid for 1 hour. If you didn't request this, ignore this email.`;
    await this.driver.send({ to, subject, text });
  }
}
