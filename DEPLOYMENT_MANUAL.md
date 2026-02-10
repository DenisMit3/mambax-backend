# 🚀 Deployment Manual

## 1. Environment Configuration
Ensure the following variables are set in your production environment (Render, Vercel, .env):

### Core
- `TELEGRAM_BOT_TOKEN`: Token from BotFather
- `SECRET_KEY`: Random string for security
- `DATABASE_URL`: Postgres connection string
- `SENTRY_DSN`: For error tracking

### Infrastructure & Monetization
- `FIREBASE_CREDENTIALS`: JSON string or path for Push Notifications
- `AWS_ACCESS_KEY_ID` & `AWS_SECRET_ACCESS_KEY`: For S3 Backups & Media
- `ENABLE_SCHEDULER=true`: To enable background jobs (backups, retention)

## 2. Database Setup
Run the following commands in your backend container/shell:
- Install dependencies: `pip install -r requirements.txt`
- Run migrations: `alembic upgrade head`

## 3. Telegram Bot Setup (Manual)
- **Domain Verification**: Verify your domain in BotFather if using Telegram Stars.
- **Payments**: Switch Payments to "Live Mode" in BotFather.
- **Menu Button**: Configure the "Menu" button to launch the Web App URL.

## 4. Final Verification
- **Stress Test**: Check `/feed` performance.
- **Background Jobs**: Verify backups and retention logic in logs.
