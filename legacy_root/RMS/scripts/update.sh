#!/bin/bash
# update.sh — Накатывает обновления с RMS AI OS upstream
# Запускать из корня клиентского репо (borsch-shop, vasya-cafe и т.д.)
# Использование: ./scripts/update.sh [--dry-run]

set -e

DRY_RUN=false
if [ "$1" = "--dry-run" ]; then
  DRY_RUN=true
  echo "🔍 Режим dry-run — реальные изменения не применяются"
fi

RMS_UPSTREAM="https://github.com/helgklaizar/rms-ai-os.git"
CURRENT_VERSION=$(cat RMS_VERSION 2>/dev/null || echo "unknown")

echo "📦 RMS Update Script"
echo "   Текущая версия: $CURRENT_VERSION"
echo "   Upstream: $RMS_UPSTREAM"
echo ""

# 1. Проверяем что нет незакоммиченных изменений
if ! git diff --quiet || ! git diff --staged --quiet; then
  echo "❌ Есть незакоммиченные изменения. Закоммить или stash перед апдейтом."
  exit 1
fi

# 2. Добавляем upstream если нет
if ! git remote get-url upstream &>/dev/null; then
  echo "➕ Добавляю upstream remote..."
  git remote add upstream "$RMS_UPSTREAM"
fi

# 3. Сохраняем клиентские конфиги
echo "💾 Сохраняю client-config..."
cp -r client-config/ /tmp/rms_client_config_backup/

# 4. Получаем обновления
echo "📥 Fetching upstream/main..."
git fetch upstream main

# Показываем что изменилось
CHANGES=$(git log HEAD..upstream/main --oneline 2>/dev/null | wc -l | tr -d ' ')
echo "   Новых коммитов: $CHANGES"
git log HEAD..upstream/main --oneline 2>/dev/null | head -10

if [ "$CHANGES" = "0" ]; then
  echo "✅ Уже актуально, обновлений нет."
  exit 0
fi

if $DRY_RUN; then
  echo ""
  echo "🔍 Dry-run завершён. Запусти без --dry-run чтобы применить."
  exit 0
fi

echo ""
echo "⚠️  Применяю $CHANGES коммит(ов). Продолжить? [y/N]"
read -r CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "Отменено."
  exit 0
fi

# 5. Мержим
git merge upstream/main --no-edit --allow-unrelated-histories || {
  echo "⚠️  Конфликты при мерже. Восстанавливаю client-config..."
  cp -r /tmp/rms_client_config_backup/ client-config/
  echo "❌ Разреши конфликты вручную, затем: git merge --continue"
  exit 1
}

# 6. Восстанавливаем client-config (он должен быть в .gitignore — не перезапишется, но на всякий)
cp -r /tmp/rms_client_config_backup/ client-config/
rm -rf /tmp/rms_client_config_backup/

# 7. Запускаем тесты
echo ""
echo "🧪 Запускаю тесты..."
pnpm test --run 2>/dev/null || npm test -- --run 2>/dev/null || {
  echo "❌ Тесты упали после апдейта! Откатить? [y/N]"
  read -r ROLLBACK
  if [ "$ROLLBACK" = "y" ] || [ "$ROLLBACK" = "Y" ]; then
    git reset --hard HEAD~1
    echo "🔄 Откатились на предыдущую версию"
    exit 1
  fi
}

# 8. Обновляем версию
NEW_VERSION=$(git describe --tags --abbrev=0 2>/dev/null || date +%Y.%m.%d)
echo "$NEW_VERSION" > RMS_VERSION
git add RMS_VERSION
git commit -m "chore: update to RMS $NEW_VERSION"

echo ""
echo "✅ Апдейт завершён!"
echo "   Версия: $CURRENT_VERSION → $NEW_VERSION"
echo "   Следующий шаг: pnpm build && PM2 restart"
