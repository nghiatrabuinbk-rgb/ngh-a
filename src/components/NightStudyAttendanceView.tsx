import React, { useState, useMemo, useEffect } from 'react';
import { 
  Moon, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Save, 
  Download, 
  Printer, 
  Building2, 
  Users, 
  Check, 
  Clock, 
  MessageSquare, 
  Sparkles, 
  HelpCircle, 
  Bed, 
  BedDouble,
  Search,
  Filter,
  Calendar,
  Layers,
  Phone
} from 'lucide-react';
import { 
  Student, 
  NightStudyRecord, 
  NightRoomSummary, 
  NightStudyStatus, 
  NIGHT_STUDY_CONFIG, 
  AuthorizedUser,
  NightAggregatedStats
} from '../types';
import { exportNightStudyToExcel, NightRoomStatsRow } from '../utils/exportNightReport';

interface NightStudyAttendanceViewProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  students: Student[];
  rooms: string[];
  currentUser: { email?: string | null; displayName?: string | null } | null;
  authorizedInfo?: AuthorizedUser | null;
  isAdmin: boolean;
  nightAttendanceMap: Record<string, NightStudyRecord>;
  nightRoomSummaries: Record<string, NightRoomSummary>;
  onSaveNightAttendance: (records: NightStudyRecord[], summary?: NightRoomSummary) => Promise<void>;
}

