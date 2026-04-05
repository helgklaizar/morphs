#!/bin/bash
# Server backup script for PocketBase database

BACKUP_DIR="/var/opt/rms_backups"
PB_DATA_DIR="/var/www/rms-environment/backend/pb_data"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="$BACKUP_DIR/pb_backup_$DATE.tar.gz"

mkdir -p "$BACKUP_DIR"

echo "Stopping PocketBase for safe data dump..."
systemctl stop rms-pocketbase.service

echo "Compressing pb_data..."
tar -czf "$BACKUP_FILE" -C $(dirname "$PB_DATA_DIR") $(basename "$PB_DATA_DIR")

echo "Starting PocketBase..."
systemctl start rms-pocketbase.service

# Rotate backups (delete files older than 14 days)
find "$BACKUP_DIR" -type f -name "pb_backup_*.tar.gz" -mtime +14 -exec rm {} \;

echo "Backup complete: $BACKUP_FILE"
