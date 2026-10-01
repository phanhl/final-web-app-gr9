# BẢNG TRA CỨU NHANH KHI CHẤM BÀI PROJECT (DEFENSE CHEAT SHEET)

> **Mẹo khi thuyết trình/chấm bài:**
> Nhấn **`Ctrl + P`** (hoặc `Cmd + P` trên Mac) trong VS Code / Cursor, gõ vài chữ cái đầu của tên file là mở được ngay.
>
> Dự án viết bằng **JavaScript (JSX)**: component là `.jsx`, thư viện / API là `.js` (không phải TypeScript).

---

## 1. Bản đồ màn hình web ↔ file mã nguồn

Mỗi màn hình trên giao diện nằm trong thư mục **`src/components/`** với tên tiếng Anh tương ứng:

| Bạn đang nhìn trên Web | File mã nguồn (`Ctrl + P`) | Nội dung file đảm nhận |
|---|---|---|
| 🏠 **Tổng quan (Dashboard)** | `DashboardView.jsx` | Số dư khả dụng, tài sản ròng, thu/chi tháng, cảnh báo, giao dịch gần đây. |
| 📒 **Sổ giao dịch** | `TransactionsView.jsx` | Bộ lọc, biểu đồ, danh sách giao dịch, modal sửa giao dịch, xuất Excel/CSV. |
| 🎯 **Ngân sách & Mục tiêu** | `BudgetsView.jsx` | Quy tắc 50/30/20, ngân sách từng danh mục, hũ tiết kiệm (nạp/rút). |
| ✨ **Mô phỏng What-If** | `WhatIfSimulatorView.jsx` | Cắt giảm chi tiêu, tiết kiệm / đầu tư thêm, khoản vay, biểu đồ Baseline vs What-If, chọn icon/màu cho khoản chi. |
| 📅 **Định kỳ (Hóa đơn)** | `BillsView.jsx` | Hóa đơn tháng/quý/năm, ngày đến hạn, thanh toán (tạo giao dịch), đặt lại & hoàn tiền. |
| 📊 **Báo cáo** | `ReportsView.jsx` | Cơ cấu chi tiêu, so sánh thu – chi, xu hướng dòng tiền, xuất file, in báo cáo. |
| 💳 **Quản lý Ví** | `WalletsView.jsx` | Danh sách ví (Tiền mặt, Ngân hàng, Thẻ tín dụng, Tiết kiệm), dòng tiền từng ví, trả nợ thẻ, tính lại số dư, xóa ví. |
| ⚙️ **Cài đặt** | `SettingsView.jsx` | Hồ sơ, giao diện Sáng/Tối, ngôn ngữ, **khóa PIN**, sao lưu/khôi phục, xóa dữ liệu. |
| 🧭 **Menu & Header** | `Navigation.jsx` | Thanh tab, chuông cảnh báo, trạng thái đồng bộ, menu tài khoản (sao lưu / khôi phục). |
| ➕ **Modal Thêm giao dịch** | `QuickAddModal.jsx` | Nhập nhanh thu/chi, ví, danh mục, tag, ảnh chứng từ (tự nén). |
| 📥 **Tải sao kê ngân hàng** | `BankStatementModal.jsx` + `src/lib/bank-statement-parser.js` | Đọc Excel/CSV, nhận diện ngân hàng, chống trùng lặp, khớp số dư cuối kỳ. |
| 🔐 **Màn hình nhập PIN** | `src/context/AppContext.jsx` (cuối file) | Lớp phủ khóa khi server yêu cầu PIN. |
| 🖼️ **Biểu tượng** | `IconHelper.jsx` | Bảng icon Lucide và tên hiển thị song ngữ của từng icon. |

---

## 2. Bảng tra cứu các câu hỏi thường gặp

