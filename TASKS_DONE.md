# Morphs OS: Завершенные задачи (Технический фундамент и Ядро)

Этот документ содержит архив всех глобальных архитектурных прорывов и закрытого техдолга (Спринты 1–28) перед выходом на Mass Market.
Актуальные задачи находятся в `TODO.md`.

## 🟢 Выполнено (Done)

### Спринты 1–28: Архитектурные прорывы и закрытый техдолг
- [x] **Swarm & Orchestration**: P2P Event Bus (msgspec), Codex-style примитивы (`spawn`, `wait`, `send_input`), пулы параллельных суб-агентов (Explore/Plan) с изолированными Fork-сессиями.
- [x] **Verified RAG Engine**: Hybrid векторно-графовый поиск (LanceDB + Kùzu), In-Memory Fuzzy Search (`ripgrep`).
- [x] **Anti-OOM & Memory**: Управление контекстом (microcompact), защита от переполнений Apple MLX, AST-минификация исходников `tokenizer_morph`.
- [x] **Security & Tooling**: YOLO Bash Classifier (защита от опасных shell-команд), InjectionGuard (Prompt Injection), нативный LSP (Pyright/TSServer).
- [x] **Isolation**: Изолированные сессии через Git Worktrees. Очередь мутаций (`MutationQueue`).
- [x] **Prompt Engineering**: Кэширование `SYSTEM_PROMPT_DYNAMIC_BOUNDARY`, многослойная иерархия, Anti-Speculation контракты (не писать лишнего кода).
- [x] **Debate & UX**: Математическое верификация AST (Judge-Morph), Terminal Human-in-the-loop (Dialogues, A/B/C варианты ответа), обработчик логических отказов (DenialFlow).
- [x] **Background Daemons**: Умный неблокирующий `CronMorph` и `WatchdogMorph`, `CostHook` API-биллинг.
- [x] Multi-Agent Economy (`economy_morph.py`): Внутренний бюджет (квоты) агентов для защиты от "бесконечных галлюцинаций".
- [x] Auto-Deploy (`deploy_morph.py`): Автоматический `docker compose up -d --build` для старта сгенерированного SaaS.
- [x] Healer-Morph Update: Научить Хилера читать папку `evidence/`, чтобы понимать ошибки Playwright и Vitest не вслепую.
- [x] Atropos Experience Replay (RL): Обвязать парсинг `verdict.json` для сбора датасетов (успех/провал) и передачи в MLX для локального дообучения.
- [x] Watchdog-Morph (Супервизор): Отстреливать зависшие генерации (Защита от OOM).
- [x] Security-Morph (Pentester): Авто-поиск SQL инъекций перед релизом.
- [x] Deploy-Morph (DevOps): Docker/Terraform по команде "Разверни продакшен".
- [x] Спор Агентов: UI/Coder <-> Architect.
- [x] AST-Morph: "Хирургия синтаксиса" python-файлов (быстрый отлов багов).
- [x] Browser-Morph: Playwright "Chaos E2E Testing" на сгенерированных React-компонентах.
- [x] P2P Event Bus: Асинхронная Pub/Sub архитектура Ядра.
- [x] WorkspaceManager: Генерация независимых (SaaS Docker-Compose) воркспейсов, исключение монолита.
