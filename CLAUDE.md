# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

`SPEC.md` is the **single source of truth** for requirements (written in Russian). Stage 0 (scaffold) is done — see `docs/PROGRESS.md` for exactly what exists and what's next, and `docs/DECISIONS.md` for ADRs on anything that filled a gap `SPEC.md` left open. Read both, in full, before writing code.

Any deviation from `SPEC.md` gets a short ADR in `docs/DECISIONS.md` (context, decision, consequences) — never silently diverge. If the spec's data format doesn't fit a real need, `SPEC.md` is amended first, then the code.

## Development protocol (SPEC.md §13)

- Work is organized into numbered stages (`SPEC.md` §12), each self-contained and ending in green tests + an updated `docs/PROGRESS.md`. Stage 0 was done directly on `main`; from Stage 1 on, each stage gets its own branch `stage/NN-slug`.
- Stay inside the current stage's scope — do not build ahead for future stages (see ADR-0003 for what this meant concretely for Stage 0's scripts).
- Do not change the `engine` module's public signatures without recording the change in `docs/DECISIONS.md`.
- At the end of a session, update `docs/PROGRESS.md`: current stage/branch, done items, in-progress items (file:line pointers), the concrete next step, and any gotchas hit along the way.

## Commands

No root-level workspace — `backend/` and `frontend/` are independent npm projects (ADR-0001), each with its own lockfile. Node/npm are **not installed on the host**; every command below runs through Docker (`node:22-alpine`, matching the pinned runtime) unless you've sourced `nvm` yourself. `scripts/install.sh` does the equivalent of all of this in one idempotent pass — read it before reaching for the raw commands.

```bash
# from backend/ or frontend/, with your own node/npm:
npm ci                  # install
npm run lint             # eslint --fix
npm run lint:check       # eslint, no fixes (what CI runs)
npm run build             # backend: nest build → dist/. frontend: vue-tsc -b && vite build → dist/
npm test                 # backend only — jest, rootDir src/, *.spec.ts
npm run start:dev         # backend: nest start --watch
npm run start:worker:dev  # backend: ts-node src/worker.ts (the worker entrypoint, watch via ts-node, no hot reload)
npm run dev                # frontend: vite dev server
```

Without host node, run the same script through Docker, e.g.:

```bash
docker run --rm -u "$(id -u):$(id -g)" -e HOME=/tmp/npm-home -e npm_config_cache=/tmp/npm-cache \
  -v "$PWD":/app -v /tmp/npm-home:/tmp/npm-home -v /tmp/npm-cache:/tmp/npm-cache -w /app \
  node:22-alpine npm run lint:check
```

(The `HOME`/`npm_config_cache` env vars matter — without them `npm` fails with `EACCES` trying to write `/.npmrc` as a non-root UID.)

**Full stack:**

```bash
./scripts/install.sh                                        # idempotent: env, network, deps, mongo replica set, up, health-wait
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build   # what install.sh drives
docker compose logs -f backend                                # tail one service
```

Dev URLs: only the frontend's port is published to the host — `http://localhost:5173` (`/api/*` and `/health` are proxied through Vite dev server to the backend, see `vite.config.ts`). Backend/mongo/redis/mailhog are reachable only from inside the compose network — use `docker compose exec <service> ...` or `docker compose logs <service>`.

**Migrations** (backend, `migrate-mongo`, directory `backend/migrations/`, config `backend/migrate-mongo-config.cjs`): `npm run migrate:up` / `migrate:down` / `migrate:status` / `migrate:create -- <name>`.

**Testing thresholds** (SPEC.md §14, apply from the stage that has something to test): the `engine` module, accrual generator, and XIRR are unit-tested to 90% coverage and validated against hand-computed "golden" portfolios (known TWR/XIRR/FIFO results) on every core change — the primary correctness gate for money math. Services/validators/provider adapters (HTTP mocked) target 70%. Integration tests run against Mongo via testcontainers. E2E (Playwright) covers 8–10 key flows. None of engine/integration/E2E exist yet — they arrive with Stage 3 (engine) onward.

## Architecture

### Stack and topology

Monorepo: `backend/`, `frontend/`, `scripts/`, `docs/`, `design/`. Docker Compose services: `frontend` (nginx:alpine serving a Vite build; Vue 3 + TS, Pinia, vue-i18n, vue-router, Chart.js), `backend` (node:22-alpine, NestJS + Mongoose), `worker` (same image as `backend`, different entrypoint/command — `dist/worker` vs `dist/main` — so crons and heavy recalcs never block the API), `mongo:7` (**single-node replica set, `rs0`** — required for transactions, which atomic multi-document writes need; `scripts/install.sh` runs `rs.initiate()` idempotently), `redis:7` (BullMQ queues, not wired to any processor yet — Stage 0 has no jobs). `docker-compose.yml` is the base (no ports published, everything on the external `npm_network` that nginx-proxy-manager routes into); `docker-compose.dev.yml` layers on `mailhog`, published ports, and bind-mounted hot-reload. `frontend/src/styles/tokens.css` holds the design tokens (color light/dark pairs, typography, spacing, radii, shadows) pulled from `design/prototype.html` — components should only ever reference these custom properties, never raw hex/px.

### Data model (MongoDB) — core invariants

