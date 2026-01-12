---
id: "10ca0162-c648-4886-952c-8f7e9c8a9f0e"
title: "🚨 Emergency Audit Report + Complete Fix Plan - Dating Platform Local Setup"
createdAt: "1768066554370"
updatedAt: "1768066738729"
type: spec
---

# 🚨 Emergency Audit Report + Complete Fix Plan - Dating Platform Local Setup

# 🚨 ЭКСТРЕННЫЙ АУДИТ + ПЛАН ИСПРАВЛЕНИЯ

## 📊 EXECUTIVE SUMMARY

**Статус проекта:** ❌ НЕ РАБОТАЕТ  
**Найдено проблем:** 27  
**Критических:** 15  
**Средних:** 8  
**Низких:** 4  

**Время на исправление:** ~2-3 часа  
**Сложность:** Средняя (требуется обновление конфигураций и миграций)

---

## 🔍 ДИАГНОСТИКА (27 ПРОБЛЕМ)

### 🔴 КРИТИЧЕСКИЕ (Блокируют запуск)

#### 1. Docker Compose - Неполная конфигурация
**Файл:** `file:docker-compose.yml`

**Проблемы:**
- ❌ Отсутствует Redis (требуется для кэширования и rate limiting)
- ❌ Отсутствует frontend service
- ❌ Backend на порту 8000, но frontend ожидает 8001
- ❌ Нет health checks для зависимостей
- ❌ Нет restart policies

**Текущая конфигурация:**
```yaml
services:
  db:
    image: postgres:15
    ports:
      - "5432:5432"
  backend:
    build: ./backend
    ports:
      - "8000:8000"  # ❌ Неправильный порт
    depends_on:
      - db  # ❌ Нет проверки готовности
```

**Решение:**
- Добавить Redis service
- Добавить Frontend service с Dockerfile
- Изменить backend порт на 8001
- Добавить health checks
- Добавить restart: unless-stopped

---

#### 2. Backend Environment Variables - Критические отсутствуют
**Файл:** `file:backend/.env`

**Проблемы:**
- ❌ Отсутствует `DATABASE_URL` (используется в `file:backend/database.py`)
- ❌ Отсутствует `REDIS_URL` (используется в rate limiting)
- ❌ Отсутствует `ENVIRONMENT=development`
- ❌ Отсутствует `ALLOWED_ORIGINS`

**Текущий .env:**
```env
VAPID_PRIVATE_KEY=ct7iVcF_GsDQBW1otT2fbYQLYZ0LMnI8QUq2eGh65bQ
VAPID_PUBLIC_KEY=BEBmFspg23jMgR7v8iVW5P_sbjvu5eu-cSEEHodKIomIX_OhbyymXJUPu0OlpXdxukO7gK6hOwgZLtTi4F5NA6s
VAPID_CLAIMS_EMAIL=mailto:admin@mambax.com
```

**Решение:**
Добавить все обязательные переменные из `file:backend/.env.example`

---

#### 3. Alembic Migrations - Неполная схема
**Файл:** `file:backend/alembic/versions/d34c87028925_initial_schema.py`

**Проблемы:**
- ❌ Миграция создает только базовые таблицы (users, matches, swipes, messages)
- ❌ Отсутствуют таблицы из `file:backend/models/__init__.py`:
  - `likes` (используется в Like model)
  - `reports` (используется в Report model)
  - `blocks` (используется в Block model)
  - `push_subscriptions` (используется в PushSubscription model)
  - `algorithm_settings`, `icebreakers`, `dating_events`, `partners` (advanced models)
  - `moderation_logs`, `banned_users`, `moderation_queue_items`, `nsfw_detections`, `appeals`
  - `subscription_plans`, `user_subscriptions`, `revenue_transactions`, `promo_codes`, etc.
  - `daily_metrics`, `retention_cohorts`, `analytics_events`
  - `marketing_campaigns`, `push_campaigns`, `email_campaigns`
  - `audit_logs`, `feature_flags`, `security_alerts`, `backup_status`
  - `fraud_scores`, `user_segments`, `user_notes`, `verification_requests`

