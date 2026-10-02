# FinTrack Pro - Hệ Thống Quản Lý Chi Tiêu Đa Người Dùng & Mô Phỏng Tài Chính

Ứng dụng web quản lý tài chính cá nhân toàn diện: theo dõi thu chi đa ví, ngân sách thông minh, hóa đơn định kỳ, mục tiêu tiết kiệm, tự động nhập sao kê ngân hàng và **mô phỏng tài chính (What-If simulation)**.

Hệ thống sở hữu cơ chế **Cách ly đa người dùng (Multi-User Isolation)** với kiến trúc bảo mật nghiêm ngặt: một tài khoản Host (`admin`) và các tài khoản Khách (Guest) tự đăng ký, mỗi tài khoản có `User ID` riêng và tệp dữ liệu lưu trữ phía máy chủ được **loại trừ hoàn toàn khỏi các commit Git**. Ứng dụng hỗ trợ giao diện song ngữ (**Tiếng Việt / Tiếng Anh**), chế độ **Sáng / Tối (Light / Dark mode)**, hoạt động mượt mà trên điện thoại, máy tính bảng và máy tính để bàn (hỗ trợ cài đặt trực tiếp vào màn hình chính).

---

## 1. Các Tính Năng Nổi Bật

### Tài Khoản Đa Người Dùng & Kiểm Soát Truy Cập
- **Xác thực bắt buộc:** Màn hình chào mừng phong cách Glassmorphism hiện đại cùng hộp thoại Đăng nhập / Đăng ký, ngăn chặn mọi truy cập trái phép.
- **Tài khoản Host (Chủ sở hữu):** Tài khoản `admin` chuyên dụng lưu trữ đầy đủ dữ liệu tài chính thực tế (các ví, tài khoản ngân hàng, lịch sử giao dịch). Mật khẩu được thiết lập từ biến môi trường `APP_PASSWORD`, hoặc được khởi tạo ở lần đăng nhập đầu tiên kết hợp với **mã thiết lập dùng một lần (one-time setup code)** hiển thị trên terminal máy chủ (`data/.host_setup_code`), đảm bảo người lạ truy cập link công khai không thể chiếm quyền quản trị.
- **Tài khoản Khách (Guest):** Khách truy cập liên kết ứng dụng và nhấn **"Tạo tài khoản Khách"**. Mỗi khách sẽ nhận được một `User ID` riêng biệt (`usr_...`) với dữ liệu khởi tạo trống: một ví Tiền mặt, một tài khoản Ngân hàng (đều có số dư 0 ₫) cùng các danh mục mặc định. Khách không thể xem hoặc chỉnh sửa dữ liệu của Host và ngược lại.
- **Quản lý phiên làm việc:** Huy hiệu phân quyền (Host / Guest) hiển thị trên thanh điều hướng đầu trang cùng nút **Đăng xuất** an toàn.
- **Cài đặt tài khoản:** Đổi mật khẩu (tự động đăng xuất khỏi các thiết bị khác) và cho phép khách xóa vĩnh viễn tài khoản cùng toàn bộ dữ liệu. Trường hợp quên mật khẩu có thể đặt lại trực tiếp trên máy chủ qua lệnh: `npm run reset-password -- <username>`.
- **Khóa PIN ứng dụng:** Mã PIN tùy chọn từ 4–8 chữ số cần nhập trên mỗi trình duyệt (sau mỗi lần đăng nhập và định kỳ sau 12 giờ) trước khi hiển thị dữ liệu tài chính. Mật khẩu tài khoản cũng có thể được sử dụng trên màn hình nhập PIN như một phương thức khôi phục.

