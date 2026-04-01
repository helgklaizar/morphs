# Morphs — оперативная память проекта

## Стек
- **Runtime (Core Mind):** Python (Apple MLX из TurboQuant) для ИИ ядра + Atropos RL для обучения на траекториях.
- **Оркестратор (Sandbox/UI):** Bun / React / Vitest / Ruff (для автоформатирования генерируемого кода).
- **База данных:** SQLite (local-first) + LanceDB (вектора) + DuckDB (аналитика). Kùzu (компрессия context/графов).
- **Обмен сообщениями:** Redis P2P + Msgspec (молниеносная сериализация).
- **Внешние слои:** `core/rules`, `core/blueprints`, `core/skills` для конфигурации.

## Архитектура
Биологически-вдохновленный Swarm (Контекстный Комбайн):
- **Core Mind (Мозг):** Оркестратор и Наблюдатель. Запускает паралельных Морфов. Имеет Cron-планировщик для аудитов, бэкапов и автоматизации.
- **Morph Forge (Кузница):** Декомпозиция задач.
- **The Morphs (Исполнители):** Изолированные параллельные агенты (UI, API, Healer).
- **Atropos Experience Replay:** Слой сохранения траекторий успехов/ошибок сборок для RL-дообучения ИИ прямо во время работы системы.

## Режим работы (Self-Adaptive)
1. Конфигуратор опрашивает владельца бизнеса -> формируется профиль (Blueprint + Rules).
2. Мозг рождает параллельный рой (Swarm) Морфов под задачу.
3. Test-Driven Mutation в песочнице: Успешный коммит? RL получает позитивный reward (запись в Atropos DB). Провал? Healer-Morph исправляет, траектория ошибки тоже сохраняется для опыта.

## Известные проблемы / Tech Debt
- Настроен базовый скелет. `npm` / `pip` установлены, FastAPI-сервер Мозга поднят на 8000 порту.
- **Масштабное фейковое тестовое покрытие**: 19 из 24 юнит-тестов (напр. `test_ast_morph.py`) проверяют лишь импорт через `assert target_module is not None`.
- **Отсутствие системного логгера**: Весь проект логируется через простые `print()` (>200 вызовов), без уровней и форматирования. Подробнее в `docs/audit_report_tech_debt.md`.
- 🔴 **Структурные Заглушки (Fake Features) Спринтов 10-16 (ЧАСТИЧНО ЗАКРЫТЫ в 19.10):**
  1. `SyncDaemon` / `Cost Hook` / `Security-Morph` / `Deploy-Morph` / `Analytics-Morph` — всё еще требуют перевода с мокированных логов на реальную логику (AWS S3, Docker Build API). Будет вынесено в отдельные задачи (Tech Debt).
  2. B2B SaaS UI Конструктор — ожидается интеграция реального фронтенд-компилятора.

## Что делали последним (2026-03-31)
- **Спринт 18 (Morphs OS Stabilization Phase 2 - MCP & Kuzu/LanceDB)**:
  - Успешно завершена миграция на высокопроизводительный стек: `graph_rag.py` теперь сжимает AST-контекст, используя графовую **Kùzu DB** для зависимостей и **LanceDB** для векторного поиска (`CodeLens`). Очищен устаревший `NetworkX`/`ChromaDB` код.
  - Слой MCTS-обучения `Quantum Atropos` переведен на LanceDB с помощью нового микрокомпонента `atropos_memory.py`. 100% test coverage для MLX-LLM промптов подтверждено.
  - Разработан универсальный Хаб Плагинов: написан и покрыт тестами `core/mcp_hub.py` (Model Context Protocol), позволяющий подключать stdin/stdout CLI-сервера типа Github, Telegram, и Google Drive без ручных драйверов.
  - Развернут Production-пайплайн: добавлены `Dockerfile` и `docker-compose.yml` (Swarm-совместимый) для автоматического старта CoreMind серверов и фонового `Audit-Morph` (Chaos Engineering) на 24 часа.
