# BÀI THUYẾT TRÌNH — TheWeekend (đọc liền mạch để học thuộc)

**Trần Hoàng Hiền – 20225836 · GVHD: TS. Trần Hải Anh**
Deck: `TranHoangHien_20223836.pptx` — 27 slide (24 slide trình bày + 3 slide phụ lục đã ẩn)
**~1.600 tiếng → khoảng 11–12 phút** (tốc độ nói bình thường, đã trừ hao chuyển slide)

---

Em xin chào thầy cô. Em là Trần Hoàng Hiền, mã số sinh viên 20225836, lớp Công nghệ thông tin Việt–Nhật. Hôm nay em xin trình bày đồ án tốt nghiệp: **Thiết kế và xây dựng ứng dụng web gợi ý địa điểm vui chơi cuối tuần cho trẻ em**, tên hệ thống là TheWeekend, dưới sự hướng dẫn của TS. Trần Hải Anh. Bài của em gồm năm phần: đặt vấn đề, phân tích và thiết kế, các chức năng chính, kết quả kiểm thử, và kết luận.

Trước hết là vấn đề mà đề tài muốn giải quyết. Khi phụ huynh tìm chỗ chơi cuối tuần cho con, họ phải cân nhắc nhiều thứ cùng lúc — vị trí, độ tuổi phù hợp, giá vé, đánh giá — mà **những thông tin này lại nằm rải rác ở nhiều nguồn**, nên rất mất thời gian tự gom và tự so sánh. Tìm kiếm bằng từ khoá thông thường cũng **chưa phản ánh đúng ngữ cảnh nhu cầu**. Thêm nữa, với địa điểm có bán vé, quy trình đặt vé, thanh toán và soát vé thường **bị xử lý rời rạc**, khó theo dõi trạng thái và khó xác minh vé. Từ đó em thấy cần một **nền tảng tập trung** gộp tra cứu, gợi ý, đặt vé, vé điện tử và quản trị vào cùng một hệ thống.

Để định vị đề tài, em có khảo sát các nền tảng đang tồn tại. **Google Maps và Foody** mạnh về tra cứu và đánh giá, nhưng không lọc theo độ tuổi trẻ em và không đặt vé. **Traveloka và Klook** làm tốt đặt vé và vé QR, nhưng phạm vi là du lịch nói chung. Có thể thấy **mỗi nền tảng mạnh ở một số nhóm chức năng riêng**, còn TheWeekend **hướng tới kết hợp** lọc theo độ tuổi, gợi ý, chatbot và vé QR trong cùng một hệ thống. Em xin nói rõ, đây là **phân tích đặc điểm chức năng**, **không phải khảo sát người dùng hay đo đạc định lượng**.

Mục tiêu của đồ án là xây dựng hệ thống web gợi ý địa điểm vui chơi cho trẻ em, đồng thời tích hợp đặt vé, thanh toán và soát vé điện tử trong cùng nền tảng. Phạm vi trải trên ba nhóm như trên slide: người dùng, quản trị viên và nhân viên.

Sang phần phân tích và thiết kế. Hệ thống có **bốn tác nhân**: **khách** chưa đăng nhập chỉ xem thông tin công khai; **người dùng** là nhóm chính, dùng hầu hết chức năng; **quản trị viên** quản lý dữ liệu và vé; còn **nhân viên** thì quét mã QR và check-in vé tại điểm đến.

Về kiến trúc, hệ thống theo mô hình **client–server**, tách frontend và backend, giao tiếp qua **REST API**. Có **hai client**: web **Vue 3** phục vụ cả người dùng lẫn trang quản trị, và **Android scanner** cho nhân viên soát vé — điều đáng nói là **cả hai đều gọi về cùng một backend**, em không viết lại logic hai lần. Backend kết nối ra **ba dịch vụ ngoài**: PayOS để thanh toán, Gemini API cho chatbot, và **Goong API** cho bản đồ và vị trí.

Đây là sơ đồ quan hệ các model chính. Em xin nói ba ý về thiết kế.

