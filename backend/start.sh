#!/bin/bash

# Ждем доступности базы данных (опционально, но полезно)
# Можно добавить netcat проверку, но alembic обычно сам отвалится если БД нет.
# Для простоты сразу запускаем миграции.

echo "Running migrations..."
alembic upgrade head

echo "Starting server..."
# Запуск с reload для разработки
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
