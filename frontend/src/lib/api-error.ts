import { ApiRequestError } from '../api/http';

/** Backend errors localize by `code` (SPEC.md §8) — this maps a known code to an i18n key under `errors.*`, falling back to a generic one. */
const KNOWN_CODES = new Set([
  'INVALID_CREDENTIALS',
  'EMAIL_ALREADY_REGISTERED',
  'EMAIL_NOT_VERIFIED',
  'ACCOUNT_BLOCKED',
  'RATE_LIMITED',
  'INVALID_OR_EXPIRED_TOKEN',
  'REFRESH_TOKEN_REUSED',
]);

export function apiErrorI18nKey(error: unknown): string {
  if (error instanceof ApiRequestError && KNOWN_CODES.has(error.body.code)) {
    return `errors.${error.body.code}`;
  }
  return 'errors.UNKNOWN';
}
