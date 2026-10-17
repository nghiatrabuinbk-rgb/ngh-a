/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  auth, 
  loginWithGoogle, 
  logoutUser, 
  testFirestoreConnection 
} from './firebase';
import { 
  Student, 
  AttendanceRecord, 
  RoomSummary, 
  AuthorizedUser, 
  AggregatedStats, 
  AttendanceStatus,
  NightStudyRecord,
  NightRoomSummary
} from './types';
import { 
  INITIAL_ROOMS, 
  INITIAL_CLASSES, 
  INITIAL_VILLAGES, 
  INITIAL_HAMLETS, 
  INITIAL_ADMIN_EMAIL,
  SEED_STUDENTS
} from './mockData';
import { 
  fetchStudents, 
  saveStudent, 
  deleteStudent, 
  fetchAttendanceForDate, 
  saveAttendanceRecords, 
  fetchRoomSummaries, 
  saveRoomSummary, 
  fetchAuthorizedUsers, 
  saveAuthorizedUser, 
  deleteAuthorizedUser,
  fetchNightAttendanceForDate,
  saveNightAttendanceRecords,
  fetchNightRoomSummaries,
  saveNightRoomSummary
} from './services/dataService';
import { Header } from './components/Header';
import { StatSummaryCards } from './components/StatSummaryCards';
import { DailyAttendanceView } from './components/DailyAttendanceView';
import { NightStudyAttendanceView } from './components/NightStudyAttendanceView';
import { MasterReportView } from './components/MasterReportView';
import { StudentManagementView } from './components/StudentManagementView';
import { PermissionsManagementView } from './components/PermissionsManagementView';
import { ZaloQrLoginModal } from './components/ZaloQrLoginModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { 
  ShieldAlert, 
  LogIn, 
  CheckCircle, 
  Users, 
  Sparkles,
  AlertCircle,
  QrCode,
  Smartphone
} from 'lucide-react';