Về **nhóm địa điểm**: `Place` lấy `placeId` từ Goong làm khoá unique, nên khi đồng bộ dữ liệu không bị trùng địa điểm. Place cũng có sẵn `ageRange`, `price`, `tags` cùng các trường tiện ích — đây chính là những trường phục vụ **lọc theo độ tuổi và gợi ý**, tức là điểm khác biệt mà em đã nêu ở phần khảo sát.

Về **nhóm vé**: em tách riêng ba model **Booking, Payment và Ticket** vì ba thứ có vòng đời khác nhau — một đơn có thể thanh toán hụt rồi trả lại, còn vé thì chỉ được sinh ra sau khi trả tiền thành công. Điểm em muốn nhấn là **Booking lưu bản sao giá tại thời điểm đặt**: tên loại vé, đơn giá và thành tiền đều được chép vào trong đơn chứ không chỉ trỏ sang `TicketType`. Nhờ vậy, sau này địa điểm có đổi giá vé thì **đơn cũ vẫn giữ đúng giá lúc khách mua**.

Cuối cùng là hai chỗ phục vụ chống gian lận: **PaymentLog** có `idempotencyKey` đặt unique, và **Ticket** unique theo cặp `(booking, lineIndex)` nên không thể phát trùng vé. Ticket còn lưu `qrPayload`, `status`, `usedAt` và `checkedInBy` — tức là truy được ai đã soát vé và vào lúc nào. Em sẽ nói kỹ hơn về cơ chế này ở phần thanh toán.

Về công nghệ thì như trên slide: **Vue 3**, **Android scanner** với ZXing, backend Node.js và Express, MongoDB, xác thực JWT với bcrypt; tích hợp PayOS, Gemini API và **Goong API**.

Bây giờ em đi vào các chức năng chính, trước hết là **đăng nhập và phân quyền**. Hệ thống xác thực bằng **JWT**, hỗ trợ cả tài khoản thường lẫn đăng nhập Google; **mật khẩu băm bằng bcrypt chứ không lưu thô**. Điểm em muốn nhấn là **phân quyền có hai lớp**: phía client cũng có guard, nhưng **cái đó chỉ phục vụ trải nghiệm, không phải bảo mật**. Bảo mật thật nằm ở **middleware phía server** — mọi request phải qua `authenticate` để giải mã JWT, rồi kiểm vai trò. Nên kể cả gọi thẳng vào API mà không đủ quyền thì vẫn bị chặn.

Tiếp theo là **đặt vé và thanh toán qua PayOS** — chức năng trọng tâm của đồ án. Luồng như sau: khách chọn vé thì backend tạo đơn ở trạng thái **chờ thanh toán**, gọi sang PayOS lấy về **mã QR**; khách quét mã và trả tiền; sau đó **PayOS gọi webhook ngược về backend**, backend **kiểm tra chữ ký** rồi mới xác nhận đã thanh toán, tiếp đó **sinh vé QR** và gửi email.

Em xin nhấn bốn điểm. **Thứ nhất, không có xác nhận thủ công** — trạng thái đã thanh toán **chỉ có thể** đến từ webhook đã xác minh, em cố tình không làm endpoint kiểu “tôi đã trả tiền rồi”. **Thứ hai là verify chữ ký**: webhook được ký bằng **HMAC-SHA256**, backend tự tính lại và so sánh bằng **`timingSafeEqual`**, tức so sánh trong thời gian hằng số, để chống cả webhook giả lẫn tấn công đo thời gian. **Thứ ba là chống trùng và khớp tiền**: đơn đã “paid” thì bỏ qua, không xử lý lần hai — đây là tính **idempotency**; vé sinh bằng **upsert** nên webhook gọi hai lần cũng không tạo vé nhân đôi; còn số tiền thì **đối chiếu với database**, không tin con số client gửi lên. **Thứ tư là dự phòng**: đơn quá hạn tự chuyển hết hạn, và nếu webhook về chậm thì backend **tự chủ động hỏi lại PayOS**.

Đây là minh hoạ trên hệ thống thật: khách chọn vé, quét mã QR thanh toán, rồi nhận email chứa vé điện tử — và **vé chỉ được phát hành sau khi webhook PayOS đã được xác minh chữ ký**.

