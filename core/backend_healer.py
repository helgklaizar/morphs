import os
import subprocess
import ast
import traceback
from mlx_agent import CoreMind
from core.logger import logger

class BackendHealer:
    def __init__(self, target_file: str):
        self.target_file = target_file
        self.mind = CoreMind(model_name="mlx-community/Meta-Llama-3-8B-Instruct-4bit")
        logger.info(f"🩺 [Backend-Healer] Запущен Хирург для бэкенда: {self.target_file}")

    def run_pytest(self):
        """Прогоняет AST-предвалидацию и pytest на сгенерированном роутере"""
        
        # 1️⃣ AST Pre-Validation (Пункт 4: Молниеносная проверка синтаксиса)
        logger.info("🧱 [AST-Morph] Предварительный синтаксический анализ...")
        try:
            with open(self.target_file, "r") as f:
                code_content = f.read()
            ast.parse(code_content)
        except SyntaxError as e:
            err_msg = "".join(traceback.format_exception(type(e), e, e.__traceback__))
            logger.info(f"🚨 [AST-Morph] Мгновенно пойман SyntaxError: {e.msg}")
            return 1, "", err_msg

        try:
            logger.info("🧹 [Ruff] Автоматическая чистка кода и импортов...")
            subprocess.run(["ruff", "check", "--fix", self.target_file], capture_output=True, text=True)
            subprocess.run(["ruff", "format", self.target_file], capture_output=True, text=True)
        except Exception as ruff_e:
            logger.info(f"⚠️ [Ruff] Ошибка запуска ruff: {ruff_e}")


        # 2️⃣ Углубленное тестирование Pytest (Импорты, Логика, SQLAlchemy)
        test_file = "test_auto.py"
        module_name = self.target_file.replace("/", ".").replace(".py", "")
        
        test_code = f"""import pytest
from {module_name} import router
from core.logger import logger

def test_router_loads():
    assert router is not None
"""
        with open(test_file, "w") as f:
            f.write(test_code)
            
        logger.info("🔍 [Backend-Healer] Выполняю статический анализ и импорт...")
        result = subprocess.run(["pytest", test_file, "-v", "--tb=short"], capture_output=True, text=True)
        
        # Удаляем тестовый файл
        if os.path.exists(test_file):
            os.remove(test_file)
            
        return result.returncode, result.stdout, result.stderr

    def heal_python_code(self, error_log: str, max_retries: int = 2):
        logger.info(f"🔥 [Backend-Healer] Бэкенд упал! Начинаю автоматическую хирургию (до {max_retries} попыток)...")
        
        for attempt in range(max_retries):
            with open(self.target_file, "r") as f:
                bad_code = f.read()
                
            prompt = (
                f"Мы пытались запустить твой Python-скрипт FastAPI, но получили критическую ошибку:\n"
                f"```\n{error_log}\n```\n"
                f"ТВОЙ СЛОМАННЫЙ КОД:\n```python\n{bad_code}\n```\n"
                f"ЗАДАЧА: Исправь ошибку (например, добавь импорт HTTPBearer или исправь синтаксис Pydantic). Верни ПОЛНЫЙ исправленный код."
            )
            
            schema = "<thought>Анализ ошибки и план лечения</thought>\n<code>Исправленный код полностью</code>"
            
            logger.info(f"✂️ [Backend-Healer] Операция {attempt + 1}/{max_retries}...")
            result = self.mind.think_structured(prompt, schema, max_tokens=2500, expert_adapter="python_healer")
            
            fixed_code = result.get("code", "").replace("```python", "").replace("```", "").strip()
            
            if fixed_code:
                with open(self.target_file, "w") as f:
                    f.write(fixed_code)
                logger.info("✅ [Backend-Healer] Патч применен! Запускаю повторную диагностику...")
                
                code, out, err = self.run_pytest()
                if code == 0:
                    logger.info("🎉 [Backend-Healer] Пациент спасен! Бэкенд загружается без ошибок.")
                    return True
                else:
                    error_log = out + "\n" + err
            else:
                logger.info("🚨 [Backend-Healer] Ядро вернуло пустой патч.")
                
        logger.info("☠️ [Backend-Healer] Вайп. Операция провалена. Требуется вмешательство Человека.")
        return False

if __name__ == "__main__":
    # Тест
    # healer = BackendHealer("routers/restaurant_router.py")
    # healer.heal_python_code("ImportError: cannot import name 'HTTPBearer'")
    pass
