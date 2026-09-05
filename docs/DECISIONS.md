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

## ADR-0007 — `scripts/create-admin.ts`: readline needs the async-iterator protocol, not sequential `question()` calls

**Context:** `create-admin.ts` (Stage 1, SPEC.md D-16/§11) prompts for email then password via Node's `readline`. Piped, non-TTY input (`printf "email\npassword\n" | docker compose exec -T backend node dist/scripts/create-admin.js` — exactly how `scripts/create-admin.sh` and any CI/scripted use would call it) delivers both lines in one chunk. Two sequential `rl.question()` calls race: readline processes the whole chunk and emits both `'line'` events before our code's `await` on the first question resolves and registers the second question's one-shot listener — so the second line is emitted with no listener attached and is silently lost. The process then hangs forever waiting on a `question()` callback that will never fire. This is invisible in a real terminal (a human never types both lines before the first prompt asks) — it only reproduces with piped input, which is exactly how this script is actually invoked.

A second, separate issue: even once both prompts resolve and the script's own work finishes, the process doesn't exit — `readline` leaves `process.stdin` in a state that keeps the event loop alive past `rl.close()`.

**Decision:** `makePrompter()` uses `rl[Symbol.asyncIterator]()` and calls `.next()` per prompt instead of `rl.question()` — this pulls lines on demand and never loses one regardless of chunking. `main()` ends with an explicit `process.exit(process.exitCode ?? 0)` to guarantee termination.

**Consequences:** Any future interactive CLI script that takes more than one piped answer must use the same async-iterator pattern (or otherwise avoid stacking `rl.question()` calls) and should end the same way, with an explicit `process.exit()` — don't assume the process exits on its own just because the async logic completed. Caught by manually running `scripts/create-admin.sh`'s underlying command end-to-end against the live container, not by lint/build/unit tests, none of which exercise real piped stdin.

## ADR-0008 — Every `@Prop()` whose TS type is a union (including `T | null`) needs an explicit `type:`

**Context:** Stage 2 (SPEC.md §12) introduced the first Mongoose schemas with string-enum fields backed by a shared `Currency` union type (`common/dictionaries/currencies.ts`, `type Currency = (typeof CURRENCIES)[number]`) and several inline string-literal unions (`AssetStatus`, `OperationType`, `RecalcStatus`, nullable fields like `anchorDay: number | null`, …). `@nestjs/mongoose`'s `@Prop()` decorator, when given no explicit `type:` option, infers the Mongoose schema type from the TypeScript-emitted `design:type` reflection metadata. TypeScript's decorator-metadata emitter collapses **any** union type (two or more members, or one member plus `null`/`undefined`) to `Object` — it does not attempt to find a common primitive even when every member is a string. Mongoose then throws `Cannot determine a type for the "<Model>.<field>" field (union/intersection/ambiguous type was used)` — a hard error at schema-definition time (i.e. at module import), not something class-validator or a request can trigger. This wasn't caught by `tsc`/`nest build` (which only type-checks, it doesn't run the decorators) — it only surfaces the moment something actually imports the schema file, which is exactly what a unit test importing the service (`operations.service.spec.ts` → `operations.service.ts` → `assets.service.ts` → `assets/schemas/asset.schema.ts`) does.

Stage 1's `users.schema.ts` has the same shape (`role: UserRole`, a `'user' | 'admin'` union) with no explicit `type:` and never hit this — so this is not "unions always fail," it appears to depend on exactly how reflect-metadata resolves the property in a given build (possibly related to `Currency` being an indexed-access type from another module vs. a plain inline union declared in the same file); it wasn't worth chasing further once the fix below made the failure mode simply not apply.

**Decision:** Every `@Prop()` on a field whose TypeScript type is a union — enum-backed strings (`type: String`), nullable numbers (`type: Number`), nullable strings (`type: String`), etc. — now carries an explicit `type:` in the decorator options, never relying on reflection to infer it. A bare (non-union) primitive type, or a single string-literal default like `costBasis: 'FIFO'`, doesn't need this.

**Consequences:** When adding a new schema field going forward, if its TS type has a `|` in it anywhere (including a trailing `| null`), always pass `type:` explicitly in `@Prop()` — don't rely on "it matches an existing pattern that didn't need it." If this class of bug slips through again, the fastest repro is any test or bootstrap path that actually imports the schema file (build/lint won't catch it).

## ADR-0009 — `@Prop({ type: Types.ObjectId })` silently degrades to `Mixed`; use `SchemaTypes.ObjectId`

