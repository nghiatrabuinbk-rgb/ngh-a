import { Student, AuthorizedUser, RoomConfig } from './types';

// 12 Phòng Nam
export const MALE_ROOMS = [
  'Phòng Nam 01',
  'Phòng Nam 02',
  'Phòng Nam 03',
  'Phòng Nam 04',
  'Phòng Nam 05',
  'Phòng Nam 06',
  'Phòng Nam 07',
  'Phòng Nam 08',
  'Phòng Nam 09',
  'Phòng Nam 10',
  'Phòng Nam 11',
  'Phòng Nam 12',
];

// 13 Phòng Nữ
export const FEMALE_ROOMS = [
  'Phòng Nữ 13',
  'Phòng Nữ 14',
  'Phòng Nữ 15',
  'Phòng Nữ 16',
  'Phòng Nữ 17',
  'Phòng Nữ 18',
  'Phòng Nữ 19',
  'Phòng Nữ 20',
  'Phòng Nữ 21',
  'Phòng Nữ 22',
  'Phòng Nữ 23',
  'Phòng Nữ 24',
  'Phòng Nữ 25',
];

// Tổng số 25 phòng nội trú (12 nam, 13 nữ)
export const INITIAL_ROOMS = [...MALE_ROOMS, ...FEMALE_ROOMS];

// Danh sách cấu hình chuẩn 25 phòng ở có thể tùy biến số lượng giường, thêm bớt phòng
export const DEFAULT_ROOM_CONFIGS: RoomConfig[] = [
  ...MALE_ROOMS.map((name, i) => ({
    id: `phong_nam_${String(i + 1).padStart(2, '0')}`,
    name,
    gender: 'Nam' as const,
    capacity: 8,
    order: i + 1,
  })),
  ...FEMALE_ROOMS.map((name, i) => ({
    id: `phong_nu_${i + 13}`,
    name,
    gender: 'Nữ' as const,
    capacity: 8,
    order: i + 13,
  })),
];

export const INITIAL_CLASSES = ['6A', '6B', '7A', '7B', '8A', '8B', '9A', '9B'];

export const INITIAL_VILLAGES = ['Thôn 1', 'Thôn 2', 'Thôn 3', 'Thôn 4', 'Thôn 5'];

export const INITIAL_HAMLETS = [
  'Nóc Tăk Pổ',
  'Nóc Tăk Chai',
  'Nóc Măng Lùng',
  'Nóc Tu Nấc',
  'Nóc Làng Mới',
  'Nóc Mô Rỗi',
  'Nóc Tu Răng',
  'Nóc Ông Bình',
  'Nóc Tăk Râng',
];

export const INITIAL_ADMIN_EMAIL = 'nghiatrabui.nbk@gmail.com';

export const DEFAULT_TEACHERS_LIST: AuthorizedUser[] = [
  {
    email: 'nghiatrabui.nbk@gmail.com',
    name: 'Thầy Nghĩa (Quản Trị / BGH)',
    role: 'admin',
    assignedRooms: ['ALL'],
    allowedModules: ['attendance', 'night_study', 'competition', 'room_duty'],
    phone: '0981234567',
    zaloQrData: 'https://zalo.me/0981234567',
    zaloId: 'nghiatrabui',
    active: true,
  },
  {
    email: 'mainguyen.tradoc@gmail.com',
    name: 'Cô Nguyễn Thị Mai (GVCN)',
    role: 'teacher',
    assignedRooms: ['Phòng Nam 01', 'Phòng Nam 02', 'Phòng Nam 03'],
    allowedModules: ['attendance'], // Chỉ được cấp quyền: Điểm danh của GVCN
    phone: '0978111222',
    zaloQrData: 'https://zalo.me/0978111222',
    zaloId: 'mainguyen_gv',
    active: true,
  },
  {
    email: 'dungtran.tradoc@gmail.com',
    name: 'Thầy Trần Văn Dũng (GV Trực Đêm)',
    role: 'teacher',
    assignedRooms: ['Phòng Nam 04', 'Phòng Nam 05', 'Phòng Nam 06'],
    allowedModules: ['night_study'], // Chỉ được cấp quyền: Điểm danh tự học đêm
    phone: '0912333444',
    zaloQrData: 'https://zalo.me/0912333444',
    zaloId: 'dungtran_gv',
    active: true,
  },
  {
    email: 'lanho.tradoc@gmail.com',
    name: 'Cô Hồ Thị Lan (GV Trực Phòng)',
    role: 'teacher',
    assignedRooms: ['Phòng Nữ 13', 'Phòng Nữ 14', 'Phòng Nữ 15'],
    allowedModules: ['room_duty'], // Chỉ được cấp quyền: Theo dõi và điểm danh của GV trực phòng
    phone: '0934555666',
    zaloQrData: 'https://zalo.me/0934555666',
    zaloId: 'lanho_gv',
    active: true,
  },
  {
    email: 'thidua.tradoc@gmail.com',
    name: 'Đoàn Thanh Niên / Ban Thi Đua',
    role: 'teacher',
    assignedRooms: ['ALL'],
    allowedModules: ['competition'], // Chỉ được cấp quyền: Chấm điểm thi đua
    phone: '0945678999',
    zaloQrData: 'https://zalo.me/0945678999',
    zaloId: 'thidua_gv',
    active: true,
  },
];

