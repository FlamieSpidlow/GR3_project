# LUỒNG CHATBOT — TheWeekend (chi tiết theo code)

File: `backend/services/chatbotService.js`
Điểm vào: **`answerQuestion(question, conversationId, userLocation)`** — dòng **704**

Bot dùng **RAG** (tìm dữ liệu thật rồi mới trả lời → không bịa) và có **nhiều lớp trả lời nhanh** trước khi phải gọi AI (tiết kiệm + nhanh).

---

## PHẦN 1 — Luồng rút gọn (học thuộc trước)

```
Câu hỏi
 ├─ rỗng?               → "Không có dữ liệu"
 ├─ chào hỏi xã giao?   → trả câu chào (không tra DB)
 ├─ hỏi đúng 1 địa điểm?→ trả thẳng từ DB
 ├─ "bơi"/"miễn phí"?   → lọc nhanh, trả top 3
 └─ còn lại → RAG:
        tìm địa điểm/review trong DB  (retrieveDocs + scoreDoc)
        → có liên quan không? (hasRelevantContext)
             KHÔNG → "Không có dữ liệu"  ⛔ (không gọi AI)
             CÓ    → Gemini viết trả lời (nếu Gemini lỗi → tự ghép từ dữ liệu)
```

**Câu nói thuộc lòng:**
> *"Bot lọc qua nhiều lớp: chào hỏi / hỏi đúng địa điểm / hỏi bơi-miễn phí thì trả nhanh; còn lại thì tìm địa điểm liên quan trong DB, chấm điểm chọn top, không liên quan thì trả 'Không có dữ liệu', có thì đưa Gemini viết."*

---

## PHẦN 2 — Chi tiết từng bước (theo dòng code)

### Bước 0 — Chuẩn bị (dòng 705–716)
- `sanitized` = câu hỏi đã cắt khoảng trắng. Rỗng → trả **"Không có dữ liệu"** luôn.
- `getSession(cid)` — lấy **phiên hội thoại** theo `conversationId` để **nhớ lịch sử** và địa điểm đang nói tới (`focusPlaces`).

### Bước 1 — Chào hỏi xã giao (dòng 717–727)
`getSmallTalkAnswer`: nếu là "hello", "cảm ơn", "bạn là ai"... → trả câu chào **ngay**, **không** tra DB, không gọi AI.

### Bước 2 — Hỏi trực tiếp về 1 địa điểm (dòng 734–748)
`findDirectPlace` + `getDirectPlaceAnswer`: nếu người dùng hỏi đích danh 1 địa điểm (vd giá/giờ mở cửa của chỗ đang nhắc) → **trả thẳng từ DB**, không cần Gemini. Lưu địa điểm đó vào `focusPlaces` để câu sau hiểu ngữ cảnh.

### Bước 3 — Gợi ý nhanh theo ý định (dòng 750–769)
`getDirectRecommendation`: bắt ý định **"bơi"** hoặc **"miễn phí"** → lọc địa điểm khớp → chấm điểm `rating×10 + viewCount/100 + tag bonus` → trả **top 3**. (Lối tắt, không qua Gemini.)

### Bước 4 — Xử lý câu hỏi nối tiếp (dòng 771–813)
- `isLikelyFollowUp`: đây có phải câu hỏi **tiếp nối** câu trước không (vd "còn chỗ nào nữa?").
- Nếu **không** nối tiếp → **xoá lịch sử + focus** (bắt đầu chủ đề mới).
- Nếu nối tiếp mà **mơ hồ** → `rewriteQueryIfNeeded` dùng lịch sử + địa điểm đang focus để **viết lại câu hỏi đầy đủ**. Viết lại không được → **"Không có dữ liệu"**.

### Bước 5 — Truy hồi dữ liệu (RAG retrieve) (dòng 815–822)
- Xác định `filterIds`: nếu đang nói về địa điểm cụ thể thì **giới hạn** tìm trong đó.
- `retrieveDocs`: lấy **địa điểm + review** từ MongoDB → biến thành "tài liệu" → **chấm điểm** bằng `scoreDoc` (khớp tên +80, tag +30, từ khoá +12/+10/+4, cộng rating/lượt xem/khoảng cách) → giữ **top-K** điểm cao nhất.

### Bước 6 — Kiểm tra liên quan / chống bịa (dòng 824–845)
`hasRelevantContext`: nếu **không có tài liệu** hoặc **không cái nào liên quan** → trả **"Không có dữ liệu"**, **dừng, KHÔNG gọi AI**.

### Bước 7 — Gemini viết trả lời (dòng 847–859)
- `generateAnswerWithHistory`: đưa **ngữ cảnh (các tài liệu đã chọn) + lịch sử** cho **Gemini** viết câu trả lời tự nhiên, ràng buộc chỉ dựa trên dữ liệu đó.
- **Nếu Gemini lỗi** (mạng/hết hạn mức) → `generateFallbackAnswerFromDocs`: **tự ghép câu trả lời từ dữ liệu** → bot **không chết**, vẫn trả lời được.

