# HUST FoodMap — schema DB giai đoạn 1

Ngày: 13/10/2026. Cập nhật: **PostgreSQL đã được người dùng chốt**; schema SQL đã viết và kiểm thử trên PostgreSQL tạm, chưa tạo DB ứng dụng. Xem [001_phase1.sql](../database/001_phase1.sql) và [hướng dẫn](../database/README.md).

Nguồn yêu cầu: [farse 1.md](<farse 1.md>), [db.md](db.md).

## 1. Lựa chọn thiết kế

Đã chốt PostgreSQL cho quan hệ và transaction. Backend NestJS truy cập DB; chưa chọn ORM, dịch vụ hosting hoặc object storage.

- Khóa chính thực thể: UUID, sinh ở backend hoặc DB khi triển khai. Bảng nối dùng khóa chính ghép.
- Thời điểm: `timestamptz`, xử lý ngày/tháng nghiệp vụ theo `Asia/Saigon`.
- Giá: `numeric(12,0)` VND, không dùng float. VND và cho phép giá 0 là giả định cần duyệt.
- Điểm: `smallint rating_units`, giá trị 2–10; điểm hiển thị = rating_units / 2.0.
- Trạng thái: `text` với CHECK tập giá trị; dễ thay đổi hơn khi sản phẩm còn phát triển.
- `created_at`, `updated_at`: mặc định thời điểm tạo; backend cập nhật `updated_at` khi sửa, không giả định DB tự cập nhật.
- Khóa ngoại mặc định RESTRICT; tránh xóa dây chuyền lịch sử. Bảng nối thuần có thể CASCADE khi việc xóa vật lý được cho phép.
- File ảnh lưu bên ngoài DB; DB giữ metadata. Ảnh lịch sử không có URL công khai vĩnh viễn, cần kiểm tra quyền trước khi cấp URL truy cập.
- Đánh giá dùng một gốc/người/đối tượng tồn tại lâu dài, có nhiều phiên bản. Xóa rồi đánh giá lại vẫn dùng gốc đó, không nhân đôi đóng góp tháng.

Ký hiệu bên dưới: `?` là nullable; `PK` khóa chính; `FK` khóa ngoại; `UQ` duy nhất. Các ID là UUID trừ khi ghi khác. Các thời điểm là timestamptz, ngày là date.

## 2. Tài khoản và ảnh

### users

`id PK`, `email text`, `password_hash text`, `display_name text`, `avatar_asset_id FK media_assets ?`, `role text default user`, `email_verified_at ?`, `locked_at ?`, `lock_reason text ?`, `locked_by FK users ?`, `created_at`, `updated_at`.

- UQ biểu thức `lower(email)`; trim và chuẩn hóa ở backend, không mặc định xóa dấu chấm hoặc phần + của email.
- CHECK role IN (owner, admin, user); tên/email không rỗng.
- Chỉ owner thay đổi vai trò admin; kiểm soát ở service, không dựa vào CHECK role để phân quyền.
- Có thể dùng UQ partial trên role WHERE role=owner để tối đa một owner. Bootstrap/đổi owner phải là quy trình riêng; chưa cho API xóa/gỡ owner cuối cùng.
- Lock phải có lý do/người thao tác; việc mở khóa được audit. Không dùng một status gộp cả xác minh và khóa.

### media_assets

`id PK`, `uploaded_by FK users ?`, `storage_key text UQ`, `mime_type text`, `byte_size bigint`, `width integer ?`, `height integer ?`, `state text default pending`, `created_at`.

CHECK kích thước dương, state IN (pending, ready, quarantined). Không dùng cờ public toàn cục cho ảnh: cùng một ảnh có thể nằm trong bản hiện tại và bản lịch sử; quyền cấp URL phụ thuộc ngữ cảnh sử dụng. FK avatar và uploader tạo vòng tham chiếu hợp lệ, cần thêm FK avatar sau lúc định nghĩa hai bảng nếu dùng DDL.

