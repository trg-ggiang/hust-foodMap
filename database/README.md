# PostgreSQL — HUST FoodMap giai đoạn 1

Người dùng đã chốt PostgreSQL và yêu cầu viết bảng ngày 13/10/2026. [001_phase1.sql](001_phase1.sql) là migration khởi tạo cho **database được chọn rõ ràng, chưa có schema `foodmap`**. Đã chạy kiểm thử trên PostgreSQL nhúng tạm; chưa chạy lên database ứng dụng, chưa nối NestJS vào DB, không thay dữ liệu mẫu.

## Nội dung

| Nhóm | Bảng |
|---|---|
| Tài khoản/ảnh | users, media_assets, auth_sessions, auth_tokens |
| Quán/menu | restaurants, dishes, dish_options, dish_categories, dish_category_links |
| Đánh giá | reviews, review_versions, review_version_images, review_version_moderation, review_events, review_monthly_contributions, review_reconsideration_requests |
| Lưu/quán ruột | saved_restaurants, favorite_restaurants, favorite_dishes |
| Kế hoạch | visit_plans |
| Kiểm duyệt/thông báo | content_reports, moderation_actions, audit_events, notifications |

Tổng 24 bảng. Khóa UUID, giá VND kiểu số chính xác, thời điểm `timestamptz`, nghiệp vụ ngày/tháng theo Asia/Saigon. Điểm lưu đơn vị nửa sao 2–10, hiển thị 1–5.

Các view:

- `restaurant_price_ranges`: min/max lựa chọn còn bán của món đang bán; quán không có giá trả NULL.
- `current_rating_stats`: điểm hiện tại cho quán hoặc món, kèm số người.
- `monthly_rating_stats`: điểm tháng theo đóng góp cuối của từng người, không tự mất tháng cũ khi user xóa.
- `restaurant_planned_counts`: tổng người từ mọi lịch còn hiệu lực, kể cả giờ đến tương lai; không trả danh tính.

Các trigger chính:

- Tự cập nhật `updated_at`; lịch sử phiên bản/ảnh/events/audit/actions không được UPDATE/DELETE.
- Gốc review không đổi người/đối tượng; version tuần tự; FK pointer phải thuộc đúng review và được kiểm tra cuối transaction.
- Ảnh snapshot phải được thêm cùng transaction tạo version. Muốn đổi ảnh sau commit phải tạo version mới.
- Chấm/sửa sao cập nhật projection tháng; `rating_submitted=false` cho edit chỉ nội dung/ảnh, không được đổi sao với cờ false.
- Contribution phải tham chiếu lượt chấm của đúng tháng; moderation từng version cho phép loại bản vi phạm khi xét lại.
- Món nên thử buộc thuộc đúng quán bằng FK ghép; báo cáo không được gắn nhầm mục tiêu kiểm duyệt.
- Tạo/sửa lịch kiểm tra quán hoạt động, tài khoản xác minh/chưa khóa, hôm nay/giờ mở cửa; snapshot thời lượng; tính hết hạn giới hạn bởi đóng cửa.
- Tạo lịch mới tự chuyển lịch planned hết hạn của tài khoản thành expired; unique index ngăn hai lịch planned.
- Quán chuyển active → inactive tự hủy lịch còn hiệu lực và tạo thông báo có dedupe key trong cùng transaction.

## Chạy khi đã có database được chỉ định

```powershell
# DATABASE_URL phải trỏ đúng DB mới được phép khởi tạo; không đưa mật khẩu vào repo.
psql "$env:DATABASE_URL" -X -v ON_ERROR_STOP=1 -f database/001_phase1.sql
```

Script BEGIN/COMMIT nguyên khối, không DROP, không seed tài khoản hoặc mật khẩu. Chạy lần hai sẽ báo schema đã tồn tại, không âm thầm bỏ qua cấu trúc không đúng. Nên dùng PostgreSQL 16+ làm baseline triển khai; phiên bản production cụ thể còn cần chọn/kiểm chứng. Không tự CREATE DATABASE hoặc thay quyền schema public của DB có sẵn.

Schema không cấp quyền cho PUBLIC, không tạo login/credential. Khi triển khai, tạo role migration và role backend riêng, cấp quyền tối thiểu cụ thể; không dùng tài khoản owner/superuser làm tài khoản ứng dụng. Browser không kết nối DB trực tiếp. File này không có RLS theo user vì xác thực/ownership được thiết kế qua NestJS; nếu đổi sang client DB trực tiếp phải thiết kế RLS trước.

## Kiểm thử lại trên PostgreSQL tạm

Không cần DATABASE_URL và không kết nối database thật:

```powershell
npm install --prefix database/.validation --no-audit --no-fund --ignore-scripts @electric-sql/pglite@0.5.9
node database/validate-schema.mjs
```

