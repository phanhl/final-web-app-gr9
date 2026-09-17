# BẢNG TRA CỨU NHANH KHI CHẤM BÀI PROJECT (DEFENSE CHEAT SHEET)

> **Mẹo vàng khi thuyết trình/chấm bài:**
> Nhấn **`Ctrl + P`** (hoặc `Cmd + P` trên Mac) trong VS Code / Cursor, gõ vài chữ cái đầu của tên file là file mở ra ngay lập tức trong 1 giây!

---

## 1. Bản Đồ Màn Hình Web <-> Tên File (Quy Tắc 1 - 1 Cực Dễ Nhớ)

Mọi màn hình bạn nhìn thấy trên giao diện web đều nằm ở thư mục **`src/components/`** với tên gọi tiếng Anh tương ứng:

| Bạn đang nhìn trên Web | File mã nguồn tương ứng (`Ctrl + P`) | Nội dung file đảm nhận |
|---|---|---|
| 🏠 **Tổng quan (Dashboard)** | `DashboardView.tsx` | Số dư khả dụng, Tài sản ròng, Thẻ thu/chi tháng, Lối tắt What-If, Giao dịch gần đây. |
| 📒 **Sổ giao dịch** | `TransactionsView.tsx` | Bộ lọc nâng cao, Nút bật/tắt biểu đồ (Bar/Pie chart), danh sách giao dịch chi tiết, xuất file Excel/CSV. |
| 🎯 **Ngân sách** | `BudgetsView.tsx` | Quy tắc 50/30/20, ngân sách từng danh mục, thanh tiến độ chi tiêu và hạn mức. |
| ✨ **Mô phỏng What-If** | `WhatIfSimulatorView.tsx` | Mô phỏng các kịch bản tài chính: Mua nhà, thêm nguồn thu, cắt giảm chi tiêu,... |
| 📅 **Định kỳ (Hóa đơn)** | `BillsView.tsx` | Quản lý hóa đơn định kỳ hàng tháng, đánh dấu đã thanh toán, tự động trừ tiền vào ví. |
| 📊 **Báo cáo tài chính** | `ReportsView.tsx` | Phân tích cơ cấu tài sản, biểu đồ dòng tiền theo tháng/quý/năm, so sánh thu - chi. |
| 💳 **Quản lý Ví** | `WalletsView.tsx` | Xem chi tiết thu chi từng ví, chỉnh sửa ví, danh sách ví (Tiền mặt, Ngân hàng, Thẻ tín dụng, Tiết kiệm), thống kê dòng tiền (Inflow/Outflow/Net Flow), chuyển khoản giữa các ví. |
| ⚙️ **Cài đặt & Giao diện** | `SettingsView.tsx` | Tùy chọn Sáng/Tối/Hệ thống, Xuất/Nhập file JSON sao lưu, Xóa dữ liệu, Thông tin kiến trúc. |
| 🧭 **Menu & Header trên cùng** | `Navigation.tsx` | Nút Sáng/Tối ☀️🌙, Chuông cảnh báo ngân sách 80%/100%, Avatar, thanh Tab điều hướng. |
| ➕ **Modal Thêm giao dịch** | `QuickAddModal.tsx` | Hộp thoại nhập nhanh khoản thu, khoản chi, chuyển ví, đính kèm ảnh hóa đơn, gắn tag. |

---

## 2. Bảng Tra Cứu Khi Người Chấm Hỏi Các Câu Hỏi "Kinh Điển"

### Câu 1: *"Dữ liệu được lưu ở đâu? Khi tắt server hay mở trình duyệt khác thì dữ liệu có bị mất không?"*
* **Mở file:** `src/app/api/storage/route.ts` và chỉ vào file `data/database.json`.
* **Cách trả lời tự tin:**
  > *"Em đã xây dựng API lưu trữ máy chủ tại file `src/app/api/storage/route.ts`. Khi người dùng thêm, sửa hoặc xóa bất kỳ giao dịch nào, hệ thống sẽ tự động đồng bộ và ghi an toàn vào tệp `data/database.json` trên ổ cứng server. Vì vậy dù có tắt server `npm run dev`, mở tab ẩn danh hay truy cập từ máy khác thì toàn bộ dữ liệu vẫn được bảo toàn nguyên vẹn."*

---

### Câu 2: *"Toàn bộ Logic quản lý trạng thái (State Management) của ứng dụng nằm ở đâu?"*
* **Mở file:** `src/context/AppContext.tsx`
* **Cách trả lời tự tin:**
  > *"Toàn bộ logic quản lý trạng thái tập trung được viết bằng React Context API trong file `AppContext.tsx`. File này quản lý danh sách ví, giao dịch, ngân sách, hóa đơn, cơ chế đồng bộ 2 chiều (Server Disk + LocalStorage fallback) và cơ chế chuyển đổi giao diện Sáng / Tối."*

---

### Câu 3: *"Các công thức tính toán tài chính và cảnh báo ngân sách nằm ở đâu?"*
* **Mở file:** `src/lib/utils.ts`
* **Cách trả lời tự tin:**
  > *"Tất cả thuật toán tài chính được tách biệt vào file `src/lib/utils.ts`, bao gồm:
  > - `calculateFinancialSummary`: Tính khả dụng, tổng tài sản, thu/chi tháng.
  > - `calculateBudgetStatuses`: Kiểm tra ngưỡng cảnh báo thông minh 80% (Warning) và vượt 100% (Exceeded).
  > - `formatCurrency`: Định dạng tiền tệ theo chuẩn VND."*

---

### Câu 4: *"Cơ sở dữ liệu hoặc cấu trúc kiểu dữ liệu (Schema / Types) khai báo ở đâu?"*
* **Mở file:** `src/types/index.ts`
* **Cách trả lời tự tin:**
  > *"Toàn bộ mô hình thực thể (Entities) được định nghĩa chặt chẽ bằng TypeScript interfaces tại file `src/types/index.ts`, bao gồm `Transaction`, `Wallet`, `Budget`, `RecurringBill`, `SavingsGoal`,..."*

---

### Câu 5: *"Cơ chế đổi màu Sáng / Tối (Dark / Light Mode) hoạt động như thế nào?"*
* **Mở file:** `src/app/globals.css` và `src/app/layout.tsx`
* **Cách trả lời tự tin:**
  > *"Ứng dụng sử dụng Tailwind CSS v4 với cấu hình biến thể `@custom-variant dark` trong `globals.css`. Trạng thái theme (Sáng / Tối / Tự động theo hệ thống) được lưu vào `localStorage`. File `layout.tsx` có sẵn script kích hoạt tức thì giúp chống chớp trắng màn hình khi tải trang."*

---

### Câu 6: *"Làm sao để máy khác hoặc điện thoại kết nối vào web?"*
* **Mở file:** `package.json`
* **Cách trả lời tự tin:**
  > *"Trong `package.json`, em đã cấu hình cờ `-H 0.0.0.0` cho lệnh `next dev`. Nhờ đó server lắng nghe trên toàn bộ card mạng, cho phép các thiết bị khác trong cùng Wi-Fi truy cập dễ dàng qua địa chỉ IP mạng LAN."*

---

### Câu 7: *"Project này so với phiên bản ban đầu đã sửa những gì?"*
* **Mở file:** `TRACKING_CHANGES.md` ngay thư mục gốc.
* **Cách trả lời tự tin:**
  > *"Em có lưu một file nhật ký theo dõi chi tiết toàn bộ các lần chỉnh sửa `TRACKING_CHANGES.md` gồm 6 lần cập nhật, có đầy đủ mục đích, bảng so sánh Before vs After và các dòng code được thay đổi."*
