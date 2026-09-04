## Текущий этап: 0 — Каркас

Ветка: main (Stage 0 сделан прямо на main — веток `stage/NN-slug` ещё не заводили; со Stage 1 переходим на них, как требует SPEC.md §12)

### Сделано

- [x] Монорепо: `backend/`, `frontend/`, `scripts/`, `docs/`, `design/`
- [x] `design/prototype.html` — скачан из репозитория прототипа, токены (цвета light/dark, типографика, отступы, радиусы, тени) вытащены в `frontend/src/styles/tokens.css`
- [x] Backend: NestJS (Nest CLI 11), TypeScript, `/health` (liveness) + `/health/ready` (Mongo + Redis), единый формат ошибок (`AllExceptionsFilter`, `code`/`message`/`details`/`traceId`), pino через `nestjs-pino` с `traceId` на запрос, helmet + CORS allowlist + собственный mongo-sanitize мидлвар (см. ADR-0004) + `ValidationPipe`, префикс `/api/v1` (health вне префикса)
- [x] `Money`/`Qty` — обёртки над `decimal.js` (`backend/src/common/money/`), Decimal128 на входе/выходе, precision 20 / half-up, сериализация в строку. Юнит-тесты зелёные.
- [x] `worker` — отдельная точка входа (`backend/src/worker.ts`, тот же образ), пока без BullMQ-процессоров (появятся с начислениями/провайдерами)
- [x] `local/no-number-money` — общее ESLint-правило (`eslint-rules/no-number-money.cjs`), подключено и в backend, и в frontend
- [x] Frontend: Vue 3.5 + Vite + TS (Composition API), Pinia, vue-router, vue-i18n (ru/en, ru по умолчанию), базовый layout с переключателем языка, Dashboard-заглушка с живой проверкой `/health`
- [x] `docker-compose.yml` (прод-топология: без публикации портов, внешняя сеть `npm_network`, mongo как одноузловой rs0, `hostname: mongo` — см. ADR-0005) + `docker-compose.dev.yml` (mailhog, hot-reload через bind-mount, **порт наружу публикует только frontend** — :5173; backend/mongo/redis/mailhog доступны исключительно из compose-сети, по требованию пользователя в сессии)
- [x] `scripts/install.sh` — идемпотентный: генерирует `.env`, поднимает сеть, ставит зависимости, инициирует replica set (явный host, ADR-0005), поднимает стек, ждёт `/health`
- [x] ESLint + Prettier (backend и frontend), husky pre-commit → lint-staged
- [x] `.github/workflows/ci.yml` — lint + build + test, отдельные job'ы для backend/frontend
- [x] `docs/PROGRESS.md`, `docs/DECISIONS.md`, `docs/API.md`
- [x] Стек реально поднят и проверен end-to-end на этой машине: `docker compose ps` — все 6 контейнеров `Up`/`healthy`; `GET /health` → `{"status":"ok"}`; `GET /health/ready` → `200 {"status":"ok","checks":{"mongo":"ok","redis":"ok"}}`; `curl http://localhost:5173/` → `200`; `curl http://localhost:5173/health` (через vite-прокси на backend) → `{"status":"ok"}`; порты 3000/27017/6379/8025 подтверждённо недоступны с хоста. Переключение языка в браузере визуально не проверялось (нет доступа к браузеру из сессии) — код-ревью пройден (i18n/Pinia wiring, юнит-тестами не покрыто).

### В работе / не начато

- [ ] `deploy.sh`, `create-admin.sh`, `backup.sh`, `restore.sh`, `seed-instruments.sh`, `logs.sh` — сознательно не сделаны в Stage 0, см. `docs/DECISIONS.md` ADR-0003.

### Следующий шаг

Начинать Stage 1 (аутентификация без внешней почты, SPEC.md §12) на ветке `stage/01-auth`.

### Заметки и грабли

- Node/npm недоступны на хосте напрямую — использовался `docker run node:22-alpine` с `-u $(id -u):$(id -g)` и `HOME=/tmp/npm-home`, `npm_config_cache=/tmp/npm-cache` (без этого npm падает с EACCES на `/.npmrc`/`/usr/local/etc`, потому что образ по умолчанию рассчитан на root).
- `mongoose@9` и `@nestjs/config`/`@nestjs/mongoose` — их `dist` собран как чистый ESM, Jest (CommonJS) падает с "Must use import to load ES Module", пока не добавить `transformIgnorePatterns: ["node_modules/(?!@nestjs/)"]` в jest-конфиг `backend/package.json`.
- `@typescript-eslint/no-unsafe-enum-comparison` не различает "переменная объявлена как plain number" — ловит любое сравнение с членом enum (например `mongoose.ConnectionStates`), даже если один из операндов явно затипизирован как `number`. Обходили сравнением с числовым литералом вместо enum-члена там, где это уместно.
- `zod@4` несовместим по peer dependency с `@vee-validate/zod@4.15.1` (тот требует `^3.24.0`) — во frontend зафиксирован `zod@^3.24.0`.
- TypeScript (frontend, `~6.0.2`) считает `baseUrl` в tsconfig deprecated — алиас `@/*` заведён через `paths` без `baseUrl`.
- `design/prototype.html` изначально был недоступен (репозиторий приватный/404 по прямой ссылке) — пользователь прислал tokenized raw-URL в процессе сессии, файл скачан и токены вытащены оттуда.
- `express-mongo-sanitize@2.2.0` ломает **вообще все** запросы под Express 5 (`req.query = ...` → `TypeError`, `query` теперь только-геттер) — backend висел и не отвечал на `/health` только из-за этого, ни линт, ни юнит-тесты этого не ловят, только реальный прогон стека. См. ADR-0004.
- Пересоздание контейнера `mongo` без явного `hostname` меняет self-hostname, на который завязан `rs.initiate()` — реплика-сет ломается тихо (`ping` ещё отвечает, `rs.status()` уже нет), backend виснет внутри `NestFactory.create()` навсегда. См. ADR-0005.
