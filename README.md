<a id="top"></a>

<p align="right">
  <a href="README.en.md">English</a>
</p>

<p align="center">
  <img src="public/icon.svg" width="100" alt="Cosmos Explorer">
</p>

<h1 align="center">Cosmos Explorer</h1>

<p align="center">
  <em>Интерактивная 3D-модель Солнечной системы и энциклопедия космических миссий</em><br>
  <em>Next.js 15 + React 19 + Three.js + Go + Connect-RPC + PostgreSQL</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-%2344aaff.svg?style=for-the-badge" alt="v1.0.0">
  <img src="https://img.shields.io/badge/Next.js-15-%23000000.svg?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js 15">
  <img src="https://img.shields.io/badge/React-19-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-5-%233178C6.svg?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript 5">
  <img src="https://img.shields.io/badge/Three.js-r171-%23000000.svg?style=for-the-badge&logo=threedotjs&logoColor=white" alt="Three.js">
  <img src="https://img.shields.io/badge/Go-1.25-%2300ADD8.svg?style=for-the-badge&logo=go&logoColor=white" alt="Go 1.25">
  <img src="https://img.shields.io/badge/Connect--RPC-v1-%23161823.svg?style=for-the-badge" alt="Connect-RPC">
  <img src="https://img.shields.io/badge/PostgreSQL-16-%234169E1.svg?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL 16">
  <img src="https://img.shields.io/badge/Docker-Ready-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white" alt="Docker">
</p>

<p align="center">
  <a href="https://cosmos.lavier.tech" target="_blank" rel="noopener">
    <img src="https://img.shields.io/badge/%F0%9F%8C%90%20Открыть%20сайт-cosmos.lavier.tech-%2344aaff?style=for-the-badge&labelColor=2D3748" alt="Открыть Cosmos Explorer">
  </a>
</p>

<p align="center">
  <a href="#демо">Демо</a>&nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#о-проекте">О проекте</a>&nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#возможности">Возможности</a>&nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#быстрый-старт">Быстрый старт</a>&nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#технологии">Технологии</a>&nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#api">API</a>&nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#тестирование">Тестирование</a>&nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#архитектура">Архитектура</a>
</p>

---

## Демо

<p align="center">
  <a href="https://cosmos.lavier.tech" target="_blank" rel="noopener">
    <img src="public/og-image.png" alt="Cosmos Explorer — превью" width="720">
  </a>
  <br>
  <sub>Нажмите на превью, чтобы открыть живую версию</sub>
</p>

---

## О проекте

**Cosmos Explorer** — интерактивная 3D-симуляция Солнечной системы с энциклопедией космических миссий. Сцена на **Three.js** рендерит 8 планет с орбитальной механикой, симуляцией траекторий межпланетных миссий и живым трекером МКС по WebSocket. Контентная часть — **281 статическая страница** (SSG + ISR): энциклопедия из **128 миссий** и карточки планет на двух языках. Бэкенд на **Go** отдаёт данные через **Connect-RPC** — один эндпоинт одновременно обслуживает gRPC, gRPC-Web и обычный JSON. Контракт между фронтендом и бэкендом типизирован через **Protobuf**: TypeScript-клиенты и Go-стабы генерируются из единой `.proto`-схемы. Вся инфраструктура упакована в **Docker**; деплой полностью автоматизирован — GitHub Actions собирает образы в GHCR и выкатывает на VPS с health-gate и автооткатом.

---

## Возможности

<table>
<tr>
<td valign="top" width="50%">

### Интерактивная сцена

- 3D Солнечная система в реальном времени
- 8 планет с орбитальной механикой и постобработкой (bloom)
- Панели планет: обзор, атмосфера, спутники, миссии
- Симуляция траекторий межпланетных миссий
- Живой трекер МКС (WebSocket, обновление раз в секунду)
- Управление временем: пауза и регулировка скорости

</td>
<td valign="top" width="50%">

### Платформа

