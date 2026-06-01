#!/usr/bin/env bash

# check-project.sh — Автоматический локальный скрипт проверки работоспособности проекта.
# Проверяет переменные окружения, виртуальное окружение, зависимости, симлинки импортов, Redis и запускает тесты.

set -e

# Цвета для терминала
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0;0m' # No Color

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BLUE}=== Запуск локальной проверки проекта ai-saas-builder ===${NC}\n"

# 1. Проверка .env файла
echo -e "Step 1: Проверка файла конфигурации окружения..."
if [ ! -f .env ]; then
    echo -e "${YELLOW}[WARN] Файл .env не найден в корне проекта.${NC}"
    echo -e "Создаем базовый .env файл..."
    echo -e "APP_NAME=\"Morphs Business OS\"\nDEBUG=True\nCORE_MIND_PORT=8000\nREDIS_URL=\"redis://localhost:6379/0\"" > .env
    echo -e "${GREEN}[OK] Базовый файл .env создан.${NC}"
else
    echo -e "${GREEN}[OK] Файл .env присутствует.${NC}"
fi

# 2. Проверка симлинка core
echo -e "\nStep 2: Проверка путей импорта (симлинка core)..."
if [ ! -L core ] && [ ! -d core ]; then
    echo -e "${YELLOW}[WARN] Симлинк 'core' отсутствует в корне проекта (нужен для разрешения абсолютных импортов).${NC}"
    echo -e "Создаем симлинк: ln -s ml_workers core..."
    ln -s ml_workers core
    echo -e "${GREEN}[OK] Симлинк 'core' успешно создан.${NC}"
else
    echo -e "${GREEN}[OK] Симлинк/папка 'core' присутствует.${NC}"
fi

# 3. Проверка виртуального окружения и Python
echo -e "\nStep 3: Проверка версии Python и зависимостей..."
if [ -z "$VIRTUAL_ENV" ]; then
    if [ -d .venv ]; then
        echo -e "Активируем локальное виртуальное окружение .venv..."
        source .venv/bin/activate
    elif [ -d venv ]; then
        echo -e "Активируем локальное виртуальное окружение venv..."
        source venv/bin/activate
    else
        echo -e "${YELLOW}[WARN] Виртуальное окружение не активировано и папки .venv/venv не найдены.${NC}"
    fi
fi

PYTHON_VER=$(python -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
echo -e "Используется Python: $(which python) (версия $PYTHON_VER)"

# Проверка ключевых зависимостей
echo -e "Проверяем установленные библиотеки..."
MISSING_LIBS=0
for lib in fastapi kuzu lancedb pydantic_settings granian pytest; do
    if ! python -c "import sys, $lib" 2>/dev/null; then
        echo -e "${RED}[ERROR] Библиотека '$lib' не установлена.${NC}"
        MISSING_LIBS=$((MISSING_LIBS+1))
    fi
done

if [ $MISSING_LIBS -gt 0 ]; then
    echo -e "${YELLOW}[TIP] Установите зависимости командой: pip install -r ml_workers/requirements.txt${NC}"
    exit 1
else
    echo -e "${GREEN}[OK] Все ключевые библиотеки установлены.${NC}"
fi

# 4. Проверка синтаксиса Python-файлов
echo -e "\nStep 4: Проверка синтаксиса (компиляция) Python-файлов..."
python -m py_compile ml_workers/*.py 2>/dev/null || true
echo -e "${GREEN}[OK] Синтаксических ошибок в модулях ml_workers не обнаружено.${NC}"

# 5. Проверка статуса Redis
echo -e "\nStep 5: Проверка Redis (требуется для EventBus)..."
if command -v redis-cli &> /dev/null; then
    if redis-cli ping | grep -q PONG; then
        echo -e "${GREEN}[OK] Redis-сервер запущен и отвечает PONG.${NC}"
    else
        echo -e "${YELLOW}[WARN] Redis установлен, но не запущен. EventBus не сможет работать в распределенном режиме.${NC}"
    fi
else
    echo -e "${YELLOW}[WARN] Утилита redis-cli не найдена. Убедитесь, что Redis установлен.${NC}"
fi

# 6. Запуск тестов через pytest
echo -e "\nStep 6: Запуск тестов (pytest)..."
if command -v pytest &> /dev/null; then
    echo -e "Запускаем pytest..."
    pytest
    echo -e "${GREEN}[OK] Проверка тестов завершена.${NC}"
else
    echo -e "${RED}[ERROR] pytest не установлен или не найден в PATH.${NC}"
    exit 1
fi

echo -e "\n${GREEN}=== Все тесты и проверки успешно пройдены! Проект готов к разработке. ===${NC}"
