# MambaX Deploy Skill

## Описание проекта

MambaX — приложение для знакомств (Telegram Mini App). Монорепо с фронтендом и бэкендом.

## Структура проекта

```
mambax-backend/                    ← GitHub: DenisMit3/mambax-backend
├── frontend/                      ← Next.js 16 (Vercel project: "frontend")
├── backend/                       ← FastAPI + Python (Vercel project: "backend")
├── deploy-all.sh                  ← Скрипт полного деплоя
└── docs/                          ← Документация
```

## Ключевые факты

### GitHub
- Репозиторий: `DenisMit3/mambax-backend`
- Ветка: `main`
- **ВАЖНО**: `git push origin main` деплоит ТОЛЬКО backend! Frontend НЕ деплоится автоматически через Git Integration!

### Frontend
- Технология: Next.js 16 (TypeScript)
- Хостинг: Vercel
- Vercel project name: `frontend`
- Vercel Project ID: `prj_fSnV7bhTzxrfl4400LlRKGvfc7vA`
- Vercel Org ID: `team_Dm78vx8mzaOqQtfYTgUXosF3`
- Root Directory в Vercel: `frontend`
- Production URL: `https://frontend-two-brown-70.vercel.app`
- Env файл: `frontend/.env.local`
- Ключевые env:
  - `BACKEND_URL=https://backend-pi-sable-56.vercel.app`
  - `NEXT_PUBLIC_API_URL=/api_proxy`
  - `NEXT_PUBLIC_APP_URL=https://frontend-two-brown-70.vercel.app`
  - `NEXT_PUBLIC_TELEGRAM_BOT_NAME=YouMeMeet_bot`
- API проксирование: `next.config.ts` rewrites `/api_proxy/*` → backend

### Backend
- Технология: FastAPI (Python 3.11)
- Хостинг: Vercel (serverless, @vercel/python)
- Vercel project name: `backend`
- Root Directory в Vercel: `backend`
- Production URL: `https://backend-pi-sable-56.vercel.app`
- Entrypoint: `backend/index.py`
- Config: `backend/vercel.json`
- Health check: `/ping`, `/health`, `/health?full=true`
- API docs: `/docs` (Swagger)
- Env файл: `backend/.env.vercel`
- Ключевые env:
  - `DATABASE_URL` — Neon PostgreSQL connection string
  - `SECRET_KEY` — JWT secret
  - `ENVIRONMENT=production`
  - `ALLOWED_ORIGINS=https://frontend-two-brown-70.vercel.app`
  - `TELEGRAM_BOT_TOKEN` — токен бота
  - `FRONTEND_URL=https://frontend-two-brown-70.vercel.app`

### Database
- Сервис: Neon PostgreSQL (serverless)
- Host: `ep-still-band-agqygsk6-pooler.c-2.eu-central-1.aws.neon.tech`
- Database: `neondb`
- User: `neondb_owner`
- Neon project: `long-sea-64550481`
- Dashboard: `https://console.neon.tech`

### Telegram Bot
- Username: `@YouMeMeet_bot`
- Бренд в UI: MambaX
- Mini App URL: `https://frontend-two-brown-70.vercel.app`
- Код бота: `backend/telegram_bot/`

## Процедуры деплоя

### ⚠️ КРИТИЧЕСКИ ВАЖНО: Деплой фронтенда

**Git push НЕ деплоит фронтенд автоматически!** Vercel Git Integration для frontend проекта не работает в этом монорепо. После КАЖДОГО изменения фронтенда нужно деплоить вручную через Vercel CLI.

### Полный деплой (backend + frontend)

```bash
# 1. Коммит и пуш (деплоит backend автоматически)
git add -A && git commit -m "описание" && git push origin main

# 2. ОБЯЗАТЕЛЬНО: деплой фронтенда вручную
cd frontend && npx vercel --prod --yes && cd ..
```

Или одной командой:
```bash
bash deploy-all.sh "описание изменений"
```

### Только backend (если изменения только в backend/)
```bash
git add -A && git commit -m "описание" && git push origin main
```
Backend деплоится автоматически через Vercel Git Integration.

### Только frontend (если изменения только в frontend/)
```bash
git add -A && git commit -m "описание" && git push origin main
cd frontend && npx vercel --prod --yes && cd ..
```

### Проверка после деплоя
```bash
# Backend
curl https://backend-pi-sable-56.vercel.app/ping
curl https://backend-pi-sable-56.vercel.app/health?full=true

# Frontend
curl -I https://frontend-two-brown-70.vercel.app
```

### Ручной редеплой через Dashboard
Vercel Dashboard → проект → Deployments → три точки → Redeploy

### Обновление env переменных
Vercel Dashboard → проект → Settings → Environment Variables → изменить → Redeploy

## Частые проблемы

| Проблема | Причина | Решение |
|----------|---------|---------|
| Frontend не обновляется после push | Git Integration не работает для frontend | `cd frontend && npx vercel --prod --yes` |
| Backend 404 | Root Directory не `backend` | Vercel Settings → General → Root Directory = `backend` |
| CORS ошибки | `ALLOWED_ORIGINS` не содержит frontend URL | Обновить env в Vercel backend |
| DB connection fails | Neon project suspended | Зайти в console.neon.tech, активировать |
| Frontend API 500 | `BACKEND_URL` неверный | Проверить env в Vercel frontend |
| Telegram бот не работает | Неверный token или webhook | Проверить `TELEGRAM_BOT_TOKEN` |

## Локальная разработка

```bash
# Frontend
cd frontend && npm install && npm run dev    # http://localhost:3000

# Backend
cd backend && pip install -r requirements.txt && uvicorn main:app --reload --port 8001

# Telegram bot (polling)
python run_bot.py
```
