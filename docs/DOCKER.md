# Docker & MySQL cho FinTrack Pro

FinTrack Pro lưu dữ liệu trong **MySQL 8.4**. Cách đơn giản nhất là chạy MySQL bằng Docker với tệp `docker-compose.yml` ở thư mục gốc của dự án: không phải cài đặt hay cấu hình MySQL bằng tay. Nếu không muốn dùng Docker, xem mục [6](#6-không-dùng-docker-cài-thẳng-mysql).

Mọi lệnh bên dưới chạy **ở thư mục gốc của dự án**. Dùng Podman thay cho Docker cũng được: thay `docker compose` bằng `podman compose`, `docker` bằng `podman`.

---

## 1. Cài Docker (làm một lần)

* **Windows / macOS:** cài [Docker Desktop](https://www.docker.com/products/docker-desktop/) và mở ứng dụng này lên trước khi chạy các lệnh (trên Windows, chạy dự án trong WSL2).
* **Linux:** cài Docker Engine kèm Compose plugin theo [hướng dẫn chính thức](https://docs.docker.com/engine/install/), rồi cho phép người dùng hiện tại dùng Docker không cần `sudo` (đăng xuất rồi đăng nhập lại sau lệnh này):
  ```bash
  sudo usermod -aG docker $USER
  ```

Kiểm tra đã cài xong:
```bash
docker --version
docker compose version
```

---

## 2. Khởi động MySQL lần đầu

1. Tạo tệp `.env` từ mẫu và đặt hai mật khẩu ngẫu nhiên:
   ```bash
   cp .env.example .env
   openssl rand -hex 16    # chạy hai lần, lấy hai chuỗi khác nhau
   ```
   Trong `.env`, điền `MYSQL_ROOT_PASSWORD` và `MYSQL_PASSWORD`, rồi dùng **cùng mật khẩu `MYSQL_PASSWORD`** cho `DATABASE_URL`:
   ```bash
   MYSQL_ROOT_PASSWORD=<chuỗi thứ nhất>
   MYSQL_PASSWORD=<chuỗi thứ hai>
   DATABASE_URL=mysql://fintrack:<chuỗi thứ hai>@127.0.0.1:3306/fintrack
   ```
2. Khởi động MySQL, rồi kiểm tra kết nối (lệnh thứ hai cũng tạo các bảng):
   ```bash
   docker compose up -d db
   npm run db:check
   ```
   Lần đầu Docker tải về image `mysql:8.4` (khoảng vài trăm MB) và MySQL mất khoảng 10–30 giây để khởi tạo. Nếu `db:check` báo không kết nối được, đợi thêm một chút rồi chạy lại.

Sau đó chạy ứng dụng như README hướng dẫn (`./start.sh`). Từ lần sau chỉ cần MySQL đang chạy: container được đặt `restart: unless-stopped` nên tự khởi động cùng Docker.

`docker-compose.yml` làm những việc sau:
* tạo database `fintrack` và tài khoản MySQL riêng `fintrack` cho ứng dụng (không dùng `root`);
* chỉ mở cổng trên `127.0.0.1:3306`: máy khác trong mạng không kết nối thẳng vào database được;
* lưu dữ liệu trong volume `fintrack-mysql-data` (Docker đặt tên đầy đủ là `<tên-thư-mục>_fintrack-mysql-data`), nên tắt hay xóa container thì dữ liệu vẫn còn.

---

## 3. Các lệnh hay dùng

| Việc cần làm | Lệnh |
|---|---|
| Xem MySQL có đang chạy không | `docker compose ps` |
| Xem nhật ký của MySQL | `docker compose logs db` |
| Tắt MySQL (dữ liệu vẫn giữ) | `docker compose stop db` |
| Bật lại MySQL | `docker compose start db` |
| Xóa container (dữ liệu vẫn giữ trong volume) | `docker compose down` |
| Kiểm tra kết nối và số lượng dữ liệu | `npm run db:check` |

`./stop.sh` chỉ dừng ứng dụng và tunnel, **không** tắt MySQL.

**Xem dữ liệu bằng câu lệnh SQL:**
```bash
docker exec -it fintrack-mysql mysql --default-character-set=utf8mb4 -u fintrack -p fintrack
```
Nhập `MYSQL_PASSWORD`, rồi gõ ví dụ `SHOW TABLES;`, `SELECT username, role FROM users;`, `SELECT date, type, amount, note FROM transactions LIMIT 10;`. Gõ `exit` để thoát. Thiếu `--default-character-set=utf8mb4` thì tiếng Việt có thể hiện thành dấu `?`; dữ liệu bên trong vẫn đúng.

---

## 4. Sao lưu và khôi phục

**Sao lưu** toàn bộ database (không cần cài `mysqldump`):
```bash
npm run db:backup
```
Tệp được ghi vào `backups/fintrack-<thời gian>.sql.gz`. Thư mục `backups/` nằm trong `.gitignore` vì chứa dữ liệu tài chính của mọi người. Nên chạy lệnh này định kỳ (ví dụ bằng cron mỗi ngày) và sao chép tệp ra nơi khác.

**Khôi phục** từ một tệp sao lưu (ghi đè dữ liệu hiện có trong database `fintrack`):
```bash
gunzip -c backups/<tệp>.sql.gz | docker exec -i fintrack-mysql mysql -u fintrack -p<MYSQL_PASSWORD> fintrack
```

Khi chuyển sang máy khác, mang theo **cả** tệp sao lưu database **và** thư mục `data/` (trong đó có `.backup_key`; thiếu khóa này thì không giải mã được các bản sao lưu mã hóa trong ứng dụng).

---

## 5. Sự cố thường gặp

**Cổng 3306 đã bị chiếm** (máy đã có MySQL khác đang chạy): trong `docker-compose.yml` đổi `"127.0.0.1:3306:3306"` thành `"127.0.0.1:3307:3306"`, và trong `.env` đổi `DATABASE_URL` sang cổng `3307`.

**Báo trùng tên container `fintrack-mysql`:** trên máy đã có một container cùng tên. Xem bằng `docker ps -a`; nếu đó là container cũ không cần nữa thì xóa bằng `docker rm -f fintrack-mysql` (dữ liệu nằm trong volume, không mất).

**Đổi `MYSQL_PASSWORD` trong `.env` nhưng ứng dụng báo sai mật khẩu:** MySQL chỉ đọc mật khẩu trong `.env` ở **lần khởi tạo đầu tiên** (khi volume còn trống). Muốn đổi mật khẩu về sau, đổi trực tiếp trong MySQL rồi cập nhật `.env` cho khớp:
```bash
docker exec -it fintrack-mysql mysql -u root -p -e "ALTER USER 'fintrack'@'%' IDENTIFIED BY '<mật khẩu mới>';"
```

**Muốn xóa sạch và làm lại từ đầu** (MẤT TOÀN BỘ dữ liệu, hãy chạy `npm run db:backup` trước):
```bash
docker compose down -v
```

---

## 6. Không dùng Docker: cài thẳng MySQL

Cài MySQL 8 (từ [trang chủ MySQL](https://dev.mysql.com/downloads/mysql/) hoặc trình quản lý gói của hệ điều hành), đăng nhập bằng tài khoản `root` và tạo database cùng tài khoản riêng cho ứng dụng:
```sql
CREATE DATABASE fintrack CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'fintrack'@'127.0.0.1' IDENTIFIED BY '<mật khẩu>';
GRANT ALL PRIVILEGES ON fintrack.* TO 'fintrack'@'127.0.0.1';
```
Sau đó điền vào `.env` (bỏ trống `MYSQL_ROOT_PASSWORD` / `MYSQL_PASSWORD`, chúng chỉ dùng cho Docker):
```bash
DATABASE_URL=mysql://fintrack:<mật khẩu>@127.0.0.1:3306/fintrack
```
rồi chạy `npm run db:check` để tạo bảng. Các lệnh sao lưu ở mục 4 vẫn dùng được; khi khôi phục, thay phần `docker exec -i fintrack-mysql mysql` bằng `mysql -h 127.0.0.1`.