### Quản Lý Ví & Tài Sản
- **4 Loại ví chuyên biệt:** Tiền mặt, Tài khoản ngân hàng, Thẻ tín dụng (hạn mức tín dụng, theo dõi dư nợ riêng biệt) và Tài khoản tiết kiệm (theo dõi lãi suất).
- Tự động tính toán **Số dư khả dụng** và **Giá trị tài sản ròng (Net Worth)**; dư nợ thẻ tín dụng được tách bạch nghiêm ngặt để phản ánh chính xác bức tranh tài chính.
- **Thanh toán dư nợ thẻ tín dụng:** Trích tiền từ ví tiền mặt / tài khoản ngân hàng để thanh toán thẻ tín dụng (được ghi nhận là chuyển khoản nội bộ, không tính trùng vào chi tiêu).
- **Đối soát số dư (Balance Reconciliation):** Tính năng *"Tính toán lại số dư"* chỉ với 1 cú nhấp chuột giúp tái tạo lại chính xác số dư của từng ví từ số dư ban đầu cộng dồn toàn bộ lịch sử giao dịch.

### Ghi Chép Giao Dịch & Nhập Liệu Nhanh
- Ghi chép chi tiêu và thu nhập; phân loại theo nhãn (tags) và ghi chú, đính kèm **ảnh hóa đơn** (tự động nén tối ưu trước khi lưu), chỉnh sửa hoặc xóa giao dịch với cơ chế tự động hoàn tác số dư. Danh sách giao dịch được sắp xếp theo ngày và hỗ trợ tìm kiếm linh hoạt bằng cả hai ngôn ngữ.
- **Hộp thoại Thêm nhanh (Quick Add):** Truy cập tức thì từ bất kỳ màn hình nào, tích hợp sẵn các phím bấm số tiền nhanh (+50k, +100k, +200k, +500k, +1M, +2M, +5M).
- Kiểm tra tính hợp lệ thông minh: chống bội chi tài khoản, giới hạn theo hạn mức tín dụng, ngăn chặn giao dịch ở tương lai; ngày giao dịch được hiển thị rõ ràng theo định dạng chuẩn của ứng dụng.

### Trình Phân Tích Sao Kê Ngân Hàng Tự Động
- Tải lên tệp **Excel (.xlsx, .xls)** hoặc **CSV**. Tự động nhận diện cấu trúc định dạng sao kê của 14 ngân hàng Việt Nam (Techcombank, Vietcombank, MB Bank, VPBank, ACB, BIDV, VietinBank, TPBank, VIB, Agribank, Sacombank, Timo, HDBank, Cake by VPBank); các định dạng khác có thể ghép cột thủ công vào ví tương ứng.
- Cơ chế phát hiện giao dịch trùng lặp, tự động gợi ý danh mục thông minh dựa trên nội dung chuyển khoản và loại bỏ các dòng có ngày tháng không hợp lệ.

### Ngân Sách & Mục Tiêu Tiết Kiệm
- Thiết lập hạn mức chi tiêu cho từng danh mục với các ngưỡng cảnh báo tự động: **chạm ngưỡng 80%** (màu vàng cam) và **vượt hạn mức 100%** (màu đỏ).
- Phân bổ thu nhập theo phương pháp quản lý tài chính nhiều hũ / phong bì (envelope budgeting) kèm quỹ dự phòng khẩn cấp.
- **Mục tiêu tài chính:** Nạp/rút tiền trực tiếp từ các ví, kèm hiệu ứng pháo hoa chúc mừng (confetti) khi hoàn thành mục tiêu.

### Hóa Đơn Định Kỳ & Đăng Ký Gói Cước
- Theo dõi tiền điện, nước, internet, tiền thuê nhà theo chu kỳ **Hàng tháng / Hàng quý / Hàng năm**.
- Tính toán chính xác ngày đến hạn theo lịch, hiển thị đồng hồ đếm ngược và thông báo trực quan cho các hóa đơn sắp đến hạn hoặc quá hạn.
- Nút **"Thanh toán ngay"** lập tức tạo giao dịch chi tiêu tương ứng và trừ tiền từ ví được chọn (mặc định ưu tiên ví có đủ số dư); hủy thanh toán sẽ hoàn tiền lại cho ví.
- Biểu tượng chuông nhắc nhở ở thanh tiêu đề thông báo về các hóa đơn sắp đến hạn / quá hạn và ngân sách bị vượt mức.