Về **soát vé**, nhân viên đăng nhập trên **Android scanner** rồi quét mã QR trên vé. Quy trình gồm **hai bước**: `verify` để xem trước trạng thái vé, rồi mới `use` để đánh dấu đã sử dụng — tách hai bước để tránh bấm nhầm làm mất vé của khách. Hệ thống **chống dùng vé hai lần**: vé đã dùng mà quét lại thì trả về lỗi 409; và **chống vé sai ngày**: ngày đi đã qua thì vé tự đánh dấu hết hạn. Một điểm hợp lý là **web và Android scanner dùng chung một API backend**.

Về **gợi ý địa điểm**, hệ thống lấy **vị trí GPS** của người dùng, tính khoảng cách tới từng địa điểm bằng **công thức Haversine** — tức khoảng cách trên mặt cầu Trái Đất, chứ không dùng khoảng cách phẳng, vì kinh độ vĩ độ không phải toạ độ phẳng. Sau đó **lọc trong bán kính mười ki-lô-mét** và **sắp xếp từ gần đến xa**.

Còn **chatbot** thì chạy **nhiều lớp**, chứ không phải câu nào cũng gọi AI. Những câu đơn giản — chào hỏi, hỏi đích danh một địa điểm, hay hỏi "chỗ nào có bơi", "chỗ nào miễn phí" — em **xử lý thẳng bằng code**, lấy dữ liệu từ database rồi ghép câu theo mẫu, **không gọi AI**: vừa nhanh, vừa tiết kiệm chi phí, và kết quả ổn định.

Chỉ những câu hỏi mở còn lại mới đi vào **RAG**: thay vì hỏi thẳng AI, hệ thống **đi tìm dữ liệu thật trong MongoDB trước, rồi mới đưa cho AI viết câu trả lời**, mục đích là hạn chế bịa. Bot **chấm điểm mức độ liên quan** của từng địa điểm theo tên, tag, từ khoá, rating và khoảng cách, rồi giữ lại những cái điểm cao nhất. Điểm quan trọng: nếu **không tìm được tài liệu nào liên quan** thì bot trả lời **“Không có dữ liệu”** và **dừng luôn, không gọi AI** — đây là lớp chống bịa thứ nhất. Lớp thứ hai nằm trong prompt, em ràng buộc Gemini chỉ được dùng đúng dữ liệu em cung cấp. Nói cách khác, **việc chọn địa điểm là do hàm chấm điểm em tự viết, còn Gemini chỉ viết lại cho tự nhiên**.

Về kết quả, em đã hoàn thiện hệ thống gồm **web người dùng, trang quản trị và Android scanner**, với đầy đủ các nhóm chức năng vừa trình bày. Bên phải là dashboard quản trị, dùng để theo dõi đơn vé và các giao dịch cần đối soát.

Em cũng thực hiện **kiểm thử nội bộ trên tập dữ liệu mẫu**. Về gợi ý, năm tiêu chí lọc đều đạt. Về chatbot, bốn câu hỏi trong phạm vi dữ liệu thì bot trả lời đúng cả bốn; bốn câu ngoài phạm vi thì bot **từ chối đúng cả bốn**, tức trả về “Không có dữ liệu” chứ không bịa. Tuy nhiên **em xin nói rõ giới hạn**: tập mẫu còn nhỏ và chạy trên dữ liệu cục bộ, nên tỷ lệ một trăm phần trăm ở đây **chỉ phản ánh việc hệ thống đáp ứng đúng chức năng trong phạm vi em kiểm thử**, **chưa đại diện cho độ chính xác tổng quát**. Đồ án **chưa có** khảo sát người dùng thật, chưa kiểm thử tải và hiệu năng.

Cuối cùng là kết luận. Về **hạn chế**: chưa khảo sát người dùng thực tế, chưa kiểm thử tải và hiệu năng. Về kỹ thuật, chatbot mới **khớp từ khoá chứ chưa dùng vector embedding**, và **nạp toàn bộ dữ liệu ở mỗi truy vấn** — dữ liệu nhỏ thì ổn nhưng DB lớn sẽ chậm. Việc hết hạn vé đang xử lý kiểu “lazy”, chưa có job chạy nền.

