# FinTrack Pro - Web App Quản Lý Chi Tiêu & Mô Phỏng Tài Chính

Ứng dụng quản lý tài chính cá nhân: ghi nhận thu chi nhiều ví, ngân sách, hóa đơn định kỳ, mục tiêu tích lũy, nhập sao kê ngân hàng tự động và **mô phỏng tài chính What-If**. Dữ liệu được lưu trên máy chủ và đồng bộ giữa nhiều thiết bị (máy tính ↔ điện thoại). Giao diện song ngữ **Tiếng Việt / English**.

---

## 🌟 1. Tính năng

### 💳 Ví & Tài khoản
- 4 loại ví: **Tiền mặt**, **Ngân hàng**, **Thẻ tín dụng** (hạn mức, dư nợ), **Sổ tiết kiệm** (lãi suất).
- Tự tổng hợp **số dư khả dụng** và **tổng tài sản ròng**; dư nợ thẻ tín dụng được tách riêng khỏi tài sản.
- **Chuyển khoản nội bộ** giữa các ví (có phí) và **thanh toán dư nợ thẻ** từ ví tiền mặt / ngân hàng.
- **Số dư luôn khớp lịch sử**: số dư = số dư ban đầu + toàn bộ giao dịch. Có nút **"Tính lại số dư"** để đối soát. Khi xóa ví, giao dịch chuyển khoản với ví khác được giữ lại dưới dạng thu/chi của ví còn lại.

### 📝 Giao dịch
- Khoản chi, khoản thu, chuyển khoản; danh mục, tag, ghi chú, **ảnh chứng từ** (tự nén trước khi lưu).
- **Nhập nhanh (Quick Add)** ở mọi màn hình, có các nút cộng nhanh số tiền.
- Kiểm tra số dư (không cho chi âm quỹ, không vượt hạn mức thẻ), không cho ghi giao dịch ở ngày tương lai.
- Sửa / xóa giao dịch tự hoàn tác số dư ví. Xóa giao dịch thanh toán hóa đơn hoặc nạp hũ thì hóa đơn / hũ mục tiêu cũng được cập nhật tương ứng.

### 📥 Nhập sao kê ngân hàng
- Tải file **Excel (.xlsx, .xls)** hoặc **CSV**. Tự nhận diện ngân hàng (Techcombank, Vietcombank, MB, VPBank, ACB, BIDV, VietinBank, TPBank, VIB, Agribank, Sacombank, Timo, HDBank, Cake…) và ghép với ví tương ứng, chưa có ví thì đề xuất tạo ví mới.
- Đọc đúng ô ngày của Excel, cột Nợ/Có, nhiều sheet; tự gợi ý danh mục.
- **Chống trùng lặp** với giao dịch đã có. Chọn **cộng trừ theo biến động ròng** hoặc **khớp đúng số dư cuối kỳ** của sao kê.

### 🎯 Ngân sách & Mục tiêu
- Hạn mức chi theo từng danh mục, cảnh báo **80%** (vàng) và **vượt 100%** (đỏ).
- Phân bổ thu nhập theo quy tắc **50/30/20** kèm quỹ dự phòng; trừ chi phí cố định và tích lũy để ra ngân sách khả dụng.
- **Hũ tiết kiệm / mục tiêu**: nạp, rút từ ví (ghi thành giao dịch), có hiệu ứng chúc mừng khi đạt 100%.

### ⏰ Hóa đơn định kỳ
- Tần suất **hàng tháng / quý / năm**, ngày đến hạn tính đúng theo lịch (tháng 28–31 ngày), nhắc trước N ngày, cảnh báo quá hạn.
- **"Thanh toán ngay"** tạo giao dịch chi và trừ ví. Hóa đơn chỉ chuyển sang "Đã thanh toán" khi giao dịch ghi thành công.
- Tự chuyển về "Chưa thanh toán" khi sang kỳ mới. **"Đặt lại"** cho phép hoàn tiền (xóa giao dịch thanh toán) về ví.

