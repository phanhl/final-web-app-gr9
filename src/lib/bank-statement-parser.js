import * as XLSX from 'xlsx';

/**
 * Configuration list of popular banks in Vietnam for automatic statement recognition
 */
export const SUPPORTED_BANKS = [
    {
        code: 'TCB',
        name: 'Techcombank',
        fullName: 'Ngân hàng TMCP Kỹ thương Việt Nam',
        keywords: ['techcombank', 'tcb', 'ky thuong', 'tmcp ky thuong', 'techcom bank', 'techcombank.com.vn', 'vietnam technological and commercial'],
        color: '#ED1C24',
        icon: 'CreditCard',
        accountRegex: /(?:s[oố]\s*t[aà]i\s*kho[aả]n|s[oố]\s*tk|account\s*no|acct\s*no|stk|a\/c)[\s:\.\-]+([0-9]{12,16})/i,
    },
    {
        code: 'VCB',
        name: 'Vietcombank',
        fullName: 'Ngân hàng TMCP Ngoại thương Việt Nam',
        keywords: ['vietcombank', 'vcb', 'ngoai thuong', 'tmcp ngoai thuong', 'vietcom bank', 'vcb.com.vn', 'foreign trade of vietnam'],
        color: '#007A33',
        icon: 'Building2',
        accountRegex: /(?:s[oố]\s*t[aà]i\s*kho[aả]n|s[oố]\s*tk|account\s*no|acct\s*no|stk|a\/c)[\s:\.\-]+([0-9]{10,14})/i,
    },
    {
        code: 'MBB',
        name: 'MB Bank',
        fullName: 'Ngân hàng TMCP Quân đội',
        keywords: ['mb bank', 'mbbank', 'military bank', 'quan doi', 'tmcp quan doi', 'mbb', 'mbbank.com.vn'],
        color: '#0047BA',
        icon: 'Building2',
        accountRegex: /(?:s[oố]\s*t[aà]i\s*kho[aả]n|s[oố]\s*tk|account\s*no|acct\s*no|stk|a\/c)[\s:\.\-]+([0-9]{9,15})/i,
    },
    {
        code: 'VPB',
        name: 'VPBank',
        fullName: 'Ngân hàng TMCP Việt Nam Thịnh Vượng',
        keywords: ['vpbank', 'vpb', 'viet nam thinh vuong', 'thinh vuong', 'tmcp viet nam thinh vuong', 'vp bank', 'vpbank.com.vn'],
        color: '#00A651',
        icon: 'CreditCard',
        accountRegex: /(?:s[oố]\s*t[aà]i\s*kho[aả]n|s[oố]\s*tk|account\s*no|acct\s*no|stk|a\/c)[\s:\.\-]+([0-9]{8,14})/i,
    },
    {
        code: 'ACB',
        name: 'ACB Bank',
        fullName: 'Ngân hàng TMCP Á Châu',
        keywords: ['acb', 'a chau', 'tmcp a chau', 'asia commercial', 'acb.com.vn'],
        color: '#005CA9',
        icon: 'Building2',
        accountRegex: /(?:s[oố]\s*t[aà]i\s*kho[aả]n|s[oố]\s*tk|account\s*no|acct\s*no|stk|a\/c)[\s:\.\-]+([0-9]{7,12})/i,
    },
    {
        code: 'BIDV',
        name: 'BIDV',
        fullName: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam',
        keywords: ['bidv', 'dau tu va phat trien', 'tmcp dau tu va phat trien', 'bidv.com.vn'],
        color: '#006738',
        icon: 'Building2',
        accountRegex: /(?:s[oố]\s*t[aà]i\s*kho[aả]n|s[oố]\s*tk|account\s*no|acct\s*no|stk|a\/c)[\s:\.\-]+([0-9]{12,16})/i,
    },
    {
        code: 'CTG',
        name: 'VietinBank',
        fullName: 'Ngân hàng TMCP Công thương Việt Nam',
        keywords: ['vietinbank', 'vietin', 'cong thuong', 'tmcp cong thuong', 'vietin bank', 'vietinbank.vn'],
        color: '#005baa',
        icon: 'Building2',
        accountRegex: /(?:s[oố]\s*t[aà]i\s*kho[aả]n|s[oố]\s*tk|account\s*no|acct\s*no|stk|a\/c)[\s:\.\-]+([0-9]{10,16})/i,
    },
    {
        code: 'TPB',
        name: 'TPBank',
        fullName: 'Ngân hàng TMCP Tiên Phong',
        keywords: ['tpbank', 'tpb', 'tien phong', 'tmcp tien phong', 'tpb.com.vn'],
        color: '#802682',
        icon: 'CreditCard',
        accountRegex: /(?:s[oố]\s*t[aà]i\s*kho[aả]n|s[oố]\s*tk|account\s*no|acct\s*no|stk|a\/c)[\s:\.\-]+([0-9]{8,14})/i,
    },
    {
        code: 'VIB',
        name: 'VIB',
        fullName: 'Ngân hàng TMCP Quốc tế Việt Nam',
        keywords: ['vib', 'quoc te', 'tmcp quoc te', 'vib.com.vn'],
        color: '#00539B',
        icon: 'Building2',
        accountRegex: /(?:s[oố]\s*t[aà]i\s*kho[aả]n|s[oố]\s*tk|account\s*no|acct\s*no|stk|a\/c)[\s:\.\-]+([0-9]{9,15})/i,
    },
    {
        code: 'VBA',
        name: 'Agribank',
        fullName: 'Ngân hàng Nông nghiệp & Phát triển Nông thôn Việt Nam',
        keywords: ['agribank', 'nong nghiep', 'vba', 'agribank.com.vn'],
        color: '#7b1113',
        icon: 'Building2',
        accountRegex: /(?:s[oố]\s*t[aà]i\s*kho[aả]n|s[oố]\s*tk|account\s*no|acct\s*no|stk|a\/c)[\s:\.\-]+([0-9]{13,16})/i,
    },
    {
        code: 'STB',
        name: 'Sacombank',
        fullName: 'Ngân hàng TMCP Sài Gòn Thương Tín',
        keywords: ['sacombank', 'stb', 'sai gon thuong tin', 'sacombank.com.vn'],
        color: '#004c8f',
        icon: 'Building2',
        accountRegex: /(?:s[oố]\s*t[aà]i\s*kho[aả]n|s[oố]\s*tk|account\s*no|acct\s*no|stk|a\/c)[\s:\.\-]+([0-9]{10,14})/i,
    },
    {
        code: 'TIMO',
        name: 'Timo',
        fullName: 'Ngân hàng số Timo Digital Bank',
        keywords: ['timo', 'timo digital bank', 'timo.vn'],
        color: '#6c24be',
        icon: 'CreditCard',
        accountRegex: /(?:s[oố]\s*t[aà]i\s*kho[aả]n|s[oố]\s*tk|account\s*no|acct\s*no|stk|a\/c)[\s:\.\-]+([0-9]{9,14})/i,
    },
    {
        code: 'HDB',
        name: 'HDBank',
        fullName: 'Ngân hàng TMCP Phát triển TP.HCM',
        keywords: ['hdbank', 'hdb', 'phat trien tphcm', 'hdbank.com.vn'],
        color: '#d6001c',
        icon: 'Building2',
        accountRegex: /(?:s[oố]\s*t[aà]i\s*kho[aả]n|s[oố]\s*tk|account\s*no|acct\s*no|stk|a\/c)[\s:\.\-]+([0-9]{10,15})/i,
    },
    {
        code: 'CAKE',
        name: 'Cake by VPBank',
        fullName: 'Ngân hàng số Cake by VPBank',
        keywords: ['cake', 'cake by vpbank', 'ngan hang so cake'],
        color: '#ff2882',
        icon: 'CreditCard',
        accountRegex: /(?:s[oố]\s*t[aà]i\s*kho[aả]n|s[oố]\s*tk|account\s*no|acct\s*no|stk|a\/c)[\s:\.\-]+([0-9]{10})/i,
    },
];