export const NightStudyAttendanceView: React.FC<NightStudyAttendanceViewProps> = ({
  currentDate,
  onDateChange,
  students,
  rooms,
  currentUser,
  authorizedInfo,
  isAdmin,
  nightAttendanceMap,
  nightRoomSummaries,
  onSaveNightAttendance,
}) => {
  // Navigation inside Night Study: Room Attendance vs Overall School Night Report
  const [nightSubView, setNightSubView] = useState<'attendance' | 'report'>('attendance');

  // Selected Room for Attendance
  const defaultRoom = rooms[0] || 'Phòng Nam 01';
  const [selectedRoom, setSelectedRoom] = useState<string>(defaultRoom);

  // Local state for records in the current room
  const [roomRecords, setRoomRecords] = useState<Record<string, { status: NightStudyStatus; note: string }>>({});
  const [dutyNote, setDutyNote] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Search & filter for attendance list
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | NightStudyStatus>('ALL');

  // Date selection for export
  const [customExportDate, setCustomExportDate] = useState<string>(currentDate);

  // Filter students belonging to active status
  const activeStudents = useMemo(() => {
    return students.filter((s) => s.status === 'active');
  }, [students]);

  // Students in selected room
  const roomStudents = useMemo(() => {
    if (selectedRoom === 'ALL') return activeStudents;
    return activeStudents.filter((s) => s.room === selectedRoom);
  }, [activeStudents, selectedRoom]);

  // Split rooms into 12 Male and 13 Female
  const maleRooms = useMemo(() => rooms.filter((r) => r.toLowerCase().includes('nam')), [rooms]);
  const femaleRooms = useMemo(() => rooms.filter((r) => r.toLowerCase().includes('nữ')), [rooms]);
  const otherRooms = useMemo(
    () => rooms.filter((r) => !r.toLowerCase().includes('nam') && !r.toLowerCase().includes('nữ')),
    [rooms]
  );

  // Sync room records when room or attendanceMap changes
  useEffect(() => {
    const initial: Record<string, { status: NightStudyStatus; note: string }> = {};
    roomStudents.forEach((s) => {
      const rec = nightAttendanceMap[s.id];
      initial[s.id] = {
        status: rec?.status || 'present_night',
        note: rec?.note || '',
      };
    });
    setRoomRecords(initial);

    // Set duty note from existing summary
    const summary = nightRoomSummaries[selectedRoom];
    setDutyNote(summary?.notes || '');
    setSaveSuccess(false);
  }, [selectedRoom, nightAttendanceMap, nightRoomSummaries, roomStudents]);

  // Change single student status
  const handleStatusChange = (studentId: string, status: NightStudyStatus) => {
    setRoomRecords((prev) => ({
      ...prev,
      [studentId]: {
        status,
        note: prev[studentId]?.note || '',
      },
    }));
  };

  // Change single student note
  const handleNoteChange = (studentId: string, note: string) => {
    setRoomRecords((prev) => ({
      ...prev,
      [studentId]: {
        status: prev[studentId]?.status || 'present_night',
        note,
      },
    }));
  };

  // Bulk mark all room students as present for night study
  const handleMarkAllPresent = () => {
    const updated: Record<string, { status: NightStudyStatus; note: string }> = {};
    roomStudents.forEach((s) => {
      updated[s.id] = {
        status: 'present_night',
        note: roomRecords[s.id]?.note || '',
      };
    });
    setRoomRecords(updated);
  };

  // Save room attendance
  const handleSaveAttendance = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const recordsToSave: NightStudyRecord[] = roomStudents.map((s) => {
        const item = roomRecords[s.id] || { status: 'present_night', note: '' };
        return {
          id: `${currentDate}_${s.id}`,
          date: currentDate,
          studentId: s.id,
          studentName: s.name,
          room: s.room,
          bedNumber: s.bedNumber || '',
          class: s.class,
          village: s.village,
          hamlet: s.hamlet,
          status: item.status,
          note: item.note,
          recordedByEmail: currentUser?.email || 'giaovientruc@gmail.com',
          recordedByName: authorizedInfo?.name || currentUser?.displayName || currentUser?.email || 'GV Trực Đêm',
          recordedAt: new Date().toISOString(),
        };
      });

      // Calculate room stats
      let pres = 0;
      let exc = 0;
      let unexc = 0;
      recordsToSave.forEach((r) => {
        if (r.status === 'present_night') pres++;
        else if (r.status === 'absent_excused_night') exc++;
        else if (r.status === 'absent_unexcused_night') unexc++;
      });

      const summary: NightRoomSummary = {
        id: `${currentDate}_${selectedRoom}`,
        date: currentDate,
        roomId: selectedRoom,
        teacherEmail: currentUser?.email || undefined,
        teacherName: authorizedInfo?.name || currentUser?.displayName || currentUser?.email || 'GV Trực Đêm',
        totalStudents: roomStudents.length,
        presentCount: pres,
        absentExcusedCount: exc,
        absentUnexcusedCount: unexc,
        notes: dutyNote,
        submitted: true,
        updatedAt: new Date().toISOString(),
      };

      await onSaveNightAttendance(recordsToSave, selectedRoom !== 'ALL' ? summary : undefined);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving night attendance:', err);
      alert('Có lỗi xảy ra khi lưu điểm danh tự học đêm');
    } finally {
      setIsSaving(false);
    }
  };

  // Current room statistics
  const currentRoomStats = useMemo(() => {
    let present = 0;
    let absentExcused = 0;
    let absentUnexcused = 0;

    roomStudents.forEach((s) => {
      const st = roomRecords[s.id]?.status || 'present_night';
      if (st === 'present_night') present++;
      else if (st === 'absent_excused_night') absentExcused++;
      else if (st === 'absent_unexcused_night') absentUnexcused++;
    });

    const total = roomStudents.length;
    const rate = total > 0 ? `${Math.round((present / total) * 100)}%` : '0%';

    return { total, present, absentExcused, absentUnexcused, rate };
  }, [roomStudents, roomRecords]);

  // Overall School Statistics for all 25 rooms
  const schoolNightStatsRows: NightRoomStatsRow[] = useMemo(() => {
    return rooms.map((room) => {
      const rStudents = activeStudents.filter((s) => s.room === room);
      let pres = 0;
      let exc = 0;
      let unexc = 0;

      rStudents.forEach((s) => {
        const rec = nightAttendanceMap[s.id];
        const st = rec?.status || 'present_night';
        if (st === 'present_night') pres++;
        else if (st === 'absent_excused_night') exc++;
        else if (st === 'absent_unexcused_night') unexc++;
      });

      const total = rStudents.length;
      const rate = total > 0 ? `${Math.round((pres / total) * 100)}%` : '0%';
      const summary = nightRoomSummaries[room];
      const isMale = room.toLowerCase().includes('nam');

      return {
        room,
        genderGroup: isMale ? 'Phòng Nam' : 'Phòng Nữ',
        total,
        present: pres,
        absentExcused: exc,
        absentUnexcused: unexc,
        rate,
        submitted: Boolean(summary?.submitted),
        teacherName: summary?.teacherName,
        notes: summary?.notes || '',
      };
    });
  }, [rooms, activeStudents, nightAttendanceMap, nightRoomSummaries]);

  // Overall Totals
  const grandStats = useMemo(() => {
    let total = 0;
    let present = 0;
    let excused = 0;
    let unexcused = 0;
    let submitted = 0;

    schoolNightStatsRows.forEach((r) => {
      total += r.total;
      present += r.present;
      excused += r.absentExcused;
      unexcused += r.absentUnexcused;
      if (r.submitted) submitted++;
    });

    const rate = total > 0 ? `${Math.round((present / total) * 100)}%` : '0%';
    return { total, present, excused, unexcused, submitted, rate };
  }, [schoolNightStatsRows]);

  // Categorized items across whole school for export
  const schoolDetailedLists = useMemo(() => {
    const presentItems: (NightStudyRecord & { gender?: string; parentPhone?: string })[] = [];
    const excusedItems: (NightStudyRecord & { gender?: string; parentPhone?: string })[] = [];
    const unexcusedItems: (NightStudyRecord & { gender?: string; parentPhone?: string })[] = [];
    const allWithStatus: (Student & { nightStatus: NightStudyStatus; nightNote?: string; recordedByName?: string })[] = [];

    activeStudents.forEach((s) => {
      const rec = nightAttendanceMap[s.id];
      const st = rec?.status || 'present_night';
      const item: NightStudyRecord & { gender?: string; parentPhone?: string } = {
        id: `${currentDate}_${s.id}`,
        date: currentDate,
        studentId: s.id,
        studentName: s.name,
        room: s.room,
        bedNumber: s.bedNumber || '',
        class: s.class,
        village: s.village,
        hamlet: s.hamlet,
        status: st,
        note: rec?.note || '',
        recordedByName: rec?.recordedByName,
        recordedByEmail: rec?.recordedByEmail,
        gender: s.gender,
        parentPhone: s.parentPhone,
      };

      if (st === 'present_night') presentItems.push(item);
      else if (st === 'absent_excused_night') excusedItems.push(item);
      else if (st === 'absent_unexcused_night') unexcusedItems.push(item);

      allWithStatus.push({
        ...s,
        nightStatus: st,
        nightNote: rec?.note,
        recordedByName: rec?.recordedByName,
      });
    });

    return { presentItems, excusedItems, unexcusedItems, allWithStatus };
  }, [activeStudents, nightAttendanceMap, currentDate]);

  // Handle Export Excel
  const handleExportExcel = () => {
    exportNightStudyToExcel({
      dateLabel: customExportDate,
      schoolName: 'Trường PTDTBT THCS Trà Đốc - TP Đà Nẵng',
      reporterName: authorizedInfo?.name || currentUser?.displayName || currentUser?.email || 'Ban Quản Lý Trực Đêm',
      roomStatsRows: schoolNightStatsRows,
      presentItems: schoolDetailedLists.presentItems,
      absentExcusedItems: schoolDetailedLists.excusedItems,
      absentUnexcusedItems: schoolDetailedLists.unexcusedItems,
      allStudentsWithNightStatus: schoolDetailedLists.allWithStatus,
    });
  };

  // Filtered room students for table
  const filteredStudents = useMemo(() => {
    return roomStudents.filter((s) => {
      const item = roomRecords[s.id];
      const st = item?.status || 'present_night';

      // Status filter
      if (statusFilter !== 'ALL' && st !== statusFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = s.name.toLowerCase().includes(q);
        const matchClass = s.class.toLowerCase().includes(q);
        const matchBed = (s.bedNumber || '').toLowerCase().includes(q);
        const matchVillage = s.village.toLowerCase().includes(q);
        return matchName || matchClass || matchBed || matchVillage;
      }
      return true;
    });
  }, [roomStudents, roomRecords, statusFilter, searchQuery]);

  return (
    <div className="space-y-5">
      {/* Top Banner - Night Theme (Indigo & Midnight Slate) */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-indigo-900/60 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider bg-indigo-800 text-indigo-200 px-3 py-0.5 rounded-full border border-indigo-700/60 flex items-center gap-1.5 shadow-2xs">
                <Moon className="w-3.5 h-3.5 text-amber-300" />
                <span>Hoạt Động Tự Học Đêm • Quản Lý 25 Phòng Nội Trú</span>
              </span>
              <span className="text-xs text-indigo-300">
                12 Phòng Nam • 13 Phòng Nữ
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <span>ĐIỂM DANH & TỔNG HỢP GIÁO VIÊN TRỰC TỰ HỌC ĐÊM</span>
            </h2>
            <p className="text-xs sm:text-sm text-indigo-200/80 mt-1 max-w-2xl">
              Hệ thống độc lập theo dõi nề nếp tự học đêm tại 25 phòng nội trú. Giáo viên trực đêm ghi nhận sĩ số học đêm, học sinh vắng có phép, vắng không phép và xuất file Excel gửi BGH.
            </p>
          </div>

          {/* Quick Date and Export Controls */}
          <div className="flex items-center flex-wrap gap-2.5 w-full lg:w-auto">
            {/* Date Picker */}
            <div className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs text-white backdrop-blur-sm shadow-xs">
              <Calendar className="w-4 h-4 text-amber-300" />
              <span className="font-semibold text-indigo-200 hidden sm:inline">Ngày:</span>
              <input
                type="date"
                value={currentDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="bg-transparent text-white font-bold text-xs sm:text-sm focus:outline-none cursor-pointer"
              />
            </div>

            {/* Export Excel Button */}
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg transition transform active:scale-95 border border-emerald-400/40"
              title="Xuất file Excel tổng hợp tình hình tự học đêm của 25 phòng"
            >
              <Download className="w-4 h-4" />
              <span>Xuất Excel Tự Học Đêm</span>
            </button>
          </div>
        </div>

        {/* Night Duty Mode Navigation */}
        <div className="mt-5 pt-4 border-t border-indigo-900/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setNightSubView('attendance')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition ${
                nightSubView === 'attendance'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Điểm Danh Theo Phòng (25 phòng)</span>
            </button>

            <button
              onClick={() => setNightSubView('report')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition ${
                nightSubView === 'report'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Bảng Tổng Hợp Toàn Trường (25 Phòng)</span>
            </button>
          </div>

          <div className="text-[11px] text-indigo-300 flex items-center gap-2">
            <span>GV Trực đêm: <strong>{authorizedInfo?.name || currentUser?.displayName || currentUser?.email || 'Chưa đăng nhập'}</strong></span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* VIEW 1: ĐIỂM DANH THEO TỪNG PHÒNG Ở                       */}
      {/* ========================================================= */}
      {nightSubView === 'attendance' && (
        <div className="space-y-4">
          {/* Room Selector Pills (25 Rooms categorized: 12 Male, 13 Female) */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-700" />
                <span>Chọn phòng điểm danh đêm ({rooms.length} phòng):</span>
              </span>
              <span className="text-xs bg-indigo-50 text-indigo-900 font-bold px-2.5 py-0.5 rounded-full border border-indigo-200">
                Đang chọn: {selectedRoom} ({roomStudents.length} học sinh)
              </span>
            </div>

            {/* 12 Male Rooms */}
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-blue-900 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                <span>12 Phòng Nam:</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                {maleRooms.map((r) => {
                  const count = activeStudents.filter((s) => s.room === r).length;
                  const isDone = nightRoomSummaries[r]?.submitted;
                  return (
                    <button
                      key={r}
                      onClick={() => setSelectedRoom(r)}
                      className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap flex items-center gap-1 border ${
                        selectedRoom === r
                          ? 'bg-blue-700 text-white border-blue-800 shadow-sm'
                          : 'bg-blue-50 text-blue-900 hover:bg-blue-100 border-blue-200'
                      }`}
                    >
                      <span>{r.replace('Phòng ', '')}</span>
                      <span className="text-[10px] opacity-75">({count})</span>
                      {isDone && <Check className="w-3 h-3 text-emerald-400 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 13 Female Rooms */}
            <div className="space-y-1 pt-1 border-t border-slate-100">
              <div className="text-[11px] font-bold text-rose-900 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                <span>13 Phòng Nữ:</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                {femaleRooms.map((r) => {
                  const count = activeStudents.filter((s) => s.room === r).length;
                  const isDone = nightRoomSummaries[r]?.submitted;
                  return (
                    <button
                      key={r}
                      onClick={() => setSelectedRoom(r)}
                      className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap flex items-center gap-1 border ${
                        selectedRoom === r
                          ? 'bg-rose-700 text-white border-rose-800 shadow-sm'
                          : 'bg-rose-50 text-rose-900 hover:bg-rose-100 border-rose-200'
                      }`}
                    >
                      <span>{r.replace('Phòng ', '')}</span>
                      <span className="text-[10px] opacity-75">({count})</span>
                      {isDone && <Check className="w-3 h-3 text-emerald-400 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Other / Custom rooms if any */}
            {otherRooms.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pt-1 text-xs">
                {otherRooms.map((r) => (
                  <button
                    key={r}
                    onClick={() => setSelectedRoom(r)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                      selectedRoom === r ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Room KPI & Duty Teacher Log Card */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Moon className="w-4 h-4 text-indigo-700" />
                  <span>Sĩ Số Tự Học Đêm: {selectedRoom}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Điểm danh học sinh tại phòng, theo dõi giờ giấc và ghi chú tình trạng từng em.
                </p>
              </div>

              {/* Room Stats Pill Badges */}
              <div className="flex items-center flex-wrap gap-2 text-xs">
                <span className="bg-slate-100 text-slate-800 font-bold px-3 py-1.5 rounded-xl border border-slate-200">
                  Tổng: {currentRoomStats.total} HS
                </span>
                <span className="bg-emerald-100 text-emerald-900 font-bold px-3 py-1.5 rounded-xl border border-emerald-300">
                  Có mặt: {currentRoomStats.present}
                </span>
                <span className="bg-blue-100 text-blue-900 font-bold px-3 py-1.5 rounded-xl border border-blue-300">
                  Vắng phép: {currentRoomStats.absentExcused}
                </span>
                <span className="bg-rose-100 text-rose-900 font-bold px-3 py-1.5 rounded-xl border border-rose-300">
                  Ko phép: {currentRoomStats.absentUnexcused}
                </span>
                <span className="bg-indigo-100 text-indigo-900 font-extrabold px-3 py-1.5 rounded-xl border border-indigo-300 shadow-2xs">
                  Chuyên cần: {currentRoomStats.rate}
                </span>
              </div>
            </div>

            {/* Duty Teacher Log Textarea */}
            <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5 space-y-1.5">
              <label className="text-xs font-bold text-indigo-950 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-700" />
                  <span>Nhật ký & Nhận xét của Giáo viên trực đêm tại {selectedRoom}:</span>
                </span>
                <span className="text-[11px] text-indigo-600 font-normal">
                  (Trật tự, giờ giấc tắt đèn, vệ sinh, học sinh ốm...)
                </span>
              </label>
              <textarea
                value={dutyNote}
                onChange={(e) => setDutyNote(e.target.value)}
                rows={2}
                placeholder="Ghi chú về nề nếp tự học đêm, tình hình học sinh đau ốm tại phòng y tế, vệ sinh phòng ngủ..."
                className="w-full bg-white border border-indigo-300 text-slate-800 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Action Bar: Bulk Actions & Save Button */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleMarkAllPresent}
                  className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold px-3 py-2 rounded-xl transition"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Đánh dấu tất cả có mặt học đêm</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {saveSuccess && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-xl flex items-center gap-1 animate-fade-in">
                    <Check className="w-4 h-4" />
                    <span>Đã lưu & nộp báo cáo phòng!</span>
                  </span>
                )}

                <button
                  onClick={handleSaveAttendance}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs sm:text-sm px-4 py-2 rounded-xl shadow transition transform active:scale-95 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Đang lưu...' : 'Lưu Điểm Danh & Nộp Báo Cáo'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Student List in Room */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs sm:text-sm text-slate-800">
                  Danh sách học sinh {selectedRoom} ({filteredStudents.length}/{roomStudents.length})
                </span>
              </div>

              {/* Quick Search & Status Filter */}
              <div className="flex items-center gap-2 text-xs">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Tìm tên, giường, lớp..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium"
                >
                  <option value="ALL">-- Tất cả trạng thái --</option>
                  <option value="present_night">Có mặt học đêm</option>
                  <option value="absent_excused_night">Vắng có phép</option>
                  <option value="absent_unexcused_night">Vắng không phép</option>
                </select>
              </div>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs">
                <Bed className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p>Không có học sinh nào trong phòng này phù hợp bộ lọc.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredStudents.map((student, idx) => {
                  const record = roomRecords[student.id] || { status: 'present_night', note: '' };
                  const isPresent = record.status === 'present_night';
                  const isExcused = record.status === 'absent_excused_night';
                  const isUnexcused = record.status === 'absent_unexcused_night';

                  return (
                    <div
                      key={student.id}
                      className="p-3 sm:p-4 hover:bg-slate-50/80 transition flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      {/* Student info with Bed Number and Notes */}
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-900 font-extrabold flex items-center justify-center shrink-0 text-xs border border-indigo-200">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="font-bold text-sm text-slate-900">
                              {student.name}
                            </span>
                            <span className="text-[11px] font-bold bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full border border-blue-200">
                              Lớp {student.class}
                            </span>
                            {/* Bed Number Badge */}
                            <span className="text-[11px] font-extrabold bg-amber-100 text-amber-950 px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1 shadow-2xs">
                              <BedDouble className="w-3 h-3 text-amber-700" />
                              <span>{student.bedNumber || 'Chưa xếp giường'}</span>
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {student.village} {student.hamlet ? `• ${student.hamlet}` : ''}
                            </span>
                          </div>

                          {/* Student Permanent Note (from admin assignment) */}
                          {student.notes && (
                            <div className="text-[11px] text-slate-500 mt-1 italic flex items-center gap-1">
                              <span className="font-semibold text-slate-600">Ghi chú hồ sơ:</span>
                              <span>{student.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 3 Status Action Buttons + Ô Ghi Chú Bên Cạnh Ô Vắng Không Phép */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0 self-stretch md:self-center">
                        {/* Status 1: Có mặt học đêm */}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(student.id, 'present_night')}
                          className={`text-xs px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                            isPresent
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-400'
                              : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 border-slate-200'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Có mặt học đêm</span>
                        </button>

                        {/* Status 2: Vắng có phép */}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(student.id, 'absent_excused_night')}
                          className={`text-xs px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                            isExcused
                              ? 'bg-blue-600 text-white border-blue-700 shadow-sm ring-2 ring-blue-400'
                              : 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-800 border-slate-200'
                          }`}
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Vắng có phép</span>
                        </button>

                        {/* Status 3: Vắng không phép */}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(student.id, 'absent_unexcused_night')}
                          className={`text-xs px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                            isUnexcused
                              ? 'bg-rose-600 text-white border-rose-700 shadow-sm ring-2 ring-rose-400'
                              : 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-800 border-slate-200'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Vắng không phép</span>
                        </button>

                        {/* Ô Ghi Chú Bên Cạnh Ô Vắng Không Phép (Theo yêu cầu người dùng) */}
                        <div className="relative flex-1 min-w-[200px] sm:min-w-[260px] md:w-64 lg:w-72">
                          <input
                            type="text"
                            value={record.note}
                            onChange={(e) => handleNoteChange(student.id, e.target.value)}
                            placeholder="Ghi chú (lý do vắng, vi phạm...)"
                            title={`Ghi chú học đêm cho học sinh ${student.name}`}
                            className={`w-full text-xs px-3 py-2 rounded-xl border transition focus:outline-none focus:ring-2 ${
                              isUnexcused
                                ? 'border-rose-400 bg-rose-50/70 text-rose-950 placeholder-rose-400 focus:ring-rose-400 focus:border-rose-500 shadow-xs'
                                : isExcused
                                ? 'border-blue-400 bg-blue-50/70 text-blue-950 placeholder-blue-400 focus:ring-blue-400 focus:border-blue-500 shadow-xs'
                                : 'border-slate-300 bg-slate-50/70 text-slate-800 placeholder-slate-400 hover:bg-white focus:bg-white focus:ring-indigo-500 focus:border-indigo-500'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 2: BẢNG TỔNG HỢP 25 PHÒNG TỰ HỌC ĐÊM TOÀN TRƯỜNG     */}
      {/* ========================================================= */}
      {nightSubView === 'report' && (
        <div className="space-y-4">
          {/* Top Overall KPI Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500 font-bold">Tổng 25 Phòng</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{grandStats.total}</div>
              <div className="text-[11px] text-slate-400">12 Nam • 13 Nữ</div>
            </div>

            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-300 shadow-xs">
              <div className="text-xs text-emerald-800 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Có mặt học đêm
              </div>
              <div className="text-2xl font-black text-emerald-950 mt-0.5">{grandStats.present}</div>
              <div className="text-[11px] text-emerald-700">Tỷ lệ: {grandStats.rate}</div>
            </div>

            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-300 shadow-xs">
              <div className="text-xs text-blue-800 font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-blue-600" />
                Vắng có phép
              </div>
              <div className="text-2xl font-black text-blue-950 mt-0.5">{grandStats.excused}</div>
              <div className="text-[11px] text-blue-700">Ốm / có giấy phép</div>
            </div>

            <div className="bg-rose-50 p-4 rounded-2xl border border-rose-300 shadow-xs">
              <div className="text-xs text-rose-800 font-bold flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                Vắng không phép
              </div>
              <div className="text-2xl font-black text-rose-950 mt-0.5">{grandStats.unexcused}</div>
              <div className="text-[11px] text-rose-700">Cần đôn đốc ngay</div>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-indigo-50 p-4 rounded-2xl border border-indigo-300 shadow-xs">
              <div className="text-xs text-indigo-900 font-bold">Phòng đã báo cáo</div>
              <div className="text-2xl font-black text-indigo-950 mt-0.5">
                {grandStats.submitted}/{rooms.length}
              </div>
              <div className="text-[11px] text-indigo-700">Tự động đồng bộ</div>
            </div>
          </div>

          {/* Master 25 Rooms Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-700" />
                  <span>BẢNG TỔNG HỢP 25 PHÒNG NỘI TRÚ TỰ HỌC ĐÊM</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ngày {currentDate} • Phân định 12 Phòng Nam và 13 Phòng Nữ
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải Báo Cáo Excel (.xlsx)</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-3 text-center w-10">STT</th>
                    <th className="py-2.5 px-3">Phòng ở</th>
                    <th className="py-2.5 px-3 text-center">Khu vực</th>
                    <th className="py-2.5 px-3 text-center">Trạng thái</th>
                    <th className="py-2.5 px-3 text-center">Tổng HS</th>
                    <th className="py-2.5 px-3 text-center text-emerald-800 bg-emerald-50/50">Có mặt học đêm</th>
                    <th className="py-2.5 px-3 text-center text-blue-900 bg-blue-50/50">Vắng có phép</th>
                    <th className="py-2.5 px-3 text-center text-rose-900 bg-rose-50/60">Vắng không phép</th>
                    <th className="py-2.5 px-3 text-center">Tỷ lệ</th>
                    <th className="py-2.5 px-3">GV Trực đêm</th>
                    <th className="py-2.5 px-3 min-w-[160px]">Nhật ký / Ghi chú trực đêm</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {schoolNightStatsRows.map((r, idx) => (
                    <tr key={r.room} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        <button
                          onClick={() => {
                            setSelectedRoom(r.room);
                            setNightSubView('attendance');
                          }}
                          className="hover:text-indigo-700 hover:underline text-left cursor-pointer"
                        >
                          {r.room}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            r.genderGroup === 'Phòng Nam'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {r.genderGroup}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {r.submitted ? (
                          <span className="text-[11px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" />
                            Đã nộp
                          </span>
                        ) : (
                          <span className="text-[11px] bg-amber-50 text-amber-800 font-semibold px-2 py-0.5 rounded-full border border-amber-200">
                            Chưa nộp
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-800">{r.total}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-700 bg-emerald-50/30">
                        {r.present}
                      </td>
                      <td className="py-2.5 px-3 text-center font-medium text-blue-700 bg-blue-50/30">
                        {r.absentExcused > 0 ? r.absentExcused : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-rose-700 bg-rose-50/40">
                        {r.absentUnexcused > 0 ? (
                          <span className="bg-rose-100 text-rose-900 px-1.5 py-0.5 rounded font-extrabold">
                            {r.absentUnexcused}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-700">{r.rate}</td>
                      <td className="py-2.5 px-3 text-xs text-slate-600 font-medium">
                        {r.teacherName || <span className="text-slate-400">Chưa ghi</span>}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-slate-700 italic">
                        {r.notes || <span className="text-slate-300">Không có ghi chú</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-950">
                    <td className="py-3 px-3 text-center">#</td>
                    <td className="py-3 px-3 uppercase tracking-wider" colSpan={3}>
                      TỔNG TOÀN NỘI TRÚ (25 PHÒNG)
                    </td>
                    <td className="py-3 px-3 text-center text-base">{grandStats.total}</td>
                    <td className="py-3 px-3 text-center text-emerald-300 text-base">{grandStats.present}</td>
                    <td className="py-3 px-3 text-center text-blue-300 text-base">{grandStats.excused}</td>
                    <td className="py-3 px-3 text-center text-rose-300 text-base">{grandStats.unexcused}</td>
                    <td className="py-3 px-3 text-center text-yellow-300 text-base">{grandStats.rate}</td>
                    <td className="py-3 px-3 text-xs font-normal" colSpan={2}>
                      Đã báo cáo: {grandStats.submitted}/{rooms.length} phòng
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
