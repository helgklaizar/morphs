# 🤖 RMS AI OS: AI Development Standards & Rules

## 🎯 Project Philosophy
- **Offline-First**: All Backoffice operations MUST write to local SQLite first. No direct cloud writes unless explicitly needed.
- **Sync-Centric**: Use the `sync_status` field in every table. Valid statuses: `synced`, `pending_insert`, `pending_update`, `pending_delete`.
- **Premium Aesthetics**: UI must be top-tier, dark-mode first, with sleek animations and high-quality typography.

## 🏗️ Architectural Constraints
- **Frameworks**: Next.js 14+ (App Router), Tauri v2 (Rust Core).
- **Backend**: PocketBase (Remote Source of Truth).
- **State Management**: Zustand (UI State) + Repository Pattern (Data IO).
- **Styling**: Vanilla CSS or Tailwind (curated palettes ONLY, no generic colors).

## 🛠️ Coding Rules (Strict)
1. **No God-Stores**: Zustand stores MUST be minimalistic. All data fetching and persistence (SQL/PB) MUST be in `src/lib/repositories/`.
2. **TypeScript Only**: No `any` types. Every database row and API response MUST have a corresponding Interface.
3. **Rust Sync Worker**: Background synchronization logic belongs in `src-tauri/src/sync.rs`. Never handle heavy background sync in the JS thread.
4. **Error Handling**: Every DB operation must be wrapped in `try/catch` with a user-friendly `alert` or Toast notification.

## 📄 Documentation Obligations (Every Turn)
- **GEMINI.md**: Update this file at the end of every task. It is the "Active Brain" of the project.
- **README.md**: Keep folder structures up to date.
- **TODO.md**: Move completed tasks to "Done" and add next logical steps.
- **schema.sql**: If you modify any table (even add one column), update `backend/schema.sql` IMMEDIATELY.

## 🧪 Testing & Validation
- Before declaring a feature complete, verify that:
  - It works offline (mock no internet).
  - It syncs correctly after "internet" is restored.
  - It doesn't break existing Telegram hooks.

## 🚫 Forbidden Actions
- **DO NOT** hardcode credentials (secrets, tokens) in the codebase. Use the `config` table in SQLite/PB.
- **DO NOT** delete local rows directly. Use `sync_status = 'pending_delete'`.
- **DO NOT** break the `pb_hooks/main.pb.js` structure; it's sensitive to JS VM constraints.