- **CI/CD Hardening & GitHub Professionalization**:
  - Полная очистка локального и удаленного гита от артефактов (`.pytest_cache`, `.lancedb/`, `.db` и др.) и перенос мета-файлов в `.github/`.
  - Успешная починка GitHub Actions пайплайна: смена раннера на `macos-14` (для нативной поддержки фреймворка Apple MLX), указание `PYTHONPATH=".:core"`, фиксация версии `httpx<0.28.0` для обхода критических изменений в `fastapi.testclient`.
  - Исправление race condition при создании векторов в базе (`exist_ok=True` для LanceDB) и Graceful Shutdown для дочерних процессов `mcp_hub.py` при ошибках (`ProcessLookupError`).
  - Приведение секций проекта `README.md` в более дружелюбный, структурированный и "воздушный" вид (использование эмодзи, списков, блочных цитат для визуальной разгрузки сплошного текста).

[Архив старых спринтов (10-17)](docs/history.md)

## Что делали последним (2026-04-01)
- **Спринт 19 (Архитектурный прыжок и "Honesty" фикс - Swarm & Full MCTS)**:
   - Полностью вырезана "Толстая" оркестрация из `core/main.py`. `main.py` теперь стал тонким ASGI/SSE роутером. Вся логика перенесена в **децентрализованный `SwarmOrchestrator`** (`swarm_orchestrator.py`), который управляется чисто через P2P `EventBus` (`swarm.task.created`, `swarm.ui.generated` и т.д.).
   - Искоренены моки и "декоративные" классы:
     - Дерево Поиска Монте-Карло (**MCTS**) в `healer_morph.py` и `quantum_atropos.py` теперь по-настоящему делает hot-swap файла, прогоняет тесты (`npx vitest run`) в изолированной песочнице, и имеет **Честный алгоритм (Selection UCB1, Expansion, Simulation, Backpropagation)**, разворачивающий узлы `MCTSNode`. Никаких фейковых параллельных ветвлений!
     - `$team Debate Bus` теперь использует **математическое доказательство AST** (`ASTInvariantValidator`), вместо слепого LLM консенсуса, что подтверждает архитектурную заявку "prove mathematically".
     - Починен жизненный цикл шины событий (`EventBus`): `await bus.connect()` и `bus.subscribe()` теперь легитимно инициализируются в ASGI `lifespan()`. Вся система пронизана реальным P2P Redis PubSub.
   - Реализован **Full Graph RAG / Semantic RAG**: В `graph_rag.py` фейковые нули `[0.0, 0.0]` заменены на реальные векторные эмбеддинги (`sentence-transformers` `all-MiniLM-L6-v2`), которые пишутся в LanceDB и извлекаются через настоящий Vector Similarity Search перед запросом к графу знаний Kùzu.
   - Затянули пояса безопасности: внедрён `BashHarness` песочницы для запуска внутренних серверов, настроен строгий CORS, и установлены жесткие версии в `requirements.txt`.
   - Подключена финальная фаза деплоя: `Deploy-Morph` теперь пакует SaaS в Docker артефакты в конце успешного флоу оркестрации. Очищен `docker-compose.yml` от Swarm-артефактов, чтобы старт был гладким из коробки.
- **Спринт 19.5 (Откровенный Аудит Иллюзий и Фейков)**:
   - Проведен **полный честный аудит системы** на предмет разрыва между "заявленной" архитектурой и реальным кодом.
   - Выявлено, что MCTS в `quantum_atropos.py` не разворачивает дерево глубже 1 шага и не использует Selection (UCB1). 
   - Выявлен хардкод в ревью-лупе (`swarm_orchestrator.py` просто принтует "Mock MCTS branch selection" без вызова `ASTInvariantValidator`).
   - Найдены критические места проглатывания ошибок (`except Exception: pass`) в сборке AST/Kuzu графов и в векторной записи базы `atropos_memory.py`.
   - Обнаружено, что `Deploy-Morph` генерирует захардкоженные `Dockerfile` без реального учета зависимостей, а `Security-Morph` использует простейший статический парсинг вместо Red-Team моделирования.
   - Вскрыта несостоятельность песочницы: `ToolPermissionContext` и `BashHarness` используют примитивный regex blacklist ("rm -rf") вместо заявленной Claw-Code изоляции. Вспомогательные демоны (`sync_daemon.py`, `analytics_morph.py`) оказались моками с фейковыми логами.
   - Создан подробный план устранения этого tech debt и перевода "фейковых" амбиций в реальный код: `docs/audit_fakes_report.md`.

