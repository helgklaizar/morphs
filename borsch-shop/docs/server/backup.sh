#!/bin/bash
# Скрипт серверного бекапа базы данных PocketBase

BACKUP_DIR="/var/opt/borsch_backups"
PB_DATA_DIR="/var/www/borsch-shop/backend/pb_data"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="$BACKUP_DIR/pb_backup_$DATE.tar.gz"

mkdir -p "$BACKUP_DIR"

echo "Остановка PocketBase для безопасного дампа..."
systemctl stop borsch-pocketbase.service

echo "Сжатие pb_data..."
tar -czf "$BACKUP_FILE" -C $(dirname "$PB_DATA_DIR") $(basename "$PB_DATA_DIR")

echo "Запуск PocketBase..."
systemctl start borsch-pocketbase.service

# Ротация бекапов (удалять старее 14 дней)
find "$BACKUP_DIR" -type f -name "pb_backup_*.tar.gz" -mtime +14 -exec rm {} \;

echo "Бекап завершен: $BACKUP_FILE"
