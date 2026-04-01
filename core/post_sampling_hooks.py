import threading
from core.logger import logger

class PostSamplingHooks:
    _hooks = []

    @classmethod
    def register(cls, hook_fn):
        cls._hooks.append(hook_fn)

    @classmethod
    def execute(cls, **kwargs):
        def run_hooks():
            for hook in cls._hooks:
                try:
                    hook(**kwargs)
                except Exception as e:
                    logger.error(f"⚠️ [PostSamplingHook] Ошибка: {e}")
        
        # Fire and forget in a background thread to unblock the main execution
        thread = threading.Thread(target=run_hooks, daemon=True)
        thread.start()
