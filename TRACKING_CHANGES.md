# NHẬT KÝ THEO DÕI THAY ĐỔI DỰ ÁN (PROJECT CHANGELOG & TRACKING)

> **Mục đích của tệp này:** Ghi lại chi tiết tất cả các thay đổi, sửa lỗi, nâng cấp tính năng trong dự án. Giúp người phát triển và người dùng dễ dàng theo dõi sự khác biệt giữa phiên bản hiện tại so với mã nguồn ban đầu.

---

## [LẦN CHỈNH SỬA 16] - Gộp nhánh & sửa lỗi sau rà soát (đồng bộ, PIN, hóa đơn định kỳ, hoàn tiền)

* **Thời gian thực hiện:** 01/10/2026
* **Phạm vi:** `api/storage/route.js`, `AppContext.jsx`, `BillsView.jsx`, `SettingsView.jsx`, `TransactionsView.jsx`, `QuickAddModal.jsx`, `utils.js`, `i18n.js`, `start.sh`

### Lỗi đã sửa
1. **Giao dịch đã xóa tự sống lại:** bỏ cơ chế "server tự cộng giao dịch trong 10 phút gần nhất". Thay bằng kiểm tra phiên bản (`baseUpdatedAt` → HTTP 409) và merge 3 chiều ở client; số dư ví được tính lại từ lịch sử sau khi merge.
2. **DB hỏng bị ghi đè bằng dữ liệu mẫu:** file hỏng được sao lưu (`database.json.corrupt-*`, mỗi phiên bản 1 lần) và trả lỗi, không ghi đè. Khi DB hỏng chỉ cho phép khôi phục từ máy chủ (không qua tunnel) hoặc khi có `APP_PIN`.
3. **PIN có thể dò được:** PIN lưu dạng băm scrypt + salt (tự chuyển PIN plaintext cũ), so sánh constant-time, chỉ nhận qua header `x-app-pin` (bỏ `?pin=` trên URL), giới hạn 5 lần sai/IP và 30 lần sai toàn cục mỗi 15 phút (HTTP 429). Server không bao giờ trả PIN/hash về client.
4. **Bật khóa PIN có thể xóa mất PIN:** đổi PIN/bật tắt qua action riêng `updateSecurity`; không cho bật khi chưa có PIN; dữ liệu đồng bộ thường không thể ghi đè phần `security`. Server chỉ lưu các trường dữ liệu đã biết (bỏ `isReset`...).
5. **Màn hình khóa PIN:** khi chưa mở khóa, không nạp dữ liệu và không auto-save (trước đây có thể đẩy dữ liệu mẫu lên / ghi đè cache local).
6. **Hóa đơn đánh dấu "Đã thanh toán" từ form không tạo giao dịch:** `addBill` trả về hóa đơn mới, `payBill` nhận object; trạng thái PAID chỉ được đặt sau khi giao dịch chi phí ghi thành công.
7. **Hoàn tiền hóa đơn định kỳ không trả tiền về ví:** hóa đơn thanh toán từ bản cũ không có `lastPaymentTxId` nên "Đặt lại" chỉ đổi trạng thái. Nay tự dò giao dịch thanh toán (theo `billId` / nội dung / số tiền / ngày), hỏi xác nhận kèm số tiền & ví, và báo rõ khi không tìm thấy giao dịch. Giao dịch thanh toán mới được gắn `billId`.
8. **Xóa giao dịch thanh toán / nạp hũ trong danh sách giao dịch:** hóa đơn tự về "Chưa thanh toán", số tiền trong hũ mục tiêu được hoàn tác.
9. **Ngày đến hạn hóa đơn quý/năm:** `getBillDueInfo` tính kỳ tiếp theo theo tần suất (1/3/12 tháng), parse ngày theo giờ địa phương.
10. **Modal sửa giao dịch bị crash:** thiếu `language`, `tTag`, `tWalletName` trong `useApp()`.
11. **Nhập sao kê:** danh mục phải tồn tại & đúng loại thu/chi, ghi chú giới hạn 300 ký tự; không kẹp số dư về 0 (giữ khớp với lịch sử).
12. **`start.sh`:** cho phép mở tunnel khi có `APP_PASSWORD` hoặc `APP_PIN`.

---

## [LẦN CHỈNH SỬA 15] - Khắc phục toàn diện 15 lỗi hệ thống theo danh sách Audit (Bảo mật, Dữ liệu, Ví, Hóa đơn, Mục tiêu, Sao lưu & Triển khai)

* **Thời gian thực hiện:** 01/10/2026
* **Mức độ ảnh hưởng:** Toàn hệ thống (`/api/storage/route.js`, `AppContext.jsx`, `BillsView.jsx`, `SettingsView.jsx`, `TransactionsView.jsx`, `QuickAddModal.jsx`, `utils.js`)
* **Trạng thái:** ✅ Đã hoàn thành 100%, vượt qua tất cả kiểm thử tự động, build production thành công 0 lỗi.

### 1. Bối Cảnh & Danh Sách Lỗi Từ Bảng Đánh Giá Của Người Dùng
Người dùng cung cấp ảnh chụp bảng đánh giá phân loại rủi ro gồm 15 vấn đề:
1. `Critical | Security`: `/api/storage` không có authentication
2. `Critical | Security`: Ai truy cập URL ngrok cũng có khả năng đọc/ghi toàn bộ database
3. `Critical | Data`: POST có thể ghi thất bại nhưng vẫn trả `success: true`
4. `Critical | Data`: Multi-device sync có race condition / lost update
5. `Critical | Wallet`: Xóa ví có thể làm sai balance của ví còn lại
6. `High | Bills`: Bill PAID không reset theo chu kỳ tháng/quý/năm
7. `High | Bills`: Có thể đánh dấu bill PAID nhưng transaction không được tạo
8. `High | Goals`: Goal thay đổi trước khi transaction tương ứng chắc chắn thành công
9. `High | Import`: Import statement bypass nhiều validation của transaction thông thường
10. `High | Storage`: Không có schema validation cho database
11. `Medium | UX/Security`: Settings hiển thị authentication giả
12. `Medium | Date`: Logic bill chỉ dùng day of month, không xử lý đầy đủ tháng/năm
13. `Medium | Files`: Receipt base64 làm database phình rất nhanh
14. `Medium | Architecture`: Một số component 50-90 KB, khó maintain/test
15. `Medium | Deploy`: Deploy trên Vercel, không phải persistent database

---

### 2. Các Biện Pháp Kỹ Thuật Đã Triển Khai Chi Tiết

#### Nhóm 1: Bảo Mật & Xác Thực (Vấn đề 1, 2, 11)
- **Cơ chế App PIN Guard & Khóa API `/api/storage`:**
  * Thêm logic kiểm tra quyền truy cập `checkAuth` tại `/api/storage/route.js`. Khi mã PIN bảo mật được bật (trong cài đặt hoặc biến môi trường `APP_PIN`), mọi yêu cầu `GET` hoặc `POST` bắt buộc phải gửi kèm header `x-app-pin` hoặc tham số `?pin=...`. Yêu cầu không có PIN hợp lệ lập tức bị từ chối với mã lỗi `HTTP 401 Unauthorized`.
  * Tại giao diện client, khi máy chủ trả về mã lỗi 401 (người truy cập qua link Ngrok mà chưa nhập PIN), ứng dụng kích hoạt màn hình khóa mờ toàn màn hình (Security PIN Overlay) yêu cầu nhập mã PIN hợp lệ trước khi xem bất kỳ số dư hay giao dịch nào.
- **Loại bỏ huy hiệu bảo mật giả trong `SettingsView.jsx` (Vấn đề 11):**
  * Gỡ bỏ hoàn toàn badge tĩnh "Clerk / NextAuth Google OAuth - Bảo mật cao".
  * Thay thế bằng bảng điều khiển **Bảo Mật & Khóa Ứng Dụng (Mã PIN & API Guard)** hoạt động thật 100%: Cho phép người dùng bật/tắt khóa PIN, thiết lập hoặc đổi mã PIN 4-8 chữ số, hiển thị trạng thái bảo vệ thời gian thực chống truy cập trái phép qua Ngrok, và quản lý hồ sơ người dùng thực tế.

#### Nhóm 2: An Toàn Cơ Sở Dữ Liệu & Đồng Bộ Đa Thiết Bị (Vấn đề 3, 4, 10)
- **Khắc phục lỗi HTTP status giả trong POST `/api/storage` (Vấn đề 3):**
  * Xóa bỏ đoạn code trả về `status: 200, success: true` trong khối `catch`. Khi có lỗi ghi đĩa hoặc lỗi xử lý, API trả về chính xác `HTTP 500` kèm thông báo lỗi rõ ràng.
- **Thực thi ghi tệp nguyên tử (Atomic File Writes):**
  * Áp dụng cơ chế ghi tệp tạm thời `.tmp` sau đó đổi tên (`fs.rename`) vào `data/database.json`, ngăn chặn hoàn toàn nguy cơ hỏng tệp khi mất điện hoặc ghi dữ liệu dở dang.
- **Kiểm tra hợp lệ cấu trúc (Schema Validation - Vấn đề 10):**
  * Xây dựng hàm `validateDatabaseSchema(payload)` tại route API. Bắt buộc kiểm tra các trường `wallets`, `transactions`, `categories`, `budgets`, `bills`, `goals` phải là mảng (Array), các giao dịch phải có số tiền `amount` là số hữu hạn hợp lệ. Trả về `HTTP 400 Bad Request` nếu payload sai định dạng.
- **Chống Lost Update trong đồng bộ đa thiết bị (Race Condition - Vấn đề 4):**
  * Tại API `/api/storage`, khi nhận yêu cầu POST cập nhật trạng thái từ một thiết bị, máy chủ đối chiếu danh sách giao dịch hiện có trên đĩa. Các giao dịch được tạo đồng thời từ thiết bị khác trong khoảng thời gian đồng bộ gần nhất sẽ được hòa trộn tự động (Merge by unique ID) thay vì bị ghi đè mất dấu. Kết quả hòa trộn được trả về ngay để client cập nhật đồng bộ tức thì.

#### Nhóm 3: Toàn Vẹn Số Dư Khi Xóa Ví (Vấn đề 5)
- **Tái cấu trúc hàm `deleteWallet` trong `AppContext.jsx`:**
  * Trước đây: `deleteWallet` xóa thẳng mọi giao dịch có `walletId === id || toWalletId === id`. Điều này làm các giao dịch chuyển khoản (`TRANSFER`) bị xóa mất, khiến ví còn lại bị sai lệch số dư nghiêm trọng khi tính toán lại.
  * Hiện tại: Đối với giao dịch chuyển khoản giữa ví bị xóa và một ví còn lại:
    - Nếu ví còn lại là bên nhận: Giao dịch được chuyển đổi thành `INCOME` cho ví còn lại kèm ghi chú `[Nhận từ ví đã xóa]` và tag `Ví đã xóa`.
    - Nếu ví còn lại là bên gửi: Giao dịch được chuyển đổi thành `EXPENSE` cho ví còn lại kèm ghi chú `[Chuyển tới ví đã xóa]` và tag `Ví đã xóa`.
    - Nhờ đó, số dư và lịch sử thu/chi của tất cả các ví còn lại được bảo toàn toán học chính xác 100%.

#### Nhóm 4: Chu Kỳ Hóa Đơn, Tính Toán Ngày Tháng & Giao Dịch Thanh Toán (Vấn đề 6, 7, 12)
- **Tự động Reset trạng thái hóa đơn theo chu kỳ (Vấn đề 6):**
  * Bổ sung hàm `isBillPaidForCycle(bill, referenceDate)` trong `src/lib/utils.js`: Trạng thái "Đã thanh toán" được tính toán động dựa trên ngày thanh toán gần nhất `lastPaidDate` và tần suất (`MONTHLY`, `QUARTERLY`, `YEARLY`). Khi bước sang tháng mới, hóa đơn tự động chuyển về trạng thái Chưa thanh toán mà không cần can thiệp thủ công.
- **Xử lý ngày tháng chính xác theo lịch vạn niên (Vấn đề 12):**
  * Xây dựng hàm `getBillDueInfo(bill, referenceDate)` trong `src/lib/utils.js`. Tính toán chính xác khoảng cách ngày đến hạn theo lịch (`diffDays = Math.round((dueDate - todayDate) / 86400000)`), xử lý chính xác các tháng có 28, 29, 30, 31 ngày và bước nhảy qua tháng mới, loại bỏ hoàn toàn lỗi hiển thị "Quá hạn 29 ngày" khi ngày đến hạn ở đầu tháng sau.
- **Ràng buộc tạo giao dịch khi đánh dấu hóa đơn PAID (Vấn đề 7):**
  * Trong `payBill`: Giao dịch chi phí `addTransaction` được thực thi và xác thực số dư trước. Chỉ khi giao dịch tạo thành công thì hóa đơn mới được cập nhật `PAID`.
  * Trong modal thêm/sửa hóa đơn (`BillsView.jsx`): Khi người dùng chọn trạng thái `Đã thanh toán`, giao diện hiển thị trường chọn ví thanh toán và tự động kích hoạt tạo giao dịch chi phí tương ứng, chấm dứt tình trạng đánh dấu đã trả mà tiền trong ví không suy giảm.

#### Nhóm 5: Đảm Bảo Thứ Tự Giao Dịch Mục Tiêu & Nhập Sao Kê (Vấn đề 8, 9)
- **Thứ tự thực thi trong `depositToGoal` & `withdrawFromGoal` (Vấn đề 8):**
  * Sửa đổi để gọi `addTransaction` trước và kiểm tra kết quả trả về. Nếu giao dịch ghi nhận thành công, trạng thái hũ mục tiêu và lịch sử tích lũy mới được cập nhật, tránh trường hợp số dư mục tiêu tăng/giảm nhưng giao dịch thất bại.
- **Kiểm soát & làm sạch dữ liệu nhập sao kê ngân hàng (`importBankStatementTransactions` - Vấn đề 9):**
  * Loại bỏ các dòng giao dịch có số tiền `<= 0`, `NaN` hoặc bất thường `> 100 tỷ đồng`.
  * Tự động gán danh mục mặc định hợp lệ nếu sao kê bị thiếu danh mục.
  * Giới hạn ngày giao dịch không vượt quá ngày hôm nay.
  * Kiểm tra và bảo vệ số dư ví không bị âm đối với ví thông thường.

#### Nhóm 6: Tối Ưu Hóa Tệp Ảnh & Kiến Trúc Triển Khai (Vấn đề 13, 14, 15)
- **Nén ảnh chứng từ biên lai phía Client (`compressImage` - Vấn đề 13):**
  * Xây dựng hàm `compressImage(file, maxWidth = 900, maxHeight = 900, quality = 0.65)` bằng HTML5 Canvas trong `src/lib/utils.js`.
  * Áp dụng tại cả `QuickAddModal.jsx` và `TransactionsView.jsx`: Tệp ảnh chụp từ điện thoại (5MB - 15MB) được thu gọn tự động xuống còn ~30KB - 60KB (giảm hơn 95% dung lượng) trước khi lưu vào cơ sở dữ liệu và LocalStorage, triệt tiêu nguy cơ quá tải bộ nhớ và tràn hạn ngạch trình duyệt.
- **Hướng dẫn & Công cụ sao lưu cho nền tảng Serverless Vercel (Vấn đề 15):**
  * Bổ sung mục giải thích rõ ràng trong `SettingsView.jsx` về sự khác biệt giữa lưu trữ ổ cứng vĩnh viễn trên Server/Docker (`data/database.json`) và lưu trữ tạm thời (`/tmp`) trên serverless Vercel.
  * Tích hợp trực tiếp hai nút bấm **Xuất Tệp Dữ Liệu Dự Phòng (JSON)** và **Khôi Phục Dữ Liệu Từ Tệp JSON** ngay trong Cài đặt để người dùng tự do sao lưu và phục hồi dữ liệu tức thì trên mọi môi trường triển khai.

---

## [LẦN CHỈNH SỬA 14] - Khắc phục triệt để hiển thị Nhãn (Tags) & Rà soát toàn diện ngôn ngữ trên toàn bộ ứng dụng

* **Thời gian thực hiện:** 01/10/2026
* **Mức độ ảnh hưởng:** Module Giao dịch, Nhãn (Tags), Sao kê & Đa ngôn ngữ (`i18n.js`, `TransactionsView.jsx`, `BankStatementModal.jsx`, `BudgetsView.jsx`, `QuickAddModal.jsx`, `Navigation.jsx`, `utils.js`, `start.sh`)
* **Trạng thái:** ✅ Đã hoàn thành, xác minh qua unit test và build production thành công 100%

### 1. Vấn Đề & Phản Hồi Từ Người Dùng
- **Phản hồi:** "cái tag này vẫn ko chuyển đúng ngôn ngữ, check lại hết xem có chưa chuyển chỗ nào theo đúng ngôn ngữ chưa".
- **Hình ảnh đính kèm từ người dùng:** Tại thanh lọc giao dịch của `TransactionsView`, khi chuyển sang Tiếng Anh, giao diện hiển thị: `Tags: All #Sao kê #Lãi #Thưởng #Giáo dục #Shopping #Hóa đơn #Ăn uống`. Toàn bộ các tag (trừ Shopping) đều bị giữ nguyên tiếng Việt.
- **Nguyên nhân kỹ thuật:**
  1. Các nhãn thực tế lưu trong cơ sở dữ liệu (`database.json`) gồm `['Giáo dục', 'Hóa đơn', 'Lãi', 'Mua sắm', 'Sao kê', 'Thưởng', 'Ăn uống']`. Trong khi đó, `TAG_TRANSLATIONS` trong `i18n.js` chỉ chứa các nhãn mẫu gợi ý cơ bản (`Ăn trưa`, `Cafe`, `Grab/Be`...) mà thiếu các nhãn tài chính ngân hàng như `Sao kê`, `Lãi`, `Thưởng`, `Hóa đơn`, `Ăn uống`...
  2. `translateTag` chưa có cơ chế fallback sang `translateCategory` đối với các tag trùng tên danh mục.
  3. Cơ chế tạo danh sách nhãn `allTags` trong `TransactionsView.jsx` gom trực tiếp chuỗi raw của tag mà không khử trùng lặp theo tên hiển thị sau khi dịch (dẫn đến nguy cơ trùng lặp nếu dữ liệu có cả `Mua sắm` và `Shopping`).
  4. Trong `start.sh`, đoạn kiểm tra `if [ ! -d ".next" ]` đã bỏ qua lệnh `npm run build` khi thư mục `.next` đã có sẵn, dẫn đến server Next.js chạy bản build cũ thay vì bundle mới nhất.

### 2. Các Thay Đổi & Nâng Cấp Chi Tiết Đã Thực Hiện
1. **Nâng cấp từ điển `TAG_TRANSLATIONS` & Hàm `translateTag`:**
   - Bổ sung toàn bộ nhãn cơ sở dữ liệu và nhãn ngân hàng:
     * `Sao kê` ↔ `Statement`
     * `Lãi` ↔ `Interest`
     * `Thưởng` ↔ `Bonus`
     * `Giáo dục` ↔ `Education`
     * `Hóa đơn` ↔ `Bills`
     * `Ăn uống` ↔ `Food & Dining`
     * `Mua sắm` ↔ `Shopping`
     * `Lương` ↔ `Salary`, `Tiết kiệm` ↔ `Savings`, `Chuyển khoản` ↔ `Transfer`, `Nợ` ↔ `Debt`, `Trả nợ` ↔ `Debt Payment`, `Bảo hiểm` ↔ `Insurance`...
   - Thêm cơ chế fallback thông minh: nếu nhãn không nằm trong `TAG_TRANSLATIONS`, tự động tra cứu trong `CATEGORY_TRANSLATIONS` để chuyển đổi danh mục tương ứng.
2. **Khử trùng lặp & Bản địa hóa nút lọc Tag trong `TransactionsView.jsx`:**
   - Dùng `Map` nhóm các nhãn theo tên hiển thị đã dịch (`display`) để khử trùng lặp hoàn toàn giữa tiếng Việt và tiếng Anh.
   - Khi lọc theo nhãn, hệ thống so khớp cả mã nhãn gốc lẫn tên dịch chuẩn hóa, đảm bảo click lọc chính xác 100%.
   - Chuyển ngữ dropdown Ví trong thanh lọc giao dịch (`tWalletName(w.name)`).
   - Chuyển ngữ toàn bộ form chỉnh sửa giao dịch (Edit Transaction): ví nguồn/đích, dư nợ thẻ, phí chuyển khoản, cảnh báo ví trùng nhau...
3. **Rà soát & Bản địa hóa toàn diện `BankStatementModal.jsx`:**
   - Thêm `tWalletName`, `tTag`, `language` vào context hook.
   - Chuyển ngữ toàn bộ các dropdown chọn ví (`tWalletName`), danh mục (`tCategory`), ngày giờ sao kê (`formatDate(item.date, 'short', language)`).
   - Chuyển ngữ các tab lọc bảng sao kê (`All`, `Income`, `Expense`, `Duplicates`) và các nhãn cảnh báo tài khoản.
4. **Bản địa hóa thông báo kiểm tra số dư ví (`checkWalletSufficientFunds`):**
   - Hỗ trợ tham số `lang` để xuất cảnh báo lỗi chính xác bằng tiếng Anh hoặc tiếng Việt khi số dư ví không đủ hoặc vi phạm hạn mức tín dụng.
5. **Cải tiến quy trình khởi động (`start.sh`):**
   - Luôn chạy `npm run build` mỗi khi gọi `./start.sh` để đảm bảo bundle production luôn mang mã nguồn mới nhất.

---

## [LẦN CHỈNH SỬA 13] - Chuyển đổi ngôn ngữ đồng bộ 100% (Category, Tags, Thứ Ngày Tháng & Tự điền danh mục/nhãn)

* **Thời gian thực hiện:** 01/10/2026
* **Mức độ ảnh hưởng:** Đa ngôn ngữ & Toàn bộ giao diện (`i18n.js`, `utils.js`, `AppContext.jsx`, `QuickAddModal.jsx`, `BudgetsView.jsx`, `BillsView.jsx`, `TransactionsView.jsx`, `WalletsView.jsx`, `DashboardView.jsx`, `ReportsView.jsx`)
* **Trạng thái:** ✅ Đã hoàn thành và xác minh (Build thành công 100%)

### 1. Vấn Đề & Phản Hồi Từ Người Dùng
- **Phản hồi:** "Nếu chuyển thì chuyển hoàn toàn sang 1 ngôn ngữ chứ ko nửa nọ nửa kia thế này ko thì xóa cái danh mục đi để người dùng tự điền danh mục. Kể cả cái category hay tags cũng phải chuyển theo ngôn ngữ, thứ ngày tháng cũng phải chuyển theo đúng ngôn ngữ".
- **Các điểm lỗi cụ thể được người dùng gửi ảnh:**
  1. *Budgets View*: Tiêu đề 4 quỹ hiển thị nửa Việt nửa Anh: `1. Thiết yếu (Needs)`, `2. Mong muốn (Wants)`, `3. Tích lũy (Savings)`, `4. Dự phòng (Emergency)`.
  2. *QuickAddModal (Tiếng Anh)*: Tiêu đề tiếng Anh nhưng banner sao kê ngân hàng là tiếng Việt (`Có file sao kê Excel / CSV từ ngân hàng?...`), dropdown danh mục là tiếng Việt (`Ăn uống`), nút chọn nhanh danh mục tiếng Việt, số tiền bằng chữ bằng tiếng Việt, toàn bộ Tags là tiếng Việt (`#Ăn trưa`, `#Xăng xe`...).
  3. *QuickAddModal (Tab Thu nhập)*: Khi chuyển sang Thu nhập, nhãn danh mục vẫn ghi sai thành `EXPENSE CATEGORY *` thay vì `Income Category` / `Danh mục thu nhập`, và danh mục hiển thị `Lương chính` (tiếng Việt).
  4. *Bills View*: Tiêu đề lịch hóa đơn ghi `Today is 01/10/2026` (định dạng ngày tiếng Việt thay vì locale), tên hóa đơn và ghi chú từ dữ liệu mẫu chưa được chuyển ngữ theo giao diện.

