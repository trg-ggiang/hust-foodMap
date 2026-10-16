# HUST FoodMap — farse 1

Ngày tổng hợp: 13/10/2026 (Asia/Saigon).

> Cập nhật sau bản tổng hợp: người dùng đã chốt PostgreSQL và ra lệnh viết bảng. Đã viết [schema SQL](../database/001_phase1.sql) và kiểm thử trên PostgreSQL tạm; chưa tạo database ứng dụng. Nội dung bên dưới giữ các quyết định sản phẩm và trạng thái tại lúc tổng hợp ban đầu.

Tài liệu này tổng hợp cuộc trao đổi về sản phẩm và database giai đoạn 1. Đây là bản lưu yêu cầu, không phải lệnh triển khai. Người dùng yêu cầu tiếp tục trao đổi và chỉ tạo database khi có lệnh rõ ràng. Không tạo bảng, migration hoặc sửa code ứng dụng trong công việc lưu tài liệu này.

Thiết kế dữ liệu dự kiến được lưu riêng tại [db.md](db.md). Các mục “chưa chốt” không được tự coi là đã được người dùng đồng ý.

## 1. Bối cảnh và phạm vi

- HUST FoodMap hiện có frontend Next.js/React, backend NestJS và package contracts dùng chung; dữ liệu quán hiện là mẫu.
- Mục tiêu là chuyển sang dữ liệu thực tế do chủ hệ thống/admin quản lý.
- Chưa liên kết vận hành với chủ quán. Không có đặt chỗ cần chủ quán xác nhận.
- Mỗi địa điểm/chi nhánh được quản lý như một quán riêng: menu, đánh giá và kế hoạch riêng.
- Giai đoạn 1 có tài khoản, quán/menu, đánh giá quán và món, quán đã lưu, quán ruột, kế hoạch ghé, báo cáo vi phạm và thông báo trong app.

## 2. Tài khoản và phân quyền

### Đăng nhập và hồ sơ

- Đăng nhập bằng email/mật khẩu; email duy nhất và không công khai.
- Có xác minh email. Đã đồng ý yêu cầu xác minh trước khi đánh giá, tạo kế hoạch hoặc công khai quán ruột; quyền của tài khoản chưa xác minh với các hành động khác cần chốt thêm nếu cần.
- Quên mật khẩu dùng liên kết đặt lại mật khẩu gửi qua email.
- Tên hiển thị được trùng nhau; hồ sơ có ảnh đại diện.
- Người khác có thể bấm tên/ảnh trên đánh giá để mở hồ sơ.
- Hồ sơ công khai hiển thị tên, ảnh và các quán ruột công khai; không công khai email, kế hoạch, quán đã lưu hoặc lịch sử sửa đánh giá.

### Quyền truy cập

| Đối tượng | Quyền đã chốt |
|---|---|
| Khách chưa đăng nhập | Xem map, thông tin quán, menu và tìm kiếm |
| Người dùng đăng nhập | Dùng các chức năng nâng cao: đánh giá, lưu quán, quán ruột, kế hoạch, báo cáo vi phạm… |
| Admin | Quản lý thông tin quán/menu, xử lý báo cáo, ẩn nội dung vi phạm có lý do, khóa tài khoản |
| Chủ hệ thống | Có quyền quản trị; chỉ chủ hệ thống được thêm/gỡ quyền admin |

- Tài khoản bị khóa vẫn xem quán/menu như khách nhưng không dùng được các chức năng cần đăng nhập.
- Admin không được sửa sao hoặc nội dung đánh giá thay người dùng.
- Quyền xem công khai đánh giá, biểu đồ sao và hồ sơ đối với khách chưa đăng nhập chưa được hỏi riêng; không suy diễn thành quyền đã chốt từ câu “chỉ xem quán/menu/tìm kiếm”.

## 3. Quán và menu

### Quán

- Chủ hệ thống/admin lập và cập nhật thông tin quán.
- Mỗi quán có một ảnh đại diện làm thumbnail.
- Một giờ mở và một giờ đóng cố định áp dụng hằng ngày, admin được cập nhật; không dùng lịch theo từng ngày trong tuần/nhiều ca ở giai đoạn này.
- Mỗi quán có thời lượng ghé dự kiến do admin đặt và chỉnh sửa.
- Khoảng giá quán lấy giá thấp nhất và cao nhất trong các lựa chọn của món đang bán, không nhập khoảng giá tham khảo riêng.
- Quán ngừng hoạt động được đánh dấu trạng thái, không xóa lịch sử đánh giá.
- Quy tắc giờ mở qua nửa đêm chưa được xác nhận riêng.

