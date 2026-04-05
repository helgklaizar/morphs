# Backoffice (RMS AI OS) — Индекс проекта

## 📌 Суть и Стек
- **Что это:** Новая десктоп-админка для мака (взамен старой на Flutter).
- **Стек:** Next.js (App Router), React, TypeScript, Tailwind CSS, Shadcn UI, Tauri v2, Zustand, Supabase.

## 🛑 КРИТИЧЕСКИЕ ОГРАНИЧЕНИЯ (Красные флаги)
- **SSG-only (Client-side rendering):** Серверный рендеринг (SSR) Next.js не используется. Вся логика — на клиенте.
- **Только Tauri API:** Для работы с операционкой (файлы, уведомления) использовать ТОЛЬКО `@tauri-apps/api`, а не Node.js API (fs и т.д.).

## 🚀 Деплой и Среда (Где мы находимся)
- **Local:** `npm run tauri dev`

## 📚 Навигация по документации
- 🏗 **Архитектура:** `docs/architecture.md`
- 📦 **Деплой:** `docs/deploy.md`
- 📅 **Активный спринт:** `docs/sprints/week-2.md`
