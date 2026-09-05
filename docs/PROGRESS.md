## Текущий этап: 2 — Портфель, кастомные активы, операции — ЗАВЕРШЁН

Ветка: `stage/02-portfolio`, ещё не смёржена в `main` — задеплоена на прод для ручной проверки пользователем (аналогично Stage 1).

### Сделано (Stage 2)

- [x] `portfolios` (`backend/src/portfolios/`) — создаётся автоматически при регистрации (`AuthService.register` → `PortfoliosService.createDefault`, тот же путь и в `scripts/create-admin.ts`). 1:1 с пользователем, `baseCurrency` по умолчанию `USD`, `settings.costBasis` жёстко `FIFO`. `GET/PATCH /portfolio`. Смена валюты пока не запускает пересчёт — `recalcFrom` не трогается в Stage 2, это забота Stage 3 (сам движок).
- [x] `assets` (`backend/src/assets/`) — только `kind: 'custom'` (`central` скрыт за фиче-флагом до Stage 7, попытка создать его — `BAD_REQUEST` на уровне DTO). Типы: `deposit`/`bond`/`cash`/`realty`/`other`. Двухступенчатое «где хранится» (`custody.country` + `custody.holder`) с автокомплитом через `custody_places` (накопление usageCount при каждом сохранении актива с этим полем). Блок `income` (проценты/купон/дивиденд/аренда, период, `anchorDay` **вычисляется на сервере** из `firstAccrualDate`, никогда не берётся с клиента — SPEC.md §4.7) — сохраняется полностью, но генератор начислений не запускается: это Stage 5. CRUD + мягкое удаление.
- [x] `operations` (`backend/src/operations/`) — создаваемые в Stage 2 типы: `BUY`, `SELL` (требуют `quantity`+`price`, `amount` пересчитывается на сервере как `quantity × price`, клиентский `amount` игнорируется), `INCOME`, `FEE`, `REVALUATION`, `PRINCIPAL_IN` (требуют `amount`). Остальные типы из полного enum спеки (`TAX`, `MATURITY`, `WALLET_IN/OUT`, `FX_EXCHANGE`, `SPLIT_ADJUST`) отклоняются DTO-валидацией — форма данных уже готова под них, но бизнес-логика приедет со своим этапом (кошельки — 4, начисления/погашение — 5, корп. действия — 10). `seq` для FIFO-порядка внутри дня считается на сервере (`max(seq за portfolioId+date) + 1`). Дата нормализуется в UTC-полночь. Лента с фильтрами `assetId/type/from/to`, CRUD + мягкое удаление.
- [x] Справочники (`backend/src/dictionaries/`, `backend/src/common/dictionaries/`) — `currencies` (5 валют из D-24), `countries` (статический список ~55 стран, en/ru), `custody-places` (автокомплит, скоуп по пользователю).
- [x] `fx_rates` (`backend/src/fx-rates/`) — только ручной ввод админом (`GET/POST /admin/fx-rates`, `RolesGuard('admin')`), upsert по `{base, quote, date}`. Никаких провайдеров — это Stage 9.
- [x] Юнит-тесты backend: 44 зелёных (было 38 в Stage 1) — новый `operations.service.spec.ts` покрывает вывод `amount` для BUY/SELL, обязательные поля по типу, `seq`, нормализацию даты, проверку принадлежности актива портфелю.
- [x] Frontend: `AssetsView`/`AssetFormView` (форма создания/редактирования + вложенная лента операций актива с инлайн-формой), `OperationsView` (глобальная лента с фильтрами) + переиспользуемый `components/OperationForm.vue`, `admin/FxRatesView`, сторы `portfolio/assets/operations/dictionaries/fx-rates.store.ts`, нав-ссылки «Активы»/«Операции»/«Админка» (последняя только для `role: admin`), i18n ru/en для всех новых экранов.
- [x] **Реально задеплоено и вручную проверено curl'ом на проде** (см. ниже) — полный цикл register→portfolio→asset(deposit+income)→asset(cash)→operations(PRINCIPAL_IN/INCOME/BUY)→фильтры→PATCH/DELETE→admin fx-rates upsert→RolesGuard 403 для не-админа.

### Три реальных бага, найденных только живой проверкой (не поймали ни lint, ни build, ни юнит-тесты)

1. **`@Prop()` без явного `type:` на поле с union-типом (включая `T | null`) валится с `Cannot determine a type for the "<Model>.<field>" field` при первом импорте схемы** — TypeScript эмитит `Object` для любого union в `design:type`-метаданных, `@nestjs/mongoose` не может вывести Mongoose-тип и Mongoose бросает исключение прямо при регистрации схемы (не в рантайме запроса — раньше, при импорте модуля). Пойман юнит-тестом (`operations.service.spec.ts`, который транзитивно импортирует `asset.schema.ts`). Исправлено — везде, где TS-тип поля содержит `|`, `@Prop()` получает явный `type:` (`String`/`Number`/...). См. ADR-0008.
2. **`@Prop({ type: Types.ObjectId, ... })` тихо превращается в `Mixed`** — `Types.ObjectId` (BSON value-класс) не проходит проверку `@nestjs/mongoose` на «это Mongoose SchemaType», в отличие от `mongoose.SchemaTypes.ObjectId`. Поле молча становится `Mixed`: запись работает (JS-значение уже было готовым `ObjectId`), но `findOne({ userId: '<строка>' })` перестаёт кастовать строку и ничего не находит. Это баг всего проекта, включая Stage 1 (`RefreshToken.userId`, `EmailToken.userId`) — просто там ни разу не искали по «сырой» строке. Пойман живым curl'ом: только что созданный при регистрации портфель отвечал `PORTFOLIO_NOT_FOUND`. Исправлено — `type: SchemaTypes.ObjectId` везде. См. ADR-0009.
3. **`nginx.conf`'s `location /assets/` (кеш статики сборки Vite) перехватывал наш собственный роут `/assets` и `/assets/:id`** — `/assets/<id>` отдавал голый 404 от nginx, `/assets` редиректился в статическую директорию вместо SPA. Только в проде через настоящий nginx (в `vite dev` такого перехвата нет). Исправлено — вынесли выход сборки Vite в `dist/build-assets/` (`vite.config.ts`'s `build.assetsDir`), обновили `nginx.conf`. См. ADR-0010.