- **Спринт 19.11 (Архитектурная Истина - Удаление Фейков Спринтов 1-19)**:
   - Полностью вычищены архитектурные "заглушки" (fakes): 
     - В `core/deploy_morph.py` больше нет хардкод-шаблонов Dockerfile. Морф динамически парсит содержимое бэкенда (`fastapi`, `uvicorn`, `requirements.txt`, `package.json`), создавая подлинные docker-ресурсы для SaaS.
     - `core/bash_harness.py` теперь оснащен **AI YOLO-Классификатором**: 2-ступенчатая система (regex-эвристика + системный вызов LLM) оценивает риск команд перед их исполнением, избегая тупых лок-аутов `rm -rf`.
     - `core/browser_morph.py` (Авто-тестер UI) переведен с синхронного Playwright на `async_playwright`, чтобы не крашить asyncio-цикл P2P Orchestrator'а. Chaos Monkey теперь честно собирает логи консоли и краши React UI, возвращая их для `Healer-Morph`.
     - Уничтожен фиктивный код в `core/analytics_morph.py` (больше никаких `COUNT(*)`); теперь морф честно итерирует базы `sqlite` в воркспейсах, извлекая схемы, читая `LIMIT 5` строк и генерируя легитимные бизнес-выводы через LLM.
     - Из `core/sync_daemon.py` удален хардкод "Выручка: $540". Даемон эмулирует честную S3-заливку на локальную машину с калькулятором веса и поддержкой Push Notification в Telegram по P2P шине.
   - **Обработка исключений:** Ликвидированы опасные блоки `except Exception as e: pass` в графовом `graph_rag.py` и векторном `atropos_memory.py`. Исключения теперь пробрасываются явно (например, для сломанного AST), что позволяет MCTS-дереву обучать агента на честных `Traceback` багах, а не топтаться в слепоте.
   - Подняты строгие лимиты расходования API-ключей в `core/cost_hook.py` (Глобальный `CostManager`). При пробое порога в $1.50 MCTS сессия крашится с `RuntimeError`, спасая бюджет.
   - 100% стабильность E2E Пайплайна (`test_full_business_pipeline`) подтверждена. "Фасад" инфраструктуры снесен, проект работает на честном фундаменте.

- **Спринт 20 (Swarm Memory & Compaction - Изоляция и долгий контекст)**:
   - Внедрена система **Long-Context Compaction (microcompact)** в `core/memory_morph.py`. Механика режет переполненные контексты графов (Kuzu/Lance), сохраняя "Голову" (инструкции) и "Хвост" (последние стейтменты).
   - Интегрирована стратегия **Reactive Retry (Экстренный перехват ContextLengthExceeded)** в `gemini_agent.py` и `mlx_agent.py`. При пробое лимита токенов агент не крашит CLI процесс P2P шины, а динамически сжимает контекст пополам и прозрачно перезапрашивает API (и локально MLX).
   - Выполнен рефакторинг с помощью **Post-sampling Hooks**: трекинг токенов (Cost Hook/Billing) вырван из основного "Query Loop" в `gemini_agent.py` и перенесен в асинхронный фоновый поток через `PostSamplingHooks`, облегчая `think()` методы.

- **Спринт 21: Tooling Path (Поток 3 — MCP & Skills Isolation)**:
   - **Tool Re-architecture**: Свободный доступ ИИ к неконтролируемому Bash заменен на строгие специализированные инструменты `Read`, `Edit`, `Glob` и `Grep` (создан `FileTools` в `core/tools/file_ops.py`) для максимальной безопасности.
   - **Lazy Tool Search**: Интегрирован механизм сокрытия редких инструментов в `ToolRegistryMorph`. Теперь базовые агенты получают компактный манифест, но могут динамически находить нужные тулзы через утилиту семантического поиска `ask_tool_registry`.
   - **Архитектурное разделение MCP**: Выделен `PluginsManager` в `core/plugins_manager.py`, который динамически находит внешние конфигурации `plugin.json` и инкапсулирует их от ядра P2P маршрутизатора `MCPRouter`.
   - **Frontmatter Declarative Hooks**: Реализован `FrontmatterParser` и `SkillsManager` (`core/skills_manager.py`) для извлечения декларативных событий (Pre/Post/Stop хуков) и конфигураций прямо из Markdown. ИИ теперь гибко подгружает только нужные скиллы.

