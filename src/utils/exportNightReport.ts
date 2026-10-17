import * as XLSX from 'xlsx';
import { Student, NightStudyRecord, NightRoomSummary, NIGHT_STUDY_CONFIG, NightStudyStatus } from '../types';

export interface NightRoomStatsRow {
  room: string;
  genderGroup: 'Phòng Nam' | 'Phòng Nữ';
  total: number;
  present: number;
  absentExcused: number;
  absentUnexcused: number;
  rate: string;
  submitted?: boolean;
  teacherName?: string;
  notes?: string;
}

export function exportNightStudyToExcel({
  dateLabel,
  schoolName = 'Trường PTDTBT THCS Trà Đốc - TP Đà Nẵng',
  reporterName = 'Ban Quản Lý / GV Trực Đêm',
  roomStatsRows,
  presentItems,
  absentExcusedItems,
  absentUnexcusedItems,
  allStudentsWithNightStatus,
}: {
  dateLabel: string;
  schoolName?: string;
  reporterName?: string;
  roomStatsRows: NightRoomStatsRow[];
  presentItems: (NightStudyRecord & { gender?: string; parentPhone?: string })[];
  absentExcusedItems: (NightStudyRecord & { gender?: string; parentPhone?: string })[];
  absentUnexcusedItems: (NightStudyRecord & { gender?: string; parentPhone?: string })[];
  allStudentsWithNightStatus: (Student & { nightStatus: NightStudyStatus; nightNote?: string; recordedByName?: string })[];
}) {
  const wb = XLSX.utils.book_new();

  // -----------------------------------------------------------------
  // SHEET 1: BẢNG TỔNG HỢP 25 PHÒNG TỰ HỌC ĐÊM & TOÀN TRƯỜNG
  // -----------------------------------------------------------------
  const summaryAoa: any[][] = [
    ['BÁO CÁO TỔNG HỢP TÌNH HÌNH ĐIỂM DANH TỰ HỌC ĐÊM NỘI TRÚ'],
    [`Đơn vị: ${schoolName}`],
    [`Thời gian điểm danh: ${dateLabel} • Người lập báo cáo: ${reporterName}`],
    [],
    ['=== CHỈ SỐ TỔNG TOÀN NỘI TRÚ ==='],
    ['Chỉ số', 'Số lượng', 'Ghi chú'],
    ['Tổng số học sinh nội trú', allStudentsWithNightStatus.length, '25 phòng (12 nam, 13 nữ)'],
    ['Tổng số có mặt tự học đêm', presentItems.length, 'Có mặt đúng giờ tại phòng học đêm'],
    ['Tổng số vắng có phép', absentExcusedItems.length, 'Nghỉ ốm / có đơn xin phép'],
    ['Tổng số vắng không phép', absentUnexcusedItems.length, 'Cần đôn đốc và nhắc nhở'],
    [],
    ['=== BẢNG TỔNG HỢP CHI TIẾT 25 PHÒNG Ở (12 PHÒNG NAM & 13 PHÒNG NỮ) ==='],
    [
      'STT',
      'Phòng ở',
      'Khu vực',
      'Trạng thái báo cáo',
      'Tổng số HS',
      'Có mặt học đêm',
      'Vắng có phép',
      'Vắng không phép',
      'Tỷ lệ chuyên cần',
      'Giáo viên trực đêm',
      'Nhật ký / Ghi chú trực đêm',
    ],
  ];

  let grandTotal = 0;
  let grandPresent = 0;
  let grandExcused = 0;
  let grandUnexcused = 0;
  let submittedCount = 0;

  roomStatsRows.forEach((r, idx) => {
    grandTotal += r.total;
    grandPresent += r.present;
    grandExcused += r.absentExcused;
    grandUnexcused += r.absentUnexcused;
    if (r.submitted) submittedCount++;

    summaryAoa.push([
      idx + 1,
      r.room,
      r.genderGroup,
      r.submitted ? 'Đã nộp báo cáo' : 'Chưa nộp',
      r.total,
      r.present,
      r.absentExcused,
      r.absentUnexcused,
      r.rate,
      r.teacherName || '',
      r.notes || '',
    ]);
  });

  const overallRate = grandTotal > 0 ? `${Math.round((grandPresent / grandTotal) * 100)}%` : '0%';
  summaryAoa.push([
    'TỔNG',
    'TOÀN NỘI TRÚ (25 PHÒNG)',
    '12 Nam - 13 Nữ',
    `Đã nộp: ${submittedCount}/${roomStatsRows.length} phòng`,
    grandTotal,
    grandPresent,
    grandExcused,
    grandUnexcused,
    overallRate,
    '',
    `Tổng cộng ${grandPresent}/${grandTotal} em có mặt học đêm`,
  ]);

  summaryAoa.push([]);
  summaryAoa.push(['', '', '', '', '', '', `Trà Đốc, ngày .... tháng .... năm ....`]);
  summaryAoa.push(['GIÁO VIÊN TRỰC ĐÊM', '', '', '', 'BAN QUẢN LÝ NỘI TRÚ', '', 'BAN GIÁM HIỆU DUYỆT']);
  summaryAoa.push(['(Ký và ghi rõ họ tên)', '', '', '', '(Ký và ghi rõ họ tên)', '', '(Ký và đóng dấu)']);

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Tổng hợp 25 phòng học đêm');

  // -----------------------------------------------------------------
  // SHEET 2: DANH SÁCH CÓ MẶT HỌC ĐÊM
  // -----------------------------------------------------------------
  const presentAoa: any[][] = [
    ['DANH SÁCH HỌC SINH CÓ MẶT TỰ HỌC ĐÊM TOÀN TRƯỜNG'],
    [`Thời gian: ${dateLabel} • Tổng số: ${presentItems.length} em`],
    [],
    [
      'STT',
      'Mã HS',
      'Họ và tên học sinh',
      'Số phòng ở',
      'Ở giường số',
      'Lớp',
      'Thôn',
      'Nóc',
      'Trạng thái',
      'Ghi chú học tập',
      'GV Trực đêm ghi nhận',
    ],
  ];

  presentItems.forEach((item, idx) => {
    presentAoa.push([
      idx + 1,
      item.studentId,
      item.studentName,
      item.room,
      item.bedNumber || '',
      item.class,
      item.village,
      item.hamlet || '',
      'Có mặt học đêm',
      item.note || 'Tự học nghiêm túc',
      item.recordedByName || item.recordedByEmail || '',
    ]);
  });

  const wsPresent = XLSX.utils.aoa_to_sheet(presentAoa);
  XLSX.utils.book_append_sheet(wb, wsPresent, 'Có mặt học đêm');

  // -----------------------------------------------------------------
  // SHEET 3: DANH SÁCH VẮNG CÓ PHÉP
  // -----------------------------------------------------------------
  const excusedAoa: any[][] = [
    ['DANH SÁCH HỌC SINH VẮNG CÓ PHÉP BUỔI TỰ HỌC ĐÊM'],
    [`Thời gian: ${dateLabel} • Tổng số: ${absentExcusedItems.length} em`],
    [],
    [
      'STT',
      'Mã HS',
      'Họ và tên học sinh',
      'Số phòng ở',
      'Ở giường số',
      'Lớp',
      'Thôn',
      'Nóc',
      'Trạng thái',
      'Lý do vắng phép',
      'SĐT Phụ huynh',
      'GV Trực đêm ghi nhận',
    ],
  ];

  absentExcusedItems.forEach((item, idx) => {
    excusedAoa.push([
      idx + 1,
      item.studentId,
      item.studentName,
      item.room,
      item.bedNumber || '',
      item.class,
      item.village,
      item.hamlet || '',
      'Vắng có phép',
      item.note || 'Nghỉ ốm / có đơn xin phép',
      item.parentPhone || '',
      item.recordedByName || item.recordedByEmail || '',
    ]);
  });

  const wsExcused = XLSX.utils.aoa_to_sheet(excusedAoa);
  XLSX.utils.book_append_sheet(wb, wsExcused, 'Vắng có phép');

  // -----------------------------------------------------------------
  // SHEET 4: DANH SÁCH VẮNG KHÔNG PHÉP
  // -----------------------------------------------------------------
  const unexcusedAoa: any[][] = [
    ['DANH SÁCH HỌC SINH VẮNG KHÔNG PHÉP BUỔI TỰ HỌC ĐÊM'],
    [`Thời gian: ${dateLabel} • Tổng số: ${absentUnexcusedItems.length} em`],
    ['Lưu ý: GV Trực đêm và GVCN cần kiểm tra ngay tình trạng của các em để đảm bảo an toàn an ninh'],
    [],
    [
      'STT',
      'Mã HS',
      'Họ và tên học sinh',
      'Số phòng ở',
      'Ở giường số',
      'Lớp',
      'Thôn',
      'Nóc',
      'Trạng thái',
      'Ghi chú / Tình trạng',
      'SĐT Phụ huynh',
      'GV Trực đêm báo cáo',
    ],
  ];

  absentUnexcusedItems.forEach((item, idx) => {
    unexcusedAoa.push([
      idx + 1,
      item.studentId,
      item.studentName,
      item.room,
      item.bedNumber || '',
      item.class,
      item.village,
      item.hamlet || '',
      'Vắng không phép',
      item.note || 'Vắng mặt không rõ lý do',
      item.parentPhone || '',
      item.recordedByName || item.recordedByEmail || '',
    ]);
  });

  const wsUnexcused = XLSX.utils.aoa_to_sheet(unexcusedAoa);
  XLSX.utils.book_append_sheet(wb, wsUnexcused, 'Vắng không phép');

  // -----------------------------------------------------------------
  // SHEET 5: TOÀN BỘ DANH SÁCH 25 PHÒNG (KÈM GIƯỜNG SỐ & GHI CHÚ)
  // -----------------------------------------------------------------
  const allAoa: any[][] = [
    ['BẢNG ĐIỂM DANH TỰ HỌC ĐÊM CHI TIẾT 25 PHÒNG NỘI TRÚ'],
    [`Thời gian: ${dateLabel} • Đơn vị: ${schoolName}`],
    [],
    [
      'STT',
      'Mã HS',
      'Họ và tên học sinh',
      'Giới tính',
      'Số phòng ở',
      'Ở giường số',
      'Lớp',
      'Thôn',
      'Nóc',
      'Trạng thái tự học đêm',
      'Ghi chú buổi học đêm',
      'Ghi chú cá nhân',
      'SĐT Phụ huynh',
    ],
  ];

  allStudentsWithNightStatus.forEach((s, idx) => {
    const statusCfg = NIGHT_STUDY_CONFIG[s.nightStatus] || NIGHT_STUDY_CONFIG.present_night;
    allAoa.push([
      idx + 1,
      s.id,
      s.name,
      s.gender,
      s.room,
      s.bedNumber || '',
      s.class,
      s.village,
      s.hamlet,
      statusCfg.label,
      s.nightNote || '',
      s.notes || '',
      s.parentPhone || '',
    ]);
  });

  const wsAll = XLSX.utils.aoa_to_sheet(allAoa);
  XLSX.utils.book_append_sheet(wb, wsAll, 'Chi tiết toàn trường đêm');

  // Save workbook
  const safeDate = dateLabel.replace(/[\/\\?%*:|"<> ]/g, '_');
  XLSX.writeFile(wb, `BaoCao_TuHocDem_NoiTru_${safeDate}.xlsx`);
}