Dependency kiểm thử nằm riêng trong `database/.validation`, được gitignore; package.json/package-lock của ứng dụng không thay đổi. Mỗi lần chạy dùng database trong bộ nhớ mới rồi đóng.

Kết quả hiện tại: **24 bảng, 41 kiểm tra hành vi thành công**. Đã kiểm tra schema thực thi, unique/check/FK, điểm tháng khi sửa/xóa/ẩn, bất biến lịch sử, ảnh snapshot, quyền PUBLIC, min/max giá, lựa chọn món nên thử, lịch tương lai vẫn tính người, giờ/ngày không hợp lệ, tài khoản chưa xác minh, snapshot thời lượng, cap đóng cửa và hủy/thông báo khi ngừng hoạt động. Đây là kiểm thử PostgreSQL nhúng; chưa phải kiểm thử backend, deployment hoặc nhiều kết nối đồng thời.

## Phần backend phải hiện thực khi tích hợp

- Hash mật khẩu, xác minh/reset email, thu hồi phiên, giới hạn request và quyền owner/admin/user.
- Không trả email/hash/token hoặc lịch sử/private lists qua DTO công khai; cấp URL ảnh theo quyền truy cập.
- Transaction tạo review: INSERT gốc với pointer 1 → INSERT version/ảnh/event → COMMIT. FK pointer deferred không cho commit review thiếu version.
- Edit: khóa review → INSERT version/ảnh → đổi pointer → ghi event → COMMIT. Trigger không tự đổi pointer/event thay service.
- Delete/hide/restore: service ghi trạng thái/events/actions, giải quyết chính sách tháng hiện tại và các version vi phạm; không chỉ xóa vật lý.
- Report xử lý/hide nội dung: ghi action và thông báo cho tác giả/người báo; chỉ hủy lịch do ngừng hoạt động đã có thông báo tự động trong SQL.
- Chỉ owner cấp/gỡ admin, bảo vệ owner cuối cùng; kiểm tra role khi cập nhật quán/menu. Các CHECK trạng thái không thay quyền người thao tác.
- Khi thao tác lịch, pre-lock quán → user → plan trong transaction trước UPDATE để giảm deadlock; PostgreSQL vẫn có thể yêu cầu retry transaction khi cạnh tranh. Trigger là lớp bảo vệ dữ liệu, không thay chiến lược lock/retry của service.
- Job có thể cập nhật lịch hết hạn; view luôn loại `expires_at <= statement_timestamp()` kể cả job trễ.
- Không cho đổi quán trên một plan: hủy rồi tạo lại. Đổi thời lượng quán không đổi snapshot; sửa lịch giữ thời lượng cũ, tính lại giờ đóng theo giờ quán hiện tại.
- Menu công khai phải có lựa chọn giá hợp lệ, ảnh ready; backend kiểm tra khi lập menu.
- Snapshot ảnh được chặn sửa/xóa và thêm muộn, nhưng quyền role triển khai phải ngăn TRUNCATE và không được tắt trigger. Không coi trigger là rào cản đối với superuser.

## Những mặc định kỹ thuật và điểm còn mở

PostgreSQL đã chốt. Các điểm khác không tự coi là được duyệt vì người dùng đồng ý PostgreSQL:

- Giới hạn cụ thể ảnh/đánh giá chưa chốt; SQL chưa áp giới hạn 5. Backend phải có giới hạn đã duyệt trước khi mở upload.
- Tháng hiện tại khi user xóa: SQL giữ projection cho tới khi service đánh dấu withdrawn; chính sách cuối cùng vẫn cần chốt. Tháng cũ đã chốt giữ lại.
- Gỡ ẩn: view loại version có moderation=excluded; admin/service phải chọn rõ version được phục hồi và không để hiện lại bản vi phạm.
- Content-only edit không tạo đóng góp sao mới nếu service đặt rating_submitted=false. Cách nhận diện lượt “chấm lại cùng điểm” cần thống nhất UI/API.
- Bản SQL đầu dùng giờ cùng ngày (opening < closing), chưa hỗ trợ qua đêm; lịch đến quá khứ bị từ chối; múi giờ Asia/Saigon.
- VND, giá >=0 và lựa chọn có thể ngừng bán là mặc định thiết kế đã ghi, cần xác nhận nếu muốn khác.
- Quán ruột bị ẩn giữ dữ liệu; backend quyết định ẩn cả mục hay chỉ lời giới thiệu theo chính sách được duyệt.
- Xóa tài khoản, thời hạn lưu ảnh/thông báo/lịch sử và tác động khóa tài khoản lên nội dung/lịch cũ chưa chốt.

Không có bảng báo độ đông, vị trí lịch sử, reminder, đề xuất quán mới hay đặt chỗ chủ quán duyệt.
