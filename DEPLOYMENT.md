# MambaX — Deployment Guide

## Архитектура проекта

```
mambax-backend/                    ← GitHub repo: DenisMit3/mambax-backend
├── frontend/                      ← Next.js 14 (Vercel project: "frontend")
│   ├── src/app/                   ← Pages (auth, onboarding, discover, chat, profile...)
│   ├── src/services/api.ts        ← API client
│   ├── src/lib/http-client.ts     ← HTTP client with auth
│   ├── next.config.ts             ← Rewrites /api_proxy → backend
│   └── .env.local                 ← BACKEND_URL, NEXT_PUBLIC_*
│
├── backend/                       ← FastAPI (Vercel project: "backend", Root Directory: backend)
│   ├── api/                       ← Роуты (auth, users, discovery, chat, photos...)
│   ├── crud/                      ← CRUD операции
│   ├── models/                    ← SQLAlchemy модели (61 таблица)
│   ├── telegram_bot/              ← Aiogram бот (@YouMeMeet_bot)
│   ├── index.py                   ← Vercel entrypoint
│   ├── vercel.json                ← Vercel config (@vercel/python)
│   └── requirements.txt           ← Python зависимости
│
└── docs/                          ← Документация
```

---

## Production URLs

| Сервис | URL | Статус |
|--------|-----|--------|
| Frontend | `https://frontend-two-brown-70.vercel.app` | ✅ Работает |
| Backend API | `https://backend-pi-sable-56.vercel.app` | ✅ Работает |
| API Docs (Swagger) | `https://backend-pi-sable-56.vercel.app/docs` | ✅ |
| Health Check | `https://backend-pi-sable-56.vercel.app/health?full=true` | ✅ |
| Ping | `https://backend-pi-sable-56.vercel.app/ping` | ✅ |
| Neon Dashboard | `https://console.neon.tech` (project: long-sea-64550481) | ✅ |
| Telegram Bot | `@YouMeMeet_bot` | ✅ |

---

## Инфраструктура

| Компонент | Сервис | План | Стоимость |
|-----------|--------|------|-----------|
| Frontend | Vercel (Next.js) | Hobby | $0 |
| Backend | Vercel (Python/FastAPI) | Hobby | $0 |
| Database | Neon PostgreSQL (serverless) | Free | $0 |
| Cache | Upstash Redis (опционально) | Free | $0 |
| Storage | Vercel Blob (опционально) | Free | $0 |
| **Итого** | | | **$0/мес** |

---

## Database (Neon PostgreSQL)

- **Host**: `ep-still-band-agqygsk6-pooler.c-2.eu-central-1.aws.neon.tech`
- **Database**: `neondb`
- **User**: `neondb_owner`
- **Tables**: 61 таблиц
- **Connection string**:
  ```
  postgresql+asyncpg://neondb_owner:npg_vjOPMFZV5K9n@ep-still-band-agqygsk6-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require
  ```

---

## Telegram Bot

- **Username**: `@YouMeMeet_bot`
- **Token**: хранится в Vercel env `TELEGRAM_BOT_TOKEN`
- **Mini App URL**: `https://frontend-two-brown-70.vercel.app`
- **Настройка в BotFather**:
  ```
  /mybots → @YouMeMeet_bot → Bot Settings → Menu Button
  URL: https://frontend-two-brown-70.vercel.app
  ```

---

## Environment Variables

### Backend (Vercel project: "backend", Root Directory: `backend`)

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `postgresql+asyncpg://neondb_owner:npg_vjOPMFZV5K9n@ep-still-band-agqygsk6-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require` |
| `SECRET_KEY` | (JWT secret, set in Vercel) |
| `ENVIRONMENT` | `production` |
| `ALLOWED_ORIGINS` | `https://frontend-two-brown-70.vercel.app` |
| `TELEGRAM_BOT_TOKEN` | (set in Vercel) |
| `FRONTEND_URL` | `https://frontend-two-brown-70.vercel.app` |

### Frontend (Vercel project: "frontend", Root Directory: `frontend`)

| Variable | Value |
|----------|-------|
| `BACKEND_URL` | `https://backend-pi-sable-56.vercel.app` |
| `NEXT_PUBLIC_API_URL` | `/api_proxy` |
| `NEXT_PUBLIC_APP_URL` | `https://frontend-two-brown-70.vercel.app` |
| `NEXT_PUBLIC_TELEGRAM_BOT_NAME` | `YouMeMeet_bot` |

---

## Деплой

Оба проекта деплоятся автоматически при `git push origin main`.

### Ручной редеплой

1. Vercel Dashboard → выбрать проект (frontend или backend)
2. Deployments → три точки → Redeploy

### Проверка после деплоя

```bash
# Backend health
curl https://backend-pi-sable-56.vercel.app/ping
curl https://backend-pi-sable-56.vercel.app/health?full=true

# Frontend
curl -I https://frontend-two-brown-70.vercel.app
```

---

## Локальная разработка

### Frontend
```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
```

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8001   # http://localhost:8001/docs
```

### Telegram Bot (polling)
```bash
python run_bot.py
```

---

## Troubleshooting

| Проблема | Решение |
|----------|---------|
| Backend 404 | Проверить Root Directory = `backend` в Vercel |
| CORS ошибки | Проверить `ALLOWED_ORIGINS` включает frontend URL |
| DB connection fails | Проверить Neon project active, connection string |
| Telegram бот не отвечает | Проверить `TELEGRAM_BOT_TOKEN`, webhook URL |
| Frontend API ошибки | Проверить `BACKEND_URL` в env, rewrites в next.config.ts |