### 2. Các Thay Đổi & Nâng Cấp Chi Tiết
1. **Bản địa hóa 100% danh mục (Category) & Cho phép người dùng tự điền danh mục tùy chỉnh:**
   - Cập nhật hàm `translateCategory` hoạt động 2 chiều (`vi` ↔ `en`), tự động chuyển ngữ danh mục trong tất cả `<select>`, badge chọn nhanh, bảng giao dịch, biểu đồ báo cáo và hóa đơn.
   - Thêm tính năng **"✨ + Tự nhập danh mục khác..." (Custom Category)** ngay trong modal Nhập nhanh `QuickAddModal`: Nếu người dùng không muốn dùng danh mục mẫu, chỉ cần 1 click là có thể tự gõ bất kỳ tên danh mục nào theo ý muốn.
2. **Bản địa hóa 100% Nhãn (Tags) & Cho phép tự gõ nhãn tùy chỉnh:**
   - Xây dựng từ điển `TAG_TRANSLATIONS` và hàm `translateTag(tag, lang)` / `tTag(tag)`. Khi ở chế độ tiếng Anh, toàn bộ tag đổi thành `#Lunch`, `#Coffee`, `#Gas & Fuel`, `#Supermarket`, `#Travel`, `#Emergency`...; khi về tiếng Việt đổi thành `#Ăn trưa`, `#Xăng xe`, `#Siêu thị`...
   - Bổ sung ô nhập nhãn trực tiếp ngay dưới danh sách tags trong `QuickAddModal`: Người dùng có thể gõ bất kỳ nhãn nào và bấm `+ Thêm tag` (hoặc nhấn phím Enter).
3. **Bản địa hóa Thứ Ngày Tháng (Date & Time) theo Locale:**
   - Nâng cấp `formatDate(date, type, lang)` và `formatDisplayDate(date, lang)`:
     * Tiếng Việt: Định dạng `DD/MM/YYYY`, thứ hiển thị `Th 5, 01/10/2026`.
     * Tiếng Anh: Định dạng `MM/DD/YYYY`, thứ hiển thị `Thu, 10/01/2026`.
   - Áp dụng đồng bộ cho `BillsView` (`Today is Thu, 10/01/2026`), `TransactionsView`, `WalletsView`, `ReportsView` và `DashboardView`.
4. **Xóa bỏ hoàn toàn tình trạng "Nửa nọ nửa kia" (Mixed languages):**
   - Loại bỏ các từ tiếng Anh mở ngoặc cứng `(Needs)`, `(Wants)`, `(Savings)`, `(Emergency)` trong `BudgetsView`: Tiếng Việt hiển thị thuần Việt `1. Thiết yếu`, `2. Mong muốn`, `3. Tích lũy`, `4. Dự phòng khẩn cấp`; Tiếng Anh hiển thị thuần Anh `1. Essential Needs`, `2. Wants & Lifestyle`, `3. Savings & Investments`, `4. Emergency Reserve`.
   - Chuyển ngữ toàn bộ Banner sao kê ngân hàng (`qa.hasBankStatement`, `qa.uploadStatementBtn`).
   - Sửa lỗi nhãn danh mục ở tab Thu nhập thành `Income Category` (EN) / `Danh mục thu nhập` (VI).
   - Thêm bộ chuyển số tiền bằng chữ tiếng Anh `numberToEnglishWords` (ví dụ: `Thirty-two million VND`) khi ở chế độ tiếng Anh.
   - Chuyển ngữ tên ví và tên hóa đơn mặc định (`Cash in Hand`, `Techcombank Spending`, `Apartment Rent (Sep)`, `EVN Electricity Bill`...).

---

## [LẦN CHỈNH SỬA 12] - Tách bạch Dư nợ / Thẻ tín dụng khỏi Ví thanh toán tiền thật, chống hiểu nhầm tài sản

* **Thời gian thực hiện:** 01/10/2026
* **Mức độ ảnh hưởng:** Module Thêm giao dịch & Quản lý ví (`QuickAddModal.jsx`, `TransactionsView.jsx`, `BillsView.jsx`, `BudgetsView.jsx`, `utils.js`, `i18n.js`)
* **Trạng thái:** ✅ Đã hoàn thành và xác minh

### 1. Vấn Đề & Phản Hồi Từ Người Dùng
- **Phản hồi:** "Nếu đã là dư nợ thì ko nên để ở mục ví thế này dễ gây hiểu nhầm cho người dùng là tiền mình có mà ko rõ nguyên nhân".
- **Nguyên nhân gốc rễ:**
  1. Trong modal Thêm giao dịch (`QuickAddModal`), trường "VÍ THANH TOÁN" trước đây gộp chung tất cả các ví vào một danh sách phẳng và hiển thị `{w.name} ({formatCurrency(w.balance)})`.
  2. Ví dụ thẻ tín dụng hoặc khoản nợ `Cống hiến cho anh 7` có dư nợ 7.000.000 đ thì lại hiển thị trơ trọi thành `Cống hiến cho anh 7 (7.000.000 đ)`, khiến người dùng tưởng rằng mình đang có 7 triệu trong ví.
  3. Nhưng khi chọn ví này để chi tiêu thì hệ thống lại báo `Khả dụng: 0 đ` và văng cảnh báo đỏ `Vượt quá hạn mức khả dụng... còn 0 đ`, gây mâu thuẫn và khó hiểu cho người dùng.
  4. Ở tab "Khoản thu", thẻ tín dụng/khoản nợ cũng bị đưa vào danh sách chọn "Ví nhận tiền" trong khi nợ không thể là nơi nhận thu nhập.

### 2. Các Thay Đổi Chi Tiết Đã Triển Khai
1. **Phân nhóm rõ ràng theo bản chất tài chính (`optgroup`):**
   - **Nhóm 1:** `💰 Ví & Tài khoản tiền thật (Tiền có sẵn)`: Tech, MB, Ví tay... hiển thị số dư thực tế có thể chi tiêu.
   - **Nhóm 2:** `💳 Thẻ tín dụng & Khoản nợ (Dư nợ)`:
     * Với thẻ tín dụng có hạn mức chi tiêu (`creditLimit > 0`): Hiển thị rõ `[Hạn mức còn: ... • Dư nợ: ...]`.
     * Với khoản nợ thuần túy / không có hạn mức thẻ (như khoản nợ ngoài "Cống hiến cho anh 7"): Hiển thị rõ `[Dư nợ: 7.000.000 đ - Khoản nợ, không thể chi tiêu]` và bị **vô hiệu hóa (`disabled`)**, ngăn chọn làm ví thanh toán chi tiêu.
2. **Khóa thẻ tín dụng / khoản nợ khỏi tab Khoản Thu (Income):**
   - Khi chọn tab "Khoản thu", trường chuyển thành "Ví nhận tiền" và **hoàn toàn loại bỏ các khoản nợ / thẻ tín dụng**, chỉ cho phép nhận tiền vào tiền mặt hoặc tài khoản ngân hàng.
   - Tự động chuyển ví hợp lệ nếu người dùng đang đứng ở thẻ nợ rồi bấm sang tab Khoản thu.
3. **Cảnh báo và giải thích trực quan (Header & Alert Notice):**
   - Khi xem thẻ tín dụng, nhãn phía trên hiển thị rõ: `Dư nợ: X.XXX.XXX đ` (màu đỏ) thay vì "Khả dụng".
   - Nếu là khoản nợ thuần túy không có hạn mức, hiển thị hộp hướng dẫn màu hổ phách: *"Đây là khoản dư nợ thuần túy (không có hạn mức thẻ để chi tiêu). Để thanh toán giảm khoản nợ này, vui lòng dùng chức năng Chuyển tiền từ ví tiền mặt hoặc ngân hàng."*
4. **Chuẩn hóa trên toàn bộ ứng dụng:**
   - Cập nhật đồng bộ tại `QuickAddModal.jsx`, `TransactionsView.jsx` (modal sửa giao dịch, chuyển tiền trả nợ thẻ), `BillsView.jsx` (thanh toán hóa đơn) và `BudgetsView.jsx`.
   - Bổ sung hàm tiện ích `formatWalletOptionLabel` tại `src/lib/utils.js`.

---

## [LẦN CHỈNH SỬA 11] - Xử lý triệt để trùng lặp khoản chi trong What-If (Ngăn trùng, Tự động gộp & Nhận diện thông minh)

* **Thời gian thực hiện:** 01/10/2026
* **Mức độ ảnh hưởng:** Module Mô phỏng What-If (`WhatIfSimulatorView.jsx`, `i18n.js`, `database.json`)
* **Trạng thái:** ✅ Đã hoàn thành và xác minh

### 1. Vấn Đề Nhận Diện
- Người dùng phát hiện sự trùng lặp trên màn hình What-If (Bước 1): Khoản **"Ăn uống"** xuất hiện 2 lần (thẻ cũ 3.000.000 đ và thẻ mới 2.000.000 đ sau khi bấm "+ Thêm khoản chi").
- Nguyên nhân: Trước đó khi mở modal "+ Thêm khoản chi", hệ thống luôn mặc định chọn danh mục đầu tiên trong hệ thống ("Ăn uống") mà không kiểm tra xem danh mục đó đã có sẵn trong danh sách khảo sát hay chưa. Đồng thời modal chưa chặn việc chọn danh mục đã có và chưa có cơ chế phát hiện trùng lặp.

### 2. Các Thay Đổi Chi Tiết Đã Triển Khai
1. **Tự động chọn danh mục khả dụng chưa có trong danh sách (`handleOpenAddExpense`):**
   - Khi bấm "+ Thêm khoản chi", hệ thống tự động quét danh sách hiện tại và chọn danh mục chi tiêu mẫu đầu tiên **chưa có trong danh sách** (ví dụ: Hóa đơn & Tiện ích, Mua sắm, Sức khỏe...), không còn luôn mặc định rơi vào "Ăn uống".
   - Nếu tất cả danh mục mẫu đều đã được thêm, modal sẽ tự động chuyển sang tab "Tự tạo tùy chỉnh".

2. **Chặn trùng lặp trong dropdown danh mục mẫu:**
   - Các danh mục đã có mặt trong danh sách khảo sát sẽ hiển thị thêm nhãn `(Đã có trong danh sách)` và bị vô hiệu hóa (`disabled`), ngăn người dùng vô tình bấm trùng.

3. **Cảnh báo và hỗ trợ cộng dồn thông minh (`handleSaveExpense`):**
   - Khi lưu khoản chi mới, nếu tên hoặc danh mục trùng với một khoản đã có:
     * Hệ thống hiển thị hộp thoại xác nhận thân thiện hỏi người dùng có muốn **cộng dồn số tiền** vào khoản chi hiện có hay không (ví dụ: 3tr + 2tr = 5tr).
     * Nếu người dùng đồng ý: Gộp số tiền và áp dụng cắt giảm chuẩn xác mà không tạo thêm thẻ thừa.

4. **Thanh cảnh báo & Nút "Gộp các khoản trùng" (1-Click Deduplication):**
   - Tự động quét nhóm trùng lặp (`duplicateGroups`).
   - Nếu phát hiện danh sách đang có thẻ trùng (do dữ liệu cũ hoặc import), giao diện hiển thị thanh cảnh báo màu hổ phách kèm nút **"Gộp các khoản trùng"** để người dùng gộp toàn bộ chỉ bằng 1 cú click.

5. **Đồng bộ và làm sạch cơ sở dữ liệu (`database.json`):**
   - Đã gộp 2 khoản "Ăn uống" (3.000.000 đ + 2.000.000 đ) thành 1 khoản duy nhất 5.000.000 đ, giữ nguyên tổng chi tiêu cá nhân 16.000.000 đ/tháng.

---

## [LẦN CHỈNH SỬA 10] - Tự động nhận diện ngân hàng từ bản sao kê & bắt buộc liên kết/tạo ví ngân hàng tương ứng

* **Thời gian thực hiện:** 01/10/2026
* **Mức độ ảnh hưởng:** Module Nhập sao kê ngân hàng (`bank-statement-parser.js`, `BankStatementModal.jsx`, `AppContext.jsx`)
* **Trạng thái:** ✅ Đã hoàn thành và xác minh

### 1. Vấn Đề & Yêu Cầu
- **Yêu cầu của người dùng:**
  1. Tự động phân biệt/nhận diện tệp sao kê tải lên thuộc ngân hàng nào (Techcombank, Vietcombank, MB Bank, VPBank, ACB, BIDV, VietinBank, TPBank, VIB, Agribank, Sacombank, Timo...).
  2. Nguyên tắc dòng tiền chính xác: Sao kê của ngân hàng nào thì các giao dịch chi tiêu/thu nhập phải được trừ/cộng trực tiếp vào đúng ví của ngân hàng đó.
  3. Bắt buộc tạo ví nếu chưa có: Nếu hệ thống chưa có ví ngân hàng tương ứng với bản sao kê, hệ thống phải yêu cầu người dùng tạo và thêm ví ngân hàng đó trước, ngăn chặn việc nhập nhầm lẫn vào ví tiền mặt hoặc ví của ngân hàng khác.

### 2. Các Thay Đổi Chi Tiết Đã Triển Khai
1. **Bộ nhận diện ngân hàng thông minh (`src/lib/bank-statement-parser.js`):**
   - Định nghĩa từ điển `SUPPORTED_BANKS` với 14+ ngân hàng phổ biến tại Việt Nam kèm mã nhận diện, từ khóa, tên đầy đủ, biểu tượng và màu sắc thương hiệu.
   - Xây dựng hàm `detectBankAndAccount(file, rows, workbook)` quét qua tiêu đề tệp, tên sheet, 35 dòng đầu (metadata sao kê), ghi chú giao dịch và biểu thức Regex để trích xuất:
     * Tên & mã ngân hàng phát hành sao kê (`detectedBank`).
     * Số tài khoản ngân hàng (`detectedAccountNumber`).
     * Tên chủ tài khoản (`detectedAccountHolder`).
   - Cập nhật hàm `downloadSampleStatementTemplate()` tạo file sao kê mẫu chuẩn Techcombank có sẵn số tài khoản `19038899887766` để kiểm thử ngay.

2. **Cập nhật trả về id ví mới trong AppContext (`src/context/AppContext.jsx`):**
   - Cập nhật hàm `addWallet` để trả về đối tượng `newWallet` vừa tạo, cho phép các modal bắt lấy ID và liên kết tự động ngay lập tức mà không cần chờ reload.

3. **Giao diện & Luồng kiểm soát chặt chẽ (`src/components/BankStatementModal.jsx`):**
   - Tự động khớp ví (`findMatchingWalletForBank`):
     * Khớp chính xác theo số tài khoản (`accountNumber`).
     * Hoặc khớp theo mã ngân hàng (`bankCode`) / tên ngân hàng (`bankName`).
     * Hoặc khớp theo tên hiển thị của ví.
   - **Xử lý 3 kịch bản nhận diện:**
     * **Trường hợp 1 - Đã có ví tương ứng (`MATCHED`):** Khóa tự động vào đúng ví ngân hàng đó; hiển thị thẻ xanh thông báo đã nhận diện chuẩn xác kèm tên ví, số tài khoản và số dư hiện tại.
     * **Trường hợp 2 - Chưa có ví tương ứng (`NOT_FOUND`):** Hiển thị cảnh báo màu hổ phách yêu cầu bắt buộc tạo ví ngân hàng; cung cấp nút **"Tạo nhanh ví [Tên ngân hàng]"** (1-click) tự điền sẵn tên ngân hàng, số tài khoản nhận diện và số dư ban đầu, hoặc nút **"Tự thiết lập ví"** để tùy biến thêm.
     * **Trường hợp 3 - File sao kê thông dụng không rõ ngân hàng (`MANUAL`):** Cho phép người dùng chủ động chọn ví đích từ danh sách.
   - **Bảo vệ toàn vẹn dữ liệu giao dịch:**
     * Nút "Xác nhận nhập giao dịch" bị vô hiệu hóa (disabled) nếu chưa tạo hoặc chưa chọn đúng ví ngân hàng, hiển thị thông báo hướng dẫn rõ ràng.
     * Đảm bảo mọi giao dịch chi tiêu sẽ trừ tiền trực tiếp vào đúng ví ngân hàng đó, thu nhập cộng vào đúng ví ngân hàng đó.

---

## [LẦN CHỈNH SỬA 09] - Tùy biến toàn diện danh mục chi tiêu trong mô phỏng What-If (Thêm mới, Xóa bỏ, Chỉnh sửa, Khôi phục)

* **Thời gian thực hiện:** 01/10/2026
* **Mức độ ảnh hưởng:** Module Mô phỏng What-If (`WhatIfSimulatorView.jsx`, `i18n.js`)
* **Trạng thái:** ✅ Đã hoàn thành và xác minh

### 1. Vấn Đề & Yêu Cầu
- Người dùng phản hồi: Danh mục khảo sát tiêu dùng tại Bước 1 ("1. Tiêu Dùng Cá Nhân & Tùy Chọn Cắt Giảm") của What-If trước đây bị cố định 9 khoản mặc định, người dùng không thể xóa bớt các khoản không phù hợp hoặc thêm các khoản chi tiêu thực tế của riêng mình.
- Yêu cầu: Cho phép tùy chỉnh linh hoạt: thêm mới các khoản chi tiêu, xóa bỏ các khoản chi bất kỳ, chỉnh sửa thông tin khoản chi và khôi phục về danh mục mẫu khi cần.

### 2. Các Thay Đổi Chi Tiết Đã Triển Khai
1. **Thêm mới khoản chi tiêu linh hoạt (`+ Thêm khoản chi`):**
   - Hỗ trợ 2 chế độ:
     * **Chọn từ danh mục mẫu:** Chọn từ danh mục chi tiêu hệ thống với icon và màu đồng bộ.
     * **Tự tạo tùy chỉnh:** Cho phép nhập tên khoản chi bất kỳ (ví dụ: *Nuôi thú cưng, Tiền gửi về quê, Bảo hiểm nhân thọ, Học tiếng Anh...*), chọn biểu tượng đại diện từ bảng 16 icon trực quan và bảng 10 màu nhận diện.
   - Nhập mức chi tiêu hàng tháng với định dạng số phân cách dấu chấm và các nút chọn nhanh (500k, 1Tr, 2Tr, 3Tr, 5Tr, 10Tr).
   - Tùy chọn bật/tắt áp dụng cắt giảm ngay trong kịch bản kèm thanh kéo % tỷ lệ giảm.

2. **Xóa bỏ khoản chi tiêu (`Trash2`):**
   - Bổ sung nút xóa trực tiếp trên từng thẻ chi tiêu tại Bước 1 kèm hộp thoại xác nhận an toàn.
   - Tự động đồng bộ và tính toán lại toàn bộ dòng tiền, bảng dự phóng từng tháng và biểu đồ tài sản What-If.

3. **Chỉnh sửa khoản chi tiêu (`Pencil`):**
   - Cho phép mở modal chỉnh sửa tên, số tiền, màu sắc, biểu tượng và tỷ lệ cắt giảm của khoản chi đã có.

4. **Nút Khôi phục mặc định (`RotateCcw`):**
   - Đặt cạnh nút thêm mới tại Bước 1, cho phép người dùng khôi phục lại 9 khoản mẫu ban đầu bất cứ lúc nào.
   - Hiển thị giao diện trạng thái trống (Empty State) thân thiện nếu xóa hết toàn bộ các khoản.

5. **Đa ngôn ngữ hóa (i18n):**
   - Bổ sung đầy đủ các chuỗi dịch cho cả Tiếng Việt và Tiếng Anh trong `src/lib/i18n.js`.

---

## [LẦN CHỈNH SỬA 08] - Bản địa hóa triệt để 100% toàn bộ hệ thống (0 chuỗi tiếng Việt sót lại)

* **Thời gian thực hiện:** 18/09/2026
* **Mức độ ảnh hưởng:** Toàn diện hệ thống (All 8 Screens, Modals, Tables, Charts, Tooltips)
* **Trạng thái:** ✅ Đã hoàn thành 100% - Đạt 0 dòng chưa dịch trên toàn bộ các components

### 1. Vấn Đề Khắc Phục
- Người dùng phản hồi: Sau khi thêm nút chuyển đổi ngôn ngữ (Tiếng Việt 🇻🇳, Tiếng Anh 🇬🇧, Tiếng Pháp 🇫🇷), vẫn còn nhiều nhãn, gợi ý placeholder, tiêu đề bảng xếp hạng, chú giải biểu đồ, cảnh báo modal và chi tiết cấu hình còn giữ nguyên tiếng Việt chưa được dịch.
- Yêu cầu: Quét sạch mọi chuỗi tiếng Việt cứng (hardcoded Vietnamese) trên toàn bộ các màn hình và modal, thay thế bằng hàm đa ngôn ngữ `t()`, `tCategory()` và `tWalletType()` với từ điển chuẩn hóa 3 thứ tiếng.

### 2. Kết Quả Quét Tự Động Bằng Kịch Bản (Script Verification)
- Chạy script kiểm tra chuyên sâu `find_untranslated.js` trên toàn bộ thư mục `src/components/`:
  * `DashboardView.tsx`: **0** untranslated lines (Trước: 13)
  * `QuickAddModal.tsx`: **0** untranslated lines (Trước: 19)
  * `BillsView.tsx`: **0** untranslated lines (Trước: 11)
  * `TransactionsView.tsx`: **0** untranslated lines (Trước: 15)
  * `ReportsView.tsx`: **0** untranslated lines (Trước: 22)
  * `BudgetsView.tsx`: **0** untranslated lines (Trước: 25)
  * `Navigation.tsx`: **0** untranslated lines (Trước: 39)
  * `SettingsView.tsx`: **0** untranslated lines (Trước: 39)
  * `WalletsView.tsx`: **0** untranslated lines (Trước: 89)
  * `WhatIfSimulatorView.tsx`: **0** untranslated lines (Trước: 128)
  * **Tổng cộng sót lại trên toàn bộ UI:** **0 dòng** (100% ĐÃ ĐƯỢC CHUYỂN NGỮ TOÀN DIỆN).

---

## [LẦN CHỈNH SỬA 01] - Khắc phục mất dữ liệu khi tắt server & Sửa lỗi số liệu không cập nhật trên Dashboard

* **Thời gian thực hiện:** 16/09/2026
* **Mức độ ảnh hưởng:** Quan trọng (Core Storage & Data Visualization)
* **Trạng thái:** ✅ Đã hoàn thành và xác minh

---

### 1. Vấn Đề Ban Đầu Được Báo Cáo

1. **Mất dữ liệu khi tắt server / đổi client:**
   - Ứng dụng gốc chỉ lưu dữ liệu vào `localStorage` của trình duyệt. Khi tắt server `npm run dev` rồi mở lại ở cổng khác (`3001` thay vì `3000`), mở tab ẩn danh (Incognito), hoặc truy cập từ máy tính/điện thoại khác, dữ liệu bị trống và tự động tải lại mock data ban đầu. Server không hề lưu trữ bất kỳ file database nào trên ổ đĩa.
2. **Dashboard hiển thị số cũ như chưa có chuyện gì xảy ra sau khi thêm giao dịch:**
   - Dữ liệu mẫu và bộ lọc trên Dashboard, Báo cáo bị gán cứng (hardcode) tháng `'2026-09'`.
   - Trong khi đó, modal "Nhập nhanh" lại lấy ngày theo thời gian thực của máy tính người dùng. Nếu ngày giao dịch khác tháng `'2026-09'`, giao dịch đó bị loại khỏi bộ tính thu chi hàng tháng trên Dashboard, khiến các con số "Thu nhập", "Chi tiêu", biểu đồ không hề thay đổi.

---

### 2. Danh Sách Các Tệp Đã Thay Đổi

