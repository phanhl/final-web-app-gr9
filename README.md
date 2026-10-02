# FinTrack Pro - Multi-User Expense Management & Financial Simulation System

A comprehensive personal finance management web application: multi-wallet income and expense tracking, smart budgets, recurring bills, savings goals, automated bank statement import, and **What-If financial simulation**.

The system features **Multi-User Isolation** with strict security architecture: Host and Guest access via separate URLs, independent `User ID` provisioning, and secure server-side data storage that is **completely excluded from Git commits**. Features a bilingual interface (**Vietnamese / English**) and **Light / Dark mode**.

---

## 1. Key Features

### Multi-User Accounts & Access Control
- **Mandatory Authentication:** Modern Glassmorphism welcome screen and Login / Register modal, preventing unauthorized access.
- **Host Account:** Dedicated `admin` account holding complete real financial records (wallets, bank accounts, transaction history). The password comes from `APP_PASSWORD`, or is chosen at the first login together with a **one-time setup code** printed in the server terminal (`data/.host_setup_code`), so nobody who merely opens the public link can claim it.
- **Guest Accounts:** Guests visit online links and click **"Create Guest Account"** to register. The system generates an isolated `User ID` (`usr_...`) pre-populated with a clean sample dataset. Guests cannot view or modify Host data, and vice versa.
- **Session Management:** Role badges (Host / Guest) integrated into the top navigation bar with a secure **Sign Out** button.
- **Account Settings:** Change password (signs out other devices) and, for guests, permanently delete the account with all its data. Forgotten passwords are reset on the server: `npm run reset-password -- <username>`.

### Wallets & Asset Management
- **4 Specialized Wallet Types:** Cash, Bank Accounts, Credit Cards (credit limit, statement cycle, isolated debt balance), and Savings Accounts (tenor, interest rate).
- Automatic calculation of **Available Balance** and **Net Worth**; credit card debt is strictly isolated to prevent financial distortion.
- **Internal Transfers** between wallets (with optional transaction fees) and **Credit Card Debt Settlement**.
- **Balance Reconciliation:** One-click *"Recalculate Balance"* verifies initial balance against entire transaction history.

### Transaction Tracking & Quick Entry
- Manage expenses, incomes, and transfers; categorize by tags, notes, and attach **receipt images** (automatically compressed before saving).
- **Quick Add Modal:** Instantly accessible from any screen, featuring fast amount increment buttons (+50k, +100k, +500k, etc.).
- Smart validation: Overdraft alerts, credit limit enforcement, and prevention of future-dated transactions.

### Automated Bank Statement Parser
- Upload **Excel (.xlsx, .xls)** or **CSV** files. Automatically recognizes statement layouts of over 15 Vietnamese banks (Techcombank, Vietcombank, MB Bank, ACB, VPBank, BIDV, VietinBank, TPBank, VIB, Agribank, Sacombank, Timo, Cake, MoMo, etc.).
- Duplicate transaction detection and intelligent expense category suggestions based on transfer descriptions.

### Budgets & Savings Goals
- Set spending caps per category, with automated warning thresholds: **approaching 80%** (amber) and **exceeded 100%** (red).
- Allocate income according to multi-jar envelope budgeting principles with an emergency fund.
- **Financial Goals:** Deposit/withdraw funds directly to/from wallets, complete with celebratory confetti animations upon goal attainment.

### Recurring Bills & Subscriptions
- Track electricity, water, internet, and rent on **Monthly / Quarterly / Yearly** cycles.
- Accurate calendar due-date calculation, countdown timers, and visual alerts for upcoming or overdue bills.
- **"Pay Now"** button instantly creates the corresponding expense transaction and deducts funds from the designated wallet.

### What-If Financial Simulation
- Experiment with future financial projections: expense reduction sliders (0–50%), monthly savings deposits, investment market scenarios, and external loan amortization.
- Multi-horizon projections (**6 / 12 / 24 / 36 months**) with interactive charts comparing baseline growth against simulated scenarios.

### Reports & Data Export
- Visual analytics for expense distribution, monthly cash flow trends, and net income trajectory.
- Export to **Multi-sheet Excel (.xlsx)** (transactions, wallets, budgets, executive summary) and language-localized **UTF-8 CSV**.

---

