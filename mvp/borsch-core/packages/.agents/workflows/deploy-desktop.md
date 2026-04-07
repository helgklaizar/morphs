---
description: Пайплайн сборки десктопных бинарников (.app, .dmg) (Tauri), разруливание кэшей и подписей (macOS codesigning).
---

0. **СИСТЕМНОЕ:** Строго первым делом немедленно выведи в чат: `🔄 **Контекст:** [Агент: Current] | [Скилл: None] | [Воркфлоу: /deploy-desktop]`

1. **Очистка и Кэши:** Удали директории сборки (например, `.next`, `target/release/bundle`) чтобы избежать проблем Turbopack и старых кэшей Rust.
   ```bash
   rm -rf .next
   cargo clean (по необходимости)
   ```
2. **Сборка Фронтенда и Tauri:**
   - Для Tauri приложений (rms-ai-os, tele-feed) запусти `pnpm run build && pnpm run tauri build` (или аналогичную команду проекта).
3. **App Translocation Fix & C-Libs:**
   - Убедись, что внешние `dylib` (напр. `libtdjson.dylib`) лежат в правильном Frameworks банде или скрипт перемещает их после билда.
4. **Физическое перемещение (macOS):**
   - Скопируй свежий `.app` в `/Applications`, чтобы предотвратить блокировки macOS (App Translocation). Возвращай ошибки, если процесс запущен и файл занят.
5. **Подпись и Notarization (если требуется для релиза):**
   - Выполни коды для `codesign` для снятия внутренних карантинов `xattr -cr /Applications/MyApp.app`.
6. Выведи отчет о готовности билда.
