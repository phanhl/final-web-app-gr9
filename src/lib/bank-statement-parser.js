import * as XLSX from 'xlsx';

/**
 * Các từ khóa nhận diện cột trong bảng sao kê ngân hàng
 * Sắp xếp từ cụm từ dài/chính xác đến từ ngắn để tránh khớp nhầm
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
 * Chuẩn hóa chuỗi để so sánh (bỏ dấu tiếng Việt, viết thường)
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
 * Làm sạch và chuyển đổi chuỗi số tiền thành number
 */
export function parseAmount(val) {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return Math.abs(val);

    const rawStr = String(val).trim();
    // Bỏ qua nếu là mã tham chiếu giao dịch (ví dụ: FT26184278254010, REF123456)
    if (/^[A-Z]{2,}\d{6,}/i.test(rawStr) || /^[A-Z]+\d+[A-Z\d\\]+$/i.test(rawStr)) {
        return 0;
    }

    let str = rawStr;
    // Bỏ đơn vị tiền tệ, chữ cái, dấu ngoặc và khoảng trắng thừa
    str = str.replace(/[₫đVNDusd$\(\)]/gi, '').trim();

    // Nếu có cả dấu chấm và phẩy (ví dụ: 1.250.000,00 hoặc 1,250,000.00)
    if (str.includes('.') && str.includes(',')) {
        if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
            // Định dạng châu Âu/VN: 1.250.000,00 -> bỏ chấm, phẩy thành chấm
            str = str.replace(/\./g, '').replace(',', '.');
        } else {
            // Định dạng Mỹ: 1,250,000.00 -> bỏ phẩy
            str = str.replace(/,/g, '');
        }
    } else if (str.includes('.')) {
        // Chỉ có dấu chấm: nếu có nhiều hơn 1 dấu chấm (1.250.000) hoặc kết thúc bằng .xxx
        const dotCount = (str.match(/\./g) || []).length;
        if (dotCount > 1 || /\.\d{3}$/.test(str)) {
            str = str.replace(/\./g, '');
        }
    } else if (str.includes(',')) {
        // Chỉ có dấu phẩy: nếu có nhiều hơn 1 dấu phẩy (1,250,000) hoặc kết thúc bằng ,xxx
        const commaCount = (str.match(/,/g) || []).length;
        if (commaCount > 1 || /,\d{3}$/.test(str)) {
            str = str.replace(/,/g, '');
        } else {
            str = str.replace(',', '.');
        }
    }

    // Bỏ tất cả ký tự không phải số hoặc dấu chấm
    str = str.replace(/[^\d.]/g, '');
    const num = parseFloat(str);
    if (isNaN(num)) return 0;
    return Math.abs(num);
}

/**
 * Chuẩn hóa ngày giao dịch thành định dạng ISO (YYYY-MM-DDTHH:mm:ss)
 */
export function parseDate(val) {
    if (!val) return new Date().toISOString();

    // Trường hợp ngày của Excel (serial number)
    if (typeof val === 'number') {
        const dateObj = XLSX.SSF.parse_date_code(val);
        if (dateObj) {
            const y = dateObj.y;
            const m = String(dateObj.m).padStart(2, '0');
            const d = String(dateObj.d).padStart(2, '0');
            const h = String(dateObj.H || 12).padStart(2, '0');
            const min = String(dateObj.M || 0).padStart(2, '0');
            const s = String(dateObj.S || 0).padStart(2, '0');
            return `${y}-${m}-${d}T${h}:${min}:${s}`;
        }
    }

    const str = String(val).trim();

    // Regex DD/MM/YYYY hoặc DD-MM-YYYY (kèm giờ phút giây nếu có)
    const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (dmyMatch) {
        const day = dmyMatch[1].padStart(2, '0');
        const month = dmyMatch[2].padStart(2, '0');
        const year = dmyMatch[3];
        const hour = (dmyMatch[4] || '12').padStart(2, '0');
        const min = (dmyMatch[5] || '00').padStart(2, '0');
        const sec = (dmyMatch[6] || '00').padStart(2, '0');
        return `${year}-${month}-${day}T${hour}:${min}:${sec}`;
    }

    // Regex YYYY/MM/DD hoặc YYYY-MM-DD
    const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (ymdMatch) {
        const year = ymdMatch[1];
        const month = ymdMatch[2].padStart(2, '0');
        const day = ymdMatch[3].padStart(2, '0');
        const hour = (ymdMatch[4] || '12').padStart(2, '0');
        const min = (ymdMatch[5] || '00').padStart(2, '0');
        const sec = (ymdMatch[6] || '00').padStart(2, '0');
        return `${year}-${month}-${day}T${hour}:${min}:${sec}`;
    }

    // Fallback: Date.parse
    const timestamp = Date.parse(str);
    if (!isNaN(timestamp)) {
        return new Date(timestamp).toISOString();
    }

    return new Date().toISOString();
}

