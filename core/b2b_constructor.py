import asyncio
import os
import httpx
import sys

# Разноцветный CLI
RESET = "\033[0m"
CYAN = "\033[96m"
YELLOW = "\033[93m"
GREEN = "\033[92m"
MAGENTA = "\033[95m"
BOLD = "\033[1m"

def print_header():
    print(f"\n{MAGENTA}{BOLD}========================================={RESET}")
    print(f"{MAGENTA}{BOLD}🚀 MORPHS B2B SaaS CONSTRUCTOR REPL 🚀{RESET}")
    print(f"{MAGENTA}{BOLD}========================================={RESET}")
    print(f"{CYAN}Добро пожаловать в генератор бизнеса.{RESET} Мы спроектируем систему под ваш случай.\n")

async def main():
    print_header()
    
    # 1. Тип бизнеса
    business_type = input(f"{YELLOW}1. Какой тип бизнеса разворачиваем? (например, Smart Coffee Shop, AI Agency, CRM): {RESET}").strip()
    if not business_type:
        business_type = "Generic SaaS Workspace"

    # 2. Модули
    print(f"\n{YELLOW}2. Перечислите нужные модули через запятую (например, inventory, pos, crm, analytics){RESET}")
    modules_input = input(f"{YELLOW}> {RESET}").strip()
    if modules_input:
        modules = [m.strip() for m in modules_input.split(",") if m.strip()]
    else:
        modules = ["basic_ui"]

    # 3. Дополнительные пожелания
    message = input(f"\n{YELLOW}3. Дополнительные пожелания к архитектуре / дизайну (Оставьте пустым, если нет): {RESET}").strip()
    
    # Сводка
    print(f"\n{GREEN}🧾 Итоговый Бриф:{RESET}")
    print(f"   {CYAN}Бизнес:{RESET} {business_type}")
    print(f"   {CYAN}Модули:{RESET} {modules}")
    print(f"   {CYAN}Промпт:{RESET} {message if message else 'По умолчанию'}")

    confirm = input(f"\n{YELLOW}Запустить Swarm-роя для генерации кода? [Y/n]: {RESET}").strip().lower()
    if confirm not in ('', 'y', 'yes', 'да'):
        print(f"{CYAN}Отменено.{RESET}")
        return

    print(f"\n{MAGENTA}🔥 Отправка задачи в Core Mind (API: http://localhost:8000/api/v1/generate)...{RESET}")

    payload = {
        "business_type": business_type,
        "modules": modules
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post("http://localhost:8000/api/v1/generate", json=payload, timeout=5.0)
            
            if response.status_code in (200, 202):
                data = response.json()
                print(f"{GREEN}✅ Успех! Swarm принял задачу.{RESET}")
                print(f"   {CYAN}Ответ API:{RESET} {data.get('message', 'Ok')}")
                
                # Дополнительно можно послать chat-сообщение, если юзер добавил пожелания
                if message:
                    await client.post("http://localhost:8000/api/v1/chat", json={
                        "business_type": business_type,
                        "message": message
                    }, timeout=5.0)

                print(f"\n{GREEN}Процесс генерации запущен в фоне. Загляните в папку ../workspaces/{business_type.replace(' ', '').lower()} через пару минут!{RESET}")
            else:
                print(f"{YELLOW}⚠️ Core Mind вернул ошибку: {response.text}{RESET}")

    except httpx.ConnectError:
        print(f"{YELLOW}⚠️ Ошибка подключения! Core Mind (FastAPI на порту 8000) не запущен.{RESET}")
        print(f"{CYAN}Сначала запустите Сервер:{RESET} uvicorn core.main:app --reload")
        sys.exit(1)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print(f"\n{CYAN}Выход из конструктора.{RESET}")