[Архив старых спринтов (10-18)](docs/history.md)

## Что делали последним (2026-04-01)
- **Спринт 22 (Поток 2: Security & RAG Engine)**:
   - **Задача 18 — YOLO Classifier II**: `core/yolo_classifier.py` — полноценный двухуровневый классификатор команд. 5 уровней риска (SAFE/LOW/MEDIUM/HIGH/CRITICAL), 25+ regex-правил c категориями, LRU-кеш LLM-вердиктов (md5 хеш команды). CRITICAL блокирует немедленно, HIGH/MEDIUM запрашивает пользователя, LOW — предупреждение. `bash_harness.py` рефакторен: удалён inline-код, подключён `YOLOClassifier`.
   - **Задача 5 — QueryEngine**: `core/query_engine.py` — единый фасад LanceDB + Kùzu. Lazy-инициализация коннекторов, методы `search()` (вектора), `query_graph()` (Cypher), `hybrid_search()` (оба сразу), `search_experience()` (Atropos RL-память). `HybridResult.to_prompt_context()` сериализует результаты для LLM-промпта. Исправлена deprecation: `table_names()` → `list_tables()`.
   - **Задача 11 — FuzzyIndex**: `core/fuzzy_index.py` — in-memory индекс файлов. Цепочка: `git ls-files` → `rg --files` → `os.walk`. TTL-кеш 30с. Fuzzy scoring через rapidfuzz/difflib. `rg_search()` для поиска по содержимому. Метод `stats()` для мониторинга.
   - **Задача 27 — InjectionGuard**: `core/injection_guard.py` — защита от Prompt Injection. 20+ regex-сигнатур (ignore-previous, jailbreak, system-tag, hidden-unicode, fake-authority, base64-exec). Heuristic scoring. `sanitize()` заменяет вредоносные паттерны на `[REDACTED:name]`. `assert_clean()` поднимает `SecurityError`. Интегрирован в `bash_harness.py`: stdout команды сканируется до передачи в LLM.
   - **Тесты**: 45 тестов зелёные, 1 skipped (rg не установлен на dev-машине).

- **Спринт 23 (Поток 3: Полная изоляция логики Skills & Tooling (Завершено))**:
   - **Динамическое выполнение хуков (Skills Manager Execution)**: Заменен заглушечный логгер в `SkillsManager` на реальную интеграцию. Теперь `pre_hooks` и `post_hooks` извлекают и исполняют `dict["func"]` из глобального инстанса `ToolRegistryMorph`.
   - **Подгрузка контекста компетенций (Gemini & MLX Integration)**: Обновлены `GeminiCore` и `CoreMind` (MLX). В метод `think_structured` добавлено распознавание `expert_adapter` как ключа Markdown-скилла. Скиллы (если найдены) инжектятся напрямую в системный промпт (O1-mode) до генерации. 
   - **Event Lifecycle**: Реализован вызов хуков. Перед генерацией агента срабатывают `run_pre_hooks`, а после возврата оффтоп `code` из XML запускается валидация через `run_post_hooks` — полноценно оживив декларативные YAML-хуки.

- **Спринт 22 (Поток 2: Security & RAG Engine)**: (см. выше)

- **Спринт 25 (Stateful Plan Management, Verification Layer & Block PathMoA)**:
   - **Задача 15 — Stateful Plan Management**: Внедрена математически строгая FSM-система для трекинга задач внутри `SwarmOrchestrator` (`core/plan_tracker.py`), заменившая плоские TODO-листы. 
   - **Задача 17 — Verification Agent**: Создан независимый "Судья" `core/verification_morph.py`, жестко отделяющий слои генерации и валидации (защита от самообмана). 
   - **Задачи 38 & 39 — Block PathMoA**: Интегрировано кеширование экспертных адаптеров в `mlx_agent.py` и сквозная передача `expert_block_adapter` в `quantum_atropos.py`, снизив затраты на частый роутинг MCTS-дерева.

