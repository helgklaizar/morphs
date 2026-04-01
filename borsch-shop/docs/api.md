# Borsch Shop - API & Sync Contracts

## PocketBase Cloud Sync
Основная база данных магазина хранится на локальном устройстве (Tauri SQLite). Для облачной синхронизации используется фоновый воркер (SyncEngine на Rust), который периодически проверяет записи со статусом `sync_status != 'synced'` и отправляет их в PocketBase.

- **URL:** `https://borsch.shop` (Self-Hosted PocketBase)
- **Метод интеграции (Backend):** Rust `reqwest` HTTP-клиент (в модуле `sync.rs`).
- **Метод интеграции (Frontend Landing):** Next.js REST API запросы к PocketBase через нативный `fetch`.

## Telegram Заказы (Landing)
Лендинг отправляет уведомление о новом заказе в Telegram-канал при успешном оформлении.
- **REST API:** POST `https://api.telegram.org/bot<TOKEN>/sendMessage`
- **Параметры:** `chat_id`, `text`, `parse_mode: "HTML"`

## Формат ID
Все сущности генерируют свои ID через кастомную функцию `generateId()`.
- **Формат:** Строка из 15 символов (A-Z, a-z, 0-9).
- **Совместимость:** 100% совместимо с требованиями PocketBase к ID-шникам.

## Структуры синхронизации
Любая таблица имеет системные поля:
- `id` (15 chars)
- `created_at` (Datetime)
- `updated_at` (Datetime, опционально)
- `sync_status` (Строка: `synced`, `pending_update`, `pending_create`, `pending_delete`) — определяет нужно ли отправить эти данные в облако.