/**
 * Automatically identify bank and account number from header, sheet content, and file name
 */
export function detectBankAndAccount(file, rows = [], workbook = null) {
    const rawFileName = file?.name || '';
    const normFileName = normalizeText(rawFileName);

    // Collect header rows (title, issuer information)
    const headerLines = [];
    const scanLimit = Math.min(rows.length, 35);
    for (let i = 0; i < scanLimit; i++) {
        const row = rows[i];
        if (Array.isArray(row)) {
            const line = row.filter(c => c !== null && c !== undefined && c !== '').join(' ');
            if (line.trim()) headerLines.push(line);
        } else if (typeof row === 'string' && row.trim()) {
            headerLines.push(row);
        }
    }
    const fullHeaderText = headerLines.join('\n');
    const normHeaderText = normalizeText(fullHeaderText);

    const sheetNames = workbook?.SheetNames || [];
    const normSheetNames = normalizeText(sheetNames.join(' '));

    // Bank recognition scoring
    let bestBank = null;
    let highestScore = 0;

    for (const bank of SUPPORTED_BANKS) {
        let score = 0;

        for (const kw of bank.keywords) {
            const normKw = normalizeText(kw);
            if (!normKw) continue;

            // 1. Matches in file header text (highest weight: 10)
            if (normHeaderText.includes(normKw)) {
                score += 10;
            }

            // 2. Matches in sheet name (weight: 5)
            if (normSheetNames.includes(normKw)) {
                score += 5;
            }

            // 3. Matches in file name (weight: 4)
            if (normFileName.includes(normKw)) {
                score += 4;
            }
        }

        if (score > highestScore) {
            highestScore = score;
            bestBank = bank;
        }
    }

    // Detect account number from metadata
    let detectedAccountNumber = null;
    let detectedAccountHolder = null;

    // Scan for account number
    const accMatches = fullHeaderText.match(/(?:s[oố]\s*t[aà]i\s*kho[aả]n|s[oố]\s*tk|account\s*no|acct\s*no|stk|a\/c\s*no)[\s:\.\-]+([0-9\s]{8,20})/i);
    if (accMatches && accMatches[1]) {
        detectedAccountNumber = accMatches[1].replace(/\s/g, '').trim();
    }

    // Scan for account holder name
    const nameMatches = fullHeaderText.match(/(?:t[eê]n\s*ch[uủ]\s*t[aà]i\s*kho[aả]n|ch[uủ]\s*tk|t[eê]n\s*kh[aá]ch\s*h[aà]ng|account\s*name|customer\s*name)[\s:\.\-]+([^\n\r,;]{3,50})/i);
    if (nameMatches && nameMatches[1]) {
        detectedAccountHolder = nameMatches[1].trim();
    }

    return {
        detectedBank: bestBank,
        confidenceScore: highestScore,
        detectedAccountNumber,
        detectedAccountHolder,
    };
}