### Mô Phỏng Tài Chính What-If
- Thử nghiệm các kịch bản dự báo tài chính tương lai: thanh trượt cắt giảm chi tiêu (0–50%), tích lũy tiết kiệm hàng tháng, các kịch bản thị trường đầu tư và khấu hao các khoản vay bên ngoài.
- Dự phóng đa khung thời gian (**6 / 12 / 24 / 36 tháng**) với biểu đồ tương tác so sánh giữa xu hướng tăng trưởng cơ sở và các kịch bản mô phỏng.

### Báo Cáo & Xuất Dữ Liệu
- Phân tích trực quan về cơ cấu phân bổ chi tiêu, xu hướng dòng tiền hàng tháng và quỹ đạo thu nhập ròng.
- Xuất dữ liệu sang tệp **Excel đa trang tính (.xlsx)** (giao dịch, các ví, ngân sách, báo cáo tổng hợp) và tệp **CSV chuẩn UTF-8** theo ngôn ngữ đã chọn (các ô bắt đầu bằng `= + - @` được xử lý thoát ký tự an toàn để phần mềm bảng tính không tự ý thực thi công thức).

---

## 2. Kiến Trúc Bảo Mật Nghiêm Ngặt

FinTrack Pro được xây dựng theo mô hình phòng thủ theo chiều sâu (defense-in-depth):

