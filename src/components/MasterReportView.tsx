import React, { useState, useMemo, useEffect } from 'react';
import { 
  Download, 
  Printer, 
  Building2, 
  Users, 
  FileSpreadsheet, 
  AlertTriangle, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  Info, 
  Calendar, 
  Layers, 
  Home,
  BedDouble,
  UtensilsCrossed,
  Search,
  Filter,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  CheckCheck,
  Loader2,
  XCircle,
  HelpCircle,
  Ban
} from 'lucide-react';
import { 
  Student, 
  AttendanceRecord, 
  RoomSummary, 
  STATUS_CONFIG, 
  AttendanceStatus 
} from '../types';
import { 
  exportPeriodicReportToExcel, 
  exportSingleListToExcel,
  DetailedReportItem, 
  RoomStatsRow 
} from '../utils/exportReport';
import { fetchAttendanceForDateRange } from '../services/dataService';

interface MasterReportViewProps {
  currentDate: string;
  students: Student[];
  attendanceMap: Record<string, AttendanceRecord>;
  rooms: string[];
  classes: string[];
  villages: string[];
  hamlets: string[];
  roomSummaries: Record<string, RoomSummary>;
  reporterName: string;
}

type PeriodType = 'day' | 'week' | 'month';
type ListCategory = 'all' | 'present' | 'skipped_class' | 'ate_no_class' | 'leave_excused' | 'leave_unexcused' | 'stay_weekend';

// Helper: Calculate week start (Monday) and end (Sunday)
function getWeekRange(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0 is Sun, 1 is Mon
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const pad = (n: number) => String(n).padStart(2, '0');
  const toISO = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

  return {
    start: toISO(monday),
    end: toISO(sunday),
    label: `Tuần từ ${pad(monday.getDate())}/${pad(monday.getMonth() + 1)} đến ${pad(sunday.getDate())}/${pad(sunday.getMonth() + 1)}/${sunday.getFullYear()}`,
  };
}

// Helper: Calculate month start and end
function getMonthRange(monthStr: string) {
  const [yStr, mStr] = monthStr.split('-');
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  const pad = (n: number) => String(n).padStart(2, '0');
  const start = `${y}-${pad(m)}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${y}-${pad(m)}-${pad(lastDay)}`;
  return {
    start,
    end,
    label: `Tháng ${pad(m)}/${y}`,
  };
}

