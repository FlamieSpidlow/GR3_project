# LUỒNG GỢI Ý ĐỊA ĐIỂM GẦN — TheWeekend

Trang **Gợi ý** hiển thị địa điểm gần vị trí người dùng, sắp xếp gần → xa.
File chính: `frontend/src/pages/SuggestPage.vue` (tính ở frontend). Công thức khoảng cách cũng có ở `backend/services/goongService.js`.

---

## PHẦN 1 — Luồng rút gọn (học thuộc)

```
Lấy vị trí GPS người dùng
  → lấy tất cả địa điểm
  → tính khoảng cách tới từng địa điểm bằng công thức Haversine
  → lọc bán kính 10km
  → sắp xếp từ gần đến xa
  → (lọc thêm theo danh mục) → hiển thị
```

**Câu nói thuộc lòng:**
> *"Em lấy vị trí GPS của người dùng, tính khoảng cách đường chim bay tới từng địa điểm bằng công thức Haversine, lọc trong bán kính 10km rồi sắp xếp gần nhất lên đầu."*

---

## PHẦN 2 — Chi tiết theo dòng code (`SuggestPage.vue`)

1. **Lấy vị trí** — từ GPS (qua `utils/clientCache.js`) hoặc hồ sơ người dùng; lưu vào `userLocation`.
2. **Lấy địa điểm** — gọi `getAllPlaces()`.
3. **Tính khoảng cách** — hàm `calculateDistance` (dòng **316**) dùng **Haversine** (`R = 6371000` mét):
   ```
   distance = calculateDistance(user.lat, user.lng, place.lat, place.lng)
   ```
   (map ở dòng 257)
4. **Lọc bán kính 10km** — dòng **289**: `places.filter(p => p.distance !== null && p.distance <= 10000)`.
5. **Sắp xếp gần → xa** — dòng **293**: `places.sort((a, b) => a.distance - b.distance)`.
6. **Lọc theo danh mục** — `filterPlacesByCategoryOptions` (computed `filteredRecommendations`), hiển thị dần ("Xem thêm").

> Không có vị trí → không hiện khoảng cách, không lọc 10km (banner nhắc bật định vị).

### Công thức Haversine (`goongService.js:5` và `SuggestPage.vue:316`)
```
toRad = độ × π/180              (đổi độ → radian)
a = sin²(Δlat/2) + cos(lat1)·cos(lat2)·sin²(Δlng/2)
c = 2 · atan2(√a, √(1−a))       (góc ở tâm)
khoảng cách = R × c             (R = bán kính Trái Đất)
```

---

## PHẦN 3 — Vị trí chính

| Việc | Vị trí |
|---|---|
| Tính khoảng cách (Haversine) | `SuggestPage.vue:316` · `goongService.js:5` |
| Map địa điểm + gắn khoảng cách | `SuggestPage.vue:257` |
| Lọc bán kính 10km | `SuggestPage.vue:289` |
| Sắp xếp gần → xa | `SuggestPage.vue:293` |
| Cache vị trí GPS | `utils/clientCache.js` |
| Tìm quanh (backend, qua Goong) | `goongService.js:searchNearbyPlaygrounds:103` |

---

## PHẦN 4 — Cách trả lời & thứ tự mở code

**Nếu thầy hỏi "làm sao biết địa điểm nào gần":**
1. Nói: *"Em tính khoảng cách từ vị trí người dùng tới từng địa điểm bằng Haversine, lọc 10km, sắp xếp gần nhất."*
2. Mở `SuggestPage.vue:316` (`calculateDistance`) → *"đây là công thức Haversine, đổi độ ra radian, tính góc rồi nhân bán kính Trái Đất."*
3. Chỉ `:289` (lọc 10km) và `:293` (sắp xếp).

**Thứ tự vàng:** `calculateDistance:316` → lọc `:289` → sort `:293`.

---

## PHẦN 5 — Ý ăn điểm & bẫy

1. **Haversine** — tính đúng khoảng cách trên mặt cầu, không dùng khoảng cách phẳng.
2. **Lọc bán kính + sắp xếp** — chỉ gợi ý nơi thực sự gần.

> Bẫy 1: "6371000 là gì?" → **bán kính Trái Đất (mét)**; bản chatbot dùng 6371 (km).
> Bẫy 2: "Sao không dùng √(Δx²+Δy²)?" → Trái Đất cong, lat/lng không phải toạ độ phẳng, tính vậy sẽ sai.
> Bẫy 3: "Di chuyển thì cập nhật vị trí mới không?" → cache GPS 10 phút; sau đó hoặc reload sẽ lấy vị trí mới (xem `clientCache.js`).