## 2. Strict Security Architecture

FinTrack Pro is built on a defense-in-depth model:

| Security Layer | Technical Implementation |
|---|---|
| **Password Hashing** | One-way hashing using **`scrypt`** combined with a cryptographically secure 16-byte random `salt`. Raw passwords are never stored. Verified via `crypto.timingSafeEqual` to thwart timing attacks. |
| **Brute-Force Mitigation** | Failed logins / PIN entries are limited **per IP (5 / 15 min)** and **per account (10 / 15 min)**, so rotating spoofed `X-Forwarded-For` values does not help. The client IP is taken from `cf-connecting-ip` or the right-most proxy hop. Requests made directly on the host machine are exempt from the per-account lockout, so outsiders cannot lock the owner out. Guest sign-up is limited per IP and per hour (`ALLOW_REGISTRATION`, `MAX_REGISTRATIONS_PER_HOUR`). |
| **Host Setup** | First-time `admin` password requires `APP_PASSWORD` or the one-time setup code from the server console. |
| **Session Protection** | Session cookie `fintrack_session` is signed with **HMAC-SHA256** (`APP_SESSION_SECRET` or `data/.session_secret`), `HttpOnly`, `SameSite=lax`, 7-day expiry, revoked on logout / password change (`tokenVersion`). |
| **PIN Lock** | PIN (or account password) unlocks a short-lived `HttpOnly` cookie (`fintrack_unlock`, 12 h, bound to the PIN hash). The PIN and password are **never stored in localStorage / sessionStorage**; leftovers from older versions are wiped on load. |
| **CSRF & Headers** | State-changing API calls from other sites (`Sec-Fetch-Site: cross-site / same-site`) are rejected. Strict CSP without `unsafe-eval` in production, `frame-ancestors 'none'`, HSTS, `nosniff`. |
| **Encrypted Backups** | AES-256-GCM with `APP_BACKUP_KEY` or `data/.backup_key`; the server refuses to run backups rather than fall back to a built-in key. |
| **Data Isolation** | The server extracts `userId` strictly from the verified session signature (Zero Trust Client). Path Traversal sanitizer (`replace(/[^a-zA-Z0-9_-]/g, '')`) prevents unauthorized file access. |
| **Filesystem Permissions** | `data/` and `data/users/` are created / tightened to **`0700`** and every data file is written as **`0600`** (accessible exclusively by the host OS user). A corrupt `users.json` is never overwritten. |
| **Git Privacy** | `.gitignore` strictly excludes `data/*.json`, `data/users/`, `data/users.json`, and `data/.session_secret`. When pushing code to GitHub, **all financial records and user accounts remain local on your machine and are never leaked**. |

---

## 3. Technology Stack

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
│   │   │   ├── password/route.js  # Change password (revokes other sessions)
│   │   │   ├── account/route.js   # Delete guest account and its data
│   │   │   ├── google/            # Google sign-in: start, callback, status, unlink
│   │   │   └── logout/route.js    # Sign out, session cookie invalidation
│   │   └── storage/route.js       # User-isolated data read/write, PIN unlock, conflict resolution
│   ├── page.jsx, layout.jsx, globals.css
│   ├── error.jsx, global-error.jsx, loading.jsx, not-found.jsx
│   └── manifest.js, robots.js, icon.svg, apple-icon.png, favicon.ico
├── components/                    # UI Views: DashboardView, TransactionsView, BudgetsView,
│                                  # WhatIfSimulatorView, BillsView, ReportsView, WalletsView, SettingsView,
│                                  # Navigation, AuthModal, QuickAddModal, BankStatementModal...
├── context/AppContext.jsx         # Global state management, user data hydration, realtime sync
├── lib/
│   ├── auth-server.js             # Server-side auth, scrypt hashing, HMAC session signing, user registry
│   ├── request-security.js        # Client IP, local-request detection, rate limiting, body size limits
│   ├── google-oauth.js            # Google OAuth/OIDC: PKCE, ID token (JWKS) verification
│   ├── registration.js            # Sign-up switch and rate limits shared by password and Google sign-up
│   ├── storage-validation.js      # Server-side snapshot validation (storage + register)
│   ├── user-data.js               # Per-user data file resolution
│   ├── secure-backup.js           # AES-256-GCM encrypted backups
│   ├── backup-validation.js       # Backup import validation
│   ├── security-logger.js         # Structured security audit log
│   ├── bank-statement-parser.js   # Automated bank statement parsing engine
│   ├── i18n.js                    # Bilingual dictionary (Vietnamese / English)
│   ├── utils.js                   # Financial calculations, balance reconciliation, currency formatting
│   └── mock-data.js               # Initial schema definitions and seed data
└── middleware.js                  # CSRF (Sec-Fetch-Site) guard, auth perimeter, security headers
scripts/reset-password.mjs         # Reset a forgotten password from the server machine
tests/                             # node:test unit tests
data/
├── database.template.json         # Clean schema template (tracked in Git)
├── database.json                  # Host financial data (protected, in .gitignore)
├── users.json                     # User registry with scrypt password hashes (in .gitignore)
├── .session_secret                # HMAC signing key (in .gitignore)
├── .backup_key                    # Backup encryption key (in .gitignore)
├── .host_setup_code               # One-time host setup code, deleted after use (in .gitignore)
└── users/                         # User-isolated storage directory (in .gitignore)
    ├── admin.json                 # Host profile & financial database
    └── usr_<id>.json              # Guest isolated data stores