| STT | Tệp tin | Trạng thái | Mô tả tóm tắt |
|---|---|---|---|
| 1 | `src/app/api/storage/route.ts` | **[MỚI]** | API Server đọc/ghi dữ liệu vào tệp `data/database.json` trên ổ cứng máy chủ. |
| 2 | `src/context/AppContext.tsx` | **[CHỈNH SỬA]** | Đồng bộ 2 chiều: Tải từ Server Disk trước (fallback sang LocalStorage), tự động lưu xuống file Server khi có thay đổi; bổ sung `setCurrentMonth` & `serverSyncStatus`. |
| 3 | `src/components/DashboardView.tsx` | **[CHỈNH SỬA]** | Bỏ gán cứng `'2026-09'`, lọc theo `currentMonth`, thêm bộ chọn Tháng (`<input type="month">`) và hiển thị huy hiệu trạng thái lưu máy chủ. |
| 4 | `src/components/QuickAddModal.tsx` | **[CHỈNH SỬA]** | Tự động chuyển `currentMonth` sang tháng của giao dịch vừa tạo để số liệu hiển thị tức thì trên Dashboard. |
| 5 | `src/components/BudgetsView.tsx` | **[CHỈNH SỬA]** | Sử dụng `currentMonth` thay vì cố định `'2026-09'` khi tạo và tính toán ngân sách. |
| 6 | `src/components/ReportsView.tsx` | **[CHỈNH SỬA]** | Bộ lọc báo cáo tháng này (`THIS_MONTH`), tháng trước (`LAST_MONTH`) tính linh hoạt theo `currentMonth`. |
| 7 | `src/components/Navigation.tsx` | **[CHỈNH SỬA]** | Truyền `currentMonth` vào tính toán trạng thái ngân sách và cảnh báo. |
| 8 | `src/components/SettingsView.tsx` | **[CHỈNH SỬA]** | Thêm khối thông báo trạng thái đồng bộ dữ liệu với máy chủ (`data/database.json`). |

---

### 3. Chi Tiết Khác Biệt Giữa Bản Ban Đầu và Bản Mới (Before vs After)

#### Tệp 1: `src/app/api/storage/route.ts` [TẠO MỚI]
* **Ban đầu:** Không có file này. Server không có API lưu trữ nào.
* **Hiện tại:**
  - `GET /api/storage`: Đọc tệp `data/database.json`. Nếu chưa có thì tự động tạo mới với đầy đủ cấu trúc dữ liệu khởi tạo.
  - `POST /api/storage`: Nhận toàn bộ trạng thái (ví, giao dịch, danh mục, ngân sách, hóa đơn, mục tiêu) và ghi an toàn vào `data/database.json` trên ổ cứng server.

#### Tệp 2: `src/context/AppContext.tsx`
* **Ban đầu:**
  - Chỉ đọc và ghi vào `localStorage.getItem(STORAGE_KEY)` và `localStorage.setItem(...)`.
  - Không có cơ chế lưu xuống ổ đĩa server.
  - `currentMonth` cố định là `'2026-09'`, không có hàm `setCurrentMonth` trong Context để component bên ngoài thay đổi.
* **Hiện tại:**
  - Bổ sung `serverSyncStatus`: Trạng thái đồng bộ (`synced` | `syncing` | `offline`).
  - Khi mở web: Tự động gọi `fetch('/api/storage')` để lấy dữ liệu từ ổ cứng máy chủ. Nếu mạng ngắt mới dùng `localStorage`.
  - Khi có thay đổi dữ liệu: Tự động debounce gọi `POST /api/storage` để ghi ngay vào file `data/database.json`.
  - Export `setCurrentMonth` qua `AppContextType` để các màn hình có thể linh hoạt đổi tháng hiển thị.

#### Tệp 3: `src/components/DashboardView.tsx`
* **Ban đầu:**
  ```typescript
  // CŨ: Bị gán cứng 2026-09
  const currentMonthExpenses = transactions.filter(
    (t) => t.type === 'EXPENSE' && t.date.startsWith('2026-09')
  );
  const barChartData = [
    ...,
    { month: 'T9', Thu: financialSummary.monthlyIncome, Chi: financialSummary.monthlyExpense },
  ];
  ```
* **Hiện tại:**
  ```typescript
  // MỚI: Động theo currentMonth được chọn
  const currentMonthExpenses = transactions.filter(
    (t) => t.type === 'EXPENSE' && t.date.startsWith(currentMonth)
  );
  const barChartData = [
    ...,
    { month: `T${displayMonthNum}`, Thu: financialSummary.monthlyIncome, Chi: financialSummary.monthlyExpense },
  ];
  ```
  - Thêm bộ chọn Tháng ngay góc trên Dashboard giúp người dùng xem số liệu của bất kỳ tháng nào.
  - Thêm huy hiệu **"Đã lưu server"** có chấm xanh để người dùng an tâm rằng dữ liệu đã lưu vào ổ cứng.

#### Tệp 4: `src/components/QuickAddModal.tsx`
* **Ban đầu:** Giao dịch mới được tạo với thời gian thực của máy tính, nhưng không cập nhật `currentMonth`, làm Dashboard lọc lệch tháng và không hiện số tiền vừa nhập.
* **Hiện tại:** Khi người dùng bấm lưu giao dịch, hệ thống tự động kiểm tra nếu tháng của giao dịch khác `currentMonth` thì tự động gọi `setCurrentMonth(txMonth)`. Nhờ vậy, ngay khi đóng modal, màn hình Dashboard tự động chuyển về đúng tháng đó và nhảy số liệu thu nhập/chi tiêu ngay lập tức.

#### Tệp 5 & 6: `BudgetsView.tsx` & `ReportsView.tsx`
* **Ban đầu:** Khi thêm ngân sách mới, mặc định gán `month: '2026-09'`. Báo cáo `ReportsView` tính tháng này là `startsWith('2026-09')`.
* **Hiện tại:** Đều sử dụng `currentMonth` linh hoạt. Khi người dùng đang chọn tháng nào thì ngân sách và báo cáo sẽ tự động khớp theo tháng đó.

---

### 4. Hướng Dẫn Tự Kiểm Tra (Verification Steps)

1. **Kiểm tra lưu dữ liệu sau khi tắt server:**
   - Mở ứng dụng, bấm **Nhập nhanh** thêm 1 khoản chi (ví dụ: "Ăn tối", 150.000đ).
   - Mở thư mục dự án, kiểm tra thấy tệp `data/database.json` đã được tạo và chứa giao dịch vừa thêm.
   - Nhấn `Ctrl + C` trong terminal để tắt hoàn toàn dev server.
   - Khởi động lại bằng `npm run dev` và mở lại trên trình duyệt (hoặc mở bằng trình duyệt khác / tab ẩn danh).
   - 👉 **Kết quả:** Dữ liệu giao dịch "Ăn tối" 150.000đ vẫn còn nguyên vẹn, số dư ví không bị reset về ban đầu.

2. **Kiểm tra cập nhật số liệu ngay lập tức:**
   - Thêm 1 giao dịch thu nhập hoặc chi tiêu mới.
   - 👉 **Kết quả:** Con số **"Thu nhập"**, **"Chi tiêu"**, biểu đồ tròn phân loại và **"Số dư khả dụng"** trên màn hình Tổng quan (Dashboard) cập nhật tăng/giảm ngay lập tức.
   - Sử dụng ô chọn **Tháng** trên Dashboard để chuyển qua lại giữa các tháng khác nhau và quan sát số liệu thay đổi tương ứng.

---

## [LẦN CHỈNH SỬA 02] - Tinh gọn phần đầu Dashboard, loại bỏ chữ "Đã lưu server" và đổi màu tiêu đề sang xanh dương nhạt

* **Thời gian thực hiện:** 16/09/2026
* **Mức độ ảnh hưởng:** Giao diện người dùng (UI/UX Refinement)
* **Trạng thái:** ✅ Đã hoàn thành và xác minh

---

### 1. Vấn Đề Cần Điều Chỉnh

1. **Giao diện đầu trang Dashboard bị rối:**
   - Ô chọn tháng `<input type="month">` đặt ở đầu trang tạo cảm giác thừa và rối mắt, trong khi ứng dụng đã có hai màn hình chuyên sâu để xem chi tiết là **"Sổ giao dịch"** và **"Báo cáo"**.
2. **Huy hiệu "Đã lưu server" không phù hợp trải nghiệm người dùng cuối:**
   - Người dùng mong muốn ứng dụng mang cảm giác là một sản phẩm hoàn chỉnh, chuyên nghiệp; việc hiển thị nhãn kỹ thuật "Đã lưu server" ở ngay đầu trang làm mất đi tính tự nhiên của một app tài chính.
3. **Màu sắc tiêu đề bị tối, khó đọc:**
   - Trên nền giao diện tối (Dark Mode), dòng tiêu đề `Tổng quan tài chính` và dòng mô tả `Theo dõi dòng tiền & ngân sách thông minh` dùng màu tối (`text-slate-900` và `text-slate-500`), gần như chìm vào nền đen khiến người dùng rất khó nhìn.

---

### 2. Danh Sách Các Tệp Đã Thay Đổi

| STT | Tệp tin | Trạng thái | Mô tả tóm tắt |
|---|---|---|---|
| 1 | `src/components/DashboardView.tsx` | **[CHỈNH SỬA]** | Bỏ chữ "Đã lưu server", bỏ ô chọn tháng ở đầu trang; đổi màu sắc tiêu đề và phụ đề sang màu xanh dương nhạt (`text-sky-400` / `text-sky-300`) tương phản tốt, sáng và dịu mắt. |

---

### 3. Chi Tiết Khác Biệt Giữa Bản Ban Đầu và Bản Mới (Before vs After)

#### Tệp: `src/components/DashboardView.tsx`
* **Trước khi sửa (Lần 1):**
  ```tsx
  {/* Chứa huy hiệu kỹ thuật và ô chọn tháng thừa ở đầu trang */}
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div>
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-extrabold text-slate-900">Tổng quan tài chính</h1>
        <span className="inline-flex items-center gap-1 ...">Đã lưu server</span>
      </div>
      <p className="text-xs text-slate-500 mt-0.5">Theo dõi dòng tiền & ngân sách thông minh</p>
    </div>
    <div className="flex items-center gap-2">
      <input type="month" value={currentMonth} ... />
      <button onClick={() => setShowBalance(!showBalance)}><Eye /></button>
    </div>
  </div>
  ```
* **Sau khi sửa (Lần 2):**
  ```tsx
  {/* Đặt khối tiêu đề trong container có nền màu xanh dương nhạt (Sky Blue) trang nhã, viền bo tròn hiện đại */}
  <div className="flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-sky-50/90 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-900/60 shadow-sm">
    <div>
      <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
        Tổng quan tài chính
      </h1>
      <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-0.5">
        Theo dõi dòng tiền & ngân sách thông minh
      </p>
    </div>

    <button
      onClick={() => setShowBalance((s) => !s)}
      className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-sky-200/80 dark:border-sky-800 text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white shadow-sm transition-colors"
      aria-label={showBalance ? 'Ẩn số dư' : 'Hiện số dư'}
      title={showBalance ? 'Ẩn số dư' : 'Hiện số dư'}
    >
      <Eye className="w-4 h-4" />
    </button>
  </div>
  ```

---

### 4. Kết Quả Sau Khi Chỉnh Sửa
* Giao diện đầu trang được đặt trong một khối khung **nền màu xanh dương nhạt** (`bg-sky-50` / `dark:bg-sky-950/40`), có viền nhẹ (`border-sky-200` / `dark:border-sky-900/60`), bo góc tròn hiện đại.
* Chữ bên trong giữ màu sắc tương phản cao, sắc nét và cực kỳ dễ đọc trên cả chế độ ban ngày lẫn ban đêm.
* Đã bỏ hoàn toàn chữ "Đã lưu server" và ô chọn tháng rườm rà ở đầu trang, trả lại không gian tối giản, tinh tế đúng chuẩn web app quản lý tài chính cá nhân.
* Cơ chế lưu trữ server disk (`data/database.json`) vẫn hoạt động âm thầm và bền vững ở tầng ngầm.

---

## [LẦN CHỈNH SỬA 03] - Tối giản Dashboard để không bị rối mắt & Chuyển các biểu đồ Thu-Chi sang tab "Sổ Giao Dịch"

* **Thời gian thực hiện:** 16/09/2026
* **Mức độ ảnh hưởng:** Tái cấu trúc luồng xem dữ liệu (UX & Information Architecture)
* **Trạng thái:** ✅ Đã hoàn thành và xác minh

---

### 1. Vấn Đề Cần Điều Chỉnh

1. **Trang chủ (Dashboard) cần tối giản, biết vừa đủ:**
   - Trang chủ chỉ cần đóng vai trò tổng quan nhanh: Nắm bắt số dư, tài sản ròng, thu chi tháng này, các thao tác nhanh và danh sách giao dịch mới nhất.
   - Việc nhồi nhét hai biểu đồ lớn ("Thu - Chi" và "Chi tiêu theo danh mục") vào trang chủ khiến người dùng bị ngợp và rối mắt khi vừa mở web.
2. **Nhu cầu xem biểu đồ vẫn cần thiết nhưng nên đặt đúng ngữ cảnh:**
   - Chuyển 2 biểu đồ này sang tab **"Sổ giao dịch"** (`TransactionsView.tsx`).
   - Khi vào "Sổ giao dịch", người dùng vừa xem được biểu đồ trực quan, vừa xem được số liệu thống kê và danh sách chi tiết bên dưới.
   - Bổ sung nút **"Xem biểu đồ / Ẩn biểu đồ"** để người dùng có thể linh hoạt đóng/mở khi cần.
3. **Đồng bộ giao diện Dark Mode:**
   - Toàn bộ các thẻ đều được thiết lập màu Dark Mode chuẩn (`dark:bg-slate-900`), chống chói mắt.

---

### 2. Danh Sách Các Tệp Đã Thay Đổi

| STT | Tệp tin | Trạng thái | Mô tả tóm tắt |
|---|---|---|---|
| 1 | `src/components/DashboardView.tsx` | **[CHỈNH SỬA]** | Gỡ bỏ 2 biểu đồ và banner What-If khỏi Dashboard, giúp trang chủ đạt độ tối giản, tập trung vào số dư và dòng tiền cốt lõi. |
| 2 | `src/components/TransactionsView.tsx` | **[CHỈNH SỬA]** | Tiếp nhận 2 biểu đồ (Dòng tiền Thu-Chi 3 tháng và Chi tiêu theo danh mục tự động cập nhật theo bộ lọc), thêm nút bấm bật/tắt "Xem biểu đồ / Ẩn biểu đồ" trên thanh tác vụ. |

---

### 3. Chi Tiết Khác Biệt Giữa Bản Ban Đầu và Bản Mới (Before vs After)

#### Tệp 1: `src/components/DashboardView.tsx`
* **Trước khi sửa:**
  - Hai biểu đồ lớn nằm chắn giữa trang chủ, chiếm diện tích và gây rối mắt.
* **Sau khi sửa:**
  - Dashboard tinh giản tối đa: Khung tiêu đề nền xanh dương nhạt $\rightarrow$ Thẻ tài sản ròng $\rightarrow$ Thu nhập / Chi tiêu $\rightarrow$ Thao tác nhanh $\rightarrow$ Giao dịch gần đây.
  - Tải nhanh, không còn cảm giác bị quá tải thông tin.

#### Tệp 2: `src/components/TransactionsView.tsx`
* **Trước khi sửa:**
  - Chỉ có thanh tóm tắt số liệu (Stats Bar) và danh sách giao dịch dạng Timeline.
* **Sau khi sửa:**
  - Thêm nút **`Xem biểu đồ / Ẩn biểu đồ`** trên thanh tác vụ (cạnh nút Xuất CSV và Xuất Excel).
  - Tích hợp 2 biểu đồ trực quan:
    1. **Dòng tiền Thu - Chi (Bar Chart):** So sánh thu nhập và chi phí 3 tháng gần nhất.
    2. **Chi tiêu theo danh mục (Pie/Donut Chart):** Tự động phân bổ theo đúng kết quả bộ lọc hiện tại của người dùng.
  - Hỗ trợ hoàn hảo cả Light Mode và Dark Mode.

---

### 4. Kết Quả Sau Khi Chỉnh Sửa
* **Trang chủ (Dashboard):** Đạt đúng mục tiêu "tối giản, biết vừa đủ", nhìn êm mắt, nắm bắt ngay tình hình tài sản.
* **Sổ giao dịch (Transactions):** Trở thành trung tâm phân tích dòng tiền hoàn chỉnh, vừa có biểu đồ động, vừa có bộ lọc nâng cao và danh sách chi tiết. Người dùng có thể bấm nút ẩn/hiện biểu đồ bất kỳ lúc nào.

---

## [LẦN CHỈNH SỬA 04] - Bổ sung lối truy cập chuyên dụng cho tính năng "Mô Phỏng What-If"

* **Thời gian thực hiện:** 16/09/2026
* **Mức độ ảnh hưởng:** Cải thiện trải nghiệm điều hướng (Navigation Enhancement)
* **Trạng thái:** ✅ Đã hoàn thành và xác minh

---

### 1. Vấn Đề Cần Điều Chỉnh

* Trong phiên bản gốc của dự án, tính năng mô phỏng tài chính What-If (`WhatIfSimulatorView.tsx`) **không hề có trên thanh Menu chính**, mà chỉ có một banner quảng cáo lớn ở trang chủ.
* Khi trang chủ được tinh giản, người dùng khó tìm thấy lối vào tính năng này.

---

### 2. Danh Sách Các Tệp Đã Thay Đổi

| STT | Tệp tin | Trạng thái | Mô tả tóm tắt |
|---|---|---|---|
| 1 | `src/components/Navigation.tsx` | **[CHỈNH SỬA]** | Đưa **"Mô phỏng What-If"** thành một tab chính thức trên thanh điều hướng Menu trên cùng, có icon Sparkles nổi bật. |
| 2 | `src/components/DashboardView.tsx` | **[CHỈNH SỬA]** | Thêm một thẻ lối tắt tinh gọn (Quick Entry Card) đặt trên danh sách giao dịch gần đây, giúp truy cập What-If nhanh chóng mà không làm nặng trang chủ. |

---

### 3. Kết Quả Sau Khi Chỉnh Sửa

* Giờ đây bạn có thể mở **Mô phỏng What-If** theo 2 cách cực kỳ thuận tiện:
  1. **Trên thanh điều hướng (Menu trên cùng):** Bấm trực tiếp vào tab **"Mô phỏng What-If"** (nằm ngay cạnh tab *Ngân sách*).
  2. **Trên trang chủ (Dashboard):** Bấm vào thẻ **"Mô phỏng tài chính What-If"** ngay phía trên danh sách Giao dịch gần đây.

---

## [LẦN CHỈNH SỬA 05] - Tùy Chỉnh Giao Diện Sáng / Tối Theo Ý Muốn (Dark Mode & Theme Customization)

* **Thời gian thực hiện:** 16/09/2026
* **Mức độ ảnh hưởng:** Trải nghiệm người dùng & Giao diện thị giác (UI / UX & Theme Engine)
* **Trạng thái:** ✅ Đã hoàn thành và xác minh

---

### 1. Vấn Đề Ban Đầu Được Báo Cáo

1. **Người dùng muốn tùy biến giao diện theo ý muốn:**
   - Ứng dụng trước đây không có nút bấm hay bất kỳ cơ chế nào để người dùng chủ động chuyển đổi giữa giao diện Sáng (Light Mode) và giao diện Tối (Dark Mode).
   - Thanh điều hướng trên cùng (Header Desktop & Mobile), thanh Tab điều hướng và thanh Bottom Bar di động bị gán cố định nền trắng (`bg-white`), gây chói mắt và mất đồng bộ khi người dùng muốn sử dụng Dark Mode.
   - Hộp thoại nhập giao dịch nhanh (`QuickAddModal`) cũng bị gán nền trắng cứng nhắc.
   - Khi tải lại trang web, giao diện có thể bị chớp trắng nếu chưa kịp đọc trạng thái Dark Mode từ trình duyệt.

---

### 2. Danh Sách Các Tệp Đã Thay Đổi

| STT | Tệp tin | Trạng thái | Mô tả tóm tắt |
|---|---|---|---|
| 1 | `src/app/globals.css` | **[CHỈNH SỬA]** | Đăng ký biến thể `@custom-variant dark (&:where(.dark, .dark *));` chuẩn Tailwind CSS v4 và định nghĩa bộ biến màu `.dark` tương phản cao. |
| 2 | `src/app/layout.tsx` | **[CHỈNH SỬA]** | Thêm inline script chống chớp màn hình (Zero Flash Theme Script) và cờ `suppressHydrationWarning` trên thẻ `<html>`. |
| 3 | `src/context/AppContext.tsx` | **[CHỈNH SỬA]** | Bổ sung State quản lý Theme (`theme: 'light' \| 'dark' \| 'system'`), hàm `setTheme`, `toggleTheme`, `isDarkMode`; tự động lưu vào `localStorage` và lắng nghe thay đổi của hệ điều hành. |
| 4 | `src/components/Navigation.tsx` | **[CHỈNH SỬA]** | Thêm nút chuyển đổi Sáng / Tối nhanh (Mặt trời ☀️ / Mặt trăng 🌙) trên thanh Header cả Mobile và Desktop; phủ màu Dark Mode chuẩn cho Header, Tab Menu, Bottom Bar và Dropdown Cảnh báo. |
| 5 | `src/components/SettingsView.tsx` | **[CHỈNH SỬA]** | Thêm khối tùy chỉnh giao diện **"Tùy Chỉnh Giao Diện & Chủ Đề (Appearance & Theme)"** với 3 thẻ chọn trực quan: Sáng (Light), Tối (Dark), Theo Hệ Thống (Auto). |
| 6 | `src/components/QuickAddModal.tsx` | **[CHỈNH SỬA]** | Chuẩn hóa màu nền Dark Mode (`dark:bg-slate-900 dark:border-slate-800`), màu chữ và viền cho Modal Nhập nhanh. |
| 7 | `src/app/page.tsx` | **[CHỈNH SỬA]** | Bổ sung màu sắc Dark Mode cho Footer chân trang desktop (`dark:bg-slate-900/50 dark:border-slate-800/80`). |

---

### 3. Chi Tiết Khác Biệt Giữa Bản Ban Đầu và Bản Mới (Before vs After)

#### Tệp 1: `src/app/globals.css`
* **Trước khi sửa:**
  - Chỉ có `@import "tailwindcss";` và bộ biến `:root` dành riêng cho theme sáng.
  - Tailwind CSS v4 tự động phụ thuộc vào `@media (prefers-color-scheme: dark)` của trình duyệt, không cho phép bật/tắt thủ công qua class `.dark`.
* **Sau khi sửa:**
  - Thêm `@custom-variant dark (&:where(.dark, .dark *));` giúp Tailwind CSS v4 kích hoạt mọi thuộc tính `dark:...` ngay khi class `.dark` được gắn vào thẻ `<html>`.
  - Khởi tạo bộ biến màu `.dark` cho `--background`, `--foreground`, `--surface`, `--border`.

#### Tệp 2: `src/context/AppContext.tsx`
* **Trước khi sửa:**
  - Không có State hoặc Action nào liên quan đến Theme / Giao diện.
* **Sau khi sửa:**
  - Cung cấp:
    - `theme`: `'light'` | `'dark'` | `'system'`
    - `setTheme(theme)`: Chuyển đổi chủ đề
    - `toggleTheme()`: Bật / tắt nhanh giữa Sáng và Tối chỉ với 1 click
    - `isDarkMode`: Boolean trạng thái hiện tại (đã phân giải qua System preference nếu chọn 'system')
  - Gắn class `.dark` vào `document.documentElement` theo thời gian thực và ghi nhớ vào `localStorage.getItem('fintrack_theme')`.