### auth_sessions

`id PK`, `user_id FK users`, `refresh_token_hash text UQ`, `expires_at`, `revoked_at ?`, `created_at`, `last_used_at ?`.

Đây là mô hình phiên đề xuất; không chốt JWT/access-token TTL. Khi khóa tài khoản, service thu hồi phiên và kiểm tra khóa cho request có quyền ghi.

### auth_tokens

`id PK`, `user_id FK users`, `purpose text`, `token_hash text UQ`, `expires_at`, `consumed_at ?`, `created_at`.

CHECK purpose IN (verify_email, reset_password), expires_at > created_at. Tiêu thụ token bằng cập nhật có điều kiện trong transaction để một token không dùng hai lần. Không lưu token thô.

## 3. Quán và menu

### restaurants

`id PK`, `name text`, `address text`, `latitude numeric(9,6)`, `longitude numeric(9,6)`, `thumbnail_asset_id FK media_assets`, `description text ?`, `opening_time time`, `closing_time time`, `visit_duration_minutes smallint`, `status text default active`, `created_by FK users`, `updated_by FK users`, `created_at`, `updated_at`.

CHECK tọa độ hợp lệ (-90..90, -180..180), thời lượng >0, status IN (active, inactive). Một dòng là một địa điểm; không UNIQUE tên quán. Tọa độ, địa chỉ, thumbnail là dữ liệu tối thiểu đề xuất trước khi công khai.

Giờ cố định mỗi ngày. Thiết kế có thể biểu diễn đóng sau nửa đêm qua closing_time <= opening_time, nhưng chính sách này chưa chốt; bản triển khai đầu cần chốt trước khi cho phép. Không ép CHECK closing > opening rồi tuyên bố hỗ trợ qua đêm.

### dishes

`id PK`, `restaurant_id FK restaurants`, `name text`, `description text ?`, `image_asset_id FK media_assets`, `status text default available`, `sort_order integer default 0`, `created_at`, `updated_at`.

CHECK status IN (available, discontinued); UQ (id, restaurant_id) để hỗ trợ FK ghép của món nên thử. Không UNIQUE tên món: tên trùng có thể hợp lệ, admin quyết định. Không xóa vật lý món đã được đánh giá.

### dish_options

`id PK`, `dish_id FK dishes`, `name text`, `price_vnd numeric(12,0)`, `is_available boolean default true`, `sort_order integer default 0`, `created_at`, `updated_at`.

CHECK price_vnd >=0; UQ (dish_id, name) theo tên đã trim. Khả năng ngừng bán từng lựa chọn là đề xuất, chưa được hỏi riêng. Món công khai cần ít nhất một lựa chọn hợp lệ: service kiểm tra trong transaction, không dùng CHECK để đếm dòng bảng khác.

### dish_categories / dish_category_links

- `dish_categories`: `id PK`, `name text`, `sort_order integer default 0`, `is_active boolean default true`. UQ lower(name).
- `dish_category_links`: `dish_id FK dishes`, `category_id FK dish_categories`, PK (dish_id, category_id).

### Giá quán

View/query `restaurant_price_ranges`: join dishes đang available và dish_options còn bán, GROUP BY restaurant_id, MIN/MAX price_vnd. Không có món/lựa chọn thì NULL. Việc loại lựa chọn ngừng bán là giả định theo thiết kế lựa chọn trên, cần duyệt.

Chưa thêm PostGIS, bảng tiện ích hoặc search engine: phạm vi bộ lọc thực tế còn cần đối chiếu sản phẩm. Không lưu walking time cố định ở quán vì phụ thuộc vị trí xuất phát.

## 4. Đánh giá có lịch sử

### reviews