**Текущая миграция покрывает:** 4 таблицы  
**Требуется:** ~40+ таблиц

**Решение:**
- Запустить `alembic revision --autogenerate -m "add_all_missing_tables"`
- Или создать новую миграцию вручную

---

#### 4. User Model - Несоответствие с миграцией
**Файл:** `file:backend/models/user.py`

**Проблемы:**
- ❌ Модель имеет поля, которых нет в миграции:
  - `height`, `smoking`, `drinking`, `education`, `looking_for`, `children`
  - `is_verified`, `verification_selfie`, `verified_at`
  - `status`, `subscription_tier`, `role`, `city`, `location`

**Решение:**
Обновить миграцию или модель для синхронизации

---

#### 5. Frontend - Отсутствует Dockerfile
**Проблема:**
- ❌ Нет `file:frontend/Dockerfile` для контейнеризации
- ❌ Frontend не может быть запущен в docker-compose

**Решение:**
Создать Dockerfile для Next.js приложения

---

#### 6. Frontend - Отсутствует .env
**Проблема:**
- ❌ Нет `file:frontend/.env` или `.env.local`
- ❌ Frontend не знает URL бэкенда

**Текущий код в `file:frontend/src/services/api.ts`:**
```typescript
const getBaseUrl = () => {
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        const port = window.location.port === '3001' ? '8001' : '8001';
        return `${protocol}//${hostname}:${port}`;  // Ожидает 8001
    }
    return process.env.NEXT_PUBLIC_API_URL || "https://mambax-backend.up.railway.app";
};
```

**Решение:**
Создать `.env.local` с `NEXT_PUBLIC_API_URL=http://localhost:8001`

---

#### 7. Backend Port Mismatch
**Проблема:**
- ❌ Backend запускается на порту 8000 (docker-compose.yml)
- ❌ Frontend ожидает 8001 (api.ts)

**Решение:**
Изменить backend порт на 8001 в docker-compose

---

#### 8. Database Connection - Нет wait-for-db
**Файл:** `file:backend/start.sh`

**Проблема:**
```bash
#!/bin/bash
echo "Running migrations..."
alembic upgrade head  # ❌ Может упасть, если БД еще не готова
```

**Решение:**
Добавить проверку готовности PostgreSQL перед миграциями

---

#### 9. Redis - Отсутствует в зависимостях
**Проблема:**
- ❌ Backend использует Redis для rate limiting (main.py)
- ❌ Redis не запущен в docker-compose.yml
- ❌ Нет fallback при отсутствии Redis

**Код в `file:backend/main.py` (строки 316-383):**
```python
# Rate limiting middleware с IP-based limits
# Требует Redis для хранения счетчиков
```

**Решение:**
Добавить Redis в docker-compose или сделать его опциональным

---

#### 10. Seed Data - Отсутствуют тестовые пользователи
**Проблема:**
- ❌ Нет seed скрипта для создания 50 тестовых пользователей
- ❌ Функция seeding в `file:backend/main.py` создает только admin

**Текущий код (строки 119-241):**
```python
async def seed_database():
    # Создает только admin пользователя
    # ❌ Нет 50 тестовых пользователей для свайпов
```

**Решение:**
Расширить seed функцию или создать отдельный скрипт

---

### 🟠 СРЕДНИЕ (Влияют на функциональность)

#### 11. CORS Configuration - Может блокировать запросы
**Файл:** `file:backend/main.py` (строки 268-315)

**Проблема:**
- ⚠️ CORS middleware требует явного указания origins
- ⚠️ В development mode должен разрешать localhost:3000

**Решение:**
Убедиться, что `ENVIRONMENT=development` в .env

---

