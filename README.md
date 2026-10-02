# FinTrack Pro - Multi-User Expense Management & Financial Simulation System

A comprehensive personal finance management web application: multi-wallet income and expense tracking, smart budgets, recurring bills, savings goals, automated bank statement import, and **What-If financial simulation**.

The system features **Multi-User Isolation** with strict security architecture: Host and Guest access via separate URLs, independent `User ID` provisioning, and secure server-side data storage that is **completely excluded from Git commits**. Features a bilingual interface (**Vietnamese / English**) and **Light / Dark mode**.

---

## 🌟 1. Key Features

### 🔐 Multi-User Accounts & Access Control
- **Mandatory Authentication:** Modern Glassmorphism welcome screen and Login / Register modal, preventing unauthorized access.
- **Host Account:** Dedicated `admin` account holding complete real financial records (wallets, bank accounts, transaction history). Password is set upon first login.
- **Guest Accounts:** Guests visit online links and click **"Create Guest Account"** to register. The system generates an isolated `User ID` (`usr_...`) pre-populated with a clean sample dataset. Guests cannot view or modify Host data, and vice versa.
- **Session Management:** Role badges (Host / Guest) integrated into the top navigation bar with a secure **Sign Out** button.

### 💳 Wallets & Asset Management
- **4 Specialized Wallet Types:** Cash, Bank Accounts, Credit Cards (credit limit, statement cycle, isolated debt balance), and Savings Accounts (tenor, interest rate).
- Automatic calculation of **Available Balance** and **Net Worth**; credit card debt is strictly isolated to prevent financial distortion.
- **Internal Transfers** between wallets (with optional transaction fees) and **Credit Card Debt Settlement**.
- **Balance Reconciliation:** One-click *"Recalculate Balance"* verifies initial balance against entire transaction history.

### 📝 Transaction Tracking & Quick Entry
- Manage expenses, incomes, and transfers; categorize by tags, notes, and attach **receipt images** (automatically compressed before saving).
- **Quick Add Modal:** Instantly accessible from any screen, featuring fast amount increment buttons (+50k, +100k, +500k, etc.).
- Smart validation: Overdraft alerts, credit limit enforcement, and prevention of future-dated transactions.

### 📥 Automated Bank Statement Parser
- Upload **Excel (.xlsx, .xls)** or **CSV** files. Automatically recognizes statement layouts of over 15 Vietnamese banks (Techcombank, Vietcombank, MB Bank, ACB, VPBank, BIDV, VietinBank, TPBank, VIB, Agribank, Sacombank, Timo, Cake, MoMo, etc.).
- Duplicate transaction detection and intelligent expense category suggestions based on transfer descriptions.

### 🎯 Budgets & Savings Goals
- Set spending caps per category, with automated warning thresholds: **approaching 80%** (amber) and **exceeded 100%** (red).
- Allocate income according to multi-jar envelope budgeting principles with an emergency fund.
- **Financial Goals:** Deposit/withdraw funds directly to/from wallets, complete with celebratory confetti animations upon goal attainment.

### ⏰ Recurring Bills & Subscriptions
- Track electricity, water, internet, and rent on **Monthly / Quarterly / Yearly** cycles.
- Accurate calendar due-date calculation, countdown timers, and visual alerts for upcoming or overdue bills.
- **"Pay Now"** button instantly creates the corresponding expense transaction and deducts funds from the designated wallet.

### 🔮 What-If Financial Simulation
- Experiment with future financial projections: expense reduction sliders (0–50%), monthly savings deposits, investment market scenarios, and external loan amortization.
- Multi-horizon projections (**6 / 12 / 24 / 36 months**) with interactive charts comparing baseline growth against simulated scenarios.

### 📊 Reports & Data Export
- Visual analytics for expense distribution, monthly cash flow trends, and net income trajectory.
- Export to **Multi-sheet Excel (.xlsx)** (transactions, wallets, budgets, executive summary) and language-localized **UTF-8 CSV**.

---

## 🔒 2. Strict Security Architecture

FinTrack Pro is built on a 6-layer defense-in-depth model:

| Security Layer | Technical Implementation |
|---|---|
| **Password Hashing** | One-way hashing using **`scrypt`** combined with a cryptographically secure 16-byte random `salt`. Raw passwords are never stored. Verified via `crypto.timingSafeEqual` to thwart timing attacks. |
| **Brute-Force Mitigation** | Built-in rate limiting: more than **5 failed attempts / IP** triggers a 15-minute temporary lockout (`HTTP 429`). |
| **Session Protection** | Session cookie `fintrack_session` is cryptographically signed using **HMAC-SHA256** with an independent secret (`.session_secret`), flagged with `HttpOnly` (XSS protection) and `SameSite=lax` (CSRF prevention). |
| **Data Isolation** | The server extracts `userId` strictly from the verified session signature (Zero Trust Client). Path Traversal sanitizer (`replace(/[^a-zA-Z0-9_-]/g, '')`) prevents unauthorized file access. |
| **Filesystem Permissions** | Directories `data/` and `data/users/` are enforced with Linux permissions **`chmod 700`**, and data files with **`chmod 600`** (accessible exclusively by the host OS user). |
| **Git Privacy** | `.gitignore` strictly excludes `data/*.json`, `data/users/`, `data/users.json`, and `data/.session_secret`. When pushing code to GitHub, **all financial records and user accounts remain local on your machine and are never leaked**. |

