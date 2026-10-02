# FinTrack Pro - Multi-User Expense Management & Financial Simulation System

---

A comprehensive personal finance management web application featuring multi-wallet expense tracking, intelligent budgeting, recurring bills, savings goals, automated bank statement import, and **What-If financial simulations**.

The system features **Multi-User Isolation** with a rigorous defense-in-depth security architecture: a dedicated Host (`admin`) account and self-registered Guest accounts, each assigned an isolated `User ID`. Data is persisted securely in a server-side **MySQL** database and is **never committed to Git**. The application provides a bilingual interface (**Vietnamese / English**), **Light / Dark mode**, and delivers a responsive experience across smartphones, tablets, and desktops (with PWA / install-to-home-screen support).

---

## 1. Key Features

### Multi-User Accounts & Access Control
- **Mandatory Authentication:** Modern Glassmorphism welcome interface with Login / Register dialogs, blocking all unauthorized access.
- **Host Account (Owner):** Dedicated `admin` account housing complete actual financial records (wallets, bank accounts, transaction histories). The password is configured via the `APP_PASSWORD` environment variable, or initialized during the first login using a **one-time setup code** printed to the server terminal (`data/.host_setup_code`), ensuring public link visitors cannot seize administrative privileges.
- **Guest Accounts:** Visitors access the application link and select **"Create Guest Account"**. Each guest receives an isolated `User ID` (`usr_...`) initialized with clean default data: one Cash wallet, one Bank account (both with 0 ₫ balance), and default categories. Guests cannot view or modify Host data and vice versa.
- **Session Management:** Role badges (Host / Guest) displayed in the top navigation bar alongside a secure **Logout** button.
- **Account Settings:** Password updates (automatically invalidating active sessions across other devices) and permanent guest account deletion with all associated data. In case of forgotten credentials, passwords can be reset directly on the server via `npm run reset-password -- <username>`.
- **App PIN Lock:** Optional 4–8 digit PIN required on each browser (after each login and periodically every 12 hours) before financial data is decrypted and rendered. The account password can also serve as a recovery fallback on the PIN entry screen.

### Wallet & Asset Management
- **4 Dedicated Wallet Types:** Cash, Bank Account, Credit Card (custom credit limits, segregated liability tracking), and Savings Account (interest rate tracking).
- Automated calculation of **Available Balance** and **Net Worth**; credit card liabilities are strictly segregated to reflect an accurate financial overview.
- **Credit Card Debt Settlement:** Deduct funds from cash / bank accounts to pay off credit cards (recorded as an internal transfer, avoiding double-counting in expenses).
- **Balance Reconciliation:** One-click *"Recalculate Balances"* feature reconstructs exact balances for each wallet from its opening balance plus cumulative transaction history.

### Transaction Logging & Quick Entry
- Log expenses and income; classify with tags and notes; attach **receipt photos** (automatically compressed before storage); edit or delete transactions with automated balance rollback. Transactions are sorted by date and support flexible bilingual search.
- **Quick Add Dialog:** Instant access from any screen, featuring quick-amount buttons (+50k, +100k, +200k, +500k, +1M, +2M, +5M).
- Smart validation: anti-overdraft checks, credit limit boundaries, prevention of future-dated transactions; standardized date formatting across the app.

### Automated Bank Statement Parser
- Upload **Excel (.xlsx, .xls)** or **CSV** files. Automatically recognizes statement formats from 14 Vietnamese banks (Techcombank, Vietcombank, MB Bank, VPBank, ACB, BIDV, VietinBank, TPBank, VIB, Agribank, Sacombank, Timo, HDBank, Cake by VPBank); other formats can be manually mapped to respective wallets.
- Duplicate transaction detection, smart category suggestions based on transfer descriptions, and invalid date filtering.

### Budgeting & Savings Goals
- Establish category spending thresholds with automated warning indicators: **80% warning threshold** (amber) and **100% over-budget limit** (red).
- Income allocation based on envelope / multi-pot budgeting with an emergency reserve fund.
- **Financial Goals:** Deposit/withdraw funds directly to/from wallets, complete with celebratory confetti animations upon goal attainment.

