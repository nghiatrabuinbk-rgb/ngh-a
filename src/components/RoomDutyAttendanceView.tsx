import React, { useState, useMemo, useEffect } from 'react';
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
  Copy,
  CheckCheck,
  ShieldCheck,
  Building,
  RotateCcw,
  Calendar,
  Layers,
  HeartHandshake,
  Share2,
  RefreshCw
} from 'lucide-react';
import { 
  Student, 
  AttendanceRecord, 
  AttendanceStatus, 
  STATUS_CONFIG, 
  RoomSummary, 
  AuthorizedUser,
  RoomConfig 
} from '../types';
import { ShareRoomAttendanceModal } from './ShareRoomAttendanceModal';

interface RoomDutyAttendanceViewProps {
  currentDate: string;
  onDateChange?: (date: string) => void;
  students: Student[];
  attendanceMap: Record<string, AttendanceRecord>;
  onUpdateAttendance: (records: AttendanceRecord[]) => Promise<void>;
  rooms: string[];
  classes: string[];
  villages: string[];
  hamlets: string[];
  currentUser: { email?: string | null; displayName?: string | null } | null;
  authorizedInfo: AuthorizedUser | null;
  roomSummaries: Record<string, RoomSummary>;
  onSaveRoomSummary: (summary: RoomSummary) => Promise<void>;
  roomConfigs?: RoomConfig[];
  initialRoom?: string;
  onForceSyncToServer?: () => Promise<void>;
}

