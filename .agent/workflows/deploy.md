---
description: Как деплоить фронтенд на Vercel
---

# Деплой на Vercel

## Важная информация
- **Проект**: silver-memory
- **Production URL**: https://mambax-frontend.vercel.app
- **GitHub**: DenisMit3/silver-memory

## Шаги для деплоя

// turbo-all

1. Убедиться что сборка работает:
```powershell
npm run build
```

2. Деплой на Vercel:
```powershell
npx vercel --prod
```

## Примечания

- **Git автодеплой НЕ РАБОТАЕТ** — используй только `npx vercel --prod`
- Git email должен быть `denismityuk@gmail.com` (не `bot@test.com`)
- Если email неправильный, исправить:
```powershell
git config user.email "denismityuk@gmail.com"
git config user.name "Denis"
```

## Структура проекта

- `/frontend` — Next.js приложение
- `/frontend/src/app` — страницы и компоненты
- `/frontend/src/app/chat/[id]/page.tsx` — чат комната
- `/frontend/src/app/globals.css` — глобальные стили

## Решение проблем

### Ошибка "Git author bot@test.com must have access"
Исправить email и сделать новый коммит:
```powershell
git config user.email "denismityuk@gmail.com"
git add -A
git commit --amend --reset-author
git push --force
```

### Кнопки не работают на мобильных
Добавить в стили кнопок:
- `WebkitTapHighlightColor: 'transparent'`
- `touchAction: 'manipulation'`
- `pointerEvents: 'auto'`
- Минимальный размер 44x44px