export const SEED_STUDENTS: Omit<Student, 'id'>[] = [];

// ==========================================
// CẤU HÌNH TIÊU CHÍ THI ĐUA PHÒNG Ở (ĐỊNH MỨC 100 ĐIỂM)
// ==========================================
export const DEFAULT_COMPETITION_CRITERIA: {
  id: string;
  name: string;
  standardPoints: number;
  description: string;
  order: number;
  isActive: boolean;
}[] = [
  {
    id: 'criterion_vesinh_phong',
    name: 'Vệ sinh phòng ở',
    standardPoints: 100,
    description: 'Sàn nhà sạch sẽ, không rác thải, mạng nhện, đồ dùng ngăn nắp, chăn màn gấp vuông vức.',
    order: 1,
    isActive: true,
  },
  {
    id: 'criterion_nenep_phong',
    name: 'Nề nếp phòng ở',
    standardPoints: 100,
    description: 'Tác phong trật tự, ngủ nghỉ đúng giờ quy định, không tụ tập gây ồn ào ảnh hưởng phòng khác.',
    order: 2,
    isActive: true,
  },
  {
    id: 'criterion_vesinh_khuvuc',
    name: 'Vệ sinh khu vực & hành lang',
    standardPoints: 100,
    description: 'Trực nhật hành lang trước phòng, khu vệ sinh chung, ban công sạch sẽ, sắp xếp dép guốc gọn gàng.',
    order: 3,
    isActive: true,
  },
  {
    id: 'criterion_dienthoai',
    name: 'Sử dụng điện thoại đúng quy định',
    standardPoints: 100,
    description: 'Tuân thủ giờ giao nộp điện thoại, tuyệt đối không lén sử dụng trong giờ tự học đêm hoặc sau 22h00.',
    order: 4,
    isActive: true,
  },
  {
    id: 'criterion_noiquy',
    name: 'Thực hiện nội quy nhà trường',
    standardPoints: 100,
    description: 'Chấp hành nghiêm giờ kẻng báo thức, giờ ăn tập trung, trang phục tác phong, lễ phép và đoàn kết.',
    order: 5,
    isActive: true,
  },
];

// ==========================================
// CÁC BỘ PHẬN THAM GIA CHẤM ĐIỂM THI ĐUA
// ==========================================
export const DEFAULT_COMPETITION_DEPARTMENTS: {
  id: string;
  name: string;
  description: string;
  membersCount: number;
  isActive: boolean;
  order: number;
}[] = [
  {
    id: 'dept_bgh',
    name: 'Ban Giám hiệu',
    description: 'Hiệu trưởng, Phó Hiệu trưởng kiểm tra định kỳ hoặc đột xuất',
    membersCount: 2,
    isActive: true,
    order: 1,
  },
  {
    id: 'dept_bqs',
    name: 'Ban Quản sinh (4 thành viên)',
    description: 'Tổ quản sinh gồm 4 thầy cô phụ trách trực tiếp đời sống nội trú hằng ngày',
    membersCount: 4,
    isActive: true,
    order: 2,
  },
  {
    id: 'dept_yte',
    name: 'Cán bộ Y tế',
    description: 'Phụ trách kiểm tra vệ sinh an toàn, phòng dịch, tủ thuốc và sức khỏe học sinh',
    membersCount: 1,
    isActive: true,
    order: 3,
  },
  {
    id: 'dept_gv_tudtc',
    name: 'Giáo viên trực đêm tự học',
    description: 'Thầy cô được phân công trực giám sát giờ tự học tối tại các phòng',
    membersCount: 1,
    isActive: true,
    order: 4,
  },
  {
    id: 'dept_bttnd',
    name: 'Ban Thanh tra nhân dân',
    description: 'Giám sát tính công bằng, khách quan trong quản lý và chấm điểm thi đua',
    membersCount: 3,
    isActive: true,
    order: 5,
  },
  {
    id: 'dept_dtn',
    name: 'Đoàn Thanh niên / Đội TNTP',
    description: 'Bí thư Đoàn, Tổng phụ trách Đội kiểm tra nề nếp thiếu niên nhi đồng',
    membersCount: 2,
    isActive: true,
    order: 6,
  },
  {
    id: 'dept_tuychon',
    name: 'Bộ phận kiểm tra đột xuất / Tùy chọn',
    description: 'Tổ công tác đột xuất hoặc đại diện phụ huynh, ban đại diện học sinh',
    membersCount: 1,
    isActive: true,
    order: 7,
  },
];
