# Decisions

Short ADRs for anything that fills a gap `SPEC.md` left open, or deviates from it. Format: context, decision, consequences.

## ADR-0001 — No npm/pnpm workspaces for the monorepo

**Context:** `SPEC.md` §0 says "монорепо: backend/, frontend/, scripts/, docs/, design/" but doesn't mandate a workspace tool.

**Decision:** `backend/` and `frontend/` are independent npm projects, each with its own `package.json` and `package-lock.json`. The root `package.json` exists only to host husky + lint-staged for the pre-commit hook.

**Consequences:** Installing dependencies means running `npm ci` in each package directory (or via `scripts/install.sh`, which does this), not once at the root. CI (`.github/workflows/ci.yml`) runs backend and frontend as separate jobs for the same reason.

## ADR-0002 — `local/no-number-money` ESLint rule is a name heuristic, not a type guarantee

**Context:** SPEC.md D-05 requires `Decimal128` everywhere and forbids `number`/`float` for money at every layer, enforced "at the ESLint level."

**Decision:** `eslint-rules/no-number-money.cjs` (shared by `backend/eslint.config.mjs` and `frontend/eslint.config.mjs`) flags `: number` type annotations on any property/variable/parameter whose name matches a money-shaped regex (`amount`, `price`, `qty`, `balance`, `cost`, `fee`, `rate`, `pnl`, `principal`, `value`, `total`, …).

**Consequences:** This is a naming heuristic, not a soundness guarantee — a money field named unconventionally (or reached through a generic/aliased type) won't be caught. It catches the common case cheaply without a bespoke type-checker plugin. If a real bug slips through this gap, tighten the regex or the rule rather than treating the current pass as proof of correctness. The actual guarantee lives in `Money`/`Qty` (`backend/src/common/money/`) being the only sanctioned way to hold a monetary/quantity value.

## ADR-0003 — Stage 0 ships only `scripts/install.sh`

**Context:** SPEC.md §11 lists six scripts (`install.sh`, `deploy.sh`, `create-admin.sh`, `backup.sh`, `restore.sh`, `seed-instruments.sh`, `logs.sh`) as the project's eventual script surface, but only `install.sh` is named in Stage 0's own scope (§0) and DoD.

**Decision:** Only `scripts/install.sh` is built now. The rest are deferred to the stage where their precondition exists: `create-admin.sh` needs the `users` collection (Stage 1), `seed-instruments.sh` needs `instruments` (Stage 7) and real provider backfill (Stage 9). `deploy.sh`, `backup.sh`, `restore.sh`, `logs.sh` are infra-only and don't strictly need a later stage's data model, but are left out to stay inside Stage 0's stated scope rather than build ahead of it (SPEC.md §13 rule 2).

**Consequences:** A future session picking up Stage 1+ should add `create-admin.sh` as part of that stage's own deliverables, not assume it already exists.

## ADR-0004 — Hand-rolled Mongo-sanitize middleware instead of `express-mongo-sanitize`

**Context:** `SPEC.md` §10 requires `mongo-sanitize` against operator/field injection in incoming requests. The `express-mongo-sanitize` package (last released for Express 4, latest is still `2.2.0`) does `req.query = <sanitized>` — Express 5 (which NestJS 11's `platform-express` uses by default) made `req.query` a getter-only property, so that assignment throws a `TypeError` on **every** request, including `/health`. This wasn't caught by lint/build/unit tests — only surfaced when the dev stack was actually run end-to-end.

**Decision:** Replaced it with `backend/src/common/security/mongo-sanitize.middleware.ts` — recursively strips `$`-prefixed and dotted keys from `req.body`/`req.query`/`req.params` by mutating those objects **in place**, never reassigning the top-level property.

**Consequences:** One dependency fewer. If a `$`/`.`-injection bypass is ever found, fix it in this file — there's no upstream package to bump. Any future middleware or interceptor that touches `req.query` must mutate it in place too, not reassign it, for the same Express-5 reason.

## ADR-0005 — `mongo` service gets a pinned `hostname`

**Context:** `rs.initiate()` (no args) records the *current* hostname as the replica set's only member. Docker Compose containers get a random hostname on each recreation unless one is set explicitly, so recreating the `mongo` container (e.g. after any compose-file change to that service) silently broke replication with `MongoServerError: Our replica set config is invalid or we are not a member of it` — mongo reported itself healthy (`ping` still works) while every real query failed, and the backend hung inside `NestFactory.create()` waiting on the initial Mongoose connection.

**Decision:** `docker-compose.yml`'s `mongo` service sets `hostname: mongo` (stable across recreation), and `scripts/install.sh` calls `rs.initiate({_id: 'rs0', members: [{_id: 0, host: 'mongo:27017'}]})` with an explicit host instead of the argument-less form, as a second layer of protection against the same failure mode.

**Consequences:** If the mongo service is ever renamed or the compose network topology changes, both the `hostname` and the `host:` in `rs.initiate()` need updating together, or replication breaks the same way again.

## ADR-0006 — `frontend` publishes port 80 directly; no nginx-proxy-manager on this host yet

**Context:** This repo is being run on the actual target server (confirmed by the user in-session), with the domain `portfelika.com` ready. `SPEC.md` §3 assumes an already-running, externally-managed nginx-proxy-manager on `npm_network` routing to `frontend`/`backend` by service name, with no ports published. On this host, `npm_network` only exists because `scripts/install.sh` creates it — there is no nginx-proxy-manager container attached to it (checked: `docker network inspect npm_network` showed only this project's own containers).

**Decision:** `docker-compose.yml`'s `frontend` service temporarily publishes `80:80` directly, on the user's explicit choice ("keep it simple for now") over standing up nginx-proxy-manager immediately. This surfaced a real gap while verifying it end-to-end: `frontend/nginx.conf` had no proxy rules for `/api/` or `/health` (those only worked in dev through Vite's dev-server proxy) — without a reverse proxy in front, `/health` was silently served the SPA shell instead of reaching the backend. Fixed by adding `location /api/` and `location /health` blocks in `nginx.conf` that `proxy_pass` to `backend:3000`, using an nginx `resolver` + variable so the backend's IP is re-resolved per request rather than cached for the life of the nginx worker (same class of bug as ADR-0005 — Docker container IPs aren't stable across recreation).

**Consequences:** This is a **deviation from SPEC.md §3**, marked with a comment in `docker-compose.yml` right on the `ports:` line. When nginx-proxy-manager is deployed on this host and attached to `npm_network`, remove that `ports:` block and configure NPM's proxy hosts to point at `frontend` (port 80) and, if needed, `backend` (port 3000) directly — the nginx `/api`/`/health` proxy rules added here can stay either way, they're harmless once NPM is also in front.
