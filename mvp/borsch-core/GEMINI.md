# RMS AI OS — Project Memory (Borsch Core MVP)

> **Статус**: Минимальный рабочий прототип (MVP) выделен в отдельный проект.
> **Расположение**: `/Users/klai/AI/mvp/borsch-core` 

## ⚙️ Локальный контекст (Стек и Архитектура)
- **Архитектура:** Monorepo (Turborepo + pnpm)
- **Стек Фронта:** `apps/backoffice-vite` (Vite, React Router, TailwindCSS), `apps/landing` (Next.js 14+)
- **Стек Бэка:** Hono + Prisma + SQLite (`apps/api` на порту 3002).
- **Миграция полного цикла завершена:**
  - PocketBase полностью отключён от проекта.
  - Старый Next.js Backoffice удалён (`apps/backoffice`).
  - Hono API разделён по роутерам на микро-домены (Orders, Menu, Auth, Events и System).
- **Tauri / Оффлайн:** Оффлайн отключен. Десктопное приложение — просто оболочка.
- **Интеграция:** Реалтайм реализован через SSE (`/api/events`).

## 📦 Структура Проекта
1. `apps/backoffice-vite/` (порт 3001) — Админ-панель на Vite. (Основная касса, склад, меню и закупки).
2. `apps/landing/` (порт 3000) — Лендинг для доставки/самовывоза. Переведен на Hono API + FSD (Header, Hero, ProductCard, MenuGrid).
3. `apps/api/` (порт 3002) — Clean API Backend на HonoJS и Prisma.
4. `packages/core/` — Переиспользуемая бизнес-логика (FSD домены: `orders`, `menu`, `inventory`, `clients`, `cart`).

## 🚀 Как запускать
```bash
# Из корня /Users/klai/AI/mvp/borsch-core
pnpm dev
# Поднимет landing на localhost:3000
# Поднимет backoffice-vite на localhost:3001
# Поднимет api на localhost:3002
```

## 🌍 Важные нюансы
- Hono API: работает на `http://localhost:3002/api`. Лендинг использует `NEXT_PUBLIC_API_URL` для связи.
- **Проблема с датами:** Функция `safeFormat` для дат `reservationDate / createdAt`.
- **Tauri Оффлайн отключен:** Но само Tauri приложение (macOS) собирается для обертки (`/deploy-desktop`).
- **Генерация Закупок:** Черновики заказов генерируются с учетом дефицита `(Заказы * Порции) - Склад`. Учитываются единицы измерения (`кг`, `упаковка`).

## ✅ Что сделали (Апрель 2026 — полная сессия)
1. **PocketBase полностью удалён** — нет ни одной строки pb/collections во всём проекте
2. **`useLandingSettingsStore`** — подключён к реальному Hono API (не мок)
3. **Кнопки хедера** (Самовывоз/Доставка/Предзаказ) → реально пишут в `LandingSettings` таблицу → лендинг читает при загрузке
4. **Архив заказов** — создан роут `/orders-history`, эндпоинт `GET /orders/archived`, основной список фильтрует `isArchived: false`
5. **Подписка** — `SubscriptionClient.tsx` переписан с PocketBase на Hono API
6. **`POST /clients/upsert`** — создан (использует подписка и корзина)
7. **Склад** — вкладки по категориям, CRUD категорий, dropdown в форме товара
8. **MenuSharedHeader** — добавлен на Рецепты, Склад, Закупки
9. **Prisma схема** — добавлены `LandingSettings`, `InventoryCategory`, `categoryId` в `InventoryItem`
10. **Роуты бэкофиса** — `/orders-history`, `/settings` зарегистрированы

## ⚡ Текущая задача
Ручное тестирование по чек-листу из `MIGRATION_STATUS.md`



---
## 🛡️ GOLDEN SAFETY PROTOCOL (Защита от потери данных)
- **1. Переименование**: Если файл или папка «больше не нужны», я не удаляю их, а переименовываю в `[name]_BAK_[timestamp]`. Удалил — только если явная команда "удалить".
- **2. SAFE-COMMIT**: Перед любым рефакторингом (переписыванием модулей) — обязателен коммит.
- **3. Backup DB**: Конфиги и схемы хранить бережно.
