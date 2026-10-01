# FinTrack Pro - Hệ Thống Quản Lý Chi Tiêu & Mô Phỏng Tài Chính Đa Người Dùng

Ứng dụng quản lý tài chính cá nhân toàn diện: ghi nhận thu chi nhiều ví, ngân sách thông minh, hóa đơn định kỳ, mục tiêu tích lũy, nhập sao kê ngân hàng tự động và **mô phỏng tài chính What-If**. 

Hệ thống hỗ trợ **Đa người dùng (Multi-User Isolation)** với cơ chế bảo mật nghiêm ngặt: Host và Khách truy cập qua 2 đường link riêng, tài khoản được cấp `User ID` độc lập, dữ liệu cá nhân được lưu trữ an toàn trên máy chủ và **hoàn toàn không bị đẩy lên GitHub khi commit mã nguồn**. Giao diện song ngữ **Tiếng Việt / English**, hỗ trợ chế độ **Sáng / Tối**.

---

## 🌟 1. Tính năng nổi bật

### 🔐 Tài khoản & Phân quyền Đa người dùng (Mới)
- **Bắt buộc xác thực:** Màn hình chào đón và form Đăng nhập / Đăng ký hiện đại (Glassmorphism), ngăn chặn truy cập trái phép.
- **Tài khoản Chủ sở hữu (Host):** Tài khoản `admin` giữ trọn vẹn toàn bộ dữ liệu tài chính thật của bạn (các ví thẻ, ngân hàng, lịch sử chi tiêu). Mật khẩu được tự thiết lập ở lần đăng nhập đầu tiên.
- **Tài khoản Khách (Guest):** Khách mở link online, chọn tab **"Tạo Tài Khoản Khách"** để tự đăng ký. Hệ thống cấp một `User ID` riêng biệt (`usr_...`) với kho dữ liệu mẫu độc lập 100%. Khách không thể xem hay chỉnh sửa dữ liệu của Host và ngược lại.
- **Quản lý phiên:** Tích hợp huy hiệu phân quyền (Host / Khách) trên thanh điều hướng và nút **Đăng xuất (Sign Out)** an toàn.

### 💳 Quản lý Ví & Tài sản
- **4 loại ví chuyên biệt:** Tiền mặt, Tài khoản ngân hàng, Thẻ tín dụng (hạn mức, ngày sao kê, dư nợ riêng), Sổ tiết kiệm (kỳ hạn, lãi suất).
- Tự động tính toán **Số dư khả dụng** và **Tổng tài sản ròng**; dư nợ thẻ tín dụng được tách riêng để không gây ảo tưởng tài chính.
- **Chuyển khoản nội bộ** giữa các ví (hỗ trợ phí giao dịch) và **Thanh toán dư nợ thẻ tín dụng**.
- **Đối soát số dư:** Tính năng *"Tính lại số dư"* tự động đối chiếu số dư ban đầu với toàn bộ lịch sử thu chi.

### 📝 Ghi chép & Nhập nhanh giao dịch
- Quản lý khoản chi, khoản thu, chuyển tiền; phân loại theo danh mục, nhãn (tags), ghi chú và đính kèm **ảnh chứng từ** (tự nén ảnh trước khi lưu).
- **Nhập nhanh (Quick Add Modal):** Mở tức thì ở mọi màn hình, hỗ trợ các nút cộng nhanh số tiền tiện lợi.
- Kiểm tra số dư thông minh: Cảnh báo chi âm quỹ, ngăn chặn chi vượt hạn mức thẻ, chặn ghi ngày tương lai.

### 📥 Nhập sao kê ngân hàng tự động (Smart Statement Parser)
- Tải file **Excel (.xlsx, .xls)** hoặc **CSV**. Tự động nhận diện cấu trúc hơn 15 ngân hàng Việt Nam (Techcombank, Vietcombank, MB Bank, ACB, VPBank, BIDV, VietinBank, TPBank, VIB, Agribank, Sacombank, Timo, Cake, MoMo...).
- Tự động đối chiếu tránh trùng lặp giao dịch, gợi ý danh mục chi tiêu theo nội dung chuyển khoản.

### 🎯 Ngân sách & Hũ mục tiêu tích lũy
- Thiết lập hạn mức chi cho từng danh mục, tự động cảnh báo **tiệm cận 80%** (vàng) và **vượt 100%** (đỏ).
- Phân bổ thu nhập theo mô hình hũ chi tiêu kèm quỹ khẩn cấp.
- **Mục tiêu tài chính:** Nạp/rút tiền trực tiếp từ ví, hiệu ứng pháo hoa chúc mừng khi hoàn thành mục tiêu.