### Món và lựa chọn

- Danh sách món do chủ hệ thống/admin lập, không phải do chủ quán tự nhập.
- Mỗi món thuộc một quán cụ thể. Cùng tên “Phở bò” ở hai quán là hai món riêng.
- Món có tên, mô tả, nhóm món, một ảnh riêng và trạng thái đang bán/ngừng bán.
- Một món được thuộc nhiều nhóm, ví dụ “ăn sáng” và “bún & phở”.
- Có nhiều lựa chọn với giá riêng, ví dụ tô nhỏ/tô lớn hoặc thường/đặc biệt.
- Đánh giá gắn với món chung, không tách điểm theo lựa chọn.
- Đổi tên/giá giữ nguyên định danh món và đánh giá cũ; thay thành món khác thì tạo món mới.
- Món ngừng bán vẫn giữ lịch sử đánh giá.

## 4. Đánh giá quán và món

### Quy tắc chung

- Hai loại độc lập: đánh giá quán và đánh giá từng món.
- Có thể đánh giá riêng một phần, không bắt buộc phải chấm quán để chấm món.
- Mỗi người có tối đa một đánh giá hiện tại cho mỗi quán/món.
- Điểm từ 1 đến 5, bước 0,5: 1; 1,5; 2; 2,5; 3; 3,5; 4; 4,5; 5.
- Nội dung và ảnh tùy chọn; được chỉ chấm sao.
- Đánh giá mới hiện ngay khi gửi, không cần duyệt trước.
- Được sửa sao, nội dung, ảnh; lưu thời điểm và toàn bộ sao/nội dung/ảnh của từng phiên bản.
- Chỉ chủ đánh giá xem lịch sử sửa của chính mình. Người khác xem bản hiện tại.
- Được tự xóa đánh giá và đánh giá lại sau khi xóa; vẫn giữ nguyên giới hạn một đánh giá hiện tại/người/đối tượng.
- Ảnh phải có giới hạn. Con số tối đa 5 ảnh/đánh giá đã được đề xuất nhưng **chưa được người dùng xác nhận cụ thể**.

### Điểm hiện tại và điểm tháng

- Điểm chính trên quán/món là trung bình các đánh giá hiện tại hợp lệ của mọi người.
- Có điểm trung bình theo tháng để so sánh chất lượng giữa tháng này và tháng trước.
- Trong một tháng, mỗi người chỉ đóng góp điểm cuối cùng họ chấm/sửa trong tháng cho từng quán/món; sửa nhiều lần không tăng số người đóng góp.
- Không có lượt chấm/sửa hợp lệ trong tháng thì không có đóng góp mới của người đó trong tháng; không tự mang điểm tháng trước sang.
- Ví dụ tháng 9 chấm 4, tháng 10 sửa 3: tháng 9 tính 4, tháng 10 tính 3; điểm hiện tại của người đó là 3.
- Tháng đang diễn ra ghi “tháng này, tính đến hiện tại”. Hiển thị số người đánh giá của từng tháng khi so sánh.
- Tháng không có dữ liệu hiển thị “chưa có dữ liệu”, không dùng 0 sao hoặc tự kết luận tăng/giảm.
- Cách hiển thị delta theo số sao hay phần trăm, quy tắc làm tròn và ngưỡng mẫu chưa chốt.

### Xóa, ẩn và xét lại

- Người dùng tự xóa: bỏ khỏi điểm hiện tại, giữ điểm đã đóng góp ở các tháng trước.
- Admin ẩn vì vi phạm: loại đánh giá khỏi điểm hiện tại và thống kê của mọi tháng.
- Lịch sử cá nhân vẫn giữ khi xóa/ẩn.
- Nội dung bị ẩn có lý do, người viết được thông báo.
- Người viết được sửa và yêu cầu xét lại; bản sửa vẫn bị ẩn đến khi admin duyệt cho hiện lại, không tự công khai khi sửa.
- Chưa chốt cách xử lý điểm của **tháng đang diễn ra** khi người dùng tự xóa; chỉ việc giữ các tháng trước đã được xác nhận rõ.
- Chưa chốt khi đánh giá được hiện lại có khôi phục toàn bộ điểm tháng cũ hay chỉ phiên bản hợp lệ; cũng chưa chốt xóa rồi đánh giá lại trong cùng tháng xử lý lịch sử thế nào.

## 5. Quán đã lưu và quán ruột

### Quán đã lưu