`id PK`, `user_id FK users`, `restaurant_id FK restaurants ?`, `dish_id FK dishes ?`, `current_version_no integer ?`, `deleted_at ?`, `moderation_state text default visible`, `hidden_at ?`, `hidden_by FK users ?`, `hidden_reason text ?`, `created_at`, `updated_at`.

- CHECK đúng một trong restaurant_id/dish_id khác NULL.
- UQ partial (user_id, restaurant_id) WHERE restaurant_id IS NOT NULL; UQ partial (user_id, dish_id) WHERE dish_id IS NOT NULL. Không lọc deleted_at trong unique: gốc vẫn duy nhất sau xóa.
- CHECK moderation_state IN (visible, hidden).
- Xóa và ẩn là hai trạng thái độc lập: người dùng xóa/tạo lại không được thoát trạng thái hidden.
- current_version_no NULL chỉ trong quá trình tạo nội bộ; service không commit review có thể công khai mà chưa có phiên bản.

### review_versions

`review_id FK reviews`, `version_no integer`, `rating_units smallint`, `body text ?`, `event_type text`, `created_at`, PK (review_id, version_no).

- CHECK rating_units BETWEEN 2 AND 10, version_no >0; event_type IN (create, edit, recreate).
- FK ghép (reviews.id, current_version_no) → (review_versions.review_id, version_no); thêm sau khi tạo hai bảng. Không cho pointer trỏ phiên bản review khác.
- Phiên bản append-only; khóa dòng review để tăng version_no và đổi current pointer trong một transaction.
- Đổi chỉ nội dung/ảnh vẫn tạo phiên bản; tác động lên đóng góp sao tháng được tách riêng, không suy ra mọi edit đều là một lượt chấm mới.

### review_version_images

`review_id`, `version_no`, `asset_id FK media_assets`, `position smallint`, PK (review_id, version_no, asset_id), UQ (review_id, version_no, position).

FK (review_id, version_no) → review_versions. CHECK position >=0; giới hạn số ảnh kiểm tra ở service/transaction khi được chốt, **không mặc định 5 thành quyết định**. Phiên bản lịch sử giữ liên kết ảnh cũ.

### review_events

`id PK`, `review_id FK reviews`, `actor_id FK users ?`, `event_type text`, `version_no integer ?`, `reason text ?`, `created_at`.

Các event dự kiến: created, edited, deleted, recreated, hidden, restored. FK (review_id, version_no) → review_versions nếu có version. Event là nguồn rebuild trạng thái/statistics; viết cùng transaction với thay đổi review. Không dùng audit log chung thay cho lịch sử nghiệp vụ này.

### review_monthly_contributions

`review_id`, `month_start date`, `version_no integer`, `withdrawn_at ?`, `withdrawal_reason text ?`, `updated_at`, PK (review_id, month_start), FK (review_id, version_no) → review_versions.

- CHECK month_start là ngày đầu tháng.
- Review gốc duy nhất/người/đối tượng nên PK này bảo đảm một đóng góp/người/đối tượng/tháng dù xóa/tạo lại.
- Khi có lượt chấm hợp lệ: UPSERT contribution của tháng với version cuối cùng. Bảng này là projection có thể rebuild từ phiên bản/events, không phải nguồn duy nhất.
- moderation_state=hidden loại toàn bộ contributions khỏi query, không hủy lịch sử để có thể xử lý xét lại.
- Tự xóa không tự loại tất cả contributions theo deleted_at: làm vậy sẽ mất các tháng trước trái yêu cầu.
- withdrawn_at cho phép loại tháng cụ thể khi chính sách xóa/tháng hiện tại được chốt.

### review_reconsideration_requests

`id PK`, `review_id`, `version_no integer`, `requested_by FK users`, `status text default pending`, `resolved_by FK users ?`, `resolution_reason text ?`, `created_at`, `resolved_at ?`.

FK (review_id, version_no) → review_versions; UQ partial (review_id) WHERE status=pending; status IN (pending, approved, rejected). Người gửi phải là chủ review; admin duyệt đúng version được yêu cầu, không nhầm với version mới hơn vừa sửa.