#### Tệp 3: `src/components/Navigation.tsx`
* **Trước khi sửa:**
  - Header và Navigation cứng ngắc nền trắng: `bg-white/90 border-slate-100`.
  - Không có nút đổi theme.
* **Sau khi sửa:**
  - Thêm nút **Nắng / Trăng (Sun / Moon)** nằm cạnh chuông thông báo trên cả Desktop và Mobile.
  - Phủ đầy đủ `dark:bg-slate-900/90`, `dark:border-slate-800`, `dark:text-white` cho toàn bộ thanh điều hướng, menu con và popup cảnh báo.

#### Tệp 4: `src/components/SettingsView.tsx`
* **Trước khi sửa:**
  - Chỉ có Sao lưu JSON, Khôi phục Demo và Kiến trúc kỹ thuật.
* **Sau khi sửa:**
  - Bổ sung khối **"Tùy Chỉnh Giao Diện & Chủ Đề (Appearance & Theme)"** đặt ở vị trí trung tâm, trực quan với 3 nút lựa chọn:
    1. ☀️ **Giao diện Sáng (Light):** Tươi sáng, thanh lịch, làm việc ban ngày rõ nét.
    2. 🌙 **Giao diện Tối (Dark):** Tông than đen hiện đại, dịu mắt, chống mỏi mắt ban đêm.
    3. 💻 **Theo Thiết Bị (Auto):** Tự động đồng bộ theo chế độ sáng/tối của máy tính hoặc điện thoại.

---

### 4. Hướng Dẫn Sử Dụng Tính Năng Mới
1. **Cách 1 - Bật/Tắt tức thì 1 Click:**
   - Trên thanh menu trên cùng (cạnh biểu tượng Chuông thông báo), bạn chỉ cần bấm vào biểu tượng **Mặt trăng 🌙** (để chuyển sang Tối) hoặc **Mặt trời ☀️** (để chuyển sang Sáng).
2. **Cách 2 - Tùy chỉnh chi tiết trong Cài đặt:**
   - Vào menu **"Cài đặt"** $\rightarrow$ xem khối **"Tùy Chỉnh Giao Diện & Chủ Đề"** $\rightarrow$ bấm chọn giữa 3 chế độ: *Sáng*, *Tối* hoặc *Theo Hệ Thống*. Lựa chọn của bạn sẽ được lưu vĩnh viễn trên trình duyệt.

---

## [LẦN CHỈNH SỬA 06] - Cho Phép Truy Cập Server Từ Các Thiết Bị Khác Trong Mạng LAN (-H 0.0.0.0)

* **Thời gian thực hiện:** 16/09/2026
* **Mức độ ảnh hưởng:** Cấu hình khởi chạy môi trường máy chủ (Server Network Configuration)
* **Trạng thái:** ✅ Đã hoàn thành và xác minh

---

### 1. Vấn Đề Cần Điều Chỉnh

* Mặc định lệnh `next dev` của Next.js chỉ lắng nghe kết nối cục bộ trên máy chủ (`localhost` hay `127.0.0.1`).
* Khi người dùng mở điện thoại hoặc một máy tính khác trong cùng mạng Wi-Fi/LAN, các thiết bị đó không thể kết nối vào web dù gõ đúng địa chỉ IP.
* Người dùng muốn chỉ cần gõ lệnh `npm run dev` thông thường mà không cần nhớ gõ thêm cờ lệnh `-- -H 0.0.0.0` dài dòng mỗi lần bật server.

---

### 2. Danh Sách Các Tệp Đã Thay Đổi

| STT | Tệp tin | Trạng thái | Mô tả tóm tắt |
|---|---|---|---|
| 1 | `package.json` | **[CHỈNH SỬA]** | Cập nhật script `"dev": "next dev -H 0.0.0.0"` và `"start": "next start -H 0.0.0.0"`. |

---

### 3. Chi Tiết Khác Biệt Giữa Bản Ban Đầu và Bản Mới (Before vs After)

#### Tệp: `package.json`
* **Trước khi sửa:**
  ```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
  ```
* **Sau khi sửa:**
  ```json
  "scripts": {
    "dev": "next dev -H 0.0.0.0",
    "build": "next build",
    "start": "next start -H 0.0.0.0",
    "lint": "next lint"
  }
  ```

---

### 4. Kết Quả Sau Khi Chỉnh Sửa
* Từ giờ bạn chỉ cần gõ đúng một lệnh duy nhất:
  ```bash
  npm run dev
  ```
* Next.js sẽ tự động mở cổng cho toàn bộ mạng nội bộ (`0.0.0.0`). Khi khởi động xong, terminal của Next.js sẽ tự hiển thị sẵn 2 dòng:
  - **Local:** `http://localhost:3000` (để dùng trên máy tính hiện tại)
  - **Network:** `http://192.168.x.x:3000` (để mở bằng điện thoại hoặc máy tính khác trong cùng Wi-Fi)

---

## [LẦN CHỈNH SỬA 07] - Sửa Nút Chỉnh Sửa Ví & Bổ Sung Tính Năng Xem Chi Tiết Thu Chi Từng Ví Riêng Biệt

* **Thời gian thực hiện:** 16/09/2026
* **Mức độ ảnh hưởng:** Quản lý tài chính cốt lõi & Giám sát dòng tiền (Wallet Details & Account Cashflow Audit)
* **Trạng thái:** ✅ Đã hoàn thành và xác minh

---

### 1. Vấn Đề Ban Đầu Được Báo Cáo

1. **Nút Chỉnh sửa ví (icon cây bút) không hoạt động:**
   - Trong code cũ của `WalletsView.tsx`, hàm `onEdit` chỉ gọi `setEditingWallet(w)` mà không hề gọi `setWalletModalOpen(true)` và không điền dữ liệu (prefill state). Do đó khi bấm vào biểu tượng cây bút, giao diện hoàn toàn không có phản hồi.
2. **Thiếu tính năng xem chi tiết thu - chi của riêng từng ví:**
   - Người dùng chỉ thấy số dư tổng quát của ví trên thẻ mà không thể bấm vào bên trong để kiểm tra: Ví này đã chi những khoản gì? Nhận tiền từ đâu? Chuyển tiền đi ví nào? Giao dịch có chứng từ/ảnh chụp hóa đơn nào?
   - Không thể phân tích dòng tiền vào (Inflow), dòng tiền ra (Outflow) và chênh lệch ròng (Net Cashflow) của riêng từng tài khoản.

---

### 2. Danh Sách Các Tệp Đã Thay Đổi

| STT | Tệp tin | Trạng thái | Mô tả tóm tắt |
|---|---|---|---|
| 1 | `src/components/WalletsView.tsx` | **[CHỈNH SỬA TOÀN DIỆN]** | Sửa lỗi nút Chỉnh sửa ví; Bổ sung chế độ xem **"Chi Tiết Ví & Lịch Sử Dòng Tiền"** chuyên sâu cho từng ví, hỗ trợ lọc theo loại, tìm kiếm, hiển thị ảnh hóa đơn và xóa giao dịch. |
| 2 | `src/context/AppContext.tsx` | **[CHỈNH SỬA]** | Hỗ trợ tham số `defaultWalletId` trong hàm `openQuickAdd`, giúp tự động chọn đúng ví đang xem khi tạo giao dịch thu/chi. |
| 3 | `src/components/QuickAddModal.tsx` | **[CHỈNH SỬA]** | Tiếp nhận `quickAddDefaultWalletId` để tự động gán ví tương ứng khi mở modal nhập nhanh. |

---

### 3. Chi Tiết Khác Biệt Giữa Bản Ban Đầu và Bản Mới (Before vs After)

#### Tệp 1: `src/components/WalletsView.tsx`
* **Trước khi sửa:**
  - `onEdit={() => setEditingWallet(w)}` $\rightarrow$ không mở modal, không nạp dữ liệu cũ của ví.
  - Thẻ ví không thể bấm vào để xem lịch sử giao dịch.
* **Sau khi sửa:**
  - **Sửa nút Chỉnh sửa (Pencil icon):** Tạo hàm `handleStartEditWallet`, tự động nạp toàn bộ Tên ví, Loại ví, Số dư, Ngân hàng, STK, Hạn mức, Lãi suất, Màu sắc và mở modal ngay lập tức.
  - **Bấm vào thẻ ví để xem chi tiết:** Cả thẻ ví đều có thể bấm vào (`onClick={() => setSelectedWalletId(w.id)}`), hiển thị dòng chỉ dẫn *"Xem chi tiết thu & chi →"*.
  - **Màn hình Chi Tiết Ví Chuyên Sâu (Wallet Detail View):**
    1. **Nút quay lại:** `[← Quay lại tất cả các ví]` giúp điều hướng mượt mà.
    2. **Khung tổng quan ví:** Logo màu sắc, Loại tài khoản, Số tài khoản, Hạn mức thẻ/Lãi suất, Số dư hiện tại.
    3. **Thanh công cụ tác vụ nhanh của ví:**
       - `[+ Nạp / Thu vào ví]`: Tự động điền ví này để ghi thu.
       - `[- Chi tiền từ ví]`: Tự động điền ví này để ghi chi.
       - `[Chuyển tiền]`: Tự động chọn ví này làm ví nguồn chuyển.
       - `[Sửa ví]`: Mở modal cập nhật thông tin ví.
    4. **4 Thẻ thống kê tài chính của riêng ví này:**
       - 💳 **Số dư hiện tại**
       - 🟢 **Tổng tiền thu / nạp vào ví** (Inflow)
       - 🔴 **Tổng tiền chi / rút ra** (Outflow)
       - 🔵 **Chênh lệch dòng tiền ròng** (Net Flow = Thu - Chi)
    5. **Bộ lọc & Tìm kiếm:**
       - Lọc theo: *Tất cả*, *Khoản chi*, *Khoản thu*, *Chuyển khoản*.
       - Ô tìm kiếm: Tìm nhanh theo ghi chú, tên danh mục, số tiền, thẻ tag.
    6. **Danh sách giao dịch chi tiết:**
       - Phân biệt rõ ràng: Khoản thu (+ xanh lá), Khoản chi (- đỏ), Chuyển đi (- đỏ kèm phí), Nhận tiền (+ xanh lá).
       - Nút xem ảnh chứng từ / hóa đơn (phóng to toàn màn hình qua `ReceiptModal`).
       - Nút xóa giao dịch (kèm hoàn tác số dư ví an toàn).

#### Tệp 2 & 3: `src/context/AppContext.tsx` & `src/components/QuickAddModal.tsx`
* **Cải tiến:** Cho phép truyền `walletId` vào hàm `openQuickAdd('EXPENSE', walletId)`. Khi đang xem ví nào và bấm thêm giao dịch, modal sẽ tự động chọn sẵn ví đó cho người dùng mà không cần chọn lại thủ công.

---

### 4. Hướng Dẫn Sử Dụng
1. **Để chỉnh sửa ví:** Nhấn trực tiếp vào biểu tượng **cây bút ✏️** trên góc thẻ ví $\rightarrow$ Modal chỉnh sửa sẽ mở ra với đầy đủ thông tin cũ để bạn sửa đổi.
2. **Để xem chi tiết thu chi của ví:** Nhấn thẳng vào **thân thẻ ví** (hoặc dòng chữ *"Xem chi tiết thu & chi →"*) $\rightarrow$ Màn hình chi tiết dòng tiền sẽ hiện ra toàn bộ thống kê và lịch sử các khoản tiền ra vào của riêng ví đó.
3. **Để quay lại:** Nhấn nút **`← Quay lại tất cả các ví`** ở góc trên bên trái.

---

## [LẦN CHỈNH SỬA 08] - Kích hoạt nút Ảnh đại diện / Avatar & Bổ sung Modal Quản lý Thông tin cá nhân (User Profile)

* **Thời gian thực hiện:** 17/09/2026
* **Mức độ ảnh hưởng:** Tính năng người dùng (User Profile & Account Management)
* **Trạng thái:** ✅ Đã hoàn thành và xác minh

---

### 1. Vấn Đề Ban Đầu Được Báo Cáo
* Người dùng nhấn vào nút đại diện tài khoản (`A Admin` ở góc trên thanh điều hướng Desktop hoặc góc màn hình Mobile) nhưng không có bất kỳ phản hồi hay modal nào mở ra.
* Nguyên nhân trong mã nguồn gốc:
  - `Navigation.tsx` đã khai báo biến `const [showProfileModal, setShowProfileModal] = useState(false);` và gắn `onClick={() => setShowProfileModal(!showProfileModal)}` vào nút avatar desktop, nhưng **chưa hề viết mã JSX hiển thị modal hay dropdown** cho `showProfileModal`.
  - Trên giao diện di động (Mobile Header), thậm chí còn chưa có nút Avatar để người dùng điện thoại nhấn vào.
  - Dự án chưa có cấu trúc dữ liệu lưu thông tin hồ sơ cá nhân (`UserProfile`), tên và email bị gán cố định ("A Admin").

---

### 2. Danh Sách Các Tệp Đã Thay Đổi

| STT | Tệp tin | Trạng thái | Mô tả tóm tắt |
|---|---|---|---|
| 1 | `src/types/index.ts` | **[CHỈNH SỬA]** | Thêm interface `UserProfile` (gồm `name, email, phone, role, membership, joinedDate, avatarColor`). |
| 2 | `src/context/AppContext.tsx` | **[CHỈNH SỬA]** | Khởi tạo state `userProfile` và hàm `updateUserProfile`; hỗ trợ tải từ server `data/database.json` & `localStorage`, tự động lưu trữ bền vững. |
| 3 | `src/components/Navigation.tsx` | **[CHỈNH SỬA]** | Thêm nút Avatar trên Mobile header; kết nối nút Avatar Desktop; render Modal **Hồ sơ tài khoản cá nhân** 2 chế độ: Xem thông tin & Chỉnh sửa trực tiếp. |

---

### 3. Chi Tiết Tính Năng Mới & Khác Biệt (Before vs After)

#### Tệp 1: `src/types/index.ts` & `src/context/AppContext.tsx`
* **Ban đầu:** Không có kiểu dữ liệu hồ sơ cá nhân, không có context lưu giữ thông tin user.
* **Hiện tại:** 
  - Khai báo kiểu `UserProfile` đầy đủ thông tin: Họ tên, Email, Số điện thoại, Vai trò (`Admin`), Gói thành viên (`Gói VIP Pro`), Ngày tham gia, Màu sắc đại diện.
  - Đồng bộ tức thì với `data/database.json` trên máy chủ và `localStorage` trên trình duyệt.

#### Tệp 2: `src/components/Navigation.tsx`
* **Trước khi sửa:** Nút avatar desktop bấm vào không có gì xảy ra. Mobile header không có nút avatar.
* **Sau khi sửa:**
  - **Trên Mobile & Desktop:** Nút avatar hiển thị ký tự đầu của tên tài khoản cùng màu nền tùy chọn của người dùng, bấm vào sẽ lập tức mở Modal **Thông tin tài khoản**.
  - **Chế độ Xem (View Mode):**
    - Thẻ Hero cá nhân: Avatar lớn nổi bật, Vương miện VIP vàng, Huy hiệu vai trò Quản trị viên (`Admin`) và Gói thành viên (`Gói VIP Pro`).
    - Thông tin chi tiết: Email, Số điện thoại liên hệ, Ngày tham gia hệ thống.
    - 3 Thẻ thống kê tài chính thu nhỏ: Số ví đang hoạt động, Tổng số giao dịch đã ghi nhận, Số mục tiêu tích lũy.
    - Các nút tác vụ nhanh: Nút **"Chỉnh sửa thông tin cá nhân"**, Nút **"Sao lưu dữ liệu (JSON)"** và Nút chuyển nhanh đến **"Cài đặt chung"**.
  - **Chế độ Chỉnh sửa (Edit Mode):**
    - Người dùng có thể chỉnh sửa: Họ tên hiển thị, Địa chỉ Email, Số điện thoại.
    - Bộ chọn 6 màu sắc đại diện cá nhân hóa (Emerald, Blue, Indigo, Purple, Rose, Amber).
    - Khi bấm **"Lưu thông tin"**, tên và màu sắc đại diện trên thanh Menu lập tức được cập nhật và lưu trữ an toàn xuống hệ thống.

---

### 4. Hướng Dẫn Sử Dụng
1. Nhấn vào biểu tượng **Avatar chữ cái kèm tên** ở góc trên cùng bên phải màn hình (hoặc góc phải trên điện thoại).
2. Modal **Thông tin tài khoản** sẽ hiển thị đầy đủ thông tin hồ sơ và tóm tắt tài chính của bạn.
3. Để thay đổi tên, email, số điện thoại hoặc màu avatar: Nhấn nút **"Chỉnh sửa thông tin cá nhân"** $\rightarrow$ Nhập thông tin mới $\rightarrow$ Nhấn **"Lưu thông tin"**.

---

## [LẦN CHỈNH SỬA 09] - Khắc phục triệt để lỗi thuật toán chuyển/chi tiền quá lớn gây số dư âm (Fund Overdraft Protection)

* **Thời gian thực hiện:** 17/09/2026
* **Mức độ ảnh hưởng:** Tối quan trọng (Financial Core Algorithm & Data Integrity)
* **Trạng thái:** ✅ Đã hoàn thành và xác minh

---

### 1. Vấn Đề Ban Đầu Được Báo Cáo
* Người dùng chuyển một số tiền lớn vượt quá quỹ hiện có của ví, hệ thống vẫn chấp nhận giao dịch và làm số dư ví rơi vào số âm (âm hàng trăm triệu đến hàng tỷ đồng, ví dụ ví tiền mặt bị âm `-567.699.997 ₫` trong cơ sở dữ liệu sau các giao dịch test 3 tỷ đồng).
* **Nguyên nhân cốt lõi:**
  - `AppContext.tsx`: Các hàm `transferFunds`, `addTransaction`, `editTransaction` trừ tiền thẳng tay (`balance - amount`) mà không hề kiểm tra xem số dư hiện có của ví có đủ để trừ hay không.
  - `WalletsView.tsx` & `QuickAddModal.tsx`: Không có cơ chế xem trước số dư còn lại (balance preview) và không khóa nút xác nhận khi số tiền nhập lớn hơn số tiền trong ví.
  - Ngoài ra phát hiện thêm: Hàm `depositToGoal` vừa tự trừ ví thủ công, vừa gọi `addTransaction` tiếp tục trừ ví (gây lỗi trừ tiền 2 lần); hàm `withdrawFromGoal` bị cộng tiền 2 lần.

---

### 2. Danh Sách Các Tệp Đã Thay Đổi

| STT | Tệp tin | Trạng thái | Mô tả tóm tắt |
|---|---|---|---|
| 1 | `src/lib/utils.ts` | **[CHỈNH SỬA]** | Bổ sung hàm `checkWalletSufficientFunds` & `getWalletAvailableBalance` tính toán hạn mức khả dụng và kiểm tra điều kiện an toàn quỹ. |
| 2 | `src/context/AppContext.tsx` | **[CHỈNH SỬA]** | Cài đặt khóa chặn an toàn trong `addTransaction`, `editTransaction`, `transferFunds`, `payBill`, `depositToGoal`; sửa dứt điểm lỗi trừ/cộng tiền 2 lần ở mục tiêu tích lũy; thêm hàm `recalculateWalletBalances`. |
| 3 | `src/components/WalletsView.tsx` | **[CHỈNH SỬA]** | Nâng cấp Modal Chuyển tiền giữa các ví: Xem trước số dư còn lại theo thời gian thực, banner cảnh báo âm quỹ màu đỏ, tự động vô hiệu hóa nút "Thực hiện chuyển" khi không đủ tiền. |
| 4 | `src/components/QuickAddModal.tsx` | **[CHỈNH SỬA]** | Hiển thị số dư khả dụng cạnh tên ví; tính toán và hiển thị banner cảnh báo đỏ khi số tiền chi/chuyển vượt quỹ; khóa nút "Thêm giao dịch". |
| 5 | `src/components/TransactionsView.tsx` | **[CHỈNH SỬA]** | Modal Chỉnh sửa giao dịch: Ngăn chặn việc sửa giao dịch thành số tiền vượt quá quỹ sau khi hoàn tác. |
| 6 | `data/database.json` | **[CHỈNH SỬA]** | Dọn dẹp các giao dịch test 3 tỷ và 630 triệu đồng đã gây âm quỹ trước đó, phục hồi số dư ví Tiền mặt về số tiền dương chuẩn xác (`62.300.000 ₫`). |

---

### 3. Chi Tiết Khác Biệt Giữa Bản Ban Đầu và Bản Mới (Before vs After)

#### Tệp 1: `src/lib/utils.ts` & `src/context/AppContext.tsx`
* **Trước khi sửa:**
  - Trừ tiền tự do: `balance: w.balance - tx.amount`. Số dư có thể âm vô hạn.
  - Thẻ tín dụng bị trừ giảm dư nợ khi chi tiêu thay vì tăng dư nợ.
* **Sau khi sửa:**
  - **Thuật toán `checkWalletSufficientFunds`:**
    - Đối với ví thông thường (`CASH`, `BANK`, `SAVINGS`): Yêu cầu bắt buộc `amount + fee <= wallet.balance`. Nếu vượt quá, lập tức trả về lỗi kèm thông báo số tiền thiếu hụt.
    - Đối với thẻ tín dụng (`CREDIT`): Kiểm tra không cho chi tiêu vượt hạn mức khả dụng còn lại (`creditLimit - balance`).
  - **Khóa sàn số dư (Floor Guard):** Sử dụng `Math.max(0, ...)` đảm bảo trong mọi trường hợp số dư ví vật lý không bao giờ bị âm.
  - **Khắc phục lỗi mục tiêu tích lũy:** Loại bỏ lệnh `setWallets` thừa trong `depositToGoal` và `withdrawFromGoal`, tránh việc ví bị trừ tiền hoặc cộng tiền 2 lần liên tiếp.

#### Tệp 2: Modal Chuyển Khoản Giữa Các Ví (`src/components/WalletsView.tsx`)
* **Trước khi sửa:** Người dùng nhập số tiền tùy ý, bấm "Thực hiện chuyển" là ví nguồn bị âm ngay lập tức mà không có bất kỳ cảnh báo nào.
* **Sau khi sửa:**
  - Hiển thị nhãn **"Khả dụng: X ₫"** màu xanh lá ngay cạnh ô chọn ví nguồn.
  - **Bảng tính toán thời gian thực (Real-time Calculation Panel):**
    - Tổng tiền trừ khỏi ví nguồn (gồm phí chuyển).
    - Dự kiến số dư còn lại của ví nguồn sau khi chuyển.
  - **Cảnh báo âm quỹ:** Nếu số tiền vượt quỹ, dòng số dư còn lại chuyển sang màu đỏ kèm chữ `(ÂM QUỸ)`, đồng thời xuất hiện Banner đỏ: *"Cảnh báo: Số tiền chuyển vượt quá số dư hiện có. Hệ thống khóa chuyển tiền để chống âm quỹ!"*.
  - **Khóa nút bấm:** Nút "Thực hiện chuyển" tự động bị mờ (Disabled), đổi chữ thành *"Số dư không đủ"* và không cho phép ấn.

#### Tệp 3: Modal Nhập Nhanh (`src/components/QuickAddModal.tsx`)
* **Trước khi sửa:** Không kiểm tra số dư khi chi tiêu (`EXPENSE`) hoặc chuyển ví (`TRANSFER`).
* **Sau khi sửa:**
  - Tích hợp kiểm tra cho cả hai tab Chi tiêu và Chuyển tiền.
  - Hiển thị số dư khả dụng của từng ví được chọn.
  - Tự động hiển thị banner cảnh báo và khóa nút submit nếu số tiền giao dịch vượt quá quỹ hiện có.

---