Về **hướng phát triển**, em dự định khảo sát người dùng thật và kiểm thử tải; chuyển chatbot sang **vector search**; bổ sung **job chạy nền** dọn đơn và vé hết hạn; thêm **rate-limit**; **bổ sung chi tiết các trò chơi trong từng địa điểm** để gợi ý sát với hoạt động mà trẻ thích, chứ không chỉ theo danh mục chung; và tiến tới cá nhân hoá gợi ý.

Phần trình bày của em đến đây là hết. Em xin cảm ơn thầy cô đã lắng nghe, và rất mong nhận được góp ý ạ.

---

### Ghi nhớ nhanh (đọc lướt trước khi vào phòng)

**Thứ tự:** chào & mục lục → đặt vấn đề → khảo sát nền tảng → mục tiêu & phạm vi → tác nhân → kiến trúc → cơ sở dữ liệu → công nghệ → đăng nhập & phân quyền → **PayOS** → minh hoạ luồng đặt vé → soát vé → gợi ý gần → chatbot → kết quả → kiểm thử → hạn chế & hướng phát triển → cảm ơn.

**Ba điểm phải nhấn:** (1) **thanh toán PayOS** — xác nhận chỉ qua webhook đã verify chữ ký, không làm tay; (2) **vé QR + Android scanner** — chống dùng vé hai lần, dùng chung API với web; (3) **chatbot RAG + gợi ý Haversine** — bám dữ liệu thật, không có thì trả "Không có dữ liệu".

**Hai chỗ phải chủ động nêu giới hạn** (nói trước khi thầy kịp hỏi): bảng khảo sát nền tảng là *phân tích đặc điểm chức năng*, không phải khảo sát định lượng; và tỷ lệ *100%* chỉ đúng trong phạm vi tập mẫu local.

**Thuật ngữ nói cho đúng:** **Vue 3** (không nói Vue.js) · **Goong API** (không nói Goong Maps) · **Android scanner** (không nói app Android).

---

### Slide phụ lục (đã ẩn — chỉ mở khi bị hỏi sâu)

Slide **25, 26, 27** đặt cờ *Hidden*, nên bấm Next ở slide Cảm ơn là kết thúc luôn, không lo lỡ tay chiếu vào. Khi cần thì đang trình chiếu **gõ số `26` rồi Enter**.

- **Slide 26** — Cơ chế chống gian lận thanh toán (HMAC · timingSafeEqual · idempotency · khớp tiền từ DB)
- **Slide 27** — Công thức Haversine & cách chấm điểm chatbot (`scoreDoc`)

---

### Câu hỏi hay gặp

> ⚠️ **HAI CÂU NGUY HIỂM NHẤT — học thuộc trước tiên**

**"Cơ chế *gợi ý* của em dựa trên cái gì? Đây có phải hệ gợi ý không?"** ← *nguy hiểm vì nằm ngay trong tên đề tài*
— Dạ em xin nói rõ phạm vi: "gợi ý" trong đồ án của em là **gợi ý theo ngữ cảnh vị trí và dữ liệu nội bộ**, **không phải hệ gợi ý cá nhân hoá** kiểu collaborative filtering.
Có hai cơ chế. Ở trang Gợi ý: lấy GPS → tính khoảng cách Haversine → lọc bán kính 10 km → sắp xếp gần đến xa → lọc theo danh mục. Trong chatbot: có **hàm chấm điểm `scoreDoc` em tự viết**, xếp hạng theo tên, tag, từ khoá, rating, lượt xem và khoảng cách.
Em **thừa nhận** đây mới ở mức **lọc và xếp hạng theo tiêu chí**, chưa cá nhân hoá theo từng người dùng. Cá nhân hoá theo lịch sử và độ tuổi của con là **hướng phát triển** em nêu ở slide cuối.

> *Bẫy kép:* ở bảng khảo sát em tự chấm "Có" ở ô *Gợi ý theo ngữ cảnh* còn Google Maps chỉ "Một phần" — thầy có thể vặn *"gợi ý của em còn đơn giản hơn Google Maps mà?"*
> → *"Ngữ cảnh ở đây em hiểu là **ngữ cảnh nuôi con** — dữ liệu địa điểm của em có `ageRange`, tag và tiện ích dành riêng cho trẻ em, đó là thứ Google Maps không có. Còn về **thuật toán xếp hạng** thì em thừa nhận đơn giản hơn họ ạ."*

