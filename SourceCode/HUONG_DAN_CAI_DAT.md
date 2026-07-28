# Hướng dẫn cài đặt và chạy chương trình

Ứng dụng web **TheWeekend** – gợi ý địa điểm vui chơi cuối tuần cho trẻ em.
Hệ thống gồm 3 phần:

| Thành phần | Công nghệ | Thư mục |
|---|---|---|
| Backend (API server) | Node.js + Express + MongoDB | `backend/` |
| Frontend (web) | Vue 3 + Vue CLI | `frontend/` |
| App quét vé (tùy chọn) | Android (Java) | `scanner-android/` |

---

## 1. Yêu cầu môi trường

Cài sẵn các phần mềm sau trước khi bắt đầu:

- **Node.js** phiên bản **18 trở lên** (kèm `npm`) — https://nodejs.org
- **MongoDB** (Community Server, chạy local) hoặc một chuỗi kết nối **MongoDB Atlas**
  - https://www.mongodb.com/try/download/community
- (Tùy chọn, chỉ khi build app quét vé) **Android Studio** + Android SDK

Kiểm tra Node đã cài đúng:

```bash
node -v
npm -v
```

---

## 2. Cấu hình biến môi trường

### 2.1. Backend — tạo file `backend/.env`

Sao chép từ file mẫu rồi điền giá trị:

```bash
cd backend
copy .env.example .env       # Windows
# cp .env.example .env        # macOS / Linux
```

Các biến trong `backend/.env`:

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| `MONGO_URI` | ✅ | Chuỗi kết nối MongoDB. Mặc định local: `mongodb://127.0.0.1:27017/TheWeekend` |
| `JWT_SECRET` | ✅ | Chuỗi bí mật ký token đăng nhập (đặt giá trị ngẫu nhiên bất kỳ) |
| `PORT` | | Cổng backend, mặc định `3000` |
| `FRONTEND_PUBLIC_ORIGIN` | | Gốc URL frontend, mặc định `http://localhost:8080` |
| `GOOGLE_CLIENT_ID` | | Client ID Google OAuth (đăng nhập bằng Google) |
| `GOONG_API_KEY` | | API key bản đồ Goong (gợi ý/tìm địa điểm) |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | | API key Google Gemini (chatbot). Mặc định model `gemini-2.5-flash-lite` |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `FROM_EMAIL` | | Cấu hình gửi email (xác nhận vé...) |
| `PAYOS_CLIENT_ID` `PAYOS_API_KEY` `PAYOS_CHECKSUM_KEY` | | Cổng thanh toán PayOS |
| `BOOKING_TTL_MINUTES` | | Thời gian giữ chỗ đặt vé (phút), mặc định `20` |

> Ứng dụng vẫn chạy được khi thiếu các key dịch vụ ngoài (Goong, Gemini, PayOS, SMTP) — chỉ những tính năng tương ứng bị tắt. Bắt buộc tối thiểu là `MONGO_URI` và `JWT_SECRET`.

### 2.2. Frontend — tạo file `frontend/.env`

```bash
cd frontend
copy .env.example .env       # Windows
# cp .env.example .env        # macOS / Linux
```

| Biến | Mô tả |
|---|---|
| `VUE_APP_GOOGLE_CLIENT_ID` | Client ID Google OAuth (phải khớp với `GOOGLE_CLIENT_ID` ở backend) |

### 2.3. Chọn nơi lưu dữ liệu (MongoDB)

Biến `MONGO_URI` quyết định backend kết nối tới database nào. Có **2 lựa chọn** — chọn 1 trong 2:

#### Option A — MongoDB local (mỗi máy một database riêng) — *mặc định, đơn giản nhất*

Mỗi máy tự cài MongoDB Community Server và chạy độc lập. Phù hợp khi chỉ cần chạy/test trên một máy, không cần chia sẻ dữ liệu.