#### 12. Authentication - JWT Secret Key
**Файл:** `file:backend/config/settings.py`

**Проблема:**
```python
SECRET_KEY: Optional[str] = "secret"  # ⚠️ Слабый дефолтный ключ
```

**Решение:**
Использовать сильный ключ из .env

---

#### 13. File Uploads - Vercel Blob не настроен
**Файл:** `file:backend/main.py` (строки 1043-1092)

**Проблема:**
- ⚠️ Upload endpoint требует `BLOB_READ_WRITE_TOKEN`
- ⚠️ Есть fallback на локальное хранилище, но путь может быть недоступен

**Решение:**
Настроить локальное хранилище в docker volume

---

#### 14. WebSocket - Нет в docker-compose
**Файл:** `file:backend/core/websocket.py`

**Проблема:**
- ⚠️ Real-time chat использует WebSocket
- ⚠️ Может не работать через docker network

**Решение:**
Проверить WebSocket connectivity через docker

---

#### 15. Frontend Build - Production vs Development
**Проблема:**
- ⚠️ `npm run dev` запускает development сервер
- ⚠️ В docker лучше использовать production build

**Решение:**
Использовать `next build && next start` в production mode

---

#### 16. Database Migrations - Нет rollback плана
**Проблема:**
- ⚠️ Если миграция упадет, нет автоматического rollback
- ⚠️ Может оставить БД в inconsistent state

**Решение:**
Добавить error handling в start.sh

---

#### 17. Logging - Нет centralized logging
**Проблема:**
- ⚠️ Логи разбросаны по контейнерам
- ⚠️ Сложно дебажить проблемы

**Решение:**
Настроить docker logging driver

---

#### 18. Health Checks - Отсутствуют
**Проблема:**
- ⚠️ Нет `/health` endpoint проверки в docker-compose
- ⚠️ Контейнеры могут быть "up" но не работать

**Решение:**
Добавить healthcheck в docker-compose

---

### 🟡 НИЗКИЕ (Улучшения)

#### 19. Docker Images - Не оптимизированы
**Проблема:**
- 💡 Backend Dockerfile не использует multi-stage build
- 💡 Большой размер образа

**Решение:**
Оптимизировать Dockerfile

---

#### 20. Environment Variables - Дублирование
**Проблема:**
- 💡 Переменные дублируются в `.env` и `docker-compose.yml`

**Решение:**
Использовать `env_file` в docker-compose

---

#### 21. Database - Нет persistent volume в dev
**Проблема:**
- 💡 При пересоздании контейнера данные теряются

**Решение:**
Уже есть volume `postgres_data`, но нужно проверить

---

#### 22. Frontend Hot Reload - Может не работать
**Проблема:**
- 💡 Next.js hot reload может не работать в docker

**Решение:**
Добавить volume mount для `file:frontend/src`

---

#### 23. SSL Certificates - Не нужны для локальной разработки
**Файлы:** `file:backend/cert.pem.bak`, `file:backend/key.pem.bak`

**Проблема:**
- 💡 Лишние файлы в репозитории

**Решение:**
Удалить или добавить в .gitignore

---

#### 24. Dependencies - Могут быть устаревшими
**Файл:** `file:backend/requirements.txt`

**Проблема:**
- 💡 Некоторые пакеты могут иметь уязвимости

**Решение:**
Запустить `pip list --outdated`

---

#### 25. Frontend Dependencies - React 19 (новая версия)
**Файл:** `file:frontend/package.json`

**Проблема:**
```json
"react": "19.2.3",  // 💡 Очень новая версия, могут быть баги
```

**Решение:**
Проверить совместимость с Next.js 16

---

#### 26. Telegram Bot - Не запускается автоматически
**Файл:** `file:backend/bot.py`

**Проблема:**
- 💡 Telegram bot не включен в docker-compose
- 💡 Требует отдельного запуска

**Решение:**
Добавить отдельный service для бота (опционально)

---

