import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  MapPin, 
  Phone, 
  GraduationCap, 
  Home, 
  RefreshCw,
  X, 
  Check, 
  Bed, 
  BedDouble, 
  Building2, 
  Filter, 
  Save,
  FileSpreadsheet,
  Settings,
  AlertTriangle,
  LayoutGrid,
  List,
  UserPlus,
  ArrowRight,
  ClipboardPaste,
  Sparkles,
  CheckCircle2,
  Clock,
  DoorOpen,
  ChevronRight,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { Student, RoomConfig } from '../types';
import { BulkImportModal } from './BulkImportModal';
import { RoomManagementModal } from './RoomManagementModal';
import { QuickAddRoomModal } from './QuickAddRoomModal';
import { DeleteRoomsModal } from './DeleteRoomsModal';

interface StudentManagementViewProps {
  students: Student[];
  onSaveStudent: (student: Student) => Promise<void>;
  onDeleteStudent: (studentId: string) => Promise<void>;
  onResetSeedData: () => Promise<void>;
  onClearAllStudents: () => Promise<void>;
  onSaveBatchStudents: (students: Student[], replaceRoom?: string) => Promise<void>;
  roomConfigs: RoomConfig[];
  onSaveRoomConfig: (room: RoomConfig) => Promise<void>;
  onDeleteRoomConfig: (roomId: string, targetNewRoomForStudents?: string) => Promise<void>;
  onDeleteMultipleRoomConfigs?: (roomIds: string[], targetNewRoomForStudents?: string) => Promise<void>;
  onResetRoomConfigs: () => Promise<void>;
  rooms: string[];
  classes: string[];
  villages: string[];
  hamlets: string[];
  canEdit: boolean;
  isAdmin: boolean;
}

