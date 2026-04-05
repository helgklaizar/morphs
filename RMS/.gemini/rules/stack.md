# АРХИТЕКТУРА И СТЕК
### **Frontend**
- **Next.js 15 (App Router):** Весь интерфейс. `apps/landing` — витрина (лендинг) для клиентов (собирается как standalone `.next/standalone`, работает на GCE через PM2 на 3001 порту, старый docker отключен). `apps/backoffice` — админ-панель.
- **Tailwind CSS + Shadcn UI:** Стилизация.
- **Lucide React:** Иконки.
- **Zustand:** Глобальный стейт-менеджмент (`apps/backoffice/src/store/`).

### **Desktop Shell**
- **Tauri 2.0:** Обертка над вебом для создания нативного приложения macOS. 
- **Output:** `export` (Static Site Generation), так как Tauri не поддерживает динамический SSR.

### **Data Flow (Важно)**
1. **Repositories:** Вся логика запросов к БД вынесена в `lib/repositories/`. **НИКОГДА** не делай запросы `pb.collection...` напрямую из компонентов или сторов. Используй существующие репозитории (например, `OrdersRepository.fetchAll()`).
2. **Stores:** Сторы вызывают репозитории, получают данные и обновляют UI.
3. **Real-time:** Используется механизм `pb.collection().subscribe('*', ...)` для живого обновления заказов в админке без перезагрузки.