- Энциклопедия 128 космических миссий с фильтрами и поиском
- Два языка: английский (по умолчанию) и русский, автоопределение по Accept-Language
- 281 статическая страница: SSG + ISR-обновление по cache-тегам
- SEO: JSON-LD, динамический sitemap, hreflang, OG-изображения для каждой сущности
- PWA с офлайн-режимом (Serwist)
- Безопасность: CSP, HSTS, rate limiting, distroless-образы

</td>
</tr>
</table>

<p align="right"><a href="#top">наверх</a></p>

---

## Быстрый старт

Требования: Node 22+, Docker + Compose v2. GNU Make опционален, но сокращает команды.

```bash
git clone https://github.com/laviercasey/cosmos-explorer.git
cd cosmos-explorer
cp .env.example .env
cp .env.example .env.local
```

```bash
make up            # или: docker compose up -d db api
make migrate-up    # или: docker compose --profile tools run --rm migrate
make seed          # или: docker compose --profile tools run --rm seed

npm install
npm run dev        # http://localhost:3000
```

Проверка API:

```bash
curl http://localhost:8080/healthz
curl -X POST http://localhost:8080/cosmos.v1.CosmosService/ListPlanets \
  -H "Content-Type: application/json" -d '{"limit":3,"lang":"en"}'
```

Production-деплой (GitHub Actions → GHCR → VPS), секреты, первичный bootstrap, откат и бэкапы: [`deploy/README.md`](deploy/README.md)

<details>
<summary>Сервисы и порты</summary>

<br>

| Сервис | Порт | Назначение |
|:--|:--|:--|
| **cosmos-frontend** | `3000` | Next.js 15 standalone |
| **cosmos-api** | `8080` | Go + Connect-RPC + WebSocket |
| **cosmos-db** | `5432` (локально) | PostgreSQL 16 |

</details>

<details>
<summary>Ключевые переменные окружения (.env)</summary>

<br>

| Переменная | Описание | По умолчанию |
|:--|:--|:--|
| `DATABASE_URL` | Строка подключения PostgreSQL (pgx) | - |
| `API_INTERNAL_URL` | Адрес API для серверных фетчей Next.js | `http://cosmos-api:8080` |
| `NEXT_PUBLIC_SITE_URL` | Публичный URL сайта (canonical, OG, sitemap) | - |
| `NEXT_PUBLIC_API_BASE_URL` | Публичный адрес API для браузера | - |
| `REVALIDATE_SECRET` | Секрет для `POST /api/revalidate` (ISR-инвалидация) | - |
| `NEXT_PUBLIC_GOOGLE_VERIFICATION` | Мета-тег Google Search Console | пусто |
| `NEXT_PUBLIC_YANDEX_VERIFICATION` | Мета-тег Яндекс Вебмастера | пусто |
| `NEXT_PUBLIC_UMAMI_SRC` / `_WEBSITE_ID` / `_ALLOWED_HOSTS` | Self-hosted аналитика Umami | пусто |
| `CONNECT_RATE_RPS` / `CONNECT_RATE_BURST` | Rate limiting RPC-эндпоинтов (на IP) | `20` / `40` |
| `WS_RATE_RPS` / `WS_RATE_BURST` | Rate limiting WebSocket-подключений | `3` / `5` |
| `IMAGE_PREFIX` / `IMAGE_TAG` | GHCR-образы для production-стека | - / `latest` |

Полный список — в [`.env.example`](.env.example) и [`.env.prod.example`](.env.prod.example).

</details>

<details>
<summary>Первичный запуск в production (VPS)</summary>

<br>

Перед первым `push` в `main` выполните на VPS один раз:

```bash
sudo mkdir -p /opt/apps/cosmos /opt/backups/cosmos
sudo chown $USER:$USER /opt/apps/cosmos /opt/backups/cosmos
docker network create caddy-net || true
```

