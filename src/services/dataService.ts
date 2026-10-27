import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  Student, 
  AttendanceRecord, 
  RoomSummary, 
  AuthorizedUser, 
  NightStudyRecord, 
  NightRoomSummary, 
  RoomConfig,
  CompetitionCriterion,
  CompetitionDepartment,
  CompetitionRoomEvaluation,
  CompetitionDeductionRules,
  RoomCompetitionBonus
} from '../types';
import { 
  SEED_STUDENTS, 
  INITIAL_ADMIN_EMAIL, 
  DEFAULT_TEACHERS_LIST, 
  DEFAULT_ROOM_CONFIGS,
  DEFAULT_COMPETITION_CRITERIA,
  DEFAULT_COMPETITION_DEPARTMENTS
} from '../mockData';

const STUDENTS_COL = 'students';
const ATTENDANCE_COL = 'attendance_records';
const ROOM_SUMMARIES_COL = 'room_summaries';
const AUTHORIZED_USERS_COL = 'authorized_users';
const NIGHT_ATTENDANCE_COL = 'night_study_attendance';
const NIGHT_SUMMARIES_COL = 'night_room_summaries';
const ROOM_CONFIGS_COL = 'room_configs';
const COMPETITION_CRITERIA_COL = 'competition_criteria';
const COMPETITION_DEPARTMENTS_COL = 'competition_departments';
const COMPETITION_EVALUATIONS_COL = 'competition_evaluations';
const COMPETITION_RULES_COL = 'competition_deduction_rules';
const COMPETITION_BONUSES_COL = 'competition_room_bonuses';

// In-memory / localStorage sync fallback in case network issues or offline
const LOCAL_STORAGE_KEY_STUDENTS = 'qlnt_students_v1';
const LOCAL_STORAGE_KEY_ATTENDANCE = 'qlnt_attendance_v1';
const LOCAL_STORAGE_KEY_SUMMARIES = 'qlnt_summaries_v1';
const LOCAL_STORAGE_KEY_USERS = 'qlnt_users_v1';
const LOCAL_STORAGE_KEY_NIGHT_ATTENDANCE = 'qlnt_night_attendance_v1';
const LOCAL_STORAGE_KEY_NIGHT_SUMMARIES = 'qlnt_night_summaries_v1';
const LOCAL_STORAGE_KEY_ROOMS = 'qlnt_room_configs_v1';
const LOCAL_STORAGE_KEY_COMPETITION_CRITERIA = 'qlnt_competition_criteria_v1';
const LOCAL_STORAGE_KEY_COMPETITION_DEPTS = 'qlnt_competition_departments_v1';
const LOCAL_STORAGE_KEY_COMPETITION_EVALS = 'qlnt_competition_evaluations_v1';
const LOCAL_STORAGE_KEY_COMPETITION_RULES = 'qlnt_competition_rules_v1';
const LOCAL_STORAGE_KEY_COMPETITION_BONUSES = 'qlnt_competition_bonuses_v1';
const LOCAL_STORAGE_FLAG_CLEARED = 'qlnt_students_cleared_flag';

// One-time client purge: ensure all client devices wipe local students and attendance cache
if (typeof window !== 'undefined') {
  try {
    const PURGE_KEY = 'qlnt_purge_v8_clean_slate_all';
    if (!localStorage.getItem(PURGE_KEY)) {
      localStorage.setItem(LOCAL_STORAGE_KEY_STUDENTS, JSON.stringify([]));
      localStorage.setItem(LOCAL_STORAGE_KEY_ATTENDANCE, JSON.stringify({}));
      localStorage.setItem(LOCAL_STORAGE_KEY_SUMMARIES, JSON.stringify({}));
      localStorage.setItem(LOCAL_STORAGE_KEY_NIGHT_ATTENDANCE, JSON.stringify({}));
      localStorage.setItem(LOCAL_STORAGE_KEY_NIGHT_SUMMARIES, JSON.stringify({}));
      localStorage.setItem(LOCAL_STORAGE_FLAG_CLEARED, 'true');
      localStorage.setItem(PURGE_KEY, 'true');
    }
  } catch (e) {
    console.warn('Storage purge warning:', e);
  }
}

export const DEFAULT_COMPETITION_DEDUCTION_RULES: CompetitionDeductionRules = {
  dayLeaveUnexcusedRate: 5,   // 1 HS vắng không phép trừ 5 điểm (2 HS = 10 điểm)
  daySkippedClassRate: 5,     // 1 HS bỏ tiết trừ 5 điểm (2 HS = 10 điểm)
  dayAteNoClassRate: 10,      // lên ăn không đi học trừ 10 điểm
  nightLeaveUnexcusedRate: 5, // Tự học đêm vắng không phép trừ 5 điểm
  maxBonusPointsLimit: 100,   // Quản trị viên tùy chọn định mức 100 điểm
};

// Bản đồ chuyển đổi số phòng khu Nữ từ 01..13 sang 13..25 theo yêu cầu người dùng
export const OLD_FEMALE_ROOM_NAME_MAP: Record<string, string> = {};

export async function fetchAuthorizedUsers(): Promise<AuthorizedUser[]> {
  try {
    const snap = await getDocs(collection(db, AUTHORIZED_USERS_COL));
    const list: AuthorizedUser[] = [];
    snap.forEach(d => {
      const data = d.data() as AuthorizedUser;
      const assigned = data.assignedRooms?.map(r => OLD_FEMALE_ROOM_NAME_MAP[r] || r) || [];
      const modules = data.allowedModules && data.allowedModules.length > 0
        ? data.allowedModules
        : (data.role === 'admin' ? ['attendance', 'night_study', 'competition', 'room_duty'] : ['room_duty']);
      list.push({ ...data, id: d.id, assignedRooms: assigned, allowedModules: modules as any });
    });

    if (list.length === 0) {
      // Seed default admin and initial teachers with Zalo QR data
      for (const t of DEFAULT_TEACHERS_LIST) {
        await saveAuthorizedUser({ ...t, createdAt: new Date().toISOString() });
      }
      return DEFAULT_TEACHERS_LIST;
    }
    return list;
  } catch (error) {
    console.warn('Falling back to local storage for users:', error);
    const local = localStorage.getItem(LOCAL_STORAGE_KEY_USERS);
    if (local) {
      const parsed: AuthorizedUser[] = JSON.parse(local);
      return parsed.map(u => ({
        ...u,
        assignedRooms: u.assignedRooms?.map(r => OLD_FEMALE_ROOM_NAME_MAP[r] || r) || [],
        allowedModules: u.allowedModules && u.allowedModules.length > 0
          ? u.allowedModules
          : (u.role === 'admin' ? ['attendance', 'night_study', 'competition', 'room_duty'] : ['room_duty']),
      }));
    }
    return DEFAULT_TEACHERS_LIST;
  }
}

