# Используем официальный image Python
FROM python:3.11-slim

# Устанавливаем рабочую директорию
WORKDIR /app

# Устанавливаем переменные окружения
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Устанавливаем системные зависимости для сборки (нужны для asyncpg/psycopg2)
RUN apt-get update \
    && apt-get install -y postgresql-client build-essential libpq-dev netcat-openbsd \
    && apt-get clean

# Копируем requirements.txt
COPY requirements.txt .

# Устанавливаем Python зависимости
RUN pip install --no-cache-dir -r requirements.txt

# Копируем скрипт запуска и делаем его исполняемым
COPY start.sh .
RUN chmod +x start.sh

# Копируем остальной код
COPY . .

# Открываем порт
EXPOSE 8000

# Запускаем через скрипт
CMD ["./start.sh"]