### Recurring Bills & Subscriptions
- Track electricity, water, internet, and rent across **Monthly / Quarterly / Yearly** cycles.
- Accurate calendar due-date calculation, visual countdown timers, and proactive status notifications for upcoming or overdue bills.
- **"Pay Now"** button immediately generates the corresponding expense transaction and deducts funds from the selected wallet (defaulting to wallets with sufficient balance); unmarking payment refunds the balance to the wallet.
- Notification bell icon in the header alerts users to upcoming/overdue bills and exceeded budgets.

### What-If Financial Simulation
- Test hypothetical future financial scenarios: expense reduction sliders (0–50%), monthly savings accumulation, investment market scenarios, and external loan amortization.
- Multi-timeframe forecasting (**6 / 12 / 24 / 36 months**) with interactive charts comparing baseline growth trajectories against simulation models.

### Reports & Data Export
- Visual analytics for spending breakdown, monthly cash flow trends, and net income trajectories.
- Export data to **multi-sheet Excel workbooks (.xlsx)** (transactions, wallets, budgets, executive summary) and **UTF-8 CSV** based on selected language (formula injection protection escaping `= + - @` cells).

---

## 2. Rigorous Security Architecture

FinTrack Pro is built on a defense-in-depth security model:

| Security Layer | Technical Implementation |
|---|---|
| **Password Hashing** | One-way hashing using **`scrypt`** paired with cryptographically secure 16-byte random salts. Plaintext passwords are never stored. Verification via `crypto.timingSafeEqual` prevents timing attacks. |
| **Brute-Force Protection** | Rate limits login / PIN attempts **per IP (5 attempts / 15 mins)** and **per account (10 attempts / 15 mins)**; attempts are counted atomically prior to verification, neutralizing concurrent bursts and `X-Forwarded-For` IP spoofing. Client IP resolution prioritizes `cf-connecting-ip` or the rightmost trusted proxy hop. Requests originating directly from the host machine are exempt from account lockouts to prevent denial-of-service lockout attacks against the owner. Account registrations are rate-limited to 5 accounts / IP / hour and bounded by `MAX_REGISTRATIONS_PER_HOUR` system-wide; registrations can be disabled via `ALLOW_REGISTRATION=false`. Payload sizes are strictly bounded (1 MB for registration, 20 MB for data sync to accommodate receipt images). Hashing uses asynchronous `scrypt` to prevent event loop blocking. |
| **Host Account Setup** | First-time `admin` setup strictly requires either the `APP_PASSWORD` environment variable or a one-time setup code retrieved from the server console. |
| **Session Protection** | Session cookies (`fintrack_session`) are cryptographically signed with **HMAC-SHA256** (using `APP_SESSION_SECRET` or `data/.session_secret`), flagged with `HttpOnly`, `SameSite=lax`, 7-day TTL, and immediately invalidated upon logout or password reset (`tokenVersion`). |
| **App PIN Lock** | Entering the PIN (or account password) issues a short-lived `HttpOnly` cookie (`fintrack_unlock`, 12-hour TTL, cryptographically bound to the PIN hash and session). Logging in **does not** automatically unlock the PIN. PINs and passwords are **strictly never stored in localStorage / sessionStorage**; legacy artifacts from previous versions are purged on page load. |
| **CSRF Defense & Security Headers** | State-changing API calls originating from foreign origins (`Sec-Fetch-Site: cross-site / same-site`) are rejected. Strict CSP without `unsafe-eval` in production, `frame-ancestors 'none'`, HSTS, and `X-Content-Type-Options: nosniff`. |
| **Encrypted Backups** | Standard AES-256-GCM encryption with `APP_BACKUP_KEY` or `data/.backup_key`; the server rejects backup creation if a dedicated key is missing rather than falling back to default keys. |
| **Data Isolation** | Server derives `userId` exclusively from the authenticated session signature (Zero Trust Client principle). Every row in MySQL is scoped to a `user_id` (financial tables use composite primary keys `(user_id, id)`), and all queries filter by the session `user_id`, preventing any cross-tenant data leakage. All SQL statements use parameterized `?` placeholders (preventing SQL injection). |
| **Database Security** | MySQL listens exclusively on `127.0.0.1` (no public network exposure); the application connects using a dedicated non-root `fintrack` user. Database constraints (foreign keys, `CHECK` amount > 0, valid transaction types, unique usernames, single host constraint) enforce data integrity even if application-level checks are bypassed. |
| **Filesystem Permissions** | The `data/` directory (housing secret keys) is enforced with **`0700`** permissions, and key files with **`0600`**; database backup dumps (`npm run db:backup`) are likewise written with `0600` permissions. |
| **Git Exclusion Security** | `.gitignore` strictly excludes `data/*.json` (except template file), `data/users/`, `data/legacy-json-*/`, `data/.session_secret`, `data/.backup_key`, `data/.host_setup_code`, `backups/`, and `.env`. When pushing source code to GitHub, **all financial records, user accounts, and cryptographic keys remain strictly on your local machine and are never exposed**. |

