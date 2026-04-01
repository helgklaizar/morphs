# Базовый образ для Мозга (Core Mind)
FROM python:3.12-slim

# Установка системных зависимостей, необходимых для LanceDB, Kuzu, Ruff и Bun
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    unzip \
    cmake \
    && rm -rf /var/lib/apt/lists/*

# Установка Bun (Оркестратор может дёргать его для вызова тестов)
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

WORKDIR /app

# Копируем requirements.txt
COPY core/requirements.txt .

# Установка зависимостей Python (Флаг --no-cache-dir для сжатия образа)
RUN pip install --no-cache-dir -r requirements.txt

# Копируем остальной код ядра
COPY core/ /app/core/
COPY GEMINI.md /app/

# Настройка переменных окружения
ENV PYTHONPATH=/app/core
ENV SAAS_BACKEND_PORT=8000

# Создание юзера без root прав (Security Best Practice)
RUN useradd -m morph
RUN chown -R morph:morph /app
USER morph

# Запуск FastAPI через Uvicorn
CMD ["uvicorn", "core.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
