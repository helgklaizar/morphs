# Kitchen Manager — Project Index

## 📌 Essence & Stack
- **What is it:** Order and kitchen management system (Next.js Landing for clients, Tauri Backoffice for admins).
- **Tech Stack:** Next.js (App Router), Tauri v2, Zustand, Tailwind CSS, PocketBase, SQLite (@borsch/db-local).

## 🛑 CRITICAL RESTRICTIONS (Red Flags)
- Integrations with Telegram (Webhooks, bots) are critical for the business logic. Do not break them.
- **PocketBase is self-hosted on a VPS (gcloud).** We only deploy to our custom VPS server (borsch.shop).
- The SyncEngine architecture handles offline-first local SQLite sync with remote PocketBase. 

## 🚀 Deployment & Environment
- **New Backoffice (Tauri):** `cd backoffice && npm run dev:tauri`
- **New Backoffice (Build):** `cd backoffice && npm run build:tauri`
- **Client Storefront (Next.js):** `cd landing && npm run dev`

## 📚 Documentation Navigation
*(Look for implementation details and context in these files)*
- 🏗 **Architecture & DB:** `docs/architecture.md`
- 🔌 **API / Contracts:** `docs/api.md`
- 📦 **Deploy Settings & VPS:** `docs/deploy.md`
- 📅 **Active Sprint & Roadmap:** `docs/sprints/week-1.md`

## 🛠 Recent Updates (Production Hardening)
- Replaced `catch {}` with `console.error` across the codebase to prevent silent bugs (e.g., in `AssemblyEditModal.tsx` and pb_hooks `api_telegram`).
- Implemented **Global React Error Boundary** combined with Telegram Crash Reporter via `/api/monitor/logs`.
- Added `/api/monitor/health` in PocketBase for Rust SyncEngine heartbeats.
