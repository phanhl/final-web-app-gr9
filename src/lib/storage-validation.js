/**
 * Server-side validation of a full data snapshot (used by /api/storage and /api/auth/register).
 * Pure module with no imports so it can be unit-tested with plain `node --test`.
 */
export const ARRAY_FIELDS = ['wallets', 'transactions', 'categories', 'budgets', 'bills', 'goals'];
const OBJECT_FIELDS = ['planner', 'userProfile', 'simulatorConfig'];

/**
 * Returns an error message (Vietnamese, shown to the user) or null when the payload is valid.
 */
export function validatePayload(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return 'Dữ liệu không hợp lệ';
    }
    for (const field of ARRAY_FIELDS) {
        if (payload[field] !== undefined && !Array.isArray(payload[field])) {
            return `Trường "${field}" phải là mảng`;
        }
    }
    if (!Array.isArray(payload.wallets) || !Array.isArray(payload.transactions)) {
        return 'Thiếu dữ liệu ví hoặc giao dịch';
    }

    const walletIds = new Set();

    for (let i = 0; i < payload.wallets.length; i++) {
        const w = payload.wallets[i];

        if (
            !w ||
            typeof w !== 'object' ||
            Array.isArray(w) ||
            typeof w.id !== 'string' ||
            !w.id.trim()
        ) {
            return `Ví tại vị trí ${i} không hợp lệ`;
        }

        if (walletIds.has(w.id)) {
            return `Ví bị trùng ID: ${w.id}`;
        }

        walletIds.add(w.id);

        const balance = Number(w.balance);

        if (
            w.balance === null ||
            w.balance === '' ||
            !Number.isFinite(balance)
        ) {
            return `Số dư của ví tại vị trí ${i} không hợp lệ`;
        }
    }

    const transactionIds = new Set();

    for (let i = 0; i < payload.transactions.length; i++) {
        const tx = payload.transactions[i];

        if (
            !tx ||
            typeof tx !== 'object' ||
            Array.isArray(tx) ||
            typeof tx.id !== 'string' ||
            !tx.id.trim()
        ) {
            return `Giao dịch tại vị trí ${i} không hợp lệ`;
        }

        if (transactionIds.has(tx.id)) {
            return `Giao dịch bị trùng ID: ${tx.id}`;
        }

        transactionIds.add(tx.id);

        if (!['INCOME', 'EXPENSE', 'TRANSFER'].includes(tx.type)) {
            return `Loại giao dịch của ${tx.id} không hợp lệ`;
        }

        const amount = Number(tx.amount);

        if (
            tx.amount === null ||
            tx.amount === '' ||
            !Number.isFinite(amount) ||
            amount <= 0
        ) {
            return `Số tiền giao dịch tại vị trí ${i} không hợp lệ`;
        }

        if (tx.walletId !== undefined) {
            if (
                typeof tx.walletId !== 'string' ||
                !walletIds.has(tx.walletId)
            ) {
                return `Giao dịch ${tx.id} tham chiếu ví không tồn tại`;
            }
        }

        if (tx.toWalletId !== undefined) {
            if (
                typeof tx.toWalletId !== 'string' ||
                !walletIds.has(tx.toWalletId)
            ) {
                return `Giao dịch ${tx.id} tham chiếu ví đích không tồn tại`;
            }
        }
        
        if (tx.type === 'TRANSFER') {
            if (typeof tx.walletId !== 'string' || !walletIds.has(tx.walletId)) {
                return `Giao dịch chuyển khoản ${tx.id} thiếu ví nguồn hợp lệ`;
            }

            if (typeof tx.toWalletId !== 'string' || !walletIds.has(tx.toWalletId)) {
                return `Giao dịch chuyển khoản ${tx.id} thiếu ví đích hợp lệ`;
            }

            if (tx.walletId === tx.toWalletId) {
                return `Giao dịch chuyển khoản ${tx.id} không thể chuyển trong cùng một ví`;
            }

            const fee = Number(tx.fee);

            if (
                tx.fee !== undefined &&
                (
                    tx.fee === null ||
                    tx.fee === '' ||
                    !Number.isFinite(fee) ||
                    fee < 0
                )
            ) {
                return `Phí chuyển khoản của giao dịch ${tx.id} không hợp lệ`;
            }
        }
    }

    for (const field of OBJECT_FIELDS) {
        const value = payload[field];
        if (value !== undefined && value !== null && (typeof value !== 'object' || Array.isArray(value))) {
            return `Trường "${field}" phải là object`;
        }
    }
    if (payload.currentMonth !== undefined && (typeof payload.currentMonth !== 'string' || payload.currentMonth.length > 20)) {
        return 'Trường "currentMonth" không hợp lệ';
    }

    return null;
}

const NUMERIC_FIELDS = {
    wallets: ['balance', 'initialBalance', 'creditLimit', 'interestRate'],
    transactions: ['amount', 'fee'],
    budgets: ['amount'],
    bills: ['amount', 'dueDay', 'reminderDaysBefore'],
    goals: ['targetAmount', 'currentAmount'],
};

/**
 * Coerce numeric strings ("200000") to numbers. Validation accepts numeric strings (old backups have them),
 * but storing them as strings makes `sum + t.amount` concatenate text in the UI.
 * Returns a new object; values that are not numeric strings are left untouched.
 */
export function normalizeSnapshotNumbers(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return snapshot;
    const out = { ...snapshot };
    for (const [field, keys] of Object.entries(NUMERIC_FIELDS)) {
        if (!Array.isArray(out[field])) continue;
        out[field] = out[field].map((item) => {
            if (!item || typeof item !== 'object') return item;
            let copy = item;
            for (const key of keys) {
                const value = item[key];
                if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
                    if (copy === item) copy = { ...item };
                    copy[key] = Number(value);
                }
            }
            return copy;
        });
    }
    return out;
}