```bash
# backend/.env
MONGO_URI=mongodb://127.0.0.1:27017/TheWeekend
```

- `127.0.0.1` = chính máy đang chạy backend.
- Ưu điểm: không cần Internet, không cần cấu hình mạng.
- Nhược điểm: **dữ liệu KHÔNG dùng chung** — chép source sang máy khác thì máy đó có database riêng, rỗng (phải seed lại ở bước 4).
- Nhớ bật MongoDB trước khi chạy backend:
  - Windows: MongoDB thường chạy sẵn như một *Service*. Kiểm tra trong **Services** (`services.msc`) → `MongoDB Server`; hoặc chạy thủ công `mongod`.

> **Muốn các máy trong cùng mạng LAN dùng chung 1 MongoDB local trên máy bạn?**
> 1. Sửa file cấu hình `mongod.cfg`: đổi `bindIp: 127.0.0.1` → `bindIp: 0.0.0.0`, rồi **restart** service MongoDB.
> 2. Mở **port 27017** trong Windows Firewall trên máy chạy MongoDB.
> 3. Trên các máy khác, đổi `MONGO_URI` trỏ tới IP LAN của máy bạn, ví dụ:
>    ```bash
>    MONGO_URI=mongodb://192.168.1.10:27017/TheWeekend
>    ```
> ⚠️ Chỉ nên dùng trong mạng nội bộ tin cậy (demo cùng phòng). Đừng mở MongoDB ra Internet khi chưa bật xác thực (user/password) — rất dễ bị tấn công/xóa dữ liệu. Khi cần dùng chung qua Internet, hãy chọn Option B.

#### Option B — MongoDB Atlas (cloud, dùng chung dữ liệu giữa các máy) — *khuyến nghị khi làm nhóm*

Tạo database trên cloud miễn phí, **mọi máy đều kết nối tới cùng một database** — không cần mỗi máy cài MongoDB, không cần mở firewall.

1. Đăng ký tài khoản tại https://www.mongodb.com/cloud/atlas (có gói **Free M0**).
2. Tạo một **Cluster** (chọn Free Shared) → đợi khởi tạo xong.
3. **Database Access**: tạo user + mật khẩu cho database.
4. **Network Access**: thêm IP được phép kết nối. Để tất cả máy truy cập được, thêm `0.0.0.0/0` (cho phép mọi IP — tiện cho dev, nhưng kém an toàn hơn việc khai báo IP cụ thể).
5. Bấm **Connect → Drivers**, sao chép connection string và điền vào `backend/.env`:

```bash
# backend/.env
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/TheWeekend?retryWrites=true&w=majority
```

- Thay `<user>` / `<password>` bằng thông tin đã tạo ở bước 3.
- Giữ tên database `TheWeekend` ở cuối (trước dấu `?`) để khớp với code.
- Ưu điểm: dữ liệu tập trung, mọi máy thấy cùng dữ liệu; không phụ thuộc máy bạn phải bật.
- Lưu ý: connection string chứa mật khẩu — **không commit** `backend/.env` lên Git.

> Dù chọn Option A hay B, các bước cài thư viện (mục 3), seed dữ liệu (mục 4) và chạy chương trình (mục 5) đều giống nhau. Với Option B chỉ cần seed **một lần** là tất cả máy dùng chung.

---

## 3. Cài đặt thư viện

### Cách nhanh (từ thư mục gốc của source)

```bash
npm run install:all
```

Lệnh này cài lần lượt: gói gốc → `backend/` → `frontend/`.

### Hoặc cài thủ công từng phần

```bash
cd backend  && npm install
cd ../frontend && npm install
```

---

## 4. Khởi tạo dữ liệu mẫu (seed)

Đảm bảo MongoDB đang chạy, sau đó từ thư mục `backend/`:

```bash
cd backend
node scripts/seedCategories.js     # tạo danh mục địa điểm
node scripts/seedHomeContent.js    # tạo nội dung trang chủ
```