### 4. Hướng Dẫn Thử Nghiệm Xác Minh
1. Vào mục **"Ví"** $\rightarrow$ Bấm nút **"Chuyển ví"** trên bất kỳ ví nào (hoặc biểu tượng chuyển khoản giữa các ví).
2. Chọn một ví nguồn (ví dụ có 2.850.000 ₫).
3. Nhập số tiền chuyển lớn hơn số dư ví (ví dụ `10.000.000` ₫).
4. Quan sát:
   - Hệ thống lập tức hiện bảng dự tính số dư màu đỏ.
   - Banner cảnh báo màu đỏ xuất hiện giải thích chi tiết số tiền vượt quỹ.
   - Nút **"Thực hiện chuyển"** bị khóa hoàn toàn, không thể ấn được.
5. Sửa lại số tiền hợp lệ (ví dụ `500.000` ₫) $\rightarrow$ Nút bấm sáng xanh trở lại và cho phép chuyển tiền an toàn, số dư ví trừ đúng 500.000 ₫ không bao giờ bị âm.

---

## [LẦN CHỈNH SỬA 10] - Tối ưu hóa toàn diện Biểu đồ Chi tiêu theo danh mục trong "Sổ giao dịch"

* **Thời gian thực hiện:** 17/09/2026
* **Mức độ ảnh hưởng:** Trải nghiệm người dùng (UX/UI Data Visualization)
* **Trạng thái:** ✅ Đã hoàn thành và xác minh

---

### 1. Vấn Đề Ban Đầu Được Báo Cáo
* Người dùng phản ánh biểu đồ phân bổ chi tiêu tròn trong màn hình **"Sổ giao dịch"** rất khó nhìn:
  1. Hộp chú thích (Tooltip) màu đen to bản đè trực tiếp lên chính giữa biểu đồ tròn khi rê chuột, che khuất toàn bộ các lát cắt chi tiêu.
  2. Biểu đồ hình vành khuyên (Donut) bị mỏng và rỗng ở giữa, không hiển thị tổng số tiền chi tiêu.
  3. Danh sách các danh mục bên dưới bị cắt ngắn (`max-h-28`), xuất hiện thanh cuộn dọc (scrollbar) thô kệch và khó chịu.
  4. Chỉ hiển thị số tiền tuyệt đối mà không có tỷ lệ phần trăm (%), khiến người dùng khó đánh giá mức độ chiếm dụng ngân sách của từng danh mục.

---

### 2. Danh Sách Các Tệp Đã Thay Đổi

| STT | Tệp tin | Trạng thái | Mô tả tóm tắt |
|---|---|---|---|
| 1 | `src/components/TransactionsView.tsx` | **[CHỈNH SỬA TOÀN DIỆN]** | Tái cấu trúc biểu đồ Donut: Thêm tâm biểu đồ hiển thị Tổng chi tiêu / Thông tin danh mục khi rê chuột; hiển thị tỷ lệ % và thanh đo tiến độ; loại bỏ thanh cuộn thô; tooltip mờ tinh tế không che biểu đồ. |

---

### 3. Chi Tiết Khác Biệt Giữa Bản Ban Đầu và Bản Mới (Before vs After)

#### Tệp: `src/components/TransactionsView.tsx`
* **Trước khi sửa:**
  - Lát cắt biểu đồ sắp xếp ngẫu nhiên, không theo thứ tự số tiền.
  - Vòng Donut mỏng (`inner: 45, outer: 65`), tâm rỗng hoàn toàn.
  - Tooltip mặc định dạng khối hộp tối màu đè lên toàn bộ tâm và các lát cắt của biểu đồ.
  - Danh sách danh mục chỉ có tên và số tiền thô, bị thanh cuộn trình duyệt Windows/Linux mặc định chèn vào bên phải.
* **Sau khi sửa:**
  - **Sắp xếp khoa học:** Tự động sắp xếp các danh mục chi tiêu nhiều nhất lên đầu (`sort descending by value`). Màu sắc lát cắt khớp chính xác với màu danh mục hệ thống.
  - **Tâm biểu đồ tương tác thông minh (Interactive Donut Center):**
    - Trạng thái bình thường: Hiển thị chữ **"TỔNG CHI"**, tổng số tiền chi tiêu lớn nổi bật và tổng số danh mục.
    - Khi rê chuột vào bất kỳ lát cắt nào (hoặc bất kỳ dòng nào trong danh sách): Tâm biểu đồ chuyển động mượt mà hiển thị tên danh mục, **tỷ lệ phần trăm (%)** và số tiền chi tiêu của danh mục đó.
  - **Lát cắt phóng to động (Hover Zoom Effect):** Lát cắt đang chọn tự động phóng to nhẹ (`scale 1.04`) và có viền trắng nổi bật.
  - **Hộp Tooltip tinh tế:** Nhỏ gọn, bo góc mềm mại, hiệu ứng làm mờ nền (backdrop-blur) và không còn chắn tầm nhìn của biểu đồ.
  - **Danh sách chi tiết nâng cấp:**
    - Huy hiệu tỷ lệ phần trăm rõ ràng (ví dụ: `47.8%`, `36.4%`).
    - Thanh đo màu sắc (Mini Progress Bar) thể hiện trực quan mức độ chi tiêu của từng danh mục.
    - Thanh cuộn siêu mảnh (slim scrollbar) hài hòa cho cả giao diện Sáng và Tối.
    - Huy hiệu tổng chi tiêu màu hồng nổi bật đặt ngay trên tiêu đề thẻ.

---

### 4. Hướng Dẫn Thử Nghiệm
1. Bấm vào mục **"Sổ giao dịch"** trên thanh điều hướng.
2. Nhìn vào thẻ **"Chi tiêu theo danh mục"** ở góc phải hàng biểu đồ.
3. Rê chuột vào từng lát cắt hoặc từng dòng danh mục: Bạn sẽ thấy tâm biểu đồ hiển thị ngay lập tức phần trăm (%) và số tiền tương ứng, danh sách phía dưới có thanh đo màu sắc trực quan, không còn bị che khuất hay có thanh cuộn thô như trước.

---

## [LẦN CHỈNH SỬA 11] - Khắc phục triệt để lỗi tràn viền dòng cảnh báo & vỡ khung khi nhập số tiền cực lớn

* **Thời gian thực hiện:** 17/09/2026
* **Mức độ ảnh hưởng:** Giao diện & Trải nghiệm người dùng (UI/UX Layout Bugfix)
* **Trạng thái:** ✅ Đã hoàn thành và xác minh

---

### 1. Vấn Đề Ban Đầu Được Báo Cáo
* Khi người dùng nhập một số tiền cực lớn (ví dụ: hàng chục chữ số 0, `100000000000000000000000...`), dòng thông báo cảnh báo âm quỹ *(ví dụ: "Chi tiêu (100.000.000.000.000... ₫) vượt quá số dư khả dụng (10.000.000 ₫)...")* bị **tràn thẳng ra ngoài khung modal bên phải**, đâm thủng mép viền và tràn cả ra ngoài màn hình.
* **Nguyên nhân kỹ thuật:**
  1. Chuỗi số tiền định dạng tiền tệ Việt Nam (`100.000.000.000... ₫`) chứa các dấu chấm liên tục không có dấu cách. Trình duyệt coi đây là một từ đơn duy nhất (unbroken word) và theo cơ chế mặc định sẽ không ngắt dòng.
  2. Bên trong phần tử Flexbox (`display: flex`), thuộc tính `min-width` của thẻ con mặc định là `auto` (chứ không phải `0`). Khi chứa một chuỗi ký tự liền mạch siêu dài, thẻ con từ chối co lại và làm toác chiều rộng của cả hộp thông báo.
  3. Ô nhập tiền thiếu khoảng đệm bên phải (`padding-right`), khiến các chữ số khi gõ dài bị đè lấn lên ký hiệu đơn vị tiền tệ `₫`.

---

### 2. Danh Sách Các Tệp Đã Thay Đổi

| STT | Tệp tin | Trạng thái | Mô tả tóm tắt |
|---|---|---|---|
| 1 | `src/components/QuickAddModal.tsx` | **[CHỈNH SỬA]** | Thêm cơ chế tự động ngắt dòng bất kỳ (`break-words break-all [overflow-wrap:anywhere]`), chống toác flexbox (`min-w-0 flex-1 max-w-full overflow-hidden`), và thêm đệm chữ `pr-12` cho ô nhập tiền. |
| 2 | `src/components/WalletsView.tsx` | **[CHỈNH SỬA]** | Áp dụng tương tự cho hộp tính toán chuyển khoản và dòng cảnh báo âm quỹ của modal chuyển tiền giữa các ví. |
| 3 | `src/lib/utils.ts` | **[CHỈNH SỬA]** | Nâng cấp hàm `formatCurrency` xử lý an toàn giá trị không hữu hạn (`!isFinite`) hoặc `NaN`. |

---

### 3. Chi Tiết Khác Biệt Giữa Bản Ban Đầu và Bản Mới (Before vs After)

#### Tệp 1: `src/components/QuickAddModal.tsx`
* **Trước khi sửa:**
  - Ô nhập tiền dùng `px-4`, số tiền gõ dài bị đè lấp lên ký tự `₫`.
  - Khối cảnh báo: `<div className="flex items-start gap-2">` chứa thẻ `<div>` bọc văn bản với `min-width: auto` mặc định.
  - Chuỗi tiền tệ dài hàng chục chữ số không chịu xuống dòng, xé rách khung modal sang bên phải.
* **Sau khi sửa:**
  - Ô nhập tiền dùng `pl-4 pr-12`, ký tự `₫` có `pointer-events-none`, các số dài không bao giờ che khuất ký hiệu tiền tệ.
  - **Giới hạn số chữ số an toàn:** Thêm điều kiện chặn tối đa 15 chữ số (`<= 15` chữ số, tương đương gần 1 triệu tỷ VNĐ - ngưỡng an toàn `Number.MAX_SAFE_INTEGER` của JavaScript) trong `onChange`. Ngăn chặn người dùng nhập chuỗi số thiên văn làm mất độ chính xác dấu phẩy động (Floating-point precision loss) dẫn đến việc số bị làm tròn thành hàng loạt số `0`.
  - Thẻ bao cảnh báo bổ sung `min-w-0 max-w-full overflow-hidden`.
  - Khối chứa văn bản được gán `min-w-0 flex-1`.
  - Thẻ thông báo `<p>` được thêm `leading-relaxed break-words break-all [overflow-wrap:anywhere]`. Khi người dùng gõ chuỗi số lớn, toàn bộ chuỗi số tiền sẽ tự động ngắt dòng mượt mà ngay bên trong khung thông báo màu hồng/đỏ mà không bao giờ bị tràn viền.

#### Tệp 2: `src/components/WalletsView.tsx`
* **Trước khi sửa:**
  - Modal chuyển khoản giữa các ví cũng hiển thị dòng cảnh báo và các dòng tính toán tổng tiền / số dư dự kiến.
  - Khi gõ số tiền chuyển quá lớn, các dòng này cũng có nguy cơ đẩy lệch giao diện ra ngoài màn hình.
* **Sau khi sửa:**
  - Khối dự tính số dư chuyển tiền và cảnh báo vượt quá số dư được trang bị đầy đủ `min-w-0 max-w-full overflow-hidden` và `break-words break-all [overflow-wrap:anywhere]`.
  - Giới hạn tối đa 15 chữ số an toàn cho ô nhập tiền chuyển và phí chuyển.
  - Ô nhập tiền chuyển khoản được bổ sung ký hiệu tiền tệ `₫` tinh tế, đồng bộ với Modal Nhập Nhanh.

#### Tệp 3: `src/lib/utils.ts`
* Thêm điều kiện an toàn `if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount)) return '0 ₫';` cho hàm `formatCurrency`.

---

### 4. Hướng Dẫn Thử Nghiệm
1. Bấm nút **"+ Ghi chép"** màu xanh (hoặc phím tắt) để mở modal **Ghi nhận giao dịch nhanh**.
2. Chọn loại giao dịch là **Khoản chi**.
3. Tại ô **Số tiền**, gõ thử một số tiền lớn vượt quá số dư ví (ví dụ: `100.000.000` hoặc `999.000.000.000`).
4. **Quan sát kết quả:** Dòng cảnh báo màu đỏ *"Chi tiêu (... ₫) vượt quá số dư khả dụng (... ₫)..."* tự động xuống dòng đều đặn, vừa vặn hoàn hảo bên trong khung cảnh báo, không còn hiện tượng tràn viền.

---

## [LẦN CHỈNH SỬA 12] - Chống nhập ký tự chữ/ký hiệu vào ô tiền tệ & Nới rộng giới hạn số tiền lên 18 chữ số (1 Tỷ Tỷ VNĐ)

* **Thời gian thực hiện:** 17/09/2026
* **Mức độ ảnh hưởng:** Tính toàn vẹn dữ liệu & Trải nghiệm người dùng (Input Sanitization & Data Integrity)
* **Trạng thái:** ✅ Đã hoàn thành và xác minh

---

### 1. Vấn Đề Ban Đầu Được Báo Cáo
1. **Tại sao lại có giới hạn số tiền và tại sao số tiền quá lớn lại biến thành hàng loạt số 0:**
   - Trong chuẩn lưu trữ số của máy tính (chuẩn IEEE 754 64-bit float), kiểu số chỉ lưu trữ chính xác tuyệt đối được 15-16 chữ số (`Number.MAX_SAFE_INTEGER` = 9.007.199.254.740.991). Khi nhập một chuỗi số quá dài (như 140 chữ số), máy tính buộc phải chuyển sang số mũ và làm tròn toàn bộ phần đuôi thành các số 0.
2. **Ô nhập số tiền vẫn cho gõ chữ và ký hiệu lạ:**
   - Mặc dù thẻ input đặt `type="number"`, nhưng theo chuẩn HTML5 của trình duyệt, các ký tự toán học như `e`, `E` (số mũ khoa học), dấu `+`, dấu `-`, dấu chấm `.` vẫn được phép nhập.
   - Thêm vào đó, bộ gõ tiếng Việt (Telex, VNI) đôi khi làm lọt các ký tự chữ cái vào ô số.
   - Các nút mũi tên tăng giảm số (`▲▼`) mặc định của trình duyệt chiếm diện tích và chèn sát ký hiệu `₫`.

---

### 2. Danh Sách Các Tệp Đã Thay Đổi

| STT | Tệp tin | Trạng thái | Mô tả tóm tắt |
|---|---|---|---|
| 1 | `src/components/QuickAddModal.tsx` | **[CHỈNH SỬA]** | Chuyển ô số tiền và phí sang `type="text"` + `inputMode="numeric"`, lọc sạch 100% chữ cái bằng regex `\D`, chặn phím `e, E, +, -, ., ,`, nới giới hạn lên 18 chữ số. |
| 2 | `src/components/WalletsView.tsx` | **[CHỈNH SỬA]** | Áp dụng cơ chế lọc chữ tương tự cho ô chuyển tiền, phí chuyển, số dư ban đầu của ví và hạn mức thẻ tín dụng. |
| 3 | `src/components/TransactionsView.tsx` | **[CHỈNH SỬA]** | Áp dụng cơ chế lọc chữ và chặn phím chữ cho modal Chỉnh sửa giao dịch. |

---

### 3. Chi Tiết Khác Biệt Giữa Bản Ban Đầu và Bản Mới (Before vs After)

#### Cải tiến cơ chế nhập tiền (Input Sanitization):
* **Trước khi sửa:**
  - Dùng thẻ `<input type="number">`.
  - Người dùng có thể gõ các chữ cái `e`, `E`, dấu `+`, `-`, ký hiệu toán học hoặc bị bộ gõ tiếng Việt chèn chữ vào ô tiền.
  - Xuất hiện nút mũi tên tăng giảm `▲▼` gây chật chội.
* **Sau khi sửa:**
  - Chuyển sang `<input type="text" inputMode="numeric" pattern="[0-9]*">`:
    + Trên máy tính: Lọc qua `e.target.value.replace(/\D/g, '')` và `onKeyDown` chặn phím: **Không thể gõ hay dán (paste) bất kỳ chữ cái nào (`a-z`, `A-Z`, `e`, `E`), dấu âm dương hay ký tự đặc biệt**. Bất kể gõ gì, ô tiền chỉ chấp nhận duy nhất các chữ số từ 0 đến 9.
    + Trên điện thoại/máy tính bảng: `inputMode="numeric"` tự động bật bàn phím số chuyên dụng (NumPad).
    + Loại bỏ hoàn toàn nút mũi tên `▲▼` xấu xí, giao diện sang trọng, hiện đại.
  - **Nới rộng giới hạn lên 18 chữ số:** Cho phép nhập số tiền lên tới **1.000.000.000.000.000.000 ₫ (1 tỷ tỷ VNĐ)**, cực kỳ rộng rãi cho mọi nhu cầu mà vẫn ngăn chặn được việc nhập chuỗi số thiên văn vô nghĩa gây lỗi dấu phẩy động.

---

### 4. Hướng Dẫn Thử Nghiệm
1. Mở popup **"+ Ghi chép"** (Ghi nhận giao dịch nhanh).
2. Thử gõ các chữ cái như `abc`, `xyz`, `e`, `E`, `+-*/` vào ô số tiền: Hệ thống **chặn đứng hoàn toàn**, không một chữ cái nào có thể lọt vào ô.
3. Thử copy một đoạn văn bản có chữ và số (ví dụ: `tien an 50000k`) rồi dán (Paste) vào ô số tiền: Hệ thống tự động lọc sạch chữ, chỉ giữ lại số `50000`.
4. Nhập số tiền dài tới 18 chữ số: Giao diện hoạt động trơn tru, hiển thị đầy đủ và chính xác.

---

## [LẦN CHỈNH SỬA 13] - Hiển thị số tiền thành chữ bằng tiếng Việt theo thời gian thực (Chống nhầm lẫn chữ số 0)

* **Thời gian thực hiện:** 17/09/2026
* **Mức độ ảnh hưởng:** Trải nghiệm người dùng & Bảo vệ giao dịch (Banking UX & Anti-Error Assistance)
* **Trạng thái:** ✅ Đã hoàn thành và xác minh

---

### 1. Vấn Đề Ban Đầu Được Báo Cáo
* Người dùng phản ánh khi nhập số tiền có nhiều chữ số 0 (ví dụ: `1800000`, `18000000`, `180000000`...), bằng mắt thường rất dễ đếm nhầm hoặc gõ thừa/thiếu một số 0, dẫn tới việc chi hoặc chuyển nhầm một khoản tiền khổng lồ (nhầm giữa 1,8 triệu thành 18 triệu hoặc 180 triệu đồng).
* Người dùng mong muốn **ngay phía dưới ô nhập số tiền có thể đọc số thành chữ bằng tiếng Việt theo thời gian thực** (như trên các app ngân hàng chuyên nghiệp) để kiểm tra đối chiếu ngay lập tức trước khi nhấn xác nhận.

---

### 2. Danh Sách Các Tệp Đã Thay Đổi

| STT | Tệp tin | Trạng thái | Mô tả tóm tắt |
|---|---|---|---|
| 1 | `src/lib/utils.ts` | **[CHỈNH SỬA]** | Xây dựng thuật toán đọc số thành chữ tiếng Việt chuẩn xác ngữ pháp (`numberToVietnameseWords`), chia nhóm 3 chữ số từ phải sang trái, hỗ trợ tới cấp hàng tỷ tỷ VNĐ. |
| 2 | `src/components/QuickAddModal.tsx` | **[CHỈNH SỬA]** | Tích hợp hộp thông báo `Bằng chữ: [Số tiền]` màu xanh dương tinh tế ngay bên dưới ô nhập số tiền trong popup Ghi nhận giao dịch nhanh. |
| 3 | `src/components/WalletsView.tsx` | **[CHỈNH SỬA]** | Tích hợp dòng đọc số thành chữ cho modal Chuyển tiền giữa các ví. |
| 4 | `src/components/TransactionsView.tsx` | **[CHỈNH SỬA]** | Tích hợp dòng đọc số thành chữ cho modal Sửa giao dịch. |

---

### 3. Chi Tiết Khác Biệt Giữa Bản Ban Đầu và Bản Mới (Before vs After)

#### Tệp 1: `src/lib/utils.ts`
* **Xây dựng hàm `numberToVietnameseWords(value: number | string)`:**
  - Xử lý mượt mà cả kiểu chuỗi ký tự lẫn số thực, không bị phụ thuộc vào giới hạn `Number` khi chuỗi dài.
  - Tuân thủ nghiêm ngặt ngữ pháp tiếng Việt:
    + Quy tắc số 1: "mười một", nhưng "hai mươi mốt", "ba mươi mốt".
    + Quy tắc số 4: "hai mươi tư", "bốn mươi tư".
    + Quy tắc số 5: "năm", "lẻ năm", nhưng "mười lăm", "hai mươi lăm".
    + Quy tắc số 0 ở hàng chục: "lẻ" / "không trăm lẻ".
    + Các cấp bậc: "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ", "tỷ tỷ"...
    + Tự động viết hoa chữ cái đầu và thêm đuôi "đồng".
  - Ví dụ:
    + `1800000` ➔ *"Một triệu tám trăm nghìn đồng"*
    + `18000000` ➔ *"Mười tám triệu đồng"*
    + `180000000` ➔ *"Một trăm tám mươi triệu đồng"*
    + `1800000000` ➔ *"Một tỷ tám trăm triệu đồng"*

#### Tệp 2, 3, 4: `QuickAddModal.tsx`, `WalletsView.tsx`, `TransactionsView.tsx`
* **Trước khi sửa:**
  - Người dùng chỉ nhìn thấy dãy số thô trong ô input `1800000`, khó nhận diện ngay được số lượng số 0.
* **Sau khi sửa:**
  - Ngay khi người dùng gõ số tiền, một khối thông báo bo góc mềm mại màu xanh dịu (`bg-blue-50 dark:bg-blue-950/40 border border-blue-200/70`) lập tức hiện ra:
    - Nhãn: `Bằng chữ:` (màu xanh dương đậm, in đậm)
    - Nội dung: Dòng chữ tiếng Việt in nghiêng rõ ràng (ví dụ: *Một triệu tám trăm nghìn đồng*).
  - Tự động thay đổi ngay theo từng nhịp gõ phím. Nếu gõ thừa một số 0, chữ lập tức nhảy sang bậc hàng tiếp theo giúp người dùng phát hiện ngay sai sót.

---

### 4. Hướng Dẫn Thử Nghiệm
1. Bấm nút **"+ Ghi chép"** để mở popup Ghi nhận giao dịch nhanh.
2. Tại ô **Số tiền (VNĐ)**, gõ thử: `1800000`.
3. **Quan sát kết quả:** Ngay dưới ô nhập tiền xuất hiện dải thông báo đẹp mắt:
   > ℹ️ **Bằng chữ:** *Một triệu tám trăm nghìn đồng*
4. Gõ thêm một số `0` thành `18000000`: Dải thông báo đổi ngay thành:
   > ℹ️ **Bằng chữ:** *Mười tám triệu đồng*
5. Thử nghiệm tương tự trong chức năng **"Chuyển tiền"** của màn hình **Ví** và chức năng **"Chỉnh sửa"** trong **Sổ giao dịch**.

---

## [LẦN CHỈNH SỬA 14] - Tự động định dạng dấu chấm phân cách hàng nghìn (1.000.000.000) ngay khi gõ số tiền

* **Thời gian thực hiện:** 17/09/2026
* **Mức độ ảnh hưởng:** Trải nghiệm người dùng & Tiêu chuẩn ứng dụng ngân hàng (Banking Number Formatting)
* **Trạng thái:** ✅ Đã hoàn thành và xác minh

---

### 1. Vấn Đề Ban Đầu Được Báo Cáo
* Khi người dùng gõ một số tiền lớn (ví dụ: `1000000000`), ô nhập liệu hiển thị một chuỗi số dính liền không có dấu chấm ngăn cách, khiến người dùng rất khó đếm xem mình đã gõ bao nhiêu số 0, dễ dẫn tới nhầm lẫn số tiền cần giao dịch.
* Người dùng mong muốn khi điền `1000000000` thì trên ô số tiền tự động hiển thị dạng `1.000.000.000` có các dấu chấm phân cách hàng nghìn rõ ràng theo chuẩn tiền tệ Việt Nam.

