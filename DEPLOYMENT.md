# Deployment Guide

## Overview

MambaX is deployed using a modern cloud-native architecture:

- **Frontend**: [Vercel](https://vercel.com) - Next.js hosting with CDN
- **Backend**: [Railway](https://railway.app) - FastAPI containerized deployment
- **Database**: [Supabase](https://supabase.com) - Managed PostgreSQL
- **Cache**: [Upstash](https://upstash.com) - Managed Redis
- **Storage**: [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) - File storage
- **Monitoring**: [Sentry](https://sentry.io) - Error tracking & performance

## Architecture Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   User/Client   │────▶│  Vercel (CDN)   │────▶│ Railway Backend │
│                 │     │  Next.js App    │     │   FastAPI       │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                        ┌────────────────────────────────┼────────────────────────────────┐
                        │                                │                                │
                        ▼                                ▼                                ▼
               ┌─────────────────┐              ┌─────────────────┐              ┌─────────────────┐
               │                 │              │                 │              │                 │
               │    Supabase     │              │     Upstash     │              │  Vercel Blob    │
               │   PostgreSQL    │              │      Redis      │              │    Storage      │
               │                 │              │                 │              │                 │
               └─────────────────┘              └─────────────────┘              └─────────────────┘
```

---

## 1. Managed Services Setup

### 1.1 Supabase PostgreSQL Configuration

1. Create new project on [supabase.com](https://supabase.com)
2. Select region closest to target users (Europe/US)
3. Generate strong password during project creation
4. Obtain connection string from Project Settings → Database:
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
5. Transform for asyncpg compatibility:
   ```
   postgresql+asyncpg://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
6. Enable automatic daily backups (enabled by default)
7. For Pro plan, enable Point-in-time recovery (PITR)

### 1.2 Upstash Redis Configuration

1. Create database on [upstash.com](https://upstash.com)
2. Select same region as Railway deployment
3. Choose "Regional" type for MVP
4. Obtain connection string:
   ```
   redis://default:[PASSWORD]@[ENDPOINT]:6379
   ```
5. Configure eviction policy: `allkeys-lru`
6. Set max memory: 256MB for MVP

### 1.3 Vercel Blob Storage

1. Navigate to Vercel Dashboard → Storage
2. Create new Blob store
3. Connect to frontend project
4. Copy `BLOB_READ_WRITE_TOKEN` from settings
5. Backend already supports Vercel Blob uploads

---

## 2. Backend Deployment (Railway)

### Environment Variables

Set the following in Railway project settings:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string (asyncpg format) | `postgresql+asyncpg://postgres:xxx@db.xxx.supabase.co:5432/postgres` |
| `REDIS_URL` | Redis connection string | `redis://default:xxx@xxx.upstash.io:6379` |
| `SECRET_KEY` | JWT secret (32+ chars, random) | `your-super-secret-key-here-min-32-chars` |
| `ENVIRONMENT` | Environment mode (CRITICAL: Disables debug endpoints) | `production` |
| `ALLOWED_ORIGINS` | Comma-separated allowed origins | `https://your-app.vercel.app` |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot token from @BotFather | `123456:ABC-DEF...` |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token | `vercel_blob_xxx` |
| `FRONTEND_URL` | Frontend deployment URL | `https://your-app.vercel.app` |
| `BACKEND_URL` | Backend deployment URL | `https://your-backend.up.railway.app` |
| `WEBHOOK_URL` | Telegram webhook URL | `https://your-backend.up.railway.app` |
| `SENTRY_DSN` | Sentry error tracking DSN | `https://xxx@xxx.ingest.sentry.io/xxx` |
| `VAPID_PUBLIC_KEY` | Public key for push notifications | `BEl...` (from web-push generate-vapid-keys) |
| `VAPID_PRIVATE_KEY` | Private key for push notifications | `4Z...` (keep secret!) |
| `VAPID_CLAIMS_EMAIL` | Contact email for push service | `mailto:admin@mambax.com` |

### Railway Project Setup

1. Create new project on [railway.app](https://railway.app)
2. Connect GitHub repository
3. **Important**: Set root directory to `backend` in project settings
4. Configure environment variables (see table above)
5. Deploy

### Database Migrations

Run migrations to apply schema:

```bash
# Set DATABASE_URL to Supabase connection string
cd backend
alembic upgrade head
```

### Health Check Configuration

Railway uses these health check settings (configured in `railway.toml`):

- **Path**: `/health`
- **Interval**: 60 seconds
- **Timeout**: 10 seconds

Additional health endpoints:
- `/health` - Basic status with timestamp and version
- `/health?full=true` - Full check including DB and Redis
- `/health/live` - Kubernetes-style liveness probe
- `/health/ready` - Kubernetes-style readiness probe

---

## 3. Frontend Deployment (Vercel)

### Environment Variables

Set in Vercel Dashboard → Settings → Environment Variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Railway backend URL | `https://mambax-backend.up.railway.app` |
| `NEXT_PUBLIC_TELEGRAM_BOT_NAME` | Bot username | `MambaXBot` |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN for frontend | `https://xxx@xxx.ingest.sentry.io/xxx` |

### Vercel Project Setup

1. Import GitHub repository on [vercel.com](https://vercel.com)
2. Set root directory to `frontend`
3. Framework preset: Next.js (auto-detected)
4. Configure environment variables
5. Deploy

### Custom Domain (Optional)

1. Add custom domain in Vercel project settings
2. Configure DNS records as instructed
3. SSL certificate provisioned automatically
4. Update `ALLOWED_ORIGINS` in Railway to include custom domain

---

## 4. Monitoring Setup (Sentry)

### Backend (Python)

1. Create project on [sentry.io](https://sentry.io)
2. Copy DSN from Settings → Projects → Client Keys
3. Add `SENTRY_DSN` to Railway environment variables
4. Backend auto-initializes Sentry in production

### Frontend (Next.js)

1. Run Sentry wizard:
   ```bash
   cd frontend
   npx @sentry/wizard@latest -i nextjs
   ```
2. Follow wizard to configure
3. Add `NEXT_PUBLIC_SENTRY_DSN` to Vercel environment variables

---

## 5. Deployment Checklist

### Pre-deployment

- [ ] All tests passing locally
- [ ] Environment variables documented and verified
- [ ] Database migrations tested locally with production schema
- [ ] Secrets rotated (if needed)
- [ ] `ENVIRONMENT` set to `production`
- [ ] CORS origins configured correctly

### Deployment

- [ ] Deploy backend to Railway
- [ ] Verify Railway health check passes (`/health`)
- [ ] Run database migrations on Supabase
- [ ] Deploy frontend to Vercel
- [ ] Verify Vercel build succeeds

### Post-deployment

- [ ] Execute smoke tests:
  - [ ] Auth flow (Telegram login / OTP)
  - [ ] Profile creation
  - [ ] Swipe functionality
  - [ ] Chat functionality
- [ ] Verify Sentry receiving errors
- [ ] Confirm monitoring dashboards active
- [ ] Validate Supabase backups configured
- [ ] Test file uploads with Vercel Blob

### Rollback Plan

If issues occur:

1. **Railway Backend**: Revert to previous deployment in Railway dashboard
2. **Vercel Frontend**: Revert to previous deployment in Vercel dashboard
3. **Database**: 
   ```bash
   # Rollback last migration
   cd backend
   alembic downgrade -1
   ```
4. If critical, enable Supabase Point-in-time recovery

---

## 6. Production URLs

| Service | URL |
|---------|-----|
| Frontend | `https://[project-name].vercel.app` |
| Backend API | `https://[project-name].up.railway.app` |
| API Documentation | `https://[project-name].up.railway.app/docs` |
| Sentry Dashboard | `https://sentry.io/organizations/[org]/projects/[project]` |
| Supabase Dashboard | `https://supabase.com/dashboard/project/[project-ref]` |
| Railway Dashboard | `https://railway.app/project/[project-id]` |

---

## 7. Cost Summary

| Service | Plan | Monthly Cost | Purpose |
|---------|------|--------------|---------|
| Vercel | Pro | $20 | Frontend hosting, CDN, Blob storage |
| Railway | Hobby | $20 | Backend containerized deployment |
| Supabase | Pro | $25 | Managed PostgreSQL with backups |
| Upstash | Pay-as-you-go | ~$10 | Managed Redis cache |
| Sentry | Team | $26 | Error tracking & monitoring |
| **Total** | | **~$101/month** | Full production stack |

*Note: Costs may vary based on usage. Free tiers available for all services during development.*

---

## 8. Troubleshooting

### Common Issues

#### Backend not starting on Railway

1. Check logs in Railway dashboard
2. Verify `DATABASE_URL` is correctly formatted for asyncpg
3. Ensure root directory is set to `backend`
4. Check start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

#### CORS errors in frontend

1. Verify `ALLOWED_ORIGINS` includes your Vercel URL
2. Check origin includes protocol: `https://your-app.vercel.app`
3. For custom domains, add all variants

#### Database connection fails

1. Verify Supabase is not paused (free tier pauses after 1 week)
2. Check connection string format (asyncpg requires `postgresql+asyncpg://`)
3. Verify SSL mode if required

#### File uploads failing

1. Verify `BLOB_READ_WRITE_TOKEN` is set
2. Check Vercel Blob store is connected
3. Verify file size limits

#### Telegram bot not responding

1. Verify `TELEGRAM_BOT_TOKEN` is correct
2. Check webhook is set to Railway URL
3. Test bot via @BotFather

---

## 9. Local Development

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

### Environment Variables (Local)

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required for local development:
- `DATABASE_URL` - SQLite or local PostgreSQL
- `SECRET_KEY` - Any string for development
- `ENVIRONMENT` - Set to `development`

---

## 10. Security Notes

1. **Never commit secrets** - Use environment variables
2. **Rotate secrets regularly** - Especially `SECRET_KEY`
3. **Enable 2FA** - On all service dashboards
4. **Monitor Sentry** - For security-related errors

---

## 11. Security Hardening (CSP & Headers)

The frontend is configured with strict **Content Security Policy (CSP)** headers in `next.config.ts`.

### Allowed Domains
By default, the app only loads resources from:
- **Scripts**: `self`, `telegram.org`, `posthog.com`, `sentry.io`
- **Images**: `self`, `t.me`, `cdn4.telesco.pe`, `unsplash.com`, `vercel-storage.com`
- **Connect (API)**: `self`, `sentry.io`, `posthog.com`, `railway.app`

### If adding new services (e.g. Google Analytics):
1. Open `frontend/next.config.ts`
2. Add the domain to `Content-Security-Policy` -> `script-src` and `connect-src`
3. If using external images, add to `remotePatterns` AND `img-src` in CSP.

### iframe Safety
The app sends `frame-ancestors 'self' https://web.telegram.org` to allow embedding ONLY inside Telegram.