**"Đóng góp của em là gì? Khác gì một web CRUD gọi API bên thứ ba?"** ← *câu kinh điển, đừng kể tính năng — hãy kể cái em TỰ làm*
— Dạ em xin nêu ba điểm.
**Một:** luồng nghiệp vụ **end-to-end chạy thật** — khách đặt vé, thanh toán thật qua PayOS, nhận vé QR qua email, nhân viên quét vé bằng Android scanner tại cổng. Ba vai trò phối hợp trong một hệ thống, không dừng ở mức quản lý dữ liệu.
**Hai:** phần **bảo mật giao dịch là em tự thiết kế**, không phải PayOS làm hộ — verify chữ ký HMAC, chống trùng bằng idempotency, khớp số tiền lấy từ database, và cưỡng chế bằng unique index ở tầng DB.
**Ba:** chatbot **không phải gọi thẳng Gemini** — việc chọn địa điểm do **hàm chấm điểm em tự viết**, Gemini chỉ viết lại; và có hai tầng chống bịa.

---

## 💳 THANH TOÁN PAYOS *(khối trọng tâm — hỏi nhiều nhất)*

**"Webhook là gì?"**
— Dạ webhook là cơ chế để PayOS **chủ động gọi ngược về backend** của em khi có sự kiện, thay vì em phải liên tục hỏi họ "khách trả tiền chưa". Em đăng ký trước một URL với PayOS; khi khách thanh toán xong, PayOS **gửi một HTTP POST** tới URL đó kèm thông tin giao dịch.
Nói nôm na: **polling là em gọi điện hỏi shipper "đến chưa?", còn webhook là shipper bấm chuông nhà em khi tới nơi.**

**"Vì sao phải verify chữ ký webhook?"**
— Vì URL webhook **nằm public trên Internet**, ai cũng gọi được. Nếu không kiểm tra, kẻ xấu chỉ cần tự gửi một POST giả *"đơn ABC đã thanh toán"* là **lấy được vé mà không trả đồng nào**.

**"Ký bằng khoá bí mật à? Verify bằng public key à?"** ← *đừng gật bừa*
— Dạ **không phải chữ ký số bất đối xứng**. Em dùng **HMAC-SHA256 — mã xác thực thông điệp dùng khoá bí mật chung** (`PAYOS_CHECKSUM_KEY`). PayOS và backend của em **cùng biết đúng một khoá đó**. PayOS ký bằng khoá đó, backend em **tính lại HMAC từ dữ liệu nhận được bằng chính khoá đó** rồi so sánh với chữ ký gửi kèm — khớp thì mới tin.
Khác với RSA/ECDSA: bên gửi ký bằng *private key*, bên nhận verify bằng *public key*, và bên nhận **không** tự tạo được chữ ký. Còn HMAC thì cả hai bên đều tạo được — nên nó chứng minh **thông điệp đến từ người biết khoá và không bị sửa**, nhưng **không có tính chống chối bỏ**. Với bài toán webhook thì như vậy là đủ.

**"Backend tính lại chữ ký thế nào? Sao phải `sort()`?"**
— Em lấy các key trong `data`, **sắp xếp theo a–z**, ghép thành chuỗi `key=value` nối bằng `&`, rồi HMAC-SHA256 chuỗi đó bằng `checksumKey`.
Phải `sort()` vì **hai bên bắt buộc dựng ra cùng một chuỗi y hệt** thì mới cho cùng chữ ký — mà thứ tự key trong JSON không được đảm bảo, nên phải chuẩn hoá.

**"`timingSafeEqual` để làm gì?"**
— So sánh bằng `==` thì thời gian so sánh **phụ thuộc vào số ký tự đầu khớp được**; kẻ tấn công đo thời gian phản hồi có thể dò dần ra chữ ký. `timingSafeEqual` so sánh trong **thời gian hằng số**, không rò rỉ thông tin đó.