### Truy vấn điểm

- Hiện tại: AVG(current version.rating_units)/2.0, COUNT(review), WHERE deleted_at IS NULL AND moderation_state=visible.
- Theo tháng: AVG(contribution version.rating_units)/2.0, COUNT(contribution), WHERE month_start=M AND withdrawn_at IS NULL AND review.moderation_state=visible. Không lọc deleted_at của review cho tháng trước.
- Không có điểm → NULL và count=0. Delta chỉ tính khi cả hai tháng có dữ liệu, hiển thị theo số sao là đề xuất.
- Tháng Asia/Saigon; có thể tính SUM/COUNT trực tiếp giai đoạn đầu, chưa tạo cache thống kê tổng để tránh đồng bộ thừa.

## 5. Quán đã lưu và quán ruột

### saved_restaurants

`user_id FK users`, `restaurant_id FK restaurants`, `created_at`, PK (user_id, restaurant_id). Không có is_public vì luôn riêng tư.

### favorite_restaurants

`id PK`, `user_id FK users`, `restaurant_id FK restaurants`, `is_public boolean default false`, `introduction text ?`, `moderation_state text default visible`, `hidden_reason text ?`, `hidden_by FK users ?`, `hidden_at ?`, `removed_at ?`, `created_at`, `updated_at`.

UQ (user_id, restaurant_id), UQ (id, restaurant_id); moderation_state IN (visible, hidden). Giữ gốc khi bỏ/thêm lại để không vượt ẩn và giữ báo cáo tham chiếu. Chỉ công khai khi is_public=true, removed_at IS NULL và moderation_state=visible (ẩn cả mục là đề xuất cần duyệt).

### favorite_dishes

`favorite_id`, `restaurant_id`, `dish_id`, `position integer default 0`, PK (favorite_id, dish_id).

FK (favorite_id, restaurant_id) → favorite_restaurants(id, restaurant_id); FK (dish_id, restaurant_id) → dishes(id, restaurant_id). restaurant_id lặp có chủ đích để DB bảo đảm món thuộc chính quán đó. Không chỉ kiểm tra ở UI.

## 6. Kế hoạch ghé quán

### visit_plans

`id PK`, `user_id FK users`, `restaurant_id FK restaurants`, `party_size smallint default 1`, `arrival_at`, `duration_minutes_snapshot smallint`, `closing_at_snapshot`, `expires_at`, `status text default planned`, `cancelled_at ?`, `cancelled_by FK users ?`, `cancel_reason text ?`, `created_at`, `updated_at`.

- CHECK party_size BETWEEN 1 AND 20; duration >0; arrival_at < expires_at; expires_at <= closing_at_snapshot.
- CHECK expires_at = LEAST(arrival_at + duration_snapshot, closing_snapshot) bằng biểu thức interval khi hiện thực; status IN (planned, cancelled, expired).
- UQ partial (user_id) WHERE status=planned. Không dùng NOW() trong predicate của unique index.
- Trước khi tạo lịch mới: khóa user, đổi lịch planned đã expires_at<=T thành expired rồi tạo mới. Unique index là lớp bảo vệ cuối cho request đồng thời.
- Đếm công khai: SUM(party_size) WHERE restaurant_id=R AND status=planned AND expires_at>T; không cần arrival_at<=T. Không phụ thuộc job hết hạn chạy đúng giây.
- Backend kiểm tra hôm nay, chưa quá giờ đến (đề xuất), quán active và giờ hoạt động trong transaction; không dùng CHECK có thời gian hiện tại để thể hiện dữ liệu tự thay đổi theo đồng hồ.
- Snapshot thời lượng/đóng cửa bảo đảm sửa thông tin quán không tự đổi lịch cũ. Khi sửa lịch: đề xuất giữ thời lượng snapshot, xác thực giờ hoạt động hiện tại và cập nhật closing snapshot; chưa chốt nghiệp vụ này.
- Khi đóng quán: khóa quán, cập nhật inactive, hủy các lịch planned còn hiệu lực, tạo notifications trong cùng transaction. Tạo/sửa lịch cũng khóa quán và kiểm tra active để tránh tạo sau đóng.
- Thứ tự khóa thống nhất: quán → user → plan khi thao tác có cả ba; khi đổi quán khóa các quán theo ID tăng dần. Job/luồng đóng quán tránh khóa user sau khi đã khóa plan để giảm nguy cơ deadlock.
- Worker có thể chuyển planned hết hạn thành expired; truy vấn vẫn đúng khi worker trễ. Tạo mới thực hiện dọn trạng thái hết hạn tại chỗ.

