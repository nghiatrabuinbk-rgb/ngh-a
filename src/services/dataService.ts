import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Student, AttendanceRecord, RoomSummary, AuthorizedUser, NightStudyRecord, NightRoomSummary } from '../types';
import { SEED_STUDENTS, INITIAL_ADMIN_EMAIL, DEFAULT_TEACHERS_LIST } from '../mockData';

const STUDENTS_COL = 'students';
const ATTENDANCE_COL = 'attendance_records';
const ROOM_SUMMARIES_COL = 'room_summaries';
const AUTHORIZED_USERS_COL = 'authorized_users';
const NIGHT_ATTENDANCE_COL = 'night_study_attendance';
const NIGHT_SUMMARIES_COL = 'night_room_summaries';

// In-memory / localStorage sync fallback in case network issues or offline
const LOCAL_STORAGE_KEY_STUDENTS = 'qlnt_students_v1';
const LOCAL_STORAGE_KEY_ATTENDANCE = 'qlnt_attendance_v1';
const LOCAL_STORAGE_KEY_SUMMARIES = 'qlnt_summaries_v1';
const LOCAL_STORAGE_KEY_USERS = 'qlnt_users_v1';
const LOCAL_STORAGE_KEY_NIGHT_ATTENDANCE = 'qlnt_night_attendance_v1';
const LOCAL_STORAGE_KEY_NIGHT_SUMMARIES = 'qlnt_night_summaries_v1';

export async function fetchAuthorizedUsers(): Promise<AuthorizedUser[]> {
  try {
    const snap = await getDocs(collection(db, AUTHORIZED_USERS_COL));
    const list: AuthorizedUser[] = [];
    snap.forEach(d => {
      const data = d.data() as AuthorizedUser;
      list.push({ ...data, id: d.id });
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
      return JSON.parse(local);
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
      list.push({ ...(d.data() as Student), id: d.id });
    });

    if (list.length === 0) {
      // Seed default students if empty
      const seeded: Student[] = [];
      for (let i = 0; i < SEED_STUDENTS.length; i++) {
        const item = SEED_STUDENTS[i];
        const studentId = `hs_${String(i + 1).padStart(3, '0')}`;
        const newStudent: Student = {
          ...item,
          id: studentId,
          createdAt: new Date().toISOString(),
        };
        await setDoc(doc(db, STUDENTS_COL, studentId), newStudent);
        seeded.push(newStudent);
      }
      localStorage.setItem(LOCAL_STORAGE_KEY_STUDENTS, JSON.stringify(seeded));
      return seeded;
    }

    localStorage.setItem(LOCAL_STORAGE_KEY_STUDENTS, JSON.stringify(list));
    return list;
  } catch (error) {
    console.warn('Fetch students error, using local/seed fallback:', error);
    const local = localStorage.getItem(LOCAL_STORAGE_KEY_STUDENTS);
    if (local) {
      return JSON.parse(local);
    }
    const seeded = SEED_STUDENTS.map((s, i) => ({
      ...s,
      id: `hs_${String(i + 1).padStart(3, '0')}`,
    }));
    localStorage.setItem(LOCAL_STORAGE_KEY_STUDENTS, JSON.stringify(seeded));
    return seeded;
  }
}

export async function saveStudent(student: Student): Promise<void> {
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
      map[data.roomId] = { ...data, id: d.id };
    });
    return map;
  } catch (error) {
    console.warn('Fetch summaries failed:', error);
    const localStr = localStorage.getItem(LOCAL_STORAGE_KEY_SUMMARIES);
    const allLocal: Record<string, Record<string, RoomSummary>> = localStr ? JSON.parse(localStr) : {};
    return allLocal[date] || {};
  }
}

export async function saveRoomSummary(summary: RoomSummary): Promise<void> {
  const docId = `${summary.date}_${summary.roomId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  try {
    await setDoc(doc(db, ROOM_SUMMARIES_COL, docId), {
      ...summary,
      id: docId,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Save summary Firestore error:', error);
  }

  const localStr = localStorage.getItem(LOCAL_STORAGE_KEY_SUMMARIES);
  const allLocal: Record<string, Record<string, RoomSummary>> = localStr ? JSON.parse(localStr) : {};
  if (!allLocal[summary.date]) {
    allLocal[summary.date] = {};
  }
  allLocal[summary.date][summary.roomId] = summary;
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
      map[data.roomId] = { ...data, id: d.id };
    });
    return map;
  } catch (error) {
    console.warn('Fetch night summaries failed:', error);
    const localStr = localStorage.getItem(LOCAL_STORAGE_KEY_NIGHT_SUMMARIES);
    const allLocal: Record<string, Record<string, NightRoomSummary>> = localStr ? JSON.parse(localStr) : {};
    return allLocal[date] || {};
  }
}

export async function saveNightRoomSummary(summary: NightRoomSummary): Promise<void> {
  const docId = `${summary.date}_${summary.roomId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  try {
    await setDoc(doc(db, NIGHT_SUMMARIES_COL, docId), {
      ...summary,
      id: docId,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Save night summary Firestore error:', error);
  }

  const localStr = localStorage.getItem(LOCAL_STORAGE_KEY_NIGHT_SUMMARIES);
  const allLocal: Record<string, Record<string, NightRoomSummary>> = localStr ? JSON.parse(localStr) : {};
  if (!allLocal[summary.date]) {
    allLocal[summary.date] = {};
  }
  allLocal[summary.date][summary.roomId] = summary;
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
