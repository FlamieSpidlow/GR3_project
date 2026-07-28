# TheWeekend Scanner Android

Mini app Android native dùng cho nhân viên/admin quét QR vé TheWeekend.

## Chức năng

- Đăng nhập bằng tài khoản hiện có của hệ thống.
- Lưu URL backend trong máy.
- Quét QR bằng camera.
- Gọi API `/api/admin/checkin/verify` để xem thông tin vé.
- Gọi API `/api/admin/checkin/use` để xác nhận check-in.

## Cách mở bằng Android Studio

1. Mở Android Studio.
2. Chọn `Open`.
3. Chọn thư mục `scanner-android`.
4. Đợi Gradle sync xong.
5. Run trên máy Android thật hoặc emulator có camera.

## URL backend

Ở màn hình đăng nhập, nhập URL backend dạng:

```text
http://10.0.2.2:3000
```

`10.0.2.2` là địa chỉ trỏ về `localhost` của máy host khi chạy trên Android emulator. Nếu chạy trên máy thật, dùng IP LAN của máy chạy backend (ví dụ `http://192.168.1.x:3000`). Không cần thêm `/api`, app sẽ tự nối.

## Quyền cần cấp

Khi bấm `Quét QR`, Android sẽ hỏi quyền camera. Chọn cho phép.

## Lưu ý

Backend cần đang chạy và có các endpoint:

- `POST /api/auth/login`
- `POST /api/admin/checkin/verify`
- `POST /api/admin/checkin/use`

Token đăng nhập được gửi qua header:

```text
Authorization: Bearer <token>
```