### Реальная проверка на проде (эта сессия)

```
POST /auth/register → portfolio auto-created (GET /portfolio: baseCurrency USD, settings.costBasis FIFO)
POST /assets (deposit, income.enabled=true, custody RU/Sberbank) → anchorDay вычислен как 15 из firstAccrualDate
POST /assets (cash, без custody/income) → оба видны в GET /assets
GET /dictionaries/custody-places?country=RU → [{country:"RU", holder:"Sberbank"}] — автокомплит работает после первого использования
POST /operations PRINCIPAL_IN на депозит (amount=100000 RUB) → seq=0
POST /operations INCOME (amount=1041.67, tax=135.4) → создан, отредактирован (PATCH tax=150), удалён (DELETE → 204, пропал из GET /operations?assetId=)
POST /operations BUY на cash-актив (quantity=500, price=1) → amount пересчитан сервером = "500"
POST /operations BUY без price → 400 OPERATION_FIELD_REQUIRED {type:"BUY", field:"price"}
PATCH /assets/:id (rename + status=closed) → применилось
DELETE /assets/:id (cash) → 204, GET того же id → 404 ASSET_NOT_FOUND, пропал из списка
create-admin.sh → создан второй пользователь role=admin, у него тоже отдельный portfolio (та же логика createDefault)
GET /admin/fx-rates под user-токеном → 403 FORBIDDEN_ROLE
POST /admin/fx-rates под admin-токеном (USD/RUB, 2024-01-15, 92.5) → создан; повторный POST на тот же {base,quote,date} с другим rate → апдейтнул тот же id (upsert), не задублировал
POST /admin/fx-rates base=quote=USD → 400 (class-validator: "quote must differ from base")
Все три бага выше найдены и исправлены в рамках этой же живой проверки, до передачи пользователю.
```

Визуально в браузере не проверялось — как и в Stage 1, пользователь тестирует сам после деплоя ветки.

### В работе / не начато

- [ ] Ручная проверка UI пользователем в браузере — ветка задеплоена, ждём подтверждения (аналогично Stage 1).
- [ ] `deploy.sh`, `backup.sh`, `restore.sh`, `seed-instruments.sh`, `logs.sh` — по-прежнему не сделаны (ADR-0003), не в скоупе Stage 2.
- [ ] `audit_log` — всё ещё не заведён: `/admin/fx-rates` — первый admin-эндпоинт, но SPEC.md's audit_log предназначен для действий над пользователями/инструментами и т.п.; можно завести вместе с первым таким эндпоинтом (Stage 7+) либо раньше, если появится вторая admin-операция. Не блокирует Stage 2 DoD.
- [ ] Смена `baseCurrency` портфеля не запускает пересчёт (`recalcFrom` не используется вообще в Stage 2) — намеренно, это Stage 3.
- [ ] Никакой валидации «хватает ли на продажу» и т.п. — расчётного ядра ещё нет (Stage 3), Stage 2 только хранит операции как есть.

### Следующий шаг

После подтверждения пользователем — смёржить `stage/02-portfolio` в `main` и запушить. Затем начинать **Stage 3 — расчётное ядро** (`backend/src/engine`, FIFO-лоты, дневные снимки, TWR/XIRR, инвалидация от `recalcFrom`) на ветке `stage/03-engine` (SPEC.md §12).

### Заметки и грабли (Stage 2)

- **Три системных бага этого этапа — все три пойманы только живой проверкой на реальном проде**, ни один не поймали `nest build`/`vue-tsc`/eslint/юнит-тесты. Смотри ADR-0008, ADR-0009, ADR-0010 — это не разовые опечатки, а классы багов: (а) union-типы в `@Prop()` без явного `type`, (б) `Types.ObjectId` вместо `SchemaTypes.ObjectId` в `@Prop()`, (в) nginx `location`-префиксы, случайно перехватывающие фронтенд-роуты. Любой новый код, попадающий в эти же паттерны, стоит проверять по этому списку до деплоя, а не после.
- Циклическая зависимость между `AssetsModule` и `OperationsModule` решена так же, как в Stage 1 между Users/Auth: `OperationsModule` импортирует `AssetsModule` (нужен `AssetsService.findOneForPortfolio` для проверки принадлежности актива), но не наоборот — эндпоинт `GET /assets/:id/operations` живёт в отдельном `AssetOperationsController` внутри `OperationsModule`, а не как метод `AssetsController`.
- `idempotencyKey` в `operations`: sparse-уникальный индекс не спасает, если поле явно выставлено в `null` (`default: null` в схеме) — sparse исключает только по-настоящему отсутствующие поля. Убрали `default`, поле теперь либо не устанавливается вовсе (Stage 2), либо ставится явно из Stage 5 (авто-начисления).
