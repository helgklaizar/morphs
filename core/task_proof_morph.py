import os
import json
from core.logger import logger

class TaskProofMorph:
    """
    Local Evidence-Driven Workflow.
    Управляет папками-аудитами (Durable Task Folders) для задач.
    Реализует концепции:
    1. Изолированные Task Folders
    2. Заморозка спецификации (Spec Freeze)
    3. Эфемерные роли под задачу (Task-Scoped Subagents)
    4. Доказательный пайплайн (Evidence Collection)
    """
    def __init__(self, workspace_dir: str):
        self.workspace_dir = os.path.abspath(workspace_dir)
        self.tasks_dir = os.path.join(self.workspace_dir, ".tasks")
        os.makedirs(self.tasks_dir, exist_ok=True)
        
    def get_task_folder(self, task_id: str) -> str:
        return os.path.join(self.tasks_dir, task_id)

    def init_task(self, task_id: str, original_spec: str) -> str:
        """1. Создание папки-аудита и инициализация спеки."""
        folder = self.get_task_folder(task_id)
        os.makedirs(folder, exist_ok=True)
        os.makedirs(os.path.join(folder, "evidence"), exist_ok=True)
        os.makedirs(os.path.join(folder, ".agents"), exist_ok=True)
        
        spec_path = os.path.join(folder, "spec.md")
        with open(spec_path, "w", encoding="utf-8") as f:
            f.write("# Task Specification\n\n")
            f.write(original_spec)
            
        logger.info(f"📁 [TaskProof-Morph] Папка задачи инициализирована: {folder}")
        return folder

    def freeze_spec(self, task_id: str) -> str:
        """2. Заморозка спецификации (Spec Freeze). Читаем и фиксируем."""
        spec_path = os.path.join(self.get_task_folder(task_id), "spec.md")
        if not os.path.exists(spec_path):
            raise FileNotFoundError("Спецификация не найдена!")
            
        # В реальной Linux системе можно сделать os.chmod(spec_path, 0o444) 
        # для защиты от перезаписи.
        with open(spec_path, "r", encoding="utf-8") as f:
            frozen_spec = f.read()
            
        logger.info(f"❄️ [TaskProof-Morph] Спецификация заморожена для {task_id}. Никаких галлюцинаций.")
        return frozen_spec

    def generate_subagent_prompts(self, task_id: str, context: str):
        """3. Эфемерные роли под задачу (Task-Scoped Subagents)."""
        agents_folder = os.path.join(self.get_task_folder(task_id), ".agents")
        
        # Инструкция для Coder
        coder_prompt = f"""# Замороженный контекст для кодера
Вся архитектура и зависимости для твоей работы:
{context}

Твоя единственная цель: реализовать spec.md. Шаг влево, шаг вправо = провал.
"""
        with open(os.path.join(agents_folder, "task-builder.md"), "w", encoding="utf-8") as f:
            f.write(coder_prompt)
            
        # Инструкция для Архитектора
        reviewer_prompt = """# Замороженный контекст для Архитектора
Ты должен проверить код строго по спецификации (spec.md) и собранным доказательствам (evidence/).
Если нет файла evidence/build.txt или тесты не пройдены, ТЫ НЕ ИМЕЕШЬ ПРАВА ПРОПУСКАТЬ КОД.
"""
        with open(os.path.join(agents_folder, "task-reviewer.md"), "w", encoding="utf-8") as f:
            f.write(reviewer_prompt)
            
        logger.info(f"🎭 [TaskProof-Morph] Локальные системные промпты сгенерированы в {agents_folder}")

    def collect_evidence(self, task_id: str, filename: str, content: str):
        """4. Доказательный пайплайн. Сбор логов, багов, результатов тестов."""
        evidence_folder = os.path.join(self.get_task_folder(task_id), "evidence")
        path = os.path.join(evidence_folder, filename)
        
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
            
        logger.info(f"💼 [TaskProof-Morph] Добавлено доказательство: {filename}")
        
    def write_verdict(self, task_id: str, verdict_data: dict):
        """Финальный вердикт."""
        folder = self.get_task_folder(task_id)
        with open(os.path.join(folder, "verdict.json"), "w", encoding="utf-8") as f:
            json.dump(verdict_data, f, indent=4, ensure_ascii=False)
        logger.info(f"⚖️ [TaskProof-Morph] Вердикт вынесен: {verdict_data.get('status')}")
        
    def verify_ready_for_review(self, task_id: str) -> bool:
        """Архитектор запрашивает: готовы ли пруфы?"""
        evidence_folder = os.path.join(self.get_task_folder(task_id), "evidence")
        build_log = os.path.join(evidence_folder, "build.txt")
        if not os.path.exists(build_log):
            return False
            
        with open(build_log, "r", encoding="utf-8") as f:
            content = f.read()
            if "failed" in content.lower() or "error" in content.lower() and "success" not in content.lower():
                return False
                
        return True