---

## 3. Tech Stack

| Component | Technology |
|---|---|
| **Framework** | **Next.js 15** (App Router), **React 19**, JavaScript (JSX) |
| **UI & Styling** | **Tailwind CSS v4**, **Lucide React** (icons), Canvas-Confetti |
| **Data Visualization** | **Recharts** |
| **Spreadsheet Processing** | **SheetJS (xlsx)** |
| **Authentication & Cryptography** | Node.js built-in `crypto` module (scrypt, HMAC-SHA256, timingSafeEqual, AES-256-GCM) |
| **State Management** | React Context (`src/context/AppContext.jsx`) |
| **Database** | **MySQL 8.4** (`mysql2` library), containerized via Docker / Podman using `docker-compose.yml`. Every save is an **ACID transaction**: write fully or roll back completely |

### Source Tree
```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.js     # Authentication, Host initialization, Rate limiting
│   │   │   ├── register/route.js  # Guest account registration, User ID issuance & isolated data seeding
│   │   │   ├── me/route.js        # Current session verification (503 if database is unreachable)
│   │   │   ├── password/route.js  # Password update (invalidates all other active sessions)
│   │   │   ├── account/route.js   # Guest account deletion and associated data purging
│   │   │   └── logout/route.js    # Logout, session cookie revocation
│   │   └── storage/route.js       # Per-user data I/O, PIN unlock, version conflict resolution, encrypted backups
│   ├── page.jsx, layout.jsx, globals.css
│   ├── error.jsx, global-error.jsx, loading.jsx, not-found.jsx
│   └── manifest.js, robots.js, icon.svg, apple-icon.png, favicon.ico
├── components/                    # UI Views & Components: DashboardView, TransactionsView, BudgetsView,
│                                  # WhatIfSimulatorView, BillsView, ReportsView, WalletsView, SettingsView,
│                                  # Navigation, Sidebar, AuthModal, QuickAddModal, BankStatementModal,
│                                  # ReceiptModal, ConfirmModal, DatePreview, LanguageSwitcher, IconHelper
├── context/AppContext.jsx         # Global state management, user data hydration, real-time sync
├── lib/
│   ├── auth-server.js             # Server-side auth, scrypt hashing, HMAC session signing, Host account init
│   ├── db.js                      # MySQL connection pool, migration execution, transaction management
│   ├── store.js                   # User data persistence in MySQL tables, version conflict checking
│   ├── legacy-import.js           # One-time migration from legacy JSON file storage to MySQL
│   ├── request-security.js        # Client IP resolution, loopback detection, rate limiting, body size limits
│   ├── registration.js            # Registration toggle (ALLOW_REGISTRATION) & registration rate limiter
│   ├── storage-validation.js      # Server-side data snapshot schema validation (storage + register)
│   ├── secure-backup.js           # AES-256-GCM encrypted backup engine
│   ├── backup-validation.js       # Backup file integrity validation prior to restoration
│   ├── security-logger.js         # Structured security audit logger
│   ├── bank-statement-parser.js   # Automated bank statement parsing engine
│   ├── i18n.js                    # Bilingual dictionary (Vietnamese / English)
│   ├── utils.js                   # Financial utilities, balance reconciliation, currency formatting, 3-way merge
│   └── mock-data.js               # Default user account seeding data and mock dataset
└── middleware.js                  # CSRF protection (Sec-Fetch-Site), auth boundaries, security headers
db/migrations/
└── 001_initial_schema.sql         # SQL schema definitions creating 11 core tables (CREATE TABLE)
scripts/
├── reset-password.mjs             # CLI tool to reset forgotten passwords directly on server (npm run reset-password)
├── db-check.mjs                   # Verifies MySQL connectivity, applies schema migrations (npm run db:check)
├── db-backup.mjs                  # Full database backup dump to .sql.gz (npm run db:backup)
└── env.mjs                        # Environment variable loader for standalone scripts
tests/                             # node:test test suites (unit, migrations, MySQL integration tests)
public/                            # Static assets and PWA icons (icon-192.png, icon-512.png)
.github/workflows/ci.yml           # CI workflow: lint, test (with MySQL), build, dependency audit
docker-compose.yml                 # MySQL 8.4 service (bound strictly to 127.0.0.1, persistent volume)
start.sh, stop.sh                  # Automation scripts: start (checks MySQL, builds, runs daemon, starts tunnel) / stop
next.config.mjs                    # Next.js configuration and security headers (CSP, HSTS, frame options)
.env.example                       # Environment variables template (copy to .env)
data/                              # Cryptographic keys (.gitignored) and templates
├── database.template.json         # JSON schema template matching backup snapshots (tracked in Git; not read at runtime)
├── .session_secret                # HMAC signing secret
├── .backup_key                    # Encrypted backup encryption key
├── .host_setup_code               # One-time host setup code (self-deleted after use)
└── legacy-json-<timestamp>/       # Archived legacy JSON files retained after MySQL migration
backups/                           # Database dumps from npm run db:backup (.gitignored)
```