| Lớp bảo mật | Triển khai kỹ thuật |
|---|---|
| **Băm mật khẩu (Password Hashing)** | Băm một chiều bằng thuật toán **`scrypt`** kết hợp với chuỗi `salt` ngẫu nhiên 16-byte chuẩn mật mã học. Mật khẩu gốc không bao giờ được lưu trữ. Xác thực thông qua `crypto.timingSafeEqual` nhằm chống lại các cuộc tấn công dựa trên thời gian (timing attacks). |
| **Chống tấn công Brute-Force** | Giới hạn số lần thử Đăng nhập / PIN **theo từng IP (5 lần / 15 phút)** và **theo từng tài khoản (10 lần / 15 phút)**; mỗi lần thử được đếm nguyên tử (atomic) trước khi xác thực, vô hiệu hóa các đợt bùng nổ song song và giả mạo xoay vòng tiêu đề `X-Forwarded-For`. IP máy khách được lấy từ `cf-connecting-ip` hoặc proxy hop ngoài cùng bên phải. Các yêu cầu gửi trực tiếp từ máy chủ (host) được miễn trừ khóa theo tài khoản, tránh trường hợp kẻ xấu cố tình khóa tài khoản chủ sở hữu. Đăng ký tài khoản bị giới hạn 5 tài khoản / IP / giờ và `MAX_REGISTRATIONS_PER_HOUR` trên toàn hệ thống; có thể tắt đăng ký bằng `ALLOW_REGISTRATION=false`, và giới hạn kích thước request body tối đa 1 MB. Quá trình băm sử dụng `scrypt` bất đồng bộ nên không gây nghẽn các yêu cầu khác. |
| **Thiết lập tài khoản Host** | Mật khẩu tài khoản `admin` lần đầu tiên yêu cầu biến môi trường `APP_PASSWORD` hoặc mã thiết lập dùng một lần lấy từ console của máy chủ. |
| **Bảo vệ phiên làm việc (Session)** | Cookie phiên `fintrack_session` được ký điện tử bằng **HMAC-SHA256** (sử dụng `APP_SESSION_SECRET` hoặc `data/.session_secret`), cờ `HttpOnly`, `SameSite=lax`, thời hạn 7 ngày, bị thu hồi ngay lập tức khi đăng xuất hoặc đổi mật khẩu (`tokenVersion`). |
| **Khóa PIN ứng dụng** | Nhập mã PIN (hoặc mật khẩu tài khoản) sẽ cấp một cookie `HttpOnly` thời hạn ngắn (`fintrack_unlock`, 12 giờ, gắn liền với mã băm PIN và phiên làm việc). Việc đăng nhập **không** tự động mở khóa PIN. Mã PIN và mật khẩu **tuyệt đối không lưu trong localStorage / sessionStorage**; dữ liệu thừa từ các phiên bản cũ sẽ tự động bị xóa khi tải trang. |
| **Chống CSRF & Tiêu đề bảo mật** | Từ chối các lệnh gọi API làm thay đổi dữ liệu đến từ các trang web khác (`Sec-Fetch-Site: cross-site / same-site`). Thiết lập CSP nghiêm ngặt không có `unsafe-eval` trong môi trường production, `frame-ancestors 'none'`, HSTS, `nosniff`. |
| **Sao lưu mã hóa** | Mã hóa chuẩn AES-256-GCM với `APP_BACKUP_KEY` hoặc `data/.backup_key`; máy chủ sẽ từ chối tạo bản sao lưu nếu thiếu khóa riêng thay vì dùng khóa mặc định có sẵn. |
| **Cách ly dữ liệu (Data Isolation)** | Máy chủ trích xuất `userId` tuyệt đối từ chữ ký phiên đã được xác thực (theo nguyên lý Zero Trust Client). Mọi bảng dữ liệu trong MySQL đều có cột `user_id` nằm trong khóa chính, và mọi câu truy vấn đều lọc theo `user_id` lấy từ phiên, nên một tài khoản không thể đọc hay ghi dữ liệu của tài khoản khác. Mọi câu lệnh SQL truyền giá trị qua tham số `?` (được escape tự động, không ghép chuỗi), chống SQL injection. |
| **Cơ sở dữ liệu** | MySQL chỉ mở cổng trên `127.0.0.1` (không truy cập được từ mạng), ứng dụng dùng tài khoản MySQL riêng `fintrack` thay vì `root`. Ràng buộc nằm ngay trong database (khóa ngoại, `CHECK` số tiền > 0, loại giao dịch hợp lệ, tên đăng nhập không trùng, chỉ một tài khoản Host), nên dữ liệu sai bị từ chối kể cả khi bỏ qua lớp kiểm tra của ứng dụng. |
| **Phân quyền hệ thống tệp** | Thư mục `data/` (chứa các khóa bí mật) được tạo / thắt chặt quyền **`0700`**, các tệp khóa có quyền **`0600`**; tệp sao lưu database (`npm run db:backup`) cũng được ghi với quyền `0600`. |
| **Bảo mật khi đẩy lên Git** | `.gitignore` loại trừ hoàn toàn `data/*.json` (ngoại trừ tệp template), `data/users/`, `data/legacy-json-*/`, `data/.session_secret`, `data/.backup_key`, `data/.host_setup_code`, thư mục `backups/` (bản sao lưu database) và `.env`. Khi push mã nguồn lên GitHub, **toàn bộ dữ liệu tài chính, tài khoản người dùng và các khóa bí mật đều được giữ lại trên máy cục bộ của bạn và tuyệt đối không bao giờ bị rò rỉ**. |

---

## 3. Ngăn Xếp Công Nghệ (Tech Stack)

