#!/bin/bash
# new-client.sh — Разворачивает нового клиента на базе RMS AI OS
# Использование: ./scripts/new-client.sh <client-name> <pb-url> <site-url>
#
# Пример: ./scripts/new-client.sh vasya-cafe https://vasya.restaurant https://vasya.restaurant

set -e

CLIENT_NAME=${1:?"Укажи имя клиента: ./scripts/new-client.sh <name> <pb-url> <site-url>"}
PB_URL=${2:?"Укажи PocketBase URL"}
SITE_URL=${3:-$PB_URL}
RMS_ORIGIN=$(git remote get-url origin 2>/dev/null || echo "https://github.com/helgklaizar/rms-ai-os.git")
TARGET_DIR="/Users/klai/AI/$CLIENT_NAME"

echo "🚀 Создаём нового клиента: $CLIENT_NAME"
echo "   PocketBase URL: $PB_URL"
echo "   Site URL:       $SITE_URL"
echo "   Директория:     $TARGET_DIR"
echo ""

# 1. Копируем текущую версию RMS
if [ -d "$TARGET_DIR" ]; then
  echo "❌ Папка $TARGET_DIR уже существует"
  exit 1
fi

cp -r "$(pwd)" "$TARGET_DIR"
cd "$TARGET_DIR"

# 2. Чистим git — новый репо + upstream ссылка на RMS
rm -rf .git
git init
git remote add upstream "$RMS_ORIGIN"
git add .
git commit -m "init: $CLIENT_NAME — base from RMS AI OS"

# 3. Создаём client-config/
mkdir -p client-config

cat > client-config/.env <<EOF
APP_NAME="$CLIENT_NAME"
APP_CURRENCY="₪"
PB_URL="$PB_URL"
NEXT_PUBLIC_PB_URL="$PB_URL"
NEXT_PUBLIC_POCKETBASE_URL="$PB_URL"
SITE_URL="$SITE_URL"
APP_PRIMARY_COLOR="#f97316"
EOF

cat > client-config/branding.ts <<EOF
export const CLIENT_CONFIG = {
  appName: '$CLIENT_NAME',
  currency: '₪',
  siteUrl: '$SITE_URL',
  pbUrl: '$PB_URL',
  primaryColor: '#f97316',
} as const
EOF

cat > client-config/deploy.md <<EOF
# $CLIENT_NAME — Deploy Info
- PocketBase: $PB_URL
- Site: $SITE_URL
- RMS upstream: $RMS_ORIGIN
- Created: $(date)

## Обновить с RMS:
  ./scripts/update.sh

## Первый деплой:
  1. Настрой .env.production с данными PocketBase
  2. pnpm install && pnpm build
  3. Задеплой на VPS через PM2
EOF

git add client-config/
git commit -m "config: add client-config for $CLIENT_NAME"

echo ""
echo "✅ Клиент $CLIENT_NAME готов в $TARGET_DIR"
echo "   Следующий шаг: настрой VPS и задеплой из $TARGET_DIR"