export const RoomDutyAttendanceView: React.FC<RoomDutyAttendanceViewProps> = ({
  currentDate,
  onDateChange,
  students,
  attendanceMap,
  onUpdateAttendance,
  rooms,
  classes,
  villages,
  hamlets,
  currentUser,
  authorizedInfo,
  roomSummaries,
  onSaveRoomSummary,
  roomConfigs = [],
  initialRoom,
  onForceSyncToServer,
}) => {
  const [selectedRoom, setSelectedRoom] = useState<string>(() => {
    if (initialRoom && initialRoom.trim() && initialRoom !== 'ALL') {
      return initialRoom.trim();
    }
    return 'ALL';
  });
  const [selectedGenderZone, setSelectedGenderZone] = useState<'all' | 'nam' | 'nu' | 'assigned'>('all');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedVillage, setSelectedVillage] = useState<string>('ALL');
  const [selectedHamlet, setSelectedHamlet] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<AttendanceStatus | 'all' | 'stay_weekend'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [copiedZalo, setCopiedZalo] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [shareTargetRoom, setShareTargetRoom] = useState<string>('ALL');

  // Sync initialRoom when prop updates
  useEffect(() => {
    if (initialRoom && initialRoom.trim() && initialRoom !== 'ALL') {
      setSelectedRoom(initialRoom.trim());
    }
  }, [initialRoom]);

  // Local draft state for attendance
  const [draftAttendance, setDraftAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [roomDutyNote, setRoomDutyNote] = useState<string>('');

  // Sync draft attendance with incoming props
  useEffect(() => {
    setDraftAttendance(attendanceMap);
  }, [attendanceMap]);

  // Load duty note for current room
  useEffect(() => {
    if (selectedRoom !== 'ALL' && roomSummaries[selectedRoom]) {
      setRoomDutyNote(roomSummaries[selectedRoom].notes || '');
    } else {
      setRoomDutyNote('');
    }
  }, [selectedRoom, roomSummaries]);

  // Auto-select assigned room for duty teacher on first load
  useEffect(() => {
    if (
      authorizedInfo &&
      authorizedInfo.role === 'teacher' &&
      authorizedInfo.assignedRooms &&
      authorizedInfo.assignedRooms.length > 0 &&
      !authorizedInfo.assignedRooms.includes('ALL') &&
      selectedRoom === 'ALL'
    ) {
      setSelectedRoom(authorizedInfo.assignedRooms[0]);
      setSelectedGenderZone('assigned');
    }
  }, [authorizedInfo]);

  // Male rooms (Phòng Nam 01 - 12) & Female rooms (Phòng Nữ 13 - 25)
  const maleRooms = useMemo(() => {
    return rooms.filter((r) => r.toLowerCase().includes('nam'));
  }, [rooms]);

  const femaleRooms = useMemo(() => {
    return rooms.filter((r) => r.toLowerCase().includes('nữ') || r.toLowerCase().includes('nu'));
  }, [rooms]);

  const assignedRoomsList = useMemo(() => {
    if (!authorizedInfo || !authorizedInfo.assignedRooms || authorizedInfo.assignedRooms.includes('ALL')) {
      return rooms;
    }
    return authorizedInfo.assignedRooms;
  }, [authorizedInfo, rooms]);

  // Visible room chips based on zone
  const visibleRoomsList = useMemo(() => {
    if (selectedGenderZone === 'nam') return maleRooms;
    if (selectedGenderZone === 'nu') return femaleRooms;
    if (selectedGenderZone === 'assigned') return assignedRoomsList;
    return rooms;
  }, [selectedGenderZone, maleRooms, femaleRooms, assignedRoomsList, rooms]);

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (s.status !== 'active') return false;

      // Zone filter
      if (selectedGenderZone === 'nam' && !s.room.toLowerCase().includes('nam')) return false;
      if (selectedGenderZone === 'nu' && !s.room.toLowerCase().includes('nữ') && !s.room.toLowerCase().includes('nu')) return false;
      if (selectedGenderZone === 'assigned' && !assignedRoomsList.includes(s.room)) return false;

      // Room filter
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
        const matchBed = (s.bedNumber || '').toLowerCase().includes(q);
        const matchClass = s.class.toLowerCase().includes(q);
        const matchHamlet = s.hamlet.toLowerCase().includes(q);
        const matchNote = (s.notes || '').toLowerCase().includes(q);
        if (!matchName && !matchRoom && !matchBed && !matchClass && !matchHamlet && !matchNote) return false;
      }

      return true;
    });
  }, [
    students,
    selectedGenderZone,
    assignedRoomsList,
    selectedRoom,
    selectedClass,
    selectedVillage,
    selectedHamlet,
    selectedStatusFilter,
    searchQuery,
    draftAttendance,
  ]);

  // Stats calculation for the currently filtered set
  const stats = useMemo(() => {
    let total = filteredStudents.length;
    let present = 0;
    let skippedClass = 0;
    let ateNoClass = 0;
    let notAtSchoolThisWeek = 0;
    let leaveExcused = 0;
    let leaveUnexcused = 0;
    let stayWeekend = 0;

    filteredStudents.forEach((s) => {
      const rec = draftAttendance[s.id];
      const status = rec?.status || 'present';
      if (status === 'present') present++;
      else if (status === 'skipped_class') skippedClass++;
      else if (status === 'ate_no_class') ateNoClass++;
      else if (status === 'not_at_school_this_week') notAtSchoolThisWeek++;
      else if (status === 'leave_excused') leaveExcused++;
      else if (status === 'leave_unexcused') leaveUnexcused++;

      if (rec?.stayWeekend) stayWeekend++;
    });

    const attendanceRate = total > 0 ? ((present / total) * 100).toFixed(1) : '0.0';

    return {
      total,
      present,
      skippedClass,
      ateNoClass,
      notAtSchoolThisWeek,
      leaveExcused,
      leaveUnexcused,
      stayWeekend,
      attendanceRate,
    };
  }, [filteredStudents, draftAttendance]);

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
      recordedByName: authorizedInfo?.name || currentUser?.displayName || 'Giáo viên trực phòng',
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
      recordedByName: authorizedInfo?.name || currentUser?.displayName || 'Giáo viên trực phòng',
      recordedAt: new Date().toISOString(),
    };

    setDraftAttendance((prev) => ({
      ...prev,
      [student.id]: updatedRecord,
    }));
  };

  // Handle student note change (Ô ghi chú bên cạnh báo ăn cuối tuần)
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
      recordedByName: authorizedInfo?.name || currentUser?.displayName || 'Giáo viên trực phòng',
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
        recordedByName: authorizedInfo?.name || currentUser?.displayName || 'Giáo viên trực phòng',
        recordedAt: new Date().toISOString(),
      };
    });
    setDraftAttendance(nextDraft);
    setSaveSuccessMessage(`Đã đánh dấu ${filteredStudents.length} học sinh đang chọn sang "Có mặt"`);
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
        recordedByName: authorizedInfo?.name || currentUser?.displayName || 'Giáo viên trực phòng',
        recordedAt: new Date().toISOString(),
      };
    });
    setDraftAttendance(nextDraft);
    setSaveSuccessMessage(`Đã báo ở lại cuối tuần cho ${filteredStudents.length} học sinh`);
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
    setSaveSuccessMessage('Đã hủy báo ăn cuối tuần cho các em đang chọn');
    setTimeout(() => setSaveSuccessMessage(null), 3000);
  };

  // Save all modified attendance records to Firestore
  const handleSaveAttendance = async () => {
    setIsSaving(true);
    try {
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
          recordedByName: authorizedInfo?.name || currentUser?.displayName || 'Giáo viên trực phòng',
          recordedAt: new Date().toISOString(),
        };
        recordsToSave.push(record);
      });

      await onUpdateAttendance(recordsToSave);

      // Save room summaries for affected rooms
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
          teacherName: authorizedInfo?.name || currentUser?.displayName || 'Giáo viên trực phòng',
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

      setSaveSuccessMessage('Đã lưu thành công điểm danh ca trực phòng lên hệ thống!');
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Lỗi khi lưu điểm danh ca trực phòng:', err);
      setSaveSuccessMessage('Có lỗi xảy ra khi lưu. Dữ liệu đã được lưu tạm trên máy.');
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  // Copy quick summary to clipboard for Zalo group
  const handleCopyZaloSummary = () => {
    const roomTitle = selectedRoom === 'ALL' ? 'TẤT CẢ CÁC PHÒNG NỘI TRÚ' : selectedRoom;
    const dutyTeacherName = authorizedInfo?.name || currentUser?.displayName || 'Giáo viên trực phòng';
    
    let text = `📋 BÁO CÁO THEO DÕI VÀ ĐIỂM DANH CA TRỰC PHÒNG\n`;
    text += `🏫 Trường PTDTBT THCS Trà Đốc\n`;
    text += `📅 Ngày: ${currentDate}\n`;
    text += `👮 Giáo viên trực: ${dutyTeacherName}\n`;
    text += `🏠 Khu vực / Phòng: ${roomTitle}\n`;
    text += `------------------------------------\n`;
    text += `👥 Tổng sĩ số: ${stats.total} học sinh\n`;
    text += `✅ Có mặt: ${stats.present}/${stats.total} (${stats.attendanceRate}%)\n`;
    if (stats.skippedClass > 0) text += `🚫 HS Bỏ tiết: ${stats.skippedClass}\n`;
    if (stats.ateNoClass > 0) text += `⚠️ Ăn không học: ${stats.ateNoClass}\n`;
    if (stats.notAtSchoolThisWeek > 0) text += `🏔️ Chưa lên trường tuần này: ${stats.notAtSchoolThisWeek}\n`;
    if (stats.leaveExcused > 0) text += `📝 Vắng có phép: ${stats.leaveExcused}\n`;
    if (stats.leaveUnexcused > 0) text += `❌ Vắng không phép: ${stats.leaveUnexcused}\n`;
    text += `🍱 Ở lại cuối tuần (báo ăn): ${stats.stayWeekend} em\n`;

    if (roomDutyNote.trim()) {
      text += `\n📝 Nhật ký & ghi chú ca trực: ${roomDutyNote.trim()}\n`;
    }

    navigator.clipboard.writeText(text);
    setCopiedZalo(true);
    setTimeout(() => setCopiedZalo(false), 2500);
  };

  return (
    <div className="space-y-4">
      {/* View Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-cyan-900 text-white rounded-2xl p-5 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-emerald-700/50">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/20">
              <BedDouble className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-700/90 text-emerald-200 border border-emerald-500/30">
                  Nhiệm vụ trực phòng nội trú
                </span>
                <span className="text-xs text-amber-300 font-semibold">
                  25 Phòng ở (12 Nam, 13 Nữ)
                </span>
              </div>
              <h2 className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                THEO DÕI VÀ ĐIỂM DANH CỦA GIÁO VIÊN TRỰC PHÒNG
              </h2>
            </div>
          </div>
          <p className="text-xs text-emerald-100/90 pl-1">
            Giáo viên trực phòng theo dõi sĩ số, thực hiện điểm danh từng học sinh tại các phòng ở, báo suất ăn cuối tuần, ghi sổ nhật ký ca trực và bàn giao tình hình nề nếp.
          </p>
        </div>

        {/* Duty Teacher Credentials Badge */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto shrink-0">
          <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-xl px-3.5 py-2 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-white">
                {authorizedInfo?.name || currentUser?.displayName || 'Giáo viên trực phòng'}
              </span>
            </div>
            <div className="text-[11px] text-emerald-200/80 mt-0.5">
              Phòng phụ trách: {authorizedInfo?.assignedRooms?.includes('ALL') ? 'Tất cả 25 phòng' : authorizedInfo?.assignedRooms?.join(', ') || 'Chưa chỉ định'}
            </div>
          </div>

          <button
            onClick={() => {
              setShareTargetRoom(selectedRoom);
              setIsShareModalOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow transition border border-emerald-400 cursor-pointer"
            title="Chia sẻ link trực tiếp và mã QR điểm danh của phòng này để đồng bộ lên máy chủ"
          >
            <Share2 className="w-4 h-4 text-amber-300" />
            <span>Chia sẻ điểm danh phòng</span>
          </button>

          <button
            onClick={handleCopyZaloSummary}
            className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow transition border border-blue-400 cursor-pointer"
            title="Sao chép báo cáo ngắn gọn ca trực để dán vào nhóm Zalo"
          >
            {copiedZalo ? <CheckCheck className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            <span>{copiedZalo ? 'Đã sao chép!' : 'Gửi Zalo ca trực'}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5 text-xs">
        <div 
          onClick={() => setSelectedStatusFilter('all')}
          className={`bg-white p-3 rounded-xl border cursor-pointer transition shadow-xs ${
            selectedStatusFilter === 'all' ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/30' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-slate-500 font-medium text-[11px]">Tổng học sinh</div>
          <div className="text-lg font-bold text-slate-800">{stats.total}</div>
          <div className="text-[10px] text-slate-400">Đang hiển thị</div>
        </div>

        <div 
          onClick={() => setSelectedStatusFilter('present')}
          className={`bg-white p-3 rounded-xl border cursor-pointer transition shadow-xs ${
            selectedStatusFilter === 'present' ? 'border-emerald-600 ring-2 ring-emerald-600/20 bg-emerald-50/40' : 'border-emerald-200 hover:border-emerald-300'
          }`}
        >
          <div className="text-emerald-700 font-semibold text-[11px] flex items-center gap-1">
            <span>✓ Có mặt</span>
          </div>
          <div className="text-lg font-bold text-emerald-700">{stats.present}</div>
          <div className="text-[10px] text-emerald-600 font-medium">Tỷ lệ: {stats.attendanceRate}%</div>
        </div>

        <div 
          onClick={() => setSelectedStatusFilter('skipped_class')}
          className={`bg-white p-3 rounded-xl border cursor-pointer transition shadow-xs ${
            selectedStatusFilter === 'skipped_class' ? 'border-orange-500 ring-2 ring-orange-500/20 bg-orange-50/40' : 'border-orange-200 hover:border-orange-300'
          }`}
        >
          <div className="text-orange-800 font-semibold text-[11px]">🚫 HS Bỏ tiết</div>
          <div className="text-lg font-bold text-orange-700">{stats.skippedClass}</div>
          <div className="text-[10px] text-orange-600">Bỏ tiết trên lớp</div>
        </div>

        <div 
          onClick={() => setSelectedStatusFilter('ate_no_class')}
          className={`bg-white p-3 rounded-xl border cursor-pointer transition shadow-xs ${
            selectedStatusFilter === 'ate_no_class' ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/40' : 'border-amber-200 hover:border-amber-300'
          }`}
        >
          <div className="text-amber-800 font-semibold text-[11px]">⚠️ Ăn không học</div>
          <div className="text-lg font-bold text-amber-700">{stats.ateNoClass}</div>
          <div className="text-[10px] text-amber-600">Tại bếp nội trú</div>
        </div>

        <div 
          onClick={() => setSelectedStatusFilter('not_at_school_this_week')}
          className={`bg-white p-3 rounded-xl border cursor-pointer transition shadow-xs ${
            selectedStatusFilter === 'not_at_school_this_week' ? 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/40' : 'border-purple-200 hover:border-purple-300'
          }`}
        >
          <div className="text-purple-800 font-semibold text-[11px]">🏔️ Chưa lên tuần</div>
          <div className="text-lg font-bold text-purple-700">{stats.notAtSchoolThisWeek}</div>
          <div className="text-[10px] text-purple-600">Ở thôn / nóc</div>
        </div>

        <div 
          onClick={() => setSelectedStatusFilter('leave_excused')}
          className={`bg-white p-3 rounded-xl border cursor-pointer transition shadow-xs ${
            selectedStatusFilter === 'leave_excused' ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/40' : 'border-blue-200 hover:border-blue-300'
          }`}
        >
          <div className="text-blue-800 font-semibold text-[11px]">📝 Nghỉ có phép</div>
          <div className="text-lg font-bold text-blue-700">{stats.leaveExcused}</div>
          <div className="text-[10px] text-blue-600">Ốm / xin phép</div>
        </div>

        <div 
          onClick={() => setSelectedStatusFilter('leave_unexcused')}
          className={`bg-white p-3 rounded-xl border cursor-pointer transition shadow-xs ${
            selectedStatusFilter === 'leave_unexcused' ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/40' : 'border-rose-200 hover:border-rose-300'
          }`}
        >
          <div className="text-rose-800 font-semibold text-[11px]">✕ Nghỉ không phép</div>
          <div className="text-lg font-bold text-rose-700">{stats.leaveUnexcused}</div>
          <div className="text-[10px] text-rose-600">Trốn học / tự ý</div>
        </div>

        <div 
          onClick={() => setSelectedStatusFilter('stay_weekend')}
          className={`bg-white p-3 rounded-xl border cursor-pointer transition shadow-xs ${
            selectedStatusFilter === 'stay_weekend' ? 'border-teal-500 ring-2 ring-teal-500/20 bg-teal-50/40' : 'border-teal-200 hover:border-teal-300'
          }`}
        >
          <div className="text-teal-800 font-bold text-[11px] flex items-center gap-1">
            <UtensilsCrossed className="w-3 h-3 text-teal-600" />
            <span>Báo ăn cuối tuần</span>
          </div>
          <div className="text-lg font-bold text-teal-700">{stats.stayWeekend}</div>
          <div className="text-[10px] text-teal-600 font-medium">Ở lại T7 - CN</div>
        </div>
      </div>

      {/* Zone Switcher (Tất cả 25 phòng / Phòng tôi phụ trách / Khu Nam 12 phòng / Khu Nữ 13 phòng) */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-emerald-700" />
            <span className="font-bold text-xs uppercase text-slate-800 tracking-wide">
              Chọn khu vực & 25 phòng ở (12 Phòng Nam 01–12, 13 Phòng Nữ 13–25)
            </span>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => {
                setSelectedGenderZone('all');
                setSelectedRoom('ALL');
              }}
              className={`px-3 py-1 rounded-lg transition ${
                selectedGenderZone === 'all'
                  ? 'bg-white text-emerald-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả 25 phòng
            </button>
            <button
              onClick={() => {
                setSelectedGenderZone('assigned');
                if (assignedRoomsList.length > 0) setSelectedRoom(assignedRoomsList[0]);
              }}
              className={`px-3 py-1 rounded-lg transition ${
                selectedGenderZone === 'assigned'
                  ? 'bg-emerald-700 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Phòng tôi phụ trách
            </button>
            <button
              onClick={() => {
                setSelectedGenderZone('nam');
                setSelectedRoom('ALL');
              }}
              className={`px-3 py-1 rounded-lg transition ${
                selectedGenderZone === 'nam'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Khu Nam (12 Phòng)
            </button>
            <button
              onClick={() => {
                setSelectedGenderZone('nu');
                setSelectedRoom('ALL');
              }}
              className={`px-3 py-1 rounded-lg transition ${
                selectedGenderZone === 'nu'
                  ? 'bg-rose-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Khu Nữ (13 Phòng)
            </button>
          </div>
        </div>

        {/* Quick Room Ribbon Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 text-xs">
          <button
            onClick={() => setSelectedRoom('ALL')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition border ${
              selectedRoom === 'ALL'
                ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            Tất cả phòng ({visibleRoomsList.length})
          </button>
          {visibleRoomsList.map((r) => {
            const isSelected = selectedRoom === r;
            const isMale = r.toLowerCase().includes('nam');
            const roomStudents = students.filter((s) => s.room === r && s.status === 'active');
            const presentInRoom = roomStudents.filter((s) => (draftAttendance[s.id]?.status || 'present') === 'present').length;
            const weekendInRoom = roomStudents.filter((s) => Boolean(draftAttendance[s.id]?.stayWeekend)).length;

            return (
              <button
                key={r}
                onClick={() => setSelectedRoom(r)}
                className={`px-2.5 py-1.5 rounded-xl font-medium whitespace-nowrap transition border flex items-center gap-1.5 ${
                  isSelected
                    ? isMale
                      ? 'bg-blue-700 text-white border-blue-700 shadow-sm font-bold'
                      : 'bg-rose-700 text-white border-rose-700 shadow-sm font-bold'
                    : isMale
                    ? 'bg-blue-50/70 hover:bg-blue-100 text-blue-900 border-blue-200'
                    : 'bg-rose-50/70 hover:bg-rose-100 text-rose-900 border-rose-200'
                }`}
              >
                <span>{r}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-white text-slate-700 border border-slate-200'
                  }`}
                  title={`${presentInRoom}/${roomStudents.length} có mặt • ${weekendInRoom} ở lại cuối tuần`}
                >
                  {presentInRoom}/{roomStudents.length}
                </span>
                {weekendInRoom > 0 && (
                  <span className={`text-[10px] px-1 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-amber-400 text-slate-900' : 'bg-teal-600 text-white'
                  }`} title={`${weekendInRoom} em báo ăn cuối tuần`}>
                    🍱{weekendInRoom}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Toolbar (Lớp, Thôn, Nóc, Tìm kiếm) */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Room Dropdown Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <Home className="w-3.5 h-3.5 text-emerald-700" />
              <span>Phòng ở ({rooms.length})</span>
            </label>
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Tất cả các phòng ({rooms.length})</option>
              <optgroup label="Khu Nam (Phòng 01 - 12)">
                {maleRooms.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </optgroup>
              <optgroup label="Khu Nữ (Phòng 13 - 25)">
                {femaleRooms.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Class Dropdown Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-emerald-700" />
              <span>Lớp học</span>
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Tất cả các lớp</option>
              {classes.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Village Dropdown Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-700" />
              <span>Thôn cư trú</span>
            </label>
            <select
              value={selectedVillage}
              onChange={(e) => setSelectedVillage(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Tất cả các thôn</option>
              {villages.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Hamlet Dropdown Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-700" />
              <span>Nóc cư trú</span>
            </label>
            <select
              value={selectedHamlet}
              onChange={(e) => setSelectedHamlet(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Tất cả các nóc</option>
              {hamlets.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-emerald-700" />
              <span>Tìm kiếm học sinh</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Họ tên, giường, nóc..."
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl pl-3 pr-7 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Room Duty Log & Handover Notes (Sổ Nhật ký ca trực phòng) */}
        {selectedRoom !== 'ALL' && (
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <MessageSquare className="w-4 h-4 text-amber-700" />
                <span>Sổ nhật ký ca trực & Bàn giao {selectedRoom}</span>
              </div>
              <span className="text-[10px] text-amber-800">
                Ghi chú nề nếp, vệ sinh, kiểm tra điện thoại, giường chiếu, bàn giao ca...
              </span>
            </div>
            <textarea
              value={roomDutyNote}
              onChange={(e) => setRoomDutyNote(e.target.value)}
              placeholder="Nhập ghi chú tình hình ca trực phòng (ví dụ: Vệ sinh phòng sạch sẽ, các em trật tự đúng giờ, giường 03 bóng đèn hỏng cần thay, dặn dò ca trực sau...)"
              className="w-full text-xs bg-white border border-amber-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 placeholder-slate-400"
              rows={2}
            />
          </div>
        )}

        {/* Bulk Action Buttons & Notifications */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 border-t border-slate-100">
          <div className="flex items-center flex-wrap gap-2 text-xs">
            <span className="text-slate-500 font-medium">Thao tác nhanh:</span>
            <button
              onClick={handleMarkAllPresent}
              className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded-lg transition"
            >
              ✓ Đánh dấu cả phòng có mặt
            </button>
            <button
              onClick={handleMarkAllStayWeekend}
              className="px-3 py-1.5 bg-teal-100 hover:bg-teal-200 text-teal-800 font-bold rounded-lg transition flex items-center gap-1"
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>Báo ăn cuối tuần tất cả</span>
            </button>
            <button
              onClick={handleClearAllStayWeekend}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition"
            >
              Hủy báo ăn cuối tuần
            </button>
            {(selectedRoom !== 'ALL' || selectedClass !== 'ALL' || selectedStatusFilter !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedRoom('ALL');
                  setSelectedClass('ALL');
                  setSelectedVillage('ALL');
                  setSelectedHamlet('ALL');
                  setSelectedStatusFilter('all');
                  setSearchQuery('');
                  setSelectedGenderZone('all');
                }}
                className="px-2.5 py-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Đặt lại bộ lọc</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {saveSuccessMessage && (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 animate-fade-in">
                {saveSuccessMessage}
              </span>
            )}
            <button
              onClick={handleSaveAttendance}
              disabled={isSaving}
              className="flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu điểm danh ca trực'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Student List Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1 text-xs text-slate-600">
          <span className="font-bold">
            DANH SÁCH HỌC SINH ({filteredStudents.length} em)
            {selectedRoom !== 'ALL' && ` • ${selectedRoom}`}
          </span>
          <span className="text-slate-500 italic">
            * Mỗi em học sinh có ô ghi chú riêng bên cạnh nút báo ăn cuối tuần
          </span>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center text-slate-500 border border-slate-200 space-y-2">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="font-semibold text-slate-700">Không tìm thấy học sinh nào</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Không có học sinh phù hợp với bộ lọc phòng ở, lớp học hoặc từ khóa tìm kiếm. Vui lòng chọn lại tiêu chí tìm kiếm.
            </p>
          </div>
        ) : (
          filteredStudents.map((student, index) => {
            const record = draftAttendance[student.id];
            const currentStatus: AttendanceStatus = record?.status || 'present';
            const note = record?.note || '';
            const isMale = student.gender === 'Nam';

            return (
              <div
                key={student.id}
                className={`bg-white rounded-2xl p-3.5 border transition-all duration-150 shadow-xs ${
                  record?.stayWeekend
                    ? 'border-teal-300 ring-1 ring-teal-300/40 bg-teal-50/20'
                    : currentStatus === 'present'
                    ? 'border-slate-200 hover:border-emerald-300'
                    : currentStatus === 'skipped_class'
                    ? 'border-orange-300 bg-orange-50/20 ring-1 ring-orange-300'
                    : currentStatus === 'leave_unexcused'
                    ? 'border-rose-300 bg-rose-50/20'
                    : currentStatus === 'leave_excused'
                    ? 'border-blue-300 bg-blue-50/20'
                    : currentStatus === 'ate_no_class'
                    ? 'border-amber-300 bg-amber-50/20'
                    : 'border-purple-300 bg-purple-50/20'
                }`}
              >
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                  {/* Student Info Column */}
                  <div className="flex items-start gap-3 min-w-[280px]">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-inner ${
                        isMale ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm hover:text-emerald-800 transition">
                          {student.name}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${
                            isMale ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {student.gender}
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium border border-slate-200">
                          Lớp {student.class}
                        </span>
                        <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md font-semibold border border-emerald-200 flex items-center gap-1">
                          <Home className="w-3 h-3 text-emerald-600" />
                          <span>{student.room}</span>
                        </span>
                        {student.bedNumber && (
                          <span className="text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md font-medium border border-amber-200">
                            🛏️ {student.bedNumber}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap pt-0.5">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>Thôn: {student.village}</span>
                          {student.hamlet && <span className="text-slate-600 font-medium">({student.hamlet})</span>}
                        </span>

                        {student.parentPhone && (
                          <>
                            <span>•</span>
                            <a
                              href={`tel:${student.parentPhone}`}
                              className="text-xs text-emerald-700 hover:underline flex items-center gap-1 font-medium"
                              title="Gọi phụ huynh học sinh"
                            >
                              <Phone className="w-3 h-3 text-emerald-600" />
                              <span>{student.parentPhone}</span>
                            </a>
                          </>
                        )}

                        {student.notes && (
                          <>
                            <span>•</span>
                            <span className="text-[11px] text-slate-600 italic bg-amber-50 border border-amber-200/80 px-1.5 py-0.2 rounded" title={`Ghi chú hồ sơ: ${student.notes}`}>
                              Hồ sơ: {student.notes}
                            </span>
                          </>
                        )}

                        {record?.recordedByName && (
                          <span className="text-[10px] text-slate-400 italic">
                            (Ghi nhận bởi: {record.recordedByName})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Attendance Status Buttons + Weekend Meal + Student Note Input */}
                  <div className="flex items-center flex-wrap gap-1.5 self-stretch lg:self-center">
                    {/* Status 1: Có mặt */}
                    <button
                      type="button"
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
                      type="button"
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
                      type="button"
                      onClick={() => handleStatusChange(student, 'ate_no_class')}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer shrink-0 ${
                        currentStatus === 'ate_no_class'
                          ? 'bg-amber-500 text-white font-bold shadow-sm ring-2 ring-amber-500/40'
                          : 'bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900'
                      }`}
                      title="Học sinh có mặt ăn cơm tại bếp nội trú nhưng trốn/bỏ tiết không lên lớp"
                    >
                      ⚠️ Ăn không học
                    </button>

                    {/* Status 3: Chưa lên trường tuần này */}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(student, 'not_at_school_this_week')}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer shrink-0 ${
                        currentStatus === 'not_at_school_this_week'
                          ? 'bg-purple-600 text-white font-bold shadow-sm ring-2 ring-purple-600/40'
                          : 'bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-800'
                      }`}
                      title="Chưa ra trường trong tuần (còn ở tại thôn/nóc)"
                    >
                      🏔️ Chưa lên tuần
                    </button>

                    {/* Status 4: Nghỉ có phép */}
                    <button
                      type="button"
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
                      type="button"
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
                      type="button"
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

                    {/* Ô Ghi Chú Bên Cạnh Báo Ăn Cuối Tuần (Theo yêu cầu cho tất cả học sinh các phòng) */}
                    <div className="relative min-w-[200px] sm:min-w-[240px] md:w-60 lg:w-72 flex-1">
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => handleNoteChange(student, e.target.value)}
                        placeholder="Ghi chú báo ăn / lý do..."
                        title={`Ghi chú ca trực phòng cho học sinh ${student.name} (báo ăn cuối tuần, lý do...)`}
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

      {/* Floating Save Button */}
      <div className="fixed bottom-5 right-5 z-30">
        <button
          onClick={handleSaveAttendance}
          disabled={isSaving}
          className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm px-5 py-3 rounded-full shadow-2xl transition transform hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <FileCheck2 className="w-5 h-5" />
          <span>{isSaving ? 'Đang lưu...' : 'Lưu Điểm Danh Trực Phòng'}</span>
        </button>
      </div>

      {/* Share Room Attendance Modal */}
      <ShareRoomAttendanceModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        room={shareTargetRoom}
        currentDate={currentDate}
        tabType="room_duty"
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