---

## 💻 3. Technology Stack

| Component | Technology |
|---|---|
| **Framework** | **Next.js 15** (App Router), **React 19**, JavaScript (JSX) |
| **Styling & UI** | **Tailwind CSS v4**, **Lucide React** (icons), Canvas-Confetti |
| **Data Visualization** | **Recharts** |
| **Spreadsheet Processing** | **SheetJS (xlsx)** |
| **Authentication & Crypto** | Node.js Built-in `crypto` (scrypt, HMAC-SHA256, timingSafeEqual) |
| **State Management** | React Context (`src/context/AppContext.jsx`) |
| **Storage Engine** | Document-based JSON Server Disk (Atomic writes `atomicWriteJSON` to prevent corruption) |

### Source Tree
```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.js     # Authentication, Host initialization, Rate limiting
│   │   │   ├── register/route.js  # Guest registration, User ID & isolated data provisioning
│   │   │   ├── me/route.js        # Active session verification
│   │   │   └── logout/route.js    # Sign out, session cookie invalidation
│   │   └── storage/route.js       # User-isolated data read/write, conflict resolution
│   ├── page.jsx, layout.jsx, not-found.jsx, globals.css
│├── components/                    # UI Views: DashboardView, TransactionsView, BudgetsView,
│                                  # WhatIfSimulatorView, BillsView, ReportsView, WalletsView, SettingsView,
│                                  # Navigation, AuthModal, QuickAddModal, BankStatementModal...
├── context/AppContext.jsx         # Global state management, user data hydration, realtime sync
├── lib/
│   ├── auth-server.js             # Server-side auth, scrypt hashing, HMAC session signing, user registry
│   ├── bank-statement-parser.js   # Automated bank statement parsing engine
│   ├── i18n.js                    # Bilingual dictionary (Vietnamese / English)
│   ├── utils.js                   # Financial calculations, balance reconciliation, currency formatting
│   └── mock-data.js               # Initial schema definitions and seed data
└── middleware.js                  # Application request routing & redirects
data/
├── database.template.json         # Clean schema template (tracked in Git)
├── database.json                  # Host financial data (protected, in .gitignore)
├── users.json                     # Encrypted user credentials registry (in .gitignore)
├── .session_secret                # HMAC signing key (in .gitignore)
└── users/                         # User-isolated storage directory (in .gitignore)
    ├── admin.json                 # Host profile & financial database
    └── usr_<id>.json              # Guest isolated data stores
```

---

## 🚀 4. Installation & Getting Started

### Prerequisites
* **Node.js 18.18+** (LTS Node 20 or Node 22 recommended).
* Operating System: Linux / macOS / Windows (WSL2).

### Clone & Install
```bash
git clone https://github.com/vietnamlm05-bit/final-web-app.git
cd final-web-app
npm install
```

### Running with Dual Links (Recommended)
The project includes an automated startup script that launches the production build alongside secure internet tunneling:

```bash
./start.sh
```

Upon successful startup, the terminal presents two dedicated URLs:
```text
==================================================================
FinTrack Pro has launched successfully with Multi-User Isolation!

👉 LINK 1 (HOST / LOCAL ACCESS):
   http://localhost:3000
   * Sign in using username: admin
   * First-time setup: establish your master password directly in the login modal.

👉 LINK 2 (GUEST / REMOTE ACCESS):
   https://<your-subdomain>.ngrok-free.dev (or Cloudflare Tunnel URL)
   * Guests open this link and click "Create Guest Account" to sign up.
   * Each guest is granted an isolated User ID and independent financial store.
==================================================================
```

### Stopping Services
```bash
./stop.sh
```

### Alternative Run Modes
* **Local Only (No public tunnel):**
  ```bash
  NO_TUNNEL=1 ./start.sh
  ```
* **Development Mode:**
  ```bash
  npm run dev
  ```

---

## 🗄️ 5. Data Management & Backups

- **Atomic Writes:** During writes, data is flushed to a temporary `.tmp` file prior to renaming (`fs.rename`), guarding against database corruption in the event of abrupt server termination or power loss.
- **Realtime Multi-Device Sync:** The application monitors snapshot versioning. In the event of simultaneous edits across devices, the server triggers conflict resolution (`HTTP 409`) and initiates three-way merging (`mergeSnapshots`), safeguarding all balances and transactions.
- **Manual Backups:** Download complete JSON snapshots at any time via Account Profile $\rightarrow$ **"Backup Data"**.