Создайте `/opt/apps/cosmos/.env` из [`.env.prod.example`](.env.prod.example) и добавьте site-блок из [`deploy/Caddyfile.example`](deploy/Caddyfile.example) в конфиг хостового Caddy. Подробный runbook: [`deploy/README.md`](deploy/README.md).

После первого успешного деплоя файл `.last-good-sha` создаётся автоматически — он используется для автоотката при сбое health-gate.

</details>

<p align="right"><a href="#top">наверх</a></p>

---

## Технологии

<table>
<tr>
<td valign="top" width="50%">

### Фронтенд

| | Технология |
|:--|:--|
| Фреймворк | **Next.js 15** (App Router, standalone) |
| UI | **React 19** + **TypeScript 5** (strict) |
| 3D | **Three.js** + постобработка |
| Рендеринг | **SSG + ISR** (281 страница, cache-теги) |
| i18n | **next-intl** (en / ru) |
| PWA | **Serwist** (офлайн-режим) |
| Тесты | **Vitest** + Testing Library |

</td>
<td valign="top" width="50%">

### Бэкенд и инфраструктура

| | Технология |
|:--|:--|
| Язык | **Go 1.25** |
| RPC | **Connect-RPC** (gRPC / gRPC-Web / JSON) |
| Схема | **Protobuf** + **buf** (codegen TS и Go) |
| База данных | **PostgreSQL 16** (pgx) |
| Реалтайм | **WebSocket** (трекер МКС) |
| Контейнеры | **Docker** + distroless, non-root |
| CI/CD | **GitHub Actions** → **GHCR** → VPS |

</td>
</tr>
</table>

<p align="right"><a href="#top">наверх</a></p>

---

## API

Единый сервис `cosmos.v1.CosmosService` обслуживает три протокола на одном эндпоинте: gRPC (HTTP/2), gRPC-Web и обычные JSON-запросы по POST.

```
POST /cosmos.v1.CosmosService/ListPlanets           Список планет
POST /cosmos.v1.CosmosService/GetPlanet             Планета по slug
POST /cosmos.v1.CosmosService/ListMissions          Список миссий (фильтры, пагинация)
POST /cosmos.v1.CosmosService/GetMission            Миссия по slug
POST /cosmos.v1.CosmosService/ListTrajectories      Все траектории миссий
POST /cosmos.v1.CosmosService/GetMissionTrajectory  Траектория одной миссии
GET  /ws/iss                                        WebSocket: позиция МКС (1 Гц)
GET  /healthz                                       Liveness-проба
```

### Пример запроса

```bash
curl -X POST https://cosmos.lavier.tech/cosmos.v1.CosmosService/GetPlanet \
  -H 'Content-Type: application/json' \
  -d '{"slug":"earth","lang":"ru"}'
```

<details>
<summary>Особенности API</summary>

<br>

- Типизированный контракт: единая `.proto`-схема, из которой генерируются Go-стабы и TypeScript-клиенты (`buf generate`)
- Локализация данных на уровне API: `lang: en | ru` в каждом запросе
- Rate limiting на IP (настраивается через env, см. `CONNECT_RATE_*`)
- ISR-инвалидация фронтенда: `POST /api/revalidate` с заголовком `x-revalidate-secret` и cache-тегом
- Фронтенд использует сгенерированный Connect-клиент и серверные фетчи Next.js с cache-тегами — без ручных адаптеров

</details>

<p align="right"><a href="#top">наверх</a></p>

---

## Тестирование

```bash
npm run test            # фронтенд: Vitest (122 теста)
npm run test:coverage   # с отчётом покрытия
npm run verify          # typecheck + lint + test

cd backend
go test ./... -race     # бэкенд: юнит-тесты с детектором гонок
```

| Уровень | Покрытие |
|:--|:--|
| **Фронтенд** | 14 файлов, 122 теста: адаптеры API, виджеты, i18n, утилиты сцены |
| **Бэкенд** | Конфиг, sеed-пайплайн, Connect-хендлеры, middleware, спутниковая математика, WebSocket-хаб |
| **CI** | typecheck, lint, тесты, gofmt, go vet, staticcheck — на каждый PR |

