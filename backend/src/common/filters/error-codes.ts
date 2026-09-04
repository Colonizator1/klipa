import { HttpException } from '@nestjs/common';

function toScreamingSnakeCase(className: string): string {
  return className
    .replace(/Exception$/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toUpperCase();
}

/** Frontend localizes by this code (SPEC.md §8) — never a ready-made message. */
export function deriveErrorCode(exception: HttpException): string {
  const body = exception.getResponse();
  if (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as Record<string, unknown>).code === 'string'
  ) {
    return (body as Record<string, string>).code;
  }
  return toScreamingSnakeCase(exception.constructor.name);
}

/** Structured extras (e.g. a class-validator error array, or a domain payload like an available-quantity hint). */
export function deriveErrorDetails(exception: HttpException): unknown {
  const body = exception.getResponse();
  if (typeof body !== 'object' || body === null) {
    return undefined;
  }
  const bodyRecord = body as Record<string, unknown>;
  if (Array.isArray(bodyRecord.message)) {
    return bodyRecord.message;
  }
  const rest = { ...bodyRecord };
  delete rest.message;
  delete rest.code;
  return Object.keys(rest).length > 0 ? rest : undefined;
}
