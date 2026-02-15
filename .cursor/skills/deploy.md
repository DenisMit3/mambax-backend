# MambaX Deploy Skill

## Описание проекта

MambaX — приложение для знакомств (Telegram Mini App). Монорепо с фронтендом и бэкендом.

## Структура проекта

```
mambax-backend/                    ← GitHub: DenisMit3/mambax-backend
├── frontend/                      ← Next.js 14 (Vercel project: "frontend")
├── backend/                       ← FastAPI + Python (Vercel project: "backend")
└── docs/                          ← Документация
```

## Ключевые факты

### GitHub
- Репозиторий: `DenisMit3/mambax-backend`
- Ветка: `main`
- Автодеплой: при `git push origin main` оба Vercel проекта обновляются

### Frontend
- Технология: Next.js 14 (TypeScript)
- Хостинг: Vercel
- Vercel project name: `frontend`
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
- Таблиц: 61
- Connection string: `postgresql+asyncpg://neondb_owner:npg_vjOPMFZV5K9n@ep-still-band-agqygsk6-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require`

### Telegram Bot
- Username: `@YouMeMeet_bot`
- Бренд в UI: MambaX
- Mini App URL: `https://frontend-two-brown-70.vercel.app`
- Код бота: `backend/telegram_bot/`
- Тексты бота: `backend/telegram_bot/texts.py`
- Хэндлеры: `backend/telegram_bot/handlers/commands.py`
- Настройка в BotFather: `/mybots → @YouMeMeet_bot → Bot Settings → Menu Button → URL`

## Процедуры деплоя

### Стандартный деплой (автоматический)
```bash
git add -A && git commit -m "описание" && git push origin main
```
Vercel автоматически деплоит оба проекта.

### Проверка после деплоя
```bash
# Backend
curl https://backend-pi-sable-56.vercel.app/ping
curl https://backend-pi-sable-56.vercel.app/health?full=true

# Frontend
curl -I https://frontend-two-brown-70.vercel.app
```

### Ручной редеплой
Vercel Dashboard → проект → Deployments → три точки → Redeploy

### Обновление env переменных
Vercel Dashboard → проект → Settings → Environment Variables → изменить → Redeploy

## Частые проблемы

| Проблема | Причина | Решение |
|----------|---------|---------|
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
