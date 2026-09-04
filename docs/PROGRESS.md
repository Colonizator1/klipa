## Текущий этап: 1 — Аутентификация без внешней почты — ЗАВЕРШЁН

Ветка: `stage/01-auth`, смёржена в `main` (fast-forward) и запушена в `origin/main` — пользователь вручную проверил логин/регистрацию/профиль в браузере и подтвердил.

### Сделано (Stage 1)

- [x] `users` (`backend/src/users/schemas/user.schema.ts`): `emailHash`/`emailEnc`/`emailMasked`/`passwordHash`/`role`/`status`/`locale`/`emailVerifiedAt`/`lastLoginAt`/`deletionRequestedAt`, `timestamps: true` → `createdAt`/`updatedAt`. Точно по SPEC.md §4.1.
- [x] Крипто-примитивы (`backend/src/common/crypto/`): `PasswordService` (argon2id, memoryCost 64 МБ, timeCost 3 — SPEC.md §10), `EmailCryptoService` (AES-256-GCM, реверсивно + `mask()` → "iv**@gmail.com"), `BlindIndexService` + `hashToken()` (HMAC-SHA256/SHA-256 для `emailHash`, `userIdHash`, `tokenHash`). Юнит-тесты на все три, включая «нет plaintext в выводе» и «tamper → throw».
- [x] `RateLimitService` (`backend/src/common/rate-limit/`) — Redis INCR+EXPIRE, fixed-window. Лимиты по SPEC.md §10: логин 5/мин (IP и отдельно по аккаунту), регистрация 5/час на IP, сброс пароля 3/час (IP и по аккаунту). Юнит-тесты + проверено вживую (curl-цикл поймал `429` ровно там, где ожидалось).
- [x] Mail-модуль (`backend/src/mail/`) — `MailDriver` интерфейс, `LogMailDriver` (дефолт, консоль) и `SmtpMailDriver` (nodemailer; mailhog в dev-оверлее, реальный relay — Stage 11). `MAIL_DRIVER=log|smtp` в `.env`. Тексты писем на ru/en внутри `MailService`.
- [x] `auth` (`backend/src/auth/`): `POST /auth/register`, `/verify-email`, `/login`, `/refresh`, `/logout`, `/forgot-password`, `/reset-password`. `GET|PATCH /me` (`backend/src/users/me.controller.ts`).
  - Access-токен — JWT HS256, 15 мин (`JWT_ACCESS_SECRET`, `JWT_ACCESS_TTL`).
  - Refresh — непрозрачный токен в httpOnly-cookie (`path=/api/v1/auth`, `secure` в проде), 30 дней, **ротация с отзывом всей цепочки при повторном использовании** (`refresh_tokens.familyId`) — реализовано и проверено вживую curl'ом: старый токен после ротации → `REFRESH_TOKEN_REUSED`, и новый токен из той же семьи тоже становится недействителен.
  - `email_tokens` — `verify_email` (24 ч) и `reset_password` (1 ч), одноразовые (`usedAt`), хранится только `tokenHash`.
  - `REQUIRE_EMAIL_VERIFICATION=false` по умолчанию (D-16/Stage 1 DoD) — письмо с подтверждением отправляется всегда, но `status` сразу `active`, если флаг выключен; блокировка входа по `EMAIL_NOT_VERIFIED` включается флагом без правок кода.
  - `forgot-password` не палит существование аккаунта — ответ одинаковый в обоих случаях (проверено curl'ом).
  - Сброс пароля отзывает все refresh-токены пользователя.
  - `JwtAuthGuard` + `RolesGuard`/`@Roles()` (`backend/src/auth/guards/`) — роль-гвард пока нигде не навешан (нет admin-эндпоинтов), но готов.
- [x] `scripts/create-admin.ts` + `scripts/create-admin.sh` — интерактивное создание первого админа через реальный DI-контейнер приложения (не дублирует крипто-логику). **Поймал и исправил реальный баг** с `readline` при пайпленном stdin — см. ADR-0007.
- [x] Frontend: экраны логина, регистрации, профиля, forgot/reset password, verify-email (`frontend/src/views/`), `stores/auth.store.ts` (access-токен в памяти, автоматический silent-refresh на 401, единый `authFetch`), роутер с `requiresAuth`/`guestOnly` гвардами, локализация ошибок по `code` (`lib/api-error.ts`, `locales/*.json`), общий стиль форм (`styles/base.css`).
- [x] `.env`/`.env.example` — `JWT_ACCESS_SECRET` (генерируется `install.sh`), `JWT_ACCESS_TTL`, `REFRESH_TOKEN_TTL_DAYS`, `REQUIRE_EMAIL_VERIFICATION`, `MAIL_DRIVER`/`MAIL_FROM`/`SMTP_*`, `FRONTEND_URL`.
- [x] `env.validation.ts` расширен: `JWT_ACCESS_SECRET` (мин. 32 симв.), `EMAIL_ENCRYPTION_KEY`/`EMAIL_HASH_PEPPER` (строго 64 hex), остальное — с дефолтами.
- [x] Юнит-тесты backend: 38 зелёных (money, health, mongo-sanitize, crypto×3, rate-limit, **`auth.service.spec.ts`** — ротация/reuse-detection refresh-токенов на fake-моделях, gating по `status`).
- [x] **Реально задеплоено и вручную проверено на проде** (см. ниже) — весь флоу register → verify-email-лог → login → /me → refresh-ротация → reuse-detection → logout → rate-limit → create-admin, через живой curl против `https://portfelika.com`/`localhost`.

### Реальная проверка на проде (эта сессия)

```
POST /auth/register           → {"status":"active"}, письмо в логе backend (log-драйвер)
POST /auth/login               → accessToken (JWT) + Set-Cookie refresh_token (httpOnly, path=/api/v1/auth)
GET  /me (Bearer)               → расшифрованный email, роль, статус, createdAt
POST /auth/refresh (cookie)     → новый accessToken + новый refresh-cookie; старый refresh отозван
POST /auth/refresh (старый)     → 401 REFRESH_TOKEN_REUSED; новый тоже отозван (вся цепочка убита)
POST /auth/login (неверный пароль) → 401 INVALID_CREDENTIALS
POST /auth/forgot-password ×2 (существующий/несуществующий email) → идентичный ответ
6× POST /auth/login подряд      → 429 RATE_LIMITED после 5-го (IP+account лимит 5/мин)
create-admin.sh (пайпленный ввод) → админ создан, роль admin подтверждена логином
```

Визуально в браузере (клик по кнопкам, реальная отрисовка форм) не проверялось — нет доступа к браузеру из сессии. Пользователь просил задеплоить `stage/01-auth`, чтобы проверить это самостоятельно.

### В работе / не начато

- [x] Визуальная/ручная проверка UI пользователем — пользователь проверил логин, регистрацию и профиль в браузере, подтвердил.
- [ ] `deploy.sh`, `backup.sh`, `restore.sh`, `seed-instruments.sh`, `logs.sh` — по-прежнему не сделаны, см. ADR-0003. `create-admin.sh` сделан в этом Stage.
- [ ] `scripts/install.sh` всё ещё рассчитан на dev-оверлей, не на прод-режим, в котором стек реально живёт (см. Stage 0 заметки ниже) — не трогали в Stage 1, чтобы не смешивать со Stage 0 остатками.
- [ ] nginx-proxy-manager не развёрнут (ADR-0006) — по-прежнему временный `ports: - '80:80'` у frontend.
- [ ] `audit_log` (SPEC.md §4.11, §10 «админские действия пишутся в audit_log») — не заведён, т.к. в Stage 1 ещё нет ни одного admin-эндпоинта, который бы в него писал. `create-admin.sh` — CLI, не HTTP admin-действие, не в счёт.

### Следующий шаг

Начинать Stage 2 — портфель, кастомные активы, операции (SPEC.md §12) — на новой ветке `stage/02-portfolio`.

### Заметки и грабли (Stage 1)

- **Циклическая зависимость Users↔Auth**: `MeController` нужен `JwtAuthGuard`, а `AuthModule` нужен `UsersService`. Решение — `JwtAuthGuard`/`RolesGuard` живут в отдельном `AuthGuardsModule` (только зависит от `JwtSharedModule`), который импортируют и `UsersModule`, и (транзитивно через `JwtSharedModule`) `AuthModule` — без прямой связи Users→Auth или Auth→Users-guards.
- **`express-mongo-sanitize`-класс багов повторился на новом месте**: не было — но общий урок закрепился: любая точка, трогающая `req.query` под Express 5, должна мутировать объект in-place, не переприсваивать.
- **`argon2.hash()`/`@nestjs/jwt`'s `expiresIn` — типы TS не совпадают с рантайм-удобными строками** (`'15m'`, `argon2id` enum) без явного `as const`/`as JwtSignOptions['expiresIn']` — оба заведомо валидны в рантайме, чисто компилятор придирается к widening типов.
- **`readline` + пайпленный (не-TTY) stdin: последовательные `rl.question()` теряют строки.** См. ADR-0007 — это единственный баг в Stage 1, который прошёл мимо линта, сборки и юнит-тестов и был пойман только реальным прогоном `create-admin.sh`-подобной команды.
- Docker-образ `backend`/`worker` в dev-режиме (`nest start --watch`) пишет `dist/` внутрь bind-mount от имени root (контейнер по умолчанию root) — периодически приходилось чистить `dist/`/`node_modules/.vite-temp` через `docker run --rm -v ... alpine rm -rf` перед локальными `npm run build` под своим UID.

### Заметки и грабли (Stage 0, для истории)

- Node/npm недоступны на хосте напрямую — использовался `docker run node:22-alpine` с `-u $(id -u):$(id -g)` и `HOME=/tmp/npm-home`, `npm_config_cache=/tmp/npm-cache` (без этого npm падает с EACCES на `/.npmrc`/`/usr/local/etc`).
- `mongoose@9` и `@nestjs/*` — их `dist` собран как чистый ESM, Jest (CommonJS) падает без `transformIgnorePatterns: ["node_modules/(?!@nestjs/)"]` в jest-конфиге `backend/package.json`.
- `zod@4` несовместим по peer dependency с `@vee-validate/zod@4.15.1` — во frontend зафиксирован `zod@^3.24.0`.
- `express-mongo-sanitize@2.2.0` ломает все запросы под Express 5 — заменён собственным мидлваром. См. ADR-0004.
- Пересоздание контейнера `mongo` без явного `hostname` рвёт replica set. См. ADR-0005.
- Эта сессия работает напрямую на целевом прод-сервере — домен `portfelika.com` уже готов у пользователя, но nginx-proxy-manager на хосте нет. См. ADR-0006.
- Прод-сборка фронтенда не проксирует `/api`/`/health` без явных `location` в `nginx.conf` (в отличие от dev, где это делал Vite).