**Context:** Found live while verifying Stage 2's `GET /portfolio` (a fresh registration's auto-created portfolio 404'd even though the document existed in Mongo with the right `userId`). Root cause, traced by inspecting the live model's compiled schema path (`model.schema.path('userId')` showed `instance: 'Mixed'`, `options.type: {}`): `@nestjs/mongoose`'s `DefinitionsFactory.inspectTypeDefinition()` only recognizes a `type:` value as a real Mongoose schema type when it's a "primitive" (`Boolean/Number/String/Map/Date/Buffer/BigInt`) or when `type.prototype`'s prototype chain terminates at `mongoose.SchemaType` (`isMongooseSchemaType()`). `mongoose.Types.ObjectId` (the BSON *value* class re-exported by `mongoose.Types`, used to construct id values like `new Types.ObjectId()`) is **not** a `SchemaType` subclass — it fails that check. `@nestjs/mongoose` then falls through to its "this must be a nested `@Schema()`-decorated class" branch, finds no such metadata on `Types.ObjectId`, and silently produces `{}` (which Mongoose compiles to a `Mixed` field) instead of erroring. A `Mixed` ref field still *stores* a real `ObjectId` instance correctly (assignment just keeps whatever JS value you give it) and still *matches* a query filter that already holds an actual `ObjectId` instance (Mongo compares raw BSON on the wire) — which is exactly the only way Stage 0/1 ever used these fields (`existing.userId`, `record.userId`, always read off an already-hydrated document, never a bare string). It only breaks the moment something queries by a **plain string** id, because `Mixed` does no cast-on-query — Stage 2 was the first code to do `findOne({ userId: <string from a JWT/route param> })`.

This affected every existing `@Prop({ type: Types.ObjectId, ... })` in the codebase, not just Stage 2's new ones: `RefreshToken.userId`/`replacedByTokenId`, `EmailToken.userId` (Stage 1), plus Stage 2's `Portfolio.userId`, `Asset.portfolioId`/`instrumentId`, `Operation.portfolioId`/`assetId`/`generatedFrom`, `CustodyPlace.userId`.

**Decision:** Use `mongoose.SchemaTypes.ObjectId` (a top-level alias for `Schema.Types.ObjectId`, chosen over `Schema.Types.ObjectId` directly to avoid a name clash with `@nestjs/mongoose`'s own `Schema` decorator, which every schema file already imports) for every ObjectId-ref `@Prop`'s `type:` option, across all affected files. `Types.ObjectId` from `mongoose` is still imported and used for **TypeScript type annotations** (`userId: Types.ObjectId`) and for constructing values (`new Types.ObjectId(...)`) — only its use as a decorator's runtime `type:` value was wrong.

**Consequences:** Never write `@Prop({ type: Types.ObjectId, ... })` again — always `@Prop({ type: SchemaTypes.ObjectId, ... })`. This is easy to get wrong again because both spellings type-check fine and both look identical in a document written through the app itself; the only way it surfaces is a query filtered by a raw string id returning nothing. If a `findOne`/`findById`-shaped lookup mysteriously returns null for a document you can see in Mongo, check `model.schema.path('<field>').instance` — `'Mixed'` where you expected `'ObjectId'` is this bug.

## ADR-0010 — Vite's build output moved off `assets/` to avoid colliding with the `/assets` route

**Context:** Found live while verifying Stage 2's Assets screens through the actual prod nginx (not `vite dev`, which has no such issue — only the built, nginx-served path does). `frontend/nginx.conf` (added in ADR-0006) had `location /assets/ { expires 1y; ... }` for Vite's default build output directory (`dist/assets/*.js|css`). SPEC.md §9 names a screen "Активы" (Assets, SPEC.md §12 Stage 2), and the natural route for it is `/assets` — but nginx's `location /assets/` is a **prefix** match, so it also intercepts `/assets/<id>` (the asset detail/edit route) and even `/assets` itself (nginx 301-redirects to `/assets/` because a real `assets/` directory exists under `root`). None of these requests ever reached `location /` (the SPA `try_files ... /index.html` fallback), so `/assets/<id>` 404'd outright and `/assets` redirected into the static file location instead of loading the app.

**Decision:** `vite.config.ts` sets `build.assetsDir: 'build-assets'`, and `frontend/nginx.conf`'s cache location is renamed to `location /build-assets/` to match. The app's own routes (`/assets`, `/assets/:id`, `/assets/new`, `/operations`, …) are free to use any path with no risk of colliding with Vite's own output directory ever again.

**Consequences:** Any future app route must not be named `build-assets`, but that's an unlikely enough collision to not worry about. If another route/static-path collision like this appears again (same class of bug as ADR-0006's `/health`/`/api` gap and ADR-0005's stale-IP gap — nginx silently doing the *wrong specific thing* instead of erroring), the fix pattern is the same: check `location` blocks for prefix matches before assuming `location /`'s SPA fallback is what actually serves a given path in production.
