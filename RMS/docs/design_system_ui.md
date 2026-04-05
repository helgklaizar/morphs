# User Interface (UI) и Design System

В данном документе описана визуальная система (Design System) админки RMS AI OS, ее компоненты и стилевые решения. Приложение построено на `React`, стилизуется через `Tailwind CSS`, иконки предоставляются `lucide-react`.

## 1. Цветовая палитра (Dark Mode Only)
Интерфейс спроектирован исключительно в темной теме (Dark Mode), так как экраны на кухне или кассе часто используются в условиях с меняющимся освещением, а темный интерфейс меньше утомляет глаза сотрудников в течение 12-часовой смены.

**Ключевые цвета (Tailwind utilities):**
- **Background (Фон):** `#1a1a1a` (модальные окна), `#242424` (инпуты), `bg-black/60` (оверлей).
- **Primary (Акцентный/Бренд):** Оранжевый `orange-500` (кнопки "Сохранить", активные табы). Используется для главных действий (Call to Action).
- **Secondary (Второстепенный):** Синий `blue-500` (Для элементов сборок или альтернативных акцентов).
- **Destructive (Деструктивный):** Красный `red-400` / `red-500` (Удаление, критические ошибки, кнопка корзины).
- **Text (Текст):** 
  - Основной: `text-white`
  - Второстепенный (Label, hint): `text-white/50`, `text-white/40`
  - Разделители (Бордеры): `border-white/5`, `border-white/10`

## 2. Типографика
Шрифты контролируются Tailwind (`font-sans`), используется стандартный системный стек (Inter/San Francisco/Segoe UI).
- **Заголовки (H1-H2):** `text-2xl font-bold`, `text-xl font-bold` (Названия модалок, страниц).
- **Лейблы инпутов:** `text-xs text-white/50 mb-1 block` (Компактные подписи над полями ввода).
- **Основной текст инпутов:** `text-sm`
- **Микротекст (Подсказки):** `text-[10px]` или `text-[11px] text-white/40` (Для единиц измерения или вспомогательного текста, например, "₪/шт").

## 3. Модальные окна (Modals)
Вместо отдельного роутинга (перехода на новые страницы) редактирование всех сущностей вынесено в модальные окна. 
**UI-паттерн:**
- **Overlay:** `fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm` — Полупрозрачный фон с размытием (glassmorphism) привлекает 100% фокуса на окно.
- **Surface:** `bg-[#1a1a1a] rounded-2xl p-6 border border-white/10 shadow-2xl relative`. Скругленные углы 2xl (1rem) делают дизайн современным и безопасным (premium feel).
- **Animation:** `animate-in fade-in zoom-in duration-200` — Плавное появление (Fade-in + Zoom-in), окно не "выпрыгивает" резко.
- **Закрытие:** Крестик `lucide-react/X` в правом верхнем углу (`absolute top-4 right-4`). Закрытие также срабатывает при клике на оверлей (`onClick={(e) => e.target === e.currentTarget && onClose()}`).

## 4. Формы и Инпуты
**UI-паттерн Инпутов:**
```tsx
<input 
  className="w-full bg-[#242424] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 border border-white/5"
/>
```
- Слегка светлее фона окна (`#242424`).
- При фокусе (когда повар кликает) граница становится оранжевой (`focus:ring-orange-500`), давая четкую визуальную обратную связь.
- Угловые радиусы (`rounded-lg`) согласуются с кнопками.

## 5. Кнопки (Buttons)
Кнопки имеют стандартизированные отступы:
- **Primary:** `bg-orange-500 hover:bg-orange-600 font-bold text-white py-3 rounded-lg transition-colors`. Большая зона клика (`py-3`) для удобства работы пальцами (touch-friendly для планшетов).
- **Secondary (Отмена):** `bg-white/5 hover:bg-white/10 text-white/80`.
- **Icon Buttons (Удалить/Настройки):** `p-2 rounded-lg hover:bg-white/10 transition text-white/40 hover:text-white` (или `text-red-400 hover:bg-red-400/10` для удаления).

## 6. Иконки
Используется библиотека `lucide-react`. Иконки строго контурные (stroke), устанавливаются размеры `w-4 h-4` или `w-5 h-5` в зависимости от контекста.
  - `Plus` — Добавление.
  - `Settings` — Настройки или редактирование.
  - `Trash2` — Удаление.
  - `ArrowLeft` — Возврат назад (Например, в деталях поставщика).
  - `Box`, `ShoppingCart` — Пустые состояния (Empty states).

## 7. Карточки (Cards)
В списках (Меню, Склад) элементы рендерятся в виде карточек:
`bg-[#1C1C1C] rounded-2xl p-4 border border-white/5 hover:border-white/20 transition`
Легкое изменение бордера при наведении (реактивность интерфейса). Карточки используют `flex` или `grid` для ровного выравнивания колонок.