<p align="right"><a href="#top">наверх</a></p>

---

## Архитектура

### Инфраструктура

```
  Browser ──▶ Caddy (TLS) ──▶ cosmos-frontend:3000   Next.js 15 standalone
                  │                    │
                  │                    ▼  Connect-RPC (server fetch, ISR)
                  ├──▶ /cosmos.v1.* ──▶ cosmos-api:8080   Go + Connect-RPC
                  └──▶ /ws/iss ───────▶ cosmos-api:8080   WebSocket-хаб
                                               │
                                               ▼
                                       cosmos-db:5432   PostgreSQL 16
```

<details>
<summary>Структура проекта</summary>

<br>

```
cosmos-explorer/
├── app/                          # Next.js App Router
│   ├── [locale]/                 # Локализованные маршруты (en / ru)
│   │   ├── planets/[slug]/       # Карточки планет + OG-изображения
│   │   └── missions/[slug]/      # Карточки миссий + OG-изображения
│   ├── api/revalidate/           # ISR-инвалидация по cache-тегам
│   ├── sitemap.ts                # Динамический sitemap из БД
│   └── robots.ts                 # Правила для краулеров
├── src/                          # Feature-Sliced Design
│   ├── app/providers/            # Провайдеры (аналитика, Umami)
│   ├── widgets/                  # cosmos-scene, hud, planet-panel,
│   │                             # missions-panel, iss-tracker, sidebar
│   ├── entities/                 # planet, mission — модели и адаптеры
│   └── shared/                   # api (Connect-клиент + gen), lib/scene,
│                                 # seo, i18n, ui, config
├── backend/                      # Go-бэкенд
│   ├── cmd/{server,seed}/        # Точки входа
│   ├── internal/grpcsvc/         # Connect-хендлеры CosmosService
│   ├── internal/realtime/        # WebSocket-хаб трекера МКС
│   ├── internal/satellites/      # Орбитальная математика (SGP4)
│   ├── internal/store/           # PostgreSQL-репозитории (pgx)
│   └── seed/data/                # Seed-данные (запекаются в образ)
├── proto/cosmos/v1/              # Protobuf-схема (источник истины API)
├── i18n/ + messages/             # next-intl: роутинг и словари
├── deploy/                       # Runbook деплоя + Caddyfile.example
└── .github/workflows/            # ci.yml, deploy.yml, rollback.yml
```

</details>

<details>
<summary>Деплой-пайплайн</summary>

<br>

| Этап | Что происходит |
|:--|:--|
| **CI** | typecheck, lint, Vitest, gofmt, go vet, staticcheck, go test -race |
| **Build** | Backend-образ → GHCR; рядом поднимается одноразовый Postgres + API, и фронтенд собирается против живого API — 281 страница пререндерится прямо в образ |
| **Backup** | pg_dump на VPS перед каждым деплоем (хранится 30 дней) |
| **Deploy** | Pull образов по SHA-тегу, миграции, посев пустой БД, health-gate 120 с |
| **Rollback** | При провале health-gate — автооткат на последний рабочий SHA |
| **Warm-up** | После успеха — инвалидация ISR-тегов и прогрев ключевых маршрутов |

</details>

<details>
<summary>Безопасность</summary>

<br>

| Механизм | Реализация |
|:--|:--|
| **Заголовки** | CSP, HSTS, X-Frame-Options, Referrer-Policy (middleware) |
| **Rate limiting** | Per-IP token bucket на RPC и WebSocket (настраивается env) |
| **Образы** | Backend — distroless static, non-root; frontend — alpine, non-root |
| **ISR-инвалидация** | Секрет в заголовке, timing-safe сравнение, allow-list тегов |
| **Секреты** | Только env / GitHub Secrets, в репозитории секретов нет |
| **CORS** | Явный allow-list origin-ов в production |

</details>

<p align="right"><a href="#top">наверх</a></p>