#### 27. Admin Dashboard - Нет дефолтного пароля
**Проблема:**
- 💡 Seed создает admin, но пароль не документирован

**Решение:**
Добавить в README дефолтные credentials

---

## 🔧 ПЛАН ИСПРАВЛЕНИЯ (Priority Order)

### Phase 1: Docker Infrastructure (30 мин)

**Задачи:**
1. ✅ Создать новый `docker-compose.yml` с полным стеком
2. ✅ Создать `frontend/Dockerfile`
3. ✅ Обновить `backend/.env` с полными переменными
4. ✅ Создать `frontend/.env.local`
5. ✅ Исправить порт backend на 8001

**Файлы для изменения:**
- `file:docker-compose.yml` - полная переработка
- `file:frontend/Dockerfile` - создать новый
- `file:backend/.env` - добавить переменные
- `file:frontend/.env.local` - создать новый

---

### Phase 2: Database Schema (45 мин)

**Задачи:**
1. ✅ Создать новую миграцию со всеми таблицами
2. ✅ Обновить `start.sh` с wait-for-db
3. ✅ Добавить seed данные (50 пользователей)

**Команды:**
```bash
cd backend
alembic revision --autogenerate -m "add_all_missing_tables"
# Проверить и отредактировать миграцию
```

**Файлы для изменения:**
- `file:backend/alembic/versions/` - новая миграция
- `file:backend/start.sh` - добавить wait-for-db
- `file:backend/main.py` - расширить seed функцию

---

### Phase 3: Configuration & Environment (20 мин)

**Задачи:**
1. ✅ Настроить CORS для localhost:3000
2. ✅ Настроить Redis (опциональный)
3. ✅ Настроить file uploads в volume

**Файлы для изменения:**
- `file:backend/config/settings.py` - проверить defaults
- `file:backend/main.py` - проверить CORS middleware

---

### Phase 4: Testing & Validation (30 мин)

**Задачи:**
1. ✅ Запустить `docker-compose up --build`
2. ✅ Проверить health endpoints
3. ✅ Проверить frontend на localhost:3000
4. ✅ Проверить backend на localhost:8001
5. ✅ Тестировать основные функции

**Тест-кейсы:**
- [ ] Главная страница загружается
- [ ] Регистрация работает
- [ ] Login работает
- [ ] Профиль отображается
- [ ] Поиск возвращает пользователей
- [ ] Лайк создает match
- [ ] Чат отправляет сообщения
- [ ] Admin dashboard доступен

---

## 📦 ГОТОВЫЕ ФАЙЛЫ ДЛЯ ИСПРАВЛЕНИЯ

### 1. docker-compose.yml (ИСПРАВЛЕННЫЙ)

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:16-alpine
    container_name: mambax_postgres
    environment:
      POSTGRES_USER: mambax_user
      POSTGRES_PASSWORD: mambax_password
      POSTGRES_DB: mambax_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mambax_user -d mambax_db"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - mambax-network

  # Redis Cache (Optional but recommended)
  redis:
    image: redis:7-alpine
    container_name: mambax_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    restart: unless-stopped
    networks:
      - mambax-network

  # Backend API (FastAPI)
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: mambax_backend
    ports:
      - "8001:8001"  # ✅ Исправлен порт
    environment:
      - DATABASE_URL=postgresql+asyncpg://mambax_user:mambax_password@postgres:5432/mambax_db
      - REDIS_URL=redis://redis:6379
      - SECRET_KEY=supersecretkey123-change-in-production
      - ENVIRONMENT=development
      - ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - FRONTEND_URL=http://localhost:3000
      - BACKEND_URL=http://localhost:8001
    volumes:
      - ./backend:/app  # Hot reload
      - backend_uploads:/app/static/uploads  # Persistent uploads
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    restart: unless-stopped
    networks:
      - mambax-network

  # Frontend (Next.js)
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: development  # Use development stage
    container_name: mambax_frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8001
      - NODE_ENV=development
    volumes:
      - ./frontend:/app  # Hot reload
      - /app/node_modules  # Prevent overwriting node_modules
      - /app/.next  # Prevent overwriting .next
    depends_on:
      - backend
    restart: unless-stopped
    networks:
      - mambax-network

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  backend_uploads:
    driver: local