### Database Schema (MySQL)
| Table | Description |
|---|---|
| `users` | Accounts: username (case-insensitive, unique), role (`host` / `guest`), password hash + salt, `token_version` |
| `user_state` | One row per account: sync version (`updated_at`), active viewing month, financial plan, simulation settings, profile, PIN hash |
| `wallets`, `categories`, `transactions`, `budgets`, `bills`, `goals`, `goal_history` | Financial entities scoped by `user_id`. Transactions enforce foreign keys to wallets; monetary values stored using `DECIMAL(19,4)` (eliminates floating-point rounding errors) |
| `secure_backups` | AES-256-GCM encrypted backup records (up to 20 backups per account) |
| `schema_migrations`, `app_meta` | Applied migration versions, system metadata |

Schema definitions are written in pure SQL within `db/migrations/`. On first startup (or via `npm run db:check`), pending migrations are executed sequentially and recorded in `schema_migrations`, ensuring idempotent execution. To alter schema in future releases, **add a new migration file** (e.g. `002_add_wallet_note.sql`) without modifying previously released migrations.

---

## 4. Installation & Getting Started

### System Requirements
* **Node.js 18.18+** for building and running the application; **Node.js 22.15+** to run the test suite (`npm test`). Node 22 LTS is recommended (used in CI).
* **MySQL 8.4**: Most conveniently run via **Docker** (or Podman) using the provided `docker-compose.yml`, or standalone MySQL 8+.
* Operating System: Linux / macOS / Windows (WSL2).

### Clone & Installation
```bash
git clone https://github.com/vietnamlm05-bit/final-web-app.git
cd final-web-app
npm install
cp .env.example .env   # configure MYSQL_PASSWORD, MYSQL_ROOT_PASSWORD, DATABASE_URL; optional: APP_PASSWORD, ALLOW_REGISTRATION...
```

### Database Setup (MySQL)
1. Open `.env`, generate two random passwords (e.g. `openssl rand -hex 16`) for `MYSQL_ROOT_PASSWORD` and `MYSQL_PASSWORD`, then specify the **matching `MYSQL_PASSWORD`** in `DATABASE_URL`:
   ```bash
   DATABASE_URL=mysql://fintrack:<MYSQL_PASSWORD>@127.0.0.1:3306/fintrack
   ```
2. Start MySQL and verify the connection (the second command applies pending migrations):
   ```bash
   docker compose up -d db
   npm run db:check
   ```
3. **Upgrading from legacy JSON file storage:** Simply keep the existing `data/` folder intact. On the first run with an empty database, the application automatically migrates all accounts (preserving password hashes), financial records, and encrypted backups into MySQL within **a single atomic transaction**: if any step fails, changes roll back and JSON files remain untouched. Once successfully imported, JSON files are archived (not deleted) into `data/legacy-json-<timestamp>/`.

