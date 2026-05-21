# Обзор проекта BOS Agent (ai-business-os)

## Описание
Автономный Business OS Agent — создаёт B2B SaaS приложения из высокоуровневых директив. Первая система, которая собирает себя сама.

## Стек технологий
Python 3.12+, Redis (P2P bus), LanceDB (vector), Kùzu (graph DB/AST), React + Vite + Tailwind, Docker, Apple MLX

## Ключевые файлы и директории
- `CoreMind Brain` — центральный модуль логики
- `Healer Morph (MCTS)` — модуль самоисправления кода
- `Vision Morph` — интерфейсный модуль на Playwright
- `Security Morph` — YOLO bash guard для проверки команд
- `Aegis Gatekeeper` — защита безопасности

## Важные особенности / Контекст
Использует MCTS (Monte Carlo Tree Search) для самоисправления и оптимизации генерируемого кода. Хранит семантическую память в LanceDB и граф AST в Kùzu.