---

## 5. Chạy chương trình

### Cách nhanh — chạy đồng thời backend + frontend (từ thư mục gốc)

```bash
npm run dev
```

- Backend chạy ở: http://localhost:3000
- Frontend chạy ở: http://localhost:8080

### Hoặc chạy riêng từng phần (2 cửa sổ terminal)

```bash
# Terminal 1 — backend
cd backend
npm run dev        # chế độ phát triển (nodemon, tự reload)
# hoặc: npm start  # chạy thường

# Terminal 2 — frontend
cd frontend
npm run serve
```

Mở trình duyệt vào **http://localhost:8080**.

---

## 6. Tạo tài khoản quản trị (admin)

1. Đăng ký một tài khoản bình thường qua giao diện web.
2. Vào MongoDB (ví dụ bằng MongoDB Compass), mở collection `users`, tìm user vừa tạo.
3. Sửa trường `role` từ `user` thành `admin` (các giá trị hợp lệ: `user`, `admin`, `staff`).
4. Đăng nhập lại để có quyền truy cập trang quản trị.

---

## 7. (Tùy chọn) App quét vé Android

Dùng cho nhân viên/admin quét QR vé tại cổng.

1. Mở **Android Studio** → `Open` → chọn thư mục `scanner-android/`.
2. Đợi Gradle sync xong (Android Studio tự tạo lại `local.properties` trỏ tới Android SDK trên máy).
3. Chạy trên emulator hoặc máy Android thật có camera.
4. Ở màn hình đăng nhập trong app, nhập URL backend:
   - Emulator: `http://10.0.2.2:3000` (địa chỉ trỏ về `localhost` của máy host)
   - Máy thật: `http://<IP-LAN-máy-chạy-backend>:3000` (ví dụ `http://192.168.1.10:3000`)

Chi tiết xem `scanner-android/README.md`.

---

## 8. Build frontend cho bản phát hành (tùy chọn)

```bash
cd frontend
npm run build      # xuất ra frontend/dist
```

---

## 9. Cấu trúc thư mục

```
SourceCode/
├── backend/            # API server (Node.js + Express + MongoDB)
│   ├── models/         # Schema dữ liệu (Mongoose)
│   ├── routes/         # Định nghĩa các API endpoint
│   ├── services/       # Xử lý nghiệp vụ (email, thanh toán, chatbot, vé...)
│   ├── middleware/     # Middleware xác thực...
│   ├── scripts/        # Script seed dữ liệu / tiện ích
│   ├── uploads/        # Nơi lưu ảnh người dùng tải lên (trống ban đầu)
│   ├── server.js       # Điểm khởi động backend
│   └── .env.example    # Mẫu biến môi trường
├── frontend/           # Web Vue 3
│   ├── src/            # Mã nguồn (pages, components, api, utils...)
│   └── .env.example    # Mẫu biến môi trường
├── scanner-android/    # App Android quét vé QR
├── package.json        # Script tiện ích chạy cả backend + frontend
└── HUONG_DAN_CAI_DAT.md
```

---

## 10. Xử lý sự cố thường gặp

| Triệu chứng | Nguyên nhân / cách khắc phục |
|---|---|
| `MONGO_URI is required in backend/.env` khi start | Chưa tạo `backend/.env` hoặc thiếu `MONGO_URI` |
| Backend không kết nối được DB | MongoDB chưa chạy, hoặc `MONGO_URI` sai |
| Web mở được nhưng không có dữ liệu | Chưa chạy các script seed ở bước 4 |
| Đăng nhập Google không hoạt động | `VUE_APP_GOOGLE_CLIENT_ID` (frontend) và `GOOGLE_CLIENT_ID` (backend) chưa khớp / chưa cấu hình |
| Cổng 3000 hoặc 8080 bị chiếm | Đổi `PORT` trong `backend/.env`, hoặc tắt tiến trình đang dùng cổng |