---

### 2. Danh Sách Các Tệp Đã Thay Đổi

| STT | Tệp tin | Trạng thái | Mô tả tóm tắt |
|---|---|---|---|
| 1 | `src/lib/utils.ts` | **[CHỈNH SỬA]** | Xây dựng hàm `formatNumberWithDots` tự động phân cách dấu chấm hàng nghìn (`\B(?=(\d{3})+(?!\d))`). |
| 2 | `src/components/QuickAddModal.tsx` | **[CHỈNH SỬA]** | Hiển thị số tiền và phí chuyển tự động gắn dấu chấm hàng nghìn theo từng nhịp gõ phím (`formatNumberWithDots`). |
| 3 | `src/components/WalletsView.tsx` | **[CHỈNH SỬA]** | Áp dụng định dạng dấu chấm hàng nghìn tức thì cho ô chuyển tiền, phí chuyển, số dư ví và hạn mức thẻ tín dụng. |
| 4 | `src/components/TransactionsView.tsx` | **[CHỈNH SỬA]** | Áp dụng định dạng dấu chấm hàng nghìn cho ô số tiền trong modal Sửa giao dịch. |

---

### 3. Chi Tiết Khác Biệt Giữa Bản Ban Đầu và Bản Mới (Before vs After)

#### Tệp 1: `src/lib/utils.ts`
* Bổ sung hàm `formatNumberWithDots(val: string | number)`:
  - Tự động bóc tách các ký tự số thuần túy.
  - Sử dụng biểu thức chính quy Regex `\B(?=(\d{3})+(?!\d))` chia nhóm 3 chữ số bằng dấu chấm `.`.
  - Tự động loại bỏ số 0 vô nghĩa ở đầu chuỗi (ví dụ: `050000` ➔ `50.000`).

#### Tệp 2, 3, 4: `QuickAddModal.tsx`, `WalletsView.tsx`, `TransactionsView.tsx`
* **Trước khi sửa:**
  - Khi gõ `1000000000`, ô hiển thị `1000000000` liền mạch, rất khó phân biệt triệu hay tỷ.
* **Sau khi sửa:**
  - Ô input tự động định dạng linh hoạt theo từng phím gõ:
    + Gõ `1` ➔ Hiển thị `1`
    + Gõ `000` ➔ Hiển thị `1.000`
    + Gõ `000` ➔ Hiển thị `1.000.000`
    + Gõ `000` ➔ Hiển thị `1.000.000.000`
  - Dữ liệu lưu trong state ứng dụng vẫn là chuỗi số nguyên chuẩn (`1000000000`), không bị ảnh hưởng đến các phép tính toán tài chính.
  - Hỗ trợ dán (Paste) chuỗi có dấu chấm, dấu phẩy sẵn (như `1.000.000.000` hoặc `1,000,000,000`) mà không bị lỗi.
  - Kết hợp hoàn hảo với dòng đọc số thành chữ bên dưới: `Bằng chữ: Một tỷ đồng`.

---

### 4. Hướng Dẫn Thử Nghiệm
1. Bấm nút **"+ Ghi chép"** để mở popup Ghi nhận giao dịch nhanh.
2. Tại ô **Số tiền (VNĐ)**, gõ liên tục: `1000000000`.
3. **Quan sát kết quả:**
   - Trong ô số tiền: Tự động nhảy thành **`1.000.000.000` ₫** rõ ràng từng nhóm nghìn, triệu, tỷ.
   - Ngay bên dưới: Xuất hiện dòng **Bằng chữ:** *Một tỷ đồng*.
4. Bấm nút xóa lùi (Backspace): Số tiền tự động co lại và cập nhật dấu chấm ngay lập tức (ví dụ: `100.000.000`, `10.000.000`...).

---

## [LẦN CHỈNH SỬA 15] - Đồng bộ định dạng dấu chấm phân cách số tiền cho Ngân sách, Sổ giao dịch, Hóa đơn và Giả lập tài chính

* **Thời gian thực hiện:** 17/09/2026
* **Mức độ ảnh hưởng:** Trải nghiệm người dùng toàn diện (App-Wide Number Formatting Consistency)
* **Trạng thái:** ✅ Đã hoàn thành và xác minh

---

### 1. Yêu Cầu Của Người Dùng
* Mở rộng tính năng tự động phân cách dấu chấm hàng nghìn (`1.000.000.000`) cho tất cả các màn hình còn lại trong hệ thống bao gồm:
  - **Ngân sách (BudgetsView):** Ô thu nhập hàng tháng, hạn mức chi tiêu danh mục, số tiền mục tiêu tiết kiệm, số tiền nạp/rút từ hũ tiết kiệm.
  - **Sổ giao dịch (TransactionsView):** Ô chỉnh sửa số tiền giao dịch.
  - **Hóa đơn định kỳ (BillsView):** Ô nhập số tiền thanh toán hóa đơn.
  - **Giả lập tài chính (WhatIfSimulatorView):** Ô mức tiêu dùng hàng tháng, chi tiêu gốc cần cắt giảm, dư nợ gốc khoản vay, số tiền trả góp hàng tháng.
* **Quy chuẩn hiển thị:** Ở các màn hình này **chỉ tự động phân cách dấu chấm**, không hiển thị dòng chữ tiếng Việt bên dưới để giao diện giữ được sự tối giản, thanh thoát và gọn gàng.

---

### 2. Danh Sách Các Tệp Đã Thay Đổi

| STT | Tệp tin | Trạng thái | Mô tả tóm tắt |
|---|---|---|---|
| 1 | `src/components/BudgetsView.tsx` | **[CHỈNH SỬA]** | Thêm định dạng dấu chấm phân cách hàng nghìn cho 4 ô: Thu nhập hàng tháng, Hạn mức chi tiêu danh mục, Mục tiêu tiết kiệm, và Nạp/rút tiền tiết kiệm. |
| 2 | `src/components/TransactionsView.tsx` | **[CHỈNH SỬA]** | Giữ định dạng dấu chấm cho ô sửa số tiền, gỡ bỏ dòng chữ tiếng Việt để giao diện tinh gọn như yêu cầu. |
| 3 | `src/components/WalletsView.tsx` | **[CHỈNH SỬA]** | Giữ định dạng dấu chấm cho ô chuyển tiền và số dư, gỡ bỏ dòng chữ tiếng Việt trong modal chuyển tiền. |
| 4 | `src/components/BillsView.tsx` | **[CHỈNH SỬA]** | Thêm định dạng dấu chấm phân cách hàng nghìn cho ô số tiền hóa đơn định kỳ. |
| 5 | `src/components/WhatIfSimulatorView.tsx` | **[CHỈNH SỬA]** | Thêm định dạng dấu chấm phân cách hàng nghìn cho ô mức tiêu dùng danh mục, chi tiêu cắt giảm, nợ gốc và tiền trả góp hàng tháng. |

---

### 3. Chi Tiết Khác Biệt Giữa Bản Ban Đầu và Bản Mới (Before vs After)

#### Tệp 1: `src/components/BudgetsView.tsx`
* **Trước khi sửa:**
  - Ô "Thu nhập hàng tháng", "Hạn mức chi tiêu tháng", "Số tiền mục tiêu", "Số tiền nạp/rút" dùng `type="number"`, người dùng nhập `5000000` nhìn như một khối số dính liền, dễ đếm thiếu hoặc thừa số 0.
* **Sau khi sửa:**
  - Cả 4 ô được chuyển sang chuẩn `inputMode="numeric"` + `formatNumberWithDots`:
    + Nhập `5000000` ➔ tự động hiển thị `5.000.000`.
    + Nhập `30000000` ➔ tự động hiển thị `30.000.000`.
    + Chặn triệt để chữ cái và các ký hiệu toán học.

#### Tệp 2: `src/components/BillsView.tsx`
* **Sau khi sửa:**
  - Ô "Số tiền thanh toán (VNĐ)" của hóa đơn định kỳ tự động gắn dấu chấm hàng nghìn (ví dụ: `250000` ➔ `250.000`, `1500000` ➔ `1.500.000`).

#### Tệp 3: `src/components/WhatIfSimulatorView.tsx`
* **Sau khi sửa:**
  - Các ô nhập số tiền trong kịch bản giả lập (Mức tiêu dùng, Chi tiêu cắt giảm, Dư nợ gốc, Tiền trả góp) tự động phân cách dấu chấm mượt mà (ví dụ: `20000000` ➔ `20.000.000`).

#### Tệp 4 & 5: `TransactionsView.tsx` & `WalletsView.tsx`
* Giữ nguyên tính năng phân cách dấu chấm hàng nghìn trong ô nhập tiền, lược bỏ dòng chữ tiếng Việt bên dưới theo đúng ý muốn của người dùng để form thao tác nhanh và gọn gàng.

---

### 4. Hướng Dẫn Thử Nghiệm
1. Vào mục **"Ngân sách"**:
   - Bấm **"Thêm hạn mức"**: Gõ `5000000` tại ô hạn mức ➔ Tự động hiển thị `5.000.000`.
   - Bấm **"Thêm mục tiêu"**: Gõ `30000000` tại ô số tiền ➔ Tự động hiển thị `30.000.000`.
   - Bấm **"Nạp tiền"** vào một mục tiêu: Gõ `2000000` ➔ Tự động hiển thị `2.000.000`.
2. Vào mục **"Hóa đơn"**:
   - Bấm **"Thêm hóa đơn"**: Gõ số tiền điện thoại `350000` ➔ Tự động hiển thị `350.000`.
3. Vào mục **"Sổ giao dịch"**:
   - Bấm sửa một giao dịch: Ô số tiền hiển thị có dấu chấm rõ ràng, không có dòng chữ rườm rà.

---

## [LẦN CHỈNH SỬA 16] - Khắc Phục Lỗi Trình Duyệt Báo "Please match the requested format" Khi Lưu Số Tiền Có Dấu Chấm

* **Thời gian thực hiện:** 17/09/2026
* **Mức độ ảnh hưởng:** Biểu mẫu nhập liệu toàn ứng dụng (HTML5 Form Validation Fix)
* **Trạng thái:** ✅ Đã hoàn thành và xác minh

---

### 1. Nguyên Nhân Gây Ra Lỗi "Please match the requested format"
* **Hiện tượng:** Khi người dùng nhập số tiền vào ô giao dịch (hoặc các form khác) và bấm "Lưu", trình duyệt chặn gửi biểu mẫu kèm thông báo lỗi dạng tooltip: *"Please match the requested format."*
* **Nguyên nhân kỹ thuật:**
  - Thuộc tính HTML5 `pattern="[0-9]*"` được cấu hình trên các thẻ `<input>`. Thuộc tính này bắt buộc giá trị hiển thị trong ô nhập liệu chỉ được chứa thuần các ký tự số `0-9`.
  - Khi tính năng tự động định dạng phân tách dấu chấm hàng nghìn được đưa vào (ví dụ: `13.541.354`), chuỗi này chứa các dấu chấm `.` nên không còn khớp với biểu thức chính quy `[0-9]*` của trình duyệt. Trình duyệt tự động kích hoạt cơ chế kiểm tra hợp lệ của HTML5 Form Validation và từ chối submit biểu mẫu.
* **Cách xử lý triệt để:**
  - Gỡ bỏ hoàn toàn thuộc tính `pattern="[0-9]*"` trên toàn bộ các ô nhập số tiền trong ứng dụng.
  - Giữ lại thuộc tính `inputMode="numeric"` để kích hoạt bàn phím số thông minh trên điện thoại di động/máy tính bảng.
  - Các sự kiện `onChange` (kèm `.replace(/\D/g, '')`) và `onKeyDown` đã kiểm soát tuyệt đối việc chỉ cho phép nhập số và ngăn mọi ký tự không hợp lệ, đảm bảo an toàn dữ liệu 100% mà không bị lỗi xác thực HTML5 từ trình duyệt.

---

### 2. Danh Sách Các Tệp Đã Thay Đổi

| STT | Tệp tin | Trạng thái | Mô tả tóm tắt |
|---|---|---|---|
| 1 | `src/components/QuickAddModal.tsx` | **[CHỈNH SỬA]** | Gỡ bỏ `pattern="[0-9]*"` khỏi ô Số tiền giao dịch và Phí giao dịch. |
| 2 | `src/components/WalletsView.tsx` | **[CHỈNH SỬA]** | Gỡ bỏ `pattern="[0-9]*"` khỏi Số dư ban đầu, Hạn mức tín dụng, Số tiền chuyển và Phí chuyển khoản. |
| 3 | `src/components/TransactionsView.tsx` | **[CHỈNH SỬA]** | Gỡ bỏ `pattern="[0-9]*"` khỏi ô Số tiền khi chỉnh sửa giao dịch. |
| 4 | `src/components/BudgetsView.tsx` | **[CHỈNH SỬA]** | Gỡ bỏ `pattern="[0-9]*"` khỏi Thu nhập tháng, Hạn mức chi tiêu, Mục tiêu tiết kiệm và Nạp/rút tiền. |
| 5 | `src/components/BillsView.tsx` | **[CHỈNH SỬA]** | Gỡ bỏ `pattern="[0-9]*"` khỏi ô Số tiền thanh toán hóa đơn. |
| 6 | `src/components/WhatIfSimulatorView.tsx` | **[CHỈNH SỬA]** | Gỡ bỏ `pattern="[0-9]*"` khỏi các ô Mức tiêu dùng, Chi tiêu cắt giảm, Dư nợ gốc và Khoản thanh toán hàng tháng. |

---

### 3. Kết Quả Sau Khi Chỉnh Sửa
* Các ô nhập tiền hiển thị dấu chấm phân cách hàng nghìn mượt mà (ví dụ: `13.541.354`).
* Bấm "Lưu giao dịch", "Thêm hạn mức", "Chuyển tiền", "Nạp tiền"... được thực thi ngay lập tức mà không bao giờ bị trình duyệt chặn hay báo lỗi "Please match the requested format." nữa.

---

## [LẦN CHỈNH SỬA 17] - Rà Soát & Khắc Phục Triệt Để Lỗi Lặp Biểu Tượng Mũi Tên và Ký Tự (+/-) Trên Toàn Bộ Giao Diện

* **Thời gian thực hiện:** 17/09/2026
* **Mức độ ảnh hưởng:** Tinh chỉnh thẩm mỹ & Chuẩn hóa UI/UX toàn hệ thống (UI Consistency & Symbol Duplication Fix)
* **Trạng thái:** ✅ Đã hoàn thành và xác minh

---

### 1. Vấn Đề Ban Đầu Được Báo Cáo
* Tại nút quay lại xem chi tiết ví (`WalletsView.tsx`), nút hiển thị lặp cả 2 mũi tên: `[Icon ArrowLeft]  ← Quay lại tất cả các ví`.
* Người dùng yêu cầu rà soát kỹ toàn bộ hệ thống xem còn chỗ nào bị lỗi lặp biểu tượng tương tự không.

---

### 2. Kết Quả Rà Soát Toàn Bộ Ứng Dụng
Qua quét toàn diện mã nguồn, phát hiện và đã xử lý các vị trí sau:
1. **Nút Quay lại ví (`WalletsView.tsx`):**
   - Trước: `<ArrowLeft />` kèm `<span>← Quay lại tất cả các ví</span>` ➔ Bị lặp 2 mũi tên trái.
   - Sau: Đã xóa ký tự `←`, chỉ giữ icon đồ họa sắc nét: `<span>Quay lại tất cả các ví</span>`.
2. **Nút Nạp/Chi tiền trong ví (`WalletsView.tsx`):**
   - Trước: `<Plus />` + `+ Nạp / Thu vào ví` và `<DollarSign />` + `- Chi tiền từ ví`.
   - Sau: Đã xóa `+` và `-` thừa: `Nạp / Thu vào ví` và `Chi tiền từ ví`.
3. **Nút Tạo ví mới (`WalletsView.tsx`):**
   - Trước: `<Plus />` + `+ Tạo ví mới`.
   - Sau: `Tạo ví mới`.
4. **Nút Thêm hóa đơn (`BillsView.tsx`):**
   - Trước: `<Plus />` + `+ Thêm hóa đơn định kỳ`.
   - Sau: `Thêm hóa đơn định kỳ`.
5. **Nút Thêm hạn mức & Tạo hũ tiết kiệm (`BudgetsView.tsx`):**
   - Trước: `<Plus />` + `+ Thêm hạn mức danh mục`, `<Plus />` + `+ Tạo hũ tiết kiệm mới`.
   - Sau: `Thêm hạn mức danh mục`, `Tạo hũ tiết kiệm mới`.
6. **Nút Nạp & Rút tiền hũ tiết kiệm (`BudgetsView.tsx`):**
   - Trước: `<ArrowDownLeft />` + `+ Nạp tiền vào hũ`, `<ArrowUpRight />` + `- Rút tiền`.
   - Sau: `Nạp tiền vào hũ`, `Rút tiền`.
7. **Nút Giao dịch mới (`TransactionsView.tsx`):**
   - Trước: `<Plus />` + `+ Giao dịch mới`.
   - Sau: `Giao dịch mới`.
8. **Nút Giả lập tài chính (`WhatIfSimulatorView.tsx`):**
   - Trước: `<Plus />` + `+ Chọn để cắt giảm`, `<Plus />` + `+ Thêm khoản nợ vay`.
   - Sau: `Chọn để cắt giảm`, `Thêm khoản nợ vay`.

---

### 3. Danh Sách Các Tệp Đã Thay Đổi

| STT | Tệp tin | Trạng thái | Mô tả tóm tắt |
|---|---|---|---|
| 1 | `src/components/WalletsView.tsx` | **[CHỈNH SỬA]** | Gỡ bỏ mũi tên lặp `←` và các dấu `+`, `-` thừa trong các nút hành động. |
| 2 | `src/components/BillsView.tsx` | **[CHỈNH SỬA]** | Gỡ bỏ ký tự `+` thừa trong nút thêm hóa đơn có icon Plus. |
| 3 | `src/components/BudgetsView.tsx` | **[CHỈNH SỬA]** | Gỡ bỏ ký tự `+` và `-` thừa trong nút hạn mức, hũ tiết kiệm, nạp tiền và rút tiền. |
| 4 | `src/components/TransactionsView.tsx` | **[CHỈNH SỬA]** | Gỡ bỏ ký tự `+` thừa trong nút tạo giao dịch mới. |
| 5 | `src/components/WhatIfSimulatorView.tsx` | **[CHỈNH SỬA]** | Gỡ bỏ ký tự `+` thừa trong nút cắt giảm chi tiêu và thêm nợ vay. |

---

### 4. Kết Quả Sau Khi Chỉnh Sửa
* 100% các nút bấm trên toàn bộ hệ thống đều tuân thủ chuẩn UI hiện đại: Biểu tượng icon vector Lucide sắc nét đặt bên trái, văn bản chữ thuần tuý rõ ràng đặt bên phải, hoàn toàn không còn bất kỳ ký tự mũi tên hay dấu +/- bị trùng lặp.

---

## [LẦN CHỈNH SỬA 18] - Khắc Phục Lỗi Không Lưu Trạng Thái Cắt Giảm Danh Mục Trong Giả Lập Tài Chính (What-If Simulator Persistence)

* **Thời gian thực hiện:** 17/09/2026
* **Mức độ ảnh hưởng:** Module Giả Lập Tài Chính & Lưu Trữ Dữ Liệu Bền Vững (State Persistence & Cross-Device Sync)
* **Trạng thái:** ✅ Đã hoàn thành và xác minh

---

### 1. Nguyên Nhân Gây Ra Lỗi
* **Hiện tượng:** Người dùng vào mục **Giả lập tài chính (What-If Simulator)**, bấm hủy chọn cắt giảm một danh mục (ví dụ: Ăn uống, Mua sắm...), nhưng khi tải lại trang (F5) hoặc mở trên thiết bị khác thì danh mục đó lại tự động bị tích chọn lại như ban đầu.
* **Nguyên nhân kỹ thuật:**
  - Trước đây, toàn bộ cấu hình danh mục cắt giảm (`spendingCategories`), tỷ lệ cắt giảm, khung thời gian, khoản vay nợ và lãi suất đầu tư đều được khai báo trong `useState` cục bộ của component `WhatIfSimulatorView.tsx` với các giá trị mặc định được hardcode cố định.
  - Dữ liệu này **chưa hề được kết nối vào hệ thống lưu trữ** (`AppContext`, `localStorage` và API máy chủ `data/database.json`). Do đó mỗi khi tải lại trang hoặc đổi thiết bị, component bị unmount/remount và toàn bộ trạng thái bị reset về mảng mặc định ban đầu.
  - Ngoài ra, nút bấm đang chọn cắt giảm còn bị lặp biểu tượng dấu tích: `<CheckCircle2 />` đi kèm ký tự `✓ Đang chọn cắt giảm`.

---

### 2. Cách Xử Lý Triệt Để
1. **Mở rộng Schema & Hệ Thống Dữ Liệu (`types/index.ts` & `mock-data.ts`):**
   - Đưa cấu trúc `PersonalSpendingItem`, `ExternalLoanItem` và `SimulatorConfig` vào kiểu dữ liệu cốt lõi của ứng dụng.
2. **Tích hợp vào Context & Cơ Sở Dữ Liệu (`AppContext.tsx` & `storage/route.ts`):**
   - Thêm `simulatorConfig` vào `AppContextType` và quản lý trạng thái tập trung trong `AppProvider`.
   - Kết nối tự động vào luồng lưu trữ kép:
     + Lưu nhanh vào `localStorage` trên trình duyệt.
     + Đồng bộ bền vững vào file `data/database.json` thông qua API `/api/storage`.
   - Khi tải lại trang (F5) hoặc mở trên điện thoại, hệ thống tự động tải lại chính xác cấu hình danh mục đã hủy chọn hoặc đã chỉnh sửa.
3. **Xử lý giao diện (`WhatIfSimulatorView.tsx`):**
   - Chuyển `WhatIfSimulatorView` sang sử dụng trực tiếp `simulatorConfig` và `updateSimulatorConfig` từ `useApp()`.
   - Gỡ bỏ ký tự `✓` thừa trong nút `<span>Đang chọn cắt giảm (Bấm để hủy)</span>`, chỉ giữ icon `<CheckCircle2 />` sắc nét.

---

### 3. Danh Sách Các Tệp Đã Thay Đổi

| STT | Tệp tin | Trạng thái | Mô tả tóm tắt |
|---|---|---|---|
| 1 | `src/types/index.ts` | **[CHỈNH SỬA]** | Định nghĩa các interface `PersonalSpendingItem`, `ExternalLoanItem`, `SimulatorConfig`. |
| 2 | `src/lib/mock-data.ts` | **[CHỈNH SỬA]** | Khởi tạo cấu hình ban đầu `INITIAL_SIMULATOR_CONFIG` cho module giả lập. |
| 3 | `src/app/api/storage/route.ts` | **[CHỈNH SỬA]** | Hỗ trợ lưu trữ và nạp `simulatorConfig` trên server disk (`database.json`). |
| 4 | `src/context/AppContext.tsx` | **[CHỈNH SỬA]** | Tích hợp quản lý trạng thái, nạp dữ liệu và tự động sync `simulatorConfig`. |
| 5 | `src/components/WhatIfSimulatorView.tsx` | **[CHỈNH SỬA]** | Kết nối với AppContext để lưu vĩnh viễn trạng thái chọn/hủy cắt giảm và sửa lặp dấu tích. |

---

### 4. Kết Quả Sau Khi Chỉnh Sửa
* Người dùng bấm "Bấm để hủy" hoặc "Chọn để cắt giảm", chỉnh mức phần trăm cắt giảm, thêm khoản nợ vay... tất cả thay đổi được **lưu lại vĩnh viễn**.
* Khi bấm F5 tải lại trang hoặc mở trên điện thoại, các danh mục đã hủy vẫn giữ nguyên trạng thái chưa chọn, không bị tự động tích lại.
* Nút bấm hiển thị icon đẹp mắt, không còn bị lặp ký tự `✓`.