### ⏰ Hóa đơn định kỳ
- Quản lý tiền điện, nước, internet, thuê nhà theo chu kỳ **Tháng / Quý / Năm**.
- Tự động tính đúng ngày đến hạn theo lịch thực tế, đếm ngược ngày và cảnh báo hóa đơn đến hạn / quá hạn.
- Nút **"Thanh toán ngay"** tự động tạo giao dịch chi tương ứng và trừ tiền trong ví.

### 🔮 Mô phỏng tài chính What-If
- Thử nghiệm các kịch bản tài chính tương lai: thanh trượt cắt giảm chi tiêu (0–50%), tích lũy thêm mỗi tháng, biến động lãi suất đầu tư, nghĩa vụ trả nợ vay.
- Dự phóng dòng tiền theo các mốc **6 / 12 / 24 / 36 tháng** với biểu đồ so sánh trực quan giữa thực tế (Baseline) và kịch bản mô phỏng.

### 📊 Báo cáo & Xuất dữ liệu
- Biểu đồ phân tích cơ cấu chi tiêu, xu hướng dòng tiền thu - chi qua các tháng.
- Xuất file **Excel đa trang tính** (giao dịch, ví, ngân sách, chỉ số tổng hợp) và file **CSV UTF-8** theo ngôn ngữ được chọn.

---

## 🔒 2. Kiến trúc bảo mật nghiêm ngặt

FinTrack Pro được trang bị hệ thống bảo mật 6 tầng:

| Tầng bảo mật | Giải pháp kỹ thuật |
|---|---|
| **Mã hóa mật khẩu** | Mật khẩu được băm một chiều bằng thuật toán **`scrypt`** kết hợp chuỗi muối ngẫu nhiên 16-byte (`salt`). Không lưu mật khẩu thô. So sánh mật khẩu bằng `crypto.timingSafeEqual` chống tấn công đo thời gian (Timing Attack). |
| **Chống Brute-Force** | Tự động giới hạn tốc độ (Rate Limiting): Nhập sai mật khẩu quá **5 lần / IP** sẽ bị khóa tạm thời trong 15 phút (`HTTP 429`). |
| **Bảo vệ phiên** | Cookie phiên `fintrack_session` được ký số **HMAC-SHA256** với khóa bí mật riêng (`.session_secret`), gắn cờ `HttpOnly` (chống XSS) và `SameSite=lax` (chống CSRF). |
| **Cô lập dữ liệu** | Server tự trích xuất `userId` từ chữ ký phiên làm việc (Zero Trust Client). Bộ lọc chống Path Traversal (`replace(/[^a-zA-Z0-9_-]/g, '')`) ngăn chặn đọc lén file. |
| **Phân quyền hệ thống tệp** | Thư mục `data/` và `data/users/` được thiết lập quyền Linux **`chmod 700`**, các file dữ liệu **`chmod 600`** (chỉ có tài khoản hệ điều hành của bạn mới có quyền truy cập). |
| **Bảo mật tuyệt đối khi Git** | File `.gitignore` loại trừ hoàn toàn `data/*.json`, `data/users/`, `data/users.json`, `data/.session_secret`. Khi push code lên GitHub, **toàn bộ dữ liệu tài chính và tài khoản được giữ lại trên máy, không bao giờ bị rò rỉ**. |

---

## 💻 3. Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| **Framework** | **Next.js 15** (App Router), **React 19**, JavaScript (JSX) |
| **Giao diện** | **Tailwind CSS v4**, **Lucide React** (icons), Canvas-Confetti |
| **Biểu đồ** | **Recharts** |
| **Xử lý bảng tính** | **SheetJS (xlsx)** |
| **Xác thực & Mã hóa** | Node.js Built-in `crypto` (scrypt, HMAC-SHA256, timingSafeEqual) |
| **Quản trị trạng thái** | React Context (`src/context/AppContext.jsx`) |
| **Lưu trữ** | Document-based JSON Server Disk (Ghi nguyên tử `atomicWriteJSON` chống hỏng file) |

