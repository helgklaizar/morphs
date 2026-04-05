# RMS AI OS — План Системного Рефакторинга (Iteration 1)

## Цель
Переход от монолитных «роут-зависимых» компонентов к **Clean Architecture** в рамках монорепозитория. 
Вынос общей логики из `apps/backoffice` в `packages/` для обеспечения стабильности и переиспользуемости.

---

## 🏗 Архитектурные слои (Target)

### 1. Domain (`packages/types`)
- Чистые интерфейсы и типы данных (TypeScript).
- Отсутствие зависимости от фреймворков и БД.
- *Задачи*: Собрать все типы (Menu, Order, User) из приложений в единый пакет.

### 2. Infrastructure (`packages/api`) — **NEW**
- Типизированный клиент PocketBase.
- Мапперы данных (из БД в Domain-типы).
- Обработка ошибок и логгирование.

### 3. Application (`packages/services`) — **NEW**
- Бизнес-логика (Use Cases).
- Пример: `MenuService.calcPriceWithTax()`, `OrderService.validateStatus()`.
- Стейт-менеджмент (Zustand stores), переиспользуемый между приложениями.

---

## 🚀 План по Модулям

### Модуль: Меню (Menu)
- [ ] **Domain**: Перенести `MenuItem`, `Category`, `Modifier` из `backoffice` в `packages/types`.
- [ ] **Infrastructure**: Описать `MenuRepository` в `packages/api` для работы с PocketBase.
- [ ] **Application**: Создать `useMenuStore` в `packages/services` (Zustand).
- [ ] **UI**: Перевести `apps/backoffice/src/app/(protected)/menu` на использование внешних сервисов.

### Модуль: Заказы (Orders)
- [ ] **Domain**: Описать `Order`, `OrderItem`, `OrderStatus` в общих типах.
- [ ] **Infrastructure**: Реализовать Real-time подписки на заказы в `packages/api`.
- [ ] **Application**: Вынести логику расчета итогов и статусов в `OrderController` / `OrderService`.
- [ ] **UI**: Очистить компоненты в `backoffice/src/app/(protected)/orders` от прямой работы с API.

---

## 🛠 Технический Долг (Fix first)
- [ ] **Unified UI**: Проверить `packages/ui` на наличие дублей компонентов (Buttons, Modals).
- [ ] **Common Logic**: Вынести `auth-hooks` и `middleware` в общий пакет или `shared` директорию.
- [ ] **Linting**: Настроить жесткие правила ESLint для запрета импортов из `app/*` внутрь `packages/*`.

---

## 📅 Итерации
1. **Итерация 1**: Скелет `packages/api` и `packages/services` + полный перенос типов (Domain).
2. **Итерация 2**: Рефакторинг модуля **Меню** (Backend + Frontend).
3. **Итерация 3**: Рефакторинг модуля **Заказы** (Realtime + Logic).
