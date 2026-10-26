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
  NightRoomSummary,
  RoomConfig
} from './types';
import { 
  INITIAL_ROOMS, 
  INITIAL_CLASSES, 
  INITIAL_VILLAGES, 
  INITIAL_HAMLETS, 
  INITIAL_ADMIN_EMAIL,
  SEED_STUDENTS,
  DEFAULT_ROOM_CONFIGS
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
  saveNightRoomSummary,
  fetchRoomConfigs,
  saveRoomConfig,
  deleteRoomConfig,
  deleteMultipleRoomConfigs,
  resetRoomConfigs,
  clearAllStudents,
  saveStudentsBatch,
  subscribeToStudents,
  subscribeToRoomConfigs,
  subscribeToAttendanceForDate,
  subscribeToRoomSummaries,
  subscribeToNightAttendanceForDate,
  subscribeToNightRoomSummaries,
  syncPendingLocalDataToServer
} from './services/dataService';
import { Header } from './components/Header';
import { StatSummaryCards } from './components/StatSummaryCards';
import { DailyAttendanceView } from './components/DailyAttendanceView';
import { NightStudyAttendanceView } from './components/NightStudyAttendanceView';
import { CompetitionScoringView } from './components/CompetitionScoringView';
import { RoomDutyAttendanceView } from './components/RoomDutyAttendanceView';
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
  const [activeTab, setActiveTab] = useState<'attendance' | 'night_study' | 'competition' | 'room_duty' | 'report' | 'students' | 'permissions'>('attendance');

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

  // Shared room param from URL: e.g. ?room=Phòng%20Nam%2001
  const [sharedRoomParam, setSharedRoomParam] = useState<string>('ALL');
  const [serverSyncStatus, setServerSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('');

  // App data states (Day Attendance)
  const [students, setStudents] = useState<Student[]>([]);
  const [roomConfigs, setRoomConfigs] = useState<RoomConfig[]>(DEFAULT_ROOM_CONFIGS);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceRecord>>({});
  const [roomSummaries, setRoomSummaries] = useState<Record<string, RoomSummary>>({});

  // Night Study Attendance States (Independent)
  const [nightAttendanceMap, setNightAttendanceMap] = useState<Record<string, NightStudyRecord>>({});
  const [nightRoomSummaries, setNightRoomSummaries] = useState<Record<string, NightRoomSummary>>({});

  const [authorizedUsers, setAuthorizedUsers] = useState<AuthorizedUser[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Master dynamic lists (derived from roomConfigs + any rooms present in students)
  const rooms = useMemo(() => {
    const listFromConfig = roomConfigs.map((r) => r.name);
    const set = new Set<string>(listFromConfig.length > 0 ? listFromConfig : INITIAL_ROOMS);
    students.forEach((s) => {
      if (s.room && s.room.trim()) set.add(s.room.trim());
    });
    return Array.from(set).sort((a, b) => {
      // Keep natural order of rooms (Phòng Nam 01..12 then Phòng Nữ 13..25)
      const confA = roomConfigs.find((r) => r.name === a);
      const confB = roomConfigs.find((r) => r.name === b);
      if (confA?.order && confB?.order) {
        return confA.order - confB.order;
      }
      return a.localeCompare(b, 'vi', { numeric: true });
    });
  }, [roomConfigs, students]);

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

  // Test connection on boot & check URL search params & auth listener
  useEffect(() => {
    testFirestoreConnection();

    try {
      const params = new URLSearchParams(window.location.search);
      const urlDate = params.get('date');
      const urlTab = params.get('tab');
      const urlRoom = params.get('room');

      if (urlDate && /^\d{4}-\d{2}-\d{2}$/.test(urlDate)) {
        setCurrentDate(urlDate);
      }
      if (urlTab && ['attendance', 'night_study', 'competition', 'room_duty', 'report', 'students', 'permissions'].includes(urlTab)) {
        setActiveTab(urlTab as any);
      }
      if (urlRoom && urlRoom.trim()) {
        setSharedRoomParam(urlRoom.trim());
      }
    } catch (e) {
      console.warn('URL parsing error:', e);
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load authorized users and sync any pending offline local data to server on startup
  useEffect(() => {
    async function loadInitialData() {
      setLoadingData(true);
      try {
        const users = await fetchAuthorizedUsers();
        setAuthorizedUsers(users);

        // Auto sync pending offline records to Firestore server
        setServerSyncStatus('syncing');
        await syncPendingLocalDataToServer();
        setServerSyncStatus('synced');
        setLastSyncedTime(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
      } catch (err) {
        console.error('Error loading initial data:', err);
      } finally {
        setLoadingData(false);
      }
    }

    loadInitialData();
  }, []);

  // Real-time subscription for students and room configs
  useEffect(() => {
    const unsubStudents = subscribeToStudents((list) => {
      setStudents(list);
      setLoadingData(false);
    });

    const unsubRooms = subscribeToRoomConfigs((configs) => {
      if (configs && configs.length > 0) {
        setRoomConfigs(configs);
      }
    });

    return () => {
      unsubStudents();
      unsubRooms();
    };
  }, []);

  // Real-time subscription for day and night attendance & summaries for selected date
  useEffect(() => {
    setServerSyncStatus('syncing');

    const unsubAttendance = subscribeToAttendanceForDate(currentDate, (map) => {
      setAttendanceMap(map);
      setServerSyncStatus('synced');
      setLastSyncedTime(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
    });

    const unsubSummaries = subscribeToRoomSummaries(currentDate, (map) => {
      setRoomSummaries(map);
    });

    const unsubNightAtt = subscribeToNightAttendanceForDate(currentDate, (map) => {
      setNightAttendanceMap(map);
    });

    const unsubNightSum = subscribeToNightRoomSummaries(currentDate, (map) => {
      setNightRoomSummaries(map);
    });

    return () => {
      unsubAttendance();
      unsubSummaries();
      unsubNightAtt();
      unsubNightSum();
    };
  }, [currentDate]);

  const handleForceSyncToServer = async () => {
    setServerSyncStatus('syncing');
    try {
      await syncPendingLocalDataToServer();
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
      setServerSyncStatus('synced');
      setLastSyncedTime(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.warn('Manual sync error:', err);
      setServerSyncStatus('synced');
    }
  };

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
  const isAdmin = authorizedInfo?.role === 'admin' || guestMode;

  // Quyền truy cập các trạng thái theo phân quyền của Quản trị viên:
  // Cấp quyền trạng thái nào thì chỉ được xem và chỉnh sửa trạng thái đó, không được xem/sửa trạng thái khác
  const allowedTabs = useMemo<('attendance' | 'night_study' | 'competition' | 'room_duty' | 'report' | 'students' | 'permissions')[]>(() => {
    // Quản trị viên (BGH / Demo Admin): Toàn quyền tất cả các trạng thái
    if (isAdmin) {
      return ['attendance', 'night_study', 'competition', 'room_duty', 'report', 'students', 'permissions'];
    }

    // Giáo viên đăng nhập bằng Gmail / Zalo QR: chỉ được xem và sửa trạng thái đã cấp
    if (authorizedInfo) {
      const granted = authorizedInfo.allowedModules;
      if (granted && granted.length > 0) {
        return granted;
      }
      return ['room_duty'];
    }

    // Khi chưa đăng nhập (khách xem demo ban đầu)
    return ['attendance', 'night_study', 'competition', 'room_duty'];
  }, [isAdmin, authorizedInfo]);

  // Tự động chuyển về trạng thái được cấp phép nếu trạng thái hiện tại không có quyền
  useEffect(() => {
    if (effectiveUser && !allowedTabs.includes(activeTab)) {
      if (allowedTabs.length > 0) {
        setActiveTab(allowedTabs[0]);
      }
    }
  }, [effectiveUser, allowedTabs, activeTab]);

  // Compute Aggregated Statistics
  const aggregatedStats = useMemo<AggregatedStats>(() => {
    const activeStudents = students.filter((s) => s.status === 'active');
    let present = 0;
    let skippedClass = 0;
    let ateNoClass = 0;
    let notAtSchool = 0;
    let leaveExcused = 0;
    let leaveUnexcused = 0;
    let stayWeekend = 0;

    activeStudents.forEach((s) => {
      const record = attendanceMap[s.id];
      const status = record?.status || 'present';
      if (status === 'present') present++;
      else if (status === 'skipped_class') skippedClass++;
      else if (status === 'ate_no_class') ateNoClass++;
      else if (status === 'not_at_school_this_week') notAtSchool++;
      else if (status === 'leave_excused') leaveExcused++;
      else if (status === 'leave_unexcused') leaveUnexcused++;
      if (record?.stayWeekend) stayWeekend++;
    });

    return {
      total: activeStudents.length,
      present,
      skippedClass,
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

  const handleClearAllStudents = async () => {
    await clearAllStudents();
    setStudents([]);
    setAttendanceMap({});
    setRoomSummaries({});
    setNightAttendanceMap({});
    setNightRoomSummaries({});
  };

  const handleSaveBatchStudents = async (newStudents: Student[], replaceRoom?: string) => {
    const updated = await saveStudentsBatch(newStudents, replaceRoom);
    setStudents(updated);
  };

  const handleSaveRoomConfig = async (room: RoomConfig) => {
    await saveRoomConfig(room);
    setRoomConfigs((prev) => {
      const idx = prev.findIndex((r) => r.id === room.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = room;
        return copy;
      }
      return [...prev, room];
    });
  };

  const handleDeleteRoomConfig = async (roomId: string, targetNewRoomForStudents?: string) => {
    const roomToDelete = roomConfigs.find((r) => r.id === roomId);
    const roomName = roomToDelete?.name;

    await deleteRoomConfig(roomId);
    setRoomConfigs((prev) => prev.filter((r) => r.id !== roomId));

    if (roomName) {
      const destination = targetNewRoomForStudents || 'Chưa xếp phòng';
      const affected = students.filter((s) => s.room === roomName);
      if (affected.length > 0) {
        for (const st of affected) {
          await saveStudent({
            ...st,
            room: destination,
            bedNumber: destination === 'Chưa xếp phòng' ? '' : st.bedNumber,
          });
        }
        setStudents((prev) =>
          prev.map((s) =>
            s.room === roomName
              ? {
                  ...s,
                  room: destination,
                  bedNumber: destination === 'Chưa xếp phòng' ? '' : s.bedNumber,
                }
              : s
          )
        );
      }
    }
  };

  const handleDeleteMultipleRoomConfigs = async (roomIds: string[], targetNewRoomForStudents?: string) => {
    const roomsToDelete = roomConfigs.filter((r) => roomIds.includes(r.id));
    const roomNamesToDelete = new Set(roomsToDelete.map((r) => r.name));

    await deleteMultipleRoomConfigs(roomIds);
    setRoomConfigs((prev) => prev.filter((r) => !roomIds.includes(r.id)));

    const destination = targetNewRoomForStudents || 'Chưa xếp phòng';
    const affected = students.filter((s) => roomNamesToDelete.has(s.room));
    if (affected.length > 0) {
      for (const st of affected) {
        await saveStudent({
          ...st,
          room: destination,
          bedNumber: destination === 'Chưa xếp phòng' ? '' : st.bedNumber,
        });
      }
      setStudents((prev) =>
        prev.map((s) =>
          roomNamesToDelete.has(s.room)
            ? {
                ...s,
                room: destination,
                bedNumber: destination === 'Chưa xếp phòng' ? '' : s.bedNumber,
              }
            : s
        )
      );
    }
  };

  const handleResetRoomConfigs = async () => {
    const configs = await resetRoomConfigs();
    setRoomConfigs(configs);
  };

  const handleResetSeedData = async () => {
    await handleClearAllStudents();
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
        isAdmin={isAdmin}
        allowedTabs={allowedTabs}
        onLogin={handleLogin}
        onOpenZaloLogin={() => setIsZaloModalOpen(true)}
        onLogout={handleLogout}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        serverSyncStatus={serverSyncStatus}
        lastSyncedTime={lastSyncedTime}
        onForceSync={handleForceSyncToServer}
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
        {/* Access Denied Notice when logged-in teacher tries to access an unauthorized status */}
        {effectiveUser && !allowedTabs.includes(activeTab) && (
          <div className="bg-white rounded-2xl p-8 border border-rose-300 text-center max-w-lg mx-auto shadow-sm space-y-4 my-8">
            <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Bạn không có quyền xem hoặc chỉnh sửa trạng thái này</h3>
            <p className="text-xs text-slate-600">
              Tài khoản Gmail <strong>{effectiveUser.email}</strong> chỉ được quản trị viên cấp quyền thao tác ở trạng thái:
            </p>
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              {allowedTabs.map((t) => {
                const nameMap: Record<string, string> = {
                  attendance: 'Điểm danh của GVCN',
                  night_study: 'Điểm danh tự học đêm',
                  competition: 'Chấm điểm thi đua',
                  room_duty: 'Theo dõi & điểm danh GV trực phòng',
                  report: 'Tổng hợp báo cáo',
                  students: 'Danh sách học sinh',
                  permissions: 'Phân quyền',
                };
                return (
                  <span key={t} className="bg-emerald-100 text-emerald-900 font-bold px-3 py-1 rounded-xl text-xs border border-emerald-300">
                    ✓ {nameMap[t] || t}
                  </span>
                );
              })}
            </div>
            <div className="pt-2">
              <button
                onClick={() => setActiveTab(allowedTabs[0])}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow cursor-pointer"
              >
                Chuyển đến trạng thái được cấp phép của bạn
              </button>
            </div>
          </div>
        )}

        {/* KPI Stat Summary Cards (Visible only when allowed to view attendance or report) */}
        {activeTab !== 'night_study' && activeTab !== 'competition' && activeTab !== 'room_duty' && allowedTabs.includes(activeTab) && (
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

        {/* Tab 1: Daily Attendance (Điểm danh của GVCN) */}
        {activeTab === 'attendance' && allowedTabs.includes('attendance') && (
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
            initialRoom={sharedRoomParam}
            onForceSyncToServer={handleForceSyncToServer}
          />
        )}

        {/* Tab 2: Independent Night Study Duty Attendance (25 Rooms) */}
        {activeTab === 'night_study' && allowedTabs.includes('night_study') && (
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
            initialRoom={sharedRoomParam}
            onForceSyncToServer={handleForceSyncToServer}
          />
        )}

        {/* Tab 3: Chấm Điểm Thi Đua Phòng Ở (25 Phòng, 12 Nam & 13 Nữ) */}
        {activeTab === 'competition' && allowedTabs.includes('competition') && (
          <CompetitionScoringView
            currentDate={currentDate}
            currentUser={effectiveUser}
            authorizedInfo={authorizedInfo}
            roomsList={rooms}
            students={students}
            attendanceMap={attendanceMap}
            roomSummaries={roomSummaries}
            nightAttendanceMap={nightAttendanceMap}
            nightRoomSummaries={nightRoomSummaries}
            isAdmin={isAdmin}
          />
        )}

        {/* Tab 4: Theo Dõi Và Điểm Danh Của Giáo Viên Trực Phòng (Nằm giữa Chấm điểm thi đua và Tổng hợp báo cáo & Xuất file) */}
        {activeTab === 'room_duty' && allowedTabs.includes('room_duty') && (
          <RoomDutyAttendanceView
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            students={students}
            attendanceMap={attendanceMap}
            onUpdateAttendance={handleUpdateAttendance}
            rooms={rooms}
            classes={classes}
            villages={villages}
            hamlets={hamlets}
            currentUser={effectiveUser}
            authorizedInfo={authorizedInfo}
            roomSummaries={roomSummaries}
            onSaveRoomSummary={handleSaveRoomSummary}
            roomConfigs={roomConfigs}
            initialRoom={sharedRoomParam}
            onForceSyncToServer={handleForceSyncToServer}
          />
        )}

        {/* Tab 5: Master Consolidated Report & Export */}
        {activeTab === 'report' && allowedTabs.includes('report') && (
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

        {/* Tab 6: Student Registry Management */}
        {activeTab === 'students' && allowedTabs.includes('students') && (
          <StudentManagementView
            students={students}
            onSaveStudent={handleSaveStudent}
            onDeleteStudent={handleDeleteStudent}
            onResetSeedData={handleResetSeedData}
            onClearAllStudents={handleClearAllStudents}
            onSaveBatchStudents={handleSaveBatchStudents}
            roomConfigs={roomConfigs}
            onSaveRoomConfig={handleSaveRoomConfig}
            onDeleteRoomConfig={handleDeleteRoomConfig}
            onDeleteMultipleRoomConfigs={handleDeleteMultipleRoomConfigs}
            onResetRoomConfigs={handleResetRoomConfigs}
            rooms={rooms}
            classes={classes}
            villages={villages}
            hamlets={hamlets}
            canEdit={isUserAuthorized || guestMode || Boolean(authorizedInfo)}
            isAdmin={isAdmin || guestMode}
          />
        )}

        {/* Tab 7: Teacher Permissions Management */}
        {activeTab === 'permissions' && allowedTabs.includes('permissions') && (
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
              Điểm danh của GVCN • Báo suất ăn cuối tuần • Thống kê theo Phòng, Lớp, Thôn & Nóc
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
