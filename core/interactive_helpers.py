from typing import List, Optional, Tuple
import sys

def ask_user_question(question: str, options: List[str] = None) -> Tuple[str, Optional[str]]:
    """
    Interactive prompt for the user.
    Asks for confirmation for suspicious actions:
    - Displays a question.
    - Waits for input in the terminal.
    - Returns a Tuple: (selected option, [optionally modified command text]).
    """
    # ANSI colors for a nice terminal output
    RESET = "\033[0m"
    CYAN = "\033[96m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    GREEN = "\033[92m"
    BOLD = "\033[1m"
    MAGENTA = "\033[95m"

    print(f"\n{RED}{BOLD}🚨 [Human-in-the-loop Action Required]{RESET} {question}\n")
    
    if not options:
        options = ["Allow", "Deny", "Change command"]
        
    # Always add a "Custom response" option to reduce cognitive load 
    if "Custom response" not in options and "Custom command" not in options and "Change command" not in options:
        options.append("Custom response")
        
    # Letters A/B/C/D...
    labels = [chr(65 + i) for i in range(len(options))]
    
    for i, (label, opt) in enumerate(zip(labels, options)):
        # Highlight dangerous/safe actions with color
        color = GREEN if i == 0 else RED if "Deny" in opt or "Cancel" in opt else YELLOW
        print(f"   {CYAN}[{label}]{RESET} {color}{opt}{RESET}")
    
    try:
        choice_str = f"{labels[0]}-{labels[-1]}"
        choice = input(f"\n{YELLOW}Your choice [{choice_str}]: {RESET}").strip().upper()
        
        if choice not in labels:
            print(f"{RED}❌ Invalid input. Action denied by default.{RESET}")
            return ("Deny", None)
            
        idx = labels.index(choice)
        selected_opt = options[idx]

        modified_input = None
        if "Change" in selected_opt or "Change" in selected_opt or "Custom response" in selected_opt:
            modified_input = input(f"{CYAN}Enter your version / new command: {RESET}").strip()
            print(f"{GREEN}✅ Custom value accepted: {modified_input}{RESET}")
            return ("Custom", modified_input)
            
        print(f"{GREEN}✅ Selected: {selected_opt}{RESET}")
        return (selected_opt, None)

    except (ValueError, IndexError, KeyboardInterrupt, EOFError):
        print(f"\n{RED}❌ Input interrupted or invalid. Action denied by default.{RESET}")
        return ("Deny", None)