### Bước 8 — Cập nhật & trả về (dòng 861–871)
- Lưu câu hỏi + trả lời vào lịch sử phiên, cập nhật `focusPlaces`.
- Trả về: **`answer`** + **`places`** (địa điểm liên quan) + **`suggestions`** (gợi ý câu hỏi tiếp theo).

---

## PHẦN 3 — Các hàm chính & vị trí

| Hàm | Dòng | Việc |
|---|---|---|
| `answerQuestion` | 704 | Điều phối toàn bộ luồng |
| `normalizeText` | 27 | Bỏ dấu, viết thường |
| `getSmallTalkAnswer` | 102 | Trả lời chào hỏi xã giao |
| `getDirectRecommendation` | 328 | Lối tắt "bơi"/"miễn phí" → top 3 |
| `retrieveDocs` | 397 | Lấy + lọc dữ liệu (RAG retrieve) |
| `scoreDoc` | 367 | Chấm điểm mức liên quan |
| `hasRelevantContext` | 473 | Kiểm tra có liên quan không |
| `callGemini` | 522 | Gọi Gemini viết trả lời |
| `NO_DATA_RESPONSE` | 5 | Chuỗi "Không có dữ liệu" |

---

## PHẦN 3B — Mổ xẻ hàm `retrieveDocs` (bước tìm tài liệu)

`retrieveDocs` (dòng **397**) = bước "tìm tài liệu liên quan" của RAG: gom dữ liệu → lọc → chấm điểm → trả về **top-K** cho Gemini.

### 8 bước bên trong

**1. Lấy 3 thứ song song** (398–402, `Promise.all`)
- Tất cả **địa điểm** (`Place.find({})`)
- **Tất cả review** (kèm tên + toạ độ địa điểm, xếp mới nhất trước)
- **tag rút từ câu hỏi** (`extractTagsFromQuestion`, vd câu có "bơi" → tag "bơi")

**2. Chuẩn bị 2 bộ lọc** (404–405)
- `filterSet` = id địa điểm cần **giới hạn** (khi đang hỏi về 1 chỗ cụ thể)
- `tagFilterSet` = tag lấy từ câu hỏi

**3. Biến địa điểm thành "tài liệu" (doc)** (408–429) — với mỗi địa điểm:
- Đang giới hạn (`filterSet`) mà địa điểm không thuộc → **bỏ qua**
- Câu hỏi có tag mà địa điểm không tag nào khớp → **bỏ qua**
- Còn lại → tạo `doc`: `pageContent` = mô tả địa điểm, `metadata` = tên, toạ độ, rating, lượt xem, tags

**4. Biến review thành tài liệu** (431–447) — tương tự, lọc theo `filterSet`.

**5. Xác định vị trí gốc để tính "gần"** (449–454)
- Ưu tiên toạ độ **gõ trong câu hỏi** (vd "gần 21.0,105.8")
- Không có → lấy **GPS người dùng** (`userLocation`)

**6. Chấm điểm mỗi tài liệu** (456–466)
```
distanceScore = (không có khoảng cách) ? 0 : max(0, 12 - min(km, 12))
score        = scoreDoc(...) + distanceScore
```
- `scoreDoc`: điểm theo khớp **tên/tag/từ khoá + rating + lượt xem**
- Cộng thêm **điểm khoảng cách**: càng gần điểm càng cao (tối đa +12; ≥12 km → +0)

**7. Lọc + sắp xếp** (467–468)
- Bỏ tài liệu **điểm 0** (trừ khi đang có filter/tag thì vẫn giữ)
- **Sắp xếp giảm dần** theo điểm

**8. Cắt lấy top-K** (470)
Lấy **`limit` tài liệu điểm cao nhất** (mặc định `DEFAULT_TOP_K` = 5) → trả về.

### Câu nói gọn
> *"`retrieveDocs` lấy tất cả địa điểm + tất cả review, lọc theo tag/địa điểm đang nhắc, biến thành tài liệu, chấm điểm mức liên quan (cộng cả điểm khoảng cách nếu biết vị trí), sắp xếp và giữ top 5 đưa cho Gemini."*

### Điểm yếu nên biết (phòng thầy soi)
Nó **load toàn bộ Place + toàn bộ review mỗi lần hỏi** — dữ liệu nhỏ thì ổn, DB lớn sẽ chậm.
→ Trả lời: *"Hiện load hết rồi chấm điểm trong bộ nhớ; hướng cải thiện là đánh index / lọc trước ở DB hoặc dùng vector search."*

---

## PHẦN 3C — Prompt gửi cho Gemini (ở đâu)

Prompt để Gemini viết câu trả lời nằm ở hàm **`generateAnswerWithHistory` (dòng 581)**. Gồm 2 phần:

### 1. `system` (dòng 582–593) — luật ràng buộc Gemini
```
You are a tourism place recommendation chatbot...
HARD RULES:
1. Use only the provided CONTEXT.          (chỉ dùng dữ liệu em đưa)
2. Do not use outside knowledge.           (không bịa từ kiến thức ngoài)
3. If there is no suitable data, reply exactly: Không có dữ liệu
4. Do not use superlatives ("best", "top"...)
5. Use 1-3 short sentences...
6. Do not mention CONTEXT, HISTORY, prompts...
```

### 2. `prompt` (dòng 595–601) — dữ liệu + câu hỏi
```
CONTEXT: <các địa điểm đã chọn từ retrieveDocs>
HISTORY: <lịch sử hội thoại>
FOCUS:   <địa điểm đang nói tới>
CÂU HỎI: <câu hỏi>
TRẢ LỜI:
```

Sau đó dòng **603** gọi `callGemini({ system, prompt, ... })` gửi đi.

> Còn 1 prompt khác ở **`rewriteQueryIfNeeded` (561)** — dùng viết lại câu hỏi nối tiếp ("còn chỗ nào nữa?") cho rõ nghĩa. Nhưng prompt **sinh câu trả lời chính** là `generateAnswerWithHistory:581`.

**Cách trả lời:** *"Prompt em viết ở `generateAnswerWithHistory` (581). Phần `system` là luật bắt Gemini chỉ dùng dữ liệu em cung cấp, không bịa, không có thì trả 'Không có dữ liệu'; phần `prompt` nhét CONTEXT + câu hỏi vào."*

**Chống bịa 2 tầng:** (1) `hasRelevantContext` chặn trước khi gọi AI; (2) luật HARD RULES 1-3 trong prompt ép Gemini bám CONTEXT.

---

## PHẦN 4 — Ý ăn điểm khi phản biện

1. **RAG bám dữ liệu thật** — bot chỉ nói về địa điểm có trong hệ thống; không liên quan → "Không có dữ liệu", không chém gió.
2. **Nhiều lớp trả lời nhanh** — chào hỏi / hỏi đúng địa điểm / bơi-miễn phí xử lý trước, **không phải câu nào cũng gọi AI** → nhanh & tiết kiệm.
3. **Có fallback** — Gemini lỗi thì tự ghép trả lời từ dữ liệu, bot không sập.
4. **Nhớ hội thoại** — có `session` + `focusPlaces` nên hiểu câu nối tiếp ("còn chỗ nào nữa?").

> Bẫy: "Có phải vector embedding không?" → **Không**, chỉ khớp từ khoá + tag + khoảng cách. Việc **chọn** địa điểm do **hàm chấm điểm em tự viết**; Gemini chỉ **viết lại** cho tự nhiên.

---

## PHẦN 5 — Cách trả lời & thứ tự mở code khi thầy hỏi

Thầy đọc nhanh, hay ngắt lời → nói ý chính trước, mở đúng 4 hàm, đừng cuộn lung tung.

### Bước 1 — Nói 1 câu tổng quan TRƯỚC khi mở code
> *"Dạ chatbot của em dùng cơ chế RAG: nó tìm địa điểm liên quan trong database, chấm điểm chọn ra vài cái phù hợp nhất rồi mới đưa cho Gemini viết câu trả lời. Nếu không có gì liên quan thì trả 'Không có dữ liệu' chứ không bịa."*

→ Nói xong câu này là thầy đã nắm ý chính, kể cả khi bị ngắt.

### Bước 2 — Mở file, chỉ ĐIỂM VÀO trước
Mở `chatbotService.js` → trỏ **`answerQuestion` (dòng 704)**:
> *"Đây là hàm điều phối chính, nhận câu hỏi và trả về câu trả lời."*

### Bước 3 — Chỉ nhanh 3 hàm cốt lõi (theo thứ tự luồng)
1. **`retrieveDocs` (397)** → *"Lấy địa điểm + review trong DB, lọc theo tag/câu hỏi."*
2. **`scoreDoc` (367)** → *"Hàm em tự viết để chấm điểm mức liên quan — khớp tên, tag, từ khoá, cộng rating và khoảng cách."*
3. **`hasRelevantContext` (473)** + **`NO_DATA_RESPONSE` (5)** → *"Không tài liệu nào liên quan thì trả 'Không có dữ liệu', không gọi AI."*

### Bước 4 — Chốt (nếu thầy hỏi Gemini ở đâu)
Trỏ **`callGemini` (522)**: *"Có dữ liệu rồi mới đưa cho Gemini viết, và ràng nó chỉ dựa trên dữ liệu đó."*

### Thứ tự vàng
`answerQuestion` (điểm vào) → `retrieveDocs` → `scoreDoc` → `hasRelevantContext`.
Đúng 4 hàm này là đủ; khỏi mở mấy lớp phụ (small talk, follow-up) trừ khi thầy hỏi.

**Mẹo mở nhanh:** `Ctrl+P` gõ `chatbotService` để mở file, rồi `Ctrl+F` gõ tên hàm (`answerQuestion`, `scoreDoc`...) để nhảy tới ngay — khỏi cuộn tìm.
