#!/bin/bash
# staging-setup.sh — Поднимает локальный staging-инстанс RMS для тестирования
# Использование: ./scripts/staging-setup.sh

set -e

STAGING_DIR="/tmp/rms-staging"
RMS_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "🧪 RMS Staging Setup"
echo "   Source: $RMS_DIR"
echo "   Staging dir: $STAGING_DIR"
echo ""

# Чистим старый staging
if [ -d "$STAGING_DIR" ]; then
  echo "🗑️  Удаляю старый staging..."
  rm -rf "$STAGING_DIR"
fi

# Копируем текущий RMS
echo "📋 Копирую RMS в staging..."
cp -r "$RMS_DIR" "$STAGING_DIR"
cd "$STAGING_DIR"

# Удаляем prod-артефакты
rm -rf apps/*/.next apps/*/out

# Создаём тестовый client-config
mkdir -p client-config
cat > client-config/.env <<'EOF'
APP_NAME="RMS Staging"
APP_CURRENCY="₪"
PB_URL="http://localhost:8090"
NEXT_PUBLIC_PB_URL="http://localhost:8090"
NEXT_PUBLIC_POCKETBASE_URL="http://localhost:8090"
SITE_URL="http://localhost:3001"
APP_PRIMARY_COLOR="#6366f1"
EOF

cat > client-config/branding.ts <<'EOF'
export const CLIENT_CONFIG = {
  appName: 'RMS Staging',
  currency: '₪',
  siteUrl: 'http://localhost:3001',
  pbUrl: 'http://localhost:8090',
  primaryColor: '#6366f1',
} as const
EOF

echo "RMS_STAGING" > RMS_VERSION

# Устанавливаем зависимости
echo "📦 pnpm install..."
pnpm install --silent

echo ""
echo "✅ Staging готов в $STAGING_DIR"
echo ""
echo "   Для запуска:"
echo "   cd $STAGING_DIR && pnpm --filter backoffice dev"
echo ""
echo "   Для тестов:"
echo "   cd $STAGING_DIR && pnpm test"