| Thành phần | Công nghệ sử dụng |
|---|---|
| **Framework** | **Next.js 15** (App Router), **React 19**, JavaScript (JSX) |
| **Giao diện & Định kiểu** | **Tailwind CSS v4**, **Lucide React** (icon), Canvas-Confetti |
| **Trực quan hóa dữ liệu** | **Recharts** |
| **Xử lý bảng tính** | **SheetJS (xlsx)** |
| **Xác thực & Mật mã học** | Mô-đun `crypto` tích hợp sẵn của Node.js (scrypt, HMAC-SHA256, timingSafeEqual) |
| **Quản lý trạng thái** | React Context (`src/context/AppContext.jsx`) |
| **Cơ sở dữ liệu** | **MySQL 8.4** (thư viện `mysql2`), chạy bằng Docker / Podman qua `docker-compose.yml`. Mỗi lần lưu là một **transaction**: hoặc ghi trọn vẹn, hoặc không ghi gì |

### Cấu Trúc Mã Nguồn (Source Tree)
```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.js     # Xác thực, khởi tạo Host, giới hạn tần suất (Rate limiting)
│   │   │   ├── register/route.js  # Đăng ký tài khoản Khách, cấp User ID & dữ liệu cách ly
│   │   │   ├── me/route.js        # Xác thực phiên làm việc hiện tại
│   │   │   ├── password/route.js  # Đổi mật khẩu (thu hồi các phiên làm việc khác)
│   │   │   ├── account/route.js   # Xóa tài khoản khách và dữ liệu liên quan
│   │   │   └── logout/route.js    # Đăng xuất, hủy bỏ cookie phiên
│   │   └── storage/route.js       # Đọc/ghi dữ liệu cách ly theo người dùng, mở khóa PIN, giải quyết xung đột
│   ├── page.jsx, layout.jsx, globals.css
│   ├── error.jsx, global-error.jsx, loading.jsx, not-found.jsx
│   └── manifest.js, robots.js, icon.svg, apple-icon.png, favicon.ico
├── components/                    # Các màn hình UI: DashboardView, TransactionsView, BudgetsView,
│                                  # WhatIfSimulatorView, BillsView, ReportsView, WalletsView, SettingsView,
│                                  # Navigation, AuthModal, QuickAddModal, BankStatementModal...
├── context/AppContext.jsx         # Quản lý trạng thái toàn cục, nạp dữ liệu người dùng, đồng bộ thời gian thực
├── lib/
│   ├── auth-server.js             # Xác thực phía máy chủ, băm scrypt, ký phiên HMAC, khởi tạo tài khoản Host
│   ├── db.js                      # Kết nối MySQL (connection pool), tạo / nâng cấp bảng (migrations), transaction
│   ├── store.js                   # Đọc / ghi dữ liệu người dùng vào các bảng MySQL, kiểm tra xung đột phiên bản
│   ├── legacy-import.js           # Chuyển dữ liệu từ các tệp JSON của phiên bản cũ sang MySQL (chạy một lần)
│   ├── request-security.js        # IP máy khách, phát hiện yêu cầu cục bộ, giới hạn tần suất, giới hạn kích thước body
│   ├── registration.js            # Bật/tắt đăng ký (ALLOW_REGISTRATION) và giới hạn tần suất đăng ký
│   ├── storage-validation.js      # Xác thực tính hợp lệ của snapshot dữ liệu phía máy chủ (storage + register)
│   ├── secure-backup.js           # Sao lưu mã hóa chuẩn AES-256-GCM
│   ├── backup-validation.js       # Xác thực tệp sao lưu trước khi nhập
│   ├── security-logger.js         # Nhật ký kiểm toán bảo mật có cấu trúc (audit log)
│   ├── bank-statement-parser.js   # Bộ máy phân tích sao kê ngân hàng tự động
│   ├── i18n.js                    # Từ điển song ngữ (Tiếng Việt / Tiếng Anh)
│   ├── utils.js                   # Các phép tính tài chính, đối soát số dư, định dạng tiền tệ
│   └── mock-data.js               # Định nghĩa schema ban đầu và dữ liệu mẫu khởi tạo
└── middleware.js                  # Lớp bảo vệ CSRF (Sec-Fetch-Site), ranh giới xác thực, tiêu đề bảo mật
scripts/
├── reset-password.mjs             # Đặt lại mật khẩu bị quên trực tiếp trên máy chủ
├── db-check.mjs                   # Kiểm tra kết nối MySQL, tạo / nâng cấp bảng (npm run db:check)
└── db-backup.mjs                  # Sao lưu toàn bộ database ra tệp .sql.gz (npm run db:backup)
tests/                             # Kiểm thử node:test (đơn vị + tích hợp với MySQL)
docker-compose.yml                 # Dịch vụ MySQL 8.4 (chỉ mở trên 127.0.0.1, dữ liệu nằm trong volume)
data/                              # Chỉ còn các khóa bí mật (trong .gitignore)
├── database.template.json         # Tệp schema mẫu sạch (được theo dõi trong Git)
├── .session_secret                # Khóa ký HMAC
├── .backup_key                    # Khóa mã hóa sao lưu
├── .host_setup_code               # Mã thiết lập Host dùng một lần, tự xóa sau khi dùng
└── legacy-json-<thời gian>/       # Tệp JSON của phiên bản cũ, được giữ lại sau khi chuyển sang MySQL
```

