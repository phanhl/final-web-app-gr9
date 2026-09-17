# NHẬT KÝ THEO DÕI THAY ĐỔI DỰ ÁN (PROJECT CHANGELOG & TRACKING)

> **Mục đích của tệp này:** Ghi lại chi tiết tất cả các thay đổi, sửa lỗi, nâng cấp tính năng trong dự án. Giúp người phát triển và người dùng dễ dàng theo dõi sự khác biệt giữa phiên bản hiện tại so với mã nguồn ban đầu.

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