### 🔮 Mô phỏng What-If
- Thanh trượt **cắt giảm chi tiêu** theo từng khoản (0–50%), **gửi tiết kiệm / đầu tư thêm** mỗi tháng, kịch bản lãi / lỗ đầu tư, khoản vay ngoài và nghĩa vụ trả nợ.
- Khung dự phóng **6 / 12 / 24 / 36 tháng**, biểu đồ so sánh **Baseline** và **What-If** cùng số tiền chênh lệch.
- Tự thêm khoản chi từ danh mục hoặc tạo khoản tùy chỉnh (chọn biểu tượng có hiển thị tên, chọn màu).

### 📊 Báo cáo
- Biểu đồ cơ cấu chi tiêu theo danh mục, so sánh thu – chi theo tháng, xu hướng dòng tiền.
- Xuất **CSV (UTF-8)**, **Excel nhiều sheet** (giao dịch, ví, ngân sách, chỉ số tổng hợp) theo ngôn ngữ đang chọn, và in trang báo cáo.

### ⚙️ Khác
- **Song ngữ Việt / Anh**, giao diện **Sáng / Tối / Theo hệ thống**, tối ưu cho điện thoại.
- **Sao lưu / khôi phục** toàn bộ dữ liệu bằng file JSON.
- **Khóa PIN** bảo vệ dữ liệu khi mở ứng dụng ra Internet (xem mục 4).

---

## 💻 2. Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Framework | **Next.js 15** (App Router), **React 19**, JavaScript (JSX) |
| Giao diện | **Tailwind CSS v4**, **Lucide React** (icon), canvas-confetti |
| Biểu đồ | **Recharts** |
| Excel / CSV | **SheetJS (xlsx)** |
| Trạng thái | React Context (`src/context/AppContext.jsx`) |
| Lưu trữ | API route `src/app/api/storage/route.js` ghi file `data/database.json`; `localStorage` làm bộ nhớ đệm offline |

### Cấu trúc thư mục
```
src/
├── app/
│   ├── api/storage/route.js   # API đọc/ghi dữ liệu, kiểm tra PIN, chống ghi đè xung đột
│   ├── page.jsx, layout.jsx, not-found.jsx
├── components/                # Mỗi màn hình 1 file: DashboardView, TransactionsView, BudgetsView,
│                              # WhatIfSimulatorView, BillsView, ReportsView, WalletsView, SettingsView,
│                              # Navigation, QuickAddModal, BankStatementModal, IconHelper...
├── context/AppContext.jsx     # Toàn bộ state & nghiệp vụ (giao dịch, ví, hóa đơn, đồng bộ, PIN)
├── lib/
│   ├── bank-statement-parser.js  # Đọc & nhận diện sao kê ngân hàng
│   ├── i18n.js                   # Bản dịch Việt / Anh
│   ├── utils.js                  # Định dạng tiền/ngày, tính số dư, merge đồng bộ, xuất file
│   └── mock-data.js              # Dữ liệu mẫu ban đầu
└── middleware.js              # HTTP Basic Auth (khi đặt APP_PASSWORD)
data/database.json             # Dữ liệu thật (không commit thay đổi của file này)
```

---

## 🚀 3. Cài đặt & chạy

Yêu cầu: **Node.js 18.18+** (khuyến nghị 20 hoặc 22).

```bash
git clone https://github.com/vietnamlm05-bit/final-web-app.git
cd final-web-app
npm install

npm run dev                    # chế độ phát triển: http://localhost:3000
# hoặc chạy production:
npm run build && npm start
```

Máy khác trong cùng mạng LAN có thể truy cập qua `http://<IP-máy-chủ>:3000` (server lắng nghe `0.0.0.0`).

