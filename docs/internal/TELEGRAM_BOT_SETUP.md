# 🤖 Настройка Telegram Bot для MambaX

## Шаг 1: Создание бота в @BotFather

1. Откройте Telegram и найдите [@BotFather](https://t.me/BotFather)
2. Отправьте команду `/newbot`
3. Введите имя бота: `MambaX Dating`
4. Введите username бота: `MambaXBot` (или любой свободный)
5. **Скопируйте токен** - он выглядит так: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`

## Шаг 2: Настройка Mini App

В @BotFather выполните следующие команды:

```
/mybots → Выберите вашего бота → Bot Settings → Menu Button
```

1. **Меню бота** (Menu Button):
   - Выберите `Configure menu button`
   - Введите URL: `https://mambax-frontend.vercel.app` (ваш Vercel URL)
   - Введите текст кнопки: `Open MambaX`

2. **Web App настройки**:
   ```
   /mybots → Bot Settings → Domain → Set Domain
   ```
   Введите ваш домен: `mambax-frontend.vercel.app`

3. **Описание бота**:
   ```
   /mybots → Edit Bot → Edit Description
   ```
   Введите:
   ```
   🚀 MambaX - AI-Powered Dating Platform
   
   ✨ Smart matching algorithm
   💬 Real-time chat
   🔒 Verified profiles
   
   Tap the button below to find your match! 💘
   ```

4. **About**:
   ```
   /mybots → Edit Bot → Edit About
   ```
   Введите:
   ```
   MambaX - Find your soulmate with AI-powered matching. Safe, smart, and fun!
   ```

5. **Аватар бота**:
   ```
   /mybots → Edit Bot → Edit Botpic
   ```
   Загрузите логотип MambaX

## Шаг 3: Настройка переменных окружения

Добавьте в `.env` файл:

```bash
# Telegram Bot
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

# Frontend URL (для WebApp)
FRONTEND_URL=https://mambax-frontend.vercel.app

# Backend URL (для API)
BACKEND_URL=https://mambax-api.onrender.com
```

## Шаг 4: Запуск бота

### Локально (для тестирования):

```bash
# Из корня проекта
python run_bot.py
```

Вы должны увидеть:
```
🚀 Starting Bot in POLLING mode...
Run polling for bot @YouMeMeet_bot
```

### На сервере (Render) - WEBHOOK режим:

В продакшене используется **webhook** вместо polling — это эффективнее и надёжнее.

**Шаг 1: Добавьте переменные в Render**

```bash
TELEGRAM_BOT_TOKEN=your-bot-token
FRONTEND_URL=https://mambax-frontend.vercel.app
WEBHOOK_URL=https://mambax-api.onrender.com
```

**Шаг 2: Webhook регистрируется автоматически**

После деплоя вызовите API для настройки webhook:

```bash
# Проверить статус бота
curl https://mambax-api.onrender.com/bot/status

# Настроить webhook (если не настроен автоматически)
curl -X POST https://mambax-api.onrender.com/bot/setup-webhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://mambax-api.onrender.com"}'

# Удалить webhook (переключиться на polling)
curl -X POST https://mambax-api.onrender.com/bot/delete-webhook
```

**Эндпоинты бота:**

| Эндпоинт | Метод | Описание |
|----------|-------|----------|
| `/bot/status` | GET | Статус бота и webhook |
| `/bot/setup-webhook` | POST | Настроить webhook |
| `/bot/delete-webhook` | POST | Удалить webhook |
| `/bot/webhook/{token}` | POST | Webhook endpoint (внутренний) |

**Примечание:** В polling режиме (локально) бот запускается отдельно: `python run_bot.py`
В webhook режиме (Render) бот интегрирован в FastAPI и не требует отдельного процесса.

## Шаг 5: Тестирование

1. Откройте вашего бота в Telegram
2. Отправьте `/start`
3. Должно появиться сообщение с кнопкой "Open MambaX"
4. Нажмите кнопку - должен открыться WebApp

### Команды бота:

| Команда | Описание |
|---------|----------|
| `/start` | Открыть MambaX |
| `/profile` | Посмотреть профиль |
| `/matches` | Посмотреть матчи |
| `/help` | Помощь |

## Шаг 6: Интеграция уведомлений (опционально)

Чтобы бот отправлял уведомления о матчах, добавьте в бэкенд:

```python
# В backend/crud.py после создания матча:
from backend.bot import send_match_notification

# После успешного матча:
await send_match_notification(
    user_telegram_id=user.telegram_id,
    match_name=matched_user.name
)
```

## Troubleshooting

### Бот не отвечает
- Проверьте, что токен верный
- Убедитесь, что бот запущен (`python run_bot.py`)
- Проверьте логи на ошибки

### WebApp не открывается
- Убедитесь, что FRONTEND_URL указывает на HTTPS
- Проверьте, что домен добавлен в Bot Settings

### Кнопка меню не появляется
- В @BotFather: `/mybots` → Bot Settings → Menu Button
- Убедитесь, что URL начинается с `https://`

---

## Чек-лист настройки

- [ ] Создан бот в @BotFather
- [ ] Скопирован токен
- [ ] Настроен Menu Button
- [ ] Добавлен домен в Bot Settings
- [ ] TELEGRAM_BOT_TOKEN в .env / Render
- [ ] FRONTEND_URL в .env / Render
- [ ] Бот запущен и отвечает на /start
- [ ] WebApp открывается по кнопке

---

📚 **Документация Telegram:**
- [Bot API](https://core.telegram.org/bots/api)
- [Web Apps](https://core.telegram.org/bots/webapps)
- [Mini Apps](https://core.telegram.org/bots/webapps)
