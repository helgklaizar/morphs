"""
dialog_launchers.py — Структурированные диалоги Human-in-the-loop для Morphs OS.

Содержит фабрики диалогов для конкретных сценариев:
  - confirm_destructive_command(cmd)   → перед выполнением баш-команды BashHarness
  - confirm_deploy(workspace)          → перед запуском Docker deploy
  - ask_business_brief()               → интерактивный B2B-бриф (заменяет plain-input в b2b_constructor.py)
  - ask_kuzu_export_format()           → выбор формата экспорта графа Kùzu для Dashboard
  - show_progress_bar(steps)           → анимация прогресса в терминале
"""

import sys
import time
import os
from typing import Optional, Tuple, List, Dict, Any

from core.interactive_helpers import ask_user_question

# ─── ANSI ──────────────────────────────────────────────────────────────────
R   = "\033[0m"
B   = "\033[1m"        # bold
DIM = "\033[2m"
CYN = "\033[96m"
YEL = "\033[93m"
RED = "\033[91m"
GRN = "\033[92m"
MAG = "\033[95m"
BLU = "\033[94m"

# ─── Helpers ────────────────────────────────────────────────────────────────
def _hr(char: str = "─", width: int = 56) -> str:
    return DIM + char * width + R

def _box_header(title: str, icon: str = "🧠") -> None:
    print()
    print(_hr("═"))
    print(f"  {icon}  {B}{MAG}{title}{R}")
    print(_hr("═"))
    print()

def _info(label: str, value: str) -> None:
    print(f"  {CYN}{label:<18}{R} {value}")

def _prompt(label: str) -> str:
    return input(f"\n{YEL}▶ {label}: {R}").strip()

def _success(msg: str) -> None:
    print(f"\n{GRN}✅ {msg}{R}")

def _warn(msg: str) -> None:
    print(f"\n{YEL}⚠️  {msg}{R}")

def _error(msg: str) -> None:
    print(f"\n{RED}❌ {msg}{R}")


# ─── 1. Подтверждение деструктивной bash-команды ───────────────────────────
def confirm_destructive_command(cmd: str, reason: str = "Команда помечена как потенциально опасная") -> Tuple[str, Optional[str]]:
    """
    Вызывается из BashHarness перед выполнением рискованных команд.
    Возвращает ("allow" | "deny" | "edit", Optional[new_cmd]).
    """
    _box_header("Подтверждение опасной команды", "🚨")
    _info("Команда:", f"{RED}{cmd}{R}")
    _info("Причина:", reason)
    print()

    choice, modified = ask_user_question(
        "Что сделать с этой командой?",
        options=["✅ Разрешить (YOLO)", "🚫 Запретить", "✏️  Изменить команду"]
    )

    if "Разрешить" in choice or choice == "A":
        _success("Команда разрешена.")
        return ("allow", None)
    elif "Изменить" in choice or choice == "C" or choice == "Custom":
        new_cmd = modified or _prompt("Введите безопасную замену команды")
        _success(f"Команда заменена на: {new_cmd}")
        return ("edit", new_cmd)
    else:
        _error("Команда заблокирована пользователем.")
        return ("deny", None)


# ─── 2. Подтверждение перед деплоем ────────────────────────────────────────
def confirm_deploy(workspace: str, details: Dict[str, str] = None) -> bool:
    """
    Вызывается из DeployMorph перед запуском Docker build.
    Возвращает True (продолжать) | False (отмена).
    """
    _box_header("Подтверждение деплоя", "🚀")
    _info("Воркспейс:", workspace)
    if details:
        for k, v in details.items():
            _info(k + ":", v)
    print()

    choice, _ = ask_user_question(
        "Запустить Docker build и deploy?",
        options=["🚀 Да, деплоить!", "🚫 Нет, отмена"]
    )
    if "Да" in choice or choice == "A":
        _success("Деплой запущен.")
        return True
    _warn("Деплой отменён пользователем.")
    return False


