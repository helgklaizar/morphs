# Shared Packages

Эта директория (часть Turborepo) содержит переиспользуемые модули, типы и код для всех фронтенд (React/Next) приложений внутри `borsch-shop/apps`.

## Основные пакеты:
- `db-local/` - локальные подключения к SQLite (если применимо).
- `testing/` - общие конфигурации для тестов (Vitest, mocks).
- `types/` - общие TypeScript типы и интерфейсы (описание `Order`, `MenuItem`, `InventoryItem`).
- `ui/` - возможно общие Tailwind-компоненты (shadcn/ui), если такие имеются.

## Подключение в Apps:
Все пакеты должны быть добавлены как workspace-зависимости, например: `"@borsch/ui": "workspace:*"` в `apps/backoffice/package.json`.
