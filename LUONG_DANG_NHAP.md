# LUỒNG ĐĂNG NHẬP & PHÂN QUYỀN — TheWeekend

Backend: `routes/auth.js` + `middleware/auth.js`. Frontend: `router/index.js` + `utils/authSession.js`.
Xác thực bằng **JWT**, hỗ trợ **tài khoản thường (bcrypt)** và **Google OAuth**.

---

## PHẦN 1 — Luồng rút gọn (học thuộc)

```
Đăng ký: nhập thông tin → băm mật khẩu bcrypt → lưu DB
Đăng nhập: tìm user → bcrypt.compare → đúng thì phát JWT
Mỗi request sau: gửi kèm JWT ở header → middleware authenticate kiểm tra
Phân quyền: requireAdmin / requireStaffOrAdmin chặn theo vai trò (ở server)
```

**Câu nói thuộc lòng:**
> *"Mật khẩu được băm bằng bcrypt, không lưu thô. Đăng nhập đúng thì server phát ra một JWT; các request sau gắn token đó, middleware kiểm tra rồi mới cho qua. Phân quyền kiểm ở server chứ không chỉ ẩn nút."*

---

## PHẦN 2 — Chi tiết theo dòng code

### A. Đăng ký — `routes/auth.js:84`
- Kiểm tra đủ thông tin → **`bcrypt.hash(password, 10)`** (dòng 91) → tạo User role `user`.

### B. Đăng nhập thường — `routes/auth.js:109`
- Tìm user theo username; nếu là tài khoản Google (không có mật khẩu) → nhắc dùng nút Google.
- **`bcrypt.compare`** (dòng 118) so mật khẩu → đúng thì phát **JWT** trả về client.

### C. Đăng nhập Google — `routes/auth.js:132`
- Client gửi `credential` của Google → server **xác minh với Google** → lấy email/tên.
- Chưa có tài khoản → tạo mới (`authProvider: 'google'`); có rồi → gắn `googleId`. Rồi cũng phát JWT.

### D. Quên / đặt lại mật khẩu
- `forgot-password` (182): sinh **mã 6 số** hạn 15 phút, gửi email.
- `reset-password` (222): kiểm mã đúng + chưa hết hạn → băm mật khẩu mới.

### E. Xác thực mỗi request — `middleware/auth.js`
- **`authenticate` (17):** đọc header `Authorization: Bearer <token>` → giải mã JWT → tìm user → gắn `req.user`. Sai/thiếu → 401.
- **`requireAdmin` (37) / `requireStaffOrAdmin` (61):** kiểm `req.user.role` → không đủ quyền → 403.

### F. Phía frontend
- `utils/authSession.js`: lưu/đọc token + user vào localStorage.
- `router/index.js` `beforeEach` (52): chặn/điều hướng theo vai trò (**chỉ là UX**, không phải bảo mật).

---

## PHẦN 3 — Hàm/endpoint chính & vị trí

| Việc | Vị trí |
|---|---|
| Đăng ký (băm bcrypt) | `routes/auth.js:84` (`hash:91`) |
| Đăng nhập (compare + JWT) | `routes/auth.js:109` (`compare:118`) |
| Đăng nhập Google | `routes/auth.js:132` |
| Quên / đặt lại mật khẩu | `routes/auth.js:182 / 222` |
| Xác thực JWT | `middleware/auth.js:17` |
| Phân quyền | `middleware/auth.js:37 / 61` |
| Lưu phiên (FE) | `utils/authSession.js` |
| Guard client | `router/index.js:52` |

---

## PHẦN 4 — Cách trả lời & thứ tự mở code

**Nếu thầy hỏi "đăng nhập xử lý ở đâu":**
1. Mở `routes/auth.js:109` → *"tìm user, so mật khẩu bằng bcrypt.compare, đúng thì phát JWT."*
2. Nếu hỏi mật khẩu lưu sao → chỉ `hash:91` → *"băm bcrypt salt 10, không lưu thô."*
3. Nếu hỏi phân quyền → mở `middleware/auth.js` → `authenticate:17` + `requireAdmin:37`.

**Thứ tự vàng:** `auth.js login:109` → `middleware/auth.js authenticate:17` → `requireAdmin:37`.

---

## PHẦN 5 — Ý ăn điểm & bẫy

1. **Mật khẩu bcrypt (salt 10)** — không lưu thô; có cả Google OAuth.
2. **Phân quyền 2 lớp** — client guard (UX) + server middleware (bảo mật thật).
3. **JWT stateless** — hợp tách frontend/backend, gắn ở header Bearer.

> Bẫy 1: "Guard ở frontend chặn được hacker không?" → **Không**, đó chỉ để điều hướng; gọi thẳng API vẫn bị **middleware server** chặn.
> Bẫy 2: "6 chữ số mã quên mật khẩu, thử nhiều lần thì sao?" → thừa nhận **chưa có rate-limit**, đó là hướng bổ sung.
> Bẫy 3: "Salt round 10 là gì?" → số vòng băm (2¹⁰), cân bằng an toàn/tốc độ.
