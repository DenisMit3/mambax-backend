# 🚀 MambaX Dating Platform - Local Setup Guide

[![Backend Tests](https://github.com/DenisMit3/mambax-backend/actions/workflows/tests.yml/badge.svg)](https://github.com/DenisMit3/mambax-backend/actions/workflows/tests.yml)
[![Frontend Tests](https://github.com/DenisMit3/mambax-backend/actions/workflows/frontend-tests.yml/badge.svg)](https://github.com/DenisMit3/mambax-backend/actions/workflows/frontend-tests.yml)
[![Backend Coverage](https://img.shields.io/badge/coverage-80%25-brightgreen)](https://github.com/DenisMit3/mambax-backend/actions)
[![Frontend Coverage](https://img.shields.io/badge/coverage-80%25-brightgreen)](https://github.com/DenisMit3/mambax-backend/actions)

## QA & Testing

We enforce high standards for code quality and reliability.

### Enforced Gates
- **Backend Coverage:** 80% minimum (`pytest --cov-fail-under=80`)
- **Frontend Coverage:** 80% minimum (`jest coverageThreshold`)
- **Security:**
  - Backend: `bandit` scans for security issues
  - Frontend: `npm audit` checks for vulnerable dependencies
- **E2E Tests:** Playwright tests run against a live backend in CI

### CI Workflows
- [Backend Tests (`tests.yml`)](https://github.com/DenisMit3/mambax-backend/blob/main/.github/workflows/tests.yml)
- [Frontend Tests (`frontend-tests.yml`)](https://github.com/DenisMit3/mambax-backend/blob/main/.github/workflows/frontend-tests.yml)
- [Quality Checks (`quality.yml`)](https://github.com/DenisMit3/mambax-backend/blob/main/.github/workflows/quality.yml)
- [E2E Tests (`e2e.yml`)](https://github.com/DenisMit3/mambax-backend/blob/main/.github/workflows/e2e.yml)


## Quick Start (Docker)

### Prerequisites
- Docker Desktop installed and running
- Git

### 1. Clone and Configure
```bash
cd "c:\Users\Denis\Desktop\vse boty\sait znakomstv"

# Copy environment files
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
```

### 2. Start All Services
```bash
docker-compose up --build
```

This will start:
- 🐘 **PostgreSQL** (port 5432) - Database
- 🔴 **Redis** (port 6379) - Cache
- 🔧 **Backend** (port 8001) - FastAPI API
- 🌐 **Frontend** (port 3000) - Next.js Web App
- 🤖 **Telegram Bot** - OTP delivery

### 3. Create Test Users (Optional)
```bash
# After services are running, seed 50 test users:
curl -X POST http://localhost:8001/init
```

---

## Access Points

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Main web application |
| **Backend API** | http://localhost:8001 | REST API |
| **API Docs** | http://localhost:8001/docs | Swagger documentation |
| **Health Check** | http://localhost:8001/health | Service status |
| **Admin Panel** | http://localhost:3000/admin | Admin dashboard |

---

## Default Credentials

### Admin Account
- **Phone:** +79062148253
- **Telegram:** @RezidentMD
- **OTP (dev):** 0000

### Test Users (after running /init)
- **Phone format:** +79000000001 to +79000000050
- **OTP (dev):** 0000

---

## Development Mode (Without Docker)

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

pip install -r requirements.txt

# Set environment variables
set DATABASE_URL=sqlite+aiosqlite:///./mambax_dev.db
set TELEGRAM_BOT_TOKEN=8531547163:AAEE2xF6cfTqshbtSVjGktz3bDkj8Pwum0E
set PYTHONPATH=.
set ENVIRONMENT=development

# Run server
uvicorn backend.main:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Telegram Bot (separate terminal)
```bash
cd backend
venv\Scripts\activate
set TELEGRAM_BOT_TOKEN=8531547163:AAEE2xF6cfTqshbtSVjGktz3bDkj8Pwum0E
set PYTHONPATH=.
python bot.py
```

---

## Code Quality

We enforce code quality standards using `black`, `isort`, `flake8`, and `mypy`.

### Setup
```bash
# Install development dependencies
pip install -r backend/requirements.txt
pip install pre-commit
pre-commit install
```

### Running Checks
```bash
cd backend

# Format code
black .
isort .

# Linting
flake8 .

# Type checking
mypy .
```


## Mobile Access (Local Network)

To access from your phone on the same Wi-Fi network:

1. Find your computer's IP: `ipconfig` (look for IPv4 Address, e.g., 192.168.1.136)
2. Open browser on phone: `http://192.168.1.136:3000`
3. Backend API: `http://192.168.1.136:8001`

**Note:** Telegram Mini App button won't work locally (requires HTTPS). Use browser directly.

---

## 📲 Запуск в локальной сети (с QR-кодом)

Для удобного тестирования на мобильных устройствах мы добавили скрипты автоматического запуска.

### Windows
1. Запустите файл `start_local_network.bat` (двойным кликом).
2. В консоли появится **QR-код**.
3. Отсканируйте код камерой телефона — приложение откроется автоматически!

### Linux / macOS
1. Запустите скрипт:
   ```bash
   chmod +x start_local_network.sh
   ./start_local_network.sh
   ```
2. Отсканируйте QR-код из терминала.

> **Важно:** Скрипты автоматически определяют IP вашего компьютера и генерируют ссылку. Больше не нужно вводить IP вручную!

### 🖥 Мобильный вид на десктопе

При разработке на большом экране приложение автоматически отображается в "мобильном" контейнере. Подробнее об этом в [DESKTOP_MOBILE_VIEW.md](DESKTOP_MOBILE_VIEW.md).

---

## Troubleshooting

### Backend won't start
```bash
# Check logs
docker-compose logs backend

# Restart with fresh database
docker-compose down -v
docker-compose up --build
```

### Frontend can't connect to Backend
- Check that backend is on port **8001** (not 8000)
- Check CORS in backend allows localhost:3000

### No test users on /discover
```bash
# Seed test users
curl -X POST http://localhost:8001/init
```

### Database migration errors
```bash
# Run migrations manually
docker-compose exec backend alembic upgrade head

# Or reset database
docker-compose down -v
docker-compose up --build
```

---

## Project Structure

```
├── backend/           # FastAPI backend
│   ├── api/          # API routes
│   ├── models/       # SQLAlchemy models
│   ├── services/     # Business logic
│   ├── main.py       # Entry point
│   ├── bot.py        # Telegram bot
│   └── Dockerfile
├── frontend/          # Next.js frontend
│   ├── src/
│   │   ├── app/      # Pages (App Router)
│   │   ├── components/
│   │   └── services/ # API clients
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## API Endpoints

### Authentication
- `POST /auth/request-otp` - Request OTP code
- `POST /auth/login` - Login with OTP

### Users
- `GET /me` - Get current user profile
- `PUT /profile` - Update profile
- `GET /feed` - Get users to swipe

### Interactions
- `POST /likes` - Like a user
- `GET /matches` - Get matches
- `GET /matches/{id}/messages` - Get chat messages
- `POST /chat/send` - Send message

### Admin
- `GET /health` - Health check
- `POST /init` - Seed test data (dev only)
- `GET /migrate` - Run migrations

---

## Environment Variables

### Required
| Variable | Description | Example |
|----------|-------------|---------|
| DATABASE_URL | Database connection | postgresql+asyncpg://user:pass@host:5432/db |
| SECRET_KEY | JWT signing key | random-32-char-string (Generate with: `python -c "import secrets; print(secrets.token_hex(32))"`) |
| TELEGRAM_BOT_TOKEN | Telegram bot token | 123456:ABC-DEF |
| BACKEND_URL | Backend API URL (for SSR) | http://localhost:8001 |

### Optional
| Variable | Description |
|----------|-------------|
| REDIS_URL | Redis connection for caching |
| SENTRY_DSN | Error tracking |
| STRIPE_SECRET_KEY | Payments |
| OPENAI_API_KEY | AI features |

---

## Production Checklist

Before deploying to production, ensure you have:

1.  **Generated a Strong SECRET_KEY**
    Run this python command to generate a secure key:
    ```bash
    python -c "import secrets; print(secrets.token_hex(32))"
    ```
    Set this value in your `.env` file or environment variables.

2.  **Disabled Database Seeding**
    Set `SEED_ON_STARTUP=False` to prevent overwriting or resetting data on restart.

3.  **Configured VAPID Keys (for Push Notifications)**
    Generate new VAPID keys:
    ```bash
    npx web-push generate-vapid-keys
    ```
    Set `VAPID_PRIVATE_KEY` and `VAPID_PUBLIC_KEY` in environment variables.

4.  **Set Secure Passwords**
    Change default PostgreSQL and Redis passwords in `docker-compose.yml` or use an external managed database.

---

## Support

- **Admin Telegram:** @RezidentMD
- **Admin Phone:** +79062148253

---

## Load Testing

We use **Locust** for performance testing.

### Setup
```bash
pip install locust
```

### Running Tests
To run the load test script (includes Auth, Feed, Swipe, Chat):
```bash
# Run in root directory
locust -f scripts/load_test.py
```
Then open http://localhost:8089 to configure users and spawn rate.

**Targets:**
- `/feed` (Discovery) - Primary load target (aiming for 1000 RPS)
- `/likes` (Swipes)
- `/chat/send` (Messaging)