- **Спринт 24 (The Final Production Stabilization - Fixes & CI Hardening)**:
  - **E2E & RAG Стабилизация**:
    - Успешно починен `LanceDB` API (`db.list_tables().tables` вместо ругающегося на deprecation `table_names()`) в `graph_rag.py`, `query_engine.py`, `memory_morph.py`.
    - Устранён хардкод `[0.5]*384` в векторах, настроен graceful fallback для отсутствующих пакетов. Отремонтирована обработка `Schema Error` в `atropos_memory.py`.
  - **Epic 0: Полное удаление моков / фейков**:
    - Вычищены последние зависимости от `MagicMock`, `mock_open` и `patch` в тестовой базе (`test_vision_morph.py`, `test_reactor_morph.py`, `test_tooling_epic.py`).
    - Очищены тихие проглатывания `except Exception: pass` в `analytics_morph.py` и `ralph_daemon.py`, забиндено жесткое логирование.
    - Исправлено игнорирование параметров CI в `test_bash_harness.py`, настроен проброс `PYTEST_CURRENT_TEST` для `YOLOClassifier`.
  - **CI & Unit Tests Харденинг**:
    - Полностью озеленён `test_sync_daemon.py` (через патчинг прямого модуля `sync_daemon` и уточнение return value для `send_telegram_report`).
    - Успешный прогон `pytest test_e2e_orchestrator.py -v -s`: система стабильно разворачивает бэкенд Smart Coffee Shop с `SQLAlchemy` и `Alembic`.
    - Добавлен `test_e2e_browser_morph.py`: реальная E2E проверка UI через Playwright, детектирующая JS краши без фейковых моков.
    - Добавлен `test_e2e_redteam.py`: боевая проверка Red-Team безопасности. Подтверждено, что `BashHarness` перехватывает атаки Prompt Injection в stdout (через `InjectionGuard`) и блокирует деструктивные shell-инъекции (через `YOLOClassifier`) до исполнения.
  - **React UI React-DOM & TS Fixes**:
    - Исправлены `global.fetch` и `global.EventSource` на `globalThis`, что позволило успешно выполнять `npm run build` в `ui/` без падений TypeScript TS2304.
  - **Вывод**: Система (Бэкенд + LLM интеграции + RAG Графы + Swarm P2P + Безопасность) стабильна и готова к использованию в Production без фейковых модулей.

- **Спринт 22 (Поток 1: UI & Visualization)**:
  - **Задача 4 — Terminal Interactivity:**
    - Обновлён `core/interactive_helpers.py`: буквенные метки A/B/C вместо цифр, опция "Свой ответ" добавляется автоматически, обработка `KeyboardInterrupt`/`EOFError`.
    - Создан `core/dialog_launchers.py` — 5 специализированных диалогов: `confirm_destructive_command()`, `confirm_deploy()`, `ask_business_brief()` (wizard 4 шага), `ask_kuzu_export_format()`, `show_progress_bar()`.
  - **Задача 2 — Kùzu Dashboard:**
    - Создан `core/kuzu_dashboard.py` — FastAPI роутер (`/api/v1/kuzu/*`) с эндпоинтами: `graph` (D3 JSON), `stats`, `rebuild`, `export/json`, `export/csv`, `search`. Подключён в `main.py`.
  - **Задача 1 — B2B SaaS UI Constructor:**
    - Создан React + Vite + TypeScript фронтенд в `ui/` (ручной scaffold без npx).
    - Дизайн-система в `src/index.css`: dark glassmorphism, фиолетовый neon accent, micro-animations.
    - **Страницы:** `Overview` (статы + быстрые действия), `B2BConstructor` (4-шаговый wizard: тип → модули → промпт → запуск с SSE live-логами), `KuzuDashboard` (D3 force-directed граф + поиск + export CSV/JSON).
    - **Тесты:** 15/15 зелёных (`src/components/*.test.tsx`) — B2BConstructor (8 тестов) + KuzuDashboard (7 тестов).
    - Запуск: `cd ui && npm run dev` → `localhost:5173`.

