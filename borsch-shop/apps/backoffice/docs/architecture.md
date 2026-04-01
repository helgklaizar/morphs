# Архитектура Backoffice (Borsch Shop)

Десктопная админ-панель для кухни, которая заменяет старое Flutter-приложение для macOS.
Использует Next.js в режиме Static Site Generation (`output: 'export'`). Приложение собирается в статику и крутится внутри WebView через Tauri.
Сохраняет нативный интерфейс и доступ к файловой системе macOS/глобальным шорткатам, имея UI на React.
Связь с базой данных (Supabase) идет напрямую (Direct API requests & Realtime Channels).

## Ключевые решения
1. **Единый стиль:** Компоненты UI разрабатываются на `shadcn-ui`.
2. **Реалтайм подписки:** Обновления заказов (Kanban) происходят исключительно через `supabase.channel()` (Realtime Postgres).
