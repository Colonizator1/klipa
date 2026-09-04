# API

Full target surface: `SPEC.md` §8. This file tracks what's actually implemented; update it alongside each stage.

Base URL: `/api/v1` (health checks are the one exception — see below). Auth: access token in a header, refresh token in an httpOnly cookie (`refresh_token`, `path=/api/v1/auth`).

## Errors

Every non-2xx response has this shape:

```json
{ "code": "STRING_CODE", "message": "STRING_CODE", "details": null, "traceId": "uuid" }
```

`code` is stable and machine-readable — the frontend localizes by `code`, never by `message` (SPEC.md §8). `details` carries structured extras when present (e.g. a `class-validator` field-error array, or `{retryAfterSeconds}` on a 429). `traceId` matches the request's pino log line.

## Implemented

### Health (Stage 0) — outside the `/api/v1` prefix

```
GET  /health         liveness — always 200 {"status":"ok"} once the process is up
GET  /health/ready    readiness — 200 once Mongo + Redis are reachable, 503 with {code:"NOT_READY", checks} otherwise
```

### Auth (Stage 1)

```
POST /api/v1/auth/register         {email, password, locale?} → {status: 'active'|'pending'}
POST /api/v1/auth/verify-email     {token} → {message}
POST /api/v1/auth/login            {email, password} → {accessToken, user} + Set-Cookie refresh_token
POST /api/v1/auth/refresh          (cookie) → {accessToken} + rotated Set-Cookie refresh_token
POST /api/v1/auth/logout           (cookie) → {message}, clears the cookie
POST /api/v1/auth/forgot-password  {email} → {message} — always the same response, whether or not the account exists
POST /api/v1/auth/reset-password   {token, newPassword} → {message} — revokes every existing session for that user

GET   /api/v1/me    (Bearer)        → {id, email, role, status, locale, emailVerifiedAt, createdAt}
PATCH /api/v1/me    (Bearer) {locale?} → same shape
```

Known `code`s beyond the generic HTTP ones: `INVALID_CREDENTIALS`, `EMAIL_ALREADY_REGISTERED`, `EMAIL_NOT_VERIFIED`, `ACCOUNT_BLOCKED`, `INVALID_OR_EXPIRED_TOKEN`, `NO_REFRESH_TOKEN` / `INVALID_REFRESH_TOKEN` / `REFRESH_TOKEN_REUSED` / `REFRESH_TOKEN_EXPIRED`, `RATE_LIMITED` (429, `details.retryAfterSeconds`).

Rate limits (SPEC.md §10, fixed-window via Redis): login 5/min per IP **and** per account; register 5/hour per IP; forgot-password 3/hour per IP **and** per account.

Not yet built: `class-validator` DTO failures fall back to a generic `BAD_REQUEST` code with the raw (English) validator messages in `details` — not localized. Tighten this if it becomes a real UX problem.

## Not implemented yet

`/portfolio/*`, `/assets/*`, `/operations/*`, `/wallets/*`, `/instruments/*`, `/dictionaries/*`, `/notifications/*`, `/admin/*`, `DELETE /me` (account deletion — Stage 12) — arrive with the stage that needs them. See `SPEC.md` §12 and `docs/PROGRESS.md`.
