<div align="center">
  <img src="https://raw.githubusercontent.com/tauri-apps/tauri/HEAD/app-icon.png" width="100" />
  <h1>RMS AI OS: Open-Source Restaurant Management System</h1>
  <p><strong>Next-Gen All-in-One RMS & ERP platform for Modern Hospitality</strong></p>
  
  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
  [![Tauri](https://img.shields.io/badge/Tauri-FFC131?style=for-the-badge&logo=tauri&logoColor=white)](https://tauri.app/)
  [![Zustand](https://img.shields.io/badge/Zustand-443E38?style=for-the-badge&logo=zustand&logoColor=white)](https://docs.pmnd.rs/zustand)
  [![PocketBase](https://img.shields.io/badge/PocketBase-B8ECE5?style=for-the-badge&logo=pocketbase&logoColor=white)](https://pocketbase.io/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
</div>

<br />

## 📖 Overview

**RMS AI OS** is an enterprise-grade, offline-capable **All-in-One Restaurant Management System (RMS)** and **ERP**, designed to streamline operations for cafes, restaurants, and dark kitchens. 

Built with an ultra-fast modern stack—combining the power of **Rust (via Tauri)** on the desktop with **Next.js / React** and a realtime **PocketBase** backend—the system delivers native performance, offline persistence via SQLite, and an unparalleled UI/UX experience.

---

## 🚀 Why RMS AI OS? (The Competitive Edge)

Most standard RMS/POS solutions (like iiko, r_keeper, or Toast) suffer from either being clunky 20-year-old monoliths or cloud-only apps that paralyze your kitchen the second the internet drops. 

**Here is why RMS AI OS is fundamentally better:**
- **True All-in-One Ecosystem:** Stop paying for 5 different subscriptions. RMS AI OS unifies WMS (Warehouse), CRM (Loyalty & Clients), POS (Sales), Kiosk (Self-checkout), and HR (Shifts/Payroll) into a single cohesive database. No more broken API integrations between your inventory app and your front-of-house register.
- **Local-First & Offline Resilience:** Powered by SQLite and Tauri, RMS AI OS runs locally on your Mac/PC. If your cafe loses internet connection, the POS, floor plans, and kitchen workflow remain 100% operational. Syncs immediately when back online.
- **Microsecond UI Rendering:** Built with React/Next.js and Zustand for state. No more spinner screens when taking an order—everything updates optimistically in native 60fps.
- **AI-Powered Assistant:** Navigate reports, configure menus, and generate promotional content using the built-in Intelligent Engine. Say goodbye to clicking through 15 nested menus just to find out your top-selling items.
- **Zero-Friction Hardware:** You don't need highly specialized 15-year old enterprise terminals. You can run the POS seamlessly on any Mac (Air/Mini) or Windows touch-device.

---

## 📸 Screenshots
*(Save your App screenshots on Mac and put them in `docs/assets/screenshots/` with exact names to display them here)*

<p align="center">
  <img src="./docs/assets/screenshots/dashboard.png" width="48%" alt="Analytics Dashboard placeholder" />
  <img src="./docs/assets/screenshots/pos.png" width="48%" alt="POS Terminal placeholder" />
</p>
<p align="center">
  <img src="./docs/assets/screenshots/tables.png" width="48%" alt="Table Sessions placeholder" />
  <img src="./docs/assets/screenshots/inventory.png" width="48%" alt="Inventory & WMS placeholder" />
</p>

---

## 💼 Core Business Modules & Logic
RMS AI OS is structured into independent but deeply interconnected modules. Over 30 functional interfaces ensure that every action in one module cascades correctly into others, creating a perfectly synchronized restaurant ecosystem.

### 📊 1. Executive Analytics & Dashboard
*Understand your business health at a glance without opening Excel.*
- **Financial & Sales Overview:** Real-time revenue tracking, average check size, and peak-hour heatmaps to see when you earn the most.
- **ABC Engineering:** Instantly categorize your menu. Find your "cash cows" (high profit, high popularity) and eliminate the "dead weight" holding your margins down.
- **Staff Workload:** Visually tracks the busiest kitchen hours to help you optimize staffing schedules and prevent kitchen bottlenecks.

### 📦 2. WMS & Inventory (Warehouse Management)
*Automate your stock and permanently eliminate untracked food waste.*
- **True Real-Time Deductions:** When a cashier sells a Cappuccino on the POS, the system instantly deducts exactly 18g of coffee beans, 150ml of milk, and 1 disposable cup from your warehouse based on the Tech Card.
- **Procurement & Suppliers:** Keep track of vendor pricing histories and auto-generate Purchase Orders when stock items fall below critical minimums.
- **Digital Stocktakes:** Conduct "blind" inventory audits. Employees input physical ingredient counts, and the system independently highlights shortages or surpluses to prevent theft.
- **Semi-Finished Assemblies:** Prepare large batches of ingredients (like sauces or dough) and track their exact cost and shelf-life before they are used in final dishes.

### 🍽️ 3. Front-of-House (POS & Dine-In)
*Empower your cashiers and waiters with lightning-fast tools that never crash.*
- **Omnichannel Touch POS:** A highly optimized, customizable touchscreen interface for fast-paced walk-in orders, pickup, and delivery.
- **Interactive Floor Plans (Table Sessions):** Waiters can visually manage tables, open dine-in sessions, and group multiple sequential orders into a single "pre-check" for the evening. Supports complex bill splitting and mixed payments (Cash + Card).
- **Self-Checkout & QR Menus:** Automatically generate unique QR codes for each table. Guests can scan, view a mobile-optimized landing app, and place orders directly to the Kitchen Display System without waiting for a server.

### 🧑‍🍳 4. Kitchen & Menu Operations
*Total control over what you sell and how it's made.*
- **Multi-Level Tech Cards (BOM):** Build recipes within recipes. (e.g., A "Caesar Salad" uses "Caesar Dressing", which in turn automatically deducts raw eggs, oil, and spices from the warehouse).
- **Dynamic Food Costing:** Changing the purchase price of raw tomatoes from a supplier instantly recalculates the gross margin on every pizza, alerting management if profitability drops below a threshold.
- **Kitchen Routing:** Send drink tickets directly to the barista's printer, and food tickets to the hot-shop Kitchen Display Screen (KDS).

### 🤝 5. CRM, Marketing & Loyalty
*Turn accidental walk-ins into brand ambassadors.*
- **Automated Client Profiling:** The system tracks every guest's Lifetime Value (LTV), visit frequency, and favorite items.
- **Smart Segmentation:** Instantly identify your "VIPs" or filter "Sleeping Clients" (guests who haven't visited in over 30 days) to target them with SMS or email campaigns.
- **Loyalty & Promo Engine:** Issue multi-tiered digital loyalty cards (Cashback or Points) and create conditional promocodes (e.g., "15% off only on Tuesdays for VIPs").

### 👥 6. Workforce Management (HR & Shifts)
*Manage your team without complex paperwork.*
- **Time & Attendance:** Secure PIN-code system for opening and closing personal shifts.
- **Role-Based Access Control (RBAC):** Strict boundaries. Waiters cannot see financial reports, Cashiers cannot alter recipes, and Management retains global override control.
- **X/Z-Reports:** Standard cash drawer reconciliation and shift auditing at the end of every day.

---

## 🏗️ Architecture

The project is structured as a scalable **Turborepo** monorepo:

```text
rms-ai-os/
├── apps/
│   ├── backoffice/    # 🖥️ Tauri + Next.js Desktop App (Admin/Kitchen/POS interface)
│   │   ├── src-tauri/ # Rust bindings & SQLite Offline Engine
│   │   └── src/       # Zustand strict stores, Tailwind UI, React Testing Library
│   └── landing/       # 📱 Next.js (App Router) Landing / Self-checkout PWA
├── packages/
│   └── types/         # 📦 Shared TypeScript interfaces across front & back 
├── backend/           # 🗄️ PocketBase custom Go routines & schemas
├── docs/              # 📚 System Architecture & API Contracts
└── legacy_repos/      # 🗃️ Archived related monolithic projects (kitchen-manager)
```

### Uncompromising Testing Standard
We maintain **100% test passing rate** across 160+ unit and integration tests (Vitest + React Testing Library).

---

## 🚀 Getting Started

### Prerequisites
- Node.js `20+` & `pnpm`
- Rust & Cargo (for compiling the Tauri desktop client)
- PocketBase instance (default: `http://localhost:8090`)

### Running Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/helgklaizar/rms-ai-os.git
   cd rms-ai-os
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Start the PocketBase backend:**
   ```bash
   cd backend
   ./pocketbase serve
   ```

4. **Launch the POS/Backoffice App (Development):**
   ```bash
   cd apps/backoffice
   npm run tauri dev
   ```

## 🔒 License
This project is licensed under the MIT License - see the LICENSE file for details.