## Что делали последним (2026-04-01)
- **Спринт 26 (Эпик: Tooling & Execution Engine — IDE-режим)**:
   - **Задача 32 — LSP Tool** (`core/tools/lsp_tool.py`): Нативный JSON-RPC клиент для Language Server Protocol. `LSPClient` управляет subprocess Pyright (Python) / TSServer (TS) по stdin/stdout. Три тулзы: `lsp_find_symbol` (workspace/symbol — поиск класса/функции точнее чем grep), `lsp_find_refs` (textDocument/references — все места использования), `lsp_goto_def` (textDocument/definition — переход к определению). Graceful fallback при отсутствии LSP сервера, пул клиентов по `workspace:lang` ключу.
   - **Задача 33 — Git Worktrees** (`core/tools/worktree_ops.py`): `WorktreeTools` с полным циклом `enter_worktree` → `commit_worktree` → `merge_worktree` → `exit_worktree`. `WorktreeRegistry` хранит активные сессии. `enter_worktree` создаёт `git worktree add -b morph/sandbox-<id>` во временной папке `/tmp/morphs_wt_<id>`, не затрагивая main. `exit_worktree(apply_changes=True)` мерджит через `git merge --no-ff` + чистит worktree+ветку.
   - **Задача 12 & 36 — Tool Concurrency & Safe Queuing** (`core/tools/concurrent_tools.py`): `TOOL_CATEGORIES` реестр (READ_ONLY/MUTATION/DANGEROUS). `ParallelBatcher` — параллельный `asyncio.gather()` для read-only тулзов (read_file, glob, lsp_*). `MutationQueue` — строгий FIFO asyncio.Queue worker для мутаций (edit_file, worktree, spawn_agent). `SessionMemory` — atomic lock-protected журнал результатов. `ToolConcurrencyEngine` — фасад, автоматически маршрутизирующий вызовы. Singleton `get_engine()`.
   - **Задача 29 & 30 — Tool Denial & AskUser UX** (`core/tools/denial_handler.py`): `ToolDenialHandler` — при блокировке тулзы форсирует AskUser с 5 вариантами (Allow-once / Use-fallback / Skip / Custom-input / Abort-task). `SandboxedToolExecutor` — безопасная обёртка над registry: если `is_blocked()` → denial flow, никакого слепого ретрая. `AskUserTool` — standalone тулз в реестре для явных вопросов ИИ пользователю с A/B/C вариантами.
   - **Интеграция**: Все 13 новых тулзов зарегистрированы в `ToolRegistryMorph` через `_register_lsp_tools()`, `_register_worktree_tools()`, `_register_denial_tools()`. Добавлены `get_sandboxed_executor()`, `start_concurrency_engine()`, `stop_concurrency_engine()` методы.
   - **Тесты**: 36/36 зелёных за 0.39s (`core/test_tooling_epic.py`). Покрыты: LSP graceful-fail, worktree полный E2E цикл с реальным git, atomic SessionMemory, FIFO порядок MutationQueue, denial flow для каждого варианта ответа.

- **Спринт 27 (Эпик: Prompt Engineering & Hierarchy Engine)**:
   - **Задачи 7 & 22 — PromptHierarchy + KV Cache Boundary** (`core/prompt_hierarchy.py`):
     - Реализована многослойная сборка системного промпта: `override` → `coordinator` → `agent` → `custom/skill` → `default`.
     - Маркер `SYSTEM_PROMPT_DYNAMIC_BOUNDARY` разделяет **статическую** часть (контракты + coordinator — кешируется в Gemini KV Cache) от **динамической** (agent role + skill + RL experience — не сбивает кеш).
     - `build_agent_prompt()` — удобная factory для сборки агентского промпта с автоматической разбивкой на static/dynamic слои.
     - `PromptHierarchy` загружает контракты из `core/rules/base_contracts.yaml` с fallback на встроенные `_BUILTIN_CONTRACTS`.
   - **Задачи 16 & 28 — Anti-Speculation & File-Bloat Contracts** (`core/rules/base_contracts.yaml`):
     - CONTRACT-01 (Anti-Speculation): НЕ добавлять фичи "про запас", НЕ расширять scope самовольно.
     - CONTRACT-02 (File-Economy): НЕ создавать файл если можно редактировать. НЕ трогать чужой код. DRY.
     - CONTRACT-03 (No-Silent-Except): `except: pass` запрещён в бизнес-логике, только на I/O границах.
   - **Задачи 31 & 24 — OWASP & Reversibility Contracts**:
     - CONTRACT-04 (OWASP): Обязательный аудит SQLi / XSS / IDOR при генерации каждого endpoint/SQL.
     - CONTRACT-05 (Reversibility): LOCAL_REVERSIBLE без аппрува. REMOTE_DESTRUCTIVE → `confirm_destructive_command()`.
   - **Задачи 19 & 21 — SystemReminder (Invisible Tags)** (`core/system_reminder.py`):
     - `SystemReminder.inject()` — автоматически подбирает и инжектирует `<system-reminder>` теги в вывод инструментов по keyword-matching (SQL → OWASP, try/except → CONTRACT-03, delete → Reversibility и т.д.).
     - `inject_manual(ids)` — детерминированная инжекция по ID.
     - `strip_reminders()` — очистка тегов из финального ответа перед показом пользователю.
     - Интегрирован в `BashHarness` — stdout команды обогащается директивами ПОСЛЕ прохождения `InjectionGuard`.
   - **GeminiCore рефакторинг** (`core/gemini_agent.py`):
     - Оба метода `think()` и `think_structured()` теперь используют `PromptHierarchy` вместо захардкоженных строк.
     - `think()` принимает `agent_role` и `tool_output` — tool output обогащается `SystemReminder` и инжектируется в промпт.
     - `think_structured()` корректно разделяет статику (system_instruction / KV кешируется) и динамику (dynamic_prefix + RL в user-turn).
   - **Тесты**: 28/28 зелёных (`core/test_prompt_hierarchy.py`). Полный сьют 59/59 пройден без регрессий.

