# Tích hợp Ô Tải Video Minh Chứng Từng Tiêu Chí Thi Đua (25 Phòng Ở)

Kế hoạch bổ sung chức năng tải video minh chứng trực tiếp bên cạnh nút tải hình ảnh của từng tiêu chí thi đua cho toàn bộ 25 phòng ở, tích hợp trình phát video thu nhỏ và phóng to toàn màn hình theo phản hồi của thầy cô.

> [!IMPORTANT]
> **Các quyết định đã xác nhận với Thầy/Cô:**
> - **Nút thao tác**: Thêm nút **🎬 Tải video** (và quay video từ máy) nằm ngay bên cạnh nút **Tải hình ảnh** của từng tiêu chí thi đua.
> - **Dung lượng video**: Hỗ trợ video linh hoạt không giới hạn độ dài, tự động tối ưu hóa lưu trữ an toàn (kết hợp IndexedDB cục bộ và dữ liệu minh chứng) để tránh nghẽn mạng hay vượt hạn mức Firestore 1MB/bản ghi.
> - **Hiển thị minh chứng**: Hiển thị khung xem video thu nhỏ ngay bên dưới tiêu chí với các nút điều khiển trực tiếp (Play, Pause, Mute), nút phóng to toàn màn hình và nút xóa video.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   TIÊU CHÍ THI ĐUA PHÒNG Ở                             │
│ 1. Vệ sinh phòng ở (Định mức: 100 điểm)                                │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ [📷 Chụp trực tiếp]  [📤 Tải hình ảnh]  [🎬 Tải video]              │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│ Minh chứng đã tải:                                                     │
│ ┌───────────────┐ ┌───────────────┐ ┌────────────────────────────────┐ │
│ │  Ảnh 1 (Xem)  │ │  Ảnh 2 (Xem)  │ │ 🎬 Video minh chứng            │ │
│ │  [🔍] [🗑️]    │ │  [🔍] [🗑️]    │ │ [ ▶ Phát trực tiếp ] [ ⛶ Toàn ]│ │
│ └───────────────┘ └───────────────┘ └────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Tổng quan & Mục tiêu

- **Tính năng mới**: Bổ sung ô/nút **🎬 Tải video** bên cạnh các nút ảnh hiện tại (`Chụp trực tiếp`, `Tải hình ảnh`) trong từng tiêu chí chấm điểm thi đua của tất cả các phòng ở.
- **Đối tượng sử dụng**: Thầy cô Ban Giám hiệu, Ban Quản sinh, Đoàn Thanh niên, GV trực phòng khi đi kiểm tra và phát hiện hành vi/nề nếp cần quay clip ngắn làm bằng chứng xác thực (ví dụ: tiếng ồn giờ ngủ, vệ sinh góc phòng, chập cháy điện, v.v.).
- **Giá trị mang lại**: Cung cấp bằng chứng trực quan, sinh động và rõ ràng hơn hình ảnh tĩnh, giúp việc xếp loại thi đua giữa các phòng ở công bằng, minh bạch và thuyết phục.

---

## 2. Trải nghiệm người dùng & Giao diện (UX/UI)

### Luồng tương tác:
1. **Nút bấm trực quan**:
   - Bên cạnh nút `[📷 Chụp trực tiếp]` và `[📤 Tải hình ảnh]`, thêm nút `[🎬 Tải video]` với màu sắc nhận diện thanh lịch (nền tím/xanh ngọc nhạt hoặc nút xám viền sắc nét theo chuẩn SaaS Dashboard).
   - Hỗ trợ chọn tệp video từ máy tính/điện thoại (mp4, webm, mov, m4v) hoặc quay trực tiếp từ camera điện thoại.
2. **Khung video thu nhỏ (Video Thumbnail & Player)**:
   - Hiển thị ngay trong lưới minh chứng của tiêu chí đó với tỷ lệ khung hình cân đối (16:9 hoặc bo tròn góc 12px chuẩn).
   - Tích hợp thanh điều khiển tiện lợi: Nút Play/Pause, tua thời gian, bật/tắt âm thanh.
   - Nút **Phóng to toàn màn hình** (`Maximize2`) mở Modal xem video chất lượng cao kèm thông tin tiêu chí và thời gian ghi nhận.
   - Nút **Xóa video** (`Trash2`) có xác nhận nhẹ nhàng giúp thu hồi nếu chọn nhầm file.
3. **Hiển thị trong Báo cáo Chi tiết & Xếp hạng**:
   - Khi Ban Giám hiệu bấm xem chi tiết kết quả chấm điểm từng phòng trong bảng xếp hạng, các video minh chứng của từng tiêu chí sẽ hiển thị và phát mượt mà, hỗ trợ tải về hoặc trình chiếu.

---

## 3. Kiến trúc kỹ thuật & Lưu trữ dữ liệu

### Cập nhật Kiểu dữ liệu (`src/types.ts`):
- Mở rộng `CompetitionRoomEvaluation`:
  - `criterionVideos?: Record<string, string[]>`: Lưu trữ danh sách URL/blob/base64 video minh chứng theo từng `criterionId`.
  - Cập nhật tương ứng trong `DepartmentScoreSummary`.

### Quản lý dung lượng & Tối ưu hiệu năng:
- Video thường có dung lượng từ vài MB đến vài chục MB, trong khi Firestore có giới hạn cứng **1MB/document**.
- **Giải pháp lưu trữ thông minh**:
  - Tích hợp module lưu trữ IndexedDB chuyên dụng (`indexedDB` dành cho video minh chứng nặng) để đảm bảo lưu trữ không giới hạn dung lượng cục bộ trên máy người dùng và máy chấm điểm.
  - Nén video kích thước nhẹ hoặc tạo video preview URL để bản ghi Firestore luôn nhẹ nhàng, lưu trữ tức thì và không bị lỗi nghẽn đường truyền.

---

## 4. Các bước triển khai

1. **Cập nhật Types (`src/types.ts`)**:
   - Bổ sung trường `criterionVideos` vào `CompetitionRoomEvaluation` và `DepartmentScoreSummary`.
2. **Tạo Tiện ích Quản lý Video (`src/utils/videoStorage.ts`)**:
   - Hỗ trợ xử lý đọc file video, tạo thumbnail, lưu trữ video blob mượt mà, đảm bảo không bị quá tải bộ nhớ.
3. **Cập nhật Giao diện Chấm điểm (`src/components/CompetitionScoringView.tsx`)**:
   - Thêm nút `🎬 Tải video` cạnh `Tải hình ảnh` cho từng tiêu chí trong toàn bộ 25 phòng ở.
   - Bổ sung ô hiển thị video minh chứng trực tiếp dưới tiêu chí.
   - Thêm Modal xem video toàn màn hình (`previewVideoModal`).
   - Cập nhật Modal chi tiết phòng ở để hội đồng thi đua có thể xem lại video đã chấm.
4. **Kiểm thử & Biên dịch**:
   - Chạy `compile_applet` để xác thực toàn bộ hệ thống hoạt động ổn định và sẵn sàng sử dụng.
