# API

Full target surface: `SPEC.md` §8. This file tracks what's actually implemented; update it alongside each stage.

Base URL: `/api/v1` (health checks are the one exception — see below). Auth: access token in a header, refresh token in an httpOnly cookie (not implemented yet — Stage 1).

## Errors

Every non-2xx response has this shape:

```json
{ "code": "STRING_CODE", "message": "STRING_CODE", "details": null, "traceId": "uuid" }
```

`code` is stable and machine-readable — the frontend localizes by `code`, never by `message` (SPEC.md §8). `details` carries structured extras when present (e.g. a `class-validator` field-error array). `traceId` matches the request's pino log line.

## Implemented (Stage 0)

```
GET  /health        liveness — always 200 {"status":"ok"} once the process is up
GET  /health/ready   readiness — 200 once Mongo + Redis are reachable, 503 with {code:"NOT_READY", checks} otherwise
```

Both are mounted outside the `/api/v1` prefix.

## Not implemented yet

Everything else in `SPEC.md` §8 (`/auth/*`, `/me`, `/portfolio/*`, `/assets/*`, `/operations/*`, `/wallets/*`, `/instruments/*`, `/dictionaries/*`, `/notifications/*`, `/admin/*`) arrives with the stage that needs it — see `SPEC.md` §12 and `docs/PROGRESS.md`.