/**
 * Keywords for identifying columns in bank statements
 * Ordered from specific/longer phrases to shorter ones to avoid false matches
 */
const COLUMN_PATTERNS = {
    ref: [
        'số tham chiếu', 'so tham chieu', 'số bút toán', 'so but toan', 'transaction no',
        'trans no', 'mã gd', 'ma gd', 'trace no', 'ref no', 'reference', 'mã giao dịch'
    ],
    date: [
        'ngày giao dịch', 'ngay giao dich', 'ngày gd', 'ngay gd', 'transaction date',
        'trans date', 'posting date', 'ngày hạch toán', 'ngay hach toan', 'thời gian',
        'thoi gian', 'date', 'time', 'ngày', 'ngay'
    ],
    note: [
        'nội dung chi tiết', 'noi dung chi tiet', 'diễn giải', 'dien giai',
        'nội dung', 'noi dung', 'chi tiết', 'chi tiet', 'description', 'details',
        'narrative', 'transaction description', 'ghi chú', 'ghi chu', 'remark', 'lý do'
    ],
    partner: [
        'đối tác', 'doi tac', 'remitter', 'người gửi', 'người nhận', 'bên liên quan', 'ben lien quan'
    ],
    debit: [
        'nợ tktt', 'no tktt', 'ghi nợ', 'ghi no', 'tiền ra', 'tien ra', 'rút tiền', 'rut tien',
        'số tiền ghi nợ', 'so tien ghi no', 'tiền chi', 'tien chi', 'debit amount', 'debit',
        'khoản chi', 'phát sinh nợ', 'ps nợ', 'ps no'
    ],
    credit: [
        'có tktt', 'co tktt', 'ghi có', 'ghi co', 'tiền vào', 'tien vao', 'nạp tiền', 'nap tien',
        'số tiền ghi có', 'so tien ghi co', 'tiền thu', 'tien thu', 'credit amount', 'credit',
        'khoản thu', 'phát sinh có', 'ps có', 'ps co'
    ],
    amount: [
        'biến động số dư', 'số tiền giao dịch', 'số tiền gd', 'số tiền', 'so tien',
        'amount', 'biến động', 'bien dong', 'giá trị'
    ],
    balance: [
        'số dư sau gd', 'số dư cuối', 'closing balance', 'số dư khả dụng', 'running balance',
        'số dư', 'so du', 'balance'
    ],
    type: [
        'loại gd', 'loai gd', 'loại', 'type', 'd/c', 'cr/dr', 'hướng gd', 'chiều gd'
    ]
};

/**
 * Normalize string for comparison (strip Vietnamese diacritics, convert to lowercase)
 */
