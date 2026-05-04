# REST API (Core Mind)

## Базовый URL
`http://localhost:8000`

## Middleware
- **CORS** включен (`allow_origins=["*"]`), что позволяет запросы из Tauri.

## Роуты

### 1. Генерация UI Компонента
- **URL**: `/api/v1/generate`
- **Метод**: `POST`
- **Описание**: Запускает `UI-Morph` (на базе Llama-3) в фоновом процессе (BackgroundTasks). Агент пишет React-компонент на основе типа бизнеса и нужных модулей, и сохраняет код прямо в `../configurator/src/components/GeneratedModule.tsx` для автоматического HMR в Tauri-окне.

**Тело запроса**:
```json
{
  "business_type": "string",  // Описание бизнеса (напр., 'Coffee Shop')
  "modules": ["string"]       // Массив модулей (напр., ['Статистика', 'Профиль'])
}
```

**Ответ** (Возвращается мгновенно):
```json
{
  "status": "accepted",
  "message": "UI-Morph is writing code."
}
```

## База данных SQLite (`db.py` API)

- **Расположение**: `morphs_system.db` в корне проекта.
- **Таблицы**:
  - `business_profile`: Таблица профиля (Free vs PRO уровень).
    - `id` (TEXT, Primary)
    - `business_name` (TEXT)
    - `tier` (TEXT, check: 'free' / 'pro')
    - `telegram_chat_id` (TEXT)
- **Функции приложения (Python)**:
  - `init_db()`: инициализирует таблицу из `schema.sql` и добавляет демо-профиль.
  - `get_profile()`: Возвращает текущий активный профиль бизнеса в виде словаря.
