import glob
from typing import str
from ..core.application.ports import ConfigPort

class YAMLConfigAdapter(ConfigPort):
    def __init__(self, rules_path: str = "rules/*.yaml"):
        self.rules_path = rules_path

    async def get_business_rules(self) -> str:
        """
        Чтение бизнес-правил из YAML файлов.
        """
        rules = ""
        for file in glob.glob(self.rules_path):
            with open(file, "r") as f:
                rules += f.read() + "\n"
        return rules