### Cấu Trúc Cơ Sở Dữ Liệu (MySQL)
| Bảng | Nội dung |
|---|---|
| `users` | Tài khoản: tên đăng nhập (không trùng, không phân biệt hoa thường), vai trò host/guest, mã băm mật khẩu + salt, `token_version` |
| `user_state` | Mỗi tài khoản một dòng: phiên bản đồng bộ (`updated_at`), tháng đang xem, kế hoạch, cấu hình mô phỏng, hồ sơ, mã băm PIN |
| `wallets`, `categories`, `transactions`, `budgets`, `bills`, `goals`, `goal_history` | Dữ liệu tài chính, mỗi dòng gắn với `user_id`. Giao dịch có khóa ngoại tới ví; số tiền lưu bằng `DECIMAL(19,4)` (không sai số làm tròn như số thực) |
| `secure_backups` | Các bản sao lưu mã hóa AES-256-GCM (tối đa 20 bản / tài khoản) |
| `schema_migrations`, `app_meta` | Phiên bản cấu trúc bảng đã áp dụng, thông tin hệ thống |

Bảng được tạo tự động ở lần chạy đầu tiên (hoặc bằng `npm run db:check`); khi cấu trúc thay đổi ở phiên bản sau, ứng dụng tự nâng cấp và ghi lại vào `schema_migrations`.

---

## 4. Cài Đặt & Bắt Đầu Sử Dụng

### Yêu Cầu Hệ Thống
* **Node.js 18.18+** để build và chạy ứng dụng; **Node.js 22.15+** để chạy các bài kiểm thử (`npm test`). Khuyến nghị sử dụng phiên bản Node 22 LTS (phiên bản được sử dụng trong CI).
* **MySQL 8.4**: cách đơn giản nhất là chạy bằng **Docker** hoặc **Podman** với tệp `docker-compose.yml` có sẵn (hoặc dùng một máy chủ MySQL 8 sẵn có).
* Hệ điều hành: Linux / macOS / Windows (WSL2).

### Tải Về & Cài Đặt
```bash
git clone https://github.com/vietnamlm05-bit/final-web-app.git
cd final-web-app
npm install
cp .env.example .env   # điền MYSQL_PASSWORD, MYSQL_ROOT_PASSWORD, DATABASE_URL; tùy chọn: APP_PASSWORD, ALLOW_REGISTRATION...
```

### Database (MySQL)
1. Mở `.env`, đặt hai mật khẩu ngẫu nhiên (tạo bằng `openssl rand -hex 16`) cho `MYSQL_ROOT_PASSWORD` và `MYSQL_PASSWORD`, rồi điền **cùng mật khẩu `MYSQL_PASSWORD`** vào `DATABASE_URL`:
   ```bash
   DATABASE_URL=mysql://fintrack:<MYSQL_PASSWORD>@127.0.0.1:3306/fintrack
   ```