- Danh sách riêng để lưu quán muốn thử.
- Luôn riêng tư, chỉ chủ tài khoản xem.
- Tách biệt với quán ruột; không tự chuyển qua lại giữa hai danh sách.

### Quán ruột

- Là quán đã có trong hệ thống mà người dùng thích và muốn giới thiệu trên hồ sơ.
- Được thêm nhiều quán và bỏ quán bất cứ lúc nào.
- Công khai/riêng tư theo từng quán; mặc định riêng tư, người dùng chủ động bật công khai.
- Có lời giới thiệu văn bản tùy chọn.
- Có thể chọn nhiều món nên thử từ menu của chính quán đó, không bắt buộc.
- Quán ruột công khai xuất hiện trên hồ sơ; quán ruột riêng tư chỉ chủ tài khoản xem.
- Luồng thông thường không cần duyệt trước; lời giới thiệu vẫn có thể bị báo cáo và ẩn vì vi phạm.
- Chính sách hiển thị cả mục quán ruột hay chỉ lời giới thiệu khi bị ẩn chưa chốt.

### Thay đổi phạm vi so với trao đổi ban đầu

Ban đầu đã bàn “người dùng đề xuất quán/món mới, admin duyệt và ghi người giới thiệu”. Người dùng sau đó sửa ý: chỉ là **quán ruột trong các quán sẵn có**. Vì vậy:

- Bỏ luồng gửi đề xuất quán/món mới, chờ duyệt, từ chối và gửi lại.
- Không cần hệ thống ghi nhận nhiều người gửi đề xuất cho một quán mới.
- Không lấy các câu đã chốt của luồng cũ làm yêu cầu cho DB hiện tại.
- Mỗi người độc lập có thể chọn cùng một quán làm quán ruột.

## 6. Kế hoạch ghé quán

### Tạo và chỉnh sửa

- Không phải đặt chỗ; không cần chủ quán xác nhận.
- Kế hoạch riêng tư, chỉ người tạo xem thông tin của mình.
- Chỉ lên kế hoạch đến **trong hôm nay**; không tạo lịch cho nhiều ngày sau.
- Người dùng nhập giờ đến, không nhập giờ rời.
- Số người từ 1 đến 20, mặc định 1.
- Lấy đúng số nhập, **không cộng thêm người tạo**; nhập 3 thì tính 3.
- Có thể sửa thời gian, số người hoặc hủy kế hoạch.
- Mỗi tài khoản chỉ có một kế hoạch còn hiệu lực, dù các kế hoạch khác không trùng giờ; phải hủy kế hoạch cũ hoặc đợi hết hiệu lực trước khi tạo mới.
- Đã thống nhất thao tác hủy; lưu lịch sử thay vì xóa vật lý được đề xuất, thời hạn lưu chưa chốt.

### Thời điểm hết hiệu lực

- Giờ đến phải nằm trong giờ mở cửa của quán.
- Thời điểm hết hiệu lực = giờ đến + thời lượng dự kiến của quán, nhưng không vượt giờ đóng cửa.
- Ví dụ đóng 22:00, đến 21:45, thời lượng 45 phút: kế hoạch hết hiệu lực lúc 22:00.
- Kế hoạch lưu thời lượng dự kiến tại lúc tạo; admin đổi mặc định không tự làm thay đổi kế hoạch đã tạo.
- Hết hiệu lực tự động sau thời điểm kết thúc; không yêu cầu xác nhận đã đến/đã rời trong giai đoạn 1.
- Quy tắc khi sửa kế hoạch có lấy thời lượng mặc định mới không chưa chốt.
- Quy tắc khi admin chỉ đổi giờ mở/đóng của quán sau lúc tạo lịch chưa chốt; khác với ngừng hoạt động.

### Tổng số người dự kiến công khai

- Chỉ công khai tổng số người, không công khai tên, nhóm hoặc kế hoạch riêng lẻ.
- Tính mọi kế hoạch còn hiệu lực tại quán, **kể cả chưa tới giờ đến**.
- Ví dụ hiện tại 11:00: nhóm A 3 người đến 12:00; nhóm B 2 người đến 10:45 và hết hiệu lực 11:30 → hiển thị **5 người**.
- Không có bộ chọn giờ tương lai cho số tổng này trong giai đoạn 1.
- Gọi đúng là “số người có kế hoạch đến”, không coi là số người đang hiện diện hoặc độ đông thực tế.

### Quán ngừng hoạt động