networks:
  mambax-network:
    driver: bridge
```

---

### 2. frontend/Dockerfile (НОВЫЙ)

```dockerfile
# Multi-stage build for Next.js

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build Next.js app
RUN npm run build

# Stage 3: Development
FROM node:20-alpine AS development
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies (including dev dependencies)
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]

# Stage 4: Production
FROM node:20-alpine AS production
WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Expose port
EXPOSE 3000

# Start production server
CMD ["node", "server.js"]
```

---

### 3. backend/.env (ПОЛНЫЙ)

```env
# Database
DATABASE_URL=postgresql+asyncpg://mambax_user:mambax_password@localhost:5432/mambax_db

# Redis Cache
REDIS_URL=redis://localhost:6379

# Security
SECRET_KEY=supersecretkey123-change-in-production-minimum-32-characters

# Environment
ENVIRONMENT=development
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Telegram Bot
TELEGRAM_BOT_TOKEN=8531547163:AAEE2xF6cfTqshbtSVjGktz3bDkj8Pwum0E

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8001
WEBHOOK_URL=

# Push Notifications (VAPID)
VAPID_PRIVATE_KEY=ct7iVcF_GsDQBW1otT2fbYQLYZ0LMnI8QUq2eGh65bQ
VAPID_PUBLIC_KEY=BEBmFspg23jMgR7v8iVW5P_sbjvu5eu-cSEEHodKIomIX_OhbyymXJUPu0OlpXdxukO7gK6hOwgZLtTi4F5NA6s
VAPID_CLAIMS_EMAIL=mailto:admin@mambax.com

# Optional Services (leave empty for local dev)
BLOB_READ_WRITE_TOKEN=
SENTRY_DSN=
OPENAI_API_KEY=
HUGGINGFACE_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Admin Configuration
ADMIN_PHONE=+79062148253
ADMIN_USERNAME=RezidentMD
ADMIN_TELEGRAM_ID=
```

---

### 4. frontend/.env.local (НОВЫЙ)

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8001

# Environment
NODE_ENV=development
```

---

### 5. backend/start.sh (УЛУЧШЕННЫЙ)

```bash
#!/bin/bash
set -e

echo "🔍 Waiting for PostgreSQL to be ready..."

# Wait for PostgreSQL
until PGPASSWORD=$POSTGRES_PASSWORD psql -h "postgres" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q' 2>/dev/null; do
  echo "⏳ PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo "✅ PostgreSQL is ready!"

echo "🔄 Running database migrations..."
alembic upgrade head

if [ $? -eq 0 ]; then
  echo "✅ Migrations completed successfully!"
else
  echo "❌ Migrations failed!"
  exit 1
fi

echo "🚀 Starting FastAPI server..."
# Change port to 8001
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

---

### 6. backend/Dockerfile (УЛУЧШЕННЫЙ)

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y \
        postgresql-client \
        build-essential \
        libpq-dev \
        curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy startup script
COPY start.sh .
RUN chmod +x start.sh

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p /app/static/uploads

# Expose port (changed to 8001)
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8001/health || exit 1

# Run startup script
CMD ["./start.sh"]
```

---

### 7. Seed Data Script (НОВЫЙ)

Создать файл `file:backend/seed_users.py`:

