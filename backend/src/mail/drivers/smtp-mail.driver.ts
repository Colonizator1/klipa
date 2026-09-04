import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import type { AppConfig } from '../../config/configuration';
import type { MailDriver, MailMessage } from './mail-driver.interface';

/** Covers both mailhog (dev) and a real relay (Stage 11) — same SMTP protocol, only host/port/creds differ. */
@Injectable()
export class SmtpMailDriver implements MailDriver {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(configService: ConfigService<AppConfig, true>) {
    const mail = configService.get('mail', { infer: true });
    this.from = mail.from;
    this.transporter = createTransport({
      host: mail.smtp.host,
      port: mail.smtp.port,
      secure: mail.smtp.secure,
      auth: mail.smtp.user
        ? { user: mail.smtp.user, pass: mail.smtp.pass }
        : undefined,
    });
  }

  async send(message: MailMessage): Promise<void> {
    await this.transporter.sendMail({ from: this.from, ...message });
  }
}