### Cấu trúc mã nguồn
```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.js     # Đăng nhập, khởi tạo pass Host, giới hạn sai mật khẩu (Rate Limit)
│   │   │   ├── register/route.js  # Đăng ký tài khoản khách, cấp User ID và dữ liệu riêng
│   │   │   ├── me/route.js        # Kiểm tra phiên đăng nhập hiện tại
│   │   │   └── logout/route.js    # Đăng xuất, xóa cookie phiên
│   │   └── storage/route.js       # Đọc/ghi dữ liệu theo từng User ID, chống ghi đè xung đột
│   ├── page.jsx, layout.jsx, not-found.jsx, globals.css
├── components/                    # Các view giao diện: DashboardView, TransactionsView, BudgetsView,
│                                  # WhatIfSimulatorView, BillsView, ReportsView, WalletsView, SettingsView,
│                                  # Navigation, AuthModal, QuickAddModal, BankStatementModal...
├── context/AppContext.jsx         # Quản lý state toàn cục, nạp dữ liệu theo User, đồng bộ realtime
├── lib/
│   ├── auth-server.js             # Thư viện xử lý băm mật khẩu, ký phiên HMAC, quản lý users
│   ├── bank-statement-parser.js   # Bộ phân tích sao kê ngân hàng tự động
│   ├── i18n.js                    # Từ điển song ngữ Việt / Anh
│   ├── utils.js                   # Xử lý tính toán số dư, định dạng tiền tệ, merge dữ liệu
│   └── mock-data.js               # Cấu trúc dữ liệu mặc định ban đầu
└── middleware.js                  # Điều hướng các request ứng dụng
data/
├── database.template.json         # Tệp mẫu cấu trúc dữ liệu trắng (được theo dõi trên Git)
├── database.json                  # Dữ liệu tài chính của Host (được bảo vệ, nằm trong .gitignore)
├── users.json                     # Danh sách tài khoản đã mã hóa (nằm trong .gitignore)
├── .session_secret                # Khóa bí mật ký session (nằm trong .gitignore)
└── users/                         # Thư mục lưu dữ liệu riêng của từng người dùng (nằm trong .gitignore)
    ├── admin.json                 # Dữ liệu của Host
    └── usr_<id>.json              # Dữ liệu độc lập của từng Khách
```

---

## 🚀 4. Cài đặt & Vận hành

### Yêu cầu hệ thống
* **Node.js 18.18+** (Khuyên dùng bản LTS Node 20 hoặc Node 22).
* Hệ điều hành: Linux / macOS / Windows (WSL2).

### Cài đặt ban đầu
```bash
git clone https://github.com/vietnamlm05-bit/final-web-app.git
cd final-web-app
npm install
```

### Chạy ứng dụng với 2 đường link (Khuyên dùng)
Hệ thống tích hợp sẵn script tự động hóa khởi chạy máy chủ production kèm đường truyền ra Internet:

```bash
./start.sh
```

Sau khi khởi chạy thành công, terminal sẽ hiển thị 2 đường link:
```text
==================================================================
FinTrack Pro da duoc khoi chay thanh cong voi he thong Da nguoi dung!

👉 LINK 1 (DÀNH CHO BẠN / HOST):
   http://localhost:3000
   * Đăng nhập bằng tài khoản: admin
   * Nếu là lần đầu: tự đặt mật khẩu ngay trên form đăng nhập.

👉 LINK 2 (DÀNH CHO KHÁCH / TRUY CẬP ONLINE):
   https://<domain-cua-ban>.ngrok-free.dev (hoặc link Cloudflare Tunnel)
   * Khách mở link, chọn "Tạo Tài Khoản Khách" để đăng ký.
   * Mỗi khách có User ID riêng và quản lý chi tiêu hoàn toàn độc lập với Host.
==================================================================
```

### Dừng dịch vụ
```bash
./stop.sh
```

### Tùy chọn khác
* **Chỉ chạy Local (không mở tunnel online):**
  ```bash
  NO_TUNNEL=1 ./start.sh
  ```
* **Chế độ phát triển (Development):**
  ```bash
  npm run dev
  ```

---

## 🗄️ 5. Quản lý Dữ liệu & Sao lưu

- **Ghi dữ liệu nguyên tử (Atomic Write):** Khi có giao dịch mới, server ghi ra file tạm `.tmp` rồi mới đổi tên (`fs.rename`), ngăn chặn triệt để nguy cơ tệp dữ liệu bị hỏng khi mất điện đột ngột.
- **Đồng bộ thời gian thực đa thiết bị:** Ứng dụng tự động kiểm tra biến động dữ liệu. Nếu 2 thiết bị cùng sửa đổi, server kích hoạt cơ chế giải quyết xung đột (HTTP 409) và tự động hợp nhất 3 chiều (`mergeSnapshots`), bảo toàn toàn bộ số dư và giao dịch.
- **Sao lưu thủ công:** Bạn có thể vào mục hồ sơ tài khoản và bấm **"Sao lưu dữ liệu"** để tải về tệp JSON dự phòng bất cứ lúc nào.

---

## 📚 6. Tài liệu tham khảo

- [`PROJECT_CHEAT_SHEET.md`](PROJECT_CHEAT_SHEET.md): Bảng tra cứu nhanh sơ đồ màn hình và file mã nguồn tương ứng.
- [`TRACKING_CHANGES.md`](TRACKING_CHANGES.md): Nhật ký chi tiết lịch sử nâng cấp và vá lỗi qua từng phiên bản.
