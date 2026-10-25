import * as XLSX from 'xlsx';
import { AttendanceRecord, Student, STATUS_CONFIG } from '../types';

export interface RoomStatsRow {
  room: string;
  total: number;
  present: number;
  skippedClass?: number;
  ateNoClass: number;
  notAtSchoolThisWeek: number;
  leaveExcused: number;
  leaveUnexcused: number;
  stayWeekend: number;
  rate: string;
  submitted?: boolean;
  submissionTime?: string;
  teacherName?: string;
  teacherNote?: string;
}

export interface DetailedReportItem {
  stt?: number;
  studentId: string;
  studentName: string;
  class: string;
  room: string;
  village: string;
  hamlet: string;
  date: string;
  status: string;
  statusLabel?: string;
  stayWeekend?: boolean;
  note?: string;
  parentPhone?: string;
  gender?: string;
  recordedByName?: string;
  recordedByEmail?: string;
}

// 1. Comprehensive multi-sheet export based on Teacher Duty Attendance
export function exportPeriodicReportToExcel({
  periodType,
  periodLabel,
  schoolName = 'Trường PTDTBT THCS Trà Đốc - TP Đà Nẵng',
  reporterName = 'Ban Quản Lý Nội Trú',
  presentList,
  skippedClassList = [],
  ateNoClassList,
  leaveExcusedList,
  leaveUnexcusedList,
  stayWeekendList,
  roomStats = [],
}: {
  periodType: 'day' | 'week' | 'month';
  periodLabel: string;
  schoolName?: string;
  reporterName?: string;
  presentList: DetailedReportItem[];
  skippedClassList?: DetailedReportItem[];
  ateNoClassList: DetailedReportItem[];
  leaveExcusedList: DetailedReportItem[];
  leaveUnexcusedList: DetailedReportItem[];
  stayWeekendList: DetailedReportItem[];
  roomStats?: RoomStatsRow[];
}) {
  const wb = XLSX.utils.book_new();

  const periodTypeName = 
    periodType === 'day' ? 'THEO NGÀY' :
    periodType === 'week' ? 'THEO TUẦN' : 'THEO THÁNG';

  // ----------------------------------------------------
  // SHEET 1: TỔNG HỢP TOÀN TRƯỜNG & CÁC PHÒNG NỘI TRÚ
  // ----------------------------------------------------
  const summaryAoa: any[][] = [
    [`BÁO CÁO ĐIỂM DANH TỔNG HỢP HỌC SINH NỘI TRÚ ${periodTypeName}`],
    [`Đơn vị: ${schoolName}`],
    [`Thời gian: ${periodLabel} • Người lập báo cáo: ${reporterName}`],
    [],
    ['=== BẢNG CHỈ SỐ TOÀN TRƯỜNG ==='],
    ['Chỉ số', 'Số lượng', 'Ghi chú'],
    ['1. Học sinh có mặt (Ăn & Học đủ)', presentList.length, 'Chuyên cần, đúng giờ'],
    ['2. Học sinh lên ăn không đi học', ateNoClassList.length, 'Cần nhắc nhở lên lớp'],
    ['3. Học sinh nghỉ có phép', leaveExcusedList.length, 'Có lý do / phụ huynh xin'],
    ['4. Học sinh nghỉ không phép', leaveUnexcusedList.length, 'Bỏ tiết / không rõ lý do'],
    ['5. Học sinh ở lại cuối tuần (Báo suất ăn T7-CN)', stayWeekendList.length, 'Báo nhà bếp chuẩn bị khẩu phần ăn'],
    [],
  ];

  if (roomStats.length > 0) {
    summaryAoa.push(['=== TÌNH HÌNH THEO TỪNG PHÒNG NỘI TRÚ (GIÁO VIÊN TRỰC BÁO CÁO) ===']);
    summaryAoa.push([
      'STT',
      'Phòng nội trú',
      'Trạng thái báo cáo',
      'Tổng HS',
      'Có mặt',
      'Ăn không học',
      'Nghỉ có phép',
      'Nghỉ không phép',
      'Báo ăn T7-CN',
      'Tỷ lệ chuyên cần',
      'Giáo viên trực phòng',
      'Ghi chú / Nhật ký phòng',
    ]);

    let sumTotal = 0;
    let sumPres = 0;
    let sumAte = 0;
    let sumExc = 0;
    let sumUnexc = 0;
    let sumWknd = 0;

    roomStats.forEach((r, idx) => {
      sumTotal += r.total;
      sumPres += r.present;
      sumAte += r.ateNoClass;
      sumExc += r.leaveExcused;
      sumUnexc += r.leaveUnexcused;
      sumWknd += r.stayWeekend;

      summaryAoa.push([
        idx + 1,
        r.room,
        r.submitted ? 'Đã nộp' : 'Chưa nộp',
        r.total,
        r.present,
        r.ateNoClass,
        r.leaveExcused,
        r.leaveUnexcused,
        r.stayWeekend,
        r.rate,
        r.teacherName || '',
        r.teacherNote || '',
      ]);
    });

    const totalRate = sumTotal > 0 ? `${Math.round((sumPres / sumTotal) * 100)}%` : '0%';
    summaryAoa.push([
      'TỔNG',
      'TOÀN TRƯỜNG',
      '',
      sumTotal,
      sumPres,
      sumAte,
      sumExc,
      sumUnexc,
      sumWknd,
      totalRate,
      '',
      `Tổng cộng ${sumWknd} suất ăn cuối tuần`,
    ]);
  }

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Tổng hợp chung');

  // ----------------------------------------------------
  // SHEET 2: DANH SÁCH CÓ MẶT TOÀN TRƯỜNG
  // ----------------------------------------------------
  const presentAoa: any[][] = [
    [`DANH SÁCH HỌC SINH NỘI TRÚ CÓ MẶT ĐẦY ĐỦ ${periodTypeName}`],
    [`Thời gian: ${periodLabel} • Tổng số: ${presentList.length} lượt/em`],
    [],
    ['STT', 'Mã HS', 'Họ và tên', 'Lớp', 'Phòng', 'Thôn', 'Nóc', 'Ngày điểm danh', 'Giới tính', 'SĐT Phụ huynh', 'GV Ghi nhận'],
  ];

  presentList.forEach((item, idx) => {
    presentAoa.push([
      idx + 1,
      item.studentId,
      item.studentName,
      item.class,
      item.room,
      item.village,
      item.hamlet,
      item.date,
      item.gender === 'female' ? 'Nữ' : 'Nam',
      item.parentPhone || '',
      item.recordedByName || item.recordedByEmail || '',
    ]);
  });

  const wsPresent = XLSX.utils.aoa_to_sheet(presentAoa);
  XLSX.utils.book_append_sheet(wb, wsPresent, '1. Có mặt toàn trường');

  // ----------------------------------------------------
  // SHEET 3: DANH SÁCH ĂN KHÔNG HỌC TOÀN TRƯỜNG
  // ----------------------------------------------------
  const ateAoa: any[][] = [
    [`DANH SÁCH HỌC SINH LÊN ĂN CƠM NHƯNG KHÔNG ĐI HỌC ${periodTypeName}`],
    [`Thời gian: ${periodLabel} • Tổng số: ${ateNoClassList.length} em`],
    ['Lưu ý: Cần phối hợp với GVCN và BGH tìm hiểu nguyên nhân, đôn đốc các em lên lớp'],
    [],
    ['STT', 'Mã HS', 'Họ và tên', 'Lớp', 'Phòng', 'Thôn', 'Nóc', 'Ngày điểm danh', 'Lý do / Tình trạng', 'SĐT Phụ huynh', 'GV Trực phát hiện'],
  ];

  ateNoClassList.forEach((item, idx) => {
    ateAoa.push([
      idx + 1,
      item.studentId,
      item.studentName,
      item.class,
      item.room,
      item.village,
      item.hamlet,
      item.date,
      item.note || 'Lên ăn cơm nhưng trốn học / ở lại phòng',
      item.parentPhone || '',
      item.recordedByName || item.recordedByEmail || '',
    ]);
  });

  const wsAte = XLSX.utils.aoa_to_sheet(ateAoa);
  XLSX.utils.book_append_sheet(wb, wsAte, '2. Ăn không học');

  // ----------------------------------------------------
  // SHEET 4: DANH SÁCH NGHỈ CÓ PHÉP TOÀN TRƯỜNG
  // ----------------------------------------------------
  const leaveExcAoa: any[][] = [
    [`DANH SÁCH HỌC SINH NGHỈ CÓ PHÉP ${periodTypeName}`],
    [`Thời gian: ${periodLabel} • Tổng số: ${leaveExcusedList.length} em`],
    [],
    ['STT', 'Mã HS', 'Họ và tên', 'Lớp', 'Phòng', 'Thôn', 'Nóc', 'Ngày điểm danh', 'Lý do xin phép', 'SĐT Phụ huynh', 'GV Ghi nhận'],
  ];

  leaveExcusedList.forEach((item, idx) => {
    leaveExcAoa.push([
      idx + 1,
      item.studentId,
      item.studentName,
      item.class,
      item.room,
      item.village,
      item.hamlet,
      item.date,
      item.note || 'Có đơn / phụ huynh gọi điện xin phép',
      item.parentPhone || '',
      item.recordedByName || item.recordedByEmail || '',
    ]);
  });

  const wsLeaveExc = XLSX.utils.aoa_to_sheet(leaveExcAoa);
  XLSX.utils.book_append_sheet(wb, wsLeaveExc, '3. Nghỉ có phép');

  // ----------------------------------------------------
  // SHEET 5: DANH SÁCH NGHỈ KHÔNG PHÉP TOÀN TRƯỜNG
  // ----------------------------------------------------
  const leaveUnexcAoa: any[][] = [
    [`DANH SÁCH HỌC SINH NGHỈ KHÔNG PHÉP ${periodTypeName}`],
    [`Thời gian: ${periodLabel} • Tổng số: ${leaveUnexcusedList.length} em`],
    ['Lưu ý: BGH và GVCN cần liên hệ ngay cho phụ huynh và chính quyền thôn nóc để tìm hiểu'],
    [],
    ['STT', 'Mã HS', 'Họ và tên', 'Lớp', 'Phòng', 'Thôn', 'Nóc', 'Ngày điểm danh', 'Ghi chú chi tiết', 'SĐT Phụ huynh', 'GV Trực báo cáo'],
  ];

  leaveUnexcusedList.forEach((item, idx) => {
    leaveUnexcAoa.push([
      idx + 1,
      item.studentId,
      item.studentName,
      item.class,
      item.room,
      item.village,
      item.hamlet,
      item.date,
      item.note || 'Vắng mặt không rõ lý do',
      item.parentPhone || '',
      item.recordedByName || item.recordedByEmail || '',
    ]);
  });

  const wsLeaveUnexc = XLSX.utils.aoa_to_sheet(leaveUnexcAoa);
  XLSX.utils.book_append_sheet(wb, wsLeaveUnexc, '4. Nghỉ không phép');

  // ----------------------------------------------------
  // SHEET 6: BÁO ĂN CUỐI TUẦN (T7 - CN) - GỬI NHÀ BẾP
  // ----------------------------------------------------
  const weekendAoa: any[][] = [
    [`TỔNG HỢP DANH SÁCH HỌC SINH Ở LẠI CUỐI TUẦN ĐỂ BÁO SUẤT ĂN`],
    [`Đơn vị: ${schoolName}`],
    [`Thời gian áp dụng: ${periodLabel}`],
    [`TỔNG SỐ LƯỢNG SUẤT ĂN ĐĂNG KÝ BÁO BẾP: ${stayWeekendList.length} SUẤT`],
    ['(Do các Giáo Viên Trực Phòng tổng hợp & điểm danh từng phòng)'],
    [],
    [
      'STT',
      'Họ và tên học sinh',
      'Lớp',
      'Phòng ở',
      'Thôn',
      'Nóc',
      'Trạng thái ở lại',
      'Ngày điểm danh',
      'Ghi chú khẩu phần / Dị ứng',
      'Giáo viên trực phòng xác nhận',
      'Ký nhận / Nhà bếp ghi chú',
    ],
  ];

  stayWeekendList.forEach((item, idx) => {
    weekendAoa.push([
      idx + 1,
      item.studentName,
      item.class,
      item.room,
      item.village,
      item.hamlet,
      'Ở lại trường ăn Thứ 7 & Chủ Nhật',
      item.date,
      item.note || 'Ăn đủ bữa theo quy định',
      item.recordedByName || item.recordedByEmail || '',
      '',
    ]);
  });

  // Footer for Kitchen & Admin Signature
  weekendAoa.push([]);
  weekendAoa.push(['', '', '', '', '', '', `Đà Nẵng, ngày .... tháng .... năm 2026`]);
  weekendAoa.push(['NGƯỜI LẬP BÁO CÁO', '', '', 'ĐẠI DIỆN TỔ CẤP DƯỠNG (NHÀ BẾP)', '', '', 'BAN GIÁM HIỆU DUYỆT']);
  weekendAoa.push(['(Ký và ghi rõ họ tên)', '', '', '(Ký và ghi rõ họ tên)', '', '', '(Ký và đóng dấu)']);

  const wsWeekend = XLSX.utils.aoa_to_sheet(weekendAoa);
  XLSX.utils.book_append_sheet(wb, wsWeekend, '5. Báo suất ăn cuối tuần');

  // Format file name
  const safePeriod = periodLabel.replace(/[\/\\?%*:|"<> ]/g, '_');
  const filename = `BaoCao_TongHop_NoiTru_${periodType.toUpperCase()}_${safePeriod}.xlsx`;

  XLSX.writeFile(wb, filename);
}

// 2. Export a single dedicated category list (e.g. only Weekend Meals, only Present, etc.)
export function exportSingleListToExcel({
  title,
  periodLabel,
  list,
  categoryType,
  schoolName = 'Trường PTDTBT THCS Trà Đốc - TP Đà Nẵng',
}: {
  title: string;
  periodLabel: string;
  list: DetailedReportItem[];
  categoryType: 'present' | 'skipped_class' | 'ate_no_class' | 'leave_excused' | 'leave_unexcused' | 'stay_weekend';
  schoolName?: string;
}) {
  const wb = XLSX.utils.book_new();

  const dataAoa: any[][] = [
    [title.toUpperCase()],
    [`Đơn vị: ${schoolName}`],
    [`Thời gian: ${periodLabel} • Tổng số học sinh: ${list.length} em`],
    [],
  ];

  if (categoryType === 'stay_weekend') {
    dataAoa.push(['TỔNG SỐ SUẤT ĂN BÁO NHÀ BẾP: ' + list.length + ' SUẤT']);
    dataAoa.push([]);
    dataAoa.push([
      'STT',
      'Họ và tên học sinh',
      'Lớp',
      'Phòng ở',
      'Thôn',
      'Nóc',
      'Báo suất ăn cuối tuần',
      'Ngày điểm danh',
      'Ghi chú',
      'GV Trực phòng xác nhận',
    ]);

    list.forEach((item, idx) => {
      dataAoa.push([
        idx + 1,
        item.studentName,
        item.class,
        item.room,
        item.village,
        item.hamlet,
        'Ở lại ăn Thứ 7 - Chủ Nhật',
        item.date,
        item.note || '',
        item.recordedByName || item.recordedByEmail || '',
      ]);
    });

    dataAoa.push([]);
    dataAoa.push(['NGƯỜI LẬP (GV TRỰC)', '', '', 'NHÀ BẾP XÁC NHẬN', '', '', 'BAN GIÁM HIỆU']);
  } else {
    dataAoa.push([
      'STT',
      'Mã HS',
      'Họ và tên học sinh',
      'Lớp',
      'Phòng ở',
      'Thôn',
      'Nóc',
      'Trạng thái điểm danh',
      'Ngày điểm danh',
      'Lý do / Ghi chú',
      'SĐT Phụ huynh',
      'GV Trực ghi nhận',
    ]);

    list.forEach((item, idx) => {
      dataAoa.push([
        idx + 1,
        item.studentId,
        item.studentName,
        item.class,
        item.room,
        item.village,
        item.hamlet,
        item.statusLabel || item.status,
        item.date,
        item.note || '',
        item.parentPhone || '',
        item.recordedByName || item.recordedByEmail || '',
      ]);
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(dataAoa);
  const sheetName = title.slice(0, 30);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const safeTitle = title.replace(/[\/\\?%*:|"<> ]/g, '_');
  const filename = `${safeTitle}_${periodLabel.replace(/[\/\\?%*:|"<> ]/g, '_')}.xlsx`;

  XLSX.writeFile(wb, filename);
}
