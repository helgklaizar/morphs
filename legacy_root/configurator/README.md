# Configurator (Tauri Frontend)

Пользовательский интерфейс и десктопное приложение для управления проектом Morphs. Графический интерфейс для управления сборками, подключением модулей и локальной архитектурой.

## Стек
- Tauri (Rust + Webview)
- React, TypeScript
- Vite
- TailwindCSS и PostCSS (Glassmorphism-стилистика)

## Запуск для разработки
В корне `configurator/`:
```bash
npm install
npx tauri dev
```
Горячая перезагрузка (HMR) включена через Vite, что позволяет `UI-Morph` менять файлы (например, `src/components/GeneratedModule.tsx`), и интерфейс сразу обновится.
