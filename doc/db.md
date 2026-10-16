# HUST FoodMap — thiết kế database dự kiến, giai đoạn 1

> Bản thiết kế bảng/cột/ràng buộc/index cụ thể sau lệnh “thiết kế db” được lưu tại [schema-design.md](schema-design.md). File này giữ bối cảnh và các quy tắc đã trao đổi; chưa có DB thực tế được tạo.

> **Cập nhật 13/10/2026:** người dùng đã chốt PostgreSQL và yêu cầu viết bảng. Schema SQL đã viết tại [001_phase1.sql](../database/001_phase1.sql), hướng dẫn và kết quả kiểm thử tại [database/README.md](../database/README.md). Đã kiểm thử trên PostgreSQL nhúng tạm; chưa chạy vào database ứng dụng. Các đoạn “chưa có lệnh tạo DB” bên dưới ghi trạng thái của cuộc trao đổi trước lệnh này; không phủ nhận quyền viết schema SQL mới được cấp.

Ngày tổng hợp: 13/10/2026 (Asia/Saigon).

**Trạng thái: tài liệu thiết kế để trao đổi, chưa triển khai và chưa phải schema cuối cùng.** Không có SQL, migration, bảng thực tế hoặc thay đổi code ứng dụng được tạo. Chỉ triển khai khi người dùng ra lệnh tạo DB rõ ràng.

Yêu cầu sản phẩm và toàn bộ các điểm đã chốt/chưa chốt nằm trong [farse 1.md](<farse 1.md>). Trong tài liệu này, quy tắc nghiệp vụ đã chốt được phân biệt với **mô hình bảng/thuộc tính đề xuất**. Người dùng chưa chọn hệ quản trị DB, ORM, nhà cung cấp hay cách lưu ảnh. Các tên bên dưới là tên logic để thảo luận, có thể thay đổi.

## 1. Các nguyên tắc đã chốt

- Quán/menu do chủ hệ thống/admin quản lý; chi nhánh là quán riêng.
- Quán/món ngừng hoạt động/ngừng bán giữ lịch sử.
- Email/mật khẩu, xác minh email, đặt lại mật khẩu qua email; email duy nhất và riêng tư, tên hiển thị được trùng.
- Chủ hệ thống mới cấp/gỡ admin; admin được xử lý báo cáo, ẩn nội dung và khóa tài khoản.
- Đánh giá quán và món độc lập, điểm 1–5 theo bước 0,5; một đánh giá hiện tại/người/đối tượng.
- Lưu phiên bản bất biến với sao, nội dung, ảnh và thời điểm; lịch sử chỉ chủ đánh giá xem.
- Mỗi người đóng góp điểm cuối cùng trong tháng cho mỗi đối tượng, không mang điểm cũ sang tháng không có hoạt động.
- Tự xóa đánh giá bỏ khỏi điểm hiện tại nhưng giữ tháng trước; ẩn vì vi phạm loại khỏi mọi thống kê công khai.
- Quán đã lưu riêng tư; quán ruột riêng biệt, công khai theo từng quán, mặc định riêng tư; có lời giới thiệu và nhiều món nên thử.
- Một kế hoạch còn hiệu lực/tài khoản, hôm nay, 1–20 người mặc định 1; tổng người nhập không cộng người tạo.
- Kế hoạch chưa tới giờ vẫn tính vào tổng công khai; dữ liệu kế hoạch riêng tư.
- Tự hết hiệu lực theo thời lượng chụp tại lúc tạo, giới hạn bởi giờ đóng cửa; quán ngừng hoạt động tự hủy lịch và thông báo.
- Thông báo trong app; nhắc giờ đến, báo độ đông và theo dõi vị trí để sau.

## 2. Sơ đồ quan hệ logic

```text
users ──< auth_sessions / auth_tokens
users ──< saved_restaurants >── restaurants
users ──< favorite_restaurants >── restaurants
favorite_restaurants ──< favorite_dishes >── dishes
restaurants ──< dishes ──< dish_options
dishes ──< dish_category_links >── dish_categories
users ──< reviews >── restaurants hoặc dishes
reviews ──< review_versions ──< review_version_images >── media_assets
users ──< visit_plans >── restaurants
users ──< content_reports >── reviews hoặc favorite_restaurants
content_reports / nội dung ──< moderation_actions
users ──< notifications
admin/owner ──< audit_events
```

Đây là sơ đồ khái niệm; số bảng và cách hiện thực khóa ngoại chưa chốt. Khi có hai loại đối tượng, phải ràng buộc rõ đối tượng hợp lệ, không chỉ dùng một ID tự do không thể kiểm tra tham chiếu.

