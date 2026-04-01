from typing import List, Optional, Tuple
import sys

def ask_user_question(question: str, options: List[str] = None) -> Tuple[str, Optional[str]]:
    """
    Интерактивный запрос к пользователю.
    Запрашивает подтверждение на подозрительные действия:
    - Выводит вопрос.
    - Ждет ввода в терминале.
    - Возвращает Tuple: (выбранная опция, [опционально измененный текст команды]).
    """
    # ANSI Цвета для красоты в терминале
    RESET = "\033[0m"
    CYAN = "\033[96m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    GREEN = "\033[92m"
    BOLD = "\033[1m"
    MAGENTA = "\033[95m"

    print(f"\n{RED}{BOLD}🚨 [Human-in-the-loop Action Required]{RESET} {question}\n")
    
    if not options:
        options = ["Разрешить", "Запретить", "Изменить команду"]
        
    # Всегда добавляем опцию "Свой ответ" для снятия когнитивной нагрузки 
    if "Свой ответ" not in options and "Своя команда" not in options and "Изменить команду" not in options:
        options.append("Свой ответ")
        
    # Буквы A/B/C/D...
    labels = [chr(65 + i) for i in range(len(options))]
    
    for i, (label, opt) in enumerate(zip(labels, options)):
        # Подсвечиваем опасные/безопасные действия цветом
        color = GREEN if i == 0 else RED if "Запретить" in opt or "Отмена" in opt else YELLOW
        print(f"   {CYAN}[{label}]{RESET} {color}{opt}{RESET}")
    
    try:
        choice_str = f"{labels[0]}-{labels[-1]}"
        choice = input(f"\n{YELLOW}Ваш выбор [{choice_str}]: {RESET}").strip().upper()
        
        if choice not in labels:
            print(f"{RED}❌ Неверный ввод. Действие запрещено по умолчанию.{RESET}")
            return ("Запретить", None)
            
        idx = labels.index(choice)
        selected_opt = options[idx]

        modified_input = None
        if "Изменить" in selected_opt or "Change" in selected_opt or "Свой ответ" in selected_opt:
            modified_input = input(f"{CYAN}Введите ваш вариант / новую команду: {RESET}").strip()
            print(f"{GREEN}✅ Принято кастомное значение: {modified_input}{RESET}")
            return ("Custom", modified_input)
            
        print(f"{GREEN}✅ Выбрано: {selected_opt}{RESET}")
        return (selected_opt, None)

    except (ValueError, IndexError, KeyboardInterrupt, EOFError):
        print(f"\n{RED}❌ Ввод прерван или неверный. Действие запрещено по умолчанию.{RESET}")
        return ("Запретить", None)
