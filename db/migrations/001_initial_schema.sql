-- FinTrack Pro: schema v1 (initial schema)
--
-- Run automatically by src/lib/db.js on first connection; applied versions are recorded in
-- schema_migrations. Never edit a migration that has shipped: add a new file NNN_short_name.sql.
-- MySQL commits DDL implicitly, so statements must be safe to re-run (IF NOT EXISTS).
--
-- InnoDB + utf8mb4. Ids use a binary collation (exact match); usernames use the default
-- case-insensitive collation so "Admin" and "admin" cannot both exist. Money is DECIMAL(19,4).

CREATE TABLE IF NOT EXISTS users (
    id                  VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    username            VARCHAR(64) NOT NULL,
    role                ENUM('host', 'guest') NOT NULL,
    display_name        VARCHAR(100) NULL,
    password_salt       VARCHAR(64) NULL,
    password_hash       VARCHAR(128) NULL,
    has_password        TINYINT(1) NOT NULL DEFAULT 0,
    token_version       INT UNSIGNED NOT NULL DEFAULT 1,
    created_at          VARCHAR(40) NOT NULL,
    password_changed_at VARCHAR(40) NULL,
    host_marker         TINYINT AS (IF(role = 'host', 1, NULL)) STORED,
    PRIMARY KEY (id),
    UNIQUE KEY users_username (username),
    UNIQUE KEY users_single_host (host_marker),
    CONSTRAINT users_password_set CHECK (has_password = 0 OR (password_salt IS NOT NULL AND password_hash IS NOT NULL)),
    CONSTRAINT users_token_version CHECK (token_version >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- One row per user: sync version, settings and the App PIN
CREATE TABLE IF NOT EXISTS user_state (
    user_id          VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    updated_at       VARCHAR(40) NOT NULL,
    current_month    VARCHAR(20) NULL,
    planner          JSON NULL,
    simulator_config JSON NULL,
    user_profile     JSON NULL,
    pin_enabled      TINYINT(1) NOT NULL DEFAULT 0,
    pin_salt         VARCHAR(64) NULL,
    pin_hash         VARCHAR(128) NULL,
    PRIMARY KEY (user_id),
    CONSTRAINT user_state_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT user_state_pin CHECK (pin_enabled = 0 OR (pin_salt IS NOT NULL AND pin_hash IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Entity tables: typed columns for what the app relies on, "extra" (JSON) keeps any other field
-- so nothing the client sends is lost; "position" preserves the client's list order.
CREATE TABLE IF NOT EXISTS wallets (
    user_id         VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    id              VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    position        INT UNSIGNED NOT NULL,
    name            TEXT NULL,
    type            ENUM('CASH', 'BANK', 'CREDIT', 'SAVINGS') NULL,
    balance         DECIMAL(19,4) NOT NULL,
    initial_balance DECIMAL(19,4) NOT NULL DEFAULT 0,
    currency        VARCHAR(16) NULL,
    credit_limit    DECIMAL(19,4) NULL,
    interest_rate   DECIMAL(9,4) NULL,
    bank_name       VARCHAR(255) NULL,
    account_number  VARCHAR(64) NULL,
    color           VARCHAR(64) NULL,
    icon            VARCHAR(64) NULL,
    created_at      VARCHAR(40) NULL,
    extra           JSON NULL,
    PRIMARY KEY (user_id, id),
    CONSTRAINT wallets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT wallets_credit_limit CHECK (credit_limit IS NULL OR credit_limit >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS categories (
    user_id  VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    id       VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    position INT UNSIGNED NOT NULL,
    name     TEXT NULL,
    type     ENUM('INCOME', 'EXPENSE') NULL,
    icon     VARCHAR(64) NULL,
    color    VARCHAR(64) NULL,
    extra    JSON NULL,
    PRIMARY KEY (user_id, id),
    CONSTRAINT categories_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Transactions reference wallets of the same user. NO ACTION (not CASCADE) because MySQL does not
-- allow CHECK constraints on columns used by cascading foreign keys; deletes run in explicit order.
CREATE TABLE IF NOT EXISTS transactions (
    user_id        VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    id             VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    position       INT UNSIGNED NOT NULL,
    type           ENUM('INCOME', 'EXPENSE', 'TRANSFER') NOT NULL,
    amount         DECIMAL(19,4) NOT NULL,
    fee            DECIMAL(19,4) NULL,
    date           VARCHAR(40) NULL,
    wallet_id      VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
    wallet_name    TEXT NULL,
    to_wallet_id   VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
    to_wallet_name TEXT NULL,
    category_id    VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
    category_name  TEXT NULL,
    note           TEXT NULL,
    tags           JSON NULL,
    bill_id        VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
    receipt_image  MEDIUMTEXT NULL,
    created_at     VARCHAR(40) NULL,
    extra          JSON NULL,
    PRIMARY KEY (user_id, id),
    KEY transactions_by_date (user_id, date),
    KEY transactions_by_wallet (user_id, wallet_id),
    KEY transactions_by_to_wallet (user_id, to_wallet_id),
    CONSTRAINT transactions_wallet FOREIGN KEY (user_id, wallet_id) REFERENCES wallets(user_id, id),
    CONSTRAINT transactions_to_wallet FOREIGN KEY (user_id, to_wallet_id) REFERENCES wallets(user_id, id),
    CONSTRAINT transactions_amount CHECK (amount > 0),
    CONSTRAINT transactions_fee CHECK (fee IS NULL OR fee >= 0),
    CONSTRAINT transactions_transfer CHECK (type <> 'TRANSFER' OR (wallet_id IS NOT NULL AND to_wallet_id IS NOT NULL AND wallet_id <> to_wallet_id))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS budgets (
    user_id       VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    id            VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    position      INT UNSIGNED NOT NULL,
    category_id   VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
    category_name TEXT NULL,
    amount        DECIMAL(19,4) NULL,
    month         VARCHAR(20) NULL,
    extra         JSON NULL,
    PRIMARY KEY (user_id, id),
    CONSTRAINT budgets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT budgets_amount CHECK (amount IS NULL OR amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS bills (
    user_id              VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    id                   VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    position             INT UNSIGNED NOT NULL,
    name                 TEXT NULL,
    amount               DECIMAL(19,4) NULL,
    category_id          VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
    category_name        TEXT NULL,
    wallet_id            VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
    due_day              TINYINT UNSIGNED NULL,
    frequency            ENUM('MONTHLY', 'QUARTERLY', 'YEARLY') NULL,
    status               VARCHAR(32) NULL,
    last_paid_date       VARCHAR(40) NULL,
    last_payment_tx_id   VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
    reminder_days_before SMALLINT NULL,
    note                 TEXT NULL,
    extra                JSON NULL,
    PRIMARY KEY (user_id, id),
    CONSTRAINT bills_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT bills_amount CHECK (amount IS NULL OR amount >= 0),
    CONSTRAINT bills_due_day CHECK (due_day IS NULL OR due_day BETWEEN 1 AND 31)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS goals (
    user_id        VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    id             VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    position       INT UNSIGNED NOT NULL,
    name           TEXT NULL,
    target_amount  DECIMAL(19,4) NULL,
    current_amount DECIMAL(19,4) NULL,
    deadline       VARCHAR(40) NULL,
    wallet_id      VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
    color          VARCHAR(64) NULL,
    icon           VARCHAR(64) NULL,
    created_at     VARCHAR(40) NULL,
    extra          JSON NULL,
    PRIMARY KEY (user_id, id),
    CONSTRAINT goals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT goals_amounts CHECK ((target_amount IS NULL OR target_amount >= 0) AND (current_amount IS NULL OR current_amount >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS goal_history (
    user_id   VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    goal_id   VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    id        VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    position  INT UNSIGNED NOT NULL,
    date      VARCHAR(40) NULL,
    amount    DECIMAL(19,4) NULL,
    type      ENUM('DEPOSIT', 'WITHDRAW') NULL,
    wallet_id VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
    tx_id     VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
    note      TEXT NULL,
    extra     JSON NULL,
    PRIMARY KEY (user_id, goal_id, id),
    CONSTRAINT goal_history_goal FOREIGN KEY (user_id, goal_id) REFERENCES goals(user_id, id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Encrypted (AES-256-GCM) snapshots; the blob is opaque to the database
CREATE TABLE IF NOT EXISTS secure_backups (
    id         VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    user_id    VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    created_at VARCHAR(40) NOT NULL,
    size       INT UNSIGNED NOT NULL,
    data       LONGBLOB NOT NULL,
    PRIMARY KEY (id),
    KEY secure_backups_by_user (user_id, created_at),
    CONSTRAINT secure_backups_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS app_meta (
    `key`  VARCHAR(64) NOT NULL,
    value  TEXT NOT NULL,
    PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