## 7. Báo cáo và quản trị

### content_reports

`id PK`, `reporter_id FK users`, `review_id FK reviews ?`, `favorite_id FK favorite_restaurants ?`, `reason_code text`, `details text ?`, `status text default pending`, `resolved_by FK users ?`, `resolution_reason text ?`, `created_at`, `resolved_at ?`.

- CHECK đúng một mục tiêu; reason IN (spam, offensive, misinformation, inappropriate_image, other); status IN (pending, dismissed, actioned).
- UQ partial (reporter_id, review_id) WHERE status=pending AND review_id IS NOT NULL; tương tự favorite_id.
- Bác/ẩn đều lưu reason, resolver và resolved_at. Có thể xử lý nhiều report cùng nội dung; thông báo cho từng reporter một lần.

### moderation_actions

`id PK`, `actor_id FK users`, `review_id FK reviews ?`, `favorite_id FK favorite_restaurants ?`, `target_user_id FK users ?`, `report_id FK content_reports ?`, `action text`, `reason text`, `created_at`.

CHECK đúng một mục tiêu chính; action dự kiến hide, restore, lock, unlock. Kiểm tra action phù hợp loại đối tượng tại service hoặc CHECK; report_id nếu có phải trỏ report cùng đối tượng. Không có FK đa hình target_id tự do cho nội dung quản trị.

### audit_events

`id PK`, `actor_id FK users ?`, `action text`, `entity_type text`, `entity_id uuid ?`, `changes jsonb`, `created_at`.

Log append-only để truy vết; entity_id ở log có thể không có FK vì chỉ là dấu vết, không dùng làm nguồn trạng thái. Không log hash mật khẩu/token/email riêng tư thừa trong changes. Cấp/gỡ admin và sửa quán/menu có audit.

## 8. Thông báo

### notifications

`id PK`, `recipient_id FK users`, `kind text`, `visit_plan_id FK visit_plans ?`, `report_id FK content_reports ?`, `moderation_action_id FK moderation_actions ?`, `message text`, `read_at ?`, `dedupe_key text UQ`, `created_at`.

- kind IN (plan_cancelled, content_hidden, report_resolved).
- CHECK đối tượng tương ứng kind: plan_cancelled có plan; content_hidden có moderation_action; report_resolved có report; không để các FK thừa không liên quan.
- dedupe_key gồm loại+sự kiện+người nhận, tránh phát lại tạo trùng. Ví dụ plan_cancelled:<plan>:<user>.
- Mỗi người chỉ đọc thông báo của mình; read_at là đề xuất kỹ thuật. Nội dung không chứa dữ liệu riêng tư của người báo khi gửi cho tác giả.
- Thông báo lưu ngay trong transaction nghiệp vụ; frontend polling/stream tùy triển khai. Chưa cần bảng reminder hoặc hệ thống gửi email nghiệp vụ.

## 9. Index chính

Unique/PK ở các phần trên là index sẵn có, không tạo index lặp. Rà thêm index cho mọi FK thường xuyên join hoặc kiểm tra xóa; index ghép chỉ hỗ trợ tốt prefix phù hợp.

