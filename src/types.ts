export type AttendanceStatus = 
  | 'present' 
  | 'ate_no_class' 
  | 'not_at_school_this_week' 
  | 'leave_excused' 
  | 'leave_unexcused';

export interface Student {
  id: string;
  name: string;
  gender: 'Nam' | 'Nữ';
  dob: string;
  room: string;
  bedNumber?: string; // Giường số (ví dụ: Giường 01, Giường 02...)
  class: string;
  village: string;
  hamlet: string;
  ethnicity?: string;
  parentPhone?: string;
  notes?: string; // Ghi chú sau mỗi em học sinh
  status: 'active' | 'graduated' | 'transferred';
  createdAt?: string;
  updatedAt?: string;
}

export interface AttendanceRecord {
  id: string; // {date}_{studentId}
  date: string; // YYYY-MM-DD
  studentId: string;
  studentName: string;
  room: string;
  bedNumber?: string;
  class: string;
  village: string;
  hamlet: string;
  status: AttendanceStatus;
  stayWeekend?: boolean; // Học sinh ở lại nội trú vào cuối tuần
  note?: string;
  recordedByEmail?: string;
  recordedByName?: string;
  recordedAt?: string;
}

export interface RoomSummary {
  id: string; // {date}_{roomId}
  date: string;
  roomId: string;
  teacherEmail?: string;
  teacherName?: string;
  totalStudents: number;
  presentCount: number;
  ateNoClassCount: number;
  notAtSchoolThisWeekCount: number;
  leaveExcusedCount: number;
  leaveUnexcusedCount: number;
  stayWeekendCount?: number; // Số lượng học sinh ở lại cuối tuần của phòng
  notes?: string;
  submitted?: boolean;
  updatedAt?: string;
}

// ==========================================
// ĐIỂM DANH TỰ HỌC ĐÊM (NIGHT STUDY ATTENDANCE)
// ==========================================
export type NightStudyStatus = 
  | 'present_night' 
  | 'absent_excused_night' 
  | 'absent_unexcused_night';

export interface NightStudyRecord {
  id: string; // {date}_{studentId}
  date: string; // YYYY-MM-DD
  studentId: string;
  studentName: string;
  room: string;
  bedNumber?: string;
  class: string;
  village: string;
  hamlet?: string;
  status: NightStudyStatus;
  note?: string; // Ghi chú riêng sau mỗi em học sinh học đêm
  recordedByEmail?: string;
  recordedByName?: string;
  recordedAt?: string;
}

export interface NightRoomSummary {
  id: string; // {date}_{roomId}
  date: string;
  roomId: string;
  teacherEmail?: string;
  teacherName?: string;
  totalStudents: number;
  presentCount: number;
  absentExcusedCount: number;
  absentUnexcusedCount: number;
  notes?: string; // Nhật ký & Nhận xét của GV trực đêm (trật tự, vệ sinh, giờ giấc tự học...)
  submitted?: boolean;
  updatedAt?: string;
}

export interface NightAggregatedStats {
  total: number;
  present: number;
  absentExcused: number;
  absentUnexcused: number;
  rate: string;
  submittedRooms: number;
}

export const NIGHT_STUDY_CONFIG: Record<NightStudyStatus, {
  label: string;
  shortLabel: string;
  color: string;
  bgLight: string;
  badgeClass: string;
  description: string;
}> = {
  present_night: {
    label: 'Có mặt học đêm',
    shortLabel: 'Có mặt',
    color: 'emerald',
    bgLight: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    description: 'Học sinh có mặt tại phòng tự học / phòng ở đúng giờ quy định',
  },
  absent_excused_night: {
    label: 'Vắng có phép',
    shortLabel: 'Vắng có phép',
    color: 'blue',
    bgLight: 'bg-blue-50 text-blue-800 border-blue-300',
    badgeClass: 'bg-blue-100 text-blue-800 border border-blue-200',
    description: 'Nghỉ ốm tại phòng y tế hoặc có báo cáo xin phép của phụ huynh/thầy cô',
  },
  absent_unexcused_night: {
    label: 'Vắng không phép',
    shortLabel: 'Vắng không phép',
    color: 'rose',
    bgLight: 'bg-rose-50 text-rose-800 border-rose-300',
    badgeClass: 'bg-rose-100 text-rose-800 border border-rose-200 font-medium',
    description: 'Tự ý bỏ giờ tự học, không có mặt tại phòng khi kiểm tra trực đêm',
  },
};

export interface AuthorizedUser {
  id?: string;
  email: string;
  name: string;
  role: 'admin' | 'teacher';
  assignedRooms: string[]; // room names or ['ALL']
  phone?: string;
  zaloQrData?: string; // Mã QR Zalo cá nhân / link zalo.me / số điện thoại đăng ký Zalo
  zaloId?: string; // ID Zalo hoặc tên hiển thị Zalo
  active: boolean;
  createdAt?: string;
}

export interface AggregatedStats {
  total: number;
  present: number;
  ateNoClass: number;
  notAtSchoolThisWeek: number;
  leaveExcused: number;
  leaveUnexcused: number;
  stayWeekend: number;
}

export const STATUS_CONFIG: Record<AttendanceStatus, {
  label: string;
  shortLabel: string;
  color: string;
  bgLight: string;
  badgeClass: string;
  description: string;
}> = {
  present: {
    label: 'Có mặt đầy đủ (Ăn ở & Đi học)',
    shortLabel: 'Có mặt',
    color: 'emerald',
    bgLight: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    description: 'Học sinh có mặt tại khu nội trú, ăn cơm và tham gia học trên lớp',
  },
  ate_no_class: {
    label: 'Lên ăn không đi học',
    shortLabel: 'Ăn không học',
    color: 'amber',
    bgLight: 'bg-amber-50 text-amber-800 border-amber-300',
    badgeClass: 'bg-amber-100 text-amber-900 border border-amber-300 font-medium',
    description: 'Học sinh có mặt ăn cơm tại bếp nội trú nhưng trốn/bỏ tiết không lên lớp',
  },
  not_at_school_this_week: {
    label: 'Chưa lên trường trong tuần',
    shortLabel: 'Chưa lên tuần',
    color: 'purple',
    bgLight: 'bg-purple-50 text-purple-800 border-purple-300',
    badgeClass: 'bg-purple-100 text-purple-800 border border-purple-200',
    description: 'Học sinh còn ở tại Thôn/Nóc từ đầu tuần chưa ra trường nội trú',
  },
  leave_excused: {
    label: 'Nghỉ có phép',
    shortLabel: 'Nghỉ có phép',
    color: 'blue',
    bgLight: 'bg-blue-50 text-blue-800 border-blue-300',
    badgeClass: 'bg-blue-100 text-blue-800 border border-blue-200',
    description: 'Nghỉ ốm đau hoặc việc gia đình có đơn xin phép của phụ huynh/thầy cô',
  },
  leave_unexcused: {
    label: 'Nghỉ không phép',
    shortLabel: 'Nghỉ không phép',
    color: 'rose',
    bgLight: 'bg-rose-50 text-rose-800 border-rose-300',
    badgeClass: 'bg-rose-100 text-rose-800 border border-rose-200 font-medium',
    description: 'Tự ý bỏ tiết, tự ý về nóc/thôn hoặc trốn học không có lý do',
  },
};