export const MasterReportView: React.FC<MasterReportViewProps> = ({
  currentDate,
  students,
  attendanceMap,
  rooms,
  classes,
  villages,
  hamlets,
  roomSummaries,
  reporterName,
}) => {
  // Main Sub-tabs
  const [activeReportSubTab, setActiveReportSubTab] = useState<'periodic_reports' | 'all_rooms' | 'single_room' | 'demographics' | 'abnormal'>('periodic_reports');
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('ALL');

  // Periodic Reporting State
  const [periodType, setPeriodType] = useState<PeriodType>('day');
  const [selectedDayDate, setSelectedDayDate] = useState<string>(currentDate);
  const [selectedWeekDate, setSelectedWeekDate] = useState<string>(currentDate);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentDate.slice(0, 7));

  // Category filter in periodic report
  const [selectedCategory, setSelectedCategory] = useState<ListCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterClass, setFilterClass] = useState<string>('ALL');
  const [filterRoom, setFilterRoom] = useState<string>('ALL');
  const [filterVillage, setFilterVillage] = useState<string>('ALL');

  // Loaded multi-day records for week/month
  const [periodicRecords, setPeriodicRecords] = useState<AttendanceRecord[]>([]);
  const [isLoadingPeriod, setIsLoadingPeriod] = useState<boolean>(false);

  // Quick Map of students by id
  const studentMap = useMemo(() => {
    const map = new Map<string, Student>();
    students.forEach((s) => map.set(s.id, s));
    return map;
  }, [students]);

  // Current Period Info (startDate, endDate, label)
  const currentPeriodInfo = useMemo(() => {
    if (periodType === 'day') {
      const parts = selectedDayDate.split('-');
      const label = parts.length === 3 ? `Ngày ${parts[2]}/${parts[1]}/${parts[0]}` : `Ngày ${selectedDayDate}`;
      return {
        start: selectedDayDate,
        end: selectedDayDate,
        label,
      };
    } else if (periodType === 'week') {
      return getWeekRange(selectedWeekDate);
    } else {
      return getMonthRange(selectedMonth);
    }
  }, [periodType, selectedDayDate, selectedWeekDate, selectedMonth]);

  // Fetch records when period changes (week or month, or past day)
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      if (periodType === 'day' && selectedDayDate === currentDate) {
        // Current day uses direct attendanceMap
        setPeriodicRecords([]);
        return;
      }

      setIsLoadingPeriod(true);
      try {
        const records = await fetchAttendanceForDateRange(
          currentPeriodInfo.start,
          currentPeriodInfo.end
        );
        if (!isCancelled) {
          setPeriodicRecords(records);
        }
      } catch (err) {
        console.warn('Failed to load periodic records:', err);
      } finally {
        if (!isCancelled) {
          setIsLoadingPeriod(false);
        }
      }
    }

    loadData();
    return () => {
      isCancelled = true;
    };
  }, [periodType, selectedDayDate, selectedWeekDate, selectedMonth, currentDate, currentPeriodInfo]);

  // Build unified detailed report items for the active period
  const periodicDetailedItems: DetailedReportItem[] = useMemo(() => {
    // If Day mode and viewing today
    if (periodType === 'day' && selectedDayDate === currentDate) {
      return students
        .filter((s) => s.status === 'active')
        .map((s) => {
          const rec = attendanceMap[s.id];
          const st = rec?.status || 'present';
          return {
            studentId: s.id,
            studentName: s.name,
            class: s.class,
            room: s.room,
            village: s.village,
            hamlet: s.hamlet,
            date: currentDate,
            status: st,
            statusLabel: STATUS_CONFIG[st]?.label || st,
            stayWeekend: Boolean(rec?.stayWeekend),
            note: rec?.note || '',
            parentPhone: s.parentPhone,
            gender: s.gender,
            recordedByName: rec?.recordedByName,
            recordedByEmail: rec?.recordedByEmail,
          };
        });
    }

    // If Day mode for another day
    if (periodType === 'day') {
      const dayRecordsMap = new Map<string, AttendanceRecord>();
      periodicRecords.forEach((r) => dayRecordsMap.set(r.studentId, r));

      return students
        .filter((s) => s.status === 'active')
        .map((s) => {
          const rec = dayRecordsMap.get(s.id);
          const st = rec?.status || 'present';
          return {
            studentId: s.id,
            studentName: s.name,
            class: s.class,
            room: s.room,
            village: s.village,
            hamlet: s.hamlet,
            date: selectedDayDate,
            status: st,
            statusLabel: STATUS_CONFIG[st]?.label || st,
            stayWeekend: Boolean(rec?.stayWeekend),
            note: rec?.note || '',
            parentPhone: s.parentPhone,
            gender: s.gender,
            recordedByName: rec?.recordedByName,
            recordedByEmail: rec?.recordedByEmail,
          };
        });
    }

    // Week or Month: include all records logged during this period
    if (periodicRecords.length > 0) {
      return periodicRecords.map((r) => {
        const student = studentMap.get(r.studentId);
        const st = r.status || 'present';
        return {
          studentId: r.studentId,
          studentName: student?.name || r.studentName || 'Học sinh',
          class: student?.class || r.class || '',
          room: student?.room || r.room || '',
          village: student?.village || r.village || '',
          hamlet: student?.hamlet || r.hamlet || '',
          date: r.date,
          status: st,
          statusLabel: STATUS_CONFIG[st]?.label || st,
          stayWeekend: Boolean(r.stayWeekend),
          note: r.note || '',
          parentPhone: student?.parentPhone,
          gender: student?.gender,
          recordedByName: r.recordedByName,
          recordedByEmail: r.recordedByEmail,
        };
      });
    }

    // Fallback if no records found yet in this range: synthesize from active students for the date
    return students
      .filter((s) => s.status === 'active')
      .map((s) => {
        const rec = attendanceMap[s.id];
        const st = rec?.status || 'present';
        return {
          studentId: s.id,
          studentName: s.name,
          class: s.class,
          room: s.room,
          village: s.village,
          hamlet: s.hamlet,
          date: currentPeriodInfo.start,
          status: st,
          statusLabel: STATUS_CONFIG[st]?.label || st,
          stayWeekend: Boolean(rec?.stayWeekend),
          note: rec?.note || '',
          parentPhone: s.parentPhone,
          gender: s.gender,
          recordedByName: rec?.recordedByName,
          recordedByEmail: rec?.recordedByEmail,
        };
      });
  }, [
    periodType,
    selectedDayDate,
    currentDate,
    students,
    attendanceMap,
    periodicRecords,
    studentMap,
    currentPeriodInfo,
  ]);

  // Categorized Lists
  const presentList = useMemo(
    () => periodicDetailedItems.filter((i) => i.status === 'present'),
    [periodicDetailedItems]
  );
  const skippedClassList = useMemo(
    () => periodicDetailedItems.filter((i) => i.status === 'skipped_class'),
    [periodicDetailedItems]
  );
  const ateNoClassList = useMemo(
    () => periodicDetailedItems.filter((i) => i.status === 'ate_no_class'),
    [periodicDetailedItems]
  );
  const leaveExcusedList = useMemo(
    () => periodicDetailedItems.filter((i) => i.status === 'leave_excused'),
    [periodicDetailedItems]
  );
  const leaveUnexcusedList = useMemo(
    () => periodicDetailedItems.filter((i) => i.status === 'leave_unexcused'),
    [periodicDetailedItems]
  );
  const stayWeekendList = useMemo(
    () => periodicDetailedItems.filter((i) => Boolean(i.stayWeekend)),
    [periodicDetailedItems]
  );

  // Filtered Items for Display Table
  const displayItems = useMemo(() => {
    let items = periodicDetailedItems;

    // Filter by category
    if (selectedCategory === 'present') {
      items = presentList;
    } else if (selectedCategory === 'skipped_class') {
      items = skippedClassList;
    } else if (selectedCategory === 'ate_no_class') {
      items = ateNoClassList;
    } else if (selectedCategory === 'leave_excused') {
      items = leaveExcusedList;
    } else if (selectedCategory === 'leave_unexcused') {
      items = leaveUnexcusedList;
    } else if (selectedCategory === 'stay_weekend') {
      items = stayWeekendList;
    }

    // Filter by Class
    if (filterClass !== 'ALL') {
      items = items.filter((i) => i.class === filterClass);
    }

    // Filter by Room
    if (filterRoom !== 'ALL') {
      items = items.filter((i) => i.room === filterRoom);
    }

    // Filter by Village
    if (filterVillage !== 'ALL') {
      items = items.filter((i) => i.village === filterVillage);
    }

    // Search Query (Student Name or ID)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(
        (i) =>
          i.studentName.toLowerCase().includes(q) ||
          i.studentId.toLowerCase().includes(q) ||
          i.hamlet.toLowerCase().includes(q)
      );
    }

    return items;
  }, [
    periodicDetailedItems,
    selectedCategory,
    presentList,
    ateNoClassList,
    leaveExcusedList,
    leaveUnexcusedList,
    stayWeekendList,
    filterClass,
    filterRoom,
    filterVillage,
    searchQuery,
  ]);

  // Compute room-level statistics for current day / period
  const roomStats: RoomStatsRow[] = useMemo(() => {
    return rooms.map((room) => {
      const roomStudents = students.filter((s) => s.room === room && s.status === 'active');
      let present = 0;
      let ateNoClass = 0;
      let notAtSchool = 0;
      let leaveExcused = 0;
      let leaveUnexcused = 0;
      let stayWeekend = 0;

      roomStudents.forEach((s) => {
        const record = attendanceMap[s.id];
        const status = record?.status || 'present';
        if (status === 'present') present++;
        else if (status === 'ate_no_class') ateNoClass++;
        else if (status === 'not_at_school_this_week') notAtSchool++;
        else if (status === 'leave_excused') leaveExcused++;
        else if (status === 'leave_unexcused') leaveUnexcused++;
        if (record?.stayWeekend) stayWeekend++;
      });

      const total = roomStudents.length;
      const rate = total > 0 ? `${Math.round((present / total) * 100)}%` : '0%';
      const summary = roomSummaries[room];
      const finalStayWeekend =
        summary?.stayWeekendCount !== undefined ? summary.stayWeekendCount : stayWeekend;

      return {
        room,
        total,
        present,
        ateNoClass,
        notAtSchoolThisWeek: notAtSchool,
        leaveExcused,
        leaveUnexcused,
        stayWeekend: finalStayWeekend,
        rate,
        submitted: Boolean(summary?.submitted),
        submissionTime: summary?.updatedAt,
        teacherName: summary?.teacherName,
        teacherNote: summary?.notes || '',
      };
    });
  }, [rooms, students, attendanceMap, roomSummaries]);

  // Overall totals
  const overallTotals = useMemo(() => {
    let total = 0;
    let present = 0;
    let ateNoClass = 0;
    let notAtSchool = 0;
    let leaveExcused = 0;
    let leaveUnexcused = 0;
    let stayWeekend = 0;
    let submittedCount = 0;

    roomStats.forEach((r) => {
      total += r.total;
      present += r.present;
      ateNoClass += r.ateNoClass;
      notAtSchool += r.notAtSchoolThisWeek;
      leaveExcused += r.leaveExcused;
      leaveUnexcused += r.leaveUnexcused;
      stayWeekend += r.stayWeekend;
      if (r.submitted) submittedCount++;
    });

    const rate = total > 0 ? `${Math.round((present / total) * 100)}%` : '0%';

    return {
      total,
      present,
      ateNoClass,
      notAtSchool,
      leaveExcused,
      leaveUnexcused,
      stayWeekend,
      submittedCount,
      rate,
    };
  }, [roomStats]);

  // Demographic stats: Class
  const classStats = useMemo(() => {
    return classes.map((c) => {
      const classStudents = students.filter((s) => s.class === c && s.status === 'active');
      let present = 0;
      let ateNoClass = 0;
      let notAtSchool = 0;
      let leaveExcused = 0;
      let leaveUnexcused = 0;

      classStudents.forEach((s) => {
        const st = attendanceMap[s.id]?.status || 'present';
        if (st === 'present') present++;
        else if (st === 'ate_no_class') ateNoClass++;
        else if (st === 'not_at_school_this_week') notAtSchool++;
        else if (st === 'leave_excused') leaveExcused++;
        else if (st === 'leave_unexcused') leaveUnexcused++;
      });

      return {
        name: `Lớp ${c}`,
        total: classStudents.length,
        present,
        ateNoClass,
        notAtSchoolThisWeek: notAtSchool,
        leaveExcused,
        leaveUnexcused,
      };
    });
  }, [classes, students, attendanceMap]);

  // Demographic stats: Village
  const villageStats = useMemo(() => {
    return villages.map((v) => {
      const villageStudents = students.filter((s) => s.village === v && s.status === 'active');
      let present = 0;
      let ateNoClass = 0;
      let notAtSchool = 0;
      let leaveExcused = 0;
      let leaveUnexcused = 0;

      villageStudents.forEach((s) => {
        const st = attendanceMap[s.id]?.status || 'present';
        if (st === 'present') present++;
        else if (st === 'ate_no_class') ateNoClass++;
        else if (st === 'not_at_school_this_week') notAtSchool++;
        else if (st === 'leave_excused') leaveExcused++;
        else if (st === 'leave_unexcused') leaveUnexcused++;
      });

      return {
        name: v,
        total: villageStudents.length,
        present,
        ateNoClass,
        notAtSchoolThisWeek: notAtSchool,
        leaveExcused,
        leaveUnexcused,
      };
    });
  }, [villages, students, attendanceMap]);

  // Demographic stats: Hamlet
  const hamletStats = useMemo(() => {
    return hamlets.map((h) => {
      const hamletStudents = students.filter((s) => s.hamlet === h && s.status === 'active');
      let present = 0;
      let ateNoClass = 0;
      let notAtSchool = 0;
      let leaveExcused = 0;
      let leaveUnexcused = 0;

      hamletStudents.forEach((s) => {
        const st = attendanceMap[s.id]?.status || 'present';
        if (st === 'present') present++;
        else if (st === 'ate_no_class') ateNoClass++;
        else if (st === 'not_at_school_this_week') notAtSchool++;
        else if (st === 'leave_excused') leaveExcused++;
        else if (st === 'leave_unexcused') leaveUnexcused++;
      });

      return {
        name: h,
        total: hamletStudents.length,
        present,
        ateNoClass,
        notAtSchoolThisWeek: notAtSchool,
        leaveExcused,
        leaveUnexcused,
      };
    });
  }, [hamlets, students, attendanceMap]);

  // Abnormal students for daily urgent attention
  const abnormalStudents = useMemo(() => {
    return periodicDetailedItems.filter(
      (item) => item.status !== 'present' && item.date === currentDate
    );
  }, [periodicDetailedItems, currentDate]);

  // Export Comprehensive Multi-Sheet Excel
  const handleExportComprehensiveExcel = () => {
    exportPeriodicReportToExcel({
      periodType,
      periodLabel: currentPeriodInfo.label,
      schoolName: 'Trường PTDTBT THCS Trà Đốc - TP Đà Nẵng',
      reporterName: reporterName || 'Ban Quản Lý Nội Trú',
      presentList,
      ateNoClassList,
      leaveExcusedList,
      leaveUnexcusedList,
      stayWeekendList,
      roomStats,
    });
  };

  // Export Single Category Excel
  const handleExportCurrentCategoryExcel = () => {
    if (selectedCategory === 'stay_weekend') {
      exportSingleListToExcel({
        title: `Danh Sách Báo Suất Ăn Cuối Tuần T7-CN (Báo Bếp)`,
        periodLabel: currentPeriodInfo.label,
        list: stayWeekendList,
        categoryType: 'stay_weekend',
      });
    } else if (selectedCategory === 'present') {
      exportSingleListToExcel({
        title: `Danh Sách Học Sinh Có Mặt Toàn Trường`,
        periodLabel: currentPeriodInfo.label,
        list: presentList,
        categoryType: 'present',
      });
    } else if (selectedCategory === 'skipped_class') {
      exportSingleListToExcel({
        title: `Danh Sách Học Sinh Bỏ Tiết Toàn Trường`,
        periodLabel: currentPeriodInfo.label,
        list: skippedClassList,
        categoryType: 'skipped_class',
      });
    } else if (selectedCategory === 'ate_no_class') {
      exportSingleListToExcel({
        title: `Danh Sách Học Sinh Ăn Không Học Toàn Trường`,
        periodLabel: currentPeriodInfo.label,
        list: ateNoClassList,
        categoryType: 'ate_no_class',
      });
    } else if (selectedCategory === 'leave_excused') {
      exportSingleListToExcel({
        title: `Danh Sách Học Sinh Nghỉ Có Phép Toàn Trường`,
        periodLabel: currentPeriodInfo.label,
        list: leaveExcusedList,
        categoryType: 'leave_excused',
      });
    } else if (selectedCategory === 'leave_unexcused') {
      exportSingleListToExcel({
        title: `Danh Sách Học Sinh Nghỉ Không Phép Toàn Trường`,
        periodLabel: currentPeriodInfo.label,
        list: leaveUnexcusedList,
        categoryType: 'leave_unexcused',
      });
    } else {
      // Default to multi-sheet export
      handleExportComprehensiveExcel();
    }
  };

  // Week navigation helpers
  const handleShiftWeek = (days: number) => {
    const cur = new Date(selectedWeekDate + 'T00:00:00');
    cur.setDate(cur.getDate() + days);
    const pad = (n: number) => String(n).padStart(2, '0');
    setSelectedWeekDate(`${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`);
  };

  // Month navigation helpers
  const handleShiftMonth = (months: number) => {
    const [yStr, mStr] = selectedMonth.split('-');
    let y = parseInt(yStr, 10);
    let m = parseInt(mStr, 10) + months;
    if (m > 12) {
      m = 1;
      y++;
    } else if (m < 1) {
      m = 12;
      y--;
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    setSelectedMonth(`${y}-${pad(m)}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Header Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-0.5">
            Trường PTDTBT THCS Trà Đốc - TP Đà Nẵng
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {currentPeriodInfo.label}
            </span>
            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
              Người lập: {reporterName || 'BGH / Quản Trị'}
            </span>
          </div>
          <h2 className="text-lg md:text-xl font-bold text-slate-900 mt-1 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
            <span>TỔNG HỢP, BÁO CÁO & XUẤT EXCEL THEO ĐIỂM DANH GV TRỰC</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tổng hợp danh sách học sinh: Có mặt • Ăn không học • Nghỉ có phép • Nghỉ không phép • Báo suất ăn cuối tuần theo ngày, tuần, tháng.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5 w-full lg:w-auto">
          <button
            onClick={handleExportComprehensiveExcel}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow transition transform active:scale-95"
            title="Xuất file Excel tổng hợp toàn bộ 6 Sheet đầy đủ"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Excel Đa Sheet (.xlsx)</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 transition"
            title="In bản báo cáo"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span className="hidden sm:inline">In Báo Cáo</span>
          </button>
        </div>
      </div>

      {/* Main Sub Navigation Tabs */}
      <div className="flex items-center border-b border-slate-200 gap-2 overflow-x-auto text-sm scrollbar-none">
        <button
          onClick={() => setActiveReportSubTab('periodic_reports')}
          className={`flex items-center gap-2 pb-2.5 px-3.5 font-bold border-b-2 transition whitespace-nowrap ${
            activeReportSubTab === 'periodic_reports'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarDays className="w-4 h-4 text-emerald-600" />
          <span>Báo Cáo Chuyên Đề (Ngày / Tuần / Tháng)</span>
        </button>

        <button
          onClick={() => setActiveReportSubTab('all_rooms')}
          className={`flex items-center gap-2 pb-2.5 px-3 font-semibold border-b-2 transition whitespace-nowrap ${
            activeReportSubTab === 'all_rooms'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Tổng hợp các phòng ({rooms.length})</span>
        </button>

        <button
          onClick={() => setActiveReportSubTab('single_room')}
          className={`flex items-center gap-2 pb-2.5 px-3 font-semibold border-b-2 transition whitespace-nowrap ${
            activeReportSubTab === 'single_room'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Chi tiết từng phòng</span>
        </button>

        <button
          onClick={() => setActiveReportSubTab('demographics')}
          className={`flex items-center gap-2 pb-2.5 px-3 font-semibold border-b-2 transition whitespace-nowrap ${
            activeReportSubTab === 'demographics'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Thống kê Lớp, Thôn, Nóc</span>
        </button>

        <button
          onClick={() => setActiveReportSubTab('abnormal')}
          className={`flex items-center gap-2 pb-2.5 px-3 font-semibold border-b-2 transition whitespace-nowrap ${
            activeReportSubTab === 'abnormal'
              ? 'border-rose-600 text-rose-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>Học sinh vắng / bất thường ({abnormalStudents.length})</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: BÁO CÁO CHUYÊN ĐỀ THEO NGÀY, TUẦN, THÁNG (CORE FEATURE) */}
      {/* ============================================================== */}
      {activeReportSubTab === 'periodic_reports' && (
        <div className="space-y-5">
          {/* 1. Period Selector Card */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-700" />
                  <span>CHỌN CHU KỲ BÁO CÁO ĐIỂM DANH</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dữ liệu được tự động đồng bộ từ nhật ký điểm danh hằng ngày của các Giáo viên trực phòng.
                </p>
              </div>

              {/* Day / Week / Month Pill Buttons */}
              <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 self-start md:self-auto">
                <button
                  onClick={() => setPeriodType('day')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                    periodType === 'day'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📅 Từng Ngày
                </button>
                <button
                  onClick={() => setPeriodType('week')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                    periodType === 'week'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📆 Từng Tuần
                </button>
                <button
                  onClick={() => setPeriodType('month')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                    periodType === 'month'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🗓️ Từng Tháng
                </button>
              </div>
            </div>

            {/* Sub Date Pickers depending on period type */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-xl border">
              {/* If Day */}
              {periodType === 'day' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-slate-700">Chọn ngày điểm danh:</span>
                  <input
                    type="date"
                    value={selectedDayDate}
                    onChange={(e) => setSelectedDayDate(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 shadow-2xs focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={() => setSelectedDayDate(currentDate)}
                    className="text-xs text-emerald-700 hover:underline font-semibold"
                  >
                    Hôm nay
                  </button>
                </div>
              )}

              {/* If Week */}
              {periodType === 'week' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-slate-700">Tuần được chọn:</span>
                  <button
                    onClick={() => handleShiftWeek(-7)}
                    className="p-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 transition"
                    title="Tuần trước"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold bg-white border border-emerald-300 text-emerald-900 px-3 py-1.5 rounded-lg shadow-2xs">
                    {currentPeriodInfo.label}
                  </span>
                  <button
                    onClick={() => handleShiftWeek(7)}
                    className="p-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 transition"
                    title="Tuần sau"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSelectedWeekDate(currentDate)}
                    className="text-xs text-emerald-700 hover:underline font-semibold ml-1"
                  >
                    Tuần này
                  </button>
                </div>
              )}

              {/* If Month */}
              {periodType === 'month' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-slate-700">Chọn tháng:</span>
                  <button
                    onClick={() => handleShiftMonth(-1)}
                    className="p-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 transition"
                    title="Tháng trước"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 shadow-2xs focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={() => handleShiftMonth(1)}
                    className="p-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 transition"
                    title="Tháng sau"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSelectedMonth(currentDate.slice(0, 7))}
                    className="text-xs text-emerald-700 hover:underline font-semibold ml-1"
                  >
                    Tháng này
                  </button>
                </div>
              )}

              {/* Status indicator */}
              <div className="text-xs text-slate-500 flex items-center gap-2">
                {isLoadingPeriod ? (
                  <span className="text-emerald-700 font-medium flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Đang tải dữ liệu điểm danh...
                  </span>
                ) : (
                  <span className="bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Đã tải: {periodicDetailedItems.length} lượt điểm danh
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 2. KPI Summary Cards for the requested categories */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {/* Card 1: Có mặt */}
            <div
              onClick={() => setSelectedCategory('present')}
              className={`p-3.5 sm:p-4 rounded-2xl border transition cursor-pointer shadow-xs ${
                selectedCategory === 'present'
                  ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400'
                  : 'bg-white border-slate-200 hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-emerald-800 font-bold mb-1">
                <span className="flex items-center gap-1">
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Có mặt
                </span>
                <span className="text-[10px] bg-emerald-100 px-1.5 py-0.2 rounded">Ăn & Học</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-900">
                {presentList.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Học sinh toàn trường</div>
            </div>

            {/* Card 2: HS Bỏ tiết */}
            <div
              onClick={() => setSelectedCategory('skipped_class')}
              className={`p-3.5 sm:p-4 rounded-2xl border transition cursor-pointer shadow-xs ${
                selectedCategory === 'skipped_class'
                  ? 'bg-orange-50 border-orange-400 ring-2 ring-orange-400'
                  : 'bg-white border-slate-200 hover:border-orange-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-orange-900 font-bold mb-1">
                <span className="flex items-center gap-1">
                  <Ban className="w-3.5 h-3.5 text-orange-600" />
                  HS Bỏ tiết
                </span>
                <span className="text-[10px] bg-orange-100 px-1.5 py-0.2 rounded text-orange-800 font-semibold">Bỏ tiết học</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-orange-950">
                {skippedClassList.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Tự ý bỏ tiết trên lớp</div>
            </div>

            {/* Card 3: Ăn không học */}
            <div
              onClick={() => setSelectedCategory('ate_no_class')}
              className={`p-3.5 sm:p-4 rounded-2xl border transition cursor-pointer shadow-xs ${
                selectedCategory === 'ate_no_class'
                  ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400'
                  : 'bg-white border-slate-200 hover:border-amber-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-amber-900 font-bold mb-1">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Ăn không học
                </span>
                <span className="text-[10px] bg-amber-100 px-1.5 py-0.2 rounded text-amber-800">Cần đôn đốc</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-950">
                {ateNoClassList.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Lên ăn nhưng trốn học</div>
            </div>

            {/* Card 3: Nghỉ có phép */}
            <div
              onClick={() => setSelectedCategory('leave_excused')}
              className={`p-3.5 sm:p-4 rounded-2xl border transition cursor-pointer shadow-xs ${
                selectedCategory === 'leave_excused'
                  ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-400'
                  : 'bg-white border-slate-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-blue-900 font-bold mb-1">
                <span className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  Nghỉ có phép
                </span>
                <span className="text-[10px] bg-blue-100 px-1.5 py-0.2 rounded text-blue-800">Có đơn</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-blue-950">
                {leaveExcusedList.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Phụ huynh xin phép</div>
            </div>

            {/* Card 4: Nghỉ không phép */}
            <div
              onClick={() => setSelectedCategory('leave_unexcused')}
              className={`p-3.5 sm:p-4 rounded-2xl border transition cursor-pointer shadow-xs ${
                selectedCategory === 'leave_unexcused'
                  ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-400'
                  : 'bg-white border-slate-200 hover:border-rose-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-rose-900 font-bold mb-1">
                <span className="flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  Nghỉ không phép
                </span>
                <span className="text-[10px] bg-rose-100 px-1.5 py-0.2 rounded text-rose-800">Bỏ tiết</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-rose-950">
                {leaveUnexcusedList.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Vắng không lý do</div>
            </div>

            {/* Card 5: Báo ăn cuối tuần (Báo bếp) */}
            <div
              onClick={() => setSelectedCategory('stay_weekend')}
              className={`col-span-2 sm:col-span-1 p-3.5 sm:p-4 rounded-2xl border transition cursor-pointer shadow-xs ${
                selectedCategory === 'stay_weekend'
                  ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-500'
                  : 'bg-white border-slate-200 hover:border-teal-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-teal-900 font-extrabold mb-1">
                <span className="flex items-center gap-1">
                  <UtensilsCrossed className="w-3.5 h-3.5 text-teal-700" />
                  Báo ăn cuối tuần
                </span>
                <span className="text-[10px] bg-teal-100 px-1.5 py-0.2 rounded text-teal-900 font-bold">Báo bếp</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-teal-950">
                {stayWeekendList.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Suất ăn Thứ 7 & CN</div>
            </div>
          </div>

          {/* 3. Filter Bar & Quick Category Selector */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold scrollbar-none">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                    selectedCategory === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Tất cả ({periodicDetailedItems.length})
                </button>
                <button
                  onClick={() => setSelectedCategory('present')}
                  className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                    selectedCategory === 'present'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  ✓ Có mặt ({presentList.length})
                </button>
                <button
                  onClick={() => setSelectedCategory('ate_no_class')}
                  className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                    selectedCategory === 'ate_no_class'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  ⚠ Ăn không học ({ateNoClassList.length})
                </button>
                <button
                  onClick={() => setSelectedCategory('leave_excused')}
                  className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                    selectedCategory === 'leave_excused'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 text-blue-900 hover:bg-blue-100 border border-blue-200'
                  }`}
                >
                  📝 Nghỉ có phép ({leaveExcusedList.length})
                </button>
                <button
                  onClick={() => setSelectedCategory('leave_unexcused')}
                  className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                    selectedCategory === 'leave_unexcused'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 text-rose-900 hover:bg-rose-100 border border-rose-200'
                  }`}
                >
                  ✕ Nghỉ không phép ({leaveUnexcusedList.length})
                </button>
                <button
                  onClick={() => setSelectedCategory('stay_weekend')}
                  className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap font-extrabold ${
                    selectedCategory === 'stay_weekend'
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'bg-teal-100 text-teal-950 hover:bg-teal-200 border border-teal-300'
                  }`}
                >
                  🍱 Báo ăn cuối tuần ({stayWeekendList.length})
                </button>
              </div>

              {/* Individual Export Button for current view */}
              <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                <button
                  onClick={handleExportCurrentCategoryExcel}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow-xs"
                  title="Xuất riêng danh sách đang hiển thị thành file Excel"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Xuất Excel mục này</span>
                </button>
              </div>
            </div>

            {/* Sub Filters: Search, Class, Room, Village */}
            <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Tìm theo tên học sinh, mã HS, nóc..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Room Filter */}
              <select
                value={filterRoom}
                onChange={(e) => setFilterRoom(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none"
              >
                <option value="ALL">-- Tất cả phòng ở ({rooms.length}) --</option>
                {rooms.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              {/* Class Filter */}
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none"
              >
                <option value="ALL">-- Tất cả các lớp --</option>
                {classes.map((c) => (
                  <option key={c} value={c}>
                    Lớp {c}
                  </option>
                ))}
              </select>

              {/* Village Filter */}
              <select
                value={filterVillage}
                onChange={(e) => setFilterVillage(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none"
              >
                <option value="ALL">-- Tất cả các thôn --</option>
                {villages.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Detailed Data Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-slate-700">
                <span className="font-bold text-slate-900">
                  {selectedCategory === 'all' && 'Bảng toàn bộ danh sách điểm danh'}
                  {selectedCategory === 'present' && 'Danh sách học sinh có mặt toàn trường (Ăn & Học)'}
                  {selectedCategory === 'ate_no_class' && 'Danh sách học sinh lên ăn nhưng không đi học'}
                  {selectedCategory === 'leave_excused' && 'Danh sách học sinh nghỉ có phép'}
                  {selectedCategory === 'leave_unexcused' && 'Danh sách học sinh nghỉ không phép'}
                  {selectedCategory === 'stay_weekend' && 'Tổng hợp danh sách học sinh ở lại cuối tuần để báo suất ăn'}
                </span>
                <span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full font-bold">
                  {displayItems.length} học sinh
                </span>
              </div>

              {selectedCategory === 'stay_weekend' && (
                <div className="text-xs bg-teal-100 text-teal-950 font-extrabold px-3 py-1 rounded-lg border border-teal-300 flex items-center gap-1.5 shadow-2xs">
                  <UtensilsCrossed className="w-3.5 h-3.5 text-teal-700" />
                  <span>Tổng số suất ăn báo bếp: {displayItems.length} suất</span>
                </div>
              )}
            </div>

            {displayItems.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Info className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600">Không có học sinh nào phù hợp bộ lọc.</p>
                <p className="text-xs text-slate-400 mt-1">Hãy thử đổi chu kỳ thời gian hoặc xóa điều kiện tìm kiếm.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-semibold border-b text-[11px] uppercase tracking-wider">
                      <th className="py-2.5 px-3 text-center w-12">STT</th>
                      <th className="py-2.5 px-3">Họ và tên học sinh</th>
                      <th className="py-2.5 px-2.5 text-center">Lớp</th>
                      <th className="py-2.5 px-2.5 text-center">Phòng ở</th>
                      <th className="py-2.5 px-3">Thôn / Nóc</th>
                      <th className="py-2.5 px-3 text-center">Trạng thái điểm danh</th>
                      <th className="py-2.5 px-3 text-center">Báo ăn T7-CN</th>
                      {periodType !== 'day' && <th className="py-2.5 px-3 text-center">Ngày ghi nhận</th>}
                      <th className="py-2.5 px-3 min-w-[140px]">Lý do / Ghi chú</th>
                      <th className="py-2.5 px-3">GV Trực phòng</th>
                      <th className="py-2.5 px-3 text-center">SĐT Phụ huynh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayItems.map((item, idx) => {
                      const cfg = STATUS_CONFIG[item.status as AttendanceStatus] || STATUS_CONFIG.present;
                      return (
                        <tr key={`${item.date}_${item.studentId}_${idx}`} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            <div>{item.studentName}</div>
                            <div className="text-[10px] font-mono text-slate-400">{item.studentId}</div>
                          </td>
                          <td className="py-2.5 px-2.5 text-center font-bold text-emerald-800">
                            <span className="bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {item.class}
                            </span>
                          </td>
                          <td className="py-2.5 px-2.5 text-center font-semibold text-slate-800">
                            <span className="bg-slate-100 px-2 py-0.5 rounded">
                              {item.room}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            <div>{item.village}</div>
                            {item.hamlet && (
                              <div className="text-[11px] text-purple-700 font-medium">Nóc: {item.hamlet}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`text-[11px] px-2 py-0.5 rounded font-semibold whitespace-nowrap ${cfg.badgeClass}`}>
                              {cfg.shortLabel}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {item.stayWeekend ? (
                              <span className="inline-flex items-center gap-1 text-[11px] bg-teal-100 text-teal-950 font-extrabold px-2 py-0.5 rounded-full border border-teal-300 shadow-2xs whitespace-nowrap">
                                <UtensilsCrossed className="w-3 h-3 text-teal-700" />
                                <span>Báo ăn T7-CN</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </td>
                          {periodType !== 'day' && (
                            <td className="py-2.5 px-3 text-center text-xs text-slate-600 font-mono">
                              {item.date}
                            </td>
                          )}
                          <td className="py-2.5 px-3 text-xs text-slate-700 italic">
                            {item.note || <span className="text-slate-300">Không có</span>}
                          </td>
                          <td className="py-2.5 px-3 text-xs text-slate-600 font-medium">
                            {item.recordedByName || item.recordedByEmail || <span className="text-slate-400">GV Trực</span>}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {item.parentPhone ? (
                              <a
                                href={`tel:${item.parentPhone}`}
                                className="text-emerald-700 hover:underline flex items-center justify-center gap-1 text-xs font-semibold"
                              >
                                <Phone className="w-3 h-3" />
                                <span>{item.parentPhone}</span>
                              </a>
                            ) : (
                              <span className="text-slate-300 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUBTAB 2: TỔNG HỢP TẤT CẢ CÁC PHÒNG NỘI TRÚ                     */}
      {/* ============================================================== */}
      {activeReportSubTab === 'all_rooms' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                <span>BẢNG TỔNG HỢP BÁO CÁO CÁC PHÒNG NỘI TRÚ</span>
                <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
                  {rooms.length} phòng
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Bảng theo dõi sĩ số hằng ngày, trạng thái nộp báo cáo và số lượng học sinh ở lại cuối tuần của các phòng.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-xs bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>Chuyên cần: {overallTotals.rate}</span>
              </div>
              <div className="text-xs bg-teal-100 text-teal-900 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 border border-teal-300 shadow-xs">
                <BedDouble className="w-3.5 h-3.5 text-teal-700" />
                <span>Ở lại cuối tuần: {overallTotals.stayWeekend} em</span>
              </div>
              <div className="text-xs bg-blue-50 text-blue-800 px-3 py-1.5 rounded-xl font-bold border border-blue-200">
                Đã nộp báo cáo: {overallTotals.submittedCount}/{rooms.length} phòng
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-2 w-10 text-center">STT</th>
                  <th className="py-3 px-3">Phòng nội trú</th>
                  <th className="py-3 px-3 text-center">Trạng thái báo cáo</th>
                  <th className="py-3 px-3 text-center">Tổng HS</th>
                  <th className="py-3 px-3 text-center text-emerald-800 bg-emerald-50/50">Có mặt</th>
                  <th className="py-3 px-3 text-center text-amber-900 bg-amber-50/70">Ăn ko học</th>
                  <th className="py-3 px-3 text-center text-purple-900 bg-purple-50/50">Chưa lên</th>
                  <th className="py-3 px-3 text-center text-blue-900 bg-blue-50/50">Nghỉ phép</th>
                  <th className="py-3 px-3 text-center text-rose-900 bg-rose-50/60">Ko phép</th>
                  <th className="py-3 px-3 text-center text-teal-900 bg-teal-100/70 font-bold">Ở lại cuối tuần</th>
                  <th className="py-3 px-3 text-center">Tỷ lệ</th>
                  <th className="py-3 px-3 min-w-[140px]">Nhận xét GV trực</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roomStats.map((row, idx) => (
                  <tr key={row.room} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-2 text-center text-slate-400 font-medium">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{row.room}</td>
                    <td className="py-2.5 px-3 text-center">
                      {row.submitted ? (
                        <div className="inline-flex items-center gap-1 text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{row.teacherName ? row.teacherName : 'Đã nộp'}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full font-medium border border-amber-200">
                          Chưa nộp
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-800">{row.total}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-700 bg-emerald-50/30">
                      {row.present}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-amber-700 bg-amber-50/40">
                      {row.ateNoClass > 0 ? (
                        <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold">
                          {row.ateNoClass}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-purple-700">
                      {row.notAtSchoolThisWeek > 0 ? row.notAtSchoolThisWeek : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-medium text-blue-700 bg-blue-50/30">
                      {row.leaveExcused > 0 ? row.leaveExcused : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-rose-700 bg-rose-50/40">
                      {row.leaveUnexcused > 0 ? (
                        <span className="bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-bold">
                          {row.leaveUnexcused}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold bg-teal-50/60">
                      {row.stayWeekend > 0 ? (
                        <span className="inline-flex items-center gap-1 bg-teal-100 text-teal-900 font-extrabold px-2.5 py-0.5 rounded-full border border-teal-300">
                          <BedDouble className="w-3 h-3 text-teal-700" />
                          <span>{row.stayWeekend} em</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">0</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-700">{row.rate}</td>
                    <td className="py-2.5 px-3 text-xs text-slate-600 italic">
                      {row.teacherNote || <span className="text-slate-300">Không có ghi chú</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-800 text-white font-bold border-t-2 border-slate-900">
                  <td className="py-3 px-2 text-center">#</td>
                  <td className="py-3 px-3 uppercase tracking-wider">TỔNG TOÀN TRƯỜNG</td>
                  <td className="py-3 px-3 text-center text-xs">
                    <span className="bg-slate-700 text-emerald-300 px-2.5 py-1 rounded-md font-semibold inline-block">
                      {overallTotals.submittedCount}/{rooms.length} phòng nộp
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center text-base">{overallTotals.total}</td>
                  <td className="py-3 px-3 text-center text-emerald-300 text-base">{overallTotals.present}</td>
                  <td className="py-3 px-3 text-center text-amber-300 text-base">{overallTotals.ateNoClass}</td>
                  <td className="py-3 px-3 text-center text-purple-300 text-base">{overallTotals.notAtSchool}</td>
                  <td className="py-3 px-3 text-center text-blue-300 text-base">{overallTotals.leaveExcused}</td>
                  <td className="py-3 px-3 text-center text-rose-300 text-base">{overallTotals.leaveUnexcused}</td>
                  <td className="py-3 px-3 text-center text-teal-300 text-base font-extrabold bg-slate-900/60">
                    <div className="inline-flex items-center gap-1">
                      <BedDouble className="w-4 h-4 text-teal-300" />
                      <span>{overallTotals.stayWeekend} em</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center text-yellow-300 text-base">{overallTotals.rate}</td>
                  <td className="py-3 px-3 text-xs font-normal text-slate-300">
                    Tổng cộng {overallTotals.stayWeekend} học sinh ở lại cuối tuần
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUBTAB 3: CHI TIẾT TỪNG PHÒNG                                   */}
      {/* ============================================================== */}
      {activeReportSubTab === 'single_room' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Home className="w-5 h-5 text-emerald-700" />
              <span className="font-bold text-slate-800">Chọn phòng xem báo cáo:</span>
            </div>
            <select
              value={selectedRoomFilter}
              onChange={(e) => setSelectedRoomFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">-- Hiển thị tất cả {rooms.length} phòng --</option>
              {rooms.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roomStats
              .filter((r) => selectedRoomFilter === 'ALL' || r.room === selectedRoomFilter)
              .map((room) => {
                const roomStudentList = students.filter((s) => s.room === room.room && s.status === 'active');
                return (
                  <div key={room.room} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
                    <div className="flex items-start justify-between border-b border-slate-100 pb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-base">{room.room}</h4>
                          {room.submitted ? (
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                              Đã nộp báo cáo
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200 inline-flex items-center gap-1">
                              Chưa nộp
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          GV Trực: <strong className="text-slate-700">{room.teacherName || 'Chưa phân công'}</strong>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          Chuyên cần: {room.rate}
                        </div>
                        <div className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 mt-1">
                          Ở lại cuối tuần: {room.stayWeekend} em
                        </div>
                      </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="bg-slate-50 p-2 rounded-xl">
                        <div className="text-slate-500 text-[11px]">Tổng số</div>
                        <div className="font-bold text-slate-800 text-sm">{room.total}</div>
                      </div>
                      <div className="bg-emerald-50 p-2 rounded-xl">
                        <div className="text-emerald-700 text-[11px]">Có mặt</div>
                        <div className="font-bold text-emerald-800 text-sm">{room.present}</div>
                      </div>
                      <div className="bg-amber-50 p-2 rounded-xl">
                        <div className="text-amber-800 text-[11px]">Ăn ko học</div>
                        <div className="font-bold text-amber-900 text-sm">{room.ateNoClass}</div>
                      </div>
                      <div className="bg-rose-50 p-2 rounded-xl">
                        <div className="text-rose-700 text-[11px]">Vắng nghỉ</div>
                        <div className="font-bold text-rose-800 text-sm">{room.leaveExcused + rowLeaveUnexcused(room)}</div>
                      </div>
                    </div>

                    {/* Room Teacher Note */}
                    {room.teacherNote && (
                      <div className="bg-amber-50/70 border border-amber-200 p-2.5 rounded-xl text-xs text-amber-900">
                        <span className="font-bold">Ghi chú của GV trực: </span>
                        <span>{room.teacherNote}</span>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUBTAB 4: THỐNG KÊ THEO LỚP, THÔN VÀ NÓC                         */}
      {/* ============================================================== */}
      {activeReportSubTab === 'demographics' && (
        <div className="space-y-6">
          {/* 1. LỚP */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-700" />
                <span>THỐNG KÊ SĨ SỐ HỌC SINH NỘI TRÚ THEO LỚP</span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b text-[11px] uppercase">
                    <th className="py-2.5 px-3">Lớp</th>
                    <th className="py-2.5 px-3 text-center">Tổng HS</th>
                    <th className="py-2.5 px-3 text-center text-emerald-800">Có mặt</th>
                    <th className="py-2.5 px-3 text-center text-amber-900">Ăn không học</th>
                    <th className="py-2.5 px-3 text-center text-purple-900">Chưa lên</th>
                    <th className="py-2.5 px-3 text-center text-blue-900">Nghỉ phép</th>
                    <th className="py-2.5 px-3 text-center text-rose-900">Không phép</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classStats.map((c) => (
                    <tr key={c.name} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold text-slate-900">{c.name}</td>
                      <td className="py-2 px-3 text-center font-bold text-slate-800">{c.total}</td>
                      <td className="py-2 px-3 text-center font-bold text-emerald-700">{c.present}</td>
                      <td className="py-2 px-3 text-center font-bold text-amber-700">{c.ateNoClass > 0 ? c.ateNoClass : '-'}</td>
                      <td className="py-2 px-3 text-center font-bold text-purple-700">{c.notAtSchoolThisWeek > 0 ? c.notAtSchoolThisWeek : '-'}</td>
                      <td className="py-2 px-3 text-center font-medium text-blue-700">{c.leaveExcused > 0 ? c.leaveExcused : '-'}</td>
                      <td className="py-2 px-3 text-center font-bold text-rose-700">{c.leaveUnexcused > 0 ? c.leaveUnexcused : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. THÔN */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-700" />
                <span>THỐNG KÊ SĨ SỐ HỌC SINH NỘI TRÚ THEO THÔN</span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b text-[11px] uppercase">
                    <th className="py-2.5 px-3">Thôn cư trú</th>
                    <th className="py-2.5 px-3 text-center">Tổng HS</th>
                    <th className="py-2.5 px-3 text-center text-emerald-800">Có mặt</th>
                    <th className="py-2.5 px-3 text-center text-amber-900">Ăn không học</th>
                    <th className="py-2.5 px-3 text-center text-purple-900">Chưa lên</th>
                    <th className="py-2.5 px-3 text-center text-blue-900">Nghỉ phép</th>
                    <th className="py-2.5 px-3 text-center text-rose-900">Không phép</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {villageStats.map((v) => (
                    <tr key={v.name} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold text-slate-900">{v.name}</td>
                      <td className="py-2 px-3 text-center font-bold text-slate-800">{v.total}</td>
                      <td className="py-2 px-3 text-center font-bold text-emerald-700">{v.present}</td>
                      <td className="py-2 px-3 text-center font-bold text-amber-700">{v.ateNoClass > 0 ? v.ateNoClass : '-'}</td>
                      <td className="py-2 px-3 text-center font-bold text-purple-700">{v.notAtSchoolThisWeek > 0 ? v.notAtSchoolThisWeek : '-'}</td>
                      <td className="py-2 px-3 text-center font-medium text-blue-700">{v.leaveExcused > 0 ? v.leaveExcused : '-'}</td>
                      <td className="py-2 px-3 text-center font-bold text-rose-700">{v.leaveUnexcused > 0 ? v.leaveUnexcused : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. NÓC VÙNG CAO */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-purple-700" />
                <span>THỐNG KÊ THEO NÓC (KHU DÂN CƯ VÙNG CAO)</span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b text-[11px] uppercase">
                    <th className="py-2.5 px-3">Tên Nóc</th>
                    <th className="py-2.5 px-3 text-center">Tổng HS</th>
                    <th className="py-2.5 px-3 text-center text-emerald-800">Có mặt</th>
                    <th className="py-2.5 px-3 text-center text-amber-900">Ăn không học</th>
                    <th className="py-2.5 px-3 text-center text-purple-900">Chưa lên</th>
                    <th className="py-2.5 px-3 text-center text-blue-900">Nghỉ phép</th>
                    <th className="py-2.5 px-3 text-center text-rose-900">Không phép</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {hamletStats.map((h) => (
                    <tr key={h.name} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold text-slate-900">{h.name}</td>
                      <td className="py-2 px-3 text-center font-bold text-slate-800">{h.total}</td>
                      <td className="py-2 px-3 text-center font-bold text-emerald-700">{h.present}</td>
                      <td className="py-2 px-3 text-center font-bold text-amber-700">{h.ateNoClass > 0 ? h.ateNoClass : '-'}</td>
                      <td className="py-2 px-3 text-center font-bold text-purple-700">{h.notAtSchoolThisWeek > 0 ? h.notAtSchoolThisWeek : '-'}</td>
                      <td className="py-2 px-3 text-center font-medium text-blue-700">{h.leaveExcused > 0 ? h.leaveExcused : '-'}</td>
                      <td className="py-2 px-3 text-center font-bold text-rose-700">{h.leaveUnexcused > 0 ? h.leaveUnexcused : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUBTAB 5: HỌC SINH VẮNG / BẤT THƯỜNG TRONG NGÀY                */}
      {/* ============================================================== */}
      {activeReportSubTab === 'abnormal' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-rose-50 border-b border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-rose-900 text-sm sm:text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>DANH SÁCH HỌC SINH CẦN THEO DÕI VÀ XỬ LÝ TRONG NGÀY</span>
              </h3>
              <p className="text-xs text-rose-700">
                Gồm học sinh Ăn không học, Chưa lên trường trong tuần, Nghỉ có phép & Nghỉ không phép
              </p>
            </div>
            <span className="text-xs font-bold bg-rose-200 text-rose-900 px-3 py-1 rounded-full self-start sm:self-auto">
              Tổng cộng: {abnormalStudents.length} học sinh
            </span>
          </div>

          {abnormalStudents.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-2" />
              <p className="font-semibold text-slate-700">Tuyệt vời! 100% học sinh hôm nay có mặt đầy đủ</p>
              <p className="text-xs text-slate-400 mt-1">Không có học sinh nào ăn không học hay nghỉ học bất thường.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b text-[11px] uppercase">
                    <th className="py-2.5 px-3 text-center">STT</th>
                    <th className="py-2.5 px-3">Họ và tên</th>
                    <th className="py-2.5 px-3">Lớp</th>
                    <th className="py-2.5 px-3">Phòng</th>
                    <th className="py-2.5 px-3">Thôn / Nóc</th>
                    <th className="py-2.5 px-3">Trạng thái</th>
                    <th className="py-2.5 px-3">Lý do / Ghi chú</th>
                    <th className="py-2.5 px-3">SĐT Phụ huynh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {abnormalStudents.map((item, idx) => {
                    const cfg = STATUS_CONFIG[item.status as AttendanceStatus] || STATUS_CONFIG.present;
                    return (
                      <tr key={item.studentId} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{item.studentName}</td>
                        <td className="py-2.5 px-3 font-semibold text-emerald-800">{item.class}</td>
                        <td className="py-2.5 px-3 text-slate-700">{item.room}</td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {item.village} • <span className="font-semibold text-purple-700">{item.hamlet}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`text-xs px-2 py-0.5 rounded font-semibold ${cfg.badgeClass}`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-xs text-slate-700 italic">
                          {item.note || <span className="text-slate-300">Chưa ghi lý do</span>}
                        </td>
                        <td className="py-2.5 px-3">
                          {item.parentPhone ? (
                            <a
                              href={`tel:${item.parentPhone}`}
                              className="text-emerald-700 hover:underline flex items-center gap-1 font-medium"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{item.parentPhone}</span>
                            </a>
                          ) : (
                            <span className="text-slate-300 text-xs">Chưa có SĐT</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Helper inside file for row leave calculation
function rowLeaveUnexcused(room: RoomStatsRow) {
  return room.leaveUnexcused;
}