2. Khởi động MySQL và kiểm tra kết nối (lệnh thứ hai cũng tạo các bảng):
   ```bash
   docker compose up -d db      # hoặc: podman compose up -d db
   npm run db:check
   ```
3. **Nâng cấp từ phiên bản cũ lưu bằng JSON:** chỉ cần giữ nguyên thư mục `data/` cũ. Ở lần chạy đầu tiên với database trống, ứng dụng tự chuyển toàn bộ tài khoản (giữ nguyên mật khẩu), dữ liệu tài chính và bản sao lưu mã hóa sang MySQL trong **một transaction**: nếu có lỗi thì không có gì được ghi và tệp JSON vẫn nguyên vẹn. Sau khi chuyển xong, các tệp JSON được dời (không xóa) vào `data/legacy-json-<thời gian>/`.

Nếu MySQL ngừng hoạt động khi ứng dụng đang chạy, trang web hiển thị thông báo *"Máy chủ tạm thời không phản hồi"* kèm nút *Thử lại* (không đăng xuất người dùng); ứng dụng tự kết nối lại khi MySQL chạy trở lại.

### Chạy Với Cơ Chế Liên Kết Kép (Khuyến Nghị)
Dự án tích hợp sẵn tập lệnh khởi động tự động giúp build bản production đồng thời thiết lập đường hầm mạng (tunneling) bảo mật ra internet:

```bash
./start.sh
```

Sau khi khởi động thành công, màn hình terminal sẽ hiển thị 2 đường link truy cập (cả hai liên kết đều trỏ đến cùng một ứng dụng, việc phân chia chỉ là quy ước chỉ định đối tượng sử dụng):
```text
==================================================================
FinTrack Pro da khoi chay thanh cong voi co che Cach ly Da nguoi dung!

👉 LINK 1 (HOST / TRUY CẬP CỤC BỘ):
   http://localhost:3000
   * Đăng nhập với tên người dùng: admin
   * Thiết lập lần đầu: chọn mật khẩu trong hộp thoại đăng nhập và điền MÃ THIẾT LẬP (SETUP CODE) được in tại đây.

👉 LINK 2 (GUEST / TRUY CẬP TỪ XA):
   https://<ten-mien-ngrok-cua-ban>.ngrok-free.dev (hoặc URL Cloudflare Tunnel)
   * Khách mở liên kết này và nhấn "Tạo tài khoản Khách" để đăng ký.
   * Mỗi khách được cấp một User ID riêng biệt và kho lưu trữ tài chính độc lập.
==================================================================
```

### Dừng Dịch Vụ
```bash
./stop.sh
```

### Các Chế Độ Chạy Khác
* **Chỉ chạy cục bộ (Không mở tunnel công khai):**
  ```bash
  NO_TUNNEL=1 ./start.sh
  ```
* **Chế độ phát triển (Development):**
  ```bash
  npm run dev
  ```

### Kiểm Tra Chất Lượng Mã Nguồn
```bash
npm run lint    # Kiểm tra mã nguồn với ESLint (next/core-web-vitals)
npm test        # Chạy kiểm thử đơn vị node:test: số dư & hợp nhất dữ liệu, hóa đơn, bộ đọc sao kê, xác thực, sao lưu mã hóa, giới hạn tần suất
npm run build   # Build bản phát hành production
```
Kiểm thử tích hợp với MySQL (lưu / đọc dữ liệu, xung đột đồng bộ, ràng buộc database, chuyển dữ liệu JSON cũ) chỉ chạy khi có `TEST_DATABASE_URL` trỏ tới **một database riêng dùng để thử**, vì mọi bảng trong database đó sẽ bị xóa:
```bash
TEST_DATABASE_URL=mysql://fintrack:<mật khẩu>@127.0.0.1:3306/fintrack_test npm test
```
Các bước kiểm tra này cũng được tự động thực thi trên GitHub Actions sau mỗi lần push hoặc tạo pull request (`.github/workflows/ci.yml`).