function normalizeText(text) {
    if (!text) return '';
    return String(text)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Sanitize and parse amount string into a number
 */
export function parseAmount(val) {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return Math.abs(val);

    const rawStr = String(val).trim();
    // Ignore if transaction reference code (e.g. FT26184278254010, REF123456)
    if (/^[A-Z]{2,}\d{6,}/i.test(rawStr) || /^[A-Z]+\d+[A-Z\d\\]+$/i.test(rawStr)) {
        return 0;
    }

    let str = rawStr;
    // Strip currency symbols, letters, parentheses, and excessive whitespace
    str = str.replace(/[₫đVNDusd$\(\)]/gi, '').trim();

    // If both dot and comma are present (e.g., 1.250.000,00 or 1,250,000.00)
    if (str.includes('.') && str.includes(',')) {
        if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
            // European/Vietnamese format: 1.250.000,00 -> strip dots, convert comma to dot
            str = str.replace(/\./g, '').replace(',', '.');
        } else {
            // US format: 1,250,000.00 -> strip commas
            str = str.replace(/,/g, '');
        }
    } else if (str.includes('.')) {
        // Dot only: multiple dots (1.250.000) or ends with 3-digit thousand block (.xxx)
        const dotCount = (str.match(/\./g) || []).length;
        if (dotCount > 1 || /\.\d{3}$/.test(str)) {
            str = str.replace(/\./g, '');
        }
    } else if (str.includes(',')) {
        // Comma only: multiple commas (1,250,000) or ends with 3-digit thousand block (,xxx)
        const commaCount = (str.match(/,/g) || []).length;
        if (commaCount > 1 || /,\d{3}$/.test(str)) {
            str = str.replace(/,/g, '');
        } else {
            str = str.replace(',', '.');
        }
    }

    // Strip all non-numeric characters except decimal dot
    str = str.replace(/[^\d.]/g, '');
    const num = parseFloat(str);
    if (isNaN(num)) return 0;
    return Math.abs(num);
}

/**
 * Normalize transaction date to ISO format (YYYY-MM-DDTHH:mm:ss)
 */
export function parseDate(val) {
    if (!val) return null;

    // Excel date serial number handling
    if (typeof val === 'number') {
        const dateObj = XLSX.SSF.parse_date_code(val);
        if (dateObj) {
            const hasTime = val % 1 !== 0;
            const y = dateObj.y;
            const m = String(dateObj.m).padStart(2, '0');
            const d = String(dateObj.d).padStart(2, '0');
            const h = String(hasTime ? dateObj.H : 12).padStart(2, '0');
            const min = String(dateObj.M || 0).padStart(2, '0');
            const s = String(dateObj.S || 0).padStart(2, '0');
            return `${y}-${m}-${d}T${h}:${min}:${s}`;
        }
    }

    const str = String(val).trim();

    // Regex DD/MM/YYYY or DD-MM-YYYY (with optional time)
    const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (dmyMatch) {
        let day = Number(dmyMatch[1]);
        let month = Number(dmyMatch[2]);
        // Vietnamese banks use day/month; a "month" above 12 with a valid day means the file is month/day (US export)
        if (month > 12 && day <= 12) {
            [day, month] = [month, day];
        }
        return buildIsoDate(dmyMatch[3], month, day, dmyMatch[4], dmyMatch[5], dmyMatch[6]);
    }

    // Regex YYYY/MM/DD or YYYY-MM-DD
    const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (ymdMatch) {
        return buildIsoDate(ymdMatch[1], Number(ymdMatch[2]), Number(ymdMatch[3]), ymdMatch[4], ymdMatch[5], ymdMatch[6]);
    }

    // Fallback: Date.parse
    const timestamp = Date.parse(str);
    if (!isNaN(timestamp)) {
        return toLocalIso(new Date(timestamp));
    }

    return null;
}

/**
 * Local ISO string for a calendar date, or null when the date does not exist (31/02, month 13, 25:00...):
 * new Date() would silently roll such values into another day/month.
 */
function buildIsoDate(year, month, day, hour, minute, second) {
    const y = Number(year);
    const h = hour === undefined ? 12 : Number(hour);
    const mi = Number(minute || 0);
    const se = Number(second || 0);
    if (month < 1 || month > 12 || day < 1 || day > new Date(y, month, 0).getDate()) return null;
    if (h > 23 || mi > 59 || se > 59) return null;
    const p = (n) => String(n).padStart(2, '0');
    return `${y}-${p(month)}-${p(day)}T${p(h)}:${p(mi)}:${p(se)}`;
}