export async function saveAuthorizedUser(user: AuthorizedUser): Promise<void> {
  const docId = user.email.toLowerCase().trim();
  try {
    await setDoc(doc(db, AUTHORIZED_USERS_COL, docId), {
      ...user,
      email: user.email.toLowerCase().trim(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Save user to Firestore failed, saving local:', error);
  }
  // Also update local cache
  const local = localStorage.getItem(LOCAL_STORAGE_KEY_USERS);
  let list: AuthorizedUser[] = local ? JSON.parse(local) : [];
  list = list.filter(u => u.email.toLowerCase() !== docId);
  list.push(user);
  localStorage.setItem(LOCAL_STORAGE_KEY_USERS, JSON.stringify(list));
}

export async function deleteAuthorizedUser(email: string): Promise<void> {
  const docId = email.toLowerCase().trim();
  try {
    await deleteDoc(doc(db, AUTHORIZED_USERS_COL, docId));
  } catch (error) {
    console.warn('Delete user from Firestore failed:', error);
  }
  const local = localStorage.getItem(LOCAL_STORAGE_KEY_USERS);
  if (local) {
    let list: AuthorizedUser[] = JSON.parse(local);
    list = list.filter(u => u.email.toLowerCase() !== docId);
    localStorage.setItem(LOCAL_STORAGE_KEY_USERS, JSON.stringify(list));
  }
}

export async function fetchStudents(): Promise<Student[]> {
  try {
    const snap = await getDocs(collection(db, STUDENTS_COL));
    const list: Student[] = [];
    snap.forEach(d => {
      const data = d.data() as Student;
      list.push({ ...data, id: d.id });
    });

    localStorage.setItem(LOCAL_STORAGE_KEY_STUDENTS, JSON.stringify(list));
    return list;
  } catch (error) {
    console.warn('Fetch students error, reading local cache:', error);
    const local = localStorage.getItem(LOCAL_STORAGE_KEY_STUDENTS);
    if (local) {
      try {
        return JSON.parse(local);
      } catch {
        return [];
      }
    }
    return [];
  }
}

export function subscribeToStudents(
  onData: (students: Student[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, STUDENTS_COL),
    (snap) => {
      const list: Student[] = [];
      snap.forEach(d => {
        const data = d.data() as Student;
        list.push({ ...data, id: d.id });
      });

      localStorage.setItem(LOCAL_STORAGE_KEY_STUDENTS, JSON.stringify(list));
      onData(list);
    },
    (error) => {
      console.warn('Realtime students subscription error:', error);
      if (onError) onError(error);
    }
  );
}

export async function clearAllStudents(): Promise<void> {
  localStorage.setItem(LOCAL_STORAGE_FLAG_CLEARED, 'true');
  localStorage.setItem(LOCAL_STORAGE_KEY_STUDENTS, JSON.stringify([]));
  localStorage.setItem(LOCAL_STORAGE_KEY_ATTENDANCE, JSON.stringify({}));
  localStorage.setItem(LOCAL_STORAGE_KEY_SUMMARIES, JSON.stringify({}));
  localStorage.setItem(LOCAL_STORAGE_KEY_NIGHT_ATTENDANCE, JSON.stringify({}));
  localStorage.setItem(LOCAL_STORAGE_KEY_NIGHT_SUMMARIES, JSON.stringify({}));

  try {
    const [studentsSnap, attSnap, sumSnap, nightAttSnap, nightSumSnap] = await Promise.all([
      getDocs(collection(db, STUDENTS_COL)),
      getDocs(collection(db, ATTENDANCE_COL)),
      getDocs(collection(db, ROOM_SUMMARIES_COL)),
      getDocs(collection(db, NIGHT_ATTENDANCE_COL)),
      getDocs(collection(db, NIGHT_SUMMARIES_COL)),
    ]);

    const delPromises = [
      ...studentsSnap.docs.map(d => deleteDoc(doc(db, STUDENTS_COL, d.id))),
      ...attSnap.docs.map(d => deleteDoc(doc(db, ATTENDANCE_COL, d.id))),
      ...sumSnap.docs.map(d => deleteDoc(doc(db, ROOM_SUMMARIES_COL, d.id))),
      ...nightAttSnap.docs.map(d => deleteDoc(doc(db, NIGHT_ATTENDANCE_COL, d.id))),
      ...nightSumSnap.docs.map(d => deleteDoc(doc(db, NIGHT_SUMMARIES_COL, d.id))),
    ];
    await Promise.all(delPromises);
  } catch (error) {
    console.warn('Clear all students and attendance from Firestore failed:', error);
  }
}

export async function saveStudentsBatch(
  newStudents: Student[],
  replaceRoom?: string
): Promise<Student[]> {
  localStorage.removeItem(LOCAL_STORAGE_FLAG_CLEARED);

  const local = localStorage.getItem(LOCAL_STORAGE_KEY_STUDENTS);
  let currentStudents: Student[] = local ? JSON.parse(local) : [];

  if (replaceRoom) {
    // Delete students of this room from Firestore and local
    currentStudents = currentStudents.filter(s => s.room !== replaceRoom);
    try {
      const q = query(collection(db, STUDENTS_COL), where('room', '==', replaceRoom));
      const snap = await getDocs(q);
      const delPromises = snap.docs.map(d => deleteDoc(doc(db, STUDENTS_COL, d.id)));
      await Promise.all(delPromises);
    } catch (err) {
      console.warn('Batch delete old room students failed:', err);
    }
  }

  for (const s of newStudents) {
    const idx = currentStudents.findIndex(item => item.id === s.id);
    if (idx >= 0) {
      currentStudents[idx] = s;
    } else {
      currentStudents.push(s);
    }
    try {
      await setDoc(doc(db, STUDENTS_COL, s.id), {
        ...s,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Batch save student failed for', s.id, e);
    }
  }

  localStorage.setItem(LOCAL_STORAGE_KEY_STUDENTS, JSON.stringify(currentStudents));
  return currentStudents;
}

export async function saveStudent(student: Student): Promise<void> {
  localStorage.removeItem(LOCAL_STORAGE_FLAG_CLEARED);
  try {
    await setDoc(doc(db, STUDENTS_COL, student.id), {
      ...student,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Failed saving student to Firestore:', error);
  }
  const local = localStorage.getItem(LOCAL_STORAGE_KEY_STUDENTS);
  let list: Student[] = local ? JSON.parse(local) : [];
  const idx = list.findIndex(s => s.id === student.id);
  if (idx >= 0) {
    list[idx] = student;
  } else {
    list.push(student);
  }
  localStorage.setItem(LOCAL_STORAGE_KEY_STUDENTS, JSON.stringify(list));
}

export async function deleteStudent(studentId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, STUDENTS_COL, studentId));
  } catch (error) {
    console.warn('Delete student Firestore error:', error);
  }
  const local = localStorage.getItem(LOCAL_STORAGE_KEY_STUDENTS);
  if (local) {
    let list: Student[] = JSON.parse(local);
    list = list.filter(s => s.id !== studentId);
    localStorage.setItem(LOCAL_STORAGE_KEY_STUDENTS, JSON.stringify(list));
  }
}

export async function fetchRoomConfigs(): Promise<RoomConfig[]> {
  try {
    const snap = await getDocs(collection(db, ROOM_CONFIGS_COL));
    const list: RoomConfig[] = [];
    snap.forEach(d => {
      list.push({ ...(d.data() as RoomConfig), id: d.id });
    });

    if (list.length === 0) {
      for (const r of DEFAULT_ROOM_CONFIGS) {
        await setDoc(doc(db, ROOM_CONFIGS_COL, r.id), r);
      }
      localStorage.setItem(LOCAL_STORAGE_KEY_ROOMS, JSON.stringify(DEFAULT_ROOM_CONFIGS));
      return DEFAULT_ROOM_CONFIGS;
    }

    // Check if migration from 01..13 to 13..25 is needed
    const needsMigration = list.some(r => r.name === 'Phòng Nữ 01' || r.id === 'phong_nu_01' || (r.name.startsWith('Phòng Nữ 0')));
    if (needsMigration) {
      const migratedList: RoomConfig[] = [];
      for (const r of list) {
        if (OLD_FEMALE_ROOM_NAME_MAP[r.name]) {
          const newName = OLD_FEMALE_ROOM_NAME_MAP[r.name];
          const num = parseInt(newName.match(/\d+/)?.[0] || '13', 10);
          const newId = `phong_nu_${num}`;
          const updated: RoomConfig = {
            ...r,
            id: newId,
            name: newName,
            gender: 'Nữ',
            order: num,
          };
          if (r.id !== newId) {
            deleteDoc(doc(db, ROOM_CONFIGS_COL, r.id)).catch(() => {});
          }
          setDoc(doc(db, ROOM_CONFIGS_COL, newId), updated).catch(() => {});
          migratedList.push(updated);
        } else {
          migratedList.push(r);
        }
      }
      migratedList.sort((a, b) => (a.order || 0) - (b.order || 0));
      localStorage.setItem(LOCAL_STORAGE_KEY_ROOMS, JSON.stringify(migratedList));
      return migratedList;
    }

    list.sort((a, b) => (a.order || 0) - (b.order || 0));
    localStorage.setItem(LOCAL_STORAGE_KEY_ROOMS, JSON.stringify(list));
    return list;
  } catch (error) {
    console.warn('Fetch room configs fallback:', error);
    const local = localStorage.getItem(LOCAL_STORAGE_KEY_ROOMS);
    if (local) {
      let parsed: RoomConfig[] = JSON.parse(local);
      const needsMigration = parsed.some(r => r.name === 'Phòng Nữ 01' || r.id === 'phong_nu_01' || (r.name.startsWith('Phòng Nữ 0')));
      if (needsMigration) {
        parsed = parsed.map(r => {
          if (OLD_FEMALE_ROOM_NAME_MAP[r.name]) {
            const newName = OLD_FEMALE_ROOM_NAME_MAP[r.name];
            const num = parseInt(newName.match(/\d+/)?.[0] || '13', 10);
            return {
              ...r,
              id: `phong_nu_${num}`,
              name: newName,
              gender: 'Nữ',
              order: num,
            };
          }
          return r;
        });
        parsed.sort((a, b) => (a.order || 0) - (b.order || 0));
        localStorage.setItem(LOCAL_STORAGE_KEY_ROOMS, JSON.stringify(parsed));
      }
      return parsed;
    }
    return DEFAULT_ROOM_CONFIGS;
  }
}

export function subscribeToRoomConfigs(
  onData: (configs: RoomConfig[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, ROOM_CONFIGS_COL),
    (snap) => {
      const list: RoomConfig[] = [];
      snap.forEach(d => {
        list.push({ ...(d.data() as RoomConfig), id: d.id });
      });
      if (list.length > 0) {
        list.sort((a, b) => (a.order || 0) - (b.order || 0));
        localStorage.setItem(LOCAL_STORAGE_KEY_ROOMS, JSON.stringify(list));
        onData(list);
      }
    },
    (error) => {
      console.warn('Realtime room configs subscription error:', error);
      if (onError) onError(error);
    }
  );
}

export async function saveRoomConfig(room: RoomConfig): Promise<void> {
  try {
    await setDoc(doc(db, ROOM_CONFIGS_COL, room.id), {
      ...room,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Save room config Firestore error:', error);
  }

  const local = localStorage.getItem(LOCAL_STORAGE_KEY_ROOMS);
  let list: RoomConfig[] = local ? JSON.parse(local) : [...DEFAULT_ROOM_CONFIGS];
  const idx = list.findIndex(r => r.id === room.id);
  if (idx >= 0) {
    list[idx] = room;
  } else {
    list.push(room);
  }
  list.sort((a, b) => (a.order || 0) - (b.order || 0));
  localStorage.setItem(LOCAL_STORAGE_KEY_ROOMS, JSON.stringify(list));
}

export async function deleteRoomConfig(roomId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, ROOM_CONFIGS_COL, roomId));
  } catch (error) {
    console.warn('Delete room config Firestore error:', error);
  }

  const local = localStorage.getItem(LOCAL_STORAGE_KEY_ROOMS);
  if (local) {
    let list: RoomConfig[] = JSON.parse(local);
    list = list.filter(r => r.id !== roomId && r.name !== roomId);
    localStorage.setItem(LOCAL_STORAGE_KEY_ROOMS, JSON.stringify(list));
  }
}

export async function deleteMultipleRoomConfigs(roomIds: string[]): Promise<void> {
  const promises = roomIds.map(async (id) => {
    try {
      await deleteDoc(doc(db, ROOM_CONFIGS_COL, id));
    } catch (err) {
      console.warn('Delete room config Firestore error:', err);
    }
  });
  await Promise.all(promises);

  const local = localStorage.getItem(LOCAL_STORAGE_KEY_ROOMS);
  if (local) {
    let list: RoomConfig[] = JSON.parse(local);
    const idSet = new Set(roomIds);
    list = list.filter(r => !idSet.has(r.id) && !idSet.has(r.name));
    localStorage.setItem(LOCAL_STORAGE_KEY_ROOMS, JSON.stringify(list));
  }
}

export async function resetRoomConfigs(): Promise<RoomConfig[]> {
  try {
    const snap = await getDocs(collection(db, ROOM_CONFIGS_COL));
    const delPromises = snap.docs.map(d => deleteDoc(doc(db, ROOM_CONFIGS_COL, d.id)));
    await Promise.all(delPromises);

    for (const r of DEFAULT_ROOM_CONFIGS) {
      await setDoc(doc(db, ROOM_CONFIGS_COL, r.id), r);
    }
  } catch (error) {
    console.warn('Reset room configs Firestore error:', error);
  }

  localStorage.setItem(LOCAL_STORAGE_KEY_ROOMS, JSON.stringify(DEFAULT_ROOM_CONFIGS));
  return DEFAULT_ROOM_CONFIGS;
}

export async function fetchAttendanceForDate(date: string): Promise<Record<string, AttendanceRecord>> {
  try {
    const q = query(collection(db, ATTENDANCE_COL), where('date', '==', date));
    const snap = await getDocs(q);
    const map: Record<string, AttendanceRecord> = {};
    snap.forEach(d => {
      const data = d.data() as AttendanceRecord;
      map[data.studentId] = { ...data, id: d.id };
    });

    // Also update local cache
    const localStr = localStorage.getItem(LOCAL_STORAGE_KEY_ATTENDANCE);
    const allLocal: Record<string, Record<string, AttendanceRecord>> = localStr ? JSON.parse(localStr) : {};
    allLocal[date] = map;
    localStorage.setItem(LOCAL_STORAGE_KEY_ATTENDANCE, JSON.stringify(allLocal));

    return map;
  } catch (error) {
    console.warn('Fetch attendance failed, reading local:', error);
    const localStr = localStorage.getItem(LOCAL_STORAGE_KEY_ATTENDANCE);
    const allLocal: Record<string, Record<string, AttendanceRecord>> = localStr ? JSON.parse(localStr) : {};
    return allLocal[date] || {};
  }
}

export function subscribeToAttendanceForDate(
  date: string,
  onData: (map: Record<string, AttendanceRecord>) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const q = query(collection(db, ATTENDANCE_COL), where('date', '==', date));
  return onSnapshot(
    q,
    (snap) => {
      const map: Record<string, AttendanceRecord> = {};
      snap.forEach(d => {
        const data = d.data() as AttendanceRecord;
        map[data.studentId] = { ...data, id: d.id };
      });
      try {
        const localStr = localStorage.getItem(LOCAL_STORAGE_KEY_ATTENDANCE);
        const allLocal: Record<string, Record<string, AttendanceRecord>> = localStr ? JSON.parse(localStr) : {};
        allLocal[date] = map;
        localStorage.setItem(LOCAL_STORAGE_KEY_ATTENDANCE, JSON.stringify(allLocal));
      } catch (e) {
        console.warn('Cache error:', e);
      }
      onData(map);
    },
    (error) => {
      console.warn('Realtime attendance subscription error:', error);
      if (onError) onError(error);
    }
  );
}

export async function fetchAttendanceForDateRange(
  startDate: string,
  endDate: string
): Promise<AttendanceRecord[]> {
  const recordsMap: Record<string, AttendanceRecord> = {};

  try {
    const q = query(
      collection(db, ATTENDANCE_COL),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
    const snap = await getDocs(q);
    snap.forEach(d => {
      const data = d.data() as AttendanceRecord;
      const key = `${data.date}_${data.studentId}`;
      recordsMap[key] = { ...data, id: d.id };
    });
  } catch (error) {
    console.warn('Fetch attendance range from Firestore failed, checking local:', error);
  }

  // Merge with local storage cache
  try {
    const localStr = localStorage.getItem(LOCAL_STORAGE_KEY_ATTENDANCE);
    if (localStr) {
      const allLocal: Record<string, Record<string, AttendanceRecord>> = JSON.parse(localStr);
      Object.keys(allLocal).forEach(date => {
        if (date >= startDate && date <= endDate) {
          const dayRecords = allLocal[date];
          Object.values(dayRecords).forEach(rec => {
            const key = `${rec.date}_${rec.studentId}`;
            if (!recordsMap[key]) {
              recordsMap[key] = rec;
            }
          });
        }
      });
    }
  } catch (err) {
    console.warn('Error reading local storage attendance range:', err);
  }

  return Object.values(recordsMap);
}

export async function saveAttendanceRecords(records: AttendanceRecord[]): Promise<void> {
  if (records.length === 0) return;
  const date = records[0].date;

  // Save to Firestore
  try {
    await Promise.all(
      records.map(rec => {
        const docId = `${rec.date}_${rec.studentId}`;
        return setDoc(doc(db, ATTENDANCE_COL, docId), {
          ...rec,
          id: docId,
          recordedAt: new Date().toISOString(),
        });
      })
    );
  } catch (error) {
    console.warn('Batch attendance save to Firestore error:', error);
  }

  // Update local cache
  const localStr = localStorage.getItem(LOCAL_STORAGE_KEY_ATTENDANCE);
  const allLocal: Record<string, Record<string, AttendanceRecord>> = localStr ? JSON.parse(localStr) : {};
  if (!allLocal[date]) {
    allLocal[date] = {};
  }
  records.forEach(r => {
    allLocal[date][r.studentId] = r;
  });
  localStorage.setItem(LOCAL_STORAGE_KEY_ATTENDANCE, JSON.stringify(allLocal));
}

export async function fetchRoomSummaries(date: string): Promise<Record<string, RoomSummary>> {
  try {
    const q = query(collection(db, ROOM_SUMMARIES_COL), where('date', '==', date));
    const snap = await getDocs(q);
    const map: Record<string, RoomSummary> = {};
    snap.forEach(d => {
      const data = d.data() as RoomSummary;
      const normalizedRoom = OLD_FEMALE_ROOM_NAME_MAP[data.roomId] || data.roomId;
      map[normalizedRoom] = { ...data, roomId: normalizedRoom, id: d.id };
    });
    return map;
  } catch (error) {
    console.warn('Fetch summaries failed:', error);
    const localStr = localStorage.getItem(LOCAL_STORAGE_KEY_SUMMARIES);
    const allLocal: Record<string, Record<string, RoomSummary>> = localStr ? JSON.parse(localStr) : {};
    return allLocal[date] || {};
  }
}

export function subscribeToRoomSummaries(
  date: string,
  onData: (map: Record<string, RoomSummary>) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const q = query(collection(db, ROOM_SUMMARIES_COL), where('date', '==', date));
  return onSnapshot(
    q,
    (snap) => {
      const map: Record<string, RoomSummary> = {};
      snap.forEach(d => {
        const data = d.data() as RoomSummary;
        const normalizedRoom = OLD_FEMALE_ROOM_NAME_MAP[data.roomId] || data.roomId;
        map[normalizedRoom] = { ...data, roomId: normalizedRoom, id: d.id };
      });
      try {
        const localStr = localStorage.getItem(LOCAL_STORAGE_KEY_SUMMARIES);
        const allLocal: Record<string, Record<string, RoomSummary>> = localStr ? JSON.parse(localStr) : {};
        allLocal[date] = map;
        localStorage.setItem(LOCAL_STORAGE_KEY_SUMMARIES, JSON.stringify(allLocal));
      } catch (e) {
        console.warn('Cache error:', e);
      }
      onData(map);
    },
    (error) => {
      console.warn('Realtime room summaries subscription error:', error);
      if (onError) onError(error);
    }
  );
}

export async function saveRoomSummary(summary: RoomSummary): Promise<void> {
  const normalizedRoom = OLD_FEMALE_ROOM_NAME_MAP[summary.roomId] || summary.roomId;
  const docId = `${summary.date}_${normalizedRoom.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  const payload: RoomSummary = {
    ...summary,
    roomId: normalizedRoom,
    id: docId,
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, ROOM_SUMMARIES_COL, docId), payload);
  } catch (error) {
    console.warn('Save summary Firestore error:', error);
  }

  const localStr = localStorage.getItem(LOCAL_STORAGE_KEY_SUMMARIES);
  const allLocal: Record<string, Record<string, RoomSummary>> = localStr ? JSON.parse(localStr) : {};
  if (!allLocal[summary.date]) {
    allLocal[summary.date] = {};
  }
  allLocal[summary.date][normalizedRoom] = payload;
  localStorage.setItem(LOCAL_STORAGE_KEY_SUMMARIES, JSON.stringify(allLocal));
}

// ==========================================
// CÁC HÀM XỬ LÝ ĐIỂM DANH TỰ HỌC ĐÊM
// ==========================================

export async function fetchNightAttendanceForDate(date: string): Promise<Record<string, NightStudyRecord>> {
  try {
    const q = query(collection(db, NIGHT_ATTENDANCE_COL), where('date', '==', date));
    const snap = await getDocs(q);
    const map: Record<string, NightStudyRecord> = {};
    snap.forEach(d => {
      const data = d.data() as NightStudyRecord;
      map[data.studentId] = { ...data, id: d.id };
    });

    // Update local cache
    const localStr = localStorage.getItem(LOCAL_STORAGE_KEY_NIGHT_ATTENDANCE);
    const allLocal: Record<string, Record<string, NightStudyRecord>> = localStr ? JSON.parse(localStr) : {};
    allLocal[date] = map;
    localStorage.setItem(LOCAL_STORAGE_KEY_NIGHT_ATTENDANCE, JSON.stringify(allLocal));

    return map;
  } catch (error) {
    console.warn('Fetch night attendance failed, reading local:', error);
    const localStr = localStorage.getItem(LOCAL_STORAGE_KEY_NIGHT_ATTENDANCE);
    const allLocal: Record<string, Record<string, NightStudyRecord>> = localStr ? JSON.parse(localStr) : {};
    return allLocal[date] || {};
  }
}

export function subscribeToNightAttendanceForDate(
  date: string,
  onData: (map: Record<string, NightStudyRecord>) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const q = query(collection(db, NIGHT_ATTENDANCE_COL), where('date', '==', date));
  return onSnapshot(
    q,
    (snap) => {
      const map: Record<string, NightStudyRecord> = {};
      snap.forEach(d => {
        const data = d.data() as NightStudyRecord;
        map[data.studentId] = { ...data, id: d.id };
      });
      try {
        const localStr = localStorage.getItem(LOCAL_STORAGE_KEY_NIGHT_ATTENDANCE);
        const allLocal: Record<string, Record<string, NightStudyRecord>> = localStr ? JSON.parse(localStr) : {};
        allLocal[date] = map;
        localStorage.setItem(LOCAL_STORAGE_KEY_NIGHT_ATTENDANCE, JSON.stringify(allLocal));
      } catch (e) {
        console.warn('Cache error:', e);
      }
      onData(map);
    },
    (error) => {
      console.warn('Realtime night attendance subscription error:', error);
      if (onError) onError(error);
    }
  );
}

export async function saveNightAttendanceRecords(records: NightStudyRecord[]): Promise<void> {
  if (records.length === 0) return;
  const date = records[0].date;

  // Save to Firestore
  try {
    await Promise.all(
      records.map(rec => {
        const docId = `${rec.date}_${rec.studentId}`;
        return setDoc(doc(db, NIGHT_ATTENDANCE_COL, docId), {
          ...rec,
          id: docId,
          recordedAt: new Date().toISOString(),
        });
      })
    );
  } catch (error) {
    console.warn('Batch night attendance save to Firestore error:', error);
  }

  // Update local cache
  const localStr = localStorage.getItem(LOCAL_STORAGE_KEY_NIGHT_ATTENDANCE);
  const allLocal: Record<string, Record<string, NightStudyRecord>> = localStr ? JSON.parse(localStr) : {};
  if (!allLocal[date]) {
    allLocal[date] = {};
  }
  records.forEach(r => {
    allLocal[date][r.studentId] = r;
  });
  localStorage.setItem(LOCAL_STORAGE_KEY_NIGHT_ATTENDANCE, JSON.stringify(allLocal));
}

export async function fetchNightRoomSummaries(date: string): Promise<Record<string, NightRoomSummary>> {
  try {
    const q = query(collection(db, NIGHT_SUMMARIES_COL), where('date', '==', date));
    const snap = await getDocs(q);
    const map: Record<string, NightRoomSummary> = {};
    snap.forEach(d => {
      const data = d.data() as NightRoomSummary;
      const normalizedRoom = OLD_FEMALE_ROOM_NAME_MAP[data.roomId] || data.roomId;
      map[normalizedRoom] = { ...data, roomId: normalizedRoom, id: d.id };
    });
    return map;
  } catch (error) {
    console.warn('Fetch night summaries failed:', error);
    const localStr = localStorage.getItem(LOCAL_STORAGE_KEY_NIGHT_SUMMARIES);
    const allLocal: Record<string, Record<string, NightRoomSummary>> = localStr ? JSON.parse(localStr) : {};
    return allLocal[date] || {};
  }
}

export function subscribeToNightRoomSummaries(
  date: string,
  onData: (map: Record<string, NightRoomSummary>) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const q = query(collection(db, NIGHT_SUMMARIES_COL), where('date', '==', date));
  return onSnapshot(
    q,
    (snap) => {
      const map: Record<string, NightRoomSummary> = {};
      snap.forEach(d => {
        const data = d.data() as NightRoomSummary;
        const normalizedRoom = OLD_FEMALE_ROOM_NAME_MAP[data.roomId] || data.roomId;
        map[normalizedRoom] = { ...data, roomId: normalizedRoom, id: d.id };
      });
      try {
        const localStr = localStorage.getItem(LOCAL_STORAGE_KEY_NIGHT_SUMMARIES);
        const allLocal: Record<string, Record<string, NightRoomSummary>> = localStr ? JSON.parse(localStr) : {};
        allLocal[date] = map;
        localStorage.setItem(LOCAL_STORAGE_KEY_NIGHT_SUMMARIES, JSON.stringify(allLocal));
      } catch (e) {
        console.warn('Cache error:', e);
      }
      onData(map);
    },
    (error) => {
      console.warn('Realtime night room summaries subscription error:', error);
      if (onError) onError(error);
    }
  );
}

export async function saveNightRoomSummary(summary: NightRoomSummary): Promise<void> {
  const normalizedRoom = OLD_FEMALE_ROOM_NAME_MAP[summary.roomId] || summary.roomId;
  const docId = `${summary.date}_${normalizedRoom.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  const payload: NightRoomSummary = {
    ...summary,
    roomId: normalizedRoom,
    id: docId,
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, NIGHT_SUMMARIES_COL, docId), payload);
  } catch (error) {
    console.warn('Save night summary Firestore error:', error);
  }

  const localStr = localStorage.getItem(LOCAL_STORAGE_KEY_NIGHT_SUMMARIES);
  const allLocal: Record<string, Record<string, NightRoomSummary>> = localStr ? JSON.parse(localStr) : {};
  if (!allLocal[summary.date]) {
    allLocal[summary.date] = {};
  }
  allLocal[summary.date][normalizedRoom] = payload;
  localStorage.setItem(LOCAL_STORAGE_KEY_NIGHT_SUMMARIES, JSON.stringify(allLocal));
}

export async function fetchNightAttendanceForDateRange(
  startDate: string,
  endDate: string
): Promise<NightStudyRecord[]> {
  const recordsMap: Record<string, NightStudyRecord> = {};

  try {
    const q = query(
      collection(db, NIGHT_ATTENDANCE_COL),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
    const snap = await getDocs(q);
    snap.forEach(d => {
      const data = d.data() as NightStudyRecord;
      const key = `${data.date}_${data.studentId}`;
      recordsMap[key] = { ...data, id: d.id };
    });
  } catch (error) {
    console.warn('Fetch night attendance range from Firestore failed:', error);
  }

  // Merge with local storage cache
  try {
    const localStr = localStorage.getItem(LOCAL_STORAGE_KEY_NIGHT_ATTENDANCE);
    if (localStr) {
      const allLocal: Record<string, Record<string, NightStudyRecord>> = JSON.parse(localStr);
      Object.keys(allLocal).forEach(date => {
        if (date >= startDate && date <= endDate) {
          const dayRecords = allLocal[date];
          Object.values(dayRecords).forEach(rec => {
            const key = `${rec.date}_${rec.studentId}`;
            if (!recordsMap[key]) {
              recordsMap[key] = rec;
            }
          });
        }
      });
    }
  } catch (err) {
    console.warn('Error reading local storage night attendance range:', err);
  }

  return Object.values(recordsMap);
}

// ==========================================
// CHẤM ĐIỂM THI ĐUA (COMPETITION SCORING SERVICES)
// ==========================================

export async function fetchCompetitionCriteria(): Promise<CompetitionCriterion[]> {
  try {
    const snap = await getDocs(collection(db, COMPETITION_CRITERIA_COL));
    const list: CompetitionCriterion[] = [];
    snap.forEach(d => {
      list.push({ ...(d.data() as CompetitionCriterion), id: d.id });
    });

    if (list.length > 0) {
      list.sort((a, b) => a.order - b.order);
      localStorage.setItem(LOCAL_STORAGE_KEY_COMPETITION_CRITERIA, JSON.stringify(list));
      return list;
    }
  } catch (error) {
    console.warn('Fetch competition criteria from Firestore failed, fallback to local:', error);
  }

  // Fallback to local storage or defaults
  try {
    const local = localStorage.getItem(LOCAL_STORAGE_KEY_COMPETITION_CRITERIA);
    if (local) {
      const parsed: CompetitionCriterion[] = JSON.parse(local);
      if (parsed.length > 0) {
        return parsed.sort((a, b) => a.order - b.order);
      }
    }
  } catch (e) {
    console.warn('Error reading local criteria:', e);
  }

  return DEFAULT_COMPETITION_CRITERIA.map(c => ({ ...c }));
}

export async function saveCompetitionCriterion(criterion: CompetitionCriterion): Promise<void> {
  const docId = criterion.id;
  try {
    await setDoc(doc(db, COMPETITION_CRITERIA_COL, docId), {
      ...criterion,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Save competition criterion to Firestore failed:', error);
  }

  // Update local storage
  try {
    const local = localStorage.getItem(LOCAL_STORAGE_KEY_COMPETITION_CRITERIA);
    let list: CompetitionCriterion[] = local ? JSON.parse(local) : [...DEFAULT_COMPETITION_CRITERIA];
    const idx = list.findIndex(c => c.id === docId);
    if (idx >= 0) {
      list[idx] = criterion;
    } else {
      list.push(criterion);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY_COMPETITION_CRITERIA, JSON.stringify(list));
  } catch (e) {
    console.warn('Error saving criterion to localStorage:', e);
  }
}

export async function deleteCompetitionCriterion(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COMPETITION_CRITERIA_COL, id));
  } catch (error) {
    console.warn('Delete competition criterion from Firestore failed:', error);
  }

  try {
    const local = localStorage.getItem(LOCAL_STORAGE_KEY_COMPETITION_CRITERIA);
    if (local) {
      const list: CompetitionCriterion[] = JSON.parse(local);
      const filtered = list.filter(c => c.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY_COMPETITION_CRITERIA, JSON.stringify(filtered));
    }
  } catch (e) {
    console.warn('Error deleting criterion from localStorage:', e);
  }
}

export async function resetCompetitionCriteria(): Promise<CompetitionCriterion[]> {
  try {
    for (const c of DEFAULT_COMPETITION_CRITERIA) {
      await setDoc(doc(db, COMPETITION_CRITERIA_COL, c.id), {
        ...c,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.warn('Reset criteria to Firestore failed:', e);
  }

  const list = DEFAULT_COMPETITION_CRITERIA.map(c => ({ ...c }));
  localStorage.setItem(LOCAL_STORAGE_KEY_COMPETITION_CRITERIA, JSON.stringify(list));
  return list;
}

export async function fetchCompetitionDepartments(): Promise<CompetitionDepartment[]> {
  try {
    const snap = await getDocs(collection(db, COMPETITION_DEPARTMENTS_COL));
    const list: CompetitionDepartment[] = [];
    snap.forEach(d => {
      list.push({ ...(d.data() as CompetitionDepartment), id: d.id });
    });

    if (list.length > 0) {
      list.sort((a, b) => a.order - b.order);
      localStorage.setItem(LOCAL_STORAGE_KEY_COMPETITION_DEPTS, JSON.stringify(list));
      return list;
    }
  } catch (error) {
    console.warn('Fetch competition departments from Firestore failed, fallback to local:', error);
  }

  // Fallback to local storage or defaults
  try {
    const local = localStorage.getItem(LOCAL_STORAGE_KEY_COMPETITION_DEPTS);
    if (local) {
      const parsed: CompetitionDepartment[] = JSON.parse(local);
      if (parsed.length > 0) {
        return parsed.sort((a, b) => a.order - b.order);
      }
    }
  } catch (e) {
    console.warn('Error reading local departments:', e);
  }

  return DEFAULT_COMPETITION_DEPARTMENTS.map(d => ({ ...d }));
}

export async function saveCompetitionDepartment(dept: CompetitionDepartment): Promise<void> {
  const docId = dept.id;
  try {
    await setDoc(doc(db, COMPETITION_DEPARTMENTS_COL, docId), {
      ...dept,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Save competition department to Firestore failed:', error);
  }

  // Update local storage
  try {
    const local = localStorage.getItem(LOCAL_STORAGE_KEY_COMPETITION_DEPTS);
    let list: CompetitionDepartment[] = local ? JSON.parse(local) : [...DEFAULT_COMPETITION_DEPARTMENTS];
    const idx = list.findIndex(d => d.id === docId);
    if (idx >= 0) {
      list[idx] = dept;
    } else {
      list.push(dept);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY_COMPETITION_DEPTS, JSON.stringify(list));
  } catch (e) {
    console.warn('Error saving department to localStorage:', e);
  }
}

export async function deleteCompetitionDepartment(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COMPETITION_DEPARTMENTS_COL, id));
  } catch (error) {
    console.warn('Delete competition department from Firestore failed:', error);
  }

  try {
    const local = localStorage.getItem(LOCAL_STORAGE_KEY_COMPETITION_DEPTS);
    if (local) {
      const list: CompetitionDepartment[] = JSON.parse(local);
      const filtered = list.filter(d => d.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY_COMPETITION_DEPTS, JSON.stringify(filtered));
    }
  } catch (e) {
    console.warn('Error deleting department from localStorage:', e);
  }
}

export async function resetCompetitionDepartments(): Promise<CompetitionDepartment[]> {
  try {
    for (const d of DEFAULT_COMPETITION_DEPARTMENTS) {
      await setDoc(doc(db, COMPETITION_DEPARTMENTS_COL, d.id), {
        ...d,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.warn('Reset departments to Firestore failed:', e);
  }

  const list = DEFAULT_COMPETITION_DEPARTMENTS.map(d => ({ ...d }));
  localStorage.setItem(LOCAL_STORAGE_KEY_COMPETITION_DEPTS, JSON.stringify(list));
  return list;
}

export async function fetchCompetitionEvaluations(): Promise<CompetitionRoomEvaluation[]> {
  const results: Record<string, CompetitionRoomEvaluation> = {};

  try {
    const snap = await getDocs(collection(db, COMPETITION_EVALUATIONS_COL));
    snap.forEach(d => {
      const data = d.data() as CompetitionRoomEvaluation;
      results[d.id] = { ...data, id: d.id };
    });
  } catch (error) {
    console.warn('Fetch competition evaluations from Firestore failed:', error);
  }

  // Merge with localStorage
  try {
    const localStr = localStorage.getItem(LOCAL_STORAGE_KEY_COMPETITION_EVALS);
    if (localStr) {
      const localMap: Record<string, CompetitionRoomEvaluation> = JSON.parse(localStr);
      Object.keys(localMap).forEach(key => {
        if (!results[key]) {
          results[key] = localMap[key];
        }
      });
    }
  } catch (e) {
    console.warn('Error reading local evaluations:', e);
  }

  return Object.values(results);
}

export async function saveCompetitionEvaluation(evaluation: CompetitionRoomEvaluation): Promise<void> {
  const docId = evaluation.id || `${evaluation.date}_${evaluation.roomId.replace(/\s+/g, '_')}_${evaluation.evaluatorEmail.replace(/[@.]/g, '_')}`;
  const dataToSave: CompetitionRoomEvaluation = {
    ...evaluation,
    id: docId,
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, COMPETITION_EVALUATIONS_COL, docId), dataToSave);
  } catch (error) {
    console.warn('Save evaluation to Firestore failed, saving local:', error);
  }

  // Always sync to local storage
  try {
    const localStr = localStorage.getItem(LOCAL_STORAGE_KEY_COMPETITION_EVALS);
    const localMap: Record<string, CompetitionRoomEvaluation> = localStr ? JSON.parse(localStr) : {};
    localMap[docId] = dataToSave;
    localStorage.setItem(LOCAL_STORAGE_KEY_COMPETITION_EVALS, JSON.stringify(localMap));
  } catch (e) {
    console.warn('Error saving evaluation to localStorage:', e);
  }
}

export async function deleteCompetitionEvaluation(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COMPETITION_EVALUATIONS_COL, id));
  } catch (error) {
    console.warn('Delete evaluation from Firestore failed:', error);
  }

  try {
    const localStr = localStorage.getItem(LOCAL_STORAGE_KEY_COMPETITION_EVALS);
    if (localStr) {
      const localMap: Record<string, CompetitionRoomEvaluation> = JSON.parse(localStr);
      delete localMap[id];
      localStorage.setItem(LOCAL_STORAGE_KEY_COMPETITION_EVALS, JSON.stringify(localMap));
    }
  } catch (e) {
    console.warn('Error deleting evaluation from localStorage:', e);
  }
}

// ==========================================
// QUY TẮC TRỪ ĐIỂM CHUYÊN CẦN & ĐIỂM CỘNG THI ĐUA
// ==========================================

export async function fetchCompetitionDeductionRules(): Promise<CompetitionDeductionRules> {
  try {
    const snap = await getDoc(doc(db, COMPETITION_RULES_COL, 'current_rules'));
    if (snap.exists()) {
      const data = snap.data() as CompetitionDeductionRules;
      localStorage.setItem(LOCAL_STORAGE_KEY_COMPETITION_RULES, JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.warn('Fetch competition deduction rules from Firestore failed, fallback to local:', err);
  }

  try {
    const local = localStorage.getItem(LOCAL_STORAGE_KEY_COMPETITION_RULES);
    if (local) {
      return JSON.parse(local);
    }
  } catch (e) {
    console.warn('Error reading local competition deduction rules:', e);
  }

  return { ...DEFAULT_COMPETITION_DEDUCTION_RULES };
}

export async function saveCompetitionDeductionRules(rules: CompetitionDeductionRules): Promise<void> {
  try {
    await setDoc(doc(db, COMPETITION_RULES_COL, 'current_rules'), {
      ...rules,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Save competition rules to Firestore failed:', err);
  }

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_COMPETITION_RULES, JSON.stringify(rules));
  } catch (e) {
    console.warn('Error saving competition rules to localStorage:', e);
  }
}

export async function fetchRoomCompetitionBonuses(dateOrWeek: string): Promise<Record<string, RoomCompetitionBonus>> {
  const result: Record<string, RoomCompetitionBonus> = {};

  try {
    const q = query(collection(db, COMPETITION_BONUSES_COL), where('dateOrWeek', '==', dateOrWeek));
    const snap = await getDocs(q);
    snap.forEach((d) => {
      const data = d.data() as RoomCompetitionBonus;
      result[data.roomId] = { ...data, id: d.id };
    });
  } catch (err) {
    console.warn('Fetch room competition bonuses from Firestore failed:', err);
  }

  try {
    const localStr = localStorage.getItem(LOCAL_STORAGE_KEY_COMPETITION_BONUSES);
    if (localStr) {
      const allLocal: Record<string, Record<string, RoomCompetitionBonus>> = JSON.parse(localStr);
      const periodBonuses = allLocal[dateOrWeek] || {};
      Object.keys(periodBonuses).forEach((roomId) => {
        if (!result[roomId]) {
          result[roomId] = periodBonuses[roomId];
        }
      });
    }
  } catch (e) {
    console.warn('Error reading local competition bonuses:', e);
  }

  return result;
}

export async function saveRoomCompetitionBonus(bonus: RoomCompetitionBonus): Promise<void> {
  const docId = `${bonus.dateOrWeek}_${bonus.roomId.replace(/\s+/g, '_')}`;
  const dataToSave: RoomCompetitionBonus = {
    ...bonus,
    id: docId,
    awardedAt: bonus.awardedAt || new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, COMPETITION_BONUSES_COL, docId), dataToSave);
  } catch (err) {
    console.warn('Save room bonus to Firestore failed:', err);
  }

  try {
    const localStr = localStorage.getItem(LOCAL_STORAGE_KEY_COMPETITION_BONUSES);
    const allLocal: Record<string, Record<string, RoomCompetitionBonus>> = localStr ? JSON.parse(localStr) : {};
    if (!allLocal[bonus.dateOrWeek]) {
      allLocal[bonus.dateOrWeek] = {};
    }
    allLocal[bonus.dateOrWeek][bonus.roomId] = dataToSave;
    localStorage.setItem(LOCAL_STORAGE_KEY_COMPETITION_BONUSES, JSON.stringify(allLocal));
  } catch (e) {
    console.warn('Error saving room bonus to localStorage:', e);
  }
}

export async function deleteRoomCompetitionBonus(roomId: string, dateOrWeek: string): Promise<void> {
  const docId = `${dateOrWeek}_${roomId.replace(/\s+/g, '_')}`;

  try {
    await deleteDoc(doc(db, COMPETITION_BONUSES_COL, docId));
  } catch (err) {
    console.warn('Delete room bonus from Firestore failed:', err);
  }

  try {
    const localStr = localStorage.getItem(LOCAL_STORAGE_KEY_COMPETITION_BONUSES);
    if (localStr) {
      const allLocal: Record<string, Record<string, RoomCompetitionBonus>> = JSON.parse(localStr);
      if (allLocal[dateOrWeek]) {
        delete allLocal[dateOrWeek][roomId];
        localStorage.setItem(LOCAL_STORAGE_KEY_COMPETITION_BONUSES, JSON.stringify(allLocal));
      }
    }
  } catch (e) {
    console.warn('Error deleting room bonus from localStorage:', e);
  }
}

/**
 * Đồng bộ toàn bộ dữ liệu phòng ở và điểm danh lưu tạm sang máy chủ Firestore.
 * Giúp giải quyết triệt để vấn đề danh sách từng phòng không đồng bộ khi chia sẻ.
 */
export async function syncPendingLocalDataToServer(): Promise<{ syncedAttendance: number; syncedSummaries: number }> {
  let syncedAttendance = 0;
  let syncedSummaries = 0;

  try {
    // 1. Đồng bộ điểm danh ngày (GVCN / Ca trực phòng)
    const localAttStr = localStorage.getItem(LOCAL_STORAGE_KEY_ATTENDANCE);
    if (localAttStr) {
      const allLocal: Record<string, Record<string, AttendanceRecord>> = JSON.parse(localAttStr);
      for (const date of Object.keys(allLocal)) {
        const records = Object.values(allLocal[date]);
        if (records.length > 0) {
          const promises = records.map(rec => {
            const docId = `${rec.date}_${rec.studentId}`;
            return setDoc(doc(db, ATTENDANCE_COL, docId), {
              ...rec,
              id: docId,
              recordedAt: rec.recordedAt || new Date().toISOString(),
            });
          });
          await Promise.all(promises);
          syncedAttendance += records.length;
        }
      }
    }

    // 2. Đồng bộ báo cáo tổng hợp phòng ngày
    const localSumStr = localStorage.getItem(LOCAL_STORAGE_KEY_SUMMARIES);
    if (localSumStr) {
      const allLocal: Record<string, Record<string, RoomSummary>> = JSON.parse(localSumStr);
      for (const date of Object.keys(allLocal)) {
        const summaries = Object.values(allLocal[date]);
        for (const s of summaries) {
          const normalizedRoom = OLD_FEMALE_ROOM_NAME_MAP[s.roomId] || s.roomId;
          const docId = `${s.date}_${normalizedRoom.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
          await setDoc(doc(db, ROOM_SUMMARIES_COL, docId), {
            ...s,
            roomId: normalizedRoom,
            id: docId,
            updatedAt: s.updatedAt || new Date().toISOString(),
          });
          syncedSummaries++;
        }
      }
    }

    // 3. Đồng bộ điểm danh tự học đêm
    const localNightAttStr = localStorage.getItem(LOCAL_STORAGE_KEY_NIGHT_ATTENDANCE);
    if (localNightAttStr) {
      const allLocal: Record<string, Record<string, NightStudyRecord>> = JSON.parse(localNightAttStr);
      for (const date of Object.keys(allLocal)) {
        const records = Object.values(allLocal[date]);
        if (records.length > 0) {
          const promises = records.map(rec => {
            const docId = `${rec.date}_${rec.studentId}`;
            return setDoc(doc(db, NIGHT_ATTENDANCE_COL, docId), {
              ...rec,
              id: docId,
              recordedAt: rec.recordedAt || new Date().toISOString(),
            });
          });
          await Promise.all(promises);
        }
      }
    }

    // 4. Đồng bộ tổng hợp phòng tự học đêm
    const localNightSumStr = localStorage.getItem(LOCAL_STORAGE_KEY_NIGHT_SUMMARIES);
    if (localNightSumStr) {
      const allLocal: Record<string, Record<string, NightRoomSummary>> = JSON.parse(localNightSumStr);
      for (const date of Object.keys(allLocal)) {
        const summaries = Object.values(allLocal[date]);
        for (const s of summaries) {
          const normalizedRoom = OLD_FEMALE_ROOM_NAME_MAP[s.roomId] || s.roomId;
          const docId = `${s.date}_${normalizedRoom.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
          await setDoc(doc(db, NIGHT_SUMMARIES_COL, docId), {
            ...s,
            roomId: normalizedRoom,
            id: docId,
            updatedAt: s.updatedAt || new Date().toISOString(),
          });
        }
      }
    }
  } catch (err) {
    console.warn('Sync pending local data to Firestore error:', err);
  }

  return { syncedAttendance, syncedSummaries };
}

