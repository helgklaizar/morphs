# Borsch Shop Storefront

## Стек
- Frontend: Next.js (App Router), React 19
- Стили: Tailwind CSS
- Деплой: Vercel / Nginx (`basePath: '/new'`)
- Бэкенд: Supabase (PostgreSQL)

## Запуск
Для запуска копии проекта локально на порту 3000:
```bash
npm run dev
```

Локальный доступ будет по адресу `http://localhost:3000/new`.

## Архитектура
Новая PWA витрина магазина Borsch Shop. Отделена от Flutter-админки для идеального SEO и мгновенной загрузки (< 1s). 
Работает параллельно с Flutter, связываясь с той же базой данных. В будущем заменит текущий Flutter-клиент.

## Ключевые решения
- Интеграция с существующей базой `borsch-shop` (Supabase).
- Использование Server-Side Rendering (SSR) через Next.js.
- `basePath` установлен в `/new` для совместной работы на одном домене.

## Что делали последним (21.03.2026)
- **Инициализация:** Создан чистый Next.js проект со стандартными настройками. Добавлен `basePath: '/new'` в `next.config.ts`.
