import json
import time
import os
import asyncio
from core.quantum_atropos import QuantumAtropos
from core.security_morph import SecurityMorph
from core.logger import logger

class HealerMorph:
    def __init__(self, project_path: str, target_file: str):
        self.project_path = project_path
        self.target_file = target_file
        
        from core.atropos_memory import AtroposMemory
        self.memory_db = AtroposMemory()
        
        logger.info("💡 [Healer-Morph] Пробуждение Агента (с Quantum Atropos / LanceDB)...")
        # Инициализируем квантового хилера (MCTS)
        self.quantum = QuantumAtropos()
        
    async def run_tests(self):
        logger.info(f"💡 [Healer-Morph] Запуск тестов через npx vitest в {self.project_path} ...")
        from core.bash_harness import BashHarness, BashCommandInput
        harness = BashHarness()
        
        # Запускаем npx vitest для всего проекта или конкретного файла
        target = self.target_file if self.target_file else ""
        out = await harness.execute(BashCommandInput(
            command=f"npx vitest run {target}",
            cwd=self.project_path,
            timeout=30
        ))
        
        # Если команда не найдена (например npx), вернется код 127
        return out.return_code, out.stdout, out.stderr

    async def validate_patch_callback(self, patch_code: str) -> tuple[bool, str]:
        """
        Коллбек для QuantumAtropos. Сохраняем патч во временный слой (hot-swap)
        и прогоняем реальные тесты. Возвращает (успех, трейсбек ошибки).
        """
        # Бэкапим оригинальный файл
        with open(self.target_file, "r") as f:
            original = f.read()
            
        try:
            # Инжектим патч
            with open(self.target_file, "w") as f:
                f.write(patch_code)
            
            # 1. Сначала пентест
            pentester = SecurityMorph()
            is_safe = pentester.run_pentest(self.target_file)
            if not is_safe:
                return False, "Security check failed (AST Invariant violation)."
                
            # 2. РЕАЛЬНЫЙ ТЕСТ: Прогон vitest / bun test изолированно для этого файла
            from core.bash_harness import BashHarness, BashCommandInput
            harness = BashHarness()
            
            # Запускаем bun test (или npm run test) только для этого файла
            out = await harness.execute(BashCommandInput(
                command=f"npx vitest run {self.target_file}",
                cwd=self.project_path,
                timeout=10
            ))
            
            return out.return_code == 0, out.stderr
            
        except Exception as e:
            logger.error(f"🔥 [Healer-Morph] Ошибка валидации: {e}")
            return False, str(e)
        finally:
            # Возвращаем файлы на место (Rollback)
            with open(self.target_file, "w") as f:
                f.write(original)

    async def heal_code(self, task_dir: str):
        """Читает Evidence Folder и чинит код через параллельные ветки Quantum Atropos."""
        logger.info(f"🔥 [Healer-Morph] Тесты упали. Сканируем доказательства из {task_dir}...")
        
        evidence_log = ""
        build_path = os.path.join(task_dir, "evidence", "build.txt")
        if os.path.exists(build_path):
            with open(build_path, "r") as f:
                evidence_log += f"VITEST/BUN LOG:\n{f.read()}\n\n"
                
        browser_path = os.path.join(task_dir, "evidence", "browser_errors.json")
        if os.path.exists(browser_path):
            with open(browser_path, "r") as f:
                evidence_log += f"PLAYWRIGHT BROWSER LOG:\n{f.read()}\n\n"

        if not os.path.exists(self.target_file):
            return "Файл не найден", False

        with open(self.target_file, "r") as f:
            broken_code = f.read()

        # Если файл просто со словом 'broken' (заглушка старых тестов) - чиним быстро
        # Заглушка удалена (Шаг 1 Аудита).

        logger.info("🔮 [Healer-Morph + Quantum] Запуск MCTS Дерева Поиска патча...")
        
        best_patch = await self.quantum.search_best_patch(
            broken_code=broken_code,
            error_trace=evidence_log[-2000:],
            validation_callback=self.validate_patch_callback,
            branches=3,
            expert_block_adapter="healer"
        )

        if not best_patch:
            logger.info("❌ [Healer-Morph] MCTS Дерево не нашло безопасного/проходного патча. Банкрот.")
            return evidence_log, False
            
        logger.info(f"🔧 [Healer-Morph] MCTS Патч найден! Применяю к {self.target_file}")
        with open(self.target_file, "w") as f:
            f.write(best_patch)
            
        return evidence_log, True

    def record_trajectory(self, prompt, action, reward, state_after):
        self.memory_db.record_experience(
            error=prompt[-2000:], # Сохраняем последние 2000 символов ошибки
            fixed_code=action,
            reward=reward
        )
        logger.info("🧠 [Atropos RL] Траектория ответа (успех/провал) сохранена в LanceDB.")
