import React, { useState, useMemo } from 'react';
import { 
  Check, 
  Search, 
  Filter, 
  Phone, 
  MapPin, 
  Save, 
  Sparkles, 
  AlertCircle, 
  Home, 
  GraduationCap, 
  Clock, 
  MessageSquare,
  HelpCircle,
  FileCheck2,
  Users,
  BedDouble,
  UtensilsCrossed,
  Share2
} from 'lucide-react';
import { 
  Student, 
  AttendanceRecord, 
  AttendanceStatus, 
  STATUS_CONFIG, 
  RoomSummary, 
  AuthorizedUser 
} from '../types';
import { ShareRoomAttendanceModal } from './ShareRoomAttendanceModal';

interface DailyAttendanceViewProps {
  currentDate: string;
  students: Student[];
  attendanceMap: Record<string, AttendanceRecord>;
  onUpdateAttendance: (records: AttendanceRecord[]) => Promise<void>;
  rooms: string[];
  classes: string[];
  villages: string[];
  hamlets: string[];
  currentUser: { email?: string | null; displayName?: string | null } | null;
  authorizedInfo: AuthorizedUser | null;
  selectedStatusFilter: AttendanceStatus | 'all' | 'stay_weekend';
  onClearStatusFilter: () => void;
  roomSummaries: Record<string, RoomSummary>;
  onSaveRoomSummary: (summary: RoomSummary) => Promise<void>;
  initialRoom?: string;
  onForceSyncToServer?: () => Promise<void>;
}

