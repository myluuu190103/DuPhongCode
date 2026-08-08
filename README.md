# DuPhongCode — Trang lịch sự kiện & khóa học BKE

Trang tĩnh chạy trên GitHub Pages: <https://myluuu190103.github.io/DuPhongCode/>

## Cập nhật lịch khóa học

**Chỉ cần sửa Google Sheet. Không đụng vào code.**

Sửa xong bấm F5 trên trang là thấy ngay — trang đọc thẳng từ Sheet.

### Ý nghĩa từng cột

| Cột trong Sheet | Bắt buộc | Ghi chú |
|---|---|---|
| **Khóa học** | ✅ | Thiếu là dòng đó bị bỏ qua |
| **Diễn giả** | ✅ | Thiếu là dòng đó bị bỏ qua |
| **Từ ngày** | ✅ | `dd/mm/yyyy`, xem cảnh báo bên dưới |
| **Đến ngày** | | Để trống nếu học 1 ngày |
| **Địa điểm** | | Quyết định khóa nằm ô nào trên trang: chứa "Hồ Chí Minh" / "Hà Nội" / "Zoom", còn lại vào ô "Tỉnh/Thành Phố Khác" |
| **Hình thức** | | `Offline`, `Zoom`, `Offline và Zoom` — quyết định màu và icon của nhãn |
| **Học phí** | | Toàn số thì tự thêm "vnđ"; có chữ như `MIỄN PHÍ`, `Liên hệ` thì giữ nguyên |
| **Chi tiết (link)** | | Link mở khi bấm vào tên khóa hoặc nút "Chi tiết" |
| **Đăng ký (link)** | | Link riêng cho nút "Đăng ký ngay". Để trống thì dùng link Chi tiết |
| **Loại khóa học**, **Thumbnail**, **Mô tả**, **ID record** | | Tùy chọn |

Đổi tên cột vẫn chạy được nếu tên mới nằm trong danh sách biến thể ở
`HEADER_ALIASES` (trong `index.html` và `scripts/sync-sheet.mjs`). Thêm cột mới
hoặc đổi thứ tự cột thì không sao — code dò theo tên tiêu đề, không theo vị trí.

> ⚠ **Cột ngày nên để Định dạng → Văn bản thuần túy (Plain text).**
> Nếu để Google hiểu là kiểu Ngày tháng, tùy ngôn ngữ của Sheet mà `07/11/2026`
> có thể bị xuất thành *7 tháng 11* thay vì *11 tháng 7*, và không có cách nào
> đoán đúng chắc chắn.
> *(Đã kiểm tra 08/2026: cả 132 dòng hiện tại đều đang đúng `dd/mm/yyyy`.)*

Khóa học đã kết thúc tự động biến mất khỏi trang, **không cần xóa dòng cũ** —
Sheet cứ giữ làm lịch sử.

### Đổi sang Sheet khác

Sửa khối `const SHEET` trong [`index.html`](index.html). Đó là chỗ duy nhất,
workflow đồng bộ cũng đọc cấu hình từ đây.

```js
const SHEET = {
  id:  '1S6BHr6MFR_-37EHV60ZXfS5_7DdnTAj7zEcCQ12wFsU',  // .../spreadsheets/d/<ID>/edit
  gid: '0'                                              // ...#gid=<GID>, ứng với 1 tab
};
```

Sheet phải được chia sẻ ở chế độ **"Bất kỳ ai có đường liên kết" → Người xem**,
nếu không trình duyệt của khách sẽ không đọc được.

## Dữ liệu lấy từ đâu

Trang thử lần lượt 3 nguồn, nguồn nào có dữ liệu thì dùng:

1. **Google Sheet** — đọc trực tiếp, cập nhật tức thì. Bỏ qua nếu quá 4 giây.
2. **`data.json`** — bản sao do GitHub Action đồng bộ mỗi giờ, dùng khi Google lỗi.
3. **Dữ liệu nhúng trong `index.html`** — phao cuối, chụp tại thời điểm 08/2026.

Mở Console của trình duyệt (F12) sẽ thấy dòng `[dữ liệu] nguồn: ...` cho biết
trang đang chạy bằng nguồn nào.

## Muốn cập nhật `data.json` ngay

Vào tab **Actions** → **Đồng bộ dữ liệu từ Google Sheet** → **Run workflow**.
Bình thường nó tự chạy mỗi giờ và chỉ commit khi dữ liệu thật sự đổi.

## Ghi chú kỹ thuật

- Logic đọc CSV nằm ở 2 nơi và **phải giữ giống nhau**: trong `index.html`
  (trình duyệt đọc Sheet) và `scripts/sync-sheet.mjs` (Action tạo `data.json`).
- Webhook cũ `webhook.gnh.vn/webhook/event_info` đã ngừng hoạt động (Cloudflare
  1033) từ trước 08/2026 và đã được gỡ khỏi code.
- `nhap.html` là bản nháp cũ không còn dùng, nhưng vẫn đang được deploy.