## 3. Nhóm tài khoản và quyền — đề xuất

| Thực thể | Thuộc tính chính dự kiến | Ràng buộc/ghi chú |
|---|---|---|
| `users` | ID, email chuẩn hóa, password hash, tên hiển thị, ảnh đại diện, mốc xác minh email, vai trò, trạng thái khóa, mốc tạo/cập nhật | Email duy nhất; không lưu mật khẩu rõ; không trả email/hash qua hồ sơ công khai |
| `auth_sessions` | User, thông tin phiên, mốc hết hạn/thu hồi | Đề xuất cho đăng xuất/thu hồi phiên; cách xác thực chưa chốt |
| `auth_tokens` | User, mục đích xác minh/reset, token hash, hết hạn, đã dùng | Token một lần; thiết kế logic cho hai luồng email đã chốt |
| `audit_events` | Người thao tác, hành động, đối tượng, thời điểm, thay đổi cần truy vết | Đề xuất ghi cấp/gỡ admin, khóa, sửa quán/menu và thao tác quản trị |

Vai trò logic: `owner`, `admin`, `user`. Trạng thái email và trạng thái khóa là hai trục riêng, không gộp thành một cờ gây mất thông tin. Quyền khóa/gỡ khóa và tác động lên phiên/nội dung cần bàn tiếp. Chưa chốt xóa tài khoản và chính sách giữ dữ liệu.

## 4. Nhóm quán và menu — đề xuất

| Thực thể | Thuộc tính chính dự kiến | Quy tắc |
|---|---|---|
| `restaurants` | ID, tên, địa chỉ, tọa độ, thumbnail, giờ mở/đóng cố định, thời lượng ghé mặc định, trạng thái, mốc tạo/cập nhật | Địa chỉ/tọa độ cần cho map nhưng danh sách trường nhập chính thức chưa chốt; thời lượng có thể chỉnh |
| `dishes` | ID, quán, tên, mô tả, ảnh, trạng thái bán, mốc tạo/cập nhật | Mỗi món thuộc đúng một quán; một ảnh riêng; giữ ID khi đổi tên/giá |
| `dish_options` | ID, món, tên lựa chọn, giá, thứ tự hiển thị, trạng thái nếu cần | Nhiều lựa chọn/món; đánh giá không gắn vào lựa chọn |
| `dish_categories` | ID, tên nhóm, thứ tự/trạng thái nếu cần | Nhóm món do admin quản lý là đề xuất, quyền quản lý nhóm chưa hỏi riêng |
| `dish_category_links` | Món, nhóm | Quan hệ nhiều–nhiều, không trùng cặp |
| `media_assets` | ID, khóa lưu trữ/đường dẫn, loại MIME, kích thước, người tải, trạng thái | Đề xuất lưu metadata trong DB, file ở dịch vụ lưu trữ; nhà cung cấp chưa chọn |

### Giá và giờ hoạt động

- Khoảng giá quán được **tính** từ MIN/MAX giá lựa chọn của các món đang bán, không dùng trường giá admin nhập độc lập làm nguồn chuẩn.
- Nếu dùng giá tổng hợp/cache thì phải có cách cập nhật khi món/giá/trạng thái thay đổi; cache không phải nguồn dữ liệu gốc.
- Khi không có món đang bán, cần chốt hiển thị không có giá thay vì 0 đồng.
- Cần chốt lựa chọn có thể tạm ngừng bán riêng không, giá là VND cố định hay nhiều tiền tệ, có món miễn phí không.
- Giờ cố định áp dụng mỗi ngày. Trường hợp qua nửa đêm và ngày đóng đặc biệt chưa chốt; không tự thêm lịch tuần vào giai đoạn 1.
- Quán ngừng hoạt động và quán đang ngoài giờ mở cửa là hai trạng thái khác nhau; không tự hủy lịch vì quán tạm ngoài giờ hiện tại.

## 5. Nhóm đánh giá và phiên bản — đề xuất

### Thực thể

| Thực thể | Thuộc tính chính dự kiến | Ý nghĩa |
|---|---|---|
| `reviews` | ID, người viết, quán hoặc món, phiên bản hiện tại, trạng thái công khai/xóa/ẩn, mốc tạo/xóa/ẩn | Một “gốc đánh giá” để nhận diện quan hệ người–đối tượng qua các lần sửa |
| `review_versions` | ID, review, thứ tự phiên bản, điểm, nội dung tùy chọn, thời điểm, lý do/sự kiện nếu cần | Phiên bản bất biến; không ghi đè bản cũ |
| `review_version_images` | Phiên bản, media, thứ tự ảnh | Snapshot bộ ảnh của từng phiên bản, không liên kết tất cả phiên bản vào một danh sách ảnh có thể sửa |
| `review_reconsideration_requests` | Review, phiên bản yêu cầu xét lại, người gửi, trạng thái, người xử lý/lý do/thời điểm | Đề xuất hiện thực luồng xét lại đã chốt |