export const DailyAttendanceView: React.FC<DailyAttendanceViewProps> = ({
  currentDate,
  students,
  attendanceMap,
  onUpdateAttendance,
  rooms,
  classes,
  villages,
  hamlets,
  currentUser,
  authorizedInfo,
  selectedStatusFilter,
  onClearStatusFilter,
  roomSummaries,
  onSaveRoomSummary,
  initialRoom,
  onForceSyncToServer,
}) => {
  const [selectedRoom, setSelectedRoom] = useState<string>(() => {
    if (initialRoom && initialRoom.trim() && initialRoom !== 'ALL') {
      return initialRoom.trim();
    }
    return 'ALL';
  });
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedVillage, setSelectedVillage] = useState<string>('ALL');
  const [selectedHamlet, setSelectedHamlet] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [shareTargetRoom, setShareTargetRoom] = useState<string>('ALL');

  // Sync initialRoom when prop updates
  React.useEffect(() => {
    if (initialRoom && initialRoom.trim() && initialRoom !== 'ALL') {
      setSelectedRoom(initialRoom.trim());
    }
  }, [initialRoom]);

  // Local draft state for quick in-memory changes before saving
  const [draftAttendance, setDraftAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [roomDutyNote, setRoomDutyNote] = useState<string>('');

  // Keep draft in sync with external attendanceMap
  React.useEffect(() => {
    setDraftAttendance(attendanceMap);
  }, [attendanceMap]);

  // Load duty note for current room
  React.useEffect(() => {
    if (selectedRoom !== 'ALL' && roomSummaries[selectedRoom]) {
      setRoomDutyNote(roomSummaries[selectedRoom].notes || '');
    } else {
      setRoomDutyNote('');
    }
  }, [selectedRoom, roomSummaries]);

  // Auto filter if teacher only has specific rooms
  React.useEffect(() => {
    if (
      authorizedInfo &&
      authorizedInfo.role === 'teacher' &&
      authorizedInfo.assignedRooms &&
      authorizedInfo.assignedRooms.length > 0 &&
      !authorizedInfo.assignedRooms.includes('ALL') &&
      selectedRoom === 'ALL'
    ) {
      setSelectedRoom(authorizedInfo.assignedRooms[0]);
    }
  }, [authorizedInfo]);

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (s.status !== 'active') return false;
      if (selectedRoom !== 'ALL' && s.room !== selectedRoom) return false;
      if (selectedClass !== 'ALL' && s.class !== selectedClass) return false;
      if (selectedVillage !== 'ALL' && s.village !== selectedVillage) return false;
      if (selectedHamlet !== 'ALL' && s.hamlet !== selectedHamlet) return false;

      // Status filter
      if (selectedStatusFilter !== 'all') {
        if (selectedStatusFilter === 'stay_weekend') {
          if (!draftAttendance[s.id]?.stayWeekend) return false;
        } else {
          const currentStatus = draftAttendance[s.id]?.status || 'present';
          if (currentStatus !== selectedStatusFilter) return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = s.name.toLowerCase().includes(q);
        const matchRoom = s.room.toLowerCase().includes(q);
        const matchClass = s.class.toLowerCase().includes(q);
        const matchHamlet = s.hamlet.toLowerCase().includes(q);
        if (!matchName && !matchRoom && !matchClass && !matchHamlet) return false;
      }

      return true;
    });
  }, [students, selectedRoom, selectedClass, selectedVillage, selectedHamlet, selectedStatusFilter, searchQuery, draftAttendance]);

  // Handle single student status change
  const handleStatusChange = (student: Student, newStatus: AttendanceStatus) => {
    const existing = draftAttendance[student.id];
    const updatedRecord: AttendanceRecord = {
      id: `${currentDate}_${student.id}`,
      date: currentDate,
      studentId: student.id,
      studentName: student.name,
      room: student.room,
      bedNumber: student.bedNumber || existing?.bedNumber || '',
      class: student.class,
      village: student.village,
      hamlet: student.hamlet,
      status: newStatus,
      stayWeekend: existing?.stayWeekend || false,
      note: existing?.note || '',
      recordedByEmail: currentUser?.email || 'giaovientruc@gmail.com',
      recordedByName: authorizedInfo?.name || currentUser?.displayName || 'Giáo viên trực',
      recordedAt: new Date().toISOString(),
    };

    setDraftAttendance((prev) => ({
      ...prev,
      [student.id]: updatedRecord,
    }));
  };

  // Toggle single student weekend stay
  const handleToggleStayWeekend = (student: Student) => {
    const existing = draftAttendance[student.id];
    const currentVal = Boolean(existing?.stayWeekend);
    const updatedRecord: AttendanceRecord = {
      id: `${currentDate}_${student.id}`,
      date: currentDate,
      studentId: student.id,
      studentName: student.name,
      room: student.room,
      bedNumber: student.bedNumber || existing?.bedNumber || '',
      class: student.class,
      village: student.village,
      hamlet: student.hamlet,
      status: existing?.status || 'present',
      stayWeekend: !currentVal,
      note: existing?.note || '',
      recordedByEmail: currentUser?.email || 'giaovientruc@gmail.com',
      recordedByName: authorizedInfo?.name || currentUser?.displayName || 'Giáo viên trực',
      recordedAt: new Date().toISOString(),
    };

    setDraftAttendance((prev) => ({
      ...prev,
      [student.id]: updatedRecord,
    }));
  };

  // Handle student note change
  const handleNoteChange = (student: Student, newNote: string) => {
    const existing = draftAttendance[student.id];
    const updatedRecord: AttendanceRecord = {
      id: `${currentDate}_${student.id}`,
      date: currentDate,
      studentId: student.id,
      studentName: student.name,
      room: student.room,
      bedNumber: student.bedNumber || existing?.bedNumber || '',
      class: student.class,
      village: student.village,
      hamlet: student.hamlet,
      status: existing?.status || 'present',
      stayWeekend: existing?.stayWeekend || false,
      note: newNote,
      recordedByEmail: currentUser?.email || 'giaovientruc@gmail.com',
      recordedByName: authorizedInfo?.name || currentUser?.displayName || 'Giáo viên trực',
      recordedAt: new Date().toISOString(),
    };

    setDraftAttendance((prev) => ({
      ...prev,
      [student.id]: updatedRecord,
    }));
  };

  // Bulk action: Mark all visible students as "Present"
  const handleMarkAllPresent = () => {
    const nextDraft = { ...draftAttendance };
    filteredStudents.forEach((s) => {
      const existing = nextDraft[s.id];
      nextDraft[s.id] = {
        id: `${currentDate}_${s.id}`,
        date: currentDate,
        studentId: s.id,
        studentName: s.name,
        room: s.room,
        bedNumber: s.bedNumber || existing?.bedNumber || '',
        class: s.class,
        village: s.village,
        hamlet: s.hamlet,
        status: 'present',
        stayWeekend: existing?.stayWeekend || false,
        note: existing?.note || '',
        recordedByEmail: currentUser?.email || 'giaovientruc@gmail.com',
        recordedByName: authorizedInfo?.name || currentUser?.displayName || 'Giáo viên trực',
        recordedAt: new Date().toISOString(),
      };
    });
    setDraftAttendance(nextDraft);
    setSaveSuccessMessage('Đã chuyển tất cả học sinh đang hiển thị sang "Có mặt"');
    setTimeout(() => setSaveSuccessMessage(null), 3000);
  };

  // Bulk action: Mark visible students staying over the weekend
  const handleMarkAllStayWeekend = () => {
    const nextDraft = { ...draftAttendance };
    filteredStudents.forEach((s) => {
      const existing = nextDraft[s.id];
      nextDraft[s.id] = {
        id: `${currentDate}_${s.id}`,
        date: currentDate,
        studentId: s.id,
        studentName: s.name,
        room: s.room,
        bedNumber: s.bedNumber || existing?.bedNumber || '',
        class: s.class,
        village: s.village,
        hamlet: s.hamlet,
        status: existing?.status || 'present',
        stayWeekend: true,
        note: existing?.note || '',
        recordedByEmail: currentUser?.email || 'giaovientruc@gmail.com',
        recordedByName: authorizedInfo?.name || currentUser?.displayName || 'Giáo viên trực',
        recordedAt: new Date().toISOString(),
      };
    });
    setDraftAttendance(nextDraft);
    setSaveSuccessMessage('Đã đánh dấu các em đang hiển thị Ở LẠI CUỐI TUẦN');
    setTimeout(() => setSaveSuccessMessage(null), 3000);
  };

  // Bulk action: Clear weekend stay
  const handleClearAllStayWeekend = () => {
    const nextDraft = { ...draftAttendance };
    filteredStudents.forEach((s) => {
      const existing = nextDraft[s.id];
      if (existing) {
        nextDraft[s.id] = {
          ...existing,
          stayWeekend: false,
        };
      }
    });
    setDraftAttendance(nextDraft);
    setSaveSuccessMessage('Đã hủy trạng thái ở lại cuối tuần');
    setTimeout(() => setSaveSuccessMessage(null), 3000);
  };

  // Count visible room students staying over the weekend
  const visibleStayWeekendCount = useMemo(() => {
    return filteredStudents.filter((s) => Boolean(draftAttendance[s.id]?.stayWeekend)).length;
  }, [filteredStudents, draftAttendance]);

  // Save all modified attendance records to Firestore
  const handleSaveAttendance = async () => {
    setIsSaving(true);
    try {
      // Build records list for current filtered students or all updated
      const recordsToSave: AttendanceRecord[] = [];
      filteredStudents.forEach((s) => {
        const record = draftAttendance[s.id] || {
          id: `${currentDate}_${s.id}`,
          date: currentDate,
          studentId: s.id,
          studentName: s.name,
          room: s.room,
          bedNumber: s.bedNumber || '',
          class: s.class,
          village: s.village,
          hamlet: s.hamlet,
          status: 'present' as AttendanceStatus,
          stayWeekend: false,
          note: '',
          recordedByEmail: currentUser?.email || 'giaovientruc@gmail.com',
          recordedByName: authorizedInfo?.name || currentUser?.displayName || 'Giáo viên trực',
          recordedAt: new Date().toISOString(),
        };
        recordsToSave.push(record);
      });

      await onUpdateAttendance(recordsToSave);

      // Save room summaries for all affected rooms
      const targetRooms = selectedRoom === 'ALL' ? rooms : [selectedRoom];
      for (const r of targetRooms) {
        const roomStudents = students.filter((s) => s.room === r && s.status === 'active');
        if (roomStudents.length === 0) continue;

        let present = 0;
        let skippedClass = 0;
        let ateNoClass = 0;
        let notAtSchool = 0;
        let leaveExcused = 0;
        let leaveUnexcused = 0;
        let stayWeekend = 0;

        roomStudents.forEach((s) => {
          const rec = draftAttendance[s.id];
          const st = rec?.status || 'present';
          if (st === 'present') present++;
          else if (st === 'skipped_class') skippedClass++;
          else if (st === 'ate_no_class') ateNoClass++;
          else if (st === 'not_at_school_this_week') notAtSchool++;
          else if (st === 'leave_excused') leaveExcused++;
          else if (st === 'leave_unexcused') leaveUnexcused++;
          if (rec?.stayWeekend) stayWeekend++;
        });

        const existingSummary = roomSummaries[r];
        const summary: RoomSummary = {
          id: `${currentDate}_${r}`,
          date: currentDate,
          roomId: r,
          teacherEmail: currentUser?.email || 'giaovientruc@gmail.com',
          teacherName: authorizedInfo?.name || currentUser?.displayName || 'Giáo viên trực',
          totalStudents: roomStudents.length,
          presentCount: present,
          skippedClassCount: skippedClass,
          ateNoClassCount: ateNoClass,
          notAtSchoolThisWeekCount: notAtSchool,
          leaveExcusedCount: leaveExcused,
          leaveUnexcusedCount: leaveUnexcused,
          stayWeekendCount: stayWeekend,
          notes: r === selectedRoom ? roomDutyNote : (existingSummary?.notes || ''),
          submitted: true,
          updatedAt: new Date().toISOString(),
        };

        await onSaveRoomSummary(summary);
      }

      setSaveSuccessMessage('Đã lưu điểm danh và báo cáo các phòng thành công!');
      setTimeout(() => setSaveSuccessMessage(null), 3500);
    } catch (err) {
      console.error(err);
      alert('Có lỗi khi lưu dữ liệu, vui lòng kiểm tra kết nối mạng.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Alert / Filter Notice if active */}
      {selectedStatusFilter !== 'all' && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-center justify-between text-amber-900 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              Đang lọc danh sách học sinh:{' '}
              <strong>
                {selectedStatusFilter === 'stay_weekend'
                  ? 'Ở lại nội trú cuối tuần'
                  : STATUS_CONFIG[selectedStatusFilter].label}
              </strong>
            </span>
          </div>
          <button
            onClick={onClearStatusFilter}
            className="text-xs font-semibold bg-amber-200 hover:bg-amber-300 text-amber-900 px-2.5 py-1 rounded-lg transition"
          >
            Hiện tất cả
          </button>
        </div>
      )}

      {/* Success notification banner */}
      {saveSuccessMessage && (
        <div className="bg-emerald-600 text-white rounded-xl p-3 flex items-center justify-between shadow-md transition animate-fade-in text-sm font-medium">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5" />
            <span>{saveSuccessMessage}</span>
          </div>
        </div>
      )}

      {/* Filter and Control Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
        {/* Row 1: Search & Room Selector */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Room Selector */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5 text-emerald-700" />
              <span>Phòng nội trú:</span>
            </label>
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="ALL">-- Tất cả các phòng ({rooms.length} phòng) --</option>
              {rooms.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Search box */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <span>Tìm kiếm học sinh:</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Nhập tên học sinh, lớp, nóc..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>
        </div>

        {/* Row 2: Secondary Filters (Lớp, Thôn, Nóc) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-xs text-slate-500 mb-1 flex items-center gap-1">
              <GraduationCap className="w-3 h-3 text-slate-400" />
              <span>Lớp:</span>
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-md px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">Tất cả các lớp</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  Lớp {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-400" />
              <span>Thôn:</span>
            </label>
            <select
              value={selectedVillage}
              onChange={(e) => setSelectedVillage(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-md px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">Tất cả các Thôn</option>
              {villages.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-purple-500" />
              <span>Nóc (Bản cao):</span>
            </label>
            <select
              value={selectedHamlet}
              onChange={(e) => setSelectedHamlet(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-md px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">Tất cả các Nóc</option>
              {hamlets.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
          <div className="text-xs text-slate-600 flex items-center flex-wrap gap-2">
            <span>
              Hiển thị: <strong>{filteredStudents.length}</strong> / {students.length} học sinh
            </span>
            {selectedRoom !== 'ALL' && (
              <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-medium">
                {selectedRoom}
              </span>
            )}
            {/* Weekend meals reported counter pill */}
            <div className="inline-flex items-center gap-1.5 bg-teal-100 text-teal-900 border border-teal-300 px-2.5 py-1 rounded-lg font-bold text-xs shadow-2xs">
              <UtensilsCrossed className="w-3.5 h-3.5 text-teal-700" />
              <span>Báo suất ăn cuối tuần: {visibleStayWeekendCount} suất</span>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Bulk stay weekend buttons */}
            <button
              onClick={handleMarkAllStayWeekend}
              className="flex items-center gap-1.5 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-300 font-semibold text-xs sm:text-sm px-3 py-2 rounded-lg transition"
              title="Đánh dấu tất cả học sinh đang hiển thị báo ăn ở lại cuối tuần"
            >
              <UtensilsCrossed className="w-4 h-4 text-teal-700" />
              <span>Báo ăn tất cả T7-CN</span>
            </button>

            {visibleStayWeekendCount > 0 && (
              <button
                onClick={handleClearAllStayWeekend}
                className="flex items-center gap-1 text-slate-500 hover:text-rose-700 hover:bg-rose-50 text-xs px-2.5 py-2 rounded-lg transition border border-slate-200"
                title="Hủy báo ăn cuối tuần cho các em đang hiển thị"
              >
                <span>Hủy báo ăn</span>
              </button>
            )}

            <button
              onClick={() => {
                setShareTargetRoom(selectedRoom);
                setIsShareModalOpen(true);
              }}
              className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 font-semibold text-xs sm:text-sm px-3 py-2 rounded-lg transition cursor-pointer"
              title="Chia sẻ link và mã QR điểm danh của phòng này lên máy chủ"
            >
              <Share2 className="w-4 h-4 text-blue-600" />
              <span>Chia sẻ phòng</span>
            </button>

            <button
              onClick={handleMarkAllPresent}
              className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-medium text-xs sm:text-sm px-3 py-2 rounded-lg transition"
              title="Đánh dấu tất cả học sinh đang hiển thị là Có mặt"
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Đánh dấu tất cả Có Mặt</span>
            </button>

            <button
              onClick={handleSaveAttendance}
              disabled={isSaving}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs sm:text-sm px-4 py-2 rounded-lg shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu Điểm Danh'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Room Duty Teacher Log (if a specific room is selected) */}
      {selectedRoom !== 'ALL' && (
        <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <h3 className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-amber-700" />
              <span>Nhật ký & Nhận xét của GV trực {selectedRoom}</span>
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-teal-100 text-teal-900 font-bold px-2 py-0.5 rounded-full border border-teal-300 flex items-center gap-1 shadow-2xs">
                <UtensilsCrossed className="w-3 h-3 text-teal-700" />
                <span>Báo bếp: {visibleStayWeekendCount} suất ăn T7-CN</span>
              </span>
              <span className="text-[11px] text-amber-700">
                {currentUser?.email ? `Người trực: ${authorizedInfo?.name || currentUser.displayName || currentUser.email}` : 'Chưa đăng nhập'}
              </span>
            </div>
          </div>
          <textarea
            value={roomDutyNote}
            onChange={(e) => setRoomDutyNote(e.target.value)}
            rows={2}
            placeholder="Ghi chú về tình hình trật tự, giờ giấc ngủ nghỉ, vệ sinh phòng, học sinh đau ốm cần theo dõi, số lượng đăng ký ăn cuối tuần..."
            className="w-full bg-white border border-amber-300 text-slate-800 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>* Ghi chú và số suất ăn này sẽ được tự động tổng hợp vào Báo Cáo chung gửi Ban Giám Hiệu & Nhà Bếp.</span>
            <button
              onClick={handleSaveAttendance}
              className="text-amber-800 hover:underline font-semibold"
            >
              Lưu nhận xét phòng
            </button>
          </div>
        </div>
      )}

      {/* Student List Cards */}
      <div className="space-y-2.5">
        {filteredStudents.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-500">
            <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-slate-700">Không tìm thấy học sinh nào theo bộ lọc</p>
            <p className="text-xs text-slate-400 mt-1">
              Thử chọn phòng khác hoặc xóa từ khóa tìm kiếm.
            </p>
          </div>
        ) : (
          filteredStudents.map((student, index) => {
            const record = draftAttendance[student.id];
            const currentStatus: AttendanceStatus = record?.status || 'present';
            const note = record?.note || '';

            return (
              <div
                key={student.id}
                className={`bg-white rounded-xl p-3.5 border transition shadow-sm hover:shadow ${
                  currentStatus === 'present'
                    ? 'border-slate-200'
                    : currentStatus === 'skipped_class'
                    ? 'border-orange-400 bg-orange-50/20 ring-1 ring-orange-300'
                    : currentStatus === 'ate_no_class'
                    ? 'border-amber-400 bg-amber-50/20 ring-1 ring-amber-300'
                    : currentStatus === 'leave_unexcused'
                    ? 'border-rose-400 bg-rose-50/20 ring-1 ring-rose-300'
                    : currentStatus === 'not_at_school_this_week'
                    ? 'border-purple-400 bg-purple-50/20 ring-1 ring-purple-300'
                    : 'border-blue-400 bg-blue-50/20 ring-1 ring-blue-300'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  {/* Student Info */}
                  <div className="flex items-start gap-3">
                    <span className="w-6 text-center text-xs font-bold text-slate-400 pt-0.5">
                      {index + 1}
                    </span>
                    <div>
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {student.name}
                        </span>
                        <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                          Lớp {student.class}
                        </span>
                        <span className="text-[11px] font-medium bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                          {student.room}
                        </span>
                        {student.bedNumber && (
                          <span className="text-[11px] font-bold bg-amber-100 text-amber-950 px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1 shadow-2xs">
                            <BedDouble className="w-3 h-3 text-amber-700" />
                            <span>{student.bedNumber}</span>
                          </span>
                        )}
                        {student.gender && (
                          <span className="text-[11px] text-slate-500">
                            ({student.gender})
                          </span>
                        )}
                        {student.ethnicity && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            {student.ethnicity}
                          </span>
                        )}
                        {/* Weekend Meal Status Badge */}
                        {record?.stayWeekend && (
                          <span className="text-[11px] font-extrabold bg-teal-100 text-teal-950 border border-teal-300 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs animate-pulse">
                            <UtensilsCrossed className="w-3 h-3 text-teal-700" />
                            <span>Báo suất ăn T7-CN (Ở lại trường)</span>
                          </span>
                        )}
                      </div>

                      {/* Location & Permanent Profile Note */}
                      <div className="flex items-center flex-wrap gap-2 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1 text-slate-600">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{student.village}</span>
                        </span>
                        <span>•</span>
                        <span className="font-medium text-purple-700 bg-purple-50 px-1 rounded">
                          {student.hamlet}
                        </span>
                        {student.parentPhone && (
                          <>
                            <span>•</span>
                            <a
                              href={`tel:${student.parentPhone}`}
                              className="text-xs text-emerald-700 hover:underline flex items-center gap-1"
                              title="Gọi phụ huynh"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{student.parentPhone}</span>
                            </a>
                          </>
                        )}
                        {student.notes && (
                          <>
                            <span>•</span>
                            <span className="text-[11px] text-slate-600 italic bg-amber-50/60 border border-amber-200/60 px-1.5 py-0.5 rounded" title={`Hồ sơ: ${student.notes}`}>
                              Hồ sơ: {student.notes}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Attendance & Weekend Meal Action Buttons + Ô Ghi Chú Bên Cạnh Báo Ăn Cuối Tuần */}
                  <div className="flex items-center flex-wrap gap-1.5 self-stretch lg:self-center">
                    {/* Status 1: Có mặt */}
                    <button
                      onClick={() => handleStatusChange(student, 'present')}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer shrink-0 ${
                        currentStatus === 'present'
                          ? 'bg-emerald-600 text-white font-bold shadow-sm ring-2 ring-emerald-600/40'
                          : 'bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800'
                      }`}
                    >
                      ✓ Có mặt
                    </button>

                    {/* Status 2: HS Bỏ tiết */}
                    <button
                      onClick={() => handleStatusChange(student, 'skipped_class')}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer shrink-0 ${
                        currentStatus === 'skipped_class'
                          ? 'bg-orange-600 text-white font-bold shadow-sm ring-2 ring-orange-600/40'
                          : 'bg-slate-100 hover:bg-orange-100 text-slate-700 hover:text-orange-950'
                      }`}
                      title="Học sinh tự ý bỏ tiết học trên lớp (bỏ 1 hoặc nhiều tiết trong các buổi học)"
                    >
                      🚫 HS Bỏ tiết
                    </button>

                    {/* Status 3: Ăn không học */}
                    <button
                      onClick={() => handleStatusChange(student, 'ate_no_class')}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer shrink-0 ${
                        currentStatus === 'ate_no_class'
                          ? 'bg-amber-500 text-white font-bold shadow-sm ring-2 ring-amber-500/40'
                          : 'bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900'
                      }`}
                      title="Học sinh có ăn tại bếp nội trú nhưng trốn/bỏ học"
                    >
                      ⚠️ Ăn không học
                    </button>

                    {/* Status 3: Chưa lên trường trong tuần */}
                    <button
                      onClick={() => handleStatusChange(student, 'not_at_school_this_week')}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer shrink-0 ${
                        currentStatus === 'not_at_school_this_week'
                          ? 'bg-purple-600 text-white font-bold shadow-sm ring-2 ring-purple-600/40'
                          : 'bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-800'
                      }`}
                      title="Chưa ra trường trong tuần (còn ở thôn/nóc)"
                    >
                      🏔️ Chưa lên tuần
                    </button>

                    {/* Status 4: Nghỉ có phép */}
                    <button
                      onClick={() => handleStatusChange(student, 'leave_excused')}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer shrink-0 ${
                        currentStatus === 'leave_excused'
                          ? 'bg-blue-600 text-white font-bold shadow-sm ring-2 ring-blue-600/40'
                          : 'bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800'
                      }`}
                    >
                      📝 Nghỉ có phép
                    </button>

                    {/* Status 5: Nghỉ không phép */}
                    <button
                      onClick={() => handleStatusChange(student, 'leave_unexcused')}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer shrink-0 ${
                        currentStatus === 'leave_unexcused'
                          ? 'bg-rose-600 text-white font-bold shadow-sm ring-2 ring-rose-600/40'
                          : 'bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-800'
                      }`}
                    >
                      ✕ Nghỉ không phép
                    </button>

                    {/* Status 6: Ở lại cuối tuần & Báo suất ăn */}
                    <button
                      onClick={() => handleToggleStayWeekend(student)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 border shrink-0 ${
                        record?.stayWeekend
                          ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm ring-2 ring-teal-400 border-teal-500'
                          : 'bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-900 border-slate-200'
                      }`}
                      title="Điểm danh học sinh ở lại cuối tuần để báo suất ăn"
                    >
                      <UtensilsCrossed className={`w-3.5 h-3.5 ${record?.stayWeekend ? 'text-white' : 'text-teal-600'}`} />
                      <span>{record?.stayWeekend ? '✓ Báo suất ăn T7-CN' : 'Báo ăn cuối tuần'}</span>
                    </button>

                    {/* Ô Ghi Chú Bên Cạnh Báo Ăn Cuối Tuần (Theo yêu cầu người dùng cho tất cả học sinh các phòng) */}
                    <div className="relative min-w-[200px] sm:min-w-[240px] md:w-60 lg:w-72 flex-1">
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => handleNoteChange(student, e.target.value)}
                        placeholder="Ghi chú báo ăn / lý do..."
                        title={`Ghi chú cho học sinh ${student.name} (báo ăn cuối tuần, lý do...)`}
                        className={`w-full text-xs pl-3 pr-7 py-1.5 rounded-lg border transition focus:outline-none focus:ring-2 ${
                          record?.stayWeekend
                            ? 'border-teal-400 bg-teal-50/70 text-teal-950 placeholder-teal-500 focus:ring-teal-400 focus:border-teal-500 shadow-2xs font-medium'
                            : currentStatus === 'skipped_class'
                            ? 'border-orange-400 bg-orange-50/70 text-orange-950 placeholder-orange-400 focus:ring-orange-400 focus:border-orange-500 shadow-2xs'
                            : currentStatus === 'leave_unexcused'
                            ? 'border-rose-400 bg-rose-50/70 text-rose-950 placeholder-rose-400 focus:ring-rose-400 focus:border-rose-500 shadow-2xs'
                            : currentStatus === 'leave_excused'
                            ? 'border-blue-400 bg-blue-50/70 text-blue-950 placeholder-blue-400 focus:ring-blue-400 focus:border-blue-500 shadow-2xs'
                            : currentStatus === 'ate_no_class'
                            ? 'border-amber-400 bg-amber-50/70 text-amber-950 placeholder-amber-400 focus:ring-amber-400 focus:border-amber-500 shadow-2xs'
                            : currentStatus === 'not_at_school_this_week'
                            ? 'border-purple-400 bg-purple-50/70 text-purple-950 placeholder-purple-400 focus:ring-purple-400 focus:border-purple-500 shadow-2xs'
                            : 'border-slate-300 bg-slate-50/70 text-slate-800 placeholder-slate-400 hover:bg-white focus:bg-white focus:ring-emerald-500 focus:border-emerald-500'
                        }`}
                      />
                      {note && (
                        <button
                          type="button"
                          onClick={() => handleNoteChange(student, '')}
                          title="Xóa nhanh ghi chú"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer transition"
                        >
                          <span className="text-xs font-bold leading-none block">✕</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Save Button at bottom right for easy access */}
      <div className="fixed bottom-5 right-5 z-30">
        <button
          onClick={handleSaveAttendance}
          disabled={isSaving}
          className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm px-5 py-3 rounded-full shadow-2xl transition transform hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          <FileCheck2 className="w-5 h-5" />
          <span>{isSaving ? 'Đang lưu...' : 'Lưu Điểm Danh Ngày'}</span>
        </button>
      </div>

      {/* Share Room Attendance Modal */}
      <ShareRoomAttendanceModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        room={shareTargetRoom}
        currentDate={currentDate}
        tabType="attendance"
        roomStudents={
          shareTargetRoom === 'ALL'
            ? students.filter((s) => s.status === 'active')
            : students.filter((s) => s.room === shareTargetRoom && s.status === 'active')
        }
        onForceSyncToServer={onForceSyncToServer}
      />
    </div>
  );
};