### Câu 1: *"Dữ liệu được lưu ở đâu? Tắt server hay mở trình duyệt khác có mất dữ liệu không?"*
* **Mở file:** `src/app/api/storage/route.js` và `data/database.json`.
* **Cách trả lời:**
  > *"Em xây dựng API lưu trữ tại `src/app/api/storage/route.js`. Mỗi lần thêm, sửa, xóa, trình duyệt gửi dữ liệu lên API và server ghi vào `data/database.json`. Server ghi theo kiểu nguyên tử (ghi file tạm rồi đổi tên) và xếp hàng các lần ghi, nên file không bị hỏng giữa chừng. Vì dữ liệu nằm trên ổ cứng server nên tắt server, mở tab ẩn danh hay dùng máy khác đều không mất. Nếu file bị hỏng, server sao lưu ra `database.json.corrupt-*` chứ không ghi đè bằng dữ liệu mẫu."*

---

### Câu 2: *"Logic quản lý trạng thái (State Management) nằm ở đâu?"*
* **Mở file:** `src/context/AppContext.jsx`
* **Cách trả lời:**
  > *"Toàn bộ state và nghiệp vụ được viết bằng React Context trong `AppContext.jsx`: ví, giao dịch, ngân sách, hóa đơn, mục tiêu, giao diện Sáng/Tối, ngôn ngữ và khóa PIN. Các hàm chính: `addTransaction`, `editTransaction`, `deleteTransaction` (tự cập nhật số dư ví), `payBill` / `unpayBill`, `depositToGoal` / `withdrawFromGoal`, `importBankStatementTransactions`."*

---

### Câu 3: *"Hai thiết bị cùng sửa dữ liệu thì có bị mất không?"*
* **Mở file:** `src/context/AppContext.jsx` (hàm `pushToServer`) và `src/lib/utils.js` (hàm `mergeSnapshots`).
* **Cách trả lời:**
  > *"Mỗi lần lưu, trình duyệt gửi kèm `baseUpdatedAt`, là phiên bản server mà nó đang dựa vào. Nếu thiết bị khác vừa lưu trước, server trả HTTP 409. Trình duyệt sẽ hợp nhất 3 chiều (bản gốc, bản trên máy, bản mới trên server) theo id bằng `mergeSnapshots`, tính lại số dư ví từ lịch sử rồi lưu lại. Nhờ vậy không thiết bị nào bị mất thay đổi. Ngoài ra trình duyệt kiểm tra thay đổi mới khoảng 3,5 giây một lần."*

---

### Câu 4: *"Các công thức tính toán tài chính nằm ở đâu?"*
* **Mở file:** `src/lib/utils.js`
* **Cách trả lời:**
  > *"Các thuật toán được tách riêng vào `src/lib/utils.js`:*
  > - *`calculateFinancialSummary`: số dư khả dụng, tổng tài sản, dư nợ thẻ, thu/chi tháng.*
  > - *`calculateBudgetStatuses`: cảnh báo ngân sách 80% (Warning) và vượt 100% (Exceeded).*
  > - *`getTxWalletDelta`, `recomputeWalletBalances`: số dư ví = số dư ban đầu + lịch sử giao dịch (thẻ tín dụng tính theo chiều dư nợ).*
  > - *`checkWalletSufficientFunds`: không cho chi âm quỹ / vượt hạn mức thẻ.*
  > - *`isBillPaidForCycle`, `getBillDueInfo`: chu kỳ hóa đơn tháng/quý/năm và ngày đến hạn.*
  > - *`formatCurrency`: định dạng tiền VND."*

---

### Câu 5: *"Cấu trúc dữ liệu (schema) khai báo ở đâu?"*
* **Mở file:** `src/lib/mock-data.js` và hàm `validatePayload` trong `src/app/api/storage/route.js`.
* **Cách trả lời:**
  > *"Dự án dùng JavaScript nên không có TypeScript interface (`src/types/index.js` chỉ là file giữ chỗ). Hình dạng dữ liệu của `wallets`, `transactions`, `categories`, `budgets`, `bills`, `goals` thể hiện qua dữ liệu mẫu trong `mock-data.js`. Phía server, `validatePayload` kiểm tra dữ liệu gửi lên: các trường phải là mảng, giao dịch phải có `id` và số tiền hợp lệ, ví phải có số dư là số. Server cũng chỉ lưu các trường đã biết."*

