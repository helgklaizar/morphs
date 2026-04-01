FROM python:3.10-slim

WORKDIR /var/morphs_core

# Системные зависимости под MLX и компиляцию
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Переносим Ядро ОС
COPY . .

# Открываем порт для Облака
EXPOSE 8000

# Запускаем FastAPI Оркестратор
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
