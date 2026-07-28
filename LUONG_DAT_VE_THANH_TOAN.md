# LUỒNG ĐẶT VÉ & THANH TOÁN PAYOS — TheWeekend

File chính: `backend/services/ticketingService.js`
Đây là chức năng **trọng tâm** — thầy hay soi kỹ nhất.

---

## PHẦN 1 — Luồng rút gọn (học thuộc)

```
Khách đặt vé
  → createBooking: kiểm tra + tạo đơn 'chờ thanh toán'
  → createPayosPayment: gọi PayOS lấy mã QR
  → khách quét QR trả tiền
  → PayOS gọi webhook về backend
  → handlePayosWebhook: KIỂM TRA CHỮ KÝ
  → markPaymentPaid: chống trùng + khớp số tiền → đổi 'đã thanh toán'
  → generateTicketsForBooking: sinh vé QR
  → gửi email vé + thông báo
```

**Câu nói thuộc lòng:**
> *"Khách đặt vé thì em tạo đơn trạng thái chờ thanh toán và gọi PayOS lấy mã QR. Khi khách trả tiền, PayOS gọi webhook về, backend kiểm tra chữ ký rồi mới xác nhận đã thanh toán, sinh vé QR và gửi email. Em không cho xác nhận thủ công."*

---

## PHẦN 2 — Chi tiết theo dòng code

### A. Tạo đơn — `createBooking` (dòng 308)
- Kiểm tra: địa điểm tồn tại, **ngày đi không quá khứ**, **không quá giờ đóng cửa** (nếu là hôm nay), cấu hình PayOS.
- `buildBookingItems` (144): dựng giỏ vé — loại vé còn bán, số lượng ≤ giới hạn, tính tổng tiền.
- Tạo **Booking** + **Payment** trạng thái `pending`, có `expiresAt` (hạn thanh toán, mặc định 60 phút).

### B. Gọi PayOS — `createPayosPayment` (dòng 208)
- Đóng gói đơn (số tiền, mô tả, URL trở về) + **ký chữ ký HMAC** (`signPayosData:48`), gửi sang PayOS, nhận lại **link + mã QR**.

### C. Nhận kết quả — `handlePayosWebhook` (dòng 574)
- **Verify chữ ký** (`verifyPayosWebhook:58` + `safeCompare:42` dùng `timingSafeEqual`). Sai chữ ký → ghi log, bỏ qua.
- Kiểm tra sự kiện thành công → tìm payment → so số tiền → gọi `markPaymentPaid`.

### D. Xác nhận trả tiền — `markPaymentPaid` (dòng 471)
- **Chống trùng (idempotency):** biến `duplicate` (dòng ~474) — nếu đơn đã 'paid' thì bỏ qua, không xử lý lần 2.
- **Khớp số tiền:** lệch → đánh `failed`, không phát vé.
- Đổi `paid` → `generateTicketsForBooking` (430) sinh vé QR (dùng **upsert** theo `(booking, lineIndex)` nên không tạo trùng) → gửi email + thông báo.

### E. Dự phòng — `refreshPayosPaymentStatus` (dòng 561)
- Frontend polling gọi `/:id/payment-status` → backend **tự hỏi lại PayOS** phòng khi webhook chậm/lỗi.

### F. Hết hạn — `expirePendingBooking` (dòng 264)
- Đơn quá `expiresAt` chưa trả → tự chuyển `expired`.

---

## PHẦN 3 — Hàm chính & vị trí

| Hàm | Dòng | Việc |
|---|---|---|
| `createBooking` | 308 | Tạo đơn (validate + tạo Booking/Payment) |
| `buildBookingItems` | 144 | Dựng giỏ vé, tính tiền |
| `createPayosPayment` | 208 | Gọi PayOS lấy QR |
| `signPayosData` | 48 | Ký chữ ký HMAC-SHA256 |
| `verifyPayosWebhook` | 58 | Verify chữ ký webhook |
| `handlePayosWebhook` | 574 | Nhận & xử lý webhook |
| `markPaymentPaid` | 471 | Xác nhận trả tiền (chống trùng, khớp tiền) |
| `generateTicketsForBooking` | 430 | Sinh vé QR |
| `refreshPayosPaymentStatus` | 561 | Polling dự phòng |
| `expirePendingBooking` | 264 | Hết hạn đơn chờ |
| Endpoint webhook | `routes/tickets.js:159` | `/payos/webhook` |
| Endpoint đặt vé | `routes/tickets.js:74` | `POST /` |

---

## PHẦN 4 — Cách trả lời & thứ tự mở code

**Nếu thầy hỏi "xác nhận đã thanh toán xử lý ở đâu":**
1. Nói: *"Chỉ webhook của PayOS mới xác nhận được, backend kiểm tra chữ ký."*
2. Mở `handlePayosWebhook (574)` → *"nhận webhook, verify chữ ký ở `verifyPayosWebhook:58`."*
3. Mở `markPaymentPaid (471)` → *"chống trùng bằng biến duplicate, khớp số tiền, rồi đổi paid và sinh vé."*

**Nếu thầy hỏi "đặt vé xử lý ở đâu":**
1. Mở `createBooking (308)` → *"validate ngày, giờ đóng cửa, dựng giỏ vé, tạo đơn chờ thanh toán."*
2. Mở `createPayosPayment (208)` → *"gọi PayOS lấy QR."*

**Thứ tự vàng:** `createBooking:308` → `createPayosPayment:208` → `handlePayosWebhook:574` → `markPaymentPaid:471` → `generateTicketsForBooking:430`.

---

## PHẦN 5 — Ý ăn điểm & bẫy

1. **Không xác nhận thủ công** — trạng thái `paid` chỉ từ webhook đã verify. (Bẫy: "Em tự gọi API báo đã trả được không?" → Không, không có endpoint đó.)
2. **Verify chữ ký HMAC + `timingSafeEqual`** — chống webhook giả + chống timing-attack.
3. **Idempotency + upsert** — webhook gọi 2 lần không cộng tiền / tạo vé 2 lần.
4. **Khớp số tiền server-side** — số tiền lấy từ DB, không tin client.

> Bẫy: "Số tiền so khớp lấy từ đâu?" → từ **DB** (`booking.totalAmount`), không phải từ client.
