import asyncio
import os
import httpx
import sys

# Colorful CLI
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
    print(f"{CYAN}Welcome to the business generator.{RESET} We will design a system for your case.\n")

async def main():
    print_header()
    
    # 1. Business Type
    business_type = input(f"{YELLOW}1. What type of business are we deploying? (e.g., Smart Coffee Shop, AI Agency, CRM): {RESET}").strip()
    if not business_type:
        business_type = "Generic SaaS Workspace"

    # 2. Modules
    print(f"\n{YELLOW}2. List the required modules, separated by commas (e.g., inventory, pos, crm, analytics){RESET}")
    modules_input = input(f"{YELLOW}> {RESET}").strip()
    if modules_input:
        modules = [m.strip() for m in modules_input.split(",") if m.strip()]
    else:
        modules = ["basic_ui"]

    # 3. Additional wishes
    message = input(f"\n{YELLOW}3. Additional wishes for architecture / design (Leave empty if none): {RESET}").strip()
    
    # Summary
    print(f"\n{GREEN}🧾 Final Brief:{RESET}")
    print(f"   {CYAN}Business:{RESET} {business_type}")
    print(f"   {CYAN}Modules:{RESET} {modules}")
    print(f"   {CYAN}Prompt:{RESET} {message if message else 'Default'}")

    confirm = input(f"\n{YELLOW}Start the Swarm for code generation? [Y/n]: {RESET}").strip().lower()
    if confirm not in ('', 'y', 'yes'):
        print(f"{CYAN}Cancelled.{RESET}")
        return

    print(f"\n{MAGENTA}🔥 Sending task to Core Mind (API: http://localhost:8000/api/v1/generate)...{RESET}")

    payload = {
        "business_type": business_type,
        "modules": modules
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post("http://localhost:8000/api/v1/generate", json=payload, timeout=5.0)
            
            if response.status_code in (200, 202):
                data = response.json()
                print(f"{GREEN}✅ Success! Swarm has accepted the task.{RESET}")
                print(f"   {CYAN}API Response:{RESET} {data.get('message', 'Ok')}")
                
                # Additionally, a chat message can be sent if the user added wishes
                if message:
                    await client.post("http://localhost:8000/api/v1/chat", json={
                        "business_type": business_type,
                        "message": message
                    }, timeout=5.0)

                print(f"\n{GREEN}The generation process has started in the background. Check the ../workspaces/{business_type.replace(' ', '').lower()} folder in a couple of minutes!{RESET}")
            else:
                print(f"{YELLOW}⚠️ Core Mind returned an error: {response.text}{RESET}")

    except httpx.ConnectError:
        print(f"{YELLOW}⚠️ Connection error! Core Mind (FastAPI on port 8000) is not running.{RESET}")
        print(f"{CYAN}First, start the Server:{RESET} uvicorn core.main:app --reload")
        sys.exit(1)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print(f"\n{CYAN}Exiting the constructor.{RESET}")