**"Em tự gọi API báo 'đã thanh toán' được không?"**
— Dạ **không**, em **không làm endpoint đó**. Trạng thái `paid` **chỉ** được đặt bên trong `markPaymentPaid`, mà hàm này **chỉ được gọi từ webhook đã verify chữ ký**.

**"Số tiền so khớp lấy từ đâu?"**
— Từ **database** (`booking.totalAmount`), **không tin số tiền client gửi lên**. Lệch tiền thì đánh `failed`, **không phát vé**.

**"Webhook gọi hai lần thì sao?"**
— Có **idempotency**: đơn đã `paid` thì bỏ qua, không xử lý lần hai. Vé sinh bằng `findOneAndUpdate` + `upsert` theo `(booking, lineIndex)` nên không tạo trùng. Và quan trọng là **cặp đó có unique index ở database**, cùng với `PaymentLog.idempotencyKey` unique — nên **kể cả code có bug thì DB vẫn chặn**.

**"Webhook chậm hoặc không tới thì sao?"**
— Có **polling dự phòng**: frontend hỏi trạng thái, backend **tự gọi lại PayOS** để đối chiếu. Tức là em dùng **cả hai** — webhook là chính, polling là lưới an toàn. Ngoài ra đơn quá `expiresAt` (mặc định 60 phút) thì tự chuyển `expired`.

**"Nếu lộ `PAYOS_CHECKSUM_KEY` thì sao?"**
— Thì kẻ xấu **tự ký được webhook giả** và lấy vé miễn phí. Nên khoá này em để trong **biến môi trường**, không commit lên Git.

---

## 🎫 VÉ & SOÁT VÉ

**"Chống dùng vé hai lần — hai máy quét cùng lúc thì sao?"** ← *lỗ thật trong code, đừng chối*
— Dạ hiện em kiểm tra trạng thái rồi mới ghi, hai bước tách rời, nên **về lý thuyết vẫn có race condition** nếu hai máy quét đúng cùng một thời điểm. Cách khắc phục là dùng `findOneAndUpdate` với điều kiện `status` đặt ngay trong câu lệnh, để MongoDB đảm bảo nguyên tử ở cấp document. Đây là điểm em cần sửa ạ.

**"Vé quá ngày mà không ai quét thì có tự hết hạn không?"**
— Dạ **chưa tự động**, em xử lý kiểu **lazy**: chỉ đánh `expired` khi có người quét mà thấy ngày đã qua. Không ai quét thì vẫn ở trạng thái cũ trong DB **nhưng cũng không dùng được**. Hướng cải thiện là làm **job nền** — em có ghi ở slide hạn chế.

**"Mã QR có bị làm giả không?"**
— Mã QR chỉ chứa `ticketCode` dạng JSON, **không ký**. An toàn dựa vào việc `ticketCode` khó đoán (32 bit ngẫu nhiên) và **luôn được đối chiếu với database**. Nhưng em thừa nhận: **ai chụp màn hình vé là dùng được** — giống vé xem phim. Muốn chặt hơn thì phải ký mã QR hoặc ràng buộc với danh tính người dùng.

**"Nhân viên ở địa điểm A có soát được vé của địa điểm B không?"**
— Dạ **hiện tại là có** — em mới phân quyền theo vai trò `staff`, **chưa gắn nhân viên với địa điểm cụ thể**. Đây là hạn chế; hướng khắc phục là thêm trường `place` vào tài khoản nhân viên và kiểm tra vé có thuộc địa điểm đó không.

---

## 🗄️ CƠ SỞ DỮ LIỆU

**"Sao `Booking` lại chép lại tên và giá vé, trong khi đã có `ref` sang `TicketType` rồi? Lặp dữ liệu vậy?"**  ← *câu hay hỏi nhất về CSDL*
— Dạ đây là **lặp có chủ đích**. Nếu đơn chỉ trỏ sang `TicketType`, thì hôm nay địa điểm tăng giá vé, hoá đơn khách mua từ tháng trước cũng **đổi giá theo** — sai nghiệp vụ và không đối soát được với số tiền đã thu qua PayOS. Nên em chụp lại `name`, `unitPrice`, `lineTotal` vào trong đơn tại thời điểm đặt. Vẫn giữ `ref` để biết đơn thuộc loại vé nào, nhưng **con số tiền thì đóng băng**.