### Bảo toàn dữ liệu

- Một review chỉ nhắm **quán hoặc món**, không đồng thời cả hai. Nếu tách hai bảng review quán/món thay vì một bảng chung thì giữ nguyên cùng quy tắc.
- Ràng buộc duy nhất người–quán và người–món cho đánh giá hiện tại; tránh tạo hai bản hiện tại bằng hai request đồng thời.
- Đề xuất giữ một gốc review cho người–đối tượng khi xóa rồi đánh giá lại, append phiên bản/sự kiện mới; cách hiện thực chưa chốt.
- Điểm chỉ thuộc tập 1; 1,5; …; 5. Có thể lưu số bước nửa sao nguyên 2–10 hoặc số thập phân chính xác; không dùng giá trị dấu phẩy động làm chuẩn.
- Bản mới hiện ngay trừ review đang bị ẩn; sửa review bị ẩn không tự gỡ ẩn.
- Admin không sửa phiên bản người dùng. Ẩn/gỡ ẩn/xét lại là sự kiện quản trị riêng có lý do.
- Xóa là xóa khỏi công khai, không xóa vật lý phiên bản trong thiết kế hiện tại, vì lịch sử và điểm tháng trước cần giữ.
- Nếu user bỏ ảnh khi sửa, ảnh cũ vẫn được tham chiếu bởi phiên bản cũ; không xóa file còn được lịch sử dùng.
- Cần giới hạn ảnh nhưng số 5 chưa chốt. Giới hạn kích thước, định dạng và thời gian lưu ảnh cũng chưa chốt.

### Quyền đọc

- Chủ đánh giá: xem các phiên bản và lịch sử sao/nội dung/ảnh của mình.
- Người khác: bản đang công khai, không truy xuất lịch sử qua API/URL ảnh lịch sử ngoài quyền được phép.
- Email không được lộ khi join hồ sơ người đánh giá.
- Admin xử lý nội dung/báo cáo; phạm vi đọc toàn bộ lịch sử riêng tư cần quy định riêng, không mặc định công khai.

## 6. Thống kê sao hiện tại và theo tháng

### Nguồn dữ liệu

`review_versions` và trạng thái/sự kiện của review là nguồn chuẩn. Có thể tính trực tiếp hoặc có bảng tổng hợp sau khi chốt quy mô; không coi số trung bình cache là dữ liệu gốc duy nhất.

| Chỉ số | Quy tắc đã chốt |
|---|---|
| Điểm hiện tại | Trung bình điểm bản hiện tại của các review công khai, chưa tự xóa, chưa bị ẩn |
| Điểm tháng | Mỗi người/đối tượng lấy lần chấm hoặc sửa sao cuối cùng của tháng, không đếm mỗi phiên bản thành một người |
| Không hoạt động tháng đó | Không tự mang điểm tháng cũ vào |
| Số người đánh giá | Đếm người đóng góp hợp lệ, không đếm số lần sửa |
| Tự xóa | Loại khỏi điểm hiện tại, giữ đóng góp của các tháng trước |
| Admin ẩn vì vi phạm | Loại khỏi điểm hiện tại và mọi tháng, kể cả tháng đã kết thúc |
| Tháng đang diễn ra | Ghi “tính đến hiện tại”, hiển thị số người của cả hai tháng khi so sánh |
| Không dữ liệu | “Chưa có dữ liệu”, không giả lập 0 sao |

### Thiết kế tổng hợp đề xuất

- Nếu cần bảng `review_monthly_contributions`, khóa logic gồm **người, đối tượng, tháng**; lưu phiên bản đóng góp cuối cùng, điểm và thông tin đủ để áp dụng ẩn/xóa.
- Điểm tháng không được khóa theo review ID đơn thuần: xóa rồi tạo lại không được tính người đó hai lần.
- Nếu có `rating_monthly_stats`, lưu tổng điểm và số người; điểm trung bình là giá trị dẫn xuất. Luôn có thể rebuild từ phiên bản/sự kiện.
- “Đã kết thúc tháng” không có nghĩa bất biến tuyệt đối: admin ẩn vì vi phạm có thể làm tháng cũ thay đổi theo yêu cầu.
- Múi giờ phân tháng đề xuất Asia/Saigon; lưu các thời điểm có múi giờ/UTC và phân tháng theo múi giờ nghiệp vụ, không lấy múi giờ máy chủ tùy ý.