/**
 * Tự động gán danh mục và tags dựa trên từ khóa nội dung sao kê
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
 * Tìm kiếm hàng tiêu đề của bảng sao kê
 * Hỗ trợ quét sâu tới 100 hàng (đáp ứng các sao kê ngân hàng có phần giới thiệu dài như Techcombank)
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

        // Hàng hợp lệ phải có ít nhất Date VÀ (Debit/Credit HOẶC Amount)
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
 * Đọc và phân tích file sao kê ngân hàng (Excel hoặc CSV)
 */
export async function parseBankStatementFile(file, categories = []) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Chuyển sheet sang dạng mảng 2D (header: 1)
                const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' });

                if (!rows || rows.length === 0) {
                    throw new Error('Tệp không có dữ liệu bảng tính');
                }

                const { headerRowIdx, columnMapping } = findHeaderRow(rows);

                if (headerRowIdx === -1 || !columnMapping) {
                    throw new Error('Không thể tìm thấy hàng tiêu đề của bản sao kê (thiếu cột Ngày, Số tiền hoặc Thu/Chi). Vui lòng dùng file mẫu chuẩn FinTrack.');
                }

                const parsedTransactions = [];
                let detectedClosingBalance = null;

                // Duyệt qua các hàng dữ liệu từ sau hàng tiêu đề
                for (let i = headerRowIdx + 1; i < rows.length; i++) {
                    const row = rows[i];
                    if (!Array.isArray(row) || row.length === 0) continue;

                    // Kiểm tra hàng trống
                    const hasAnyContent = row.some(cell => cell !== '' && cell !== null && cell !== undefined);
                    if (!hasAnyContent) continue;

                    const normRowText = normalizeText(row.join(' '));

                    // Bỏ qua các dòng chú thích, chân trang in ấn, tổng kết
                    if (
                        normRowText.includes('so du dau ky') ||
                        normRowText.includes('opening balance') ||
                        normRowText.includes('cong doanh so') ||
                        normRowText.includes('total volume') ||
                        normRowText.includes('phieu nay duoc in') ||
                        normRowText.includes('this document was generated') ||
                        normRowText.includes('dien giai/ description')
                    ) {
                        // Nếu là dòng số dư cuối kỳ -> ghi nhận số dư cuối
                        if (normRowText.includes('so du cuoi ky') || normRowText.includes('ending balance')) {
                            const possibleBal = row.map(parseAmount).find(a => a > 0);
                            if (possibleBal) detectedClosingBalance = possibleBal;
                        }
                        continue;
                    }

                    // Lấy Ngày
                    const rawDate = columnMapping.date !== undefined ? row[columnMapping.date] : null;
                    const rawDateStr = String(rawDate || '').trim();

                    // Xác thực ngày hợp lệ (bỏ qua dòng không phải giao dịch)
                    const isValidDate = /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(rawDateStr) ||
                                        /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/.test(rawDateStr) ||
                                        (typeof rawDate === 'number' && rawDate > 30000);

                    if (!isValidDate) continue;

                    // Lấy Nội dung & Đối tác
                    let note = columnMapping.note !== undefined ? String(row[columnMapping.note] || '').trim() : '';
                    const partner = columnMapping.partner !== undefined ? String(row[columnMapping.partner] || '').trim() : '';
                    if (partner && !note.toLowerCase().includes(partner.toLowerCase())) {
                        note = partner + (note ? ' - ' + note : '');
                    }
                    if (!note) {
                        note = 'Giao dịch ngân hàng';
                    }

                    // Xác định loại (Thu / Chi) và Số tiền
                    let type = 'EXPENSE';
                    let amount = 0;

                    // Trường hợp 1: Có cột Debit (tiền ra) và Credit (tiền vào) riêng biệt
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
                            // Dự phòng cột Amount
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
                        // Trường hợp 2: Chỉ có 1 cột Amount
                        const rawAmt = row[columnMapping.amount];
                        amount = parseAmount(rawAmt);

                        if (columnMapping.type !== undefined) {
                            const rawType = normalizeText(row[columnMapping.type]);
                            if (rawType.includes('cr') || rawType.includes('co') || rawType.includes('+') || rawType.includes('thu')) {
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
                                // Nếu số dương không dấu, suy đoán theo từ khóa nội dung
                                if (/luong|thuong|nap tien|chuyen tien den|nhan tien/i.test(normalizeText(note))) {
                                    type = 'INCOME';
                                } else {
                                    type = 'EXPENSE';
                                }
                            }
                        }
                    }

                    // Bỏ qua dòng có số tiền = 0
                    if (amount <= 0) continue;

                    // Lấy số dư (nếu có)
                    let rowBalance = null;
                    if (columnMapping.balance !== undefined && row[columnMapping.balance]) {
                        rowBalance = parseAmount(row[columnMapping.balance]);
                        if (rowBalance > 0) {
                            detectedClosingBalance = rowBalance;
                        }
                    }

                    const parsedDate = parseDate(rawDate);
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

                resolve({
                    transactions: parsedTransactions,
                    detectedClosingBalance,
                    totalRows: rows.length,
                    headerRowIndex: headerRowIdx + 1,
                });
            } catch (err) {
                reject(err);
            }
        };

        reader.onerror = () => {
            reject(new Error('Không thể đọc file'));
        };

        // Đọc dưới dạng ArrayBuffer cho độ tương thích nhị phân cao nhất
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Kiểm tra và đánh dấu giao dịch trùng lặp so với dữ liệu hiện có
 */
