import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import type { AppConfig } from '../../config/configuration';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

/** AES-256-GCM, reversible — for sending mail / showing email in the admin panel (SPEC.md §4.1). */
@Injectable()
export class EmailCryptoService {
  private readonly key: Buffer;

  constructor(configService: ConfigService<AppConfig, true>) {
    this.key = Buffer.from(
      configService.get('crypto', { infer: true }).emailEncryptionKey,
      'hex',
    );
  }

  encrypt(plainText: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return [iv, authTag, ciphertext]
      .map((buf) => buf.toString('base64'))
      .join('.');
  }

  decrypt(encoded: string): string {
    const [ivB64, authTagB64, ciphertextB64] = encoded.split('.');
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const ciphertext = Buffer.from(ciphertextB64, 'base64');
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');
  }

  /** "iv***@gmail.com" — for admin lists without decrypting (SPEC.md §4.1). */
  mask(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) {
      return '***';
    }
    const visible = local.slice(0, 2);
    return `${visible}${'*'.repeat(Math.max(local.length - visible.length, 1))}@${domain}`;
  }
}