### Chưa chốt trước triển khai

1. Tự xóa trong tháng đang diễn ra giữ hay bỏ đóng góp tháng đó.
2. Sửa chỉ nội dung/ảnh mà không đổi sao có được coi là đóng góp mới trong tháng không.
3. Gỡ ẩn khôi phục điểm tháng nào và phiên bản nào được coi hợp lệ.
4. Các vòng xóa/đánh giá lại trong cùng tháng và tháng sau.
5. Delta, làm tròn, mẫu tối thiểu, quyền xem biểu đồ của khách.

## 7. Quán đã lưu và quán ruột — đề xuất

| Thực thể | Thuộc tính chính dự kiến | Ràng buộc |
|---|---|---|
| `saved_restaurants` | User, quán, thời điểm lưu | Duy nhất cặp user–quán; luôn riêng tư |
| `favorite_restaurants` | ID, user, quán, công khai/riêng tư, lời giới thiệu, trạng thái kiểm duyệt, mốc tạo/cập nhật | Duy nhất cặp user–quán; mặc định riêng tư; độc lập với đã lưu |
| `favorite_dishes` | Mục quán ruột, món, thứ tự | Chọn nhiều món; món phải thuộc chính quán của mục quán ruột; không trùng cặp |

- Nhiều người có thể chọn cùng một quán; không cần bảng “đề xuất quán mới” hay hàng đợi duyệt quán.
- Chủ tài khoản xem cả mục riêng tư/công khai; người khác chỉ xem mục công khai hợp lệ.
- Lời giới thiệu được báo cáo/ẩn. Cần chốt ẩn cả mục hay chỉ văn bản, và luồng xét lại.
- Khi món nên thử ngừng bán, giữ tham chiếu lịch sử hay tự bỏ khỏi hiển thị cần chốt; không xóa món vật lý làm mất liên kết.

## 8. Kế hoạch ghé quán — đề xuất

`visit_plans`: ID, user, quán, số người, giờ đến, thời lượng chụp lúc tạo, giờ đóng cửa hoặc mốc kết thúc chụp nếu cần, giờ hết hiệu lực, trạng thái, lý do hủy, ai hủy, mốc tạo/cập nhật/hủy.

### Quy tắc dữ liệu

- Số người nguyên 1–20, mặc định 1; không cộng người tạo.
- Giờ đến trong hôm nay theo múi giờ nghiệp vụ và trong giờ hoạt động.
- Hết hiệu lực = MIN(giờ đến + thời lượng snapshot, mốc đóng cửa áp dụng).
- Đổi thời lượng quán không làm thay đổi lịch đã tạo. Cần chốt snapshot khi user sửa lịch và khi admin đổi giờ hoạt động.
- Trạng thái logic đề xuất: còn hiệu lực, đã hủy, hết hiệu lực; chưa cần `arrived`, `left` hay tự xác định vị trí.
- Mỗi user tối đa một kế hoạch còn hiệu lực trên toàn hệ thống, không chỉ theo quán/ngày/khung giờ.
- Duy trì ràng buộc này bằng transaction/ràng buộc phù hợp; không chỉ kiểm tra ở UI trước khi insert.
- Kế hoạch hết hạn phải bị loại khỏi phép đếm bằng thời điểm thực tế, dù job cập nhật trạng thái chạy chậm.

### Phép đếm công khai

Với quán R và thời điểm hiện tại T: tổng `party_size` của các kế hoạch tại R chưa hủy và **T < expires_at**. Kế hoạch có giờ đến sau T vẫn được tính. Không thêm điều kiện “đã tới giờ đến” làm thay đổi yêu cầu.

Ví dụ T=11:00: A có 3 người đến 12:00; B có 2 người đến 10:45, hết hạn 11:30 → tổng 5.

- Không trả user ID/tên/chi tiết kế hoạch qua endpoint số tổng.
- Đây là số người **dự kiến**, không phải lượng khách hiện diện hay báo độ đông.
- Chỉ có số tổng tại hiện tại; không có xem số tổng theo giờ tương lai.

### Hủy do ngừng hoạt động

Khi admin ngừng hoạt động quán: cập nhật trạng thái quán, hủy lịch còn hiệu lực với lý do và tạo thông báo trong một luồng nhất quán. Cần bảo vệ cuộc đua tạo lịch mới cùng lúc đóng quán và tránh gửi thông báo lặp. Đây là đề xuất kỹ thuật để bảo đảm quy tắc đã chốt, chưa có job/trigger thực tế.