**"Sao không gộp Booking, Payment, Ticket làm một?"**
— Vì ba thứ có **vòng đời khác nhau**. Một đơn có thể thanh toán hụt rồi thanh toán lại, nên `Booking` và `Payment` phải tách. Còn `Ticket` chỉ được sinh ra *sau khi* thanh toán thành công — nếu gộp thì không phân biệt được "đơn đã tạo" với "vé đã phát hành".

**"Có đánh index không?"**
— Dạ có. **Ba unique index để cưỡng chế nghiệp vụ**: `Ticket(booking, lineIndex)`, `PaymentLog(idempotencyKey)`, `Payment(provider, orderRef)`. Ngoài ra có index phục vụ truy vấn: `Booking(user, createdAt)` để xem đơn của tôi, `Booking(place, visitDate)` để tra đơn theo địa điểm và ngày, và `expiresAt` có index để tìm đơn quá hạn.

**"MongoDB không có khoá ngoại, làm sao đảm bảo toàn vẹn?"**
— Dạ đúng, MongoDB không cưỡng chế khoá ngoại. Em dùng `ObjectId` với `ref` của Mongoose để tham chiếu và `populate` khi cần. Phần ràng buộc nghiệp vụ quan trọng nhất — chống trùng vé và trùng webhook — thì em cưỡng chế bằng **unique index**, là thứ MongoDB có hỗ trợ thật.

**"Sao `TicketType` tách khỏi `Place`?"**
— Vì một địa điểm có nhiều loại vé (người lớn, trẻ em), mỗi loại có giá và trạng thái `active` riêng. Tách ra thì có thể ngừng bán một loại vé mà không phải xoá dữ liệu, và các vé đã bán vẫn giữ được tham chiếu.

**"Trường `nameNorm` trong `Tag` để làm gì?"**
— Là tên đã chuẩn hoá (viết thường, bỏ dấu), dùng để khớp từ khoá tiếng Việt cho tìm kiếm và chatbot, vì người dùng có thể gõ không dấu.

---

## 🤖 CHATBOT

**"Chatbot có fix cứng câu trả lời không, hay tất cả đều do AI sinh?"**  ← *đừng trả lời sai chỗ này*
— Dạ **có cả hai**. Em chia làm nhiều lớp: chào hỏi thì trả về câu cố định viết sẵn trong code (`getSmallTalkAnswer`); hỏi đích danh một địa điểm, hoặc hỏi "chỗ nào có bơi / miễn phí" thì em **lọc từ database rồi ghép câu theo mẫu** (`getDirectRecommendation`) — cả ba lớp này **không gọi AI**. Chỉ những câu hỏi mở còn lại mới đi vào RAG và đưa cho Gemini viết.
Em làm vậy vì ba lý do: **nhanh hơn**, **rẻ hơn** (không tốn token), và **ổn định hơn**. Khi Gemini lỗi thì có `generateFallbackAnswerFromDocs` tự ghép câu từ dữ liệu để bot không chết.

**"Ở tầng Gemini thì em có fix cứng form trả lời không?"**
— **Không ạ.** Em đưa dữ liệu đã truy hồi vào prompt và **để Gemini tự viết**. Cái em kiểm soát là **luật trong prompt**: chỉ được dùng CONTEXT em cung cấp, không dùng kiến thức ngoài, không có dữ liệu thì trả đúng chữ "Không có dữ liệu", trả lời 1–3 câu ngắn.
Lưu ý: các **card địa điểm** hiện bên dưới câu trả lời là do **backend trả về từ DB**, không phải Gemini sinh.

**"Chatbot có dùng vector embedding không?"**
— **Không ạ.** Em chỉ khớp **từ khoá, tag và khoảng cách**. Việc **chọn** địa điểm là do **hàm chấm điểm em tự viết** (`scoreDoc`); Gemini chỉ **viết lại** cho tự nhiên. Vector search là hướng phát triển.

**"Làm sao chắc bot không bịa?"**
— **Hai tầng**: `hasRelevantContext` chặn **trước khi gọi AI** — không có tài liệu liên quan thì trả "Không có dữ liệu" và dừng; và **HARD RULES trong prompt** ép Gemini chỉ dùng CONTEXT em đưa.

