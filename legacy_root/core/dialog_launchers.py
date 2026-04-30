"""
dialog_launchers.py — Structured Human-in-the-loop dialogs for Morphs OS.

Contains dialog factories for specific scenarios:
  - confirm_destructive_command(cmd)   → before executing a BashHarness bash command
  - confirm_deploy(workspace)          → before starting a Docker deploy
  - ask_business_brief()               → interactive B2B brief (replaces plain-input in b2b_constructor.py)
  - ask_kuzu_export_format()           → Kùzu graph export format selection for Dashboard
  - show_progress_bar(steps)           → progress animation in the terminal
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


# ─── 1. Destructive bash command confirmation ───────────────────────────
def confirm_destructive_command(cmd: str, reason: str = "Command is marked as potentially dangerous") -> Tuple[str, Optional[str]]:
    """
    Called from BashHarness before executing risky commands.
    Returns ("allow" | "deny" | "edit", Optional[new_cmd]).
    """
    _box_header("Confirm Dangerous Command", "🚨")
    _info("Command:", f"{RED}{cmd}{R}")
    _info("Reason:", reason)
    print()

    choice, modified = ask_user_question(
        "What to do with this command?",
        options=["✅ Allow (YOLO)", "🚫 Deny", "✏️  Edit command"]
    )

    if "Allow" in choice or choice == "A":
        _success("Command allowed.")
        return ("allow", None)
    elif "Edit" in choice or choice == "C" or choice == "Custom":
        new_cmd = modified or _prompt("Enter a safe replacement command")
        _success(f"Command replaced with: {new_cmd}")
        return ("edit", new_cmd)
    else:
        _error("Command blocked by user.")
        return ("deny", None)


# ─── 2. Pre-deploy confirmation ────────────────────────────────────────
def confirm_deploy(workspace: str, details: Dict[str, str] = None) -> bool:
    """
    Called from DeployMorph before starting Docker build.
    Returns True (continue) | False (cancel).
    """
    _box_header("Confirm Deploy", "🚀")
    _info("Workspace:", workspace)
    if details:
        for k, v in details.items():
            _info(k + ":", v)
    print()

    choice, _ = ask_user_question(
        "Start Docker build and deploy?",
        options=["🚀 Yes, deploy!", "🚫 No, cancel"]
    )
    if "Yes" in choice or choice == "A":
        _success("Deploy started.")
        return True
    _warn("Deploy canceled by user.")
    return False


# ─── 3. Interactive B2B brief (replaces b2b_constructor plain input) ─────────
def ask_business_brief() -> Optional[Dict[str, Any]]:
    """
    Fully interactive wizard for collecting B2B parameters.
    Returns a brief dictionary or None on cancellation.
    """
    _box_header("B2B SaaS Constructor — Wizard", "🏗️")

    print(f"  {DIM}We'll help you deploy a SaaS for your business in a few steps.{R}\n")

    # ── Step 1: Business type ───────────────────────────────────────────────
    print(f"{BLU}{B}Step 1 / 4: Business Type{R}")
    print(f"  {DIM}Examples: Smart Coffee Shop, AI Agency, CRM, Clinic, Restaurant{R}")
    biz_type = _prompt("Business type")
    if not biz_type:
        biz_type = "Generic SaaS Workspace"

    # ── Step 2: Modules ────────────────────────────────────────────────────
    print(f"\n{BLU}{B}Step 2 / 4: System Modules{R}")
    print(f"  {DIM}Enter the required modules, separated by commas{R}")
    print(f"  {DIM}Available: inventory, pos, crm, analytics, loyalty, kitchen, api, auth{R}")
    mods_raw = _prompt("Modules")
    modules = [m.strip() for m in mods_raw.split(",") if m.strip()] if mods_raw else ["basic_ui"]

    # ── Step 3: Stack/preferences ────────────────────────────────────────────
    print(f"\n{BLU}{B}Step 3 / 4: Additional Preferences{R}")
    print(f"  {DIM}Optional: technologies, design, rules, constraints. "
          f"Leave empty to skip.{R}")
    extra = _prompt("Preferences") or None

    # ── Step 4: Confirmation ─────────────────────────────────────────────
    print(f"\n{BLU}{B}Step 4 / 4: Confirmation{R}")
    print()
    print(_hr())
    _info("Business:",   biz_type)
    _info("Modules:",   ", ".join(modules))
    _info("Prompt:",   extra or "(not specified)")
    print(_hr())
    print()

    choice, _ = ask_user_question(
        "Start Morph Swarm to generate this SaaS?",
        options=["🚀 Start!", "🔄 Start over", "🚫 Cancel"]
    )

    if "Start!" in choice or choice == "A":
        _success("Task accepted! Swarm-hive activated.")
        return {"business_type": biz_type, "modules": modules, "extra_prompt": extra}
    elif "Start over" in choice or choice == "B":
        _warn("Restarting wizard...")
        return ask_business_brief()
    else:
        _warn("Operation canceled.")
        return None


# ─── 4. Kùzu graph export format selection ──────────────────────────────────
def ask_kuzu_export_format() -> Optional[str]:
    """
    Called from Kùzu Dashboard before exporting the graph.
    Returns a format string: "json" | "csv" | "dot" | None on cancellation.
    """
    _box_header("Export Kùzu Graph", "🕸️")
    print(f"  {DIM}Select the format for exporting the project's knowledge graph:{R}\n")

    choice, _ = ask_user_question(
        "Export format:",
        options=["📄 JSON (for Dashboard / D3)", "📊 CSV (for Excel / DuckDB)", "🔵 DOT (Graphviz)", "🚫 Cancel"]
    )

    mapping = {"A": "json", "B": "csv", "C": "dot"}
    if choice in mapping:
        fmt = mapping[choice]
        _success(f"Selected format: {fmt.upper()}")
        return fmt
    _warn("Export canceled.")
    return None


# ─── 5. Terminal progress animation ─────────────────────────────────────
def show_progress_bar(steps: List[str], delay: float = 0.4) -> None:
    """
    A nice step-by-step progress animation in the terminal.
    Used in b2b_constructor.py during generation.

    Args:
        steps: a list of step description strings
        delay: pause between steps in seconds
    """
    _box_header("Generation Progress", "⚙️")
    total = len(steps)
    for i, step in enumerate(steps, 1):
        pct = int(i / total * 40)
        bar = GRN + "█" * pct + DIM + "░" * (40 - pct) + R
        label = f"  [{bar}] {CYN}{i}/{total}{R} {step}"
        print(label)
        time.sleep(delay)
    _success("All steps completed!")


# ─── CLI self-test ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import asyncio

    def _demo():
        print(f"\n{MAG}{B}=== dialog_launchers.py — DEMO ==={R}\n")

        # 1. Progress bar
        show_progress_bar([
            "Initializing Blueprint",
            "Deploying UI-Morph",
            "Generating API-Morph",
            "Healer Audit",
            "Deploy-Morph packaging"
        ], delay=0.3)

        # 2. Command confirmation
        confirm_destructive_command("rm -rf /tmp/build", "Deleting build folder")

        # 3. B2B Brief wizard
        brief = ask_business_brief()
        if brief:
            print(f"\n{GRN}Brief:{R} {brief}")

    _demo()