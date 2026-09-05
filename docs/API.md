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

### Portfolio, assets, operations (Stage 2)

No calculation engine yet (Stage 3) — these endpoints only store and list data. All are `(Bearer)`, scoped to the caller's own portfolio (1:1 with the user, SPEC.md D-01), auto-created at registration with `baseCurrency: 'USD'` (editable via `PATCH /portfolio`).

```
GET   /api/v1/portfolio                 → {id, name, baseCurrency, settings, recalcStatus}
PATCH /api/v1/portfolio  {name?, baseCurrency?, settings?: {defaultUseCash?}}

GET    /api/v1/assets                   → Asset[] (kind: 'custom' only — 'central' is feature-flagged off until Stage 7)
POST   /api/v1/assets    {type, name, currency, custody?: {country, holder}, income?: {...}, notes?}
GET    /api/v1/assets/:id
PATCH  /api/v1/assets/:id  {name?, currency?, custody?, income?, status?, notes?}
DELETE /api/v1/assets/:id               → 204, soft delete
GET    /api/v1/assets/:id/operations    → Operation[] for that asset

GET    /api/v1/operations?assetId=&type=&from=&to=
POST   /api/v1/operations  {assetId, date, type, currency, quantity?, price?, amount?, fee?, feeCurrency?, useCash?, tax?, taxCurrency?, notes?}
PATCH  /api/v1/operations/:id  (same fields except assetId/type — type is immutable, delete+recreate instead)
DELETE /api/v1/operations/:id           → 204, soft delete

GET    /api/v1/dictionaries/currencies      → ['USD','EUR','RUB','BYN','PLN'] (D-24)
GET    /api/v1/dictionaries/countries       → [{code, name: {en, ru}}]
GET    /api/v1/dictionaries/custody-places?country=&q=  → [{country, holder}], ranked by usage, scoped to the caller

GET  /api/v1/admin/fx-rates?base=&quote=&from=&to=   (Bearer, role=admin)
POST /api/v1/admin/fx-rates  {base, quote, date, rate}  → upserts by {base, quote, date} (D-24; no providers until Stage 9)
```

**`type` (creatable in Stage 2):** `BUY`, `SELL` (require `quantity`+`price` — `amount` is server-derived as `quantity × price` and any client-sent `amount` is ignored, SPEC.md §4.8), `INCOME`, `FEE`, `REVALUATION`, `PRINCIPAL_IN` (require `amount`). The other types in SPEC.md's full enum (`TAX`, `MATURITY`, `WALLET_IN`/`WALLET_OUT`, `FX_EXCHANGE`, `SPLIT_ADJUST`) exist in the schema's shape but are rejected by `CreateOperationDto`'s validation until the stage that needs them (wallets: Stage 4; accruals/maturity: Stage 5; corporate actions: Stage 10).

Known `code`s: `PORTFOLIO_NOT_FOUND`, `ASSET_NOT_FOUND`, `OPERATION_NOT_FOUND`, `OPERATION_FIELD_REQUIRED` (`details: {type, field}` — a required field for that operation type was missing), `FX_RATE_ALREADY_EXISTS`, `FORBIDDEN_ROLE` (403, non-admin hitting `/admin/*`).

Not yet built: `GET /portfolio/summary|performance|history|allocation|export`, `POST /assets/:id/recalc-income`, `POST /operations/:id/resolve` (`needs_decision` — Stage 5), `GET /wallets*` (Stage 4).

## Not implemented yet

`/instruments/*`, `/ticker-requests`, `/notifications/*`, the rest of `/admin/*` (users, instruments, prices, corporate-actions, sync-runs, settings, ticker-requests, audit-log), `DELETE /me` (account deletion — Stage 12) — arrive with the stage that needs them. See `SPEC.md` §12 and `docs/PROGRESS.md`.