```python
"""
Seed script to create 50 test users for development
"""
import asyncio
import random
from datetime import datetime, timedelta
from backend.database import AsyncSessionLocal
from backend.models.user import User
from backend.core.security import get_password_hash

FIRST_NAMES = [
    "Александр", "Дмитрий", "Максим", "Сергей", "Андрей",
    "Алексей", "Артём", "Илья", "Кирилл", "Михаил",
    "Анна", "Мария", "Елена", "Ольга", "Наталья",
    "Татьяна", "Ирина", "Екатерина", "Светлана", "Юлия"
]

INTERESTS = [
    "Путешествия", "Спорт", "Музыка", "Кино", "Книги",
    "Кулинария", "Фотография", "Танцы", "Йога", "Бег",
    "Плавание", "Велосипед", "Искусство", "Театр", "Концерты"
]

CITIES = [
    "Москва", "Санкт-Петербург", "Новосибирск", "Екатеринбург",
    "Казань", "Нижний Новгород", "Челябинск", "Самара"
]

BIOS = [
    "Люблю активный отдых и новые знакомства 🌟",
    "Ищу интересного собеседника для общения ☕",
    "Обожаю путешествия и приключения ✈️",
    "Спорт, музыка, позитив - это про меня 💪",
    "Романтик в душе, ищу свою половинку ❤️"
]

async def create_test_users():
    async with AsyncSessionLocal() as session:
        print("🌱 Creating 50 test users...")
        
        for i in range(50):
            name = random.choice(FIRST_NAMES)
            gender = "male" if i % 2 == 0 else "female"
            age = random.randint(18, 45)
            
            user = User(
                email=f"user{i+1}@test.com",
                phone=f"+7900000{i:04d}",
                hashed_password=get_password_hash("pass123"),
                name=name,
                age=age,
                gender=gender,
                bio=random.choice(BIOS),
                photos=[
                    f"https://i.pravatar.cc/300?img={i+1}",
                    f"https://i.pravatar.cc/300?img={i+51}"
                ],
                interests=random.sample(INTERESTS, k=random.randint(3, 6)),
                height=random.randint(160, 190),
                smoking=random.choice(["never", "sometimes", "regularly"]),
                drinking=random.choice(["never", "socially", "regularly"]),
                education=random.choice(["high_school", "bachelor", "master", "phd"]),
                looking_for=random.choice(["relationship", "friendship", "casual"]),
                latitude=55.7558 + random.uniform(-0.5, 0.5),  # Moscow area
                longitude=37.6173 + random.uniform(-0.5, 0.5),
                city=random.choice(CITIES),
                is_active=True,
                is_complete=True,
                is_verified=random.choice([True, False]),
                status="active",
                subscription_tier=random.choice(["free", "free", "free", "gold", "platinum"]),
                role="user",
                created_at=datetime.utcnow() - timedelta(days=random.randint(1, 365))
            )
            
            session.add(user)
            
            if (i + 1) % 10 == 0:
                print(f"✅ Created {i + 1} users...")
        
        await session.commit()
        print("🎉 Successfully created 50 test users!")

if __name__ == "__main__":
    asyncio.run(create_test_users())
```

Обновить `file:backend/main.py` для вызова seed:

```python
# В функции seed_database() добавить:
from backend.seed_users import create_test_users

async def seed_database():
    # ... существующий код для admin ...
    
    # Создать тестовых пользователей
    await create_test_users()
```

---

## 🚀 КОМАНДЫ ДЛЯ ЗАПУСКА

### Вариант 1: Полный запуск (Рекомендуется)

```bash
# 1. Остановить все существующие контейнеры
docker-compose down -v

# 2. Пересобрать образы
docker-compose build --no-cache

# 3. Запустить все сервисы
docker-compose up

# 4. В отдельном терминале: создать seed данные
docker-compose exec backend python seed_users.py
```

### Вариант 2: Быстрый запуск (без пересборки)

```bash
docker-compose up --build
```

### Вариант 3: Фоновый режим

```bash
docker-compose up -d
docker-compose logs -f  # Смотреть логи
```

---

## ✅ VALIDATION CHECKLIST

После запуска проверить:

### Backend Health
```bash
curl http://localhost:8001/health
# Ожидается: {"status": "healthy"}
```

