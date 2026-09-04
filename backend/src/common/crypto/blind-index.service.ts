import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac } from 'crypto';
import type { AppConfig } from '../../config/configuration';

/**
 * HMAC-SHA256(value, PEPPER) — a searchable "blind index". Used for
 * users.emailHash (login/lookup without storing plaintext email, SPEC.md
 * §4.1) and email_tokens.userIdHash. Deterministic, so it's a lookup key,
 * not a secret in itself — never reveal it to the client.
 */
@Injectable()
export class BlindIndexService {
  private readonly pepper: string;

  constructor(configService: ConfigService<AppConfig, true>) {
    this.pepper = configService.get('crypto', { infer: true }).emailHashPepper;
  }

  hash(value: string): string {
    return createHmac('sha256', this.pepper).update(value).digest('hex');
  }
}

/** Plain SHA-256 for one-time tokens (email_tokens.tokenHash, refresh_tokens.tokenHash) — the raw token is already high-entropy, no pepper needed; only the hash is ever stored. */
export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}