If MySQL goes down while the application is running, the web UI displays a *"Server temporarily unavailable"* notice with a *Retry* button (without logging the user out); the app reconnects automatically once MySQL resumes.

### Running with Dual-Link Access (Recommended)
The project includes an automated startup script that builds the production release and initializes a secure internet tunnel:

```bash
./start.sh
```

Upon successful startup, the terminal will display 2 access URLs (both links point to the same instance; the separation is a recommended access convention):
```text
==================================================================
FinTrack Pro has started successfully with Multi-User Isolation!

👉 LINK 1 (HOST / LOCAL ACCESS):
   http://localhost:3000
   * Login with username: admin
   * First-time setup: choose a password in the login dialog and enter the SETUP CODE printed here.

👉 LINK 2 (GUEST / REMOTE ACCESS):
   https://<your-ngrok-subdomain>.ngrok-free.dev (or Cloudflare Tunnel URL)
   * Guests open this link and click "Create Guest Account" to register.
   * Each guest receives an isolated User ID and independent financial store.
==================================================================
```

### Stopping the Service
```bash
./stop.sh                 # stops the application and tunnel; MySQL remains running
docker compose stop db    # (optional) stops MySQL; data is preserved in Docker volume
```

### Alternative Run Modes
* **Local-Only Mode (No public tunnel):**
  ```bash
  NO_TUNNEL=1 ./start.sh
  ```
* **Development Mode:**
  ```bash
  npm run dev
  ```

### Code Quality & Testing
```bash
npm run lint    # Code linting with ESLint (next/core-web-vitals)
npm test        # Runs node:test suite: balances & data merge, bills, statement parser, auth, crypto backups, rate limiting, migration validation
npm run build   # Production build
```
MySQL integration tests (data I/O, sync conflicts, database constraints, legacy JSON migration) run when `TEST_DATABASE_URL` is set pointing to a **dedicated test database**, as all tables in that database are wiped:
```bash
TEST_DATABASE_URL=mysql://fintrack:<password>@127.0.0.1:3306/fintrack_test npm test
```
These checks run automatically on GitHub Actions on every push and pull request (`.github/workflows/ci.yml`), where a MySQL 8.4 service container is provisioned for integration tests.

### Deployment Notes
Application data resides in MySQL (when using `docker-compose.yml`: volume `fintrack-mysql-data`), while cryptographic keys are stored in `data/`. The application is well-suited for personal computers (with tunneling via `start.sh`) or cloud VPS instances. When migrating servers, ensure **both** the database backup dump and the `data/` directory are transferred (without `.backup_key`, encrypted backups cannot be decrypted).

---

## 5. Data Management & Backups

- **Transactional Writes:** Every write operation is wrapped in a MySQL (InnoDB) transaction: changes are committed atomically or rolled back entirely, even across sudden power loss or server termination. The account's `user_state` row is locked (`SELECT ... FOR UPDATE`) during version comparison, eliminating concurrent overwrite race conditions across multiple devices.
- **Multi-Device Real-Time Sync:** The application tracks snapshot version timestamps. If a client attempts to save against a stale snapshot (another device saved first), the server returns `HTTP 409` with the latest server snapshot; the browser performs a 3-way merge (`mergeSnapshots`) and resubmits, preserving balances and all newly added transactions.
- **Offline Editing:** Changes made during network disconnection are preserved locally on the client (flagged with *Offline* status) and automatically synced and merged once connection is restored; attempting to log out with unsynced changes triggers a confirmation warning.
- **JSON Snapshot Backups:** Download full JSON snapshots from *Settings* (Data & Backup section) or the user menu, and restore them directly. Backwards compatibility handles older formats seamlessly (recalculating balances from ledger history, coercing string numbers to numeric).
- **Full Database Dumps:** `npm run db:backup` exports a consistent dump of all accounts to `backups/fintrack-<timestamp>.sql.gz` without requiring `mysqldump` to be installed on the host. Restore via:
  ```bash
  gunzip -c backups/<file>.sql.gz | docker exec -i fintrack-mysql mysql -u fintrack -p<MYSQL_PASSWORD> fintrack
  ```
- **Encrypted Server Backups:** *Settings → Secure Backups* maintains up to 20 AES-256-GCM encrypted snapshot slots per account on the server; restoring any backup automatically takes a pre-restore safety snapshot of the current state.
