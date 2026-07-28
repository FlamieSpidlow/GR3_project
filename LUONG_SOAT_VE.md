# LUỒNG SOÁT VÉ / CHECK-IN — TheWeekend

Soát vé chạy ở **2 nơi dùng chung API**: web (staff) và **app Android**.
Backend: `routes/tickets.js` + `routes/adminTicketing.js`. App: `scanner-android/.../MainActivity.java`.

---

## PHẦN 1 — Luồng rút gọn (học thuộc)

```
Nhân viên đăng nhập (staff)
  → mở camera quét QR của vé
  → BƯỚC 1 verify: gửi mã vé lên server, hiện trạng thái (hợp lệ / đã dùng / hết hạn)
  → BƯỚC 2 use: bấm xác nhận → server đổi vé sang 'đã sử dụng', ghi người + giờ
  → quét lại vé cũ → báo "đã được sử dụng" (chống dùng 2 lần)
```

**Câu nói thuộc lòng:**
> *"Nhân viên quét QR, hệ thống kiểm tra vé trước (verify), hợp lệ thì bấm xác nhận để đánh dấu đã dùng (use). Vé đã dùng hoặc sai ngày thì bị từ chối — chống dùng vé hai lần. App Android và web dùng chung API này."*

---

## PHẦN 2 — Chi tiết theo dòng code

### Bên server (Node)

**Check-in 1 bước (web) — `routes/tickets.js:244`** (`/staff/check-in`):
- Tìm vé theo mã. Đã dùng → **409**; không hợp lệ → 400.
- Ngày đi < hôm nay → đánh `expired`, từ chối.
- Hợp lệ → `used`, ghi `usedAt` + `checkedInBy`.

**Check-in 2 bước (app dùng) — `routes/adminTicketing.js`:**
- **verify (dòng 87):** tra vé, trả về trạng thái để nhân viên xem trước (không đổi gì).
- **use (dòng 103):** đổi vé sang `used`; kiểm tra lại đã dùng (409) và sai ngày (đánh `expired`).

### Bên app Android (Java) — `MainActivity.java`

- **`performLogin` (142):** đăng nhập staff → `POST /api/auth/login` → lưu token.
- **`startScanning` (225):** xin quyền camera → mở ZXing quét QR.
- **`verifyTicket` (162):** gửi mã tới `/api/admin/checkin/verify` → hiện Hợp lệ / Đã dùng / Lỗi.
- **`confirmCheckIn` (206):** nếu hợp lệ, gửi `/api/admin/checkin/use` → đánh dấu đã vào.

---

## PHẦN 3 — Hàm/endpoint chính & vị trí

| Nơi | Vị trí | Việc |
|---|---|---|
| Check-in web | `routes/tickets.js:244` | Soát vé 1 bước |
| Verify (app) | `routes/adminTicketing.js:87` | Kiểm tra vé (bước 1) |
| Use (app) | `routes/adminTicketing.js:103` | Đánh dấu đã dùng (bước 2) |
| App đăng nhập | `MainActivity.java:142` | Lưu token |
| App quét QR | `MainActivity.java:225` | ZXing camera |
| App verify | `MainActivity.java:162` | Gọi /checkin/verify |
| App use | `MainActivity.java:206` | Gọi /checkin/use |

---

## PHẦN 4 — Cách trả lời & thứ tự mở code

**Nếu thầy hỏi "soát vé xử lý ở đâu":**
1. Nói: *"Có 2 bước: verify để xem vé, use để đánh dấu đã dùng; web và app dùng chung API."*
2. Mở `adminTicketing.js:103` (use) → *"kiểm tra vé đã dùng chưa (báo 409), sai ngày thì hết hạn, còn không thì đổi sang đã sử dụng và ghi người + giờ."*
3. Nếu hỏi app: mở `MainActivity.java` → `verifyTicket:162` và `confirmCheckIn:206`.

**Thứ tự vàng:** (server) `adminTicketing.js verify:87` → `use:103`; (app) `verifyTicket:162` → `confirmCheckIn:206`.

---

## PHẦN 5 — Ý ăn điểm & bẫy

1. **Chống dùng vé 2 lần** — vé `used` quét lại trả **409**.
2. **Chống vé sai ngày** — ngày đi đã qua → tự `expired`, từ chối.
3. **2 bước verify → use** — chống bấm nhầm "trừ" vé.
4. **Web + app dùng chung API** — không viết lại logic, cùng phân quyền staff.

5. **Vé quá ngày tự hết hạn** — không cần ai quét, không cần job nền.

> Bẫy: "Vé quá ngày mà chưa quét thì có tự hết hạn không?" → **Có**. Em dùng **lazy expiry**: mỗi lần load danh sách vé, hàm `expirePastTickets` (trong `ticketingService.js`) tự chuyển các vé **chưa dùng** (`valid`/`paid`) có **ngày đi đã qua** sang `expired`. Ngoài ra lúc soát vé cũng chặn vé quá ngày.
>
> Nếu thầy hỏi "sao không dùng job nền (cron)?" → *"Không cần: vé chỉ có ý nghĩa khi được xem hoặc quét, nên em cập nhật ngay lúc đọc — nhẹ hơn và luôn đúng."*

---

## PHẦN 6 — Vé tự hết hạn khi quá ngày đi

**Hàm:** `expirePastTickets` — `backend/services/ticketingService.js` (gần `expirePendingBooking`)

```js
const expirePastTickets = async (filter = {}) => {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const result = await Ticket.updateMany(
    { ...filter, status: { $in: ['valid', 'paid'] }, visitDate: { $lt: today } },
    { $set: { status: 'expired' } }
  )
  return result?.modifiedCount || 0
}
```

**Chỉ đụng vé chưa dùng** (`valid`/`paid`) có ngày đi < hôm nay. Vé `used`/`cancelled` giữ nguyên.

**Được gọi ở** (`routes/tickets.js`):
- `GET /my` — trang "Vé của tôi" (chỉ quét vé của chính người dùng)
- `GET /admin` — danh sách quản trị (quét toàn bộ)

**Câu nói:**
> *"Vé quá ngày đi thì tự hết hạn. Em dùng cơ chế lazy: mỗi lần load danh sách vé, hệ thống cập nhật các vé chưa dùng có ngày đi đã qua sang trạng thái hết hạn — không cần job nền chạy ngầm."*