export default function App() {
  // Current selected attendance date (YYYY-MM-DD)
  const [currentDate, setCurrentDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'attendance' | 'night_study' | 'report' | 'students' | 'permissions'>('attendance');

  // Status card filter selection
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<AttendanceStatus | 'all' | 'stay_weekend'>('all');

  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Zalo QR Login State
  const [isZaloModalOpen, setIsZaloModalOpen] = useState<boolean>(false);
  const [zaloUser, setZaloUser] = useState<AuthorizedUser | null>(() => {
    try {
      const saved = localStorage.getItem('qlnt_zalo_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // App data states (Day Attendance)
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceRecord>>({});
  const [roomSummaries, setRoomSummaries] = useState<Record<string, RoomSummary>>({});

  // Night Study Attendance States (Independent)
  const [nightAttendanceMap, setNightAttendanceMap] = useState<Record<string, NightStudyRecord>>({});
  const [nightRoomSummaries, setNightRoomSummaries] = useState<Record<string, NightRoomSummary>>({});

  const [authorizedUsers, setAuthorizedUsers] = useState<AuthorizedUser[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Master dynamic lists (derived from initial presets + all rooms/classes/locations entered for students)
  const rooms = useMemo(() => {
    const set = new Set<string>(INITIAL_ROOMS);
    students.forEach((s) => {
      if (s.room && s.room.trim()) set.add(s.room.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
  }, [students]);

  const classes = useMemo(() => {
    const set = new Set<string>(INITIAL_CLASSES);
    students.forEach((s) => {
      if (s.class && s.class.trim()) set.add(s.class.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
  }, [students]);

  const villages = useMemo(() => {
    const set = new Set<string>(INITIAL_VILLAGES);
    students.forEach((s) => {
      if (s.village && s.village.trim()) set.add(s.village.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
  }, [students]);

  const hamlets = useMemo(() => {
    const set = new Set<string>(INITIAL_HAMLETS);
    students.forEach((s) => {
      if (s.hamlet && s.hamlet.trim()) set.add(s.hamlet.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
  }, [students]);

  // Demo guest mode bypass for convenience if user wants to evaluate immediately
  const [guestMode, setGuestMode] = useState<boolean>(false);

  // Test connection on boot & auth listener
  useEffect(() => {
    testFirestoreConnection();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load authorized users and students on startup
  useEffect(() => {
    async function loadInitialData() {
      setLoadingData(true);
      try {
        const [users, studentList] = await Promise.all([
          fetchAuthorizedUsers(),
          fetchStudents(),
        ]);
        setAuthorizedUsers(users);
        setStudents(studentList);
      } catch (err) {
        console.error('Error loading initial data:', err);
      } finally {
        setLoadingData(false);
      }
    }

    loadInitialData();
  }, []);

  // Load day attendance, night attendance and summaries when date changes
  useEffect(() => {
    async function loadDailyData() {
      try {
        const [attMap, summaries, nightAtt, nightSum] = await Promise.all([
          fetchAttendanceForDate(currentDate),
          fetchRoomSummaries(currentDate),
          fetchNightAttendanceForDate(currentDate),
          fetchNightRoomSummaries(currentDate),
        ]);
        setAttendanceMap(attMap);
        setRoomSummaries(summaries);
        setNightAttendanceMap(nightAtt);
        setNightRoomSummaries(nightSum);
      } catch (err) {
        console.error('Error loading daily and night attendance:', err);
      }
    }

    loadDailyData();
  }, [currentDate]);

  // Find authorized user info for current logged in user
  const authorizedInfo = useMemo<AuthorizedUser | null>(() => {
    if (zaloUser) {
      return zaloUser;
    }

    if (!currentUser && !guestMode) return null;

    if (guestMode) {
      return {
        email: INITIAL_ADMIN_EMAIL,
        name: 'Thầy Nghĩa (Quản Trị / BGH)',
        role: 'admin',
        assignedRooms: ['ALL'],
        phone: '0981234567',
        zaloQrData: 'https://zalo.me/0981234567',
        active: true,
      };
    }

    const email = currentUser?.email?.toLowerCase().trim();
    if (!email) return null;

    // Check if initial admin
    if (email === INITIAL_ADMIN_EMAIL.toLowerCase()) {
      const found = authorizedUsers.find((u) => u.email.toLowerCase() === email);
      return (
        found || {
          email: INITIAL_ADMIN_EMAIL,
          name: currentUser?.displayName || 'Thầy Nghĩa (Quản Trị / BGH)',
          role: 'admin',
          assignedRooms: ['ALL'],
          phone: '0981234567',
          active: true,
        }
      );
    }

    return authorizedUsers.find((u) => u.email.toLowerCase() === email && u.active) || null;
  }, [zaloUser, currentUser, authorizedUsers, guestMode]);

  const effectiveUser = useMemo(() => {
    if (zaloUser) {
      return {
        email: zaloUser.email,
        displayName: zaloUser.name,
      };
    }
    if (guestMode) {
      return {
        email: INITIAL_ADMIN_EMAIL,
        displayName: 'Thầy Nghĩa (Quản Trị / BGH)',
      };
    }
    return currentUser;
  }, [zaloUser, currentUser, guestMode]);

  const isUserAuthorized = Boolean(authorizedInfo);
  const isAdmin = authorizedInfo?.role === 'admin';

  // Compute Aggregated Statistics
  const aggregatedStats = useMemo<AggregatedStats>(() => {
    const activeStudents = students.filter((s) => s.status === 'active');
    let present = 0;
    let ateNoClass = 0;
    let notAtSchool = 0;
    let leaveExcused = 0;
    let leaveUnexcused = 0;
    let stayWeekend = 0;

    activeStudents.forEach((s) => {
      const record = attendanceMap[s.id];
      const status = record?.status || 'present';
      if (status === 'present') present++;
      else if (status === 'ate_no_class') ateNoClass++;
      else if (status === 'not_at_school_this_week') notAtSchool++;
      else if (status === 'leave_excused') leaveExcused++;
      else if (status === 'leave_unexcused') leaveUnexcused++;
      if (record?.stayWeekend) stayWeekend++;
    });

    return {
      total: activeStudents.length,
      present,
      ateNoClass,
      notAtSchoolThisWeek: notAtSchool,
      leaveExcused,
      leaveUnexcused,
      stayWeekend,
    };
  }, [students, attendanceMap]);

  // Auth Handlers
  const handleLogin = async () => {
    try {
      await loginWithGoogle();
      setZaloUser(null);
      localStorage.removeItem('qlnt_zalo_session');
      setGuestMode(false);
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  const handleZaloLoginSuccess = (user: AuthorizedUser) => {
    setZaloUser(user);
    setGuestMode(false);
    localStorage.setItem('qlnt_zalo_session', JSON.stringify(user));
  };

  const handleLinkZaloQr = async (userId: string, zaloQrData: string, zaloId?: string) => {
    const targetUser = authorizedUsers.find((u) => (u.id || u.email) === userId);
    if (targetUser) {
      const updatedUser: AuthorizedUser = {
        ...targetUser,
        zaloQrData,
        zaloId: zaloId || targetUser.zaloId,
      };
      await saveAuthorizedUser(updatedUser);
      setAuthorizedUsers((prev) =>
        prev.map((u) => ((u.id || u.email) === userId ? updatedUser : u))
      );
    }
  };

  const handleLogout = async () => {
    if (currentUser) {
      await logoutUser();
    }
    setZaloUser(null);
    localStorage.removeItem('qlnt_zalo_session');
    setGuestMode(false);
  };

  // Data Update Handlers
  const handleUpdateAttendance = async (records: AttendanceRecord[]) => {
    await saveAttendanceRecords(records);
    setAttendanceMap((prev) => {
      const updated = { ...prev };
      records.forEach((r) => {
        updated[r.studentId] = r;
      });
      return updated;
    });
  };

  const handleSaveRoomSummary = async (summary: RoomSummary) => {
    await saveRoomSummary(summary);
    setRoomSummaries((prev) => ({
      ...prev,
      [summary.roomId]: summary,
    }));
  };

  // Night Study Attendance Handler (Independent)
  const handleSaveNightAttendance = async (records: NightStudyRecord[], summary?: NightRoomSummary) => {
    await saveNightAttendanceRecords(records);
    setNightAttendanceMap((prev) => {
      const updated = { ...prev };
      records.forEach((r) => {
        updated[r.studentId] = r;
      });
      return updated;
    });
    if (summary) {
      await saveNightRoomSummary(summary);
      setNightRoomSummaries((prev) => ({
        ...prev,
        [summary.roomId]: summary,
      }));
    }
  };

  const handleSaveStudent = async (student: Student) => {
    await saveStudent(student);
    setStudents((prev) => {
      const idx = prev.findIndex((s) => s.id === student.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = student;
        return copy;
      }
      return [...prev, student];
    });
  };

  const handleDeleteStudent = async (studentId: string) => {
    await deleteStudent(studentId);
    setStudents((prev) => prev.filter((s) => s.id !== studentId));
  };

  const handleResetSeedData = async () => {
    localStorage.removeItem('qlnt_students_v1');
    const newStudents: Student[] = [];
    for (let i = 0; i < SEED_STUDENTS.length; i++) {
      const item = SEED_STUDENTS[i];
      const studentId = `hs_${String(i + 1).padStart(3, '0')}`;
      const s: Student = {
        ...item,
        id: studentId,
        createdAt: new Date().toISOString(),
      };
      await saveStudent(s);
      newStudents.push(s);
    }
    setStudents(newStudents);
  };

  const handleSaveUser = async (user: AuthorizedUser) => {
    await saveAuthorizedUser(user);
    setAuthorizedUsers((prev) => {
      const idx = prev.findIndex((u) => u.email.toLowerCase() === user.email.toLowerCase());
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = user;
        return copy;
      }
      return [...prev, user];
    });
  };

  const handleDeleteUser = async (email: string) => {
    await deleteAuthorizedUser(email);
    setAuthorizedUsers((prev) => prev.filter((u) => u.email.toLowerCase() !== email.toLowerCase()));
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans">
      {/* Top Application Header */}
      <Header
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        currentUser={effectiveUser}
        authorizedInfo={authorizedInfo}
        onLogin={handleLogin}
        onOpenZaloLogin={() => setIsZaloModalOpen(true)}
        onLogout={handleLogout}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-5 space-y-5">
        {/* If user is logged in with an unauthorized email */}
        {currentUser && !isUserAuthorized && !guestMode && !zaloUser && (
          <div className="bg-rose-50 border border-rose-300 rounded-2xl p-6 shadow-sm text-rose-900 space-y-3">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-base">Tài khoản chưa được cấp quyền truy cập</h3>
                <p className="text-xs text-rose-700 mt-1">
                  Gmail <strong>{currentUser.email}</strong> chưa nằm trong danh sách giáo viên trực phòng được phê duyệt. Vui lòng liên hệ Quản trị viên (<strong>{INITIAL_ADMIN_EMAIL}</strong>) để được phân công phòng trực.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleLogout}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition"
              >
                Đăng xuất tài khoản này
              </button>
              <button
                onClick={() => setIsZaloModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition flex items-center gap-1.5"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Quét mã QR Zalo giáo viên</span>
              </button>
              <button
                onClick={() => setGuestMode(true)}
                className="bg-white hover:bg-rose-100 text-rose-800 border border-rose-300 text-xs font-semibold px-4 py-2 rounded-xl transition"
              >
                Trải nghiệm Demo
              </button>
            </div>
          </div>
        )}

        {/* If not logged in at all, show friendly prompt and quick login options */}
        {!effectiveUser && (
          <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base md:text-lg text-white">
                  Đăng nhập giáo viên trực phòng (Mã QR Zalo / Gmail)
                </h3>
              </div>
              <p className="text-xs text-emerald-200/90 max-w-2xl">
                Thầy cô có thể đưa <strong>mã QR Zalo cá nhân</strong> trước camera để đăng nhập tức thì hoặc đăng nhập bằng tài khoản Gmail được BGH cấp quyền.
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 flex-wrap">
              <PWAInstallButton variant="banner" />
              <button
                onClick={() => setIsZaloModalOpen(true)}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition transform active:scale-95 border border-blue-400"
              >
                <QrCode className="w-4 h-4" />
                <span>Quét QR Zalo</span>
              </button>
              <button
                onClick={handleLogin}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow transition"
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng nhập Gmail</span>
              </button>
              <button
                onClick={() => setGuestMode(true)}
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl transition"
                title="Xem thử với quyền Quản trị viên đầy đủ tính năng"
              >
                <span>Chế độ Demo</span>
              </button>
            </div>
          </div>
        )}

        {/* KPI Stat Summary Cards (Visible for day attendance & reports) */}
        {activeTab !== 'night_study' && (
          <StatSummaryCards
            stats={aggregatedStats}
            selectedFilter={selectedStatusFilter}
            onSelectFilter={(filter) => {
              setSelectedStatusFilter(filter);
              if (activeTab !== 'attendance' && activeTab !== 'report') {
                setActiveTab('attendance');
              }
            }}
          />
        )}

        {/* Tab 1: Daily Attendance */}
        {activeTab === 'attendance' && (
          <DailyAttendanceView
            currentDate={currentDate}
            students={students}
            attendanceMap={attendanceMap}
            onUpdateAttendance={handleUpdateAttendance}
            rooms={rooms}
            classes={classes}
            villages={villages}
            hamlets={hamlets}
            currentUser={effectiveUser}
            authorizedInfo={authorizedInfo}
            selectedStatusFilter={selectedStatusFilter}
            onClearStatusFilter={() => setSelectedStatusFilter('all')}
            roomSummaries={roomSummaries}
            onSaveRoomSummary={handleSaveRoomSummary}
          />
        )}

        {/* Tab 2: Independent Night Study Duty Attendance (25 Rooms) */}
        {activeTab === 'night_study' && (
          <NightStudyAttendanceView
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            students={students}
            rooms={rooms}
            currentUser={effectiveUser}
            authorizedInfo={authorizedInfo}
            isAdmin={isAdmin || guestMode}
            nightAttendanceMap={nightAttendanceMap}
            nightRoomSummaries={nightRoomSummaries}
            onSaveNightAttendance={handleSaveNightAttendance}
          />
        )}

        {/* Tab 2: Master Consolidated Report & Export */}
        {activeTab === 'report' && (
          <MasterReportView
            currentDate={currentDate}
            students={students}
            attendanceMap={attendanceMap}
            rooms={rooms}
            classes={classes}
            villages={villages}
            hamlets={hamlets}
            roomSummaries={roomSummaries}
            reporterName={authorizedInfo?.name || effectiveUser?.displayName || 'Ban Quản Lý Nội Trú'}
          />
        )}

        {/* Tab 3: Student Registry Management */}
        {activeTab === 'students' && (
          <StudentManagementView
            students={students}
            onSaveStudent={handleSaveStudent}
            onDeleteStudent={handleDeleteStudent}
            onResetSeedData={handleResetSeedData}
            rooms={rooms}
            classes={classes}
            villages={villages}
            hamlets={hamlets}
            canEdit={isUserAuthorized || guestMode || Boolean(authorizedInfo)}
          />
        )}

        {/* Tab 4: Teacher Permissions Management */}
        {activeTab === 'permissions' && (
          <PermissionsManagementView
            authorizedUsers={authorizedUsers}
            onSaveUser={handleSaveUser}
            onDeleteUser={handleDeleteUser}
            currentUserEmail={effectiveUser?.email}
            isAdmin={isAdmin || guestMode}
            rooms={rooms}
          />
        )}
      </main>

      {/* Zalo QR Code Login Modal */}
      <ZaloQrLoginModal
        isOpen={isZaloModalOpen}
        onClose={() => setIsZaloModalOpen(false)}
        authorizedUsers={authorizedUsers}
        onZaloLoginSuccess={handleZaloLoginSuccess}
        onLinkZaloQr={handleLinkZaloQr}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-2.5">
          <div className="text-left">
            <span className="font-semibold text-slate-800 block">
              Hệ thống Quản lý Học sinh Nội trú • Trường PTDTBT THCS Trà Đốc - TP Đà Nẵng
            </span>
            <span className="text-[11px] text-slate-400">
              Điểm danh hằng ngày • Báo suất ăn cuối tuần • Thống kê theo Phòng, Lớp, Thôn & Nóc
            </span>
          </div>

          <div className="flex items-center flex-wrap gap-2 text-[11px] text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="font-bold text-emerald-800 flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
              <span>Tương thích:</span>
            </span>
            <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200">Android</span>
            <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200">iOS (iPhone)</span>
            <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200">One UI (Samsung)</span>
            <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200">HyperOS (Xiaomi)</span>
            <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200">HarmonyOS (Huawei)</span>
            <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200">KaiOS (4G)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