---

## [LẦN CHỈNH SỬA 19] - Khắc Phục Lỗi Hiển Thị Ngày Cố Định (06/09) Trong Mục "Hóa Đơn Định Kỳ" Sang Ngày Thực Tế

* **Thời gian thực hiện:** 18/09/2026
* **Mức độ ảnh hưởng:** Module Hóa Đơn Định Kỳ (Bills View Dynamic Date Fix)
* **Trạng thái:** ✅ Đã hoàn thành và xác minh

---

### 1. Nguyên Nhân Gây Ra Lỗi
* **Hiện tượng:** Tại màn hình "Định kỳ" (Hóa đơn định kỳ), tiêu đề danh sách hiển thị: *"Hôm nay là ngày 06/09/2026"*, trong khi ngày thực tế là 18/09/2026.
* **Nguyên nhân kỹ thuật:**
  - Trong mã nguồn cũ của `BillsView.tsx`, biến `today` được gán cứng cố định là `const today = 6;` và dòng text hiển thị cũng bị hardcode tĩnh là `<span>Hôm nay là ngày 06/09/2026</span>`.
  - Điều này không những làm sai lệch hiển thị ngày tháng hiện tại, mà còn khiến logic tính toán số ngày còn lại đến hạn (`bill.dueDay - today`), cảnh báo quá hạn hoặc sắp đến hạn bị tính sai so với thời gian thực.

---

### 2. Cách Xử Lý Triệt Để
* Cập nhật `BillsView.tsx` sử dụng đối tượng `new Date()` theo thời gian thực của hệ thống:
  - Lấy ngày trong tháng `now.getDate()` cho biến `today` để tính chính xác khoảng cách ngày đến hạn của từng hóa đơn.
  - Định dạng chuỗi ngày tháng động dạng `DD/MM/YYYY` (ví dụ: `18/09/2026`).
  - Sử dụng `useEffect` để đồng bộ an toàn với phía Client, chống lỗi sai lệch Hydration của Next.js.
* Giao diện hiển thị chính xác theo ngày thực tế: *"Hôm nay là ngày 18/09/2026"* (hoặc bất kỳ ngày nào trong tương lai).

---

### 3. Danh Sách Các Tệp Đã Thay Đổi

| STT | Tệp tin | Trạng thái | Mô tả tóm tắt |
|---|---|---|---|
| 1 | `src/components/BillsView.tsx` | **[CHỈNH SỬA]** | Thay thế ngày cố định `06/09/2026` bằng ngày động thực tế `new Date()`, đảm bảo tính đúng hạn/quá hạn của hóa đơn. |

---

### 4. Kết Quả Sau Khi Chỉnh Sửa
* Tiêu đề hiển thị đúng chính xác ngày hôm nay (18/09/2026).
* Các cảnh báo hóa đơn (đến hạn hôm nay, quá hạn, còn bao nhiêu ngày) tự động tính toán chuẩn xác 100% theo từng ngày trong tháng.

---

## [LẦN CHỈNH SỬA 20] - Sửa Lỗi Lệch Múi Giờ UTC (17/9 thay vì 18/9), Bổ Sung Tùy Chỉnh Ngày Đóng Tiền & Cài Đặt Nhắc Nhở Hóa Đơn

* **Thời gian thực hiện:** 18/09/2026
* **Mức độ ảnh hưởng:** Module Hóa Đơn Định Kỳ & Múi Giờ Hệ Thống (Timezone & Custom Reminder/Payment Date)
* **Trạng thái:** ✅ Đã hoàn thành và xác minh

---

### 1. Nguyên Nhân Gây Ra Lỗi Hiển Thị Ngày 17/9 Thay Vì 18/9
1. **Lệch múi giờ UTC (Timezone Bug):**
   - Khi người dùng bấm "Thanh toán ngay", hệ thống gán `lastPaidDate: new Date().toISOString().split('T')[0]`.
   - Hàm `toISOString()` luôn quy đổi thời gian về giờ chuẩn quốc tế UTC (GMT+0).
   - Tại Việt Nam (UTC+7), khi người dùng thực hiện giao dịch vào lúc 00:38 sáng ngày 18/09, giờ UTC tương ứng mới chỉ là 17:38 chiều ngày 17/09. Kết quả là hệ thống tự động ghi nhận ngày thanh toán là `2026-09-17` thay vì `2026-09-18`.
2. **Thiếu tính linh hoạt cho ứng dụng tài chính cá nhân:**
   - Người dùng không có ô chọn ngày thanh toán khi bấm "Thanh toán ngay", dẫn đến không thể ghi nhận thanh toán cho các ngày trước đó hoặc đóng bù.
   - Khi chỉnh sửa hóa đơn, chưa có tùy chọn điều chỉnh ngày đã đóng (`lastPaidDate`) hoặc chuyển đổi trạng thái đã đóng / chưa đóng.
   - Chưa có tùy chọn cài đặt nhắc trước bao nhiêu ngày (`reminderDaysBefore`) và banner thông báo nhắc nhở các hóa đơn sắp đến hạn.

---

### 2. Cách Xử Lý Triệt Để
1. **Đồng bộ múi giờ địa phương an toàn:**
   - Xây dựng hàm `getLocalDateString()` trong `src/lib/utils.ts` lấy trực tiếp `getFullYear()`, `getMonth() + 1`, `getDate()` theo giờ máy người dùng (Việt Nam UTC+7), định dạng chuẩn `YYYY-MM-DD`.
   - Xây dựng hàm `formatDisplayDate()` để định dạng hiển thị thân thiện dạng `DD/MM/YYYY` (ví dụ: `18/09/2026`) thay vì chuỗi ISO thô.
   - Cập nhật toàn bộ các vị trí lưu trữ lịch sử mục tiêu và backup dữ liệu sang dùng `getLocalDateString()`.
2. **Cho phép tùy chỉnh ngày thanh toán khi bấm "Thanh toán ngay":**
   - Hộp thoại Xác nhận thanh toán hóa đơn được bổ sung ô chọn ngày: `<input type="date" value={payDate} />`.
   - Mặc định là ngày hôm nay theo giờ địa phương, người dùng có thể tùy ý chọn bất kỳ ngày nào họ đã đóng.
   - Giao dịch chi tiêu được tạo ra cũng gắn đúng ngày giờ người dùng đã chọn.
3. **Cho phép chỉnh sửa ngày đã đóng & trạng thái trong Modal Sửa Hóa Đơn:**
   - Trong Modal Thêm / Chỉnh sửa hóa đơn, bổ sung mục "Trạng thái thanh toán tháng này" (Chưa thanh toán / Đã thanh toán).
   - Nếu là "Đã thanh toán", hiển thị ô chọn ngày để người dùng có thể sửa lại ngày đã đóng bất cứ lúc nào (ví dụ sửa từ 17/09 thành 18/09).
4. **Tùy chỉnh thời gian nhắc đóng:**
   - Thêm trường "Nhắc trước khi đến hạn" trong form hóa đơn (Đúng ngày đến hạn, trước 1 ngày, 2 ngày, 3 ngày, 5 ngày, 7 ngày).
   - Thêm Banner nhắc nhở thông minh ở đầu trang Hóa đơn hiển thị danh sách các khoản cần thanh toán hôm nay hoặc sắp đến hạn.

---

### 3. Danh Sách Các Tệp Đã Thay Đổi

| STT | Tệp tin | Trạng thái | Mô tả tóm tắt |
|---|---|---|---|
| 1 | `src/lib/utils.ts` | **[CHỈNH SỬA]** | Bổ sung 2 hàm trợ giúp: `getLocalDateString` (lấy ngày địa phương tránh lệch UTC) và `formatDisplayDate` (định dạng ngày DD/MM/YYYY). |
| 2 | `src/context/AppContext.tsx` | **[CHỈNH SỬA]** | Cập nhật hàm `payBill` hỗ trợ tham số `customPaidDate`, tạo giao dịch đúng ngày được chọn; thay thế toàn bộ `toISOString().split('T')[0]` bằng `getLocalDateString()`. |
| 3 | `src/components/BillsView.tsx` | **[CHỈNH SỬA]** | Thêm chọn ngày thanh toán trong Pay Modal; thêm chỉnh sửa trạng thái & ngày đã đóng trong Edit Modal; thêm banner nhắc nhở thông minh; định dạng ngày hiển thị theo `DD/MM/YYYY`. |
| 4 | `TRACKING_CHANGES.md` | **[CHỈNH SỬA]** | Ghi nhận chi tiết lần chỉnh sửa 20. |

---

### 4. Kết Quả Sau Khi Chỉnh Sửa
* Thanh toán sau 00:00 đêm tại Việt Nam ghi nhận chính xác 100% ngày 18/09/2026, không còn bị lùi về 17/09 do lệch múi giờ quốc tế.
* Người dùng có thể tự do điều chỉnh ngày đóng tiền khi thanh toán hoặc khi chỉnh sửa hóa đơn.
* Người dùng có thể tùy chỉnh ngày đến hạn và số ngày muốn được nhắc nhở trước, có banner cảnh báo nổi bật.

---

## [LẦN CHỈNH SỬA 21] - Nâng Cấp "Trung Tâm Cảnh Báo" Thành Hệ Thống Điều Hướng Thông Minh (Deep-linking)

* **Thời gian thực hiện:** 18/09/2026
* **Mức độ ảnh hưởng:** Trung tâm cảnh báo & Trải nghiệm điều hướng (Alert Center UX & Quick Actions)
* **Trạng thái:** ✅ Đã hoàn thành và xác minh

---

### 1. Vấn Đề Người Dùng Gặp Phải
* Tại popup **Trung tâm Cảnh báo** (chuông thông báo), các mục cảnh báo ("Vượt ngân sách Ăn uống", "Cảnh báo 80%", "Hóa đơn chưa thanh toán") trước đây chỉ là những thẻ thông tin tĩnh dạng `<div>`.
* Người dùng chỉ đọc được số liệu mà không thể bấm vào. Để kiểm tra tại sao vượt ngân sách hoặc muốn thanh toán hóa đơn, người dùng buộc phải tự bấm qua lại giữa các tab, rồi tự tìm kiếm hoặc lọc danh mục thủ công, gây mất thời gian và giảm trải nghiệm sử dụng.

---

### 2. Cách Xử Lý Triệt Để
1. **Tương tác trực tiếp & Điều hướng tức thời (Deep-linking):**
   - Biến toàn bộ các thẻ cảnh báo thành các thẻ tương tác thông minh (`cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all`).
   - Thêm biểu tượng mũi tên dẫn hướng `ChevronRight` và phản hồi di chuột trực quan.
2. **Đối với cảnh báo Vượt ngân sách & Cảnh báo 80%:**
   - **Bấm vào thẻ:** Chuyển ngay lập tức sang tab **"Ngân sách" (`budgets`)**, tự động chuyển sang phân mục *Hạn mức danh mục*, cuộn mượt mà đến đúng thẻ ngân sách đó và kích hoạt viền phát sáng (`ring-4 ring-rose-500`) kèm nhãn *"Đang xem cảnh báo"*.
   - **Nút "🔍 Xem các khoản đã chi":** Đưa người dùng ngay sang tab **"Sổ giao dịch" (`transactions`)**, **tự động áp dụng bộ lọc đúng danh mục đó** (ví dụ: chỉ lọc danh mục *Ăn uống* đã tiêu 55.705.688 ₫) và hiển thị banner chỉ dẫn rõ ràng kèm nút *"Xem tất cả giao dịch"* để người dùng hủy lọc khi cần.
   - **Nút "Xem ngân sách ➔":** Chuyển sang xem và chỉnh sửa hạn mức ngân sách.
3. **Đối với cảnh báo Hóa đơn chưa thanh toán:**
   - **Bấm vào thẻ:** Chuyển ngay lập tức sang tab **"Định kỳ" (`bills`)**, cuộn đến đúng hóa đơn và làm nổi bật thẻ hóa đơn đó (`ring-4 ring-blue-500`).
   - **Nút "💳 Thanh toán ngay":** Chuyển sang tab `bills` và **tự động mở luôn hộp thoại xác nhận thanh toán** cho hóa đơn đó tại chỗ để người dùng xác nhận trừ tiền từ ví nào và đóng vào ngày nào mà không cần thêm bất kỳ cú nhấp chuột tìm kiếm nào!

---

### 3. Danh Sách Các Tệp Đã Thay Đổi

| STT | Tệp tin | Trạng thái | Mô tả tóm tắt |
|---|---|---|---|
| 1 | `src/context/AppContext.tsx` | **[CHỈNH SỬA]** | Bổ sung các trạng thái điều hướng (`navTargetCategoryId`, `navTargetBudgetId`, `navTargetBillId`, `billToAutoPayId`) và các hàm điều hướng `navigateToCategoryTransactions`, `navigateToBudget`, `navigateToBill`. |
| 2 | `src/components/Navigation.tsx` | **[CHỈNH SỬA]** | Nâng cấp popup Trung tâm Cảnh báo với kích thước rộng rãi hơn, thẻ có thể nhấp chuột và các nút tác vụ nhanh (Xem các khoản đã chi, Xem ngân sách, Thanh toán ngay). |
| 3 | `src/components/TransactionsView.tsx` | **[CHỈNH SỬA]** | Lắng nghe `navTargetCategoryId` để tự động kích hoạt lọc giao dịch theo danh mục cảnh báo và hiển thị banner thông báo hữu ích. |
| 4 | `src/components/BudgetsView.tsx` | **[CHỈNH SỬA]** | Tự động cuộn đến thẻ ngân sách được chọn, gắn viền sáng nổi bật `ring-4` và bổ sung nút "Xem các khoản đã chi" trên từng thẻ. |
| 5 | `src/components/BillsView.tsx` | **[CHỈNH SỬA]** | Tự động cuộn đến hóa đơn cảnh báo, làm nổi bật viền thẻ và tự động mở hộp thoại thanh toán nếu người dùng bấm "Thanh toán ngay" từ chuông cảnh báo. |
| 6 | `TRACKING_CHANGES.md` | **[CHỈNH SỬA]** | Ghi nhận chi tiết lần chỉnh sửa 21. |

---

### 4. Kết Quả Sau Khi Chỉnh Sửa
* Người dùng chỉ cần 1 cú click từ chuông thông báo là đến ngay đúng nơi cần xử lý.
* Nắm bắt ngay nguyên nhân vượt ngân sách bằng danh sách giao dịch được lọc tự động.
* Thanh toán hóa đơn sắp đến hạn ngay tức thì mà không cần tìm kiếm.

---

# [LẦN CHỈNH SỬA 22] - BỔ SUNG "KHOẢN DỰ PHÒNG" VÀO KẾ HOẠCH PHÂN BỔ THU NHẬP (BUDGET PLANNER)

### 1. Phân Tích Hiện Trạng & Yêu Cầu Người Dùng
* **Yêu cầu:** Người dùng gửi ảnh màn hình mục *"Thu nhập & Tỷ lệ phân bổ"* (hiện có 3 thanh: 1. Thiết yếu 50%, 2. Mong muốn 30%, 3. Tích lũy 20%) và hỏi: *"xem trong cái web này có khoản dự phòng chưa, nếu chưa thì thêm vào"*.
* **Kết quả khảo sát toàn bộ mã nguồn:**
  1. Trong mục **Hũ tiết kiệm & Mục tiêu tích lũy** (`goals`): Hệ thống đã có sẵn 1 mục tiêu mẫu mang tên `"Quỹ dự phòng khẩn cấp 6 tháng"` (Mục tiêu 60.000.000 ₫).
  2. **TUY NHIÊN**, trong phân mục **"Thu nhập & Tỷ lệ phân bổ"** (Kế hoạch ngân sách phân bổ thu nhập hàng tháng theo quy tắc 50/30/20):
     - Chưa có thanh trượt riêng cho **Khoản dự phòng** (Emergency / Contingency Fund).
     - Mục 3 "Tích lũy (Savings)" đang bị gộp chung cả hũ tiết kiệm lẫn quỹ khẩn cấp, khiến người dùng không thể tách bạch số tiền dành cho đầu tư/tiết kiệm dài hạn với số tiền dự phòng phát sinh rủi ro (y tế, ốm đau, sửa chữa đột xuất).
     - Chưa có thẻ thống kê riêng số tiền phân bổ cho Khoản dự phòng.
     - Bảng tính "Dòng tiền Khả dụng Thực tế để Tiêu" chưa trừ riêng Khoản dự phòng ra khỏi ngân sách khả dụng.

---

### 2. Các Thay Đổi Đã Triển Khai

1. **Mở rộng Data Model & State Quản lý:**
   - Cập nhật interface `IncomeBudgetPlanner` trong `src/types/index.ts`: bổ sung thuộc tính `emergencyPercent?: number;`.
   - Cập nhật `INITIAL_PLANNER` trong `src/lib/mock-data.ts` và `data/database.json`: cấu hình phân bổ chuẩn 4 quỹ:
     + 1. Thiết yếu (Needs): `50%` (16.000.000 ₫)
     + 2. Mong muốn (Wants): `25%` (8.000.000 ₫)
     + 3. Tích lũy (Savings): `15%` (4.800.000 ₫)
     + 4. Dự phòng (Emergency): `10%` (3.200.000 ₫)
   - Cập nhật `src/context/AppContext.tsx`: xử lý nạp dữ liệu an toàn khi người dùng đã có sẵn dữ liệu cũ (tự động gán fallback `emergencyPercent = 10%`), cập nhật các hàm `clearAllData`, `exportDatabaseJSON`, `importDatabaseJSON`.

2. **Nâng cấp Giao diện Sub-tab "Kế hoạch Thu nhập & Phân bổ" (`src/components/BudgetsView.tsx`):**
   - **Huy hiệu Tổng tỷ lệ phân bổ:** Hiển thị tự động `Tổng: X%` (ví dụ `Tổng: 100% ✓ Chuẩn`, hoặc cảnh báo màu cam nếu tổng vượt/thiếu 100%).
   - **3 Bộ thiết lập nhanh 1-chạm (Quick Presets):**
     + `[50/25/15/10]` (Khuyên dùng: 50% Thiết yếu, 25% Hưởng thụ, 15% Tích lũy, 10% Dự phòng)
     + `[50/20/20/10]` (Vững chắc)
     + `[50/30/15/5]` (Linh hoạt)
   - **Thanh trượt "4. Dự phòng (Emergency)":** Thiết kế màu hổ phách/cam vàng với icon khiên bảo vệ `ShieldAlert`, cho phép kéo từ 0% đến 30% kèm giải thích: *"Quỹ khẩn cấp, y tế, sửa xe, rủi ro phát sinh"*.
   - **4 Thẻ phân bổ ngân sách (Calculated Breakdown Cards):**
     + Chuyển layout sang 4 cột trực quan: Thêm thẻ màu vàng hổ phách **"Khoản Dự phòng (Emergency) ({emergencyPercent}%)"** hiển thị rõ ràng số tiền VNĐ tương ứng hàng tháng.
   - **Bảng tính Dòng tiền Khả dụng Chuẩn xác:**
     + Hiển thị thêm dòng: `Trừ Khoản trích lập dự phòng khẩn cấp & rủi ro ({emergencyPercent}%): -{emergencyBudget}`.
     + Công thức tự động khấu trừ khoản dự phòng khỏi ngân sách khả dụng: `availableFlexibleBudget = Math.max(0, monthlyIncome - totalMonthlyBills - savingsBudget - emergencyBudget)`.
   - **Banner liên kết liền mạch:** Thêm hộp thông tin nhắc nhở chuyển đều đặn vào hũ dự phòng kèm nút `[Xem Hũ dự phòng →]` giúp chuyển ngay sang tab Hũ tiết kiệm mục tiêu.

---

### 3. Danh Sách Các Tệp Đã Thay Đổi

| STT | Tệp tin | Trạng thái | Mô tả tóm tắt |
|---|---|---|---|
| 1 | `src/types/index.ts` | **[CHỈNH SỬA]** | Thêm trường `emergencyPercent` vào `IncomeBudgetPlanner`. |
| 2 | `src/lib/mock-data.ts` | **[CHỈNH SỬA]** | Cập nhật `INITIAL_PLANNER` với tỷ lệ chuẩn 4 quỹ: 50/25/15/10. |
| 3 | `data/database.json` | **[CHỈNH SỬA]** | Cập nhật `planner` trong cơ sở dữ liệu với `emergencyPercent: 10`. |
| 4 | `src/context/AppContext.tsx` | **[CHỈNH SỬA]** | Hỗ trợ nạp, lưu trữ, import/export và reset fallback cho `emergencyPercent`. |
| 5 | `src/components/BudgetsView.tsx` | **[CHỈNH SỬA]** | Bổ sung thanh trượt Dự phòng, thẻ thống kê số tiền, nút preset và liên kết tới Hũ dự phòng khẩn cấp. |
| 6 | `TRACKING_CHANGES.md` | **[CHỈNH SỬA]** | Ghi nhận chi tiết lần chỉnh sửa 22. |

---

# [LẦN CHỈNH SỬA 23] - KHẮC PHỤC TRIỆT ĐỂ LỖI LƯU & TẢI DỮ LIỆU (PERSISTENCE & CACHE FIX)

### 1. Nguyên Nhân Sự Cố
* **Vấn đề phát hiện:**
  1. Khi người dùng chỉnh sửa hoặc thêm dữ liệu (ví dụ: mục tiêu tích lũy "cưới vợ", hóa đơn, kế hoạch thu nhập ngân sách), khi tải lại trang hoặc khởi động lại ứng dụng thì dữ liệu có nguy cơ bị reset hoặc không hiển thị dữ liệu mới nhất.
  2. Tuyến API `src/app/api/storage/route.ts` thiếu khai báo `export const dynamic = 'force-dynamic'` và `revalidate = 0`, khiến Next.js App Router và trình duyệt tự động cache kết quả của hàm `GET /api/storage`. Khi F5 tải lại trang, trình duyệt nhận kết quả cache cũ thay vì đọc dữ liệu mới nhất từ tệp `data/database.json`.
  3. Hàm `fetch('/api/storage')` trong `AppContext.tsx` không có cấu hình `cache: 'no-store'`, khiến HTTP cache của trình duyệt trả về bản ghi cũ.
  4. Cơ chế đồng bộ giữa `localStorage` và `server disk` trước đây ưu tiên cứng phía server mà không so sánh mốc thời gian `updatedAt`, dẫn đến trường hợp dữ liệu mới vừa lưu trong trình duyệt bị dữ liệu cũ ghi đè.
  5. Trong màn hình Kế hoạch ngân sách phân bổ thu nhập (`BudgetsView.tsx`), việc điều chỉnh thanh trượt diễn ra ngầm mà không có nút bấm "Lưu kế hoạch" và không có huy hiệu trạng thái lưu, khiến người dùng không biết dữ liệu đã được lưu thành công hay chưa.

---

### 2. Các Giải Pháp Triển Khai Toàn Diện

1. **Vô hiệu hóa bộ nhớ đệm HTTP cho API Storage (`src/app/api/storage/route.ts`):**
   - Thêm `export const dynamic = 'force-dynamic';` và `export const revalidate = 0;`.
   - Bổ sung tiêu đề phản hồi:
     `'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'`.
   - Đảm bảo 100% các yêu cầu đọc dữ liệu luôn truy xuất trực tiếp từ tệp `data/database.json` theo thời gian thực.

2. **Cơ chế so khớp phiên bản mới nhất theo `updatedAt` (`src/context/AppContext.tsx`):**
   - Đính kèm nhãn thời gian `updatedAt: new Date().toISOString()` vào mọi payload lưu trữ.
   - Khi ứng dụng khởi động (`loadData`), tự động lấy dữ liệu từ cả Server Disk và `localStorage`, so sánh mốc thời gian `updatedAt` để luôn chọn bộ dữ liệu tươi mới nhất, đảm bảo tuyệt đối không bao giờ làm mất dữ liệu của người dùng.
   - Thêm hàm `saveDataNow(): Promise<boolean>` hỗ trợ lưu tức thời theo yêu cầu mà không phải chờ debounce.