export const StudentManagementView: React.FC<StudentManagementViewProps> = ({
  students,
  onSaveStudent,
  onDeleteStudent,
  onResetSeedData,
  onClearAllStudents,
  onSaveBatchStudents,
  roomConfigs,
  onSaveRoomConfig,
  onDeleteRoomConfig,
  onDeleteMultipleRoomConfigs,
  onResetRoomConfigs,
  rooms,
  classes,
  villages,
  hamlets,
  canEdit,
  isAdmin,
}) => {
  const [search, setSearch] = useState('');
  const [filterRoom, setFilterRoom] = useState('ALL');
  const [filterClass, setFilterClass] = useState('ALL');
  const [filterHamlet, setFilterHamlet] = useState('ALL');
  const [activeSubTab, setActiveSubTab] = useState<'rooms_overview' | 'list' | 'bed_matrix'>('rooms_overview');
  const [roomFilterCardStatus, setRoomFilterCardStatus] = useState<'ALL' | 'empty' | 'partial' | 'full' | 'male' | 'female'>('ALL');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isSelfEntryMode, setIsSelfEntryMode] = useState(false);
  const [selfEnteredCountInSession, setSelfEnteredCountInSession] = useState(0);

  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [bulkImportTargetRoom, setBulkImportTargetRoom] = useState<string>('');
  
  const [isQuickAddRoomOpen, setIsQuickAddRoomOpen] = useState(false);
  const [isRoomConfigModalOpen, setIsRoomConfigModalOpen] = useState(false);
  const [isDeleteRoomsModalOpen, setIsDeleteRoomsModalOpen] = useState(false);
  const [singleDeleteRoomId, setSingleDeleteRoomId] = useState<string | null>(null);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Helper open functions for deleting rooms
  const handleOpenDeleteSingleRoom = (roomId: string) => {
    setSingleDeleteRoomId(roomId);
    setIsDeleteRoomsModalOpen(true);
  };

  const handleOpenDeleteRoomsModal = () => {
    setSingleDeleteRoomId(null);
    setIsDeleteRoomsModalOpen(true);
  };

  // Form fields for single student
  const [formName, setFormName] = useState('');
  const [formGender, setFormGender] = useState<'Nam' | 'Nữ'>('Nam');
  const [formDob, setFormDob] = useState('2012-01-01');
  const [formRoom, setFormRoom] = useState(rooms[0] || 'Phòng Nam 01');
  const [formBedNumber, setFormBedNumber] = useState('Giường 01');
  const [formClass, setFormClass] = useState(classes[0] || '6A');
  const [formVillage, setFormVillage] = useState(villages[0] || 'Thôn 1');
  const [formHamlet, setFormHamlet] = useState(hamlets[0] || 'Nóc Tăk Pổ');
  const [formEthnicity, setFormEthnicity] = useState('Ca Dong');
  const [formParentPhone, setFormParentPhone] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Group rooms into male, female, and other configs
  const maleRoomConfigs = useMemo(() => {
    return roomConfigs.filter((r) => r.gender === 'Nam' || r.name.toLowerCase().includes('nam'));
  }, [roomConfigs]);

  const femaleRoomConfigs = useMemo(() => {
    return roomConfigs.filter((r) => r.gender === 'Nữ' || r.name.toLowerCase().includes('nữ'));
  }, [roomConfigs]);

  const otherRoomConfigs = useMemo(() => {
    return roomConfigs.filter(
      (r) =>
        r.gender !== 'Nam' &&
        r.gender !== 'Nữ' &&
        !r.name.toLowerCase().includes('nam') &&
        !r.name.toLowerCase().includes('nữ')
    );
  }, [roomConfigs]);

  // Overall room entry status statistics
  const roomEntryStats = useMemo(() => {
    let emptyCount = 0;
    let partialCount = 0;
    let fullCount = 0;
    let overCount = 0;
    let totalAssignedStudents = 0;
    let totalBedCapacity = 0;

    roomConfigs.forEach((r) => {
      const count = students.filter((s) => s.room === r.name && s.status === 'active').length;
      totalAssignedStudents += count;
      if (r.capacity) {
        totalBedCapacity += r.capacity;
        if (count === 0) emptyCount++;
        else if (count === r.capacity) fullCount++;
        else if (count < r.capacity) partialCount++;
        else overCount++;
      } else {
        if (count === 0) emptyCount++;
        else partialCount++;
      }
    });

    return {
      emptyCount,
      partialCount,
      fullCount,
      overCount,
      totalAssignedStudents,
      totalBedCapacity,
      totalRooms: roomConfigs.length,
      maleRoomsCount: maleRoomConfigs.length,
      femaleRoomsCount: femaleRoomConfigs.length,
    };
  }, [roomConfigs, students, maleRoomConfigs, femaleRoomConfigs]);

  // Open modal for new student (standard)
  const handleOpenAddModal = (presetRoom?: string, presetBed?: string) => {
    setIsSelfEntryMode(false);
    setSelfEnteredCountInSession(0);
    setEditingStudent(null);
    setFormName('');
    const targetRoom = presetRoom || (filterRoom !== 'ALL' ? filterRoom : rooms[0] || 'Phòng Nam 01');
    setFormRoom(targetRoom);
    const isFemale = targetRoom.toLowerCase().includes('nữ');
    setFormGender(isFemale ? 'Nữ' : 'Nam');
    setFormDob('2012-01-01');
    setFormBedNumber(presetBed || 'Giường 01');
    setFormClass(classes[0] || '6A');
    setFormVillage(villages[0] || 'Thôn 1');
    setFormHamlet(hamlets[0] || 'Nóc Tăk Pổ');
    setFormEthnicity('Ca Dong');
    setFormParentPhone('');
    setFormNotes('');
    setIsModalOpen(true);
  };

  // Open modal for editing student
  const handleOpenEditModal = (s: Student) => {
    setIsSelfEntryMode(false);
    setSelfEnteredCountInSession(0);
    setEditingStudent(s);
    setFormName(s.name);
    setFormGender(s.gender);
    setFormDob(s.dob || '2012-01-01');
    setFormRoom(s.room);
    setFormBedNumber(s.bedNumber || 'Giường 01');
    setFormClass(s.class);
    setFormVillage(s.village);
    setFormHamlet(s.hamlet);
    setFormEthnicity(s.ethnicity || 'Ca Dong');
    setFormParentPhone(s.parentPhone || '');
    setFormNotes(s.notes || '');
    setIsModalOpen(true);
  };

  // Open continuous self-entry modal for a specific room
  const handleOpenSelfEntryForRoom = (targetRoom: string) => {
    setIsSelfEntryMode(true);
    setSelfEnteredCountInSession(0);
    setEditingStudent(null);
    setFormName('');
    setFormRoom(targetRoom);
    const isFemale = targetRoom.toLowerCase().includes('nữ');
    setFormGender(isFemale ? 'Nữ' : 'Nam');
    setFormDob('2012-01-01');

    // Calculate next available bed in this room
    const inRoom = students.filter((s) => s.room === targetRoom && s.status === 'active');
    const nextBedNum = inRoom.length + 1;
    setFormBedNumber(`Giường ${String(nextBedNum).padStart(2, '0')}`);
    setFormClass(classes[0] || '6A');
    setFormVillage(villages[0] || 'Thôn 1');
    setFormHamlet(hamlets[0] || 'Nóc Tăk Pổ');
    setFormEthnicity('Ca Dong');
    setFormParentPhone('');
    setFormNotes('');
    setIsModalOpen(true);
  };

  // Open bulk import for a specific room
  const handleOpenBulkForRoom = (roomName: string) => {
    setBulkImportTargetRoom(roomName);
    setIsBulkImportOpen(true);
  };

  // Save student (support continuous add)
  const handleSaveStudent = async (continueNext: boolean = false) => {
    if (!formName.trim()) {
      alert('Vui lòng nhập họ và tên học sinh');
      return;
    }
    if (!formRoom.trim()) {
      alert('Vui lòng chọn số phòng ở');
      return;
    }

    setIsSubmitting(true);
    try {
      const studentId = editingStudent ? editingStudent.id : `hs_${Date.now()}`;
      const newStudent: Student = {
        id: studentId,
        name: formName.trim(),
        gender: formGender,
        dob: formDob,
        room: formRoom.trim(),
        bedNumber: formBedNumber.trim() || 'Giường 01',
        class: formClass.trim(),
        village: formVillage.trim(),
        hamlet: formHamlet.trim(),
        ethnicity: formEthnicity.trim(),
        parentPhone: formParentPhone.trim(),
        notes: formNotes.trim(),
        status: 'active',
      };

      await onSaveStudent(newStudent);

      if (continueNext) {
        // Increment bed number for next student
        const currentMatch = formBedNumber.match(/\d+/);
        let nextBed = 'Giường 01';
        if (currentMatch) {
          const nextVal = parseInt(currentMatch[0], 10) + 1;
          nextBed = `Giường ${String(nextVal).padStart(2, '0')}`;
        }
        setFormName('');
        setFormBedNumber(nextBed);
        setFormNotes('');
        setFormParentPhone('');
        setSelfEnteredCountInSession((prev) => prev + 1);
      } else {
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi lưu thông tin học sinh.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete student
  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa học sinh "${name}" khỏi danh sách nội trú?`)) {
      await onDeleteStudent(id);
    }
  };

  // Handle Clear All Students
  const handleConfirmClearAll = async () => {
    setIsClearing(true);
    try {
      await onClearAllStudents();
      setIsClearConfirmOpen(false);
    } catch (err) {
      console.error(err);
      alert('Lỗi khi xóa danh sách học sinh.');
    } finally {
      setIsClearing(false);
    }
  };

  // Filtered students list
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (s.status !== 'active') return false;
      if (filterRoom !== 'ALL' && s.room !== filterRoom) return false;
      if (filterClass !== 'ALL' && s.class !== filterClass) return false;
      if (filterHamlet !== 'ALL' && s.hamlet !== filterHamlet) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = s.name.toLowerCase().includes(q);
        const matchClass = s.class.toLowerCase().includes(q);
        const matchRoom = s.room.toLowerCase().includes(q);
        const matchBed = (s.bedNumber || '').toLowerCase().includes(q);
        const matchHamlet = s.hamlet.toLowerCase().includes(q);
        const matchVillage = s.village.toLowerCase().includes(q);
        const matchNotes = (s.notes || '').toLowerCase().includes(q);
        if (
          !matchName &&
          !matchClass &&
          !matchRoom &&
          !matchBed &&
          !matchHamlet &&
          !matchVillage &&
          !matchNotes
        )
          return false;
      }
      return true;
    });
  }, [students, filterRoom, filterClass, filterHamlet, search]);

  // Selected room config
  const selectedRoomConfig = useMemo(() => {
    if (filterRoom === 'ALL') return null;
    return roomConfigs.find((r) => r.name === filterRoom) || null;
  }, [roomConfigs, filterRoom]);

  // Active students in selected room for bed matrix
  const studentsInSelectedRoom = useMemo(() => {
    if (filterRoom === 'ALL') return [];
    return students.filter((s) => s.room === filterRoom && s.status === 'active');
  }, [students, filterRoom]);

  // Room cards filtered by status in rooms_overview
  const filteredRoomConfigsForCards = useMemo(() => {
    return roomConfigs.filter((r) => {
      const count = students.filter((s) => s.room === r.name && s.status === 'active').length;
      const cap = r.capacity;

      if (roomFilterCardStatus === 'empty') {
        return count === 0;
      }
      if (roomFilterCardStatus === 'partial') {
        if (!cap) return count > 0;
        return count > 0 && count < cap;
      }
      if (roomFilterCardStatus === 'full') {
        if (!cap) return false;
        return count >= cap;
      }
      if (roomFilterCardStatus === 'male') {
        return r.gender === 'Nam' || r.name.toLowerCase().includes('nam');
      }
      if (roomFilterCardStatus === 'female') {
        return r.gender === 'Nữ' || r.name.toLowerCase().includes('nữ');
      }
      return true;
    });
  }, [roomConfigs, students, roomFilterCardStatus]);

  return (
    <div className="space-y-4">
      {/* Top Banner & Control Actions */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-0.5">
            Trường PTDTBT THCS Trà Đốc - TP Đà Nẵng
          </div>
          <h2 className="text-lg md:text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-700 shrink-0" />
            <span>QUẢN LÝ PHÒNG Ở NỘI TRÚ ({roomConfigs.length} PHÒNG)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Tổng số: <strong className="text-slate-900">{students.length}</strong> học sinh nội trú • Quản trị viên tùy chỉnh phòng ở, tùy chọn thêm phòng mới, dán hàng loạt hoặc tự nhập học sinh từng phòng.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* TÙY CHỌN THÊM PHÒNG Ở MỚI */}
          {canEdit && (
            <button
              onClick={() => setIsQuickAddRoomOpen(true)}
              className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white font-extrabold text-xs sm:text-sm px-4 py-2 rounded-xl shadow-md transition transform active:scale-95 border border-emerald-600"
              title="Tùy chọn thêm phòng ở mới (Nam, Nữ, số giường)"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Thêm Phòng Ở</span>
            </button>
          )}

          {/* NHẬP HÀNG LOẠT (COPY & DÁN EXCEL) */}
          {canEdit && (
            <button
              onClick={() => {
                setBulkImportTargetRoom(filterRoom !== 'ALL' ? filterRoom : rooms[0] || 'Phòng Nam 01');
                setIsBulkImportOpen(true);
              }}
              className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs sm:text-sm px-3.5 py-2 rounded-xl shadow-xs transition transform active:scale-95"
              title="Copy và dán họ tên, lớp từ file Excel hoặc Zalo vào từng phòng"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Dán HS Hàng Loạt</span>
            </button>
          )}

          {/* TỰ NHẬP HỌC SINH MỚI */}
          {canEdit && (
            <button
              onClick={() => handleOpenSelfEntryForRoom(filterRoom !== 'ALL' ? filterRoom : rooms[0] || 'Phòng Nam 01')}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs sm:text-sm px-3.5 py-2 rounded-xl shadow-xs transition transform active:scale-95"
              title="Tự nhập học sinh từng em vào phòng (nhập liên tục)"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tự Nhập Học Sinh</span>
            </button>
          )}

          {/* Cài đặt cấu hình phòng ở (toàn diện) */}
          <button
            onClick={() => setIsRoomConfigModalOpen(true)}
            className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs sm:text-sm px-3.5 py-2 rounded-xl shadow-xs transition transform active:scale-95"
            title="Quản lý toàn bộ danh mục phòng ở, sửa xóa phòng, chỉnh số lượng giường"
          >
            <Building2 className="w-4 h-4" />
            <span>Cài Đặt Phòng Ở ({roomConfigs.length})</span>
          </button>

          {/* TÙY CHỌN XÓA CÁC PHÒNG Ở */}
          {canEdit && (
            <button
              onClick={handleOpenDeleteRoomsModal}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs sm:text-sm px-3.5 py-2 rounded-xl shadow-md transition transform active:scale-95 border border-rose-500"
              title="Tùy chọn xóa các phòng ở (xóa từng phòng hoặc xóa hàng loạt phòng)"
            >
              <Trash2 className="w-4 h-4" />
              <span>Tùy Chọn Xóa Phòng</span>
            </button>
          )}

          {/* Xóa sạch danh sách cũ */}
          {isAdmin && (
            <button
              onClick={() => setIsClearConfirmOpen(true)}
              className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs px-3 py-2 rounded-xl border border-rose-300 transition"
              title="Xóa toàn bộ danh sách học sinh cũ để nạp danh sách thực tế"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa Hết DS Cũ</span>
            </button>
          )}

          {/* Khôi phục mẫu 25 phòng */}
          <button
            onClick={() => {
              if (confirm('Khởi tạo lại danh sách 25 học sinh mẫu phân bổ vào 25 phòng chuẩn (12 nam, 13 nữ)?')) {
                onResetSeedData();
              }
            }}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold transition"
            title="Nạp lại dữ liệu học sinh mẫu 25 phòng"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Nạp Mẫu</span>
          </button>
        </div>
      </div>

      {/* STATUS OVERVIEW METRICS BAR (TRẠNG THÁI TỰ NHẬP HỌC SINH TỪNG PHÒNG) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 flex items-center justify-between">
            <span>TỔNG SỐ PHÒNG</span>
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-extrabold text-slate-900 mt-1">
            {roomEntryStats.totalRooms} <span className="text-xs font-normal text-slate-500">phòng</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {roomEntryStats.maleRoomsCount} Nam • {roomEntryStats.femaleRoomsCount} Nữ
          </div>
        </div>

        <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200 shadow-2xs">
          <div className="text-[11px] font-bold text-emerald-800 flex items-center justify-between">
            <span>ĐÃ NHẬP ĐỦ</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-extrabold text-emerald-800 mt-1">
            {roomEntryStats.fullCount} <span className="text-xs font-semibold text-emerald-600">phòng</span>
          </div>
          <div className="text-[10px] text-emerald-700 mt-0.5">
            Đủ 100% số giường
          </div>
        </div>

        <div className="bg-blue-50/70 p-3 rounded-2xl border border-blue-200 shadow-2xs">
          <div className="text-[11px] font-bold text-blue-800 flex items-center justify-between">
            <span>CÒN TRỐNG GIƯỜNG</span>
            <Bed className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-xl font-extrabold text-blue-800 mt-1">
            {roomEntryStats.partialCount} <span className="text-xs font-semibold text-blue-600">phòng</span>
          </div>
          <div className="text-[10px] text-blue-700 mt-0.5">
            Đang tự nhập / còn chỗ
          </div>
        </div>

        <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200 shadow-2xs">
          <div className="text-[11px] font-bold text-amber-800 flex items-center justify-between">
            <span>CHƯA NHẬP HS</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl font-extrabold text-amber-800 mt-1">
            {roomEntryStats.emptyCount} <span className="text-xs font-semibold text-amber-600">phòng</span>
          </div>
          <div className="text-[10px] text-amber-700 mt-0.5">
            Cần tự nhập hoặc dán
          </div>
        </div>

        <div className="bg-purple-50/70 p-3 rounded-2xl border border-purple-200 shadow-2xs">
          <div className="text-[11px] font-bold text-purple-800 flex items-center justify-between">
            <span>TỔNG SỐ HỌC SINH</span>
            <Users className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-xl font-extrabold text-purple-900 mt-1">
            {roomEntryStats.totalAssignedStudents} <span className="text-xs font-semibold text-purple-600">em</span>
          </div>
          <div className="text-[10px] text-purple-700 mt-0.5">
            Đã xếp vào các phòng
          </div>
        </div>

        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-center">
          <div className="text-[11px] font-bold text-slate-600 mb-1">THAO TÁC NHANH:</div>
          <button
            onClick={() => setIsQuickAddRoomOpen(true)}
            className="w-full text-center bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 font-extrabold text-xs py-1.5 rounded-xl transition shadow-2xs flex items-center justify-center gap-1"
          >
            <Plus className="w-3 h-3 stroke-[3]" />
            <span>Thêm phòng mới</span>
          </button>
        </div>
      </div>

      {/* QUICK ROOM SELECTOR BAR */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs flex-wrap gap-2">
          <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-emerald-700" />
            <span>Danh mục phòng ở nội trú ({roomConfigs.length} phòng):</span>
          </span>

          <div className="flex items-center gap-2">
            <span className="bg-blue-100 text-blue-900 font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
              {maleRoomConfigs.length} Phòng Nam ({students.filter((s) => s.gender === 'Nam').length} HS)
            </span>
            <span className="bg-rose-100 text-rose-900 font-bold px-2.5 py-0.5 rounded-full border border-rose-200">
              {femaleRoomConfigs.length} Phòng Nữ ({students.filter((s) => s.gender === 'Nữ').length} HS)
            </span>
            {otherRoomConfigs.length > 0 && (
              <span className="bg-purple-100 text-purple-900 font-bold px-2.5 py-0.5 rounded-full border border-purple-200">
                {otherRoomConfigs.length} Khác
              </span>
            )}
            {filterRoom !== 'ALL' && (
              <button
                onClick={() => setFilterRoom('ALL')}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline ml-1"
              >
                Xem tất cả phòng
              </button>
            )}
          </div>
        </div>

        {/* Male Rooms Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-[11px] font-bold text-blue-900 shrink-0">Phòng Nam:</span>
          {maleRoomConfigs.map((r) => {
            const count = students.filter((s) => s.room === r.name && s.status === 'active').length;
            const isSelected = filterRoom === r.name;
            const cap = r.capacity;
            const isFull = cap && count >= cap;
            const isEmpty = count === 0;

            return (
              <button
                key={r.id}
                onClick={() => {
                  setFilterRoom(isSelected ? 'ALL' : r.name);
                }}
                className={`px-2.5 py-1 rounded-xl font-bold transition whitespace-nowrap text-[11px] border flex items-center gap-1 ${
                  isSelected
                    ? 'bg-blue-700 text-white border-blue-800 shadow-xs'
                    : isFull
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : isEmpty
                    ? 'bg-slate-100 text-slate-500 border-dashed border-slate-300'
                    : 'bg-blue-50/80 text-blue-900 hover:bg-blue-100 border-blue-200'
                }`}
                title={`${r.name}: ${count}/${cap || '∞'} học sinh`}
              >
                <span>{r.name.replace('Phòng ', '')}</span>
                <span className="opacity-80">
                  ({count}{cap ? `/${cap}` : ''})
                </span>
              </button>
            );
          })}
        </div>

        {/* Female Rooms Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs pt-1.5 border-t border-slate-100">
          <span className="text-[11px] font-bold text-rose-900 shrink-0">Phòng Nữ:</span>
          {femaleRoomConfigs.map((r) => {
            const count = students.filter((s) => s.room === r.name && s.status === 'active').length;
            const isSelected = filterRoom === r.name;
            const cap = r.capacity;
            const isFull = cap && count >= cap;
            const isEmpty = count === 0;

            return (
              <button
                key={r.id}
                onClick={() => {
                  setFilterRoom(isSelected ? 'ALL' : r.name);
                }}
                className={`px-2.5 py-1 rounded-xl font-bold transition whitespace-nowrap text-[11px] border flex items-center gap-1 ${
                  isSelected
                    ? 'bg-rose-700 text-white border-rose-800 shadow-xs'
                    : isFull
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : isEmpty
                    ? 'bg-slate-100 text-slate-500 border-dashed border-slate-300'
                    : 'bg-rose-50/80 text-rose-900 hover:bg-rose-100 border-rose-200'
                }`}
                title={`${r.name}: ${count}/${cap || '∞'} học sinh`}
              >
                <span>{r.name.replace('Phòng ', '')}</span>
                <span className="opacity-80">
                  ({count}{cap ? `/${cap}` : ''})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* VIEW SWITCHER TABS & FILTER BAR */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Main 3 sub-views */}
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
            <button
              onClick={() => setActiveSubTab('rooms_overview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeSubTab === 'rooms_overview'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>Trạng Thái Từng Phòng ({roomConfigs.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeSubTab === 'list'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Bảng Danh Sách ({filteredStudents.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('bed_matrix')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeSubTab === 'bed_matrix'
                  ? 'bg-white text-blue-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-blue-700" />
              <span>Sơ Đồ Giường Ngủ</span>
            </button>
          </div>

          {filterRoom !== 'ALL' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                Đang lọc: <strong className="text-emerald-700">{filterRoom}</strong>
              </span>

              {canEdit && (
                <button
                  type="button"
                  onClick={() => handleOpenSelfEntryForRoom(filterRoom)}
                  className="flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Tự nhập HS vào phòng</span>
                </button>
              )}

              {canEdit && (
                <button
                  type="button"
                  onClick={() => handleOpenBulkForRoom(filterRoom)}
                  className="flex items-center gap-1 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-200 transition"
                  title={`Dán danh sách học sinh vào ${filterRoom}`}
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>Dán vào phòng</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <div className="relative min-w-[160px]">
            <input
              type="text"
              placeholder="Tìm tên, phòng, giường..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          </div>

          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-700 font-semibold text-xs"
          >
            <option value="ALL">Tất cả Lớp</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                Lớp {c}
              </option>
            ))}
          </select>

          <select
            value={filterHamlet}
            onChange={(e) => setFilterHamlet(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-700 font-semibold text-xs"
          >
            <option value="ALL">Tất cả Nóc</option>
            {hamlets.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SUB-VIEW 1: TRẠNG THÁI TỰ NHẬP HỌC SINH TỪNG PHÒNG (CARDS) */}
      {/* ========================================================= */}
      {activeSubTab === 'rooms_overview' && (
        <div className="space-y-4">
          {/* Filter Bar specifically for Room Cards */}
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-slate-700 mr-1">Lọc trạng thái phòng:</span>
              <button
                onClick={() => setRoomFilterCardStatus('ALL')}
                className={`px-2.5 py-1 rounded-lg font-bold border transition ${
                  roomFilterCardStatus === 'ALL'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Tất cả ({roomConfigs.length})
              </button>
              <button
                onClick={() => setRoomFilterCardStatus('empty')}
                className={`px-2.5 py-1 rounded-lg font-bold border transition ${
                  roomFilterCardStatus === 'empty'
                    ? 'bg-amber-600 text-white border-amber-700'
                    : 'bg-white text-amber-800 border-amber-200 hover:bg-amber-50'
                }`}
              >
                Chưa nhập ({roomEntryStats.emptyCount})
              </button>
              <button
                onClick={() => setRoomFilterCardStatus('partial')}
                className={`px-2.5 py-1 rounded-lg font-bold border transition ${
                  roomFilterCardStatus === 'partial'
                    ? 'bg-blue-600 text-white border-blue-700'
                    : 'bg-white text-blue-800 border-blue-200 hover:bg-blue-50'
                }`}
              >
                Còn trống giường ({roomEntryStats.partialCount})
              </button>
              <button
                onClick={() => setRoomFilterCardStatus('full')}
                className={`px-2.5 py-1 rounded-lg font-bold border transition ${
                  roomFilterCardStatus === 'full'
                    ? 'bg-emerald-600 text-white border-emerald-700'
                    : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50'
                }`}
              >
                Đã nhập đủ ({roomEntryStats.fullCount})
              </button>
              <button
                onClick={() => setRoomFilterCardStatus('male')}
                className={`px-2.5 py-1 rounded-lg font-bold border transition ${
                  roomFilterCardStatus === 'male'
                    ? 'bg-blue-700 text-white border-blue-800'
                    : 'bg-white text-blue-900 border-blue-200 hover:bg-blue-50'
                }`}
              >
                Khu Nam ({maleRoomConfigs.length})
              </button>
              <button
                onClick={() => setRoomFilterCardStatus('female')}
                className={`px-2.5 py-1 rounded-lg font-bold border transition ${
                  roomFilterCardStatus === 'female'
                    ? 'bg-rose-700 text-white border-rose-800'
                    : 'bg-white text-rose-900 border-rose-200 hover:bg-rose-50'
                }`}
              >
                Khu Nữ ({femaleRoomConfigs.length})
              </button>
            </div>

            {canEdit && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsQuickAddRoomOpen(true)}
                  className="flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-3 py-1 rounded-xl transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Thêm phòng ở mới</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenDeleteRoomsModal}
                  className="flex items-center gap-1 text-xs font-bold text-rose-800 bg-rose-100 hover:bg-rose-200 px-3 py-1 rounded-xl transition border border-rose-300"
                  title="Tùy chọn xóa một hoặc nhiều phòng ở"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Tùy chọn xóa các phòng</span>
                </button>
              </div>
            )}
          </div>

          {/* Grid of Room Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredRoomConfigsForCards.map((r) => {
              const studentsInThisRoom = students.filter((s) => s.room === r.name && s.status === 'active');
              const count = studentsInThisRoom.length;
              const cap = r.capacity;
              const isFemale = r.gender === 'Nữ' || r.name.toLowerCase().includes('nữ');
              const percent = cap ? Math.min(100, Math.round((count / cap) * 100)) : 100;

              // Trạng thái tự nhập của phòng
              let statusLabel = '';
              let statusBadgeClass = '';
              if (!cap) {
                statusLabel = `Đã nhập ${count} HS (Tự do)`;
                statusBadgeClass = 'bg-purple-100 text-purple-900 border-purple-200';
              } else if (count === 0) {
                statusLabel = `Chưa nhập học sinh (0/${cap})`;
                statusBadgeClass = 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
              } else if (count === cap) {
                statusLabel = `Đã nhập đủ (${count}/${cap} giường)`;
                statusBadgeClass = 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold';
              } else if (count < cap) {
                statusLabel = `Còn trống ${cap - count} giường (${count}/${cap})`;
                statusBadgeClass = 'bg-blue-100 text-blue-900 border-blue-300 font-bold';
              } else {
                statusLabel = `Vượt sức chứa (+${count - cap} em)`;
                statusBadgeClass = 'bg-rose-100 text-rose-900 border-rose-300 font-bold';
              }

              return (
                <div
                  key={r.id}
                  className={`bg-white rounded-3xl border transition shadow-sm hover:shadow-md flex flex-col justify-between overflow-hidden ${
                    count === 0
                      ? 'border-amber-200/80 bg-gradient-to-b from-amber-50/20 to-white'
                      : cap && count >= cap
                      ? 'border-emerald-200/90 bg-gradient-to-b from-emerald-50/20 to-white'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-4 border-b border-slate-100 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 ${
                            isFemale
                              ? 'bg-rose-100 text-rose-700'
                              : r.gender === 'Khác'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-base leading-tight">
                            {r.name}
                          </h4>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                            <span>{r.gender === 'Nữ' ? 'Khu Nữ' : r.gender === 'Nam' ? 'Khu Nam' : 'Khu Khác'}</span>
                            <span>•</span>
                            <span>Sức chứa: <strong>{cap ? `${cap} giường` : 'Không giới hạn'}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Trạng thái nhập badge & Nút Xóa phòng */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[11px] px-2.5 py-1 rounded-full border whitespace-nowrap ${statusBadgeClass}`}>
                          {statusLabel}
                        </span>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleOpenDeleteSingleRoom(r.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition border border-transparent hover:border-rose-200"
                            title={`Tùy chọn xóa phòng ${r.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Capacity progress bar */}
                    {cap && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                          <span>Tiến độ xếp chỗ:</span>
                          <span className={count >= cap ? 'text-emerald-700 font-bold' : 'text-slate-700'}>
                            {count} / {cap} ({percent}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              count === 0
                                ? 'w-0'
                                : count >= cap
                                ? 'bg-emerald-600'
                                : 'bg-blue-600'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {r.notes && (
                      <div className="text-[11px] text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200/60 truncate">
                        {r.notes}
                      </div>
                    )}
                  </div>

                  {/* Card Students Mini-List */}
                  <div className="p-4 flex-1">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>Danh sách học sinh trong phòng ({studentsInThisRoom.length}):</span>
                      {studentsInThisRoom.length > 0 && (
                        <button
                          onClick={() => {
                            setFilterRoom(r.name);
                            setActiveSubTab('bed_matrix');
                          }}
                          className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold hover:underline"
                        >
                          Xem sơ đồ giường →
                        </button>
                      )}
                    </div>

                    {studentsInThisRoom.length === 0 ? (
                      <div className="bg-slate-50 rounded-2xl p-4 text-center border border-dashed border-slate-200 space-y-2">
                        <Bed className="w-6 h-6 text-slate-300 mx-auto" />
                        <p className="text-xs text-slate-500 font-medium">
                          Phòng chưa có học sinh nào.
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Bạn có thể tự nhập từng em hoặc copy & dán hàng loạt từ file Excel.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {studentsInThisRoom.slice(0, 4).map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs hover:bg-slate-100/80 transition"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="font-mono text-[10px] bg-white text-slate-600 font-bold px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                                {s.bedNumber || 'G?'}
                              </span>
                              <span className="font-bold text-slate-900 truncate">
                                {s.name}
                              </span>
                              <span className="text-[10px] bg-emerald-50 text-emerald-800 font-semibold px-1 rounded">
                                {s.class}
                              </span>
                            </div>
                            <div className="text-[10px] text-purple-700 font-medium truncate max-w-[90px] shrink-0 text-right">
                              {s.hamlet || s.village}
                            </div>
                          </div>
                        ))}

                        {studentsInThisRoom.length > 4 && (
                          <div className="text-[11px] text-center text-slate-500 font-semibold py-1">
                            + {studentsInThisRoom.length - 4} học sinh khác trong phòng...
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Action Buttons (Direct Per-Room Operations) */}
                  <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-1.5">
                    {/* NÚT TỰ NHẬP HỌC SINH TỪNG PHÒNG */}
                    {canEdit && (
                      <button
                        onClick={() => handleOpenSelfEntryForRoom(r.name)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-2xs transition active:scale-95"
                        title={`Tự nhập học sinh vào ${r.name}`}
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Tự Nhập HS</span>
                      </button>
                    )}

                    {/* NÚT NHẬP HÀNG LOẠT VÀO PHÒNG NÀY */}
                    {canEdit && (
                      <button
                        onClick={() => handleOpenBulkForRoom(r.name)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-2xs transition active:scale-95"
                        title={`Dán danh sách học sinh từ Excel vào ${r.name}`}
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Dán Hàng Loạt</span>
                      </button>
                    )}

                    {/* NÚT XEM SƠ ĐỒ GIƯỜNG */}
                    <button
                      onClick={() => {
                        setFilterRoom(r.name);
                        setActiveSubTab('bed_matrix');
                      }}
                      className="p-1.5 bg-white hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition"
                      title={`Xem sơ đồ giường phòng ${r.name}`}
                    >
                      <LayoutGrid className="w-4 h-4 text-slate-600" />
                    </button>

                    {/* NÚT TÙY CHỌN XÓA PHÒNG NÀY */}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleOpenDeleteSingleRoom(r.id)}
                        className="p-1.5 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl border border-slate-200 hover:border-rose-200 transition"
                        title={`Tùy chọn xóa ${r.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-VIEW 2: STANDARD TABLE LIST VIEW                      */}
      {/* ========================================================= */}
      {activeSubTab === 'list' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800">
              Hiển thị: <strong>{filteredStudents.length}</strong> / {students.length} học sinh
            </span>
            {filterRoom !== 'ALL' && (
              <span className="bg-emerald-100 text-emerald-900 font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
                Đang lọc: {filterRoom} ({filteredStudents.length} HS)
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold border-b text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3 text-center w-10">STT</th>
                  <th className="py-2.5 px-3">Họ và tên học sinh</th>
                  <th className="py-2.5 px-2.5 text-center">Giới tính</th>
                  <th className="py-2.5 px-3">Số phòng ở</th>
                  <th className="py-2.5 px-3 text-center">Ở giường số</th>
                  <th className="py-2.5 px-2.5 text-center">Lớp</th>
                  <th className="py-2.5 px-3">Thôn cư trú</th>
                  <th className="py-2.5 px-3">Nóc (Khu dân cư)</th>
                  <th className="py-2.5 px-3 min-w-[160px]">Ghi chú sau mỗi em học sinh</th>
                  <th className="py-2.5 px-3 text-center">SĐT Phụ huynh</th>
                  {canEdit && <th className="py-2.5 px-3 text-center w-20">Thao tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      <div className="space-y-2">
                        <Users className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="font-semibold text-slate-600">
                          {students.length === 0
                            ? 'Danh sách học sinh đang trống.'
                            : 'Không tìm thấy học sinh nào phù hợp bộ lọc.'}
                        </p>
                        {canEdit && (
                          <div className="flex items-center justify-center gap-2 pt-1">
                            <button
                              onClick={() => {
                                setBulkImportTargetRoom(rooms[0] || 'Phòng Nam 01');
                                setIsBulkImportOpen(true);
                              }}
                              className="text-xs bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl hover:bg-emerald-800"
                            >
                              Dán học sinh từ Excel vào phòng
                            </button>
                            <button
                              onClick={onResetSeedData}
                              className="text-xs bg-slate-100 text-slate-700 font-semibold px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-200"
                            >
                              Nạp dữ liệu mẫu 25 phòng
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        <div>{s.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{s.id}</div>
                      </td>
                      <td className="py-2.5 px-2.5 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            s.gender === 'Nam'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {s.gender}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{s.room}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-xs inline-flex items-center gap-1">
                          <Bed className="w-3 h-3 text-emerald-600" />
                          <span>{s.bedNumber || 'Giường 01'}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5 text-center font-bold text-slate-900">
                        Lớp {s.class}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-medium">{s.village}</td>
                      <td className="py-2.5 px-3 text-purple-800 font-bold">{s.hamlet}</td>
                      <td className="py-2.5 px-3">
                        {s.notes ? (
                          <div className="text-amber-900 bg-amber-50 px-2 py-1 rounded border border-amber-200 text-xs">
                            {s.notes}
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600 font-mono text-xs">
                        {s.parentPhone || '-'}
                      </td>
                      {canEdit && (
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEditModal(s)}
                              className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                              title="Tùy chỉnh phòng ở, số giường và ghi chú"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(s.id, s.name)}
                              className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                              title="Xóa học sinh"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-VIEW 3: BED MATRIX VIEW (SƠ ĐỒ BỐ TRÍ GIƯỜNG NGỦ)     */}
      {/* ========================================================= */}
      {activeSubTab === 'bed_matrix' && (
        <div className="space-y-4">
          {filterRoom === 'ALL' ? (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 text-center space-y-3">
              <Building2 className="w-10 h-10 text-emerald-700 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">
                Vui lòng chọn 1 phòng cụ thể để xem sơ đồ bố trí giường
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Bấm vào các nút phòng ở thanh danh mục phía trên hoặc danh sách dưới đây để xem sơ đồ giường phòng đó.
              </p>
              <div className="flex items-center justify-center gap-2 flex-wrap pt-2">
                {rooms.map((r) => (
                  <button
                    key={r}
                    onClick={() => setFilterRoom(r)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 rounded-xl text-xs font-bold border border-slate-300 transition"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
              {/* Room Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-2xl ${
                      filterRoom.toLowerCase().includes('nam')
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <span>SƠ ĐỒ GIƯỜNG NGỦ: {filterRoom}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          filterRoom.toLowerCase().includes('nam')
                            ? 'bg-blue-100 text-blue-800 font-bold'
                            : 'bg-rose-100 text-rose-800 font-bold'
                        }`}
                      >
                        {filterRoom.toLowerCase().includes('nam') ? 'Khu Nam' : 'Khu Nữ'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Đang ở: <strong>{studentsInSelectedRoom.length}</strong> học sinh
                      {selectedRoomConfig?.capacity && (
                        <span> • Sức chứa chuẩn: <strong>{selectedRoomConfig.capacity} giường</strong></span>
                      )}
                      {!selectedRoomConfig?.capacity && (
                        <span> • Sức chứa: <strong className="text-amber-700">Không giới hạn</strong></span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {canEdit && (
                    <button
                      onClick={() => handleOpenSelfEntryForRoom(filterRoom)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Tự nhập HS vào phòng</span>
                    </button>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => handleOpenBulkForRoom(filterRoom)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs transition"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Dán danh sách vào phòng</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Bed Grid Display */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {Array.from({ length: selectedRoomConfig?.capacity || Math.max(studentsInSelectedRoom.length, 8) }).map(
                  (_, bedIdx) => {
                    const bedLabel = `Giường ${String(bedIdx + 1).padStart(2, '0')}`;
                    const studentAtBed = studentsInSelectedRoom.find(
                      (s) => s.bedNumber === bedLabel || s.bedNumber === `G${bedIdx + 1}`
                    );

                    return (
                      <div
                        key={bedLabel}
                        className={`p-3.5 rounded-2xl border transition ${
                          studentAtBed
                            ? 'bg-slate-50 border-emerald-200 shadow-2xs hover:shadow-xs'
                            : 'bg-white border-dashed border-slate-300 hover:border-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-extrabold text-xs font-mono text-emerald-800 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                            <Bed className="w-3.5 h-3.5 text-emerald-700" />
                            <span>{bedLabel}</span>
                          </span>

                          {studentAtBed && canEdit && (
                            <button
                              onClick={() => handleOpenEditModal(studentAtBed)}
                              className="text-slate-400 hover:text-emerald-700 p-1 rounded-lg"
                              title="Tùy chỉnh học sinh ở giường này"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {studentAtBed ? (
                          <div className="space-y-1">
                            <div className="font-bold text-slate-900 text-sm truncate">
                              {studentAtBed.name}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                                Lớp {studentAtBed.class}
                              </span>
                              <span className="text-slate-500 truncate">
                                {studentAtBed.village}
                              </span>
                            </div>
                            <div className="text-[11px] text-purple-700 truncate font-semibold">
                              {studentAtBed.hamlet}
                            </div>
                            {studentAtBed.notes && (
                              <div className="text-[11px] text-amber-900 bg-amber-50 p-1 rounded border border-amber-200 truncate mt-1">
                                {studentAtBed.notes}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-4 space-y-1.5">
                            <span className="text-xs text-slate-400 font-semibold block">
                              Giường trống
                            </span>
                            {canEdit && (
                              <button
                                onClick={() => handleOpenAddModal(filterRoom, bedLabel)}
                                className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold hover:underline inline-flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Xếp học sinh</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: TÙY CHỌN THÊM PHÒNG Ở MỚI (QUICK ADD ROOM)        */}
      {/* ========================================================= */}
      <QuickAddRoomModal
        isOpen={isQuickAddRoomOpen}
        onClose={() => setIsQuickAddRoomOpen(false)}
        onSaveRoom={onSaveRoomConfig}
        existingRooms={roomConfigs}
        onRoomCreated={(newRoomName) => {
          setFilterRoom(newRoomName);
          setActiveSubTab('rooms_overview');
        }}
      />

      {/* ========================================================= */}
      {/* MODAL 2: NHẬP HÀNG LOẠT (COPY & DÁN)                      */}
      {/* ========================================================= */}
      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onSaveBatch={onSaveBatchStudents}
        rooms={rooms}
        roomConfigs={roomConfigs}
        classes={classes}
        villages={villages}
        hamlets={hamlets}
        initialRoom={bulkImportTargetRoom}
        existingStudents={students}
      />

      {/* ========================================================= */}
      {/* MODAL 3: CÀI ĐẶT CẤU HÌNH PHÒNG Ở (TOÀN DIỆN)            */}
      {/* ========================================================= */}
      <RoomManagementModal
        isOpen={isRoomConfigModalOpen}
        onClose={() => setIsRoomConfigModalOpen(false)}
        roomConfigs={roomConfigs}
        onSaveRoomConfig={onSaveRoomConfig}
        onDeleteRoomConfig={onDeleteRoomConfig}
        onResetRoomConfigs={onResetRoomConfigs}
        students={students}
        isAdmin={isAdmin}
      />

      {/* ========================================================= */}
      {/* MODAL 3.5: TÙY CHỌN XÓA CÁC PHÒNG Ở (ĐƠN LẺ & HÀNG LOẠT)  */}
      {/* ========================================================= */}
      <DeleteRoomsModal
        isOpen={isDeleteRoomsModalOpen}
        onClose={() => {
          setIsDeleteRoomsModalOpen(false);
          setSingleDeleteRoomId(null);
        }}
        roomConfigs={roomConfigs}
        students={students}
        onDeleteRoom={onDeleteRoomConfig}
        onDeleteMultipleRooms={
          onDeleteMultipleRoomConfigs ||
          (async (ids, dest) => {
            for (const id of ids) await onDeleteRoomConfig(id, dest);
          })
        }
        initialSelectedRoomId={singleDeleteRoomId}
        isAdmin={isAdmin}
      />

      {/* ========================================================= */}
      {/* MODAL 4: XÁC NHẬN XÓA SẠCH DANH SÁCH CŨ                  */}
      {/* ========================================================= */}
      {isClearConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-rose-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Xác nhận xóa sạch danh sách cũ?
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Thao tác này sẽ xóa toàn bộ <strong>{students.length} học sinh cũ</strong> khỏi hệ thống để bạn chuẩn bị nạp danh sách học sinh thực tế từng phòng (qua chức năng Tự Nhập hoặc Dán hàng loạt từ Excel).
                </p>
              </div>
            </div>

            <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 text-xs text-amber-900 font-medium">
              Lưu ý: Sau khi xóa xong, bạn có thể tự nhập hoặc dán học sinh theo từng phòng, hoặc nạp lại dữ liệu mẫu 25 phòng bất cứ lúc nào.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isClearing}
                onClick={() => setIsClearConfirmOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-xl"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isClearing}
                onClick={handleConfirmClearAll}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition"
              >
                {isClearing ? 'Đang xóa...' : 'Xác Nhận Xóa Sạch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: TỰ NHẬP HỌC SINH / CHỈNH SỬA CHỖ Ở               */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 border border-slate-200 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                  <Bed className="w-5 h-5 text-emerald-700" />
                  <span>
                    {editingStudent
                      ? 'Tùy Chỉnh Sắp Xếp Chỗ Ở Học Sinh'
                      : isSelfEntryMode
                      ? `Tự Nhập Học Sinh: ${formRoom}`
                      : 'Thêm Học Sinh Mới & Xếp Chỗ Ở'}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {isSelfEntryMode
                    ? `Nhập từng em vào ${formRoom}. Bạn có thể bấm "Lưu & Tiếp Tục" để nhập liên tục các giường tiếp theo.`
                    : 'Phân bổ vào các phòng nội trú, số giường và ghi chú sau mỗi em.'}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Session counter if continuous */}
            {isSelfEntryMode && selfEnteredCountInSession > 0 && (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Đã tự nhập thành công {selfEnteredCountInSession} học sinh vào {formRoom} trong đợt này!</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveStudent(false);
              }}
              className="space-y-3.5 text-xs sm:text-sm"
            >
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Họ và tên học sinh (*):
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ví dụ: Hồ Văn Nam"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Giới tính:</label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as 'Nam' | 'Nữ')}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dân tộc:</label>
                  <input
                    type="text"
                    value={formEthnicity}
                    onChange={(e) => setFormEthnicity(e.target.value)}
                    placeholder="Ca Dong, M'Nông, Co..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              {/* SỐ PHÒNG Ở & Ở GIƯỜNG SỐ */}
              <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-3.5 space-y-3">
                <div className="text-xs font-bold text-amber-950 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <BedDouble className="w-4 h-4 text-amber-700" />
                    <span>Sắp xếp chỗ ở nội trú:</span>
                  </span>
                  <span className="text-[11px] text-amber-800 font-normal">
                    {roomConfigs.length} phòng trong danh mục
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Số phòng ở (*):
                    </label>
                    <select
                      value={formRoom}
                      onChange={(e) => {
                        setFormRoom(e.target.value);
                        if (e.target.value.toLowerCase().includes('nữ')) {
                          setFormGender('Nữ');
                        } else if (e.target.value.toLowerCase().includes('nam')) {
                          setFormGender('Nam');
                        }
                      }}
                      className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
                    >
                      <optgroup label="--- PHÒNG NAM ---">
                        {maleRoomConfigs.map((r) => (
                          <option key={r.id} value={r.name}>
                            {r.name}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="--- PHÒNG NỮ ---">
                        {femaleRoomConfigs.map((r) => (
                          <option key={r.id} value={r.name}>
                            {r.name}
                          </option>
                        ))}
                      </optgroup>
                      {otherRoomConfigs.length > 0 && (
                        <optgroup label="--- PHÒNG KHÁC ---">
                          {otherRoomConfigs.map((r) => (
                            <option key={r.id} value={r.name}>
                              {r.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Ở giường số (*):
                    </label>
                    <input
                      type="text"
                      list="bed-suggestions"
                      placeholder="VD: Giường 01, Giường 02..."
                      value={formBedNumber}
                      onChange={(e) => setFormBedNumber(e.target.value)}
                      className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 font-bold text-amber-950 focus:ring-2 focus:ring-amber-500"
                    />
                    <datalist id="bed-suggestions">
                      {Array.from({ length: 16 }).map((_, i) => (
                        <option key={i} value={`Giường ${String(i + 1).padStart(2, '0')}`} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </div>

              {/* Lớp & Thôn & Nóc */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Lớp (*):
                  </label>
                  <input
                    type="text"
                    list="class-suggestions"
                    required
                    placeholder="VD: 6A, 7B..."
                    value={formClass}
                    onChange={(e) => setFormClass(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-900"
                  />
                  <datalist id="class-suggestions">
                    {classes.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Thôn cư trú (*):</label>
                  <input
                    type="text"
                    list="village-suggestions"
                    required
                    placeholder="VD: Thôn 1..."
                    value={formVillage}
                    onChange={(e) => setFormVillage(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                  />
                  <datalist id="village-suggestions">
                    {villages.map((v) => (
                      <option key={v} value={v} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-purple-900 mb-1">Nóc (bản cao):</label>
                  <input
                    type="text"
                    list="hamlet-suggestions"
                    placeholder="VD: Nóc Tăk Pổ..."
                    value={formHamlet}
                    onChange={(e) => setFormHamlet(e.target.value)}
                    className="w-full bg-purple-50/50 border border-purple-300 rounded-xl px-3 py-2 font-semibold text-purple-950"
                  />
                  <datalist id="hamlet-suggestions">
                    {hamlets.map((h) => (
                      <option key={h} value={h} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">SĐT Phụ huynh:</label>
                  <input
                    type="tel"
                    placeholder="09xx xxx xxx"
                    value={formParentPhone}
                    onChange={(e) => setFormParentPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              {/* GHI CHÚ SAU MỖI EM HỌC SINH */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Ô ghi chú sau mỗi em học sinh (Trưởng phòng, sức khỏe, lưu ý):
                </label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú: Trưởng phòng, hay ốm đau, tự học chăm, ở lại cuối tuần..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Đóng
                </button>

                <div className="flex items-center gap-2">
                  {/* CONTINUOUS SELF-ENTRY BUTTON */}
                  {isSelfEntryMode && !editingStudent && (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSaveStudent(true)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition"
                      title="Lưu học sinh này và tiếp tục nhập em kế tiếp trong cùng phòng"
                    >
                      {isSubmitting ? 'Đang lưu...' : 'Lưu & Nhập Em Kế Tiếp'}
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold shadow-md transition transform active:scale-95"
                  >
                    {isSubmitting ? 'Đang lưu...' : editingStudent ? 'Cập Nhật' : 'Lưu & Đóng'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