**"Điểm yếu của cách truy hồi?"**
— Nó **load toàn bộ Place và toàn bộ review mỗi lần hỏi** — dữ liệu nhỏ thì ổn, DB lớn sẽ chậm. Hướng cải thiện là đánh index, lọc trước ở DB, hoặc dùng vector search.

---

## 📍 GỢI Ý & HAVERSINE

**"6371000 là gì?"** — Bán kính Trái Đất, tính bằng mét.

**"Sao không dùng căn của delta x bình phương cộng delta y bình phương?"**
— Vì **Trái Đất cong**, kinh độ và vĩ độ **không phải toạ độ phẳng** nên tính vậy sẽ sai, nhất là khi khoảng cách lớn.

---

## 🔐 BẢO MẬT & TÀI KHOẢN

**"Guard ở frontend chặn được hacker không?"**
— **Không ạ**, đó chỉ để điều hướng cho đẹp. Gọi thẳng API vẫn bị **middleware phía server** chặn: `authenticate` kiểm JWT, `requireAdmin` kiểm vai trò.

**"Mật khẩu lưu thế nào?"**
— **Băm bằng bcrypt, salt round 10**, không lưu thô. Salt round 10 tức 2¹⁰ vòng băm, cân bằng giữa an toàn và tốc độ.

**"Mã OTP sáu số, thử nhiều lần thì sao?"**
— Dạ em **thừa nhận hiện chưa có rate-limit**, đây là điểm yếu và em có ghi trong hướng phát triển.

---

## 📊 KHẢO SÁT & ĐÁNH GIÁ

**"Trong bảng khảo sát, 'Một phần' nghĩa là gì?"**  ← *chắc chắn bị hỏi*
— Dạ ba mức này em định nghĩa trong báo cáo: **"Có"** là hỗ trợ **rõ ràng**; **"Một phần"** là hỗ trợ **hạn chế hoặc gián tiếp**; **"Không"** là **không phải trọng tâm** của nền tảng — chứ không phải họ hoàn toàn không làm được.
Ví dụ Klook em để *"Một phần"* ở lọc độ tuổi vì họ có phân **vé người lớn / vé trẻ em**, nhưng đó là để **tính giá** chứ không phải bộ lọc *"địa điểm này hợp với bé mấy tuổi"*. Foody ở ô đặt vé là *"Một phần"* vì họ **đặt bàn/đặt chỗ**, không bán vé vào cổng.
Em xin nói rõ, đây là **phân tích đặc điểm chức năng**, **không phải đo đạc định lượng** — em có ghi giới hạn này trong báo cáo ạ.

> *Nếu thầy đưa phản ví dụ ("Klook có tính năng đó rồi đấy"): đừng cãi. Nhận ngay — "Vâng ạ, đây là đánh giá định tính nên có thể chưa cập nhật hết tính năng mới của họ."*

**"Sao kết quả toàn 100%?"**
— Dạ vì **tập mẫu nhỏ và chạy trên dữ liệu local**, em có ghi rõ giới hạn ngay trên slide. Con số đó chỉ nói lên hệ thống **đáp ứng đúng chức năng trong phạm vi em kiểm thử**, **không phải độ chính xác tổng quát**. Muốn kết luận chắc chắn thì cần khảo sát người dùng thật và bộ dữ liệu chuẩn — đó là hướng phát triển của em.

---

### Mở code nhanh khi bị hỏi

- `ticketingService.js` → `createBooking:320` · `handlePayosWebhook:586` · `markPaymentPaid:483` · `verifyPayosWebhook:56`
- `middleware/auth.js` → `authenticate:17` · `requireAdmin:37` · `requireStaffOrAdmin:61`
- `chatbotService.js` → `answerQuestion:704` · `retrieveDocs:397` · `scoreDoc:367` · `hasRelevantContext:473`
- `SuggestPage.vue` → `calculateDistance:310` (dòng `R = 6371000` là 317)

**Nguyên tắc:** nói ý chính trước, mở code sau. Không biết thì nhận, đừng chém.
