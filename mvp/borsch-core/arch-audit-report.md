# Архитектурный Аудит (Borsch Core MVP)

> **Статус аудита**: РЕШЕНО (Апрель 2026) ✅
> Все найденные проблемы были устранены в ходе глобального рефакторинга (реструктуризация Core и Лендинга).

## 1. Проблематика (Bottlenecks & Pain Points)

В ходе сканирования монорепозитория (Turborepo + pnpm) `apps/backoffice`, `apps/landing` и `packages/core` были выявлены следующие архитектурные проблемы:

### ✅ Проблема 1: "Призрачный код" и Нарушение границ (God Objects) -> [РЕШЕНО]
**Было:** В проекте оставались "хвосты" AI-помощника в `packages/core` и старый код в `apps/backoffice`.
**Стало:** Старый Backoffice замещен на `apps/backoffice-vite`. Мусорные сторы (`useAiStore`, `useAiSettingsStore`, `useInventoryStore`, `useRecipesStore`) удалены из репозитория. Принцип единой ответственности восстановлен.

### ✅ Проблема 2: Монолитные UI-компоненты (Landing) -> [РЕШЕНО]
**Было:** Файл `apps/landing/src/components/LandingClient.tsx` был раздут до ~550 строк (34KB) и выполнял роль God Component.
**Стало:** Выполнен FSD рефакторинг. Логика разделена на:
- `WidgetHero` (`Hero.tsx`)
- `WidgetHeader` (`Header.tsx` с модалкой языков)
- `EntityProduct` (`ProductCard.tsx` с логикой корзины и счетчиками)
Размер `LandingClient.tsx` сократился втрое. Перерендеры изолированы.

### ✅ Проблема 3: Плоская структура Core / Состояние зависимостей -> [РЕШЕНО]
**Было:** В `packages/core/src` все stores и api были свалены в плоскость (`src/api`, `src/store`).
**Стало:** Внедрен `Domain-Driven Pruning`. Структура пересобрана:
- `packages/core/src/domains/orders/`
- `packages/core/src/domains/menu/`
- `packages/core/src/domains/inventory/`
- `packages/core/src/domains/cart/`
- `packages/core/src/domains/system/`
Экспорты пробрасываются через единый `packages/core/src/index.ts`, поэтому зависимости проектов (`backoffice-vite`, `landing`) не были сломаны.

---

## 2. Диаграммы (Mermaid)

### Целевое состояние ДОСТИГНУТО (Feature-Sliced Design + Domain Driven Pruning)

```mermaid
graph TD
    subgraph Landing App
        Page[Page]
        Page --> WidgetHero[Widget: Hero Banner]
        Page --> WidgetHeader[Widget: Header]
        Page --> WidgetMenu[Widget: Menu Layout]
        WidgetMenu --> EntityProduct[Entity: Product Card]
    end
    
    subgraph Backoffice Vite App
        BO_Clean((Backoffice: Pos / Orders / Menu))
    end
    
    subgraph Core Packages (Domains)
        DomainOrders[Domain: Orders Store & API]
        DomainCatalog[Domain: Menu & Recipes]
        DomainInventory[Domain: Inventory]
        DomainSystem[Domain: UI Stores]
        DomainOrders --> BO_Clean
        DomainCatalog --> Landing App
        DomainOrders --> Landing App
    end
```

---

## 3. Целевой паттерн: FSD (Feature-Sliced Design) + Domain-Driven Pruning
- ✅ Слой `entities`: Сущности (ProductCard).
- ✅ Слой `widgets`: Изолированные блоки (Header, Hero).
- ✅ Домены: Строгое разделение API и логики (`@rms/core/domains/*`).
- ✅ Чистка (Pruning): Полное удаление старых API файлов и сторов.