### Chạy bằng script (production + tunnel cho điện thoại)
```bash
APP_PASSWORD='mat-khau-manh' ./start.sh   # build (nếu cần) + chạy + mở tunnel ngrok/cloudflared
APP_PIN='123456' ./start.sh               # hoặc chỉ khóa dữ liệu bằng PIN
NO_TUNNEL=1 ./start.sh                    # chỉ chạy local
./stop.sh                                 # dừng server và tunnel
```

| Biến môi trường | Ý nghĩa |
|---|---|
| `APP_PASSWORD`, `APP_USER` | Bật HTTP Basic Auth cho toàn bộ trang và API (user mặc định `admin`) |
| `APP_PIN` | Mã PIN 4–8 số cố định để mở khóa dữ liệu (ghi đè PIN đặt trong Cài đặt) |
| `NO_TUNNEL=1` | Không mở tunnel ra Internet |
| `NGROK_DOMAIN`, `NGROK_BIN`, `CLOUDFLARED_BIN`, `PORT` | Tùy chọn tunnel / cổng |

`start.sh` sẽ **không** mở tunnel nếu chưa đặt `APP_PASSWORD` hoặc `APP_PIN`.

---

## 🔒 4. Bảo mật

- **Khóa PIN**: bật trong **Cài đặt → Bảo mật**, hoặc dùng `APP_PIN`. Khi bật, mọi thiết bị phải nhập PIN trước khi xem hay sửa dữ liệu.
  - PIN được lưu dạng băm **scrypt + salt**, server không bao giờ trả PIN về trình duyệt.
  - PIN chỉ gửi qua header `x-app-pin` (không đặt trên URL).
  - Nhập sai **5 lần / IP** (hoặc 30 lần trên toàn hệ thống) trong 15 phút sẽ bị khóa tạm thời.
- **HTTP Basic Auth** (`APP_PASSWORD`): bảo vệ cả trang lẫn API ở tầng middleware, nên dùng khi chia sẻ link ngrok / cloudflared.

---

## 🗄️ 5. Dữ liệu & đồng bộ

- Dữ liệu nằm ở `data/database.json` trên máy chủ, mỗi lần lưu được **ghi nguyên tử** (ghi file tạm rồi đổi tên) và **xếp hàng tuần tự**.
- **Đồng bộ nhiều thiết bị**: trình duyệt kiểm tra thay đổi mỗi ~3,5 giây. Khi 2 thiết bị cùng sửa, server từ chối bản cũ (HTTP 409), trình duyệt **tự hợp nhất 3 chiều** rồi lưu lại, không làm mất dữ liệu của thiết bị nào. Số dư ví được tính lại sau khi hợp nhất.
- **Offline**: thay đổi được giữ trong `localStorage` và đẩy lên server khi có kết nối.
- Nếu `database.json` bị hỏng, server **không ghi đè bằng dữ liệu mẫu** mà sao lưu sang `database.json.corrupt-<thời gian>` và báo lỗi để khôi phục thủ công.
- **Sao lưu / khôi phục**: menu tài khoản → *Sao lưu dữ liệu* (tải file JSON) / *Khôi phục bản sao lưu*.
- `data/database.json` có trong `.gitignore` nhưng vẫn đang được git theo dõi (để giữ dữ liệu mẫu). **Không commit thay đổi của file này**, vì nó chứa dữ liệu tài chính thật.

> Trên Vercel, dữ liệu chỉ lưu tạm trong `/tmp` và sẽ mất khi server khởi động lại. Nên chạy trên máy chủ có ổ đĩa (máy cá nhân / VPS) bằng `start.sh`.

---

## 📚 6. Tài liệu khác

- [`TRACKING_CHANGES.md`](TRACKING_CHANGES.md): nhật ký chi tiết các lần sửa lỗi / nâng cấp.
- [`PROJECT_CHEAT_SHEET.md`](PROJECT_CHEAT_SHEET.md): bảng tra cứu nhanh màn hình ↔ file mã nguồn khi thuyết trình.
