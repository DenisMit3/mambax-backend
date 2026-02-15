# Deployment Guide

## Overview

MambaX is deployed using a modern cloud-native architecture:

- **Frontend**: [Vercel](https://vercel.com) - Next.js hosting with CDN
- **Backend**: [Vercel](https://vercel.com) - FastAPI serverless deployment
- **Database**: [Neon](https://neon.tech) - Managed PostgreSQL (serverless)
- **Cache**: [Upstash](https://upstash.com) - Managed Redis (optional)
- **Storage**: [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) - File storage
- **Monitoring**: [Sentry](https://sentry.io) - Error tracking & performance

## Architecture Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   User/Client   │────▶│  Vercel (CDN)   │────▶│ Vercel Backend  │
│                 │     │  Next.js App    │     │   FastAPI       │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                        ┌────────────────────────────────┼────────────────────────────────┐
                        │                                │                                │
                        ▼                                ▼                                ▼
               ┌─────────────────┐              ┌─────────────────┐              ┌─────────────────┐
               │                 │              │                 │              │                 │
               │      Neon       │              │     Upstash     │              │  Vercel Blob    │
               │   PostgreSQL    │              │      Redis      │              │    Storage      │
               │                 │              │                 │              │                 │
               └─────────────────┘              └─────────────────┘              └─────────────────┘
```

---

## 1. Database Setup (Neon PostgreSQL)

### Configuration

Database is already configured:
- **Host**: `ep-still-band-agqygsk6-pooler.c-2.eu-central-1.aws.neon.tech`
- **Database**: `neondb`
- **User**: `neondb_owner`
- **Tables**: 61 tables created

### Connection String

```
postgresql+asyncpg://neondb_owner:npg_vjOPMFZV5K9n@ep-still-band-agqygsk6-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

### Neon Dashboard

- URL: https://console.neon.tech
- Project: long-sea-64550481

---

## 2. Backend Deployment (Vercel)

### Environment Variables

Set the following in Vercel Dashboard → Settings → Environment Variables:

| Variable | Description | Value |
|----------|-------------|-------|
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql+asyncpg://neondb_owner:...@...neon.tech/neondb?sslmode=require` |
| `SECRET_KEY` | JWT secret (32+ chars) | Generate secure random string |
| `ENVIRONMENT` | Environment mode | `production` |
| `ALLOWED_ORIGINS` | Comma-separated allowed origins | `https://mambax-frontend.vercel.app` |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot token from @BotFather | `123456:ABC-DEF...` |
| `FRONTEND_URL` | Frontend deployment URL | `https://mambax-frontend.vercel.app` |
| `GEMINI_API_KEY` | Google AI API key (optional) | `AIza...` |
| `REDIS_URL` | Upstash Redis URL (optional) | `redis://...` |

### Vercel Backend Project Setup

1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click **Add New...** → **Project**
3. Import GitHub repository: `DenisMit3/mambax-backend`
4. Set root directory to `backend`
5. Vercel auto-detects `vercel.json` with `@vercel/python` runtime
6. Add environment variables
7. Click **Deploy**

### Health Check

Endpoints:
- `/health` - Basic status
- `/health?full=true` - Full check including DB
- `/ping` - Simple ping

---

## 3. Frontend Deployment (Vercel)

### Environment Variables

Set in Vercel Dashboard → Settings → Environment Variables:

| Variable | Description | Value |
|----------|-------------|-------|
| `BACKEND_URL` | Vercel backend URL | `https://backend-pi-sable-56.vercel.app` |
| `NEXT_PUBLIC_API_URL` | API URL for client | `/api_proxy` |
| `NEXT_PUBLIC_TELEGRAM_BOT_NAME` | Bot username | `YouMeMeet_bot` |

### Vercel Project Setup

1. Import GitHub repository on [vercel.com](https://vercel.com)
2. Set root directory to `frontend`
3. Framework preset: Next.js (auto-detected)
4. Configure environment variables
5. Deploy

---

## 4. Deployment Checklist

### Pre-deployment

- [x] Database configured (Neon)
- [x] All tables created (61 tables)
- [ ] Environment variables set in Vercel (backend)
- [ ] Environment variables set in Vercel (frontend)

### Deployment

- [ ] Deploy backend to Vercel
- [ ] Verify health check passes (`/health`)
- [ ] Update `BACKEND_URL` in Vercel frontend to backend URL
- [ ] Redeploy frontend on Vercel

### Post-deployment

- [ ] Test auth flow (Telegram login)
- [ ] Test profile creation
- [ ] Test swipe functionality
- [ ] Test chat functionality

---

## 5. Production URLs

| Service | URL |
|---------|-----|
| Frontend | `https://mambax-frontend.vercel.app` |
| Backend API | `https://backend-pi-sable-56.vercel.app` |
| API Documentation | `https://backend-pi-sable-56.vercel.app/docs` |
| Neon Dashboard | `https://console.neon.tech` |
| Vercel Dashboard | `https://vercel.com/dashboard` |

---

## 6. Cost Summary

| Service | Plan | Monthly Cost | Purpose |
|---------|------|--------------|---------|
| Vercel | Free/Pro | $0-20 | Frontend + Backend hosting, CDN |
| Neon | Free | $0 | Managed PostgreSQL |
| Upstash | Free | $0 | Redis cache (optional) |
| **Total** | | **$0-20/month** | Full production stack |

*Note: Free tiers available for all services. Upgrade as needed.*

---

## 7. Troubleshooting

### Backend not starting on Vercel

1. Check logs in Vercel dashboard (Deployments → Functions tab)
2. Verify `DATABASE_URL` is correctly formatted
3. Ensure root directory is set to `backend`
4. Check `vercel.json` configuration

### CORS errors in frontend

1. Verify `ALLOWED_ORIGINS` includes your Vercel URL
2. Check origin includes protocol: `https://...`

### Database connection fails

1. Verify Neon project is active
2. Check connection string format
3. Use pooler host for better stability

### Telegram bot not responding

1. Verify `TELEGRAM_BOT_TOKEN` is correct
2. For webhook mode, set `WEBHOOK_URL` to Vercel backend URL
3. For polling mode, run bot locally

---

## 8. Local Development

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Access at: `http://localhost:3000`

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

Access at: `http://localhost:8001`
API docs: `http://localhost:8001/docs`

### Telegram Bot (Polling Mode)

```bash
python run_bot.py
```

---

## 9. Security Notes

1. **Never commit secrets** - Use environment variables
2. **Rotate secrets regularly** - Especially `SECRET_KEY`
3. **Enable 2FA** - On all service dashboards
4. **Use HTTPS only** - All production URLs must be HTTPS
