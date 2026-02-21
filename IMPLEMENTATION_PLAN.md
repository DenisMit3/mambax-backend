# План реализации заглушек

## Статус: ✅ ЗАВЕРШЕНО

Все модели БД уже созданы. Бизнес-логика реализована в сервисах и API endpoints.

---

## Фаза 1: Критичный UX (Пользователь видит пустые данные)

### 1.1 Stories (Истории) ⭐⭐⭐
**Приоритет:** ВЫСОКИЙ  
**Сложность:** Средняя  
**Файлы:** `api/missing_endpoints/` → `api/social/stories.py`

**Модели существуют:**
- `Story` - сама история
- `StoryView` - просмотры
- `StoryReaction` - реакции

**API endpoints:**
- [x] `GET /api/stories` - получить истории матчей и друзей
- [x] `POST /api/stories` - создать историю (upload файла)
- [x] `POST /api/stories/{id}/view` - отметить просмотр
- [x] `POST /api/stories/{id}/react` - добавить реакцию
- [ ] `DELETE /api/stories/{id}` - удалить свою историю

**Бизнес-логика:**
- История живёт 24 часа (`expires_at`)
- Показывать истории только от матчей
- Автоматическое удаление истёкших (cron task)

---

### 1.2 Daily Rewards (Ежедневные награды) ⭐⭐⭐
**Приоритет:** ВЫСОКИЙ  
**Сложность:** Средняя  
**Файлы:** `api/missing_endpoints/social.py:406-430` → `api/gamification/rewards.py`

**Модели существуют:**
- `DailyReward` - определения наград по дням
- `UserDailyRewardClaim` - история получения
- `User.last_daily_claim` - нужно добавить поле

**API endpoints:**
- [x] `GET /api/rewards/daily` - статус (можно ли забрать, streak, награда)
- [x] `POST /api/rewards/daily/claim` - забрать награду

**Бизнес-логика:**
- 7-дневный цикл наград (1→7→1)
- Streak сбрасывается если пропустил день
- День 7 - бонусная награда (2x)
- Начислять stars на баланс

**Seed данные:**
```sql
INSERT INTO daily_rewards (day_number, reward_type, reward_value, description) VALUES
(1, 'stars', 5, '5 звёзд'),
(2, 'stars', 10, '10 звёзд'),
(3, 'stars', 15, '15 звёзд'),
(4, 'superlike', 1, '1 Super Like'),
(5, 'stars', 20, '20 звёзд'),
(6, 'boost', 1, '30 мин буста'),
(7, 'stars', 50, '50 звёзд! Бонус за неделю');
```

---

### 1.3 Who Viewed Me (Кто смотрел профиль) ⭐⭐⭐
**Приоритет:** ВЫСОКИЙ  
**Сложность:** Низкая  
**Файлы:** `api/missing_endpoints/social.py:434-444` → использовать существующую модель

**Модель существует:**
- `ProfileView` - viewer_id, viewed_id, source, created_at

**API endpoints:**
- [x] `GET /api/views/who-viewed-me` - список кто смотрел (VIP)
- [x] `POST /api/views/record` - записать просмотр (вызывается при открытии профиля)

**Бизнес-логика:**
- Бесплатно: только количество просмотров
- VIP: полный список с фото и именами
- Дедупликация (1 view в день от одного человека)

---

### 1.4 Profile Prompts (Вопросы профиля) ⭐⭐
**Приоритет:** СРЕДНИЙ  
**Сложность:** Низкая  
**Файлы:** `api/missing_endpoints/content.py:15-47` → `api/users/prompts.py`

**Модель существует:**
- `UserPrompt` - user_id, question, answer, sort_order

**API endpoints:**
- [x] `GET /api/prompts` - список доступных вопросов
- [x] `POST /api/prompts/answer` - сохранить ответ
- [x] `GET /api/prompts/my` - мои ответы
- [x] `DELETE /api/prompts/{id}` - удалить ответ

**Статические вопросы:**
```python
PROMPTS = [
    {"id": "about_me", "text": "Обо мне в двух словах..."},
    {"id": "looking_for", "text": "Я ищу..."},
    {"id": "fun_fact", "text": "Забавный факт обо мне..."},
    {"id": "ideal_date", "text": "Идеальное свидание - это..."},
    {"id": "unpopular_opinion", "text": "Моё непопулярное мнение..."},
    {"id": "superpower", "text": "Моя суперспособность - это..."},
    {"id": "two_truths_lie", "text": "Две правды и одна ложь..."},
    {"id": "pet_peeve", "text": "Что меня бесит..."},
]
```

---

## Фаза 2: Engagement (Вовлечённость)

### 2.1 Spotlight (Витрина профилей) ⭐⭐
**Приоритет:** СРЕДНИЙ  
**Сложность:** Средняя  
**Файлы:** `api/missing_endpoints/content.py:103-113`