function toLocalIso(d) {
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/**
 * Automatically assign category and tags based on statement narrative keywords
 */
export function detectCategoryAndTags(note, type, categories = []) {
    const clean = normalizeText(note);

    if (type === 'INCOME') {
        if (/luong|salary|thanh toan luong|tam ung|chuyen luong/i.test(clean)) {
            const cat = categories.find(c => c.id === 'cat-salary') || { id: 'cat-salary', name: 'Lương chính' };
            return { categoryId: cat.id, categoryName: cat.name, tags: ['Lương'] };
        }
        if (/thuong|bonus|kpi|hoa hong|thuong le/i.test(clean)) {
            const cat = categories.find(c => c.id === 'cat-bonus') || { id: 'cat-bonus', name: 'Thưởng & Làm thêm' };
            return { categoryId: cat.id, categoryName: cat.name, tags: ['Thưởng'] };
        }
        if (/lai so du|tra lai|lai tiet kiem|lai tien gui|co tuc|chung khoan|trading|crypto|dividend/i.test(clean)) {
            const cat = categories.find(c => c.id === 'cat-invest-inc') || { id: 'cat-invest-inc', name: 'Lợi nhuận đầu tư' };
            return { categoryId: cat.id, categoryName: cat.name, tags: ['Lãi'] };
        }
        if (/ban hang|doanh thu|khach chuyen khoan|kinh doanh|order/i.test(clean)) {
            const cat = categories.find(c => c.id === 'cat-business') || { id: 'cat-business', name: 'Kinh doanh & Bán hàng' };
            return { categoryId: cat.id, categoryName: cat.name, tags: ['Kinh doanh'] };
        }
        const defaultInc = categories.find(c => c.id === 'cat-other-inc') || { id: 'cat-other-inc', name: 'Thu nhập khác' };
        return { categoryId: defaultInc.id, categoryName: defaultInc.name, tags: [] };
    }

    // EXPENSE
    if (/grab|be |bevn|gojek|xang|petrolimex|pv oil|gui xe|ve xe|taxi|mai linh|vinfast|xanh sm/i.test(clean)) {
        const cat = categories.find(c => c.id === 'cat-transport') || { id: 'cat-transport', name: 'Di chuyển & Xe' };
        return { categoryId: cat.id, categoryName: cat.name, tags: ['Di chuyển'] };
    }
    if (/an uong|cafe|coffee|highlands|phuc long|starbucks|tra sua|quan an|pho|bun|com|kfc|lotte|mcdonald|food|the alley|chao|may ban cafe/i.test(clean)) {
        const cat = categories.find(c => c.id === 'cat-food') || { id: 'cat-food', name: 'Ăn uống' };
        return { categoryId: cat.id, categoryName: cat.name, tags: ['Ăn uống'] };
    }
    if (/shopee|shopeepay|zalopay|tiki|lazada|tiktok|sieu thi|winmart|coop|bach hoa xanh|circle k|seven eleven|7 eleven|uniqlo|zara|mua sam|dien may/i.test(clean)) {
        const cat = categories.find(c => c.id === 'cat-shopping') || { id: 'cat-shopping', name: 'Mua sắm' };
        return { categoryId: cat.id, categoryName: cat.name, tags: ['Mua sắm'] };
    }
    if (/dien|nuoc|evn|viettel|fpt|vnpt|internet|truyen hinh|phi dich vu|phi quan ly|chung cu|phi homebanking|sms/i.test(clean)) {
        const cat = categories.find(c => c.id === 'cat-bills') || { id: 'cat-bills', name: 'Hóa đơn & Tiện ích' };
        return { categoryId: cat.id, categoryName: cat.name, tags: ['Hóa đơn'] };
    }
    if (/tien nha|thue nha|tro|can ho|coc nha/i.test(clean)) {
        const cat = categories.find(c => c.id === 'cat-housing') || { id: 'cat-housing', name: 'Nhà cửa & Thuê nhà' };
        return { categoryId: cat.id, categoryName: cat.name, tags: ['Gia đình'] };
    }
    if (/netflix|spotify|cgv|bhd|cinema|rap phim|du lich|tour|ve may bay|vietnam airlines|vietjet|khach san|booking|agoda/i.test(clean)) {
        const cat = categories.find(c => c.id === 'cat-entertainment') || { id: 'cat-entertainment', name: 'Giải trí & Du lịch' };
        return { categoryId: cat.id, categoryName: cat.name, tags: ['Giải trí'] };
    }
    if (/thuoc|pharmacity|long chau|an khang|benh vien|kham benh|nha khoa|medlatec|suc khoe/i.test(clean)) {
        const cat = categories.find(c => c.id === 'cat-health') || { id: 'cat-health', name: 'Sức khỏe & Y tế' };
        return { categoryId: cat.id, categoryName: cat.name, tags: ['Sức khỏe'] };
    }
    if (/hoc phi|khoa hoc|udemy|coursera|tieng anh|ielts|toeic|sach|truong hoc/i.test(clean)) {
        const cat = categories.find(c => c.id === 'cat-education') || { id: 'cat-education', name: 'Giáo dục & Khóa học' };
        return { categoryId: cat.id, categoryName: cat.name, tags: ['Giáo dục'] };
    }
    if (/tiet kiem|dau tu|chung khoan|tich luy|mua vang|vang sjc/i.test(clean)) {
        const cat = categories.find(c => c.id === 'cat-invest-exp') || { id: 'cat-invest-exp', name: 'Đầu tư & Tích lũy' };
        return { categoryId: cat.id, categoryName: cat.name, tags: ['Đầu tư'] };
    }

    const defaultExp = categories.find(c => c.id === 'cat-other-exp') || { id: 'cat-other-exp', name: 'Chi phí khác' };
    return { categoryId: defaultExp.id, categoryName: defaultExp.name, tags: [] };
}

/**
 * Locate statement table header row
 * Scans up to 100 rows deep to support statements with long introductory preambles (e.g., Techcombank)
 */
function findHeaderRow(rows) {
    let bestRowIdx = -1;
    let maxMatches = 0;
    let bestMapping = null;

    const scanLimit = Math.min(rows.length, 100);

    for (let i = 0; i < scanLimit; i++) {
        const row = rows[i];
        if (!Array.isArray(row) || row.length === 0) continue;

        const mapping = {};
        const claimedCols = new Set();
        let matches = 0;

        row.forEach((cell, colIdx) => {
            if (cell === null || cell === undefined) return;
            const norm = normalizeText(cell);
            if (!norm) return;

            for (const [key, patterns] of Object.entries(COLUMN_PATTERNS)) {
                if (mapping[key] === undefined && !claimedCols.has(colIdx)) {
                    const hasMatch = patterns.some(pattern => {
                        const normPat = normalizeText(pattern);
                        return norm === normPat || norm.includes(normPat);
                    });
                    if (hasMatch) {
                        mapping[key] = colIdx;
                        claimedCols.add(colIdx);
                        matches++;
                        break;
                    }
                }
            }
        });

        // Valid row requires at least Date AND (Debit/Credit OR Amount)
        const hasDate = mapping.date !== undefined;
        const hasAmount = mapping.amount !== undefined || (mapping.debit !== undefined || mapping.credit !== undefined);

        if (hasDate && hasAmount && matches > maxMatches) {
            maxMatches = matches;
            bestRowIdx = i;
            bestMapping = mapping;
        }
    }

    return { headerRowIdx: bestRowIdx, columnMapping: bestMapping };
}

/**
 * Read and parse bank statement file (Excel or CSV)
 */
export async function parseBankStatementFile(file, categories = []) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const isCsv = /\.(csv|txt)$/i.test(file.name || '') || /csv|text\/plain/i.test(file.type || '');
                // - Excel: read raw values -> date cells as serial numbers, parsed accurately without US m/d/yy format
                // - CSV: raw: true to prevent SheetJS from guessing US date formats (01/09 -> Jan 9)
                // - CSV: manual UTF-8 decoding (SheetJS defaults to Latin-1 causing font corruption)
                const workbook = isCsv
                    ? XLSX.read(new TextDecoder('utf-8').decode(data).replace(/^\uFEFF/, ''), { type: 'string', raw: true })
                    : XLSX.read(data, { type: 'array' });

                // Scan all sheets, select first sheet with valid header row
                let rows = [];
                let headerRowIdx = -1;
                let columnMapping = null;
                for (const sheetName of workbook.SheetNames) {
                    const sheetRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: true, defval: '' });
                    const found = findHeaderRow(sheetRows);
                    if (found.headerRowIdx !== -1) {
                        rows = sheetRows;
                        headerRowIdx = found.headerRowIdx;
                        columnMapping = found.columnMapping;
                        break;
                    }
                    if (rows.length === 0) rows = sheetRows;
                }

                if (!rows || rows.length === 0) {
                    throw new Error('Tệp không có dữ liệu bảng tính');
                }

                if (headerRowIdx === -1 || !columnMapping) {
                    throw new Error('Không thể tìm thấy hàng tiêu đề của bản sao kê (thiếu cột Ngày, Số tiền hoặc Thu/Chi). Vui lòng dùng file mẫu chuẩn FinTrack.');
                }

                const parsedTransactions = [];
                let footerClosingBalance = null;

                // Iterate through data rows following the header
                for (let i = headerRowIdx + 1; i < rows.length; i++) {
                    const row = rows[i];
                    if (!Array.isArray(row) || row.length === 0) continue;

                    // Check for empty row
                    const hasAnyContent = row.some(cell => cell !== '' && cell !== null && cell !== undefined);
                    if (!hasAnyContent) continue;

                    const normRowText = normalizeText(row.join(' '));

                    // Footer closing balance row -> most reliable closing balance source
                    if (normRowText.includes('so du cuoi ky') || normRowText.includes('ending balance') || normRowText.includes('closing balance')) {
                        const amounts = row.map(parseAmount).filter(a => a > 0);
                        if (amounts.length > 0) footerClosingBalance = amounts[amounts.length - 1];
                        continue;
                    }

                    // Skip footnotes, print footers, and summary volume rows
                    if (
                        normRowText.includes('so du dau ky') ||
                        normRowText.includes('opening balance') ||
                        normRowText.includes('cong doanh so') ||
                        normRowText.includes('total volume') ||
                        normRowText.includes('phieu nay duoc in') ||
                        normRowText.includes('this document was generated') ||
                        normRowText.includes('dien giai/ description')
                    ) {
                        continue;
                    }

                    // Extract Date
                    const rawDate = columnMapping.date !== undefined ? row[columnMapping.date] : null;
                    const rawDateStr = String(rawDate || '').trim();

                    // Validate date (skip non-transaction rows)
                    const isValidDate = /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(rawDateStr) ||
                                        /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/.test(rawDateStr) ||
                                        (typeof rawDate === 'number' && rawDate > 30000);

                    if (!isValidDate) continue;

                    // Extract Description & Counterparty
                    let note = columnMapping.note !== undefined ? String(row[columnMapping.note] || '').trim() : '';
                    const partner = columnMapping.partner !== undefined ? String(row[columnMapping.partner] || '').trim() : '';
                    if (partner && !note.toLowerCase().includes(partner.toLowerCase())) {
                        note = partner + (note ? ' - ' + note : '');
                    }
                    if (!note) {
                        note = 'Giao dịch ngân hàng';
                    }

                    // Determine type (Income / Expense) and Amount
                    let type = 'EXPENSE';
                    let amount = 0;

                    // Case 1: Separate Debit (outflow) and Credit (inflow) columns
                    if (columnMapping.debit !== undefined || columnMapping.credit !== undefined) {
                        const debitVal = columnMapping.debit !== undefined ? parseAmount(row[columnMapping.debit]) : 0;
                        const creditVal = columnMapping.credit !== undefined ? parseAmount(row[columnMapping.credit]) : 0;

                        if (creditVal > 0) {
                            type = 'INCOME';
                            amount = creditVal;
                        } else if (debitVal > 0) {
                            type = 'EXPENSE';
                            amount = debitVal;
                        } else if (columnMapping.amount !== undefined) {
                            // Fallback to Amount column
                            const rawAmt = row[columnMapping.amount];
                            const amt = parseAmount(rawAmt);
                            if (amt > 0) {
                                amount = amt;
                                const amtStr = String(rawAmt).trim();
                                if (amtStr.startsWith('+')) type = 'INCOME';
                                else if (amtStr.startsWith('-')) type = 'EXPENSE';
                            }
                        }
                    } else if (columnMapping.amount !== undefined) {
                        // Case 2: Single Amount column
                        const rawAmt = row[columnMapping.amount];
                        amount = parseAmount(rawAmt);

                        if (columnMapping.type !== undefined) {
                            const rawType = normalizeText(row[columnMapping.type]);
                            if (rawType === 'c' || rawType.includes('cr') || rawType.startsWith('co') || rawType.includes('ghi co') || rawType.includes('+') || rawType.includes('thu')) {
                                type = 'INCOME';
                            } else {
                                type = 'EXPENSE';
                            }
                        } else {
                            const amtStr = String(rawAmt).trim();
                            if (amtStr.startsWith('+')) {
                                type = 'INCOME';
                            } else if (amtStr.startsWith('-') || (amtStr.startsWith('(') && amtStr.endsWith(')'))) {
                                type = 'EXPENSE';
                            } else {
                                // If unsigned positive amount, infer type from description keywords
                                if (/luong|thuong|nap tien|chuyen tien den|nhan tien/i.test(normalizeText(note))) {
                                    type = 'INCOME';
                                } else {
                                    type = 'EXPENSE';
                                }
                            }
                        }
                    }

                    // Skip rows with zero amount
                    if (amount <= 0) continue;

                    // Extract balance (if available)
                    let rowBalance = null;
                    if (columnMapping.balance !== undefined && row[columnMapping.balance] !== '' && row[columnMapping.balance] !== null) {
                        rowBalance = parseAmount(row[columnMapping.balance]);
                    }

                    const parsedDate = parseDate(rawDate);
                    if (!parsedDate) continue;
                    const { categoryId, categoryName, tags } = detectCategoryAndTags(note, type, categories);

                    parsedTransactions.push({
                        tempId: `st-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
                        date: parsedDate,
                        type,
                        amount,
                        note,
                        categoryId,
                        categoryName,
                        tags,
                        balanceAfter: rowBalance,
                        originalRowIndex: i + 1,
                        selected: true,
                        isDuplicate: false,
                        duplicateReason: '',
                    });
                }

                if (parsedTransactions.length === 0) {
                    throw new Error('Không đọc được giao dịch hợp lệ nào từ tệp. Vui lòng kiểm tra lại định dạng tệp sao kê.');
                }

                // Closing balance: prefer explicit footer closing balance; otherwise use balance of newest transaction (statements can be ascending or descending)
                let detectedClosingBalance = footerClosingBalance;
                if (detectedClosingBalance === null) {
                    const withBalance = parsedTransactions.filter(t => t.balanceAfter !== null);
                    if (withBalance.length > 0) {
                        const first = withBalance[0];
                        const last = withBalance[withBalance.length - 1];
                        const isDescending = first.date > last.date;
                        detectedClosingBalance = (isDescending ? first : last).balanceAfter;
                    }
                }

                // Detect bank and account information from file
                const bankInfo = detectBankAndAccount(file, rows, workbook);

                resolve({
                    transactions: parsedTransactions,
                    detectedClosingBalance,
                    totalRows: rows.length,
                    headerRowIndex: headerRowIdx + 1,
                    detectedBank: bankInfo.detectedBank,
                    detectedAccountNumber: bankInfo.detectedAccountNumber,
                    detectedAccountHolder: bankInfo.detectedAccountHolder,
                });
            } catch (err) {
                reject(err);
            }
        };

        reader.onerror = () => {
            reject(new Error('Không thể đọc file'));
        };

        // Read as ArrayBuffer for maximum binary format compatibility
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Check and flag duplicate transactions against existing records
 */
function toDateKey(dateStr) {
    if (!dateStr) return '';
    const s = String(dateStr);
    // Timestamp with timezone offset -> normalize to local date string
    if (s.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(s)) {
        const d = new Date(s);
        if (!isNaN(d.getTime())) return toLocalIso(d).slice(0, 10);
    }
    return s.slice(0, 10);
}

export function checkDuplicates(parsedTransactions, existingTransactions = [], targetWalletId = null) {
    return parsedTransactions.map(item => {
        const itemDateStr = toDateKey(item.date); // YYYY-MM-DD
        const itemAmount = item.amount;
        const itemType = item.type;
        const itemNoteNorm = normalizeText(item.note);

        const isDup = existingTransactions.some(existing => {
            const exDateStr = toDateKey(existing.date);
            const exAmount = existing.amount;
            const exType = existing.type;
            const exNoteNorm = normalizeText(existing.note || '');

            // If target wallet is specified, only match against that wallet
            if (targetWalletId && existing.walletId && existing.walletId !== targetWalletId) {
                return false;
            }

            // Duplicate when matching date, amount, and Income/Expense type
            if (exDateStr === itemDateStr && Math.abs(exAmount - itemAmount) < 1 && exType === itemType) {
                // If descriptions are similar or empty
                if (!exNoteNorm || !itemNoteNorm) {
                    return exNoteNorm === itemNoteNorm;
                }
                if (exNoteNorm === itemNoteNorm || exNoteNorm.includes(itemNoteNorm) || itemNoteNorm.includes(exNoteNorm)) {
                    return true;
                }
            }
            return false;
        });

        return {
            ...item,
            isDuplicate: isDup,
            duplicateReason: isDup ? 'Đã có giao dịch trùng ngày, số tiền và nội dung trong hệ thống' : '',
            selected: !isDup, // Deselect duplicates by default to prevent accidental imports
        };
    });
}

/**
 * Generate and download standard sample Techcombank statement Excel template
 */
export function downloadSampleStatementTemplate() {
    const wb = XLSX.utils.book_new();

    const sampleRows = [
        ['NGÂN HÀNG THƯƠNG MẠI CỔ PHẦN KỸ THƯƠNG VIỆT NAM (TECHCOMBANK)'],
        ['BẢNG SAO KÊ CHI TIẾT TÀI KHOẢN TIỀN GỬI THANH TOÁN'],
        ['Số tài khoản: 19038899887766', '', 'Tên chủ tài khoản: NGUYEN VAN A', '', 'Loại tiền: VND'],
        ['Kỳ sao kê: 01/09/2026 đến 30/09/2026'],
        [''],
        ['Ngày giao dịch', 'Nội dung chi tiết', 'Tiền ra (Ghi nợ)', 'Tiền vào (Ghi có)', 'Số dư sau GD'],
        ['01/09/2026', 'Cong ty Cong nghe chuyen khoan thanh toan Luong thang 08', '', 30000000, 35500000],
        ['02/09/2026', 'Grab ride toi cong ty', 65000, '', 35435000],
        ['03/09/2026', 'Highlands Coffee gap doi tac', 110000, '', 35325000],
        ['05/09/2026', 'Shopee thanh toan don hang do gia dung', 450000, '', 34875000],
        ['08/09/2026', 'EVN Thanh toan tien dien sinh hoat thang 8', 1250000, '', 33625000],
        ['10/09/2026', 'Thanh toan tien thue nha can ho thang 9', 6000000, '', 27625000],
        ['15/09/2026', 'Nhan thuong KPI du an quy 3', '', 5000000, 32625000],
        ['20/09/2026', 'Pharmacity mua thuoc cam sot', 180000, '', 32445000]
    ];

    const ws = XLSX.utils.aoa_to_sheet(sampleRows);

    // Column widths formatting
    ws['!cols'] = [
        { wch: 18 }, // Date
        { wch: 45 }, // Description
        { wch: 20 }, // Debit
        { wch: 20 }, // Credit
        { wch: 20 }, // Balance
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Sao_Ke_Techcombank');
    XLSX.writeFile(wb, 'Sao_Ke_Techcombank_Mau.xlsx');
}