- Quán đã ngừng hoạt động không nhận kế hoạch mới.
- Nếu admin đánh dấu ngừng hoạt động khi còn kế hoạch: tự hủy mọi kế hoạch còn hiệu lực, lưu lý do và thông báo trong app cho người tạo.

## 7. Báo cáo vi phạm và quản trị

- Người dùng đăng nhập được báo cáo đánh giá hoặc lời giới thiệu quán ruột.
- Lý do: spam, nội dung xúc phạm, thông tin sai, ảnh không phù hợp, lý do khác.
- Có mô tả bổ sung tùy chọn.
- Một người chỉ có một báo cáo đang chờ xử lý cho cùng một nội dung, tránh gửi lặp.
- Admin được bác báo cáo hoặc ẩn nội dung, đều ghi lý do.
- Người báo nhận thông báo kết quả xử lý.
- Người viết chỉ nhận thông báo khi nội dung bị ẩn.
- Admin được khóa tài khoản vi phạm.
- Thời hạn khóa, mở khóa, xử lý kế hoạch/nội dung đang tồn tại khi khóa chưa chốt.

## 8. Thông báo

- Thông báo trong app; không gửi email thông báo nghiệp vụ giai đoạn 1.
- Các loại đã chốt: kế hoạch bị hủy do quán ngừng hoạt động; đánh giá/lời giới thiệu bị ẩn; báo cáo vi phạm được xử lý.
- Email vẫn dùng riêng cho xác minh email và đặt lại mật khẩu.
- Trạng thái đã đọc và thời hạn lưu thông báo là chi tiết kỹ thuật chưa chốt.

## 9. Tạm bỏ và phát triển sau

| Tính năng | Quyết định hiện tại |
|---|---|
| Báo độ đông vắng/vừa/đông | Tạm cất, không đưa vào DB giai đoạn 1 |
| Thời hạn/tổng hợp báo độ đông | Chưa chốt; các phương án 30/60 phút, đa số/mới nhất chỉ là trao đổi, không phải yêu cầu |
| Tự xác định đến/rời bằng vị trí | Hướng nâng cao, chưa thiết kế lưu lịch sử vị trí |
| Nhắc trước giờ đến | Để phát triển sau |
| Chủ quán xác nhận đặt chỗ | Không thuộc mô hình hiện tại |
| Chủ quán tự quản lý menu | Không thuộc giai đoạn 1 |
| Người dùng đề xuất quán/món mới để admin duyệt | Đã thay bằng quán ruột, không triển khai |

## 10. Các điểm cần trao đổi tiếp

1. Giới hạn cụ thể ảnh/đánh giá: đã đồng ý cần giới hạn, chưa chốt 5 ảnh.
2. Xóa đánh giá trong tháng đang diễn ra; khôi phục sau ẩn; xóa rồi đánh giá lại trong cùng tháng.
3. Bảo đảm mỗi người chỉ đóng góp một điểm tháng dù có nhiều vòng xóa/tạo lại.
4. Giờ mở qua nửa đêm và ranh giới “hôm nay”; đề xuất dùng múi giờ Asia/Saigon cho nghiệp vụ, chưa có xác nhận riêng.
5. Sửa kế hoạch sau khi admin đổi thời lượng; tác động của thay đổi giờ mở/đóng lên kế hoạch cũ; giờ đến quá khứ có được chọn không.
6. Quyền xem đánh giá/biểu đồ/hồ sơ của khách; phạm vi quyền của tài khoản chưa xác minh email.
7. Nội dung quán ruột bị ẩn có ẩn cả mục công khai không; quy trình sửa và xét lại lời giới thiệu.
8. Tác động của khóa tài khoản lên kế hoạch, nội dung, điểm trung bình; cơ chế mở khóa.
9. Xóa tài khoản, lưu/ẩn danh dữ liệu lịch sử và thời hạn giữ ảnh/phiên bản/thông báo.
10. Dữ liệu tối thiểu khi lập quán, tiện ích/lọc, tìm kiếm, quán không có món đang bán, lựa chọn món ngừng bán.
11. Hệ quản trị DB, ORM/migration, nơi triển khai, lưu ảnh, sao lưu và quy mô sử dụng: chưa lựa chọn.

## 11. Điều kiện bắt đầu triển khai

Người dùng đã yêu cầu: “hãy cứ hỏi lại đến khi t yêu cầu tạo db nhé, ko tự tạo khi chưa có lệnh”. Việc lưu hai file Markdown không thay đổi yêu cầu này. Tiếp tục trao đổi các điểm chưa rõ và chỉ triển khai database sau lệnh tạo DB rõ ràng.
