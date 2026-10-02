const VALID_TRANSACTION_TYPES = new Set([
    'INCOME',
    'EXPENSE',
    'TRANSFER',
]);

const REQUIRED_ARRAY_FIELDS = [
    'wallets',
    'transactions',
];

const OPTIONAL_ARRAY_FIELDS = [
    'categories',
    'budgets',
    'bills',
    'goals',
];

function isPlainObject(value) {
    return (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value)
    );
}

function isValidId(value) {
    return (
        typeof value === 'string' &&
        value.trim().length > 0 &&
        value.length <= 200
    );
}

function isValidNumber(value, { positive = false } = {}) {
    if (
        value === null ||
        value === undefined ||
        value === ''
    ) {
        return false;
    }

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return false;
    }

    if (positive && number <= 0) {
        return false;
    }

    return true;
}

export function validateBackupData(data) {
    const errors = [];

    // 1. Backup must be an object
    if (!isPlainObject(data)) {
        return ['File backup phải là một JSON object hợp lệ.'];
    }

    // 2. Required fields must exist and be arrays
    for (const field of REQUIRED_ARRAY_FIELDS) {
        if (!Array.isArray(data[field])) {
            errors.push(`Thiếu hoặc sai định dạng trường "${field}".`);
        }
    }

    if (errors.length > 0) {
        return errors;
    }

    // 3. Optional array fields must be arrays if provided
    for (const field of OPTIONAL_ARRAY_FIELDS) {
        if (
            data[field] !== undefined &&
            !Array.isArray(data[field])
        ) {
            errors.push(`Trường "${field}" phải là mảng.`);
        }
    }

    // 4. Validate wallets
    const walletIds = new Set();

    for (let i = 0; i < data.wallets.length; i++) {
        const wallet = data.wallets[i];

        if (!isPlainObject(wallet)) {
            errors.push(`Wallet tại vị trí ${i} không phải object.`);
            continue;
        }

        if (!isValidId(wallet.id)) {
            errors.push(`Wallet tại vị trí ${i} có ID không hợp lệ.`);
            continue;
        }

        if (walletIds.has(wallet.id)) {
            errors.push(`Wallet bị trùng ID: ${wallet.id}.`);
            continue;
        }

        walletIds.add(wallet.id);

        // Legacy backups may lack initialBalance,
        // fallback to balance.
        const startingBalance =
            wallet.initialBalance !== undefined
                ? wallet.initialBalance
                : wallet.balance;

        if (!isValidNumber(startingBalance)) {
            errors.push(
                `Wallet "${wallet.id}" có số dư ban đầu không hợp lệ.`
            );
        }
    }

    // 5. Validate transactions
    const transactionIds = new Set();

    for (let i = 0; i < data.transactions.length; i++) {
        const tx = data.transactions[i];

        if (!isPlainObject(tx)) {
            errors.push(
                `Giao dịch tại vị trí ${i} không phải object.`
            );
            continue;
        }

        if (!isValidId(tx.id)) {
            errors.push(
                `Giao dịch tại vị trí ${i} có ID không hợp lệ.`
            );
            continue;
        }

        if (transactionIds.has(tx.id)) {
            errors.push(`Giao dịch bị trùng ID: ${tx.id}.`);
            continue;
        }

        transactionIds.add(tx.id);

        // Type
        if (!VALID_TRANSACTION_TYPES.has(tx.type)) {
            errors.push(
                `Giao dịch "${tx.id}" có loại không hợp lệ: ${tx.type}.`
            );
        }

        // Amount
        if (!isValidNumber(tx.amount, { positive: true })) {
            errors.push(
                `Giao dịch "${tx.id}" có số tiền không hợp lệ.`
            );
        }

        // walletId
        if (tx.walletId !== undefined) {
            if (
                typeof tx.walletId !== 'string' ||
                !walletIds.has(tx.walletId)
            ) {
                errors.push(
                    `Giao dịch "${tx.id}" tham chiếu wallet không tồn tại.`
                );
            }
        }

        // toWalletId
        if (tx.toWalletId !== undefined) {
            if (
                typeof tx.toWalletId !== 'string' ||
                !walletIds.has(tx.toWalletId)
            ) {
                errors.push(
                    `Giao dịch "${tx.id}" tham chiếu wallet đích không tồn tại.`
                );
            }
        }

        // Transfer-specific validation
        if (tx.type === 'TRANSFER') {
            if (
                typeof tx.walletId !== 'string' ||
                !walletIds.has(tx.walletId)
            ) {
                errors.push(
                    `TRANSFER "${tx.id}" thiếu wallet nguồn hợp lệ.`
                );
            }

            if (
                typeof tx.toWalletId !== 'string' ||
                !walletIds.has(tx.toWalletId)
            ) {
                errors.push(
                    `TRANSFER "${tx.id}" thiếu wallet đích hợp lệ.`
                );
            }

            if (
                typeof tx.walletId === 'string' &&
                typeof tx.toWalletId === 'string' &&
                tx.walletId === tx.toWalletId
            ) {
                errors.push(
                    `TRANSFER "${tx.id}" không thể chuyển trong cùng một wallet.`
                );
            }

            if (tx.fee !== undefined && !isValidNumber(tx.fee)) {
                errors.push(
                    `TRANSFER "${tx.id}" có phí không hợp lệ.`
                );
            }

            if (
                tx.fee !== undefined &&
                Number(tx.fee) < 0
            ) {
                errors.push(
                    `TRANSFER "${tx.id}" có phí âm.`
                );
            }
        }
    }

    // 6. Planner must be an object if provided
    if (
        data.planner !== undefined &&
        !isPlainObject(data.planner)
    ) {
        errors.push('Trường "planner" phải là object.');
    }

    // 7. Simulator config must be an object if provided
    if (
        data.simulatorConfig !== undefined &&
        !isPlainObject(data.simulatorConfig)
    ) {
        errors.push(
            'Trường "simulatorConfig" phải là object.'
        );
    }

    return errors;
}