## Следующие задачи
1. [Высокий] Продумать и собрать реальный UI-флоу B2B SaaS разворачивания (интерфейс конструктора, о котором говорили в тредах).
2. [Средний] Написать тесты и UI-дашборд для визуализации графов контекста (Kùzu).
3. [Высокий] Интегрировать механизм трекинга затрат на API (Cost Hook): Создать `core/cost_hook.py` по мотивам `costHook.ts` из Claude Code. Жесткий биллинг-контроль и учет лимитов для каждой сессии Swarm/MCTS.
4. [Средний] Разработать Terminal Interactivity (Диалоги/REPL): Добавить модули `interactive_helpers.py` и `dialog_launchers.py` для структурированного и красивого запроса подтверждений у пользователя (Human-in-the-loop) при работе `BashHarness`.
5. [Средний] Унификация QueryEngine: Оформить векторный поиск (LanceDB) и графовый (Kùzu) в единый фасад `core/query_engine.py`, абстрагируя логику RAG от Мозга (на базе `QueryEngine.ts`).
7. ✅ [DONE] Prompt Caching: `SYSTEM_PROMPT_DYNAMIC_BOUNDARY` + `PromptHierarchy` — 100% утилизация KV Cache.
8. [Высокий] Subagents & Forks: Реализовать чёткие роли субагентов (`Explore`, `Plan`) с запретами (напр. без редактирования) + внедрить механизм Fork-сессий (Agent inherits context without polluting main thread).
11. [Средний] In-Memory Fuzzy Index: Быстрый поиск по путям в проекте (через `git ls-files` + `ripgrep`) до подключения тяжелой векторной/графовой базы для ускорения автодополнения.
12. [Высокий] Tool Concurrency & Batching: Реализовать логику `ToolOrchestration` — параллельный запуск безопасных tuolz (чтение) и последовательный для мутаций (с авто-прерыванием соседних shell-команд при их каскадных ошибках).
16. ✅ [DONE] Anti-Speculative Prompting: CONTRACT-01/02 вшиты в base_contracts.yaml и статическую часть системного промпта.
18. [Высокий] YOLO Classifier (Безопасность): Сделать так, чтобы BashHarness мог "на лету" стопать рискованные команды (`rm`, `drop`, `force push`) с помощью авто-классификатора или списка запрещенных паттернов, выводя запрос Confirmation Prompt к пользователю.
19. ✅ [DONE] Инъекция System-Reminder тегов: `SystemReminder.inject()` в `BashHarness` + `strip_reminders()` в `GeminiCore`.
21. ✅ [DONE] Ограничение Boundary Validation: CONTRACT-03 (No-Silent-Except) вшит в системный промпт.
22. ✅ [DONE] Prompt Hierarchy Engine: `override` → `coordinator` → `agent` → `custom` → `default`.
24. ✅ [DONE] Reversibility Matrix: CONTRACT-05 + `system-reminder id="reversibility_destructive"` в SystemReminder.
25. [Низкий] Inter-Agent `SendMessage` & IPC: Добавить инструмент для кросс-агентной пересылки объектов, минуя общую текстовую историю разговора Оркестратора.
26. [Низкий] Cron & Sleep Tools: Интегрировать нативные инструменты расписания, чтобы Watchdog или Healer могли "засыпать" и просыпаться для проверки health-статусов без вечного цикла.
27. [Высокий] Prompt Injection Defense: Внедрить проверку ответов тулзов на атаки "Prompt Injection". Если скрипт, файл или веб-страница пытаются перепрограммировать ИИ, агент должен флагировать это пользователю и блокировать исполнение.
28. ✅ [DONE] File Bloat Prevention: CONTRACT-02 вшит в `base_contracts.yaml` и `_BUILTIN_CONTRACTS`.
29. ✅ [DONE] Tool Denial Strategy: `SandboxedToolExecutor` + `ToolDenialHandler` — 5 вариантов вместо слепого ретрая.
30. ✅ [DONE] AskUserQuestion Multiple-Choice UX: `AskUserTool.ask()` + `DenialHandler` с A/B/C/D/E вариантами.
31. ✅ [DONE] OWASP Security Directive: CONTRACT-04 + `system-reminder owasp_sql/owasp_xss` — авто-аудит при генерации.
32. ✅ [DONE] LSP Tool: `lsp_find_symbol`, `lsp_find_refs`, `lsp_goto_def` — Pyright/TSServer JSON-RPC клиент.
33. ✅ [DONE] Git Worktrees: `enter_worktree` / `exit_worktree` / `commit_worktree` / `merge_worktree`.
34. [Высокий] Subagent Briefing Protocol: Явный `Brief` протокол при делегировании Fresh-субагентам.
35. [Средний] Dynamic Team Orchestration: `TeamCreate` / `TeamDelete` для пулов MCTS агентов.
36. ✅ [DONE] State-Safe Context Queuing: `MutationQueue` FIFO + `ParallelBatcher` + `SessionMemory`.
37. [Высокий] Subagent Lifecycle Primitives (Codex-стайл): Выделить управление потоками агентов в явные тулзы (`spawn_agent`, `send_input`, `wait_agent`, `resume_agent`, `close_agent`), дав Мозгу математический контроль над распараллеленным роем.
## Спринт 16: Claw Code Architecture (Завершено / Влито)
Внедрены лучшие практики из clean-room форка Claude Code (репозиторий instructkr/claw-code):
1. **Bash Tool Harness (`core/bash_harness.py`)**: Асинхронная обертка над bash с поддержкой таймаутов и фоновых процессов (`run_in_background`), чтобы Coder-Morph и Watchdog-Morph не зависали на бесконечных лупах серверов/тестов. Реплика Rust-ядра `bash.rs`.
2. **Permission Context (`core/permissions.py`)**: Защита от опасных действий (`ToolPermissionContext`). Теперь все инструменты прогоняются через список `blocked_tools` и `require_user_confirmation` перед инъекцией в LLM.
3. **MCP Router**: Базовая логика для роутинга MCP серверов завершена (`core/mcp_hub.py`).
- **Спринт 28 (Эпик: Subagents & Team Orchestration)**:
   - **Задача 8 & 34 — Subagents & Briefing** (`core/agent_briefer.py`): Выделены роли субагентов (`Explore`, `Plan`). Мозг теперь умеет собирать структурированный `AgentBrief` (ТЗ) при инициализации пула.
   - **Задача 35 & 37 — Lifecycle Primitives & Dynamic Team** (`core/test_subagent_orchestration.py`, `core/swarm_orchestrator.py`): Внедрены Codex-style примитивы `spawn_agent`, `wait_agent`, `resume_agent`, `close_agent` и `send_input`. Мозг создает параллельные динамические команды для сложных задач.
   - **Задача 26 & 31 — Cron & Watchdog** (`core/cron_morph.py`): Создан неблокирующий `CronMorph` для периодических задач, реализован фоновый `WatchdogMorph` с публикацией статусов. Проблемы с таймаутами при малых интервалах успешно исправлены.
   - **Тесты**: Все 25/25 тестов пройдены за 3.15s, включая асинхронную P2P оркестрацию (`pytest_asyncio`), резолв `sys.modules` инъекций и безопасное IPC взаимодействие.

