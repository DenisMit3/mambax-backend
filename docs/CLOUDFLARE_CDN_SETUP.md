# Cloudflare CDN Configuration Guide

## Переменные окружения

Добавьте в `.env` файл:

```env
CDN_DOMAIN=cdn.mambax.com
```

## Настройка Cloudflare

### 1. DNS настройка
- Добавьте CNAME запись: `cdn` → ваш backend домен
- Включите проксирование (оранжевое облако)

### 2. Page Rules (или Cache Rules)

Создайте правило для `/static/*`:

```
URL: *mambax.com/static/*
Settings:
  - Cache Level: Cache Everything
  - Browser Cache TTL: 7 days (604800 seconds)
  - Edge Cache TTL: 1 month
```

### 3. Speed → Optimization

Включите:
- [x] Auto Minify: JavaScript, CSS, HTML
- [x] Brotli compression
- [x] Early Hints
- [x] Rocket Loader (опционально, тестируйте)

### 4. Caching → Configuration

```
Browser Cache TTL: Respect Existing Headers
Crawler Hints: On
Always Online: On
```

### 5. Cache Rules (новый интерфейс)

Создайте правило:
```
Rule name: Static Assets Cache
When: URI Path starts with "/static/"
Then:
  - Cache eligibility: Eligible for cache
  - Edge TTL: Override - 1 month
  - Browser TTL: Override - 7 days
```

## Проверка работы CDN

После настройки проверьте заголовки:

```bash
curl -I https://cdn.mambax.com/static/uploads/test.webp
```

Ожидаемые заголовки:
- `cf-cache-status: HIT` (после первого запроса)
- `cache-control: public, max-age=604800`

## Интеграция в код

CDN URL автоматически генерируется методом `get_cdn_url()` в `backend/services/storage.py` когда установлена переменная `CDN_DOMAIN`.