---

### Câu 6: *"Ứng dụng được bảo mật thế nào khi mở ra Internet?"*
* **Mở file:** `src/app/api/storage/route.js` (hàm `checkAuth`), `src/middleware.js`, `start.sh`.
* **Cách trả lời:**
  > *"Có 2 lớp bảo vệ. Lớp 1 là khóa PIN: PIN được băm bằng scrypt kèm salt, so sánh constant-time, chỉ nhận qua header `x-app-pin`. Nhập sai 5 lần / IP trong 15 phút thì bị khóa tạm. Lớp 2 là HTTP Basic Auth trong `middleware.js`, bật khi đặt `APP_PASSWORD`. Script `start.sh` không mở tunnel ngrok/cloudflared nếu chưa đặt `APP_PASSWORD` hoặc `APP_PIN`."*

---

### Câu 7: *"Nhập sao kê ngân hàng hoạt động thế nào?"*
* **Mở file:** `src/lib/bank-statement-parser.js`
* **Cách trả lời:**
  > *"`parseBankStatementFile` đọc file Excel/CSV bằng SheetJS. `detectBankAndAccount` nhận diện ngân hàng và số tài khoản. `parseDate` / `parseAmount` chuẩn hóa ngày và số tiền. `detectCategoryAndTags` gợi ý danh mục theo nội dung giao dịch. `checkDuplicates` đánh dấu giao dịch đã có để tránh cộng trừ 2 lần."*

---

### Câu 8: *"Đa ngôn ngữ (Việt / Anh) làm thế nào?"*
* **Mở file:** `src/lib/i18n.js`
* **Cách trả lời:**
  > *"Mọi chữ trên giao diện gọi hàm `t('key', 'chữ mặc định')`. Bảng `TRANSLATIONS` chứa bản `vi` và `en`. Tên danh mục, tag, ví, hóa đơn và ghi chú do hệ thống tự sinh được dịch lúc hiển thị bằng `tCategory`, `tTag`, `tWalletName`, `tBillName`, `tNote`, nên dữ liệu lưu trong DB không cần đổi khi chuyển ngôn ngữ."*

---

### Câu 9: *"Cơ chế Sáng / Tối (Dark / Light Mode) hoạt động thế nào?"*
* **Mở file:** `src/app/globals.css` và `src/app/layout.jsx`
* **Cách trả lời:**
  > *"Ứng dụng dùng Tailwind CSS v4 với `@custom-variant dark` trong `globals.css`. Lựa chọn theme (Sáng / Tối / Theo hệ thống) lưu trong `localStorage`. `layout.jsx` có script chạy ngay khi tải trang để gắn class `dark`, tránh chớp trắng màn hình."*

---

### Câu 10: *"Làm sao để điện thoại / máy khác truy cập được?"*
* **Mở file:** `package.json` và `start.sh`
* **Cách trả lời:**
  > *"Trong `package.json`, lệnh `next dev` / `next start` có cờ `-H 0.0.0.0` nên server lắng nghe trên mọi card mạng, các thiết bị cùng Wi-Fi vào được qua IP LAN. Muốn truy cập từ ngoài Internet thì chạy `start.sh`: script build, chạy production và mở tunnel ngrok/cloudflared (bắt buộc đặt mật khẩu hoặc PIN)."*

---

### Câu 11: *"Project đã sửa những gì so với phiên bản ban đầu?"*
* **Mở file:** `TRACKING_CHANGES.md` ở thư mục gốc.
* **Cách trả lời:**
  > *"Em ghi nhật ký chi tiết từng lần chỉnh sửa trong `TRACKING_CHANGES.md`, mỗi lần đều có bối cảnh, lỗi gặp phải và cách khắc phục. Lịch sử commit trên GitHub cũng có thể đối chiếu."*