- **All money and quantities are `Decimal128`**, wrapped in `Money`/`Qty` (`backend/src/common/money/`, built on `decimal.js`, precision 20 / half-up, `toJSON()` → string). `Number`/`float` for money is forbidden at every layer; `local/no-number-money` (`eslint-rules/no-number-money.cjs`, shared by both `eslint.config.mjs`s) flags `: number` on money-shaped identifier names as a heuristic backstop — see ADR-0002 for its limits. The actual guarantee is "the only sanctioned way to hold a monetary/quantity value is `Money`/`Qty`," not the lint rule.
- **Operation dates are dates-without-time** (UTC midnight) to sidestep timezone issues in accrual scheduling. Same-day ordering is by an explicit `seq` field — FIFO would otherwise be non-deterministic.
- Deletion is soft (`deletedAt`) everywhere except account deletion.
- `operations` will be the **single source of truth** once it exists (Stage 2). Everything derived from it (`lots`, `snapshots`, portfolio totals) is a rebuildable cache, never hand-edited.
- Instruments are looked up by `{ticker, exchange, currency}` — one instrument = one exchange = one currency, no multi-listing (D-07).
- `prices` will store **raw, unadjusted close prices** on purpose — never split-adjusted — so a corporate action never silently retroactively changes historical returns.

None of `users`, `portfolios`, `assets`, `operations`, `instruments`, `prices` etc. exist yet — they land with Stage 1 (`users`) and Stage 2 (`portfolios`/`assets`/`operations`).

### Backend request/error shape (implemented, Stage 0)

`main.ts` sets a global prefix `/api/v1` (health excluded), `ValidationPipe({whitelist, transform, forbidNonWhitelisted})`, helmet with a CSP that has no `unsafe-inline`, a CORS allowlist from `CORS_ORIGINS`, and an in-place Mongo-operator sanitizer (`common/security/mongo-sanitize.middleware.ts` — hand-rolled, not the `express-mongo-sanitize` package, which reassigns `req.query` and breaks under Express 5; see ADR-0004). Every non-2xx response goes through `AllExceptionsFilter` (`backend/src/common/filters/`) into the shape `{code, message, details, traceId}` — `code` is what the frontend localizes by (never `message`, which just mirrors `code`); `deriveErrorCode`/`deriveErrorDetails` (`error-codes.ts`) pull a `code` off the exception's response body if present, else derive one from the exception class name. `traceId` comes from `nestjs-pino`'s per-request id (`request.id`), configured in `AppModule` via `genReqId`. See `docs/API.md` for what's actually mounted vs. what's still spec-only.

### The calculation engine (`backend/src/engine`) — not built yet, Stage 3

This will be the most safety-critical part of the system: no dependency on the HTTP layer, first thing to get unit tests. When it lands, the pipeline is:

```
operations (sorted by date, seq)
      → applied in order
   lots (FIFO)  +  wallets  +  realized P&L
      → for each day from portfolio start to today
   positions on date × price on date × fx rate on date
      → snapshots (value, flows, daily return, cumulative TWR index)
      → aggregates (TWR over a period, XIRR, breakdowns)
```

**Invalidation:** any create/edit/delete of an operation will set `portfolio.recalcFrom = min(current recalcFrom, operation.date, previous date if moved)` and enqueue a worker job that deletes snapshots from `recalcFrom` onward and rebuilds forward; `lots` are always rebuilt wholesale. Changing base currency or applying a split resets `recalcFrom` to the portfolio's first operation.

**FIFO:** `BUY` opens a lot with `costPerUnit = (quantity × price + fee) / quantity`. `SELL` consumes oldest lots first; `realizedPnl = proceeds − fee − Σ(consumedQty × costPerUnit)`. `SPLIT_ADJUST` multiplies `quantity`/`remainingQty` by `num/den` and divides `costPerUnit` by the same factor (cost basis invariant).

**TWR:** for each day where `V[d-1] > 0`, `r[d] = (V[d] − CF[d]) / V[d-1] − 1`, `CF[d]` = that day's external flows in base currency. **What counts as an external flow (D-29)** is the easy-to-get-wrong part: a buy/sell *without* the "from cash" checkbox, plus wallet deposits/withdrawals, count; a buy/sell *with* that checkbox is internal and doesn't.

**XIRR:** Newton-Raphson with bisection fallback, rate range −0.99 to 10; returns `null` (not a fabricated zero) when flow signs never change.

### Price kinds and provider mixing — not built yet, Stage 7/9

Providers disagree on raw vs. split/dividend-adjusted closes (Yahoo offers both; Stooq only adjusted). Mixing kinds in one instrument's series fakes a price jump on the corporate-action date. `prices.priceKind` will be fixed per instrument at first backfill; a fallback provider that can't match gets skipped for that instrument, not substituted. Instruments stuck on `adjusted` data get flagged `autoAdjusted` with split moderation disabled (avoids double-correcting).

### Accrual scheduling (`income` on custom assets) — not built yet, Stage 5

The accrual date series will be computed **from `firstAccrualDate` and a period index**, never by repeatedly adding a period to the previous date (that drifts permanently after crossing February). `endOfMonth` semantics differ by period unit — see `SPEC.md` §6.1's table before touching this. Idempotency key: `"${assetId}:accrual:${scheduledDate}"`.

### Build order (SPEC.md D-37, §12)

Deliberately sequenced: **custom assets fully working first** (Stages 1–6, no external APIs or email), **then** CSV price import (Stage 8), **then** live providers (Stage 9), **then** email (Stage 11). Stage 6 is the first end-to-end-usable point. Don't jump ahead to a later stage's concerns while working an earlier one.
