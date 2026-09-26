Власне це наш репозиторій, тут основне використовується React, React Router, Tailwind, Docker, Docker Compose.
Додавайте свої сторінки, під'єднуйте апі, додавайте у докер композе, додавайте посилання на свої сторінки на головній сторінці, я потім виправлю її стилі.
[Отут докладніші вимоги до виконання](http://77.47.192.6:8080/projects/smartenergy/wiki/zaghalni-vimoghi-do-proiektu)

У папці obolonka
Через npm run dev запускайте для середовища розробки
Через npm run build збирайте і потім через npm run start запускайте збудоване

або запускайте це все як докер контейнер з кореневої папки

я не знаю, що ще сюди додати, якщо будуть питання, або побажання про уточнення вимог чи щось подібне пишіть в телеграму @Rodion_bon


---
### ТВ-23 Ukrainetc Andriy
**HeatFlow:** "Інструментальні засоби розрахунків схем тепловодопостачання приміщень SmartEnergy Lab"

---

### ТВ-52 Шевченко Олександр
**Document Storage API:** уніфікований REST API для збереження документів,
телеметрії, конфігурацій та результатів моделювання.

Сервіс запускається з Docker Hub-образу
`tv52mpshevchenkoo/smartenergy-docs-storage:latest` разом з ізольованими
MongoDB і Redis. Swagger UI після запуску доступний на
`http://localhost:6066/docs`, health check — на
`http://localhost:6066/api/v1/health`. У frontend також є сторінка
`/docs-storage-ShevchenkoO`, яка вбудовує Swagger UI.

Перед першим запуском скопіюйте `.env.example` до `.env` і вкажіть значення,
що містять щонайменше 32 символи для `DOCUMENT_STORAGE_SECRET_KEY` та
щонайменше 12 символів для `DOCUMENT_STORAGE_ADMIN_PASSWORD`:

```powershell
Copy-Item .env.example .env
```

Після цього запустіть модуль:

```powershell
docker compose up -d document-storage-api
```

---

### ТВ-51мп Онопрієнко Дмитро
**Smart Energy Relational Warehouse:** REST API для збереження та отримання реляційних даних у PostgreSQL.
Сервіс написаний на Kotlin + Spring Boot, схема БД версіонується міграціями Flyway.

Сервіс запускається з Docker Hub-образу
`dmytroonopriienkotv51mpkpi/smart-energy-relational-warehouse:v1` і використовує
спільний контейнер `postgres` (БД `smartenergy`), але зберігає свої таблиці в
окремій схемі `relational_warehouse`, яку Flyway створює автоматично під час
першого запуску. Таблиці інших сервісів у схемі `public` не змінюються.

Запуск модуля (разом з `postgres`):

```powershell
docker compose up -d relational-warehouse-onopriienko
```

- Swagger UI: `http://localhost:6024/swagger-ui.html`
- Специфікація OpenAPI: `http://localhost:6024/v3/api-docs`
- Сторінка у frontend: `/relational-warehouse-Onopriienko` (вбудовує Swagger UI)

Основні ендпоінти:
- `POST /api/temp-control/records` — зберегти запис сенсора
- `GET /api/temp-control/records/latest?sensorId=...` — останній запис сенсора
- `GET /api/temp-control/records?after=...&before=...` — записи за проміжок часу (ISO-8601)