export function checkDuplicates(parsedTransactions, existingTransactions = [], targetWalletId = null) {
    return parsedTransactions.map(item => {
        const itemDateStr = item.date.slice(0, 10); // YYYY-MM-DD
        const itemAmount = item.amount;
        const itemType = item.type;
        const itemNoteNorm = normalizeText(item.note);

        const isDup = existingTransactions.some(existing => {
            const exDateStr = existing.date.slice(0, 10);
            const exAmount = existing.amount;
            const exType = existing.type;
            const exNoteNorm = normalizeText(existing.note || '');

            // Nếu chỉ định ví cụ thể thì chỉ so khớp ví đó
            if (targetWalletId && existing.walletId && existing.walletId !== targetWalletId) {
                return false;
            }

            // Trùng khi cùng ngày, cùng số tiền, cùng loại Thu/Chi
            if (exDateStr === itemDateStr && Math.abs(exAmount - itemAmount) < 1 && exType === itemType) {
                // Nếu nội dung tương đồng hoặc ngắn
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
            selected: !isDup, // Mặc định bỏ chọn giao dịch trùng lặp để tránh nhầm lẫn!
        };
    });
}

/**
 * Tạo và tải xuống file Excel mẫu sao kê chuẩn
 */
export function downloadSampleStatementTemplate() {
    const wb = XLSX.utils.book_new();

    const sampleData = [
        {
            'Ngày giao dịch': '01/09/2026',
            'Nội dung chi tiết': 'Cong ty Cong nghe chuyen khoan thanh toan Luong thang 08',
            'Tiền ra (Ghi nợ)': '',
            'Tiền vào (Ghi có)': 30000000,
            'Số dư sau GD': 35500000
        },
        {
            'Ngày giao dịch': '02/09/2026',
            'Nội dung chi tiết': 'Grab ride toi cong ty',
            'Tiền ra (Ghi nợ)': 65000,
            'Tiền vào (Ghi có)': '',
            'Số dư sau GD': 35435000
        },
        {
            'Ngày giao dịch': '03/09/2026',
            'Nội dung chi tiết': 'Highlands Coffee gap doi tac',
            'Tiền ra (Ghi nợ)': 110000,
            'Tiền vào (Ghi có)': '',
            'Số dư sau GD': 35325000
        },
        {
            'Ngày giao dịch': '05/09/2026',
            'Nội dung chi tiết': 'Shopee thanh toan don hang do gia dung',
            'Tiền ra (Ghi nợ)': 450000,
            'Tiền vào (Ghi có)': '',
            'Số dư sau GD': 34875000
        },
        {
            'Ngày giao dịch': '08/09/2026',
            'Nội dung chi tiết': 'EVN Thanh toan tien dien sinh hoat thang 8',
            'Tiền ra (Ghi nợ)': 1250000,
            'Tiền vào (Ghi có)': '',
            'Số dư sau GD': 33625000
        },
        {
            'Ngày giao dịch': '10/09/2026',
            'Nội dung chi tiết': 'Thanh toan tien thue nha can ho thang 9',
            'Tiền ra (Ghi nợ)': 6000000,
            'Tiền vào (Ghi có)': '',
            'Số dư sau GD': 27625000
        },
        {
            'Ngày giao dịch': '15/09/2026',
            'Nội dung chi tiết': 'Nhan thuong KPI du an quy 3',
            'Tiền ra (Ghi nợ)': '',
            'Tiền vào (Ghi có)': 5000000,
            'Số dư sau GD': 32625000
        },
        {
            'Ngày giao dịch': '20/09/2026',
            'Nội dung chi tiết': 'Pharmacity mua thuoc cam sot',
            'Tiền ra (Ghi nợ)': 180000,
            'Tiền vào (Ghi có)': '',
            'Số dư sau GD': 32445000
        }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);

    // Căn chỉnh độ rộng cột cho đẹp mắt
    ws['!cols'] = [
        { wch: 18 }, // Ngày
        { wch: 45 }, // Nội dung
        { wch: 20 }, // Tiền ra
        { wch: 20 }, // Tiền vào
        { wch: 20 }, // Số dư
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Sao Kê Ngân Hàng');
    XLSX.writeFile(wb, 'Sao_Ke_Mau_FinTrack.xlsx');
}