## 9. Báo cáo, kiểm duyệt và thông báo — đề xuất

| Thực thể | Thuộc tính chính dự kiến | Ý nghĩa |
|---|---|---|
| `content_reports` | ID, người báo, review hoặc lời giới thiệu quán ruột, nhóm lý do, mô tả tùy chọn, trạng thái, người xử lý, kết luận/lý do/thời điểm | Một báo cáo chờ/người/nội dung; mục tiêu có khóa ngoại kiểm tra được |
| `moderation_actions` | Nội dung/tài khoản, admin, loại hành động, lý do, thời điểm | Truy vết ẩn, cho hiện, bác, khóa, xét lại; không sửa review version |
| `notifications` | ID, người nhận, loại, đối tượng liên quan, nội dung tối thiểu, mốc tạo/đọc | Trong app; trạng thái đã đọc là đề xuất chưa hỏi riêng |

Lý do báo cáo đã chốt: spam, xúc phạm, thông tin sai, ảnh không phù hợp, lý do khác. Admin bác hoặc ẩn và ghi lý do. Người báo nhận kết quả; tác giả nhận thông báo khi bị ẩn. Khóa tài khoản ngăn chức năng cần đăng nhập; chính sách nội dung/lịch đang có cần chốt.

Loại thông báo đã chốt:

- Kế hoạch bị hủy vì quán ngừng hoạt động.
- Đánh giá/lời giới thiệu bị ẩn.
- Báo cáo vi phạm đã xử lý.

Không mặc định thêm thông báo reminder, email nghiệp vụ hoặc gỡ ẩn vào phạm vi đã chốt. Xác minh/reset email thuộc xác thực, không phải thông báo trong app.

## 10. Định hướng kỹ thuật chưa phải quyết định

- Mô hình quan hệ phù hợp cho các liên kết quán–món–người–phiên bản; **chưa chốt PostgreSQL hay hệ quản trị khác**.
- Nếu chọn PostgreSQL: dùng khóa ngoại và ràng buộc kiểm tra phù hợp, kiểu số chính xác cho giá/điểm, thời điểm có múi giờ; rà index cho FK và truy vấn thực tế. Đây là hướng thiết kế tham khảo, không phải schema đã tạo.
- Các điểm truy vấn cần xét index: email; menu theo quán/trạng thái; đánh giá theo đối tượng/trạng thái; phiên bản theo review/thời gian; kế hoạch theo user/trạng thái và quán/hết hạn; thông báo theo người nhận/thời gian; báo cáo theo trạng thái.
- Không tự quyết UUID/bigint, enum/check, SQL trigger/job, RLS, ORM hoặc nhà cung cấp auth trước khi chốt stack.
- Không lưu nội dung nghiệp vụ nhạy cảm vào API công khai theo mặc định; phân quyền ở backend, không chỉ ẩn UI.
- Các thao tác đa bước như tạo phiên bản review, xóa/ẩn + đổi thống kê, cấp quyền, đóng quán + hủy lịch + thông báo cần tính nhất quán và chống thao tác đồng thời.
- Không lưu chuỗi mật khẩu/token rõ; không lưu file ảnh trực tiếp làm lựa chọn mặc định khi chưa bàn cách lưu trữ.
- Chính sách backup, lưu giữ, xóa tài khoản, token/session và mã hóa cần bàn ở bước triển khai.

## 11. Các bảng/tính năng không đưa vào giai đoạn 1

- Báo cáo độ đông, tổng hợp vắng/vừa/đông và thời hạn hiệu lực báo cáo.
- Theo dõi vị trí lịch sử, tự đánh dấu đến/rời.
- Nhắc trước giờ đến.
- Đặt chỗ cần chủ quán xác nhận, chủ quán tự quản lý.
- Đề xuất tạo quán/món mới, hàng đợi duyệt đề xuất, danh sách người gửi đề xuất.
- Lịch mở cửa theo tuần/nhiều ca chưa được yêu cầu.

## 12. Trạng thái chốt và bước tiếp theo

Yêu cầu sản phẩm chính đã được lưu; tên bảng và cách triển khai trong tài liệu là **đề xuất để bàn tiếp**. Cần chốt các mục mở tại [farse 1.md](<farse 1.md>), đặc biệt thống kê khi xóa/ẩn, giới hạn ảnh và các trường hợp kế hoạch.

Chưa có lệnh tạo DB. Không dùng tài liệu này làm sự cho phép tự triển khai. Khi người dùng yêu cầu, tiếp tục trao đổi; chỉ bắt đầu tạo schema/migration/database sau lệnh rõ ràng.