### Lưu Ý Về Triển Khai (Deployment)
Dữ liệu nằm trong MySQL (volume `fintrack-mysql-data` khi chạy bằng `docker-compose.yml`), còn thư mục `data/` giữ các khóa bí mật. Ứng dụng phù hợp với máy tính cá nhân (kèm tunnel qua `start.sh`) hoặc máy chủ VPS. Khi chuyển máy chủ, cần mang theo **cả** bản sao lưu database lẫn thư mục `data/` (thiếu `.backup_key` thì không giải mã được các bản sao lưu mã hóa).

---

## 5. Quản Lý Dữ Liệu & Sao Lưu

- **Ghi dữ liệu bằng transaction:** Mỗi lần lưu được thực hiện trong một transaction MySQL (InnoDB): hoặc toàn bộ thay đổi được ghi, hoặc không có gì thay đổi, kể cả khi máy chủ bị tắt đột ngột hoặc mất điện. Dòng `user_state` của tài khoản được khóa (`SELECT ... FOR UPDATE`) trong lúc so sánh phiên bản, nên hai thiết bị lưu cùng lúc không thể ghi đè lên nhau.
- **Đồng bộ thời gian thực trên nhiều thiết bị:** Ứng dụng theo dõi phiên bản snapshot. Khi xảy ra chỉnh sửa đồng thời trên nhiều thiết bị khác nhau, máy chủ sẽ kích hoạt cơ chế giải quyết xung đột (`HTTP 409`) và thực hiện hợp nhất 3 chiều (`mergeSnapshots`), bảo toàn trọn vẹn số dư và tất cả các giao dịch.
- **Chỉnh sửa ngoại tuyến (Offline):** Các thay đổi được thực hiện khi mất kết nối máy chủ sẽ được lưu lại trên thiết bị (được đánh dấu trạng thái *Ngoại tuyến*) và tự động đẩy lên, hợp nhất khi có mạng trở lại; nếu người dùng đăng xuất khi còn thay đổi chưa đồng bộ, hệ thống sẽ hiển thị cảnh báo xác nhận.
- **Sao lưu định dạng JSON:** Tải xuống bản snapshot JSON đầy đủ từ mục *Cài đặt* (phần dữ liệu & sao lưu) hoặc từ menu tài khoản, và khôi phục trực tiếp tại các vị trí này. Hệ thống hỗ trợ tương thích ngược với các định dạng sao lưu cũ hơn (tự động tính lại số dư từ lịch sử giao dịch, chuyển đổi các số bị lưu dưới dạng chuỗi văn bản).
- **Sao lưu toàn bộ database:** `npm run db:backup` ghi một bản sao lưu nhất quán của tất cả tài khoản vào `backups/fintrack-<thời gian>.sql.gz` (không cần cài `mysqldump`). Khôi phục: `gunzip -c <tệp>.sql.gz | docker exec -i fintrack-mysql mysql -u fintrack -p<MYSQL_PASSWORD> fintrack` (hoặc `| mysql -h 127.0.0.1 -u fintrack -p fintrack` nếu máy có sẵn lệnh `mysql`). Nên đặt lệnh này chạy định kỳ (ví dụ cron hằng ngày) và sao chép tệp ra nơi khác.
- **Sao lưu mã hóa trên máy chủ:** Mục *Cài đặt → Sao lưu bảo mật* lưu trữ tối đa 20 bản snapshot mã hóa chuẩn AES-256-GCM cho mỗi tài khoản trên máy chủ; trước khi khôi phục một bản sao lưu bất kỳ, hệ thống sẽ tự động tạo một bản sao lưu an toàn cho dữ liệu hiện tại.
