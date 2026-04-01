# Архитектурный План: Stateful Planning, Verification Layer & Block PathMoA

## 1. Stateful Plan Management (Задача 15)
**Цель:** Заменить плоские (и неконтролируемые) Markdown TODO листы на математически-надежную конечную автомат-машину (FSM) внутри `SwarmOrchestrator` для треккинга задач.

### Структура
Создание `core/plan_tracker.py` с использованием Pydantic-моделей:
- **`PlanStep` (Узел автомата):** Содержит `step_id`, `description`, `status` (PENDING, IN_PROGRESS, SUCCESS, FAILED, SKIPPED), `assigned_expert`.
- **`PlanTracker` (Граф):** Управляет направленным ациклическим графом (DAG) или списком `PlanStep`.
- **Методы (Тулзы):**
  - `create_plan(steps: List[dict])`: Инициализирует FSM.
  - `update_step_status(step_id: str, new_status: str, evidence: str)`: Атомарная операция (state transition).
  - `verify_plan_execution()`: Проверяет инвариант: $\forall step \in Plan \rightarrow status == SUCCESS$. Если инвариант выполнен, весь план помечается завершённым.

**Интеграция:** Инстанс `PlanTracker` добавляется в `SwarmOrchestrator` для треккинга жизненного цикла, заменяя простое отслеживание в `TaskProofMorph`.

## 2. Verification Agent (Задача 17)
**Цель:** Жёсткое разделение "Писателя" и "Судьи". Только `VerificationAgent` (Изолированная функция-оракул) может объявить код валидным.

### Архитектура
Создание `core/verification_morph.py` (`VerificationMorph`).
- Выступает как единственный доверенный "сертификационный" узел в P2P-сети EventBus (или напрямую через вызовы в Orchestrator).
- **Инвариант Судьи (Judge Invariant):** $Generate (G) \neq Verify (V)$. Если G и V - одна LLM-сессия, возникает самообман.
- В `SwarmOrchestrator`, процесс `on_ui_generated` или `on_backend_generated` направляет сгенерированный код модулю `VerificationMorph`.
- Модуль запускает изолированные тесты (`HealerMorph.run_tests()` или `BrowserMorph` E2E) и возвращает булево значение $S_{verdict} \in \{True, False\}$ с логами. Только при $S_{verdict} == True$ план переходит дальше.

## 3. Block-Constrained Agent Routing (Задачи 38-39)
**Цель:** Устранить избыточный роутинг и смену контекста (перезагрузку LoRA/Skills).

### Концепция (Block PathMoA/MoE)
В графе генерации $G = (V, E)$ (как в `MCTS` квантового атропоса) выделяются **логические блоки** (подграфы).
Эксперт (например, `frontend_expert` или `healer`) назначается на блок $B_i$, а не на отдельный вызов `think()`.
- В `quantum_atropos.py`: Слой `QuantumAtropos` теперь принимает параметр `expert_adapter` (adapter-блокировка). Во время всего цикла $N$ итераций (Selection, Expansion, Simulation) MCTS использует один жестко заблокированный `expert_adapter`.
- В `mlx_agent.py`: `CoreMind` кеширует состояние LoRA/Skill. Оптимизация $O(N)$ загрузок адаптеров сводится к $O(1)$.

## План действий
1. Написать `core/plan_tracker.py` (State Machine).
2. Написать `core/verification_morph.py` (Verification Agent).
3. Интегрировать их в `core/swarm_orchestrator.py` (вместо старых монолитных вызовов в `on_ui_generated`).
4. Расширить `core/quantum_atropos.py`, чтобы `QuantumAtropos.search_best_patch` принимал `expert_block_adapter` и передавал его в вызовы `_generate_branch`.