**Модель существует:**
- `SpotlightEntry` - user_id, source, priority, expires_at

**API endpoints:**
- [x] `GET /api/spotlight` - топ профили для показа
- [x] `POST /api/spotlight/join` - попасть в spotlight (платно)

**Бизнес-логика:**
- Источники: boost, admin, algorithm
- Сортировка по priority + randomization
- Исключать уже просмотренных

---

### 2.2 Compatibility Score (Совместимость) ⭐⭐
**Приоритет:** СРЕДНИЙ  
**Сложность:** Средняя  
**Файлы:** `api/missing_endpoints/social.py:448-463`

**Использует:**
- `services/ai/recommendations.py:calculate_compatibility()` - уже есть!

**API endpoints:**
- [x] `GET /api/compatibility/{user_id}` - реальный расчёт

**Улучшения:**
- Добавить breakdown по категориям
- Кэшировать результат в Redis (24h)

---

### 2.3 Events (События) ⭐
**Приоритет:** НИЗКИЙ  
**Сложность:** Высокая  
**Файлы:** `api/missing_endpoints/content.py:130-147`

**Модель существует:**
- `DatingEvent` в `models/advanced.py`

**API endpoints:**
- [x] `GET /api/events` - список событий
- [x] `POST /api/events/{id}/register` - регистрация

**Требует:**
- Admin UI для создания событий
- Геолокация для фильтрации

---

## Фаза 3: Монетизация

### 3.1 Payment History (История платежей) ⭐⭐
**Приоритет:** СРЕДНИЙ  
**Сложность:** Низкая  
**Файлы:** `api/missing_endpoints/content.py:240-250`

**Модель существует:**
- `RevenueTransaction` - все транзакции

**API endpoints:**
- [x] `GET /api/payments/history` - история платежей пользователя
- [x] `GET /api/payments/stars/history` - история транзакций звёзд

---

### 3.2 Swipes Status (Статус свайпов) ⭐⭐
**Приоритет:** СРЕДНИЙ  
**Сложность:** Низкая  
**Файлы:** `api/missing_endpoints/social.py:74-86`

**Использует:**
- `services/swipe_limits.py` - уже реализовано!

**API endpoints:**
- [x] `GET /api/swipes/status` - реальные данные из swipe_limits

---

### 3.3 Matching Preferences (Настройки поиска) ⭐
**Приоритет:** НИЗКИЙ  
**Сложность:** Средняя  
**Файлы:** `api/missing_endpoints/content.py:51-72`

**Модель существует:**
- `UserPreference` - category, key, value, is_dealbreaker

**API endpoints:**
- [x] `GET /api/preferences/matching` - получить из БД
- [x] `PUT /api/preferences/matching` - сохранить в БД

---

## Порядок реализации

### Спринт 1 (Критичный UX)
1. ✅ Daily Rewards - простая логика, высокий engagement
2. ✅ Profile Prompts - простая CRUD, улучшает профили
3. ✅ Who Viewed Me - простой SELECT, VIP монетизация

### Спринт 2 (Stories + Discovery)
4. ✅ Stories - требует upload, но высокий impact
5. ✅ Spotlight - использует существующие данные
6. ✅ Compatibility - использует существующую функцию

### Спринт 3 (Полировка)
7. ✅ Payment History - простой SELECT
8. ✅ Swipes Status - подключить существующий сервис
9. ✅ Matching Preferences - CRUD для preferences
10. ✅ Events - требует admin UI

---

## Оценка трудозатрат

| Задача | Сложность | Время |
|--------|-----------|-------|
| Daily Rewards | Средняя | ~2 часа |
| Profile Prompts | Низкая | ~1 час |
| Who Viewed Me | Низкая | ~1 час |
| Stories | Средняя | ~3 часа |
| Spotlight | Средняя | ~2 часа |
| Compatibility | Низкая | ~1 час |
| Payment History | Низкая | ~30 мин |
| Swipes Status | Низкая | ~30 мин |
| Matching Preferences | Средняя | ~1.5 часа |
| Events | Высокая | ~4 часа |

**Итого: ~16-17 часов**

---

## Зависимости

```
Daily Rewards
    └── User.stars_balance (есть)
    └── User.last_daily_claim (добавить поле или использовать Redis)

Stories
    └── Storage service (есть)
    └── Matches (для фильтрации)

Who Viewed Me
    └── ProfileView записи (нужно записывать при просмотре)

Spotlight
    └── SpotlightEntry от boost (связать с boost activation)
```

---

## Миграции БД

Все модели уже созданы, миграции не нужны.

Нужны seed данные для:
- `daily_rewards` - 7 записей для наград
- Статические prompts можно хранить в коде