| Truy vấn | Index dự kiến |
|---|---|
| Đăng nhập | users lower(email) UNIQUE |
| Phiên/token theo user | auth_sessions(user_id), auth_tokens(user_id, purpose) |
| Menu quán | dishes(restaurant_id, status, sort_order), dish_options(dish_id, is_available) |
| Món theo nhóm | dish_category_links(category_id, dish_id), PK chiều ngược đã có |
| Review công khai theo quán/món | reviews(restaurant_id, updated_at DESC) partial chưa xóa/visible; tương tự dish_id |
| Lịch sử review | PK review_versions(review_id, version_no); review_events(review_id, created_at DESC) |
| Điểm tháng | contributions(month_start, review_id); PK đã hỗ trợ theo review |
| Duyệt yêu cầu | reconsideration_requests(created_at) WHERE status=pending |
| Quán đã lưu theo user | PK đã đủ; index restaurant_id cho FK chiều ngược |
| Quán ruột hồ sơ | favorite_restaurants(user_id, is_public); index restaurant_id |
| Món nên thử | favorite_dishes(dish_id, restaurant_id), FK favorite prefix đã có |
| Tổng người dự kiến | visit_plans(restaurant_id, expires_at) WHERE status=planned |
| Hết hạn toàn hệ thống | visit_plans(expires_at) WHERE status=planned |
| Lịch sử kế hoạch cá nhân | visit_plans(user_id, created_at DESC) |
| Hàng đợi báo cáo | content_reports(created_at) WHERE status=pending; index FK mục tiêu/người báo |
| Thông báo | notifications(recipient_id, created_at DESC); partial unread nếu cần |
| Audit/quản trị | audit_events(entity_type, entity_id, created_at DESC); moderation_actions theo mục tiêu và thời gian |

Không index tất cả cột, không dùng thời gian hiện tại trong partial predicate. Search tên tiếng Việt/không dấu cần chốt cách tìm kiếm trước khi thêm extension/index chuyên dụng.

## 10. Quyền và transaction bắt buộc

- Tách DTO hồ sơ công khai khỏi bảng users; không SELECT * rồi trả về client.
- Khách xem quán/menu/map/tìm kiếm; quyền xem đánh giá/hồ sơ/biểu đồ chưa chốt riêng.
- Chức năng ghi nâng cao cần login, không bị khóa; xác minh email áp dụng ít nhất với đánh giá, lịch ghé, quán ruột công khai.
- Backend kiểm tra ownership của saved/favorite/plan/review/history/notification. Không cho người khác đoán ID rồi đọc dữ liệu riêng.
- User DB của ứng dụng không được quyền sửa/xóa lịch sử bất biến tùy tiện. Kiểm soát bằng quyền DB/function hoặc service chuyên biệt sau khi chốt triển khai.
- Tạo/sửa review: khóa gốc, append version+images, chuyển pointer, ghi event và cập nhật contribution cùng transaction.
- Xóa/ẩn: ghi event và đổi trạng thái cùng transaction; thống kê trực tiếp join trạng thái nên không cần cập nhật hàng loạt mọi tháng khi ẩn.
- Xét lại: khóa review/request, kiểm tra version được duyệt, quyết định restore theo chính sách đã chốt.
- Cấp quyền/khóa: kiểm tra vai trò người thao tác, audit, thu hồi phiên nếu khóa.
- Không có kết nối DB trực tiếp từ browser; nếu sau này chọn Supabase client trực tiếp phải thiết kế RLS riêng trước khi mở quyền.

## 11. Các tình huống cần kiểm chứng khi triển khai