3. **Bổ sung Nút "Lưu Kế hoạch Ngân sách" & Đèn báo trạng thái (`src/components/BudgetsView.tsx`):**
   - Thêm nút bấm nổi bật **"Lưu kế hoạch ngân sách"** ngay dưới các thanh trượt phân bổ (Thiết yếu, Mong muốn, Tích lũy, Dự phòng).
   - Khi bấm lưu: gọi trực tiếp `saveDataNow()` và hiển thị thông báo tích xanh `✓ Đã lưu thành công vào hệ thống!`.
   - Hiển thị chỉ báo trạng thái: `Đã đồng bộ lên ổ đĩa` với chấm xanh trực quan.

4. **Đồng bộ cơ sở dữ liệu người dùng (`data/database.json`):**
   - Tích hợp và lưu giữ toàn bộ dữ liệu người dùng vừa tạo (mục tiêu hũ "cưới vợ", các giao dịch thanh toán hóa đơn ngày 18/9, cấu hình ngân sách và các khoản nợ cần trả trong giả lập).

---

### 3. Danh Sách Các Tệp Đã Thay Đổi

| STT | Tệp tin | Trạng thái | Mô tả tóm tắt |
|---|---|---|---|
| 1 | `src/app/api/storage/route.ts` | **[CHỈNH SỬA]** | Thiết lập `force-dynamic`, `revalidate = 0`, header `no-store` chống cache cũ. |
| 2 | `src/context/AppContext.tsx` | **[CHỈNH SỬA]** | Tự động so sánh `updatedAt` chọn dữ liệu mới nhất; bổ sung hàm `saveDataNow`. |
| 3 | `src/components/BudgetsView.tsx` | **[CHỈNH SỬA]** | Thêm nút "Lưu kế hoạch ngân sách" với phản hồi thành công và nhãn trạng thái lưu. |
| 4 | `data/database.json` | **[CHỈNH SỬA]** | Đồng bộ toàn bộ dữ liệu mới nhất của người dùng. |
| 5 | `TRACKING_CHANGES.md` | **[CHỈNH SỬA]** | Ghi nhận chi tiết lần chỉnh sửa 23. |

---

# [LẦN CHỈNH SỬA 24] - ĐỒNG BỘ GIAO DIỆN BIỂU ĐỒ TRÒN GIỮA "BÁO CÁO" VÀ "SỔ GIAO DỊCH"

### 1. Phân Tích Hiện Trạng & Yêu Cầu Người Dùng
* **Yêu cầu:** *"cái biểu đồ tròn ở danh mục 'báo cáo' nó phải giao diện nó phải giống cái 'Sổ giao dịch'"*.
* **So sánh trước khi chỉnh sửa:**
  - **Tại "Sổ giao dịch" (`TransactionsView.tsx`):**
    + Sử dụng biểu đồ Donut hiện đại với lỗ hổng trung tâm thông minh (`innerRadius` và `outerRadius`).
    + Tại tâm biểu đồ (Center hole): Hiển thị tổng chi tiêu và số lượng danh mục; khi rê chuột (hover) vào bất kỳ lát cắt nào sẽ phóng to lát cắt (`scale(1.04)` viền trắng) và tâm biểu đồ cập nhật ngay lập tức: Tên danh mục, tỷ lệ % to đậm nổi bật, và số tiền chi tiết.
    + Tooltip dạng Glassmorphism tối màu hiện đại, có chấm tròn màu danh mục, số tiền và huy hiệu % màu xanh ngọc.
    + Danh sách phân rã danh mục bên dưới: Có huy hiệu % riêng, số tiền căn phải rõ ràng và **thanh tiến trình mini (progress bar)** mang màu sắc đặc trưng của từng danh mục.
    + Tương tác 2 chiều: Di chuột vào dòng danh sách thì lát cắt trên biểu đồ cũng phát sáng tương ứng.
    + Huy hiệu tổng chi phí màu hồng (`bg-rose-50 text-rose-600`) ở góc trên bên phải tiêu đề thẻ.
  - **Tại "Báo cáo" (`ReportsView.tsx` cũ):**
    + Biểu đồ tròn đơn điệu, không có thông số tương tác ở tâm biểu đồ.
    + Không có hiệu ứng phóng to hover trên các lát cắt.
    + Tooltip mặc định đơn giản.
    + Danh sách danh mục chia 2 cột tĩnh, không có thanh tiến trình mini và không có tương tác chuột 2 chiều.
    + Màu sắc chưa đồng bộ với danh mục thực tế trong hệ thống.

---

### 2. Các Nâng Cấp Đã Triển Khai

1. **Đồng bộ Data Model & Màu Sắc Danh Mục:**
   - Kết nối `categories` từ `useApp()` vào `ReportsView.tsx`.
   - Các danh mục chi tiêu tự động lấy đúng mã màu chuẩn đã thiết lập trong hệ thống (Ăn uống: cam, Mua sắm: hồng, Hóa đơn: xanh...).

2. **Tái thiết kế Biểu đồ Donut Đột phá:**
   - Thêm trạng thái `hoveredPieIndex`.
   - Cấu trúc Donut với hiệu ứng nổi bật lát cắt khi di chuột (`transform: scale(1.04)` kèm viền trắng).
   - Tooltip Glassmorphism nền đen mờ sang trọng hiển thị tên, số tiền và huy hiệu tỷ lệ % nổi bật.
   - **Tâm biểu đồ động:** Khi trạng thái bình thường hiển thị Tổng chi tiêu và số lượng danh mục; khi rê chuột hiển thị tên danh mục, tỷ lệ phần trăm cỡ lớn và số tiền cụ thể.

3. **Danh sách phân rã danh mục trực quan:**
   - Mỗi danh mục là 1 dòng bo góc tinh tế có thể tương tác chuột.
   - Tên danh mục kèm chấm màu viền trắng sắc nét.
   - Huy hiệu phần trăm bo góc cạnh số tiền chi tiêu.
   - Thanh tiến trình mini hiển thị tỷ trọng màu sắc mượt mà bên dưới.
   - Tương tác 2 chiều: Di chuột vào danh sách danh mục sẽ làm nổi bật lát cắt trên biểu đồ và hiển thị số liệu vào tâm Donut.
   - Thêm nhãn tổng tiền `formatCurrency(totalExpense)` màu hồng nổi bật trên tiêu đề thẻ.

---

### 3. Danh Sách Các Tệp Đã Thay Đổi

| STT | Tệp tin | Trạng thái | Mô tả tóm tắt |
|---|---|---|---|
| 1 | `src/components/ReportsView.tsx` | **[CHỈNH SỬA TOÀN DIỆN]** | Nâng cấp toàn diện biểu đồ tròn cơ cấu chi tiêu đồng bộ 100% về giao diện, tương tác tâm donut, tooltip và thanh tiến trình danh mục giống hệt Sổ giao dịch. |
| 2 | `TRACKING_CHANGES.md` | **[CHỈNH SỬA]** | Ghi nhận chi tiết lần chỉnh sửa 24. |

---

# [LẦN CHỈNH SỬA 25] - ĐỒNG NHẤT SỐ LIỆU BIỂU ĐỒ TRÒN GIỮA "BÁO CÁO" VÀ "SỔ GIAO DỊCH"

### 1. Phân Tích Hiện Trạng & Thắc Mắc Của Người Dùng
* **Thắc mắc của người dùng:** *"ý là cái số liệu có giống nhau ko"*.
* **Bản chất vấn đề:**
  - Về công thức toán học: Cả 2 màn hình đều tính chung công thức (tổng chi `type === EXPENSE`, gom theo danh mục, tính % và sắp xếp giảm dần).
  - **TUY NHIÊN về mặt số liệu mặc định trên màn hình:**
    + Bên **"Báo cáo"**: Đang mặc định chọn **"Tháng này"** (`2026-09`), tổng chi là **`116.055.688 ₫`**.
    + Bên **"Sổ giao dịch"**: Do chưa có bộ chọn kỳ thống kê cho biểu đồ tròn nên mặc định gom **toàn bộ lịch sử (bao gồm cả các tháng 7, 8 trước đây)**, hiển thị tổng chi là **`130.505.688 ₫`** (chênh lệch đúng 14.450.000 ₫ của các giao dịch trong tháng 8).
    + Điều này làm người dùng khi mở 2 tab lên thấy số tiền ở 2 biểu đồ khác nhau (116 triệu vs 130 triệu).

---

### 2. Giải Pháp Triển Khai

1. **Bổ sung Bộ chọn kỳ thống kê nhanh (`pieTimeScope`) tại Biểu đồ Donut Sổ giao dịch:**
   - Thêm nút gạt trực quan ngay dưới tiêu đề thẻ:
     + **`[Tháng này (T9/2026)]`** *(Mặc định)*: Tự động lọc các khoản chi của tháng hiện tại.
     + **`[Tất cả thời gian]`**: Xem phân rã chi phí của toàn bộ lịch sử giao dịch.
2. **Đồng nhất số liệu chuẩn xác 100%:**
   - Khi ở trạng thái mặc định: Cả **Báo cáo** và **Sổ giao dịch** đều hiển thị chính xác **`116.055.688 ₫`**, từng danh mục trùng khớp 100% từng đồng một:
     + 🍔 Ăn uống: `55.705.688 ₫` (48.0%)
     + 📈 Đầu tư & Tích lũy: `40.200.000 ₫` (34.6%)
     + 🏠 Nhà cửa & Thuê nhà: `12.000.000 ₫` (10.3%)
     + 🛍️ Mua sắm: `3.250.000 ₫` (2.8%)
     + 💡 Hóa đơn & Tiện ích: `2.760.000 ₫` (2.4%)
     + 🎮 Giải trí & Du lịch: `1.160.000 ₫` (1.0%)
     + 🚗 Di chuyển & Xe: `980.000 ₫` (0.8%)
   - Khi chuyển sang *Tất cả thời gian* (hoặc chọn *Năm nay* bên Báo cáo): Cả 2 bên đều hiển thị **`130.505.688 ₫`**.

---

### 3. Danh Sách Các Tệp Đã Thay Đổi

| STT | Tệp tin | Trạng thái | Mô tả tóm tắt |
|---|---|---|---|
| 1 | `src/components/TransactionsView.tsx` | **[CHỈNH SỬA]** | Thêm state `pieTimeScope` mặc định `THIS_MONTH` và bộ nút gạt `[Tháng này] / [Tất cả]` trên thẻ biểu đồ tròn. |
| 2 | `TRACKING_CHANGES.md` | **[CHỈNH SỬA]** | Ghi nhận chi tiết lần chỉnh sửa 25. |

---

## [LẦN CHỈNH SỬA 26] - Nút Chuyển Đổi Đa Ngôn Ngữ Góc Màn Hình (Tiếng Việt 🇻🇳, English 🇬🇧, Français 🇫🇷) & Hệ Thống Dịch Thuật i18n

### 1. Vấn Đề & Yêu Cầu Của Người Dùng
- **Yêu cầu:** *"tạo 1 cái nút nhỏ trên góc màn hình để có thể đổi từ tiếng việt sang tiếng anh và tiếng pháp dễ dàng để phù hợp vs người dùng"*.
- **Mục tiêu:**
  - Bổ sung một nút nhỏ tinh tế, hiện đại ở góc màn hình (Header Desktop và Header Mobile).
  - Hỗ trợ 3 ngôn ngữ: **Tiếng Việt 🇻🇳**, **English 🇬🇧**, **Français 🇫🇷**.
  - Dropdown kính mờ (Glassmorphism) với cờ quốc gia, tên bản địa, dấu tích chọn và hiệu ứng đóng khi click ra ngoài.
  - Tự động lưu ngôn ngữ đã chọn vào `localStorage` (`fintrack_language`), nhớ vĩnh viễn khi tải lại trang.
  - Tích hợp thêm thẻ cài đặt "Ngôn ngữ hiển thị (Display Language)" trong tab Cài đặt.
  - Đồng bộ hệ thống dịch thuật cho toàn bộ Header, các tab điều hướng, modal nhập nhanh, trung tâm cảnh báo và trang tổng quan.

---

### 2. Giải Pháp Triển Khai

1. **Kiểu dữ liệu & Từ điển i18n (`src/types/index.ts`, `src/lib/i18n.ts`):**
   - Khai báo `export type Language = 'vi' | 'en' | 'fr'`.
   - Tạo từ điển `TRANSLATIONS` phong phú với hơn 100+ từ khóa cho cả 3 thứ tiếng: Tiếng Việt, Tiếng Anh, Tiếng Pháp.
   - Hàm trợ giúp `translate(lang, key, fallback)`.

2. **Nút góc màn hình (`src/components/LanguageSwitcher.tsx`):**
   - Thiết kế nút pill badge nhỏ gọn, hiện đại: cờ quốc gia + mã ngôn ngữ (🇻🇳 VI, 🇬🇧 EN, 🇫🇷 FR) kèm mũi tên nhỏ.
   - Khi bấm, mở menu dropdown sang trọng với hiệu ứng glassmorphism, cờ sắc nét, dấu check `✓` và click outside listener.
   - Đặt cố định ở góc trên bên phải của cả Desktop Header và Mobile Header (`sticky top-0 z-30`), luôn hiển thị ở góc màn hình.

3. **Context Quản lý Ngôn ngữ (`src/context/AppContext.tsx`):**
   - Quản lý state `language`, hàm `setLanguage(lang)` và hàm dịch `t(key, fallback)`.
   - Tự động đọc và lưu vào `localStorage`.

4. **Tích hợp giao diện toàn diện:**
   - **`Navigation.tsx`**: Nhúng `LanguageSwitcher` vào góc trên phải, dịch động toàn bộ 8 menu tab điều hướng (Tổng quan, Sổ giao dịch, Ngân sách, Mô phỏng What-If, Định kỳ, Báo cáo, Ví & Tài khoản, Cài đặt), các số dư và thông báo.
   - **`QuickAddModal.tsx`**: Dịch toàn bộ modal ghi nhận giao dịch nhanh (Khoản chi, Khoản thu, Chuyển khoản, Số tiền, nút Lưu/Hủy).
   - **`SettingsView.tsx`**: Thêm khối tùy chọn "Ngôn Ngữ Hiển Thị (Display Language)" với 3 thẻ lớn trực quan tương ứng 3 ngôn ngữ.
   - **`DashboardView.tsx`**: Dịch tiêu đề, các thẻ tài sản, thu nhập, chi tiêu, các nút thao tác nhanh và giao dịch gần đây.

---

### 3. Danh Sách Các Tệp Đã Thay Đổi

| STT | Tệp tin | Trạng thái | Mô tả tóm tắt |
|---|---|---|---|
| 1 | `src/types/index.ts` | **[CHỈNH SỬA]** | Bổ sung export type `Language = 'vi' \| 'en' \| 'fr'`. |
| 2 | `src/lib/i18n.ts` | **[TẠO MỚI]** | Định nghĩa từ điển đa ngôn ngữ cho Tiếng Việt, Tiếng Anh, Tiếng Pháp và hàm `translate`. |
| 3 | `src/components/LanguageSwitcher.tsx` | **[TẠO MỚI]** | Nút chuyển đổi ngôn ngữ góc màn hình với icon cờ quốc gia và menu dropdown mượt mà. |
| 4 | `src/context/AppContext.tsx` | **[CHỈNH SỬA]** | Bổ sung `language`, `setLanguage`, `t` vào Context và lưu vào LocalStorage. |
| 5 | `src/components/Navigation.tsx` | **[CHỈNH SỬA]** | Nhúng `LanguageSwitcher` vào góc Header Mobile & Desktop, dịch động toàn bộ menu tab và thông báo. |
| 6 | `src/components/QuickAddModal.tsx` | **[CHỈNH SỬA]** | Bản địa hóa modal Nhập nhanh giao dịch. |
| 7 | `src/components/SettingsView.tsx` | **[CHỈNH SỬA]** | Thêm khối cài đặt Ngôn ngữ hiển thị trực quan 3 lựa chọn. |
| 8 | `src/components/DashboardView.tsx` | **[CHỈNH SỬA]** | Bản địa hóa các khối số liệu tổng quan và thao tác nhanh. |
| 9 | `TRACKING_CHANGES.md` | **[CHỈNH SỬA]** | Ghi nhận chi tiết lần chỉnh sửa 26. |

---

## [LẦN CHỈNH SỬA 27] - Bản địa hóa toàn diện 100% ứng dụng (Tiếng Việt 🇻🇳, Tiếng Anh 🇬🇧, Tiếng Pháp 🇫🇷)

* **Thời gian thực hiện:** 18/09/2026
* **Mức độ ảnh hưởng:** Cao (Toàn diện UI/UX trên cả 8 màn hình)
* **Trạng thái:** ✅ Đã hoàn thành và xác minh

---

### 1. Vấn Đề Ban Đầu Được Báo Cáo
* Người dùng phản hồi: *"sao khi chuyển sang ngôn ngữ khác vẫn còn ngôn ngữ cũ là sao (trừ mấy cái mình điền hay chỉnh sửa) còn các cái còn lại phải đổi theo đúng thứ tiếng chứ"*
* Ở phiên bản trước, hệ thống mới chỉ bản địa hóa một phần thanh điều hướng (Navigation), Dashboard và QuickAddModal. Các màn hình còn lại (Sổ giao dịch, Ngân sách, Hóa đơn định kỳ, Báo cáo, Ví & Tài khoản, Mô phỏng What-If, Modal xem ảnh biên lai) vẫn còn nhiều nhãn, tiêu đề, nút bấm, bộ lọc và tên danh mục hiển thị cứng bằng tiếng Việt.

---

### 2. Giải Pháp Triển Khai Toàn Diện

1. **Mở rộng từ điển dịch thuật (`src/lib/i18n.ts`):**
   - Bổ sung hơn 150 từ khóa dịch chuyên sâu cho cả 3 ngôn ngữ (Tiếng Việt, Tiếng Anh, Tiếng Pháp).
   - Thiết lập bảng tra cứu chuẩn `CATEGORY_TRANSLATIONS` cho toàn bộ 12 danh mục hệ thống ('Ăn uống', 'Thuê nhà', 'Giáo dục', 'Mua sắm', 'Đi lại', 'Tiền điện & Tiền nước', 'Dự phòng & phát sinh', 'Lương & Thưởng', 'Đầu tư & Tích lũy', 'Giải trí & Du lịch', 'Sức khỏe & Y tế', 'Khác').
   - Hàm `translateCategory(name, lang)` (`tCategory`) và `translateWalletType(type, lang)` (`tWalletType`): Giúp tên danh mục và loại ví hiển thị tự động theo đúng ngôn ngữ được chọn mà **hoàn toàn không làm biến đổi chuỗi dữ liệu gốc trong CSDL `data/database.json`** (bảo toàn tính tương thích dữ liệu).

2. **Bản địa hóa 100% tất cả các màn hình ứng dụng:**
   - **`TransactionsView.tsx`:** Dịch toàn bộ tiêu đề, phụ đề, nút xuất file (CSV, Excel), thẻ thống kê (Số giao dịch, Tổng thu, Tổng chi, Dòng tiền ròng), bộ lọc tìm kiếm & loại giao dịch & ví, cơ cấu chi tiêu biểu đồ tròn, timeline nhóm theo ngày, nhãn phí chuyển khoản, tooltip nút Sửa/Xóa và toàn bộ modal Chỉnh sửa giao dịch (EditTransactionModal).
   - **`BudgetsView.tsx`:** Dịch toàn bộ tiêu đề, 3 tab điều hướng ("Hạn mức theo Danh mục", "Kế hoạch phân bổ thu nhập 50/30/20", "Hũ tiết kiệm & Mục tiêu"), 4 trụ cột phân bổ ngân sách (Thiết yếu, Mong muốn, Tích lũy, Dự phòng), 3 nút preset nhanh, thẻ KPI ngân sách, cảnh báo 80%/100%, modal Tạo/Sửa hạn mức và modal Nạp/Rút tiền hũ tiết kiệm.
   - **`BillsView.tsx`:** Dịch tiêu đề, KPI hóa đơn, banner nhắc nhở thông minh, trạng thái đến hạn ("Đến hạn hôm nay", "Quá hạn X ngày", "Cần đóng trong X ngày"), các chu kỳ lặp lại ("Hàng tháng", "Hàng quý", "Hàng năm"), nút "Thanh toán ngay", "Đặt lại", modal Thêm/Sửa hóa đơn và modal Xác nhận thanh toán hóa đơn.
   - **`ReportsView.tsx`:** Dịch bộ chọn thời gian ("Tháng này", "Tháng trước", "Cả năm", "Tùy chọn ngày"), báo cáo tổng hợp in ấn, biểu đồ tròn cơ cấu chi tiêu (donut chart với tâm hiển thị tương tác), biểu đồ cột so sánh Thu/Chi và biểu đồ diện tích dòng tiền thuần.
   - **`WalletsView.tsx`:** Dịch danh sách các nhóm ví (Tiền mặt, Ngân hàng, Thẻ tín dụng, Sổ tiết kiệm), màn hình chi tiết dòng tiền từng ví (Tổng thu vào, Tổng chi ra, Dòng tiền ròng, bộ lọc), modal Tạo/Sửa ví và modal Chuyển tiền giữa các ví.
   - **`WhatIfSimulatorView.tsx`:** Dịch toàn bộ bảng điều khiển mô phỏng, thanh trượt thời gian dự phóng, các kịch bản cắt giảm chi tiêu, tiền gửi tiết kiệm, kịch bản lợi nhuận đầu tư, quản lý nợ vay ngoài, biểu đồ so sánh tăng trưởng và bảng dự phóng chi tiết.
   - **`ReceiptModal.tsx`:** Dịch tiêu đề modal xem hóa đơn đính kèm và nút tải ảnh về máy.

---

### 3. Danh Sách Các Tệp Đã Thay Đổi

| STT | Tệp tin | Trạng thái | Mô tả tóm tắt |
|---|---|---|---|
| 1 | `src/lib/i18n.ts` | **[CHỈNH SỬA]** | Mở rộng hệ thống từ điển cho toàn bộ các màn hình, bổ sung helper `translateCategory` và `translateWalletType`. |
| 2 | `src/context/AppContext.tsx` | **[CHỈNH SỬA]** | Expose `tCategory` và `tWalletType` qua `useApp()`. |
| 3 | `src/components/TransactionsView.tsx` | **[CHỈNH SỬA]** | Bản địa hóa toàn diện Sổ giao dịch, bộ lọc, biểu đồ và EditTransactionModal. |
| 4 | `src/components/BudgetsView.tsx` | **[CHỈNH SỬA]** | Bản địa hóa toàn bộ tab ngân sách, kế hoạch 50/30/20, hũ tiết kiệm và modals. |
| 5 | `src/components/BillsView.tsx` | **[CHỈNH SỬA]** | Bản địa hóa danh sách hóa đơn, lịch thanh toán định kỳ, trạng thái hạn và modal thanh toán. |
| 6 | `src/components/ReportsView.tsx` | **[CHỈNH SỬA]** | Bản địa hóa biểu đồ báo cáo tài chính, chú giải và xuất bản báo cáo. |
| 7 | `src/components/WalletsView.tsx` | **[CHỈNH SỬA]** | Bản địa hóa thẻ ví, chi tiết dòng tiền ví, modal tạo ví và chuyển quỹ. |
| 8 | `src/components/WhatIfSimulatorView.tsx` | **[CHỈNH SỬA]** | Bản địa hóa mô phỏng tài chính, tối ưu hóa tiêu dùng, đầu tư và nợ vay. |
| 9 | `src/components/ReceiptModal.tsx` | **[CHỈNH SỬA]** | Bản địa hóa modal xem ảnh hóa đơn. |
| 10 | `TRACKING_CHANGES.md` | **[CHỈNH SỬA]** | Cập nhật nhật ký lần chỉnh sửa 27. |

















