# Smart Energy Lab

Єдина вебоболонка програмних модулів для натурних стендів лабораторії Smart Energy Lab. Застосунок надає спільну головну сторінку, каталог інтегрованих робіт, пошук, фільтри за функціональним напрямом і датою впровадження та переходи до незалежних маршрутів учасників.

## Репозиторії

- Основний репозиторій: [bondarenkoRodionTV52mp/rozumnaEnergia](https://github.com/bondarenkoRodionTV52mp/rozumnaEnergia)
- Копія в організації КПІ: [2026-TV-52mp/Bondarenko_RO](https://github.com/2026-TV-52mp/Bondarenko_RO)
- Загальні вимоги до проєкту: [Smart Energy Lab Wiki](http://77.47.192.6:8080/projects/smartenergy/wiki/zaghalni-vimoghi-do-proiektu)

## Можливості оболонки

- каталог із 20 інтегрованих програмних модулів;
- змістовні картки з описом, виконавцем, категорією, рівнем роботи та датою впровадження;
- пошук за назвою, описом, виконавцем, категорією, рівнем роботи і датою;
- одночасна фільтрація за категорією та датою;
- підтримка простих і вкладених маршрутів React Router;
- адаптивне відображення для настільних і мобільних екранів;
- окремі Docker-сервіси для модулів, яким потрібні API, бази даних або брокери повідомлень.

## Технології

- React 19 і React Router 7;
- TypeScript та JavaScript;
- Vite, Tailwind CSS і Sass;
- Docker та Docker Compose;
- Vitest для автоматизованих перевірок.

## Швидкий запуск

### Локальна розробка

Потрібні Node.js 20+ та npm.

```bash
cd obolonka
npm ci
npm run dev
```

Головна сторінка буде доступна за адресою, яку виведе dev-сервер.

### Перевірка перед pull request

```bash
cd obolonka
npm run typecheck
npm test
npm run build
```

### Запуск через Docker Compose

Перед першим запуском скопіюйте `.env.example` у `.env` і заповніть потрібні змінні без публікації секретів у Git.

```powershell
Copy-Item .env.example .env
docker compose up -d --build
```

Після запуску оболонка доступна на [http://localhost:5173](http://localhost:5173).

Для запуску лише потрібного сервісу:

```bash
docker compose up -d <service-name>
```

## Вимоги до інтеграції нового модуля

1. Додайте компонент у власний каталог `obolonka/app/routes/<Module_Name>/`.
2. Зареєструйте у `obolonka/app/routes.ts` унікальний стабільний маршрут. Не змінюйте адреси інших учасників.
3. Додайте картку в масив `modules` у `obolonka/app/routes/kotiSivu.tsx`. Обов'язкові поля:
   - `title` — коротка назва;
   - `description` — зрозуміле призначення модуля;
   - `author` — виконавець або команда;
   - `path` — маршрут, що збігається з `routes.ts`;
   - `category` — `Моніторинг`, `Керування`, `Дані` або `Безпека`;
   - `defenseLevel` — `Бакалавр` або `Магістр`;
   - `implementedAt` — погоджена дата впровадження;
   - `icon` та `accent` — піктограма й акцент картки.
4. Не переносіть предметну логіку модуля до головної сторінки. Оболонка відповідає лише за каталог, навігацію та спільну інтеграцію.
5. Ізолюйте стилі модуля. Глобальні CSS-правила не повинні ламати головну сторінку або маршрути інших учасників.
6. Адреси API, токени й паролі передавайте через змінні середовища. Секретні значення не додаються до репозиторію; у `.env.example` залишаються лише назви та безпечні приклади.
7. Якщо потрібен окремий сервіс, додайте його до `docker-compose.yaml` з унікальними назвою, портом і томами. Бажано додати health check.
8. Модуль повинен відкриватися прямим переходом за своєю URL-адресою та після перезавантаження сторінки.
9. Перед передаванням змін виконайте typecheck, тести та виробниче складання.

## Процес спільної розробки

1. Створіть власний fork або гілку від актуальної `main`.
2. Вносьте зміни лише в межах свого модуля та погоджених інтеграційних файлів.
3. Регулярно синхронізуйте гілку з основним репозиторієм.
4. Створіть pull request до `main`.
5. У описі pull request вкажіть:
   - назву та призначення модуля;
   - виконавця;
   - URL маршруту;
   - команди запуску;
   - потрібні змінні середовища;
   - Docker-сервіси та порти;
   - виконані перевірки;
   - знімки екрана для змін інтерфейсу.
6. Не додавайте згенеровані файли, локальні бази даних, `.env`, паролі, токени або персональні ключі.

## Інтегровані проєкти

Посилання наведено лише для репозиторіїв, підтверджених Git remote або документацією проєкту. Відсутню адресу слід замінити посиланням на репозиторій виконавця в організації КПІ після його публікації.

| № | Проєкт | Виконавець / команда | Маршрут | Репозиторій |
|---:|---|---|---|---|
| 1 | Smart Energy EMS | Троян | `/func_stab_Troian` | [grilok777/rozumnaEnergia](https://github.com/grilok777/rozumnaEnergia) |
| 2 | Моніторинг енергосистеми | Монастирний | `/Monitoring_Monastyrnyi` | — |
| 3 | Функціональна стійкість | Анастасія Шевченко | `/functional-stability-shevchenko` | [MistressMorgana/rozumnaEnergia](https://github.com/MistressMorgana/rozumnaEnergia) |
| 4 | Моделювання теплових потоків | Андрій Українець | `/heat-flow` | [UkraintetsAndriyKPI/rozumnaEnergia](https://github.com/UkraintetsAndriyKPI/rozumnaEnergia) |
| 5 | Адаптивний клімат-контроль | Червоний | `/adaptive-climate-Chervonyi` | — |
| 6 | Smart Energy Build System | Іщук | `/smart-energy` | [puvlikkpi/rozumnaEnergia](https://github.com/puvlikkpi/rozumnaEnergia) |
| 7 | Акумуляторна система | Колодько | `/Battery_Kolodko` | [DashaKolodko05/rozumnaEnergia](https://github.com/DashaKolodko05/rozumnaEnergia) |
| 8 | Гібридний інвертор | Досмухамедов | `/HybridInverter_Dosmukhamedov` | [Xera08/rozumnaEnergia](https://github.com/Xera08/rozumnaEnergia) |
| 9 | Синусоїдальний інвертор | Олександр Семенчук / інтеграція Родіон Бондаренко | `/sinusInvertor` | [SSSOM228/rozumnaEnergia](https://github.com/SSSOM228/rozumnaEnergia) |
| 10 | Ефективне використання | Маріна Барабаш | `/effective-use` | — |
| 11 | Балансування енергії | Гойчук О. В. | `/energy-balance-hoichuk` | — |
| 12 | Сховище документів | Олександр Шевченко | `/docs-storage-ShevchenkoO` | — |
| 13 | Реляційне сховище | Дмитро Онопрієнко | `/relational-warehouse-Onopriienko` | — |
| 14 | Керування даними | Назар Риженко | `/DataManager_Ryzhenko` | — |
| 15 | IoT Gateway | Микита Гончаренко | `/iot-gateway` | — |
| 16 | Блокчейн-верифікація | Дарія Сидоренко | `/Chain_security_Sydorenko` | — |
| 17 | Кіберзахист | Ростислав Кротенко | `/cybersecurity` | — |
| 18 | Контроль доступу Zero Trust | Дмитро Стельмах | `/zero-trust-Stelmakh` | [DimonStelmakh/MastersDiplomaWork](https://github.com/DimonStelmakh/MastersDiplomaWork) |
| 19 | Захист телеметрії | Медведєв | `/telemetry-security-medvediev` | — |
| 20 | Криптомоніторинг | Ярослав Губін | `/cryptomonitoring_Hubin` | [YaroslavHubin/rozumnaEnergia](https://github.com/YaroslavHubin/rozumnaEnergia) |

## Модулі з окремими інструкціями

### Document Storage API

Сервіс Олександра Шевченка використовує MongoDB і Redis. Перед запуском задайте `DOCUMENT_STORAGE_SECRET_KEY` (щонайменше 32 символи) і `DOCUMENT_STORAGE_ADMIN_PASSWORD` (щонайменше 12 символів), потім виконайте:

```bash
docker compose up -d document-storage-api
```

- Swagger UI: [http://localhost:6066/docs](http://localhost:6066/docs)
- Health check: [http://localhost:6066/api/v1/health](http://localhost:6066/api/v1/health)
- Сторінка оболонки: `/docs-storage-ShevchenkoO`

### Smart Energy Relational Warehouse

Сервіс Дмитра Онопрієнка працює на Kotlin і Spring Boot, використовує PostgreSQL та міграції Flyway.

```bash
docker compose up -d relational-warehouse-onopriienko
```

- Swagger UI: [http://localhost:6024/swagger-ui.html](http://localhost:6024/swagger-ui.html)
- OpenAPI: [http://localhost:6024/v3/api-docs](http://localhost:6024/v3/api-docs)
- Сторінка оболонки: `/relational-warehouse-Onopriienko`

### Zero Trust

Перед запуском заповніть змінні `ZT_STELMAKH_*` у локальному `.env`.

```bash
docker compose up -d zt-access-stelmakh
```

- Сторінка у frontend: `/zero-trust-Stelmakh`
- Swagger UI: `http://localhost:6021/docs`, health check: `http://localhost:6021/health`
- Під час першого старту створюється довідник операцій і суперадміністратор (`ZT_STELMAKH_ADMIN_*`).

### ТВ-52мп Сидоренко Дар'я
**SmartEnergy Security Dashboard:** Моніторинг функціональної стійкості програмного комплексу SmartEnergy із використанням блокчейн-технологій. 

Модуль фіксує енергетичні показники (напруга, струм, потужність) у незмінному криптографічному реєстрі Hyperledger Fabric, забезпечуючи захист від підміни даних у БД (Data Tampering) та виявлення фізичних/кібераномалій (FDIA) у реальному часі.

Бекенд написаний на Python, використовує власну ізольовану БД PostgreSQL та складається з двох сервісів: REST API для перевірки цілісності та симулятора IoT-телеметрії (генератора атак). 
Образ бекенду: `dariasydorenko22/smartenergy-backend:v1`.

Запуск модуля (включає базу даних, API та генератор трафіку):

```powershell
docker compose up -d sydorenko-db sydorenko-api sydorenko-generator
```

- Сторінка у frontend (Панель безпеки): /Chain_security_Sydorenko
- Локальний API бекенду: http://localhost:6009

## Контакт

Питання щодо інтеграційної оболонки, маршрутів і pull request: Telegram [@Rodion_bon](https://t.me/Rodion_bon).