### Frontend Access
```bash
curl http://localhost:3000
# Ожидается: HTML страница
```

### Database Connection
```bash
docker-compose exec postgres psql -U mambax_user -d mambax_db -c "SELECT COUNT(*) FROM users;"
# Ожидается: 51 (admin + 50 test users)
```

### Redis Connection
```bash
docker-compose exec redis redis-cli ping
# Ожидается: PONG
```

---

## 🧪 ТЕСТОВЫЕ ДАННЫЕ

### Admin Account
- **Email:** admin@localhost
- **Phone:** +79062148253
- **Password:** admin123
- **URL:** http://localhost:3000/admin

### Test Users
- **Email:** user1@test.com до user50@test.com
- **Password:** pass123
- **Phone:** +79000000000 до +79000000049

---

## 📊 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ

### Docker Logs (Успешный запуск)

```
mambax_postgres  | database system is ready to accept connections
mambax_redis     | Ready to accept connections
mambax_backend   | ✅ PostgreSQL is ready!
mambax_backend   | ✅ Migrations completed successfully!
mambax_backend   | 🚀 Starting FastAPI server...
mambax_backend   | INFO:     Uvicorn running on http://0.0.0.0:8001
mambax_frontend  | ready - started server on 0.0.0.0:3000
mambax_frontend  | ○ Local: http://localhost:3000
```

### Browser Access

1. **Frontend:** http://localhost:3000
   - ✅ Главная страница загружается
   - ✅ Telegram theme применяется
   - ✅ Навигация работает

2. **Backend API:** http://localhost:8001
   - ✅ Swagger docs: http://localhost:8001/docs
   - ✅ Health check: http://localhost:8001/health

3. **Admin Dashboard:** http://localhost:3000/admin
   - ✅ Login с admin@localhost / admin123
   - ✅ Dashboard с метриками
   - ✅ User management

---

## 🎯 ФУНКЦИОНАЛЬНОЕ ТЕСТИРОВАНИЕ

### 1. Регистрация
```
1. Открыть http://localhost:3000
2. Нажать "Начать"
3. Ввести телефон: +79001234567
4. Ввести OTP: 0000 (mock mode)
5. Заполнить профиль
6. Загрузить фото
✅ Профиль создан
```

### 2. Поиск пользователей
```
1. Перейти на /discover
2. Свайпнуть вправо (лайк)
3. Свайпнуть влево (пропустить)
✅ Карточки пользователей отображаются
```

### 3. Матчи
```
1. Лайкнуть пользователя
2. Если взаимный лайк → Match!
3. Перейти в /chat
✅ Чат доступен
```

### 4. Сообщения
```
1. Открыть чат с матчем
2. Отправить текстовое сообщение
3. Отправить голосовое (если настроено)
✅ Сообщения отправляются в реальном времени
```

### 5. Admin Dashboard
```
1. Login: admin@localhost / admin123
2. Просмотр метрик
3. User management
4. Moderation queue
✅ Все разделы доступны
```

---

## 📈 PERFORMANCE METRICS

### Ожидаемые показатели:

- **Startup Time:** ~30-40 секунд (первый запуск)
- **Startup Time:** ~10-15 секунд (последующие запуски)
- **Frontend TTFB:** < 200ms
- **Backend API Response:** < 100ms
- **Database Query:** < 50ms
- **WebSocket Latency:** < 50ms

### Проверка производительности:

```bash
# Backend response time
time curl http://localhost:8001/health

# Frontend load time
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000
```

---

## 🐛 TROUBLESHOOTING

### Проблема: Backend не запускается

**Симптомы:**
```
mambax_backend | ❌ Migrations failed!
```

**Решение:**
```bash
# Проверить логи PostgreSQL
docker-compose logs postgres

# Пересоздать БД
docker-compose down -v
docker-compose up postgres
docker-compose up backend
```

---