1. Hai request tạo lịch đồng thời chỉ tạo một lịch còn hiệu lực; lịch hết hạn cho phép tạo mới dù worker chưa chạy.
2. Đóng quán đồng thời tạo lịch không để lọt lịch hiệu lực hoặc gửi trùng thông báo.
3. Nhóm tương lai vẫn được cộng; đúng 1–20 và không cộng người tạo; hết hạn loại khỏi tổng ngay.
4. Pointer phiên bản không trỏ review khác; sửa nhiều lần/tháng và xóa/tạo lại chỉ đóng góp một điểm/người/đối tượng.
5. Tự xóa vẫn giữ tháng cũ; admin ẩn loại mọi tháng; gỡ ẩn theo chính sách được chốt.
6. Món nên thử không thuộc quán khác; không có review vừa nhắm quán vừa nhắm món.
7. Ảnh lịch sử và email không lộ qua endpoint công khai; private favorite/saved/plan không truy cập bằng ID của người khác.
8. Giá min/max phản ánh món/lựa chọn còn bán; review ảnh/nội dung tùy chọn vẫn có điểm hợp lệ.

Đây là kế hoạch kiểm chứng, chưa viết/chạy test vì chưa triển khai DB.

## 12. Quyết định còn cần người dùng chốt

| Điểm mở | Đề xuất của bản thiết kế; chưa coi là yêu cầu đã duyệt |
|---|---|
| Công nghệ | PostgreSQL đã chốt; UUID là lựa chọn schema; NestJS truy cập DB; ORM chọn sau |
| Giới hạn ảnh | 5 ảnh/review; kích thước/định dạng cần chọn |
| Xóa review tháng hiện tại | Loại đóng góp tháng đang diễn ra; giữ tháng đã qua |
| Edit chỉ nội dung/ảnh | Không tạo đóng góp sao cho tháng mới; edit có đổi sao hoặc recreate thì có |
| Gỡ ẩn | Giữ loại các phiên bản vi phạm; chỉ phục hồi đóng góp từ phiên bản được admin chấp nhận; cần thêm mức hợp lệ phiên bản nếu chọn cách này |
| Xóa/tạo lại | Cùng gốc review, tháng lấy lượt chấm cuối hợp lệ; không nhân đôi |
| Giờ qua đêm | Chưa hỗ trợ ở lần triển khai đầu cho đến khi chốt ranh giới hôm nay |
| Sửa lịch | Giữ thời lượng snapshot, kiểm tra giờ hoạt động hiện tại; đổi giờ quán không tự sửa lịch cũ |
| Giờ đến quá khứ | Không cho tạo/sửa lịch đến quá khứ |
| Quán ruột bị ẩn | Ẩn cả mục khỏi hồ sơ công khai; vẫn giữ riêng tư cho chủ xem |
| Khóa tài khoản | Thu hồi phiên; nội dung cũ/lịch cũ xử lý sau khi chốt, không tự xóa |
| Giá/menu | VND, giá >=0, lựa chọn có thể ngừng bán; không có giá thì NULL |
| Dữ liệu riêng tư | Chính sách xóa tài khoản, lưu ảnh/events và thông báo chưa chốt |

Schema SQL đã bổ sung bảng `review_version_moderation` để lưu trạng thái hợp lệ từng phiên bản. SQL cũng có cờ `rating_submitted`, kiểm tra phiên bản tuần tự, ảnh snapshot cùng transaction và trigger lifecycle của kế hoạch. Tổng cộng 24 bảng. Chính sách nghiệp vụ gỡ ẩn, giới hạn ảnh và các mục mở vẫn cần chốt; xem README SQL để phân biệt phần DB đã có với phần service chưa hiện thực.

## 13. Phạm vi loại trừ

Không có bảng báo độ đông, lịch sử vị trí, xác nhận đến/rời, reminder, đặt chỗ chủ quán duyệt hoặc đề xuất tạo quán mới. Đã viết và kiểm thử schema trên DB tạm; chưa chạy migration lên DB ứng dụng, cài ORM hoặc thay dữ liệu mẫu.
