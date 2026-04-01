# Borsch Shop

Новая чистая структура проекта после рефакторинга и полного перехода на Offline-First (Tauri + SQLite) и PocketBase. Мы используем монорепозиторий (Turborepo).

## Структура папок (Строгая)

```text
borsch-shop/
├── apps/
│   ├── backoffice/  # Tauri + React приложение (Рабочее место повара/админа)
│   │   ├── src-tauri/ # Rust бекенд и плагины (SQLite, SyncEngine)
│   │   └── src/       # Zustand сторы, компоненты Tailwind, локальные запросы
│   ├── landing/       # Старый Next.js сайт (возможно deprecated)
│   └── storefront/    # Новый Next.js (App Router) проект витрины для клиентов
├── backend/           # Облачный PocketBase (pb_hooks)
├── packages/          # Разделяемые библиотеки для монорепозитория
├── docs/              # Архитектурные графы (Mermaid), описания и спеки
│   └── sprints/       # История спринтов и TODO
├── GEMINI.md          # Ключевой файл ИИ: правила проекта, стек, история
└── README.md          # Этот файл
```

## Разработка

Проект использует `pnpm` workspace и `turbo`.
- **Запуск админки**: `cd apps/backoffice && npm run tauri dev`
- **Запуск витрины**: `cd apps/storefront && npm run dev`