```

---

## 4. Installation & Getting Started

### Prerequisites
* **Node.js 18.18+** (LTS Node 20 or Node 22 recommended).
* Operating System: Linux / macOS / Windows (WSL2).

### Clone & Install
```bash
git clone https://github.com/vietnamlm05-bit/final-web-app.git
cd final-web-app
npm install
cp .env.example .env   # optional: APP_PASSWORD, APP_SESSION_SECRET, APP_BACKUP_KEY, ALLOW_REGISTRATION...
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
   * First-time setup: choose your password in the login modal and enter the SETUP CODE printed here.

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

### Sign in with Google (optional)
Each Google account can be linked to exactly one FinTrack account (matched by Google's stable account id, not the e-mail).
- **Sign in with Google** – for accounts already linked in *Settings → Account → Link Google*.
- **Sign up with Google** – creates a new guest account bound to that Google account (respects `ALLOW_REGISTRATION` and the sign-up rate limits). It has no password until one is set in Settings.
- **Unlink** – allowed only when the account also has a password, so nobody locks themselves out.

Setup:
1. Google Cloud Console → *APIs & Services → Credentials → Create credentials → OAuth client ID → Web application*.
2. *Authorized redirect URIs*: every address you open the app on + `/api/auth/google/callback`, e.g. `http://localhost:3000/api/auth/google/callback` and `https://<NGROK_DOMAIN>/api/auth/google/callback`. Random `trycloudflare.com` addresses change on every start, so use a fixed domain for Google sign-in.
3. *OAuth consent screen*: while in "Testing", add the Google accounts allowed to sign in as test users.
4. Put `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env` and restart. The Google buttons appear automatically.

Security: authorization code flow with PKCE, `state` and `nonce` kept in a short-lived signed httpOnly cookie, ID token signature checked against Google's JWKS plus issuer / audience / expiry / nonce.

### Quality Checks
```bash
npm run lint    # ESLint (next/core-web-vitals)
npm test        # node:test unit tests (validation, encrypted backups, rate limiting)
npm run build
```
The same checks run on GitHub Actions for every push / pull request (`.github/workflows/ci.yml`).

### Deployment Note
Data lives in JSON files under `data/`, so the app needs a **persistent disk**: your own machine (with `start.sh` tunnels), a VPS or a Docker volume. Serverless hosts such as Vercel only offer a temporary `/tmp`, so data would be lost on every restart or redeploy.

---

## 5. Data Management & Backups

- **Atomic Writes:** During writes, data is flushed to a temporary `.tmp` file prior to renaming (`fs.rename`), guarding against database corruption in the event of abrupt server termination or power loss.
- **Realtime Multi-Device Sync:** The application monitors snapshot versioning. In the event of simultaneous edits across devices, the server triggers conflict resolution (`HTTP 409`) and initiates three-way merging (`mergeSnapshots`), safeguarding all balances and transactions.
- **Manual Backups:** Download complete JSON snapshots at any time via Account Profile $\rightarrow$ **"Backup Data"**.