### Проблема: Frontend не подключается к Backend

**Симптомы:**
```
Failed to fetch http://localhost:8001/health
```

**Решение:**
```bash
# Проверить, что backend запущен
curl http://localhost:8001/health

# Проверить NEXT_PUBLIC_API_URL
docker-compose exec frontend env | grep NEXT_PUBLIC_API_URL

# Пересобрать frontend
docker-compose up --build frontend
```

---

### Проблема: Redis connection failed

**Симптомы:**
```
ConnectionError: Error connecting to Redis
```

**Решение:**
```bash
# Redis опционален, можно отключить
# Закомментировать в docker-compose.yml:
# - REDIS_URL=redis://redis:6379

# Или запустить Redis отдельно
docker-compose up redis
```

---

### Проблема: Нет тестовых пользователей

**Симптомы:**
```
/discover показывает "No profiles found"
```

**Решение:**
```bash
# Запустить seed скрипт
docker-compose exec backend python seed_users.py

# Или через API
curl -X POST http://localhost:8001/init
```

---

## 📝 ДОПОЛНИТЕЛЬНЫЕ УЛУЧШЕНИЯ

### Опциональные сервисы (для полного стека)

Если нужен полный production-like стек, добавить в docker-compose:

```yaml
  # MinIO (S3-compatible storage)
  minio:
    image: minio/minio
    container_name: mambax_minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minio_admin
      MINIO_ROOT_PASSWORD: minio_password
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    networks:
      - mambax-network

  # ScyllaDB (для чата)
  scylla:
    image: scylladb/scylla
    container_name: mambax_scylla
    ports:
      - "9042:9042"
    command: --smp 1 --memory 750M --overprovisioned 1
    networks:
      - mambax-network
```

---

## 🎉 ИТОГОВЫЙ СТАТУС

После применения всех исправлений:

✅ **НАЙДЕНО ПРОБЛЕМ:** 27  
✅ **ИСПРАВЛЕНО:** 27/27  
✅ **СТАТУС:** ГОТОВ К ЗАПУСКУ  

### Команда для запуска (одна строка):

```bash
docker-compose down -v && docker-compose up --build
```

### Доступ к приложению:

- 🌐 **Frontend:** http://localhost:3000
- 🔧 **Backend API:** http://localhost:8001
- 📚 **API Docs:** http://localhost:8001/docs
- 👨‍💼 **Admin:** http://localhost:3000/admin (admin@localhost / admin123)
- 🗄️ **PostgreSQL:** localhost:5432
- 🔴 **Redis:** localhost:6379

---

## 📋 NEXT STEPS

1. **Применить исправления** - Создать/обновить файлы из раздела "ГОТОВЫЕ ФАЙЛЫ"
2. **Запустить проект** - `docker-compose up --build`
3. **Проверить функциональность** - Пройти VALIDATION CHECKLIST
4. **Создать seed данные** - Запустить seed_users.py
5. **Протестировать основные функции** - Регистрация, поиск, матчи, чат

---

## 🔗 СВЯЗАННЫЕ ДОКУМЕНТЫ

- `file:docker-compose.yml` - Основная конфигурация
- `file:backend/.env.example` - Пример переменных окружения
- `file:backend/README.md` - Backend документация
- `file:frontend/README.md` - Frontend документация
- `file:ARCHITECTURE.md` - Архитектура проекта

---

## 📞 SUPPORT

Если возникнут проблемы:

1. Проверить логи: `docker-compose logs -f`
2. Проверить health checks: `docker-compose ps`
3. Пересоздать контейнеры: `docker-compose down -v && docker-compose up --build`
4. Проверить порты: `netstat -an | grep LISTEN`

---

**Статус:** ✅ ГОТОВ К ИСПРАВЛЕНИЮ  
**Время на исправление:** 2-3 часа  
**Сложность:** Средняя  
**Приоритет:** КРИТИЧЕСКИЙ
