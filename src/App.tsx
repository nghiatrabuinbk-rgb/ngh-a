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
  syncPendingLocalDataToServer,
  isSameRoom,
  normalizeRoomName
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
  Smartphone,
  Building2,
  RefreshCw,
  LogOut
} from 'lucide-react';
import { LoginGate } from './components/LoginGate';

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
  const [roomConfigs, setRoomConfigs] = useState<RoomConfig[]>([]);
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
    const set = new Set<string>(listFromConfig);
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
      setRoomConfigs(configs || []);
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

    if (!currentUser) return null;

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
  }, [zaloUser, currentUser, authorizedUsers]);

  const effectiveUser = useMemo(() => {
    if (zaloUser) {
      return {
        email: zaloUser.email,
        displayName: zaloUser.name,
      };
    }
    return currentUser;
  }, [zaloUser, currentUser]);

  const isUserAuthorized = Boolean(authorizedInfo);
  const isAdmin = authorizedInfo?.role === 'admin';

  // Quyền truy cập các trạng thái theo phân quyền của Quản trị viên:
  // Cấp quyền trạng thái nào thì chỉ được xem và chỉnh sửa trạng thái đó, không được xem/sửa trạng thái khác
  const allowedTabs = useMemo<('attendance' | 'night_study' | 'competition' | 'room_duty' | 'report' | 'students' | 'permissions')[]>(() => {
    // Quản trị viên (BGH): Toàn quyền tất cả các trạng thái
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

    return ['room_duty'];
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
    } catch (err) {
      console.error('Login failed:', err);
      throw err;
    }
  };

  const handleZaloLoginSuccess = (user: AuthorizedUser) => {
    setZaloUser(user);
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
  };

  const handleSwitchAccount = async () => {
    await handleLogout();
    await handleLogin();
  };

  const handleRefreshAuthorizedUsers = async () => {
    try {
      const users = await fetchAuthorizedUsers();
      setAuthorizedUsers(users);
    } catch (err) {
      console.error('Refresh users failed:', err);
    }
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
      const affected = students.filter((s) => isSameRoom(s.room, roomName));
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
            isSameRoom(s.room, roomName)
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

  // 1. Initial auth state verification screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-950 flex flex-col items-center justify-center p-4 text-white font-sans">
        <div className="bg-slate-900/85 backdrop-blur-md border border-emerald-500/30 p-8 rounded-3xl max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto border border-emerald-400/30 animate-pulse">
            <Building2 className="w-8 h-8 text-emerald-300" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider font-extrabold text-amber-300 block">
              Trường PTDTBT THCS Trà Đốc - TP Đà Nẵng
            </span>
            <h2 className="text-base font-bold text-white mt-1">
              HỆ THỐNG QUẢN LÝ SĨ SỐ HỌC SINH NỘI TRÚ
            </h2>
          </div>
          <div className="flex items-center justify-center gap-2.5 text-xs text-emerald-200 pt-2">
            <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
            <span>Đang kiểm tra phiên đăng nhập Gmail cá nhân...</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Mandatory Login Gate: Everyone must sign in with personal Gmail
  if (!effectiveUser) {
    return (
      <>
        <LoginGate
          onLoginWithGoogle={handleLogin}
          onOpenZaloLogin={() => setIsZaloModalOpen(true)}
        />
        {isZaloModalOpen && (
          <ZaloQrLoginModal
            isOpen={isZaloModalOpen}
            onClose={() => setIsZaloModalOpen(false)}
            onZaloLoginSuccess={handleZaloLoginSuccess}
            authorizedUsers={authorizedUsers}
          />
        )}
      </>
    );
  }

  // 3. User is logged in with Gmail, but not yet authorized by Admin in authorized_users
  if (effectiveUser && !isUserAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 flex flex-col justify-between text-white selection:bg-rose-500 selection:text-white font-sans">
        <header className="border-b border-rose-900/40 bg-slate-900/70 backdrop-blur-md sticky top-0 z-20">
          <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500/20 rounded-xl border border-rose-400/30 shadow-inner">
                <Building2 className="w-6 h-6 text-rose-300" />
              </div>
              <div>
                <span className="text-[11px] sm:text-xs uppercase tracking-wider font-extrabold text-rose-300 block">
                  Trường PTDTBT THCS Trà Đốc - TP Đà Nẵng
                </span>
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-white">
                  HỆ THỐNG QUẢN LÝ SĨ SỐ HỌC SINH NỘI TRÚ
                </h1>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-rose-200 hover:text-white transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="max-w-lg w-full mx-auto bg-slate-900/90 backdrop-blur-xl border border-rose-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 text-center">
            <div className="w-16 h-16 bg-rose-500/20 border border-rose-500/40 rounded-2xl flex items-center justify-center mx-auto text-rose-400 shadow-inner">
              <ShieldAlert className="w-9 h-9" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Tài Khoản Gmail Chưa Được Phân Quyền
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-2">
                Thầy cô đã đăng nhập thành công với tài khoản Gmail:
              </p>
              <div className="mt-2 inline-block px-3.5 py-1.5 rounded-xl bg-slate-800 border border-rose-400/40 text-amber-300 font-bold text-sm tracking-wide">
                {effectiveUser.email}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-950/50 border border-rose-900/60 text-xs text-rose-200 text-left space-y-2 leading-relaxed">
              <p>
                Tài khoản này hiện chưa nằm trong danh sách giáo viên được Ban Giám Hiệu cấp quyền sử dụng các chức năng quản lý nội trú.
              </p>
              <p>
                Vui lòng liên hệ Thầy Nghĩa (BGH - Quản trị viên: <strong className="text-white">{INITIAL_ADMIN_EMAIL}</strong>) để được phân công phòng trực và kích hoạt quyền.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleRefreshAuthorizedUsers}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-xl shadow transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Kiểm tra lại quyền</span>
              </button>
              <button
                type="button"
                onClick={handleSwitchAccount}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs sm:text-sm px-5 py-3 rounded-xl shadow transition cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Đổi tài khoản Gmail khác</span>
              </button>
            </div>
          </div>
        </main>

        <footer className="py-4 border-t border-slate-900 text-center text-xs text-slate-500">
          © 2026 Trường PTDTBT THCS Trà Đốc - TP Đà Nẵng
        </footer>
      </div>
    );
  }

  // 4. Authenticated & Authorized view: Full Boarding Management Application
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
            isAdmin={isAdmin}
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
            canEdit={isUserAuthorized || Boolean(authorizedInfo)}
            isAdmin={isAdmin}
          />
        )}

        {/* Tab 7: Teacher Permissions Management */}
        {activeTab === 'permissions' && allowedTabs.includes('permissions') && (
          <PermissionsManagementView
            authorizedUsers={authorizedUsers}
            onSaveUser={handleSaveUser}
            onDeleteUser={handleDeleteUser}
            currentUserEmail={effectiveUser?.email}
            isAdmin={isAdmin}
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