# ─── 3. Интерактивный B2B-бриф (замена b2b_constructor plain input) ─────────
def ask_business_brief() -> Optional[Dict[str, Any]]:
    """
    Полностью интерактивный wizard для сбора B2B-параметров.
    Возвращает словарь бриф или None при отмене.
    """
    _box_header("B2B SaaS Constructor — Wizard", "🏗️")

    print(f"  {DIM}Мы поможем развернуть SaaS под ваш бизнес за несколько шагов.{R}\n")

    # ── Шаг 1: тип бизнеса ───────────────────────────────────────────────
    print(f"{BLU}{B}Шаг 1 / 4: Тип бизнеса{R}")
    print(f"  {DIM}Примеры: Smart Coffee Shop, AI Agency, CRM, Clinic, Restaurant{R}")
    biz_type = _prompt("Тип бизнеса")
    if not biz_type:
        biz_type = "Generic SaaS Workspace"

    # ── Шаг 2: модули ────────────────────────────────────────────────────
    print(f"\n{BLU}{B}Шаг 2 / 4: Модули системы{R}")
    print(f"  {DIM}Введите нужные модули через запятую{R}")
    print(f"  {DIM}Доступные: inventory, pos, crm, analytics, loyalty, kitchen, api, auth{R}")
    mods_raw = _prompt("Модули")
    modules = [m.strip() for m in mods_raw.split(",") if m.strip()] if mods_raw else ["basic_ui"]

    # ── Шаг 3: стек/пожелания ────────────────────────────────────────────
    print(f"\n{BLU}{B}Шаг 3 / 4: Дополнительные пожелания{R}")
    print(f"  {DIM}Опционально: технологии, дизайн, правила, ограничения. "
          f"Оставьте пустым, чтобы пропустить.{R}")
    extra = _prompt("Пожелания") or None

    # ── Шаг 4: подтверждение ─────────────────────────────────────────────
    print(f"\n{BLU}{B}Шаг 4 / 4: Подтверждение{R}")
    print()
    print(_hr())
    _info("Бизнес:",   biz_type)
    _info("Модули:",   ", ".join(modules))
    _info("Промпт:",   extra or "(не указан)")
    print(_hr())
    print()

    choice, _ = ask_user_question(
        "Запустить Morph Swarm для генерации этого SaaS?",
        options=["🚀 Запустить!", "🔄 Начать сначала", "🚫 Отмена"]
    )

    if "Запустить" in choice or choice == "A":
        _success("Задача принята! Свармо-рой активирован.")
        return {"business_type": biz_type, "modules": modules, "extra_prompt": extra}
    elif "Начать" in choice or choice == "B":
        _warn("Перезапуск wizard...")
        return ask_business_brief()
    else:
        _warn("Операция отменена.")
        return None


# ─── 4. Выбор формата экспорта Kùzu-графа ──────────────────────────────────
def ask_kuzu_export_format() -> Optional[str]:
    """
    Вызывается из Kùzu Dashboard перед экспортом графа.
    Возвращает строку формата: "json" | "csv" | "dot" | None при отмене.
    """
    _box_header("Экспорт графа Kùzu", "🕸️")
    print(f"  {DIM}Выберите формат для экспорта графа знаний проекта:{R}\n")

    choice, _ = ask_user_question(
        "Формат экспорта:",
        options=["📄 JSON (для Dashboard / D3)", "📊 CSV (для Excel / DuckDB)", "🔵 DOT (Graphviz)", "🚫 Отмена"]
    )

    mapping = {"A": "json", "B": "csv", "C": "dot"}
    if choice in mapping:
        fmt = mapping[choice]
        _success(f"Выбран формат: {fmt.upper()}")
        return fmt
    _warn("Экспорт отменён.")
    return None


# ─── 5. Анимация прогресса в терминале ─────────────────────────────────────
def show_progress_bar(steps: List[str], delay: float = 0.4) -> None:
    """
    Красивая анимация прогресса шагов в терминале.
    Используется в b2b_constructor.py при генерации.

    Args:
        steps: список строк-описаний шагов
        delay: пауза между шагами в секундах
    """
    _box_header("Прогресс генерации", "⚙️")
    total = len(steps)
    for i, step in enumerate(steps, 1):
        pct = int(i / total * 40)
        bar = GRN + "█" * pct + DIM + "░" * (40 - pct) + R
        label = f"  [{bar}] {CYN}{i}/{total}{R} {step}"
        print(label)
        time.sleep(delay)
    _success("Все шаги выполнены!")


# ─── CLI самотест ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import asyncio

    def _demo():
        print(f"\n{MAG}{B}=== dialog_launchers.py — DEMO ==={R}\n")

        # 1. Прогресс-бар
        show_progress_bar([
            "Инициализация Blueprint",
            "Развертывание UI-Morph",
            "Генерация API-Morph",
            "Healer Audit",
            "Deploy-Morph packaging"
        ], delay=0.3)

        # 2. Подтверждение команды
        confirm_destructive_command("rm -rf /tmp/build", "Удаление папки сборки")

        # 3. B2B Бриф wizard
        brief = ask_business_brief()
        if brief:
            print(f"\n{GRN}Бриф:{R} {brief}")

    _demo()
