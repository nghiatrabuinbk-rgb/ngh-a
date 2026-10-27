import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Trophy, 
  Award, 
  Medal, 
  Camera, 
  Upload, 
  Trash2, 
  Plus, 
  CheckCircle, 
  AlertCircle, 
  FileSpreadsheet, 
  Download, 
  Sparkles, 
  Filter, 
  Search, 
  Image as ImageIcon, 
  X, 
  Edit3, 
  Save, 
  RefreshCw, 
  ChevronRight, 
  ChevronDown, 
  Calendar, 
  Info, 
  ShieldCheck, 
  Eye, 
  Maximize2,
  Users,
  Settings,
  HelpCircle,
  Building,
  Check,
  Percent,
  Sun,
  Moon,
  Ban,
  Gift,
  SlidersHorizontal,
  ArrowUpDown,
  FileText,
  CheckCircle2,
  RotateCcw,
  Video,
  Play
} from 'lucide-react';
import { saveVideoEvidence, resolveVideoUrl, deleteVideoEvidence } from '../utils/videoStorage';
import * as XLSX from 'xlsx';
import { 
  CompetitionCriterion, 
  CompetitionDepartment, 
  CompetitionRoomEvaluation, 
  DepartmentScoreSummary, 
  RoomRankingResult, 
  AuthorizedUser,
  Student,
  AttendanceRecord,
  NightStudyRecord,
  RoomSummary,
  NightRoomSummary,
  CompetitionDeductionRules,
  RoomCompetitionBonus,
  RoomAttendanceBreakdown
} from '../types';
import { 
  fetchCompetitionCriteria, 
  saveCompetitionCriterion, 
  deleteCompetitionCriterion, 
  resetCompetitionCriteria,
  fetchCompetitionDepartments, 
  saveCompetitionDepartment, 
  deleteCompetitionDepartment, 
  resetCompetitionDepartments,
  fetchCompetitionEvaluations, 
  saveCompetitionEvaluation, 
  deleteCompetitionEvaluation,
  fetchCompetitionDeductionRules,
  saveCompetitionDeductionRules,
  DEFAULT_COMPETITION_DEDUCTION_RULES,
  fetchRoomCompetitionBonuses,
  saveRoomCompetitionBonus,
  deleteRoomCompetitionBonus
} from '../services/dataService';
import { MALE_ROOMS, FEMALE_ROOMS } from '../mockData';

interface CompetitionScoringViewProps {
  currentDate: string;
  currentUser: { email?: string | null; displayName?: string | null } | null;
  authorizedInfo: AuthorizedUser | null;
  roomsList?: string[];
  students?: Student[];
  attendanceMap?: Record<string, AttendanceRecord>;
  roomSummaries?: Record<string, RoomSummary>;
  nightAttendanceMap?: Record<string, NightStudyRecord>;
  nightRoomSummaries?: Record<string, NightRoomSummary>;
  isAdmin?: boolean;
}

// Client-side image compression utility
async function compressImage(file: File, maxWidth = 1000, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxWidth) {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Calculate week number of year
function getWeekLabel(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
    const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
    const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    return `Tuần ${weekNum}`;
  } catch {
    return 'Tuần này';
  }
}

// Component to render video evidence player with loading, thumbnail, full-screen and delete handlers
const CriterionVideoPlayer: React.FC<{
  videoUri: string;
  title?: string;
  onPreview: (resolvedUrl: string) => void;
  onDelete?: () => void;
}> = ({ videoUri, title, onPreview, onDelete }) => {
  const [resolvedSrc, setResolvedSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    resolveVideoUrl(videoUri).then((url) => {
      if (isMounted) {
        setResolvedSrc(url);
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [videoUri]);

  if (isLoading || !resolvedSrc) {
    return (
      <div className="relative rounded-xl border border-purple-200 bg-purple-50/50 aspect-video flex items-center justify-center p-2 text-xs text-purple-700">
        <RefreshCw className="w-4 h-4 animate-spin text-purple-600 mr-1.5" />
        <span>Đang nạp video...</span>
      </div>
    );
  }

  return (
    <div className="group relative rounded-xl overflow-hidden border border-purple-200 bg-slate-950 aspect-video shadow-2xs flex flex-col justify-between">
      <video
        src={resolvedSrc}
        controls
        preload="metadata"
        className="w-full h-full object-contain"
        title={title || 'Video minh chứng'}
      />
      <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition flex items-center gap-1.5 pointer-events-auto bg-black/70 p-1 rounded-lg backdrop-blur-xs">
        <button
          type="button"
          onClick={() => onPreview(resolvedSrc)}
          className="p-1 bg-white/95 text-slate-900 rounded-md hover:bg-white cursor-pointer shadow-xs"
          title="Xem phóng to toàn màn hình"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="p-1 bg-rose-600 text-white rounded-md hover:bg-rose-700 cursor-pointer shadow-xs"
            title="Xóa video này"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export const CompetitionScoringView: React.FC<CompetitionScoringViewProps> = ({
  currentDate,
  currentUser,
  authorizedInfo,
  roomsList,
  students = [],
  attendanceMap = {},
  roomSummaries = {},
  nightAttendanceMap = {},
  nightRoomSummaries = {},
  isAdmin = false,
}) => {
  // Navigation inside Competition Tab
  const [subTab, setSubTab] = useState<'ranking' | 'day_attendance' | 'night_attendance' | 'bonus' | 'scoring' | 'config'>('ranking');

  // Master Data
  const [criteria, setCriteria] = useState<CompetitionCriterion[]>([]);
  const [departments, setDepartments] = useState<CompetitionDepartment[]>([]);
  const [evaluations, setEvaluations] = useState<CompetitionRoomEvaluation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Time & Scope Filters
  const [selectedDate, setSelectedDate] = useState<string>(currentDate);
  const [timeFilterMode, setTimeFilterMode] = useState<'date' | 'week' | 'all'>('date');
  const [activeGenderTab, setActiveGenderTab] = useState<'all' | 'nam' | 'nu'>('all');

  // Quy tắc trừ điểm chuyên cần (tùy chỉnh được)
  const [deductionRules, setDeductionRules] = useState<CompetitionDeductionRules>(DEFAULT_COMPETITION_DEDUCTION_RULES);
  const [rulesDraft, setRulesDraft] = useState<CompetitionDeductionRules>(DEFAULT_COMPETITION_DEDUCTION_RULES);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState<boolean>(false);
  const [isSavingRules, setIsSavingRules] = useState<boolean>(false);

  // Trạng thái Cộng điểm thi đua của Quản trị viên (Định mức 100 điểm)
  const [roomBonuses, setRoomBonuses] = useState<Record<string, RoomCompetitionBonus>>({});
  const [isBonusModalOpen, setIsBonusModalOpen] = useState<boolean>(false);
  const [bonusTargetRoom, setBonusTargetRoom] = useState<string>('');
  const [bonusPointsInput, setBonusPointsInput] = useState<number>(10);
  const [bonusReasonInput, setBonusReasonInput] = useState<string>('');
  const [isSavingBonus, setIsSavingBonus] = useState<boolean>(false);

  // Scoring Form State
  const [selectedRoom, setSelectedRoom] = useState<string>(MALE_ROOMS[0]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  const [evaluatorEmail, setEvaluatorEmail] = useState<string>('');
  const [evaluatorName, setEvaluatorName] = useState<string>('');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [criterionNotes, setCriterionNotes] = useState<Record<string, string>>({});
  const [criterionPhotos, setCriterionPhotos] = useState<Record<string, string[]>>({});
  const [criterionVideos, setCriterionVideos] = useState<Record<string, string[]>>({});
  const [generalNote, setGeneralNote] = useState<string>('');
  const [evidencePhotos, setEvidencePhotos] = useState<string[]>([]);
  const [evidenceVideos, setEvidenceVideos] = useState<string[]>([]);
  const [uploadingCriterionVideo, setUploadingCriterionVideo] = useState<Record<string, boolean>>({});
  const [isSavingScore, setIsSavingScore] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');

  // Photo & Video Preview Modals
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [previewVideo, setPreviewVideo] = useState<{ url: string; title?: string } | null>(null);

  // Detail Modal for Room in Ranking
  const [detailRoomModal, setDetailRoomModal] = useState<RoomRankingResult | null>(null);

  // Admin Config State
  const [editingCriterion, setEditingCriterion] = useState<Partial<CompetitionCriterion> | null>(null);
  const [editingDepartment, setEditingDepartment] = useState<Partial<CompetitionDepartment> | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Load Initial Data
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [critList, deptList, evalList, rules, bonuses] = await Promise.all([
        fetchCompetitionCriteria(),
        fetchCompetitionDepartments(),
        fetchCompetitionEvaluations(),
        fetchCompetitionDeductionRules(),
        fetchRoomCompetitionBonuses(selectedDate),
      ]);
      setCriteria(critList);
      setDepartments(deptList);
      setEvaluations(evalList);
      setDeductionRules(rules);
      setRulesDraft(rules);
      setRoomBonuses(bonuses);

      if (deptList.length > 0 && !selectedDepartmentId) {
        setSelectedDepartmentId(deptList[0].id);
      }
    } catch (err) {
      console.error('Failed to load competition data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Sync bonuses when selectedDate changes
  useEffect(() => {
    fetchRoomCompetitionBonuses(selectedDate).then(setRoomBonuses);
  }, [selectedDate]);

  // Sync evaluator identity with logged in Google account
  useEffect(() => {
    if (currentUser?.email) {
      setEvaluatorEmail(currentUser.email);
      setEvaluatorName(authorizedInfo?.name || currentUser.displayName || currentUser.email.split('@')[0]);
    } else {
      setEvaluatorEmail('khach@gmail.com');
      setEvaluatorName('Giám thị / Khách chấm điểm');
    }
  }, [currentUser, authorizedInfo]);

  // When room, department, or date changes, populate existing evaluation if available
  useEffect(() => {
    if (!selectedRoom || criteria.length === 0) return;

    // Search for existing evaluation
    const existing = evaluations.find(
      (e) =>
        e.roomId === selectedRoom &&
        e.date === selectedDate &&
        (selectedDepartmentId ? e.departmentId === selectedDepartmentId : true)
    );

    if (existing) {
      setScores({ ...existing.scores });
      setCriterionNotes({ ...(existing.notes || {}) });
      setCriterionPhotos({ ...(existing.criterionPhotos || {}) });
      setCriterionVideos({ ...(existing.criterionVideos || {}) });
      setGeneralNote(existing.generalNote || '');
      setEvidencePhotos(existing.evidencePhotos || []);
      setEvidenceVideos(existing.evidenceVideos || []);
      if (existing.departmentId) setSelectedDepartmentId(existing.departmentId);
      if (existing.evaluatorEmail) setEvaluatorEmail(existing.evaluatorEmail);
      if (existing.evaluatorName) setEvaluatorName(existing.evaluatorName);
    } else {
      // Initialize with standard benchmark points (100 points for all criteria)
      const initScores: Record<string, number> = {};
      const initNotes: Record<string, string> = {};
      criteria.forEach((c) => {
        initScores[c.id] = c.standardPoints || 100;
        initNotes[c.id] = '';
      });
      setScores(initScores);
      setCriterionNotes(initNotes);
      setCriterionPhotos({});
      setCriterionVideos({});
      setGeneralNote('');
      setEvidencePhotos([]);
      setEvidenceVideos([]);
    }
  }, [selectedRoom, selectedDepartmentId, selectedDate, criteria, evaluations]);

  // Available Rooms: standard 12 Nam & 13 Nữ
  const maleRooms = useMemo(() => {
    if (roomsList && roomsList.length > 0) {
      const filtered = roomsList.filter((r) => r.toLowerCase().includes('nam'));
      return filtered.length > 0 ? filtered : MALE_ROOMS;
    }
    return MALE_ROOMS;
  }, [roomsList]);

  const femaleRooms = useMemo(() => {
    if (roomsList && roomsList.length > 0) {
      const filtered = roomsList.filter((r) => r.toLowerCase().includes('nữ') || r.toLowerCase().includes('nu'));
      return filtered.length > 0 ? filtered : FEMALE_ROOMS;
    }
    return FEMALE_ROOMS;
  }, [roomsList]);

  // Current room gender
  const currentRoomGender = useMemo<'Nam' | 'Nữ'>(() => {
    return selectedRoom.toLowerCase().includes('nữ') || selectedRoom.toLowerCase().includes('nu') ? 'Nữ' : 'Nam';
  }, [selectedRoom]);

  // Current calculated total / average score in form
  const currentFormTotalScore = useMemo(() => {
    const activeCriteria = criteria.filter((c) => c.isActive);
    if (activeCriteria.length === 0) return 100;
    let sum = 0;
    activeCriteria.forEach((c) => {
      sum += scores[c.id] ?? c.standardPoints ?? 100;
    });
    return Math.round((sum / activeCriteria.length) * 10) / 10;
  }, [criteria, scores]);

  // Handle Score Adjustments
  const handleSetScore = (criterionId: string, val: number, maxPoints = 100) => {
    const clamped = Math.max(0, Math.min(maxPoints, val));
    setScores((prev) => ({ ...prev, [criterionId]: clamped }));
  };

  const handleDeduct = (criterionId: string, deduction: number, maxPoints = 100) => {
    const current = scores[criterionId] ?? maxPoints;
    const next = Math.max(0, current - deduction);
    setScores((prev) => ({ ...prev, [criterionId]: next }));
  };

  // Image upload handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPhotos: string[] = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const compressed = await compressImage(files[i]);
        newPhotos.push(compressed);
      } catch (err) {
        console.error('Image compression failed:', err);
      }
    }

    setEvidencePhotos((prev) => [...prev, ...newPhotos]);
    // Reset inputs
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    setEvidencePhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Upload photo specifically for a criterion (direct camera capture or file select)
  const handleCriterionPhotoUpload = async (
    criterionId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPhotos: string[] = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const compressed = await compressImage(files[i]);
        newPhotos.push(compressed);
      } catch (err) {
        console.error('Criterion image compression failed:', err);
      }
    }

    if (newPhotos.length > 0) {
      setCriterionPhotos((prev) => ({
        ...prev,
        [criterionId]: [...(prev[criterionId] || []), ...newPhotos],
      }));
    }

    // Reset input value so it can be re-triggered
    e.target.value = '';
  };

  // Remove photo for a specific criterion
  const handleRemoveCriterionPhoto = (criterionId: string, photoIndex: number) => {
    setCriterionPhotos((prev) => ({
      ...prev,
      [criterionId]: (prev[criterionId] || []).filter((_, idx) => idx !== photoIndex),
    }));
  };

  // Upload video specifically for a criterion
  const handleCriterionVideoUpload = async (
    criterionId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingCriterionVideo((prev) => ({ ...prev, [criterionId]: true }));
    try {
      const newVideos: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const videoUri = await saveVideoEvidence(file);
        newVideos.push(videoUri);
      }

      if (newVideos.length > 0) {
        setCriterionVideos((prev) => ({
          ...prev,
          [criterionId]: [...(prev[criterionId] || []), ...newVideos],
        }));
      }
    } catch (err) {
      console.error('Criterion video upload failed:', err);
      alert('Không thể lưu video minh chứng. Vui lòng thử lại!');
    } finally {
      setUploadingCriterionVideo((prev) => ({ ...prev, [criterionId]: false }));
      e.target.value = '';
    }
  };

  // Remove video for a specific criterion
  const handleRemoveCriterionVideo = async (criterionId: string, videoIndex: number) => {
    const videoToRemove = criterionVideos[criterionId]?.[videoIndex];
    if (videoToRemove) {
      await deleteVideoEvidence(videoToRemove);
    }
    setCriterionVideos((prev) => ({
      ...prev,
      [criterionId]: (prev[criterionId] || []).filter((_, idx) => idx !== videoIndex),
    }));
  };

  // Save Evaluation Submission
  const handleSaveEvaluation = async () => {
    if (!selectedRoom) return;
    setIsSavingScore(true);
    setSaveSuccessMsg('');

    const activeCriteria = criteria.filter((c) => c.isActive);
    let sum = 0;
    activeCriteria.forEach((c) => {
      sum += scores[c.id] ?? c.standardPoints ?? 100;
    });
    const avgScore = activeCriteria.length > 0 ? Math.round((sum / activeCriteria.length) * 10) / 10 : 100;

    const deptObj = departments.find((d) => d.id === selectedDepartmentId);
    const deptName = deptObj ? deptObj.name : 'Ban Giám khảo';

    // Unique document ID: {date}_{roomId}_{deptId}
    const cleanRoom = selectedRoom.replace(/\s+/g, '_');
    const cleanDept = selectedDepartmentId || 'dept_chung';
    const evalId = `${selectedDate}_${cleanRoom}_${cleanDept}`;

    // Collect all photos from each criterion into evidencePhotos as well for universal access
    const allCritPhotos: string[] = [];
    Object.values(criterionPhotos).forEach((pArr) => {
      if (Array.isArray(pArr)) {
        allCritPhotos.push(...pArr);
      }
    });
    const allEvidencePhotos = Array.from(new Set([...evidencePhotos, ...allCritPhotos]));

    // Collect all videos from each criterion into evidenceVideos
    const allCritVideos: string[] = [];
    Object.values(criterionVideos).forEach((vArr) => {
      if (Array.isArray(vArr)) {
        allCritVideos.push(...vArr);
      }
    });
    const allEvidenceVideos = Array.from(new Set([...evidenceVideos, ...allCritVideos]));

    const newEval: CompetitionRoomEvaluation = {
      id: evalId,
      date: selectedDate,
      weekLabel: getWeekLabel(selectedDate),
      roomId: selectedRoom,
      roomGender: currentRoomGender,
      departmentId: selectedDepartmentId,
      departmentName: deptName,
      evaluatorEmail: evaluatorEmail || 'unknown@gmail.com',
      evaluatorName: evaluatorName || 'Giám thị',
      scores: { ...scores },
      notes: { ...criterionNotes },
      generalNote: generalNote.trim(),
      evidencePhotos: allEvidencePhotos,
      evidenceVideos: allEvidenceVideos,
      criterionPhotos: { ...criterionPhotos },
      criterionVideos: { ...criterionVideos },
      totalScore: avgScore,
      submitted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveCompetitionEvaluation(newEval);
      setEvaluations((prev) => {
        const idx = prev.findIndex((e) => e.id === evalId);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = newEval;
          return updated;
        }
        return [...prev, newEval];
      });

      setSaveSuccessMsg(`Đã lưu kết quả chấm thi đua cho ${selectedRoom} (${deptName})!`);
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error saving evaluation:', err);
      alert('Không thể lưu kết quả. Vui lòng kiểm tra kết nối mạng!');
    } finally {
      setIsSavingScore(false);
    }
  };

  // ==========================================
  // SYNTHESIS & RANKING CALCULATION
  // ==========================================
  const currentWeekLabel = useMemo(() => getWeekLabel(selectedDate), [selectedDate]);

  // Filter evaluations according to selected time filter
  const filteredEvaluations = useMemo(() => {
    return evaluations.filter((item) => {
      if (timeFilterMode === 'date') {
        return item.date === selectedDate;
      }
      if (timeFilterMode === 'week') {
        return item.weekLabel === currentWeekLabel;
      }
      return true; // 'all'
    });
  }, [evaluations, selectedDate, timeFilterMode, currentWeekLabel]);

  // Helper to compute room attendance breakdown & final competition score
  const calculateRoomBreakdown = (
    roomName: string,
    deptAverage: number,
    hasDepartmentEvaluation: boolean
  ): RoomAttendanceBreakdown => {
    // 1. Students belonging to this room
    const roomStudents = students.filter((s) => s.room === roomName && s.status === 'active');

    // Mục 1: Điểm danh của GVCN (Chính khóa)
    let dayLeaveUnexcusedCount = 0;
    let daySkippedClassCount = 0;
    let dayAteNoClassCount = 0;
    let dayLeaveExcusedCount = 0;
    let dayNotAtSchoolCount = 0;

    const daySum = roomSummaries[roomName];

    if (roomStudents.length > 0) {
      roomStudents.forEach((s) => {
        const rec = attendanceMap[s.id];
        const st = rec?.status;
        if (st === 'leave_unexcused') dayLeaveUnexcusedCount++;
        else if (st === 'skipped_class') daySkippedClassCount++;
        else if (st === 'ate_no_class') dayAteNoClassCount++;
        else if (st === 'leave_excused') dayLeaveExcusedCount++;
        else if (st === 'not_at_school_this_week') dayNotAtSchoolCount++;
      });
    } else if (daySum) {
      dayLeaveUnexcusedCount = daySum.leaveUnexcusedCount || 0;
      daySkippedClassCount = daySum.skippedClassCount || 0;
      dayAteNoClassCount = daySum.ateNoClassCount || 0;
      dayLeaveExcusedCount = daySum.leaveExcusedCount || 0;
      dayNotAtSchoolCount = daySum.notAtSchoolThisWeekCount || 0;
    }

    // Deductions for Day Attendance
    const dayLeaveUnexcusedDeduction =
      dayLeaveUnexcusedCount * (deductionRules.dayLeaveUnexcusedRate ?? 5);
    const daySkippedClassDeduction =
      daySkippedClassCount * (deductionRules.daySkippedClassRate ?? 5);
    const dayAteNoClassDeduction =
      dayAteNoClassCount * (deductionRules.dayAteNoClassRate ?? 10);
    const totalDayDeduction =
      dayLeaveUnexcusedDeduction + daySkippedClassDeduction + dayAteNoClassDeduction;

    // Mục 2: Điểm danh tự học đêm (19h - 20h30)
    let nightLeaveUnexcusedCount = 0;
    let nightLeaveExcusedCount = 0;
    let nightPresentCount = 0;

    const nightSum = nightRoomSummaries[roomName];

    if (roomStudents.length > 0) {
      roomStudents.forEach((s) => {
        const rec = nightAttendanceMap[s.id];
        const st = rec?.status;
        if (st === 'absent_unexcused_night') nightLeaveUnexcusedCount++;
        else if (st === 'absent_excused_night') nightLeaveExcusedCount++;
        else if (st === 'present_night') nightPresentCount++;
      });
    } else if (nightSum) {
      nightLeaveUnexcusedCount = nightSum.absentUnexcusedCount || 0;
      nightLeaveExcusedCount = nightSum.absentExcusedCount || 0;
      nightPresentCount = nightSum.presentCount || 0;
    }

    // Deductions for Night Attendance
    const nightLeaveUnexcusedDeduction =
      nightLeaveUnexcusedCount * (deductionRules.nightLeaveUnexcusedRate ?? 5);
    const totalNightDeduction = nightLeaveUnexcusedDeduction;

    // Trạng thái Cộng điểm thi đua của Quản trị viên (Định mức 100 điểm)
    const bonusItem = roomBonuses[roomName];
    const maxBonus = deductionRules.maxBonusPointsLimit || 100;
    const adminBonusPoints = bonusItem ? Math.min(maxBonus, Math.max(0, bonusItem.points)) : 0;
    const adminBonusReason = bonusItem?.reason;

    // Department base score (standard benchmark is 100)
    const departmentBaseScore = hasDepartmentEvaluation ? deptAverage : 100;

    // Tổng điểm thi đua = Điểm chuẩn/bộ phận - Trừ chính khóa - Trừ học đêm + Điểm thưởng
    const rawTotal = departmentBaseScore - totalDayDeduction - totalNightDeduction + adminBonusPoints;
    const finalTotalScore = Math.max(0, Math.round(rawTotal * 10) / 10);

    return {
      dayTotalStudents: roomStudents.length || daySum?.totalStudents || 0,
      dayLeaveUnexcusedCount,
      dayLeaveUnexcusedDeduction,
      daySkippedClassCount,
      daySkippedClassDeduction,
      dayAteNoClassCount,
      dayAteNoClassDeduction,
      dayLeaveExcusedCount,
      dayNotAtSchoolCount,
      totalDayDeduction,
      nightTotalStudents: roomStudents.length || nightSum?.totalStudents || 0,
      nightLeaveUnexcusedCount,
      nightLeaveUnexcusedDeduction,
      nightLeaveExcusedCount,
      nightPresentCount,
      totalNightDeduction,
      adminBonusPoints,
      adminBonusReason,
      departmentBaseScore,
      hasDepartmentEvaluation,
      finalTotalScore,
    };
  };

  // Build ranking for a given list of rooms
  const buildRoomRankings = (roomNames: string[], gender: 'Nam' | 'Nữ'): RoomRankingResult[] => {
    const list: {
      roomId: string;
      roomName: string;
      roomGender: 'Nam' | 'Nữ';
      evaluationCount: number;
      averageScore: number;
      departmentScores: DepartmentScoreSummary[];
      allPhotos: string[];
      attendanceBreakdown: RoomAttendanceBreakdown;
      finalTotalScore: number;
    }[] = roomNames.map((roomName) => {
      // Find all evaluations for this room
      const roomEvals = filteredEvaluations.filter((e) => e.roomId === roomName);

      const deptSummaries: DepartmentScoreSummary[] = [];
      const photos: string[] = [];

      // Group by department
      const deptMap: Record<string, CompetitionRoomEvaluation[]> = {};
      roomEvals.forEach((e) => {
        const key = e.departmentId || e.departmentName;
        if (!deptMap[key]) deptMap[key] = [];
        deptMap[key].push(e);
      });

      let totalDeptScoreSum = 0;
      let countedDepts = 0;

      Object.keys(deptMap).forEach((deptKey) => {
        const evalsOfDept = deptMap[deptKey];
        const latest = evalsOfDept[evalsOfDept.length - 1];
        const deptAvg =
          Math.round(
            (evalsOfDept.reduce((acc, curr) => acc + curr.totalScore, 0) / evalsOfDept.length) * 10
          ) / 10;

        totalDeptScoreSum += deptAvg;
        countedDepts += 1;

        if (latest.evidencePhotos && latest.evidencePhotos.length > 0) {
          photos.push(...latest.evidencePhotos);
        }

        deptSummaries.push({
          departmentId: latest.departmentId,
          departmentName: latest.departmentName,
          evaluatorEmail: latest.evaluatorEmail,
          evaluatorName: latest.evaluatorName,
          totalScore: deptAvg,
          evidencePhotosCount: latest.evidencePhotos?.length || 0,
          evidenceVideosCount: latest.evidenceVideos?.length || 0,
          submittedAt: latest.updatedAt || latest.createdAt,
          generalNote: latest.generalNote,
          scores: latest.scores,
          notes: latest.notes,
          evidencePhotos: latest.evidencePhotos,
          evidenceVideos: latest.evidenceVideos,
          criterionPhotos: latest.criterionPhotos,
          criterionVideos: latest.criterionVideos,
        });
      });

      const hasDeptEval = countedDepts > 0;
      const deptAverage = hasDeptEval ? Math.round((totalDeptScoreSum / countedDepts) * 10) / 10 : 0;

      // Compute Attendance breakdown & final score
      const breakdown = calculateRoomBreakdown(roomName, deptAverage, hasDeptEval);

      return {
        roomId: roomName,
        roomName: roomName,
        roomGender: gender,
        evaluationCount: countedDepts,
        averageScore: deptAverage,
        departmentScores: deptSummaries,
        allPhotos: photos,
        attendanceBreakdown: breakdown,
        finalTotalScore: breakdown.finalTotalScore,
      };
    });

    // Sort descending by finalTotalScore
    list.sort((a, b) => {
      if (b.finalTotalScore !== a.finalTotalScore) {
        return b.finalTotalScore - a.finalTotalScore;
      }
      return a.roomName.localeCompare(b.roomName, 'vi', { numeric: true });
    });

    // Assign sequential ranks: 1, 2, ..., 12 for Nam; 1, 2, ..., 13 for Nữ
    return list.map((item, index) => {
      const rank = index + 1;
      let statusAward = 'Cần chấn chỉnh';
      if (item.finalTotalScore >= 95) {
        statusAward = 'Xuất sắc (Cờ đỏ)';
      } else if (item.finalTotalScore >= 85) {
        statusAward = 'Đạt chuẩn tốt';
      } else if (item.finalTotalScore >= 75) {
        statusAward = 'Khá';
      }

      return {
        ...item,
        rank,
        statusAward,
      };
    });
  };

  // 12 Male Rooms Ranking (Vị thứ 1 đến 12)
  const maleRanking = useMemo(
    () => buildRoomRankings(maleRooms, 'Nam'),
    [
      maleRooms,
      filteredEvaluations,
      students,
      attendanceMap,
      roomSummaries,
      nightAttendanceMap,
      nightRoomSummaries,
      deductionRules,
      roomBonuses,
    ]
  );

  // 13 Female Rooms Ranking (Vị thứ 1 đến 13)
  const femaleRanking = useMemo(
    () => buildRoomRankings(femaleRooms, 'Nữ'),
    [
      femaleRooms,
      filteredEvaluations,
      students,
      attendanceMap,
      roomSummaries,
      nightAttendanceMap,
      nightRoomSummaries,
      deductionRules,
      roomBonuses,
    ]
  );

  // Export to Excel function with complete attendance penalty & bonus details
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const makeRow = (r: RoomRankingResult, areaLabel: string) => {
      const b = r.attendanceBreakdown;
      const row: Record<string, any> = {
        'Vị Thứ': r.rank,
        'Phòng Ở': r.roomName,
        'Khu Vực': areaLabel,
        'TỔNG ĐIỂM THI ĐUA': r.finalTotalScore ?? r.averageScore,
        'Điểm Chuẩn / Bộ Phận': b ? b.departmentBaseScore : r.averageScore,
        'Trừ Chuyên Cần Chính Khóa': b ? `-${b.totalDayDeduction}` : 0,
        'Trừ Tự Học Đêm': b ? `-${b.totalNightDeduction}` : 0,
        'Điểm Thưởng Quản Trị': b ? `+${b.adminBonusPoints}` : 0,
        'Lý Do Khen Thưởng': b?.adminBonusReason || '',
        'Danh Hiệu / Đánh Giá': r.statusAward,
        'Số Bộ Phận Đã Chấm': r.evaluationCount,
        'Vắng KP Ngày': b?.dayLeaveUnexcusedCount || 0,
        'Bỏ Tiết': b?.daySkippedClassCount || 0,
        'Ăn Không Học': b?.dayAteNoClassCount || 0,
        'Vắng KP Học Đêm': b?.nightLeaveUnexcusedCount || 0,
        'Số Ảnh Minh Chứng': r.allPhotos.length,
      };

      departments.forEach((d) => {
        const found = r.departmentScores.find((ds) => ds.departmentId === d.id);
        row[`Điểm: ${d.name}`] = found ? found.totalScore : '-';
      });

      return row;
    };

    const maleRows = maleRanking.map((r) => makeRow(r, 'Khu Nam (12 phòng: Vị thứ 1..12)'));
    const femaleRows = femaleRanking.map((r) => makeRow(r, 'Khu Nữ (13 phòng: Vị thứ 1..13)'));

    const wsMale = XLSX.utils.json_to_sheet(maleRows);
    const wsFemale = XLSX.utils.json_to_sheet(femaleRows);

    XLSX.utils.book_append_sheet(wb, wsMale, '12 Phòng Nam');
    XLSX.utils.book_append_sheet(wb, wsFemale, '13 Phòng Nữ');

    const fileName = `ThiDua_PhongNoiTru_${selectedDate}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Helper for Rank Badge Styling
  const renderRankBadge = (rank: number, hasScore: boolean) => {
    if (!hasScore) {
      return (
        <span className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs">
          -
        </span>
      );
    }
    if (rank === 1) {
      return (
        <span className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 flex items-center justify-center font-extrabold text-sm shadow-md border-2 border-white">
          🥇 1
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-300 to-slate-100 text-slate-800 flex items-center justify-center font-extrabold text-sm shadow-sm border border-slate-300">
          🥈 2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-700 to-amber-600 text-white flex items-center justify-center font-extrabold text-sm shadow-sm border border-amber-800">
          🥉 3
        </span>
      );
    }
    return (
      <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs border border-slate-300">
        #{rank}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Mode Switcher */}
      <div className="bg-gradient-to-r from-teal-900 via-emerald-800 to-cyan-900 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-6 opacity-10 pointer-events-none">
          <Trophy className="w-72 h-72 text-white" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-400 text-slate-950 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Thi Đua Phòng Ở Nội Trú
              </span>
              <span className="text-xs text-emerald-200">
                25 Phòng (12 Nam • 13 Nữ) • Định mức 100 điểm
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Trophy className="w-6 h-6 text-amber-300" />
              CHẤM ĐIỂM & XẾP THI ĐUA PHÒNG NỘI TRÚ
            </h2>
            <p className="text-xs md:text-sm text-emerald-100/90 max-w-2xl">
              Hệ thống tổng hợp điểm từ Ban Giám hiệu, Ban Quản sinh (4 thành viên), Y tế, GV trực đêm tự học, Đoàn thanh niên... Xếp hạng độc lập khu 12 phòng nam (vị thứ 1 đến 12) và khu 13 phòng nữ (vị thứ 1 đến 13) kèm ảnh minh chứng.
            </p>
          </div>

          {/* Sub Navigation Buttons */}
          <div className="flex items-center flex-wrap gap-1.5 bg-black/30 p-1.5 rounded-xl backdrop-blur-md border border-white/10 self-stretch md:self-auto justify-center">
            <button
              onClick={() => setSubTab('ranking')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm font-bold transition ${
                subTab === 'ranking'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Bảng Xếp Hạng</span>
            </button>
            <button
              onClick={() => setSubTab('day_attendance')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm font-bold transition ${
                subTab === 'day_attendance'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-white hover:bg-white/10'
              }`}
              title="Mục 1: Tính điểm trừ chuyên cần học chính khóa từ GVCN"
            >
              <Sun className="w-4 h-4 text-amber-300" />
              <span>Chuyên Cần Ngày</span>
            </button>
            <button
              onClick={() => setSubTab('night_attendance')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm font-bold transition ${
                subTab === 'night_attendance'
                  ? 'bg-indigo-400 text-slate-950 shadow-md'
                  : 'text-white hover:bg-white/10'
              }`}
              title="Mục 2: Tính điểm trừ chuyên cần tự học đêm 19h-20h30"
            >
              <Moon className="w-4 h-4 text-indigo-200" />
              <span>Tự Học Đêm</span>
            </button>
            <button
              onClick={() => setSubTab('bonus')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm font-bold transition ${
                subTab === 'bonus'
                  ? 'bg-emerald-400 text-slate-950 shadow-md'
                  : 'text-white hover:bg-white/10'
              }`}
              title="Quản trị viên cộng điểm thi đua khen thưởng cho các phòng ở (Định mức 100đ)"
            >
              <Gift className="w-4 h-4 text-emerald-200" />
              <span>Cộng Điểm Thi Đua</span>
            </button>
            <button
              onClick={() => setSubTab('scoring')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm font-bold transition ${
                subTab === 'scoring'
                  ? 'bg-white text-emerald-900 shadow-md'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              <span>Chấm Điểm Phòng</span>
            </button>
            <button
              onClick={() => setSubTab('config')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm font-bold transition ${
                subTab === 'config'
                  ? 'bg-teal-500 text-white shadow-md'
                  : 'text-white hover:bg-white/10'
              }`}
              title="Quản trị viên cấu hình tiêu chí & các bộ phận chấm điểm"
            >
              <Settings className="w-4 h-4" />
              <span>Tiêu Chí & Bộ Phận</span>
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SUB-TAB 1: BẢNG XẾP HẠNG THI ĐUA (SEPARATE 12 NAM & 13 NỮ)    */}
      {/* ============================================================== */}
      {subTab === 'ranking' && (
        <div className="space-y-6">
          {/* Controls & Filter Bar */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Filter by Date / Week */}
            <div className="flex items-center flex-wrap gap-2.5 w-full md:w-auto">
              <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl p-1 text-xs font-semibold">
                <button
                  onClick={() => setTimeFilterMode('date')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    timeFilterMode === 'date'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Theo ngày
                </button>
                <button
                  onClick={() => setTimeFilterMode('week')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    timeFilterMode === 'week'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Theo tuần ({currentWeekLabel})
                </button>
                <button
                  onClick={() => setTimeFilterMode('all')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    timeFilterMode === 'all'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tất cả thời gian
                </button>
              </div>

              {timeFilterMode === 'date' && (
                <div className="flex items-center gap-1.5 border border-slate-300 rounded-xl px-2.5 py-1 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="focus:outline-none cursor-pointer text-slate-700 font-medium"
                  />
                </div>
              )}
            </div>

            {/* Quick Gender Filter & Actions */}
            <div className="flex items-center flex-wrap gap-2 w-full md:w-auto justify-end">
              <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 text-xs font-bold">
                <button
                  onClick={() => setActiveGenderTab('all')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    activeGenderTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Cả 2 Khu (25 Phòng)
                </button>
                <button
                  onClick={() => setActiveGenderTab('nam')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    activeGenderTab === 'nam' ? 'bg-blue-600 text-white shadow-xs' : 'text-blue-700'
                  }`}
                >
                  12 Phòng Nam
                </button>
                <button
                  onClick={() => setActiveGenderTab('nu')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    activeGenderTab === 'nu' ? 'bg-pink-600 text-white shadow-xs' : 'text-pink-700'
                  }`}
                >
                  13 Phòng Nữ
                </button>
              </div>

              <button
                onClick={() => {
                  setRulesDraft(deductionRules);
                  setIsRulesModalOpen(true);
                }}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow-xs"
                title="Tùy chỉnh định mức trừ điểm chuyên cần chính khóa, tự học đêm và định mức điểm thưởng"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                <span>Quy Tắc Điểm</span>
              </button>

              <button
                onClick={() => {
                  setBonusTargetRoom(maleRooms[0] || 'Phòng Nam 01');
                  setBonusPointsInput(10);
                  setBonusReasonInput('');
                  setIsBonusModalOpen(true);
                }}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold px-3 py-2 rounded-xl transition shadow-xs"
                title="Quản trị viên cộng điểm thi đua khen thưởng cho các phòng ở (Định mức 100 điểm)"
              >
                <Gift className="w-3.5 h-3.5" />
                <span>+ Thưởng Thi Đua</span>
              </button>

              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow-sm active:scale-95"
                title="Xuất bảng xếp hạng 12 phòng nam và 13 phòng nữ sang Excel kèm chi tiết chuyên cần & thưởng"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất Excel</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-blue-200 shadow-xs flex items-center gap-3">
              <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
                <Trophy className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Nhất Khu Nam (12 phòng)</p>
                <h4 className="text-base font-extrabold text-blue-900">
                  {maleRanking[0] ? `${maleRanking[0].roomName} (${maleRanking[0].finalTotalScore ?? maleRanking[0].averageScore}đ)` : 'Chưa có'}
                </h4>
                <p className="text-[10px] text-blue-600 font-semibold">Vị thứ #1 Khu Nam</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-pink-200 shadow-xs flex items-center gap-3">
              <div className="p-3 bg-pink-50 text-pink-700 rounded-xl">
                <Trophy className="w-6 h-6 text-pink-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Nhất Khu Nữ (13 phòng)</p>
                <h4 className="text-base font-extrabold text-pink-900">
                  {femaleRanking[0] ? `${femaleRanking[0].roomName} (${femaleRanking[0].finalTotalScore ?? femaleRanking[0].averageScore}đ)` : 'Chưa có'}
                </h4>
                <p className="text-[10px] text-pink-600 font-semibold">Vị thứ #1 Khu Nữ</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-rose-200 shadow-xs flex items-center gap-3">
              <div className="p-3 bg-rose-50 text-rose-700 rounded-xl">
                <Ban className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Tổng Trừ Chuyên Cần</p>
                <h4 className="text-base font-extrabold text-rose-900">
                  -{[...maleRanking, ...femaleRanking].reduce((sum, r) => sum + (r.attendanceBreakdown?.totalDayDeduction || 0) + (r.attendanceBreakdown?.totalNightDeduction || 0), 0)} điểm
                </h4>
                <p className="text-[10px] text-rose-600">Ngày & tự học đêm 25 phòng</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-xs flex items-center gap-3">
              <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
                <Gift className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Điểm Cộng Quản Trị</p>
                <h4 className="text-base font-extrabold text-amber-900">
                  +{[...maleRanking, ...femaleRanking].reduce((sum, r) => sum + (r.attendanceBreakdown?.adminBonusPoints || 0), 0)} điểm
                </h4>
                <p className="text-[10px] text-amber-700">Định mức khen thưởng tối đa 100đ</p>
              </div>
            </div>
          </div>

          {/* Leaderboards Display (Split by Khu 12 Nam & Khu 13 Nữ) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* KHU 12 PHÒNG NAM */}
            {(activeGenderTab === 'all' || activeGenderTab === 'nam') && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-white/20 rounded-lg">
                      <Users className="w-5 h-5 text-blue-200" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base tracking-tight">
                        XẾP THI ĐUA KHU 12 PHÒNG NAM
                      </h3>
                      <p className="text-xs text-blue-200">
                        Xếp vị thứ riêng từ 1 đến 12 dựa trên tổng điểm các bộ phận
                      </p>
                    </div>
                  </div>
                  <span className="bg-white/20 text-white font-bold text-xs px-2.5 py-1 rounded-full">
                    12 Phòng
                  </span>
                </div>

                <div className="divide-y divide-slate-100 flex-1">
                  {maleRanking.map((room) => {
                    const b = room.attendanceBreakdown;
                    return (
                      <div
                        key={room.roomId}
                        className="p-3.5 hover:bg-slate-50/80 transition flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {renderRankBadge(room.rank, true)}
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-900 text-sm">{room.roomName}</h4>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  (room.finalTotalScore ?? 0) >= 95
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : (room.finalTotalScore ?? 0) >= 85
                                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                    : (room.finalTotalScore ?? 0) >= 75
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                                }`}
                              >
                                {room.statusAward}
                              </span>
                            </div>

                            {/* Breakdown badges */}
                            <div className="flex items-center flex-wrap gap-1.5 text-xs text-slate-500 mt-1.5">
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                                Ban chấm: {b?.departmentBaseScore ?? 100}đ
                              </span>

                              {b && b.totalDayDeduction > 0 && (
                                <span
                                  className="px-1.5 py-0.5 rounded text-[10px] bg-rose-50 text-rose-700 border border-rose-200 font-bold"
                                  title={`Trừ chuyên cần ngày: Vắng KP ${b.dayLeaveUnexcusedCount} em (-${b.dayLeaveUnexcusedDeduction}đ), Bỏ tiết ${b.daySkippedClassCount} em (-${b.daySkippedClassDeduction}đ), Ăn không học ${b.dayAteNoClassCount} em (-${b.dayAteNoClassDeduction}đ)`}
                                >
                                  ☀️ Trừ ngày: -{b.totalDayDeduction}đ
                                </span>
                              )}

                              {b && b.totalNightDeduction > 0 && (
                                <span
                                  className="px-1.5 py-0.5 rounded text-[10px] bg-purple-50 text-purple-700 border border-purple-200 font-bold"
                                  title={`Trừ tự học đêm: Vắng KP ${b.nightLeaveUnexcusedCount} em (-${b.nightLeaveUnexcusedDeduction}đ)`}
                                >
                                  🌙 Trừ đêm: -{b.totalNightDeduction}đ
                                </span>
                              )}

                              {b && b.adminBonusPoints > 0 && (
                                <span
                                  className="px-1.5 py-0.5 rounded text-[10px] bg-amber-50 text-amber-800 border border-amber-300 font-bold"
                                  title={`Điểm thưởng Quản trị viên: ${b.adminBonusReason || 'Khen thưởng'}`}
                                >
                                  🎁 Thưởng: +{b.adminBonusPoints}đ
                                </span>
                              )}

                              {room.allPhotos.length > 0 && (
                                <span className="flex items-center gap-0.5 text-amber-600 font-medium text-[10px]">
                                  • <Camera className="w-3 h-3" /> {room.allPhotos.length} ảnh
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <div className="text-right">
                            <div className="text-lg font-black text-slate-900 leading-tight">
                              {room.finalTotalScore ?? room.averageScore}
                              <span className="text-xs font-normal text-slate-500">/100</span>
                            </div>
                            <div className="text-[10px] font-semibold text-emerald-700">
                              Tổng thi đua
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setBonusTargetRoom(room.roomName);
                              setBonusPointsInput(room.attendanceBreakdown?.adminBonusPoints || 10);
                              setBonusReasonInput(room.attendanceBreakdown?.adminBonusReason || '');
                              setIsBonusModalOpen(true);
                            }}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-[10px] font-bold transition flex items-center gap-0.5 shadow-xs"
                            title="Cộng điểm thi đua khen thưởng cho phòng này (Định mức 100đ)"
                          >
                            <Plus className="w-3 h-3" /> Thưởng
                          </button>

                          <button
                            onClick={() => setDetailRoomModal(room)}
                            className="p-1.5 hover:bg-slate-200/80 text-slate-600 rounded-xl transition"
                            title="Xem chi tiết điểm chuyên cần, bộ phận & ảnh minh chứng"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* KHU 13 PHÒNG NỮ */}
            {(activeGenderTab === 'all' || activeGenderTab === 'nu') && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-4 bg-gradient-to-r from-pink-700 to-rose-800 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-white/20 rounded-lg">
                      <Users className="w-5 h-5 text-pink-200" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base tracking-tight">
                        XẾP THI ĐUA KHU 13 PHÒNG NỮ
                      </h3>
                      <p className="text-xs text-pink-200">
                        Xếp vị thứ riêng từ 1 đến 13 dựa trên Tổng điểm thi đua
                      </p>
                    </div>
                  </div>
                  <span className="bg-white/20 text-white font-bold text-xs px-2.5 py-1 rounded-full">
                    13 Phòng
                  </span>
                </div>

                <div className="divide-y divide-slate-100 flex-1">
                  {femaleRanking.map((room) => {
                    const b = room.attendanceBreakdown;
                    return (
                      <div
                        key={room.roomId}
                        className="p-3.5 hover:bg-slate-50/80 transition flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {renderRankBadge(room.rank, true)}
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-900 text-sm">{room.roomName}</h4>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  (room.finalTotalScore ?? 0) >= 95
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : (room.finalTotalScore ?? 0) >= 85
                                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                    : (room.finalTotalScore ?? 0) >= 75
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                                }`}
                              >
                                {room.statusAward}
                              </span>
                            </div>

                            {/* Breakdown badges */}
                            <div className="flex items-center flex-wrap gap-1.5 text-xs text-slate-500 mt-1.5">
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                                Ban chấm: {b?.departmentBaseScore ?? 100}đ
                              </span>

                              {b && b.totalDayDeduction > 0 && (
                                <span
                                  className="px-1.5 py-0.5 rounded text-[10px] bg-rose-50 text-rose-700 border border-rose-200 font-bold"
                                  title={`Trừ chuyên cần ngày: Vắng KP ${b.dayLeaveUnexcusedCount} em (-${b.dayLeaveUnexcusedDeduction}đ), Bỏ tiết ${b.daySkippedClassCount} em (-${b.daySkippedClassDeduction}đ), Ăn không học ${b.dayAteNoClassCount} em (-${b.dayAteNoClassDeduction}đ)`}
                                >
                                  ☀️ Trừ ngày: -{b.totalDayDeduction}đ
                                </span>
                              )}

                              {b && b.totalNightDeduction > 0 && (
                                <span
                                  className="px-1.5 py-0.5 rounded text-[10px] bg-purple-50 text-purple-700 border border-purple-200 font-bold"
                                  title={`Trừ tự học đêm: Vắng KP ${b.nightLeaveUnexcusedCount} em (-${b.nightLeaveUnexcusedDeduction}đ)`}
                                >
                                  🌙 Trừ đêm: -{b.totalNightDeduction}đ
                                </span>
                              )}

                              {b && b.adminBonusPoints > 0 && (
                                <span
                                  className="px-1.5 py-0.5 rounded text-[10px] bg-amber-50 text-amber-800 border border-amber-300 font-bold"
                                  title={`Điểm thưởng Quản trị viên: ${b.adminBonusReason || 'Khen thưởng'}`}
                                >
                                  🎁 Thưởng: +{b.adminBonusPoints}đ
                                </span>
                              )}

                              {room.allPhotos.length > 0 && (
                                <span className="flex items-center gap-0.5 text-amber-600 font-medium text-[10px]">
                                  • <Camera className="w-3 h-3" /> {room.allPhotos.length} ảnh
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <div className="text-right">
                            <div className="text-lg font-black text-slate-900 leading-tight">
                              {room.finalTotalScore ?? room.averageScore}
                              <span className="text-xs font-normal text-slate-500">/100</span>
                            </div>
                            <div className="text-[10px] font-semibold text-emerald-700">
                              Tổng thi đua
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setBonusTargetRoom(room.roomName);
                              setBonusPointsInput(room.attendanceBreakdown?.adminBonusPoints || 10);
                              setBonusReasonInput(room.attendanceBreakdown?.adminBonusReason || '');
                              setIsBonusModalOpen(true);
                            }}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-[10px] font-bold transition flex items-center gap-0.5 shadow-xs"
                            title="Cộng điểm thi đua khen thưởng cho phòng này (Định mức 100đ)"
                          >
                            <Plus className="w-3 h-3" /> Thưởng
                          </button>

                          <button
                            onClick={() => setDetailRoomModal(room)}
                            className="p-1.5 hover:bg-slate-200/80 text-slate-600 rounded-xl transition"
                            title="Xem chi tiết điểm chuyên cần, bộ phận & ảnh minh chứng"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 2: CHUYÊN CẦN HỌC CHÍNH KHÓA (MỤC THỨ NHẤT - GVCN)     */}
      {/* ============================================================== */}
      {subTab === 'day_attendance' && (
        <div className="space-y-6">
          {/* Header Banner for Day Attendance */}
          <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white text-amber-900 flex items-center gap-1">
                    <Sun className="w-3.5 h-3.5" />
                    Mục Thứ Nhất
                  </span>
                  <span className="text-xs text-amber-100">
                    Điểm danh của GVCN • Áp dụng cho tất cả 25 phòng ở
                  </span>
                </div>
                <h3 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  CHUYÊN CẦN HỌC CHÍNH KHÓA & TRỪ ĐIỂM THI ĐUA
                </h3>
                <p className="text-xs md:text-sm text-amber-100/90 max-w-3xl">
                  Học sinh đi học chính khóa bị trừ điểm thi đua: 1 HS vắng không phép trừ{' '}
                  <strong className="text-white underline">{deductionRules.dayLeaveUnexcusedRate} điểm</strong> (2 HS = {deductionRules.dayLeaveUnexcusedRate * 2}đ); 1 HS bỏ tiết trừ{' '}
                  <strong className="text-white underline">{deductionRules.daySkippedClassRate} điểm</strong> (2 HS = {deductionRules.daySkippedClassRate * 2}đ); Lên ăn không đi học trừ{' '}
                  <strong className="text-white underline">{deductionRules.dayAteNoClassRate} điểm</strong>. &quot;Chưa lên trong tuần&quot; và &quot;Nghỉ có phép&quot; không bị trừ điểm.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setRulesDraft(deductionRules);
                    setIsRulesModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-amber-950 hover:bg-amber-50 transition shadow-md"
                >
                  <SlidersHorizontal className="w-4 h-4 text-amber-600" />
                  <span>Tùy Chỉnh Điểm Trừ</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          {(() => {
            const allRooms = [...maleRanking, ...femaleRanking];
            const totalUnexcused = allRooms.reduce(
              (sum, r) => sum + (r.attendanceBreakdown?.dayLeaveUnexcusedCount || 0),
              0
            );
            const totalSkipped = allRooms.reduce(
              (sum, r) => sum + (r.attendanceBreakdown?.daySkippedClassCount || 0),
              0
            );
            const totalAteNoClass = allRooms.reduce(
              (sum, r) => sum + (r.attendanceBreakdown?.dayAteNoClassCount || 0),
              0
            );
            const totalDayDeduction = allRooms.reduce(
              (sum, r) => sum + (r.attendanceBreakdown?.totalDayDeduction || 0),
              0
            );

            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-4 border border-rose-200 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-rose-600 font-bold mb-1">
                    <span>Vắng Không Phép</span>
                    <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px]">
                      -{deductionRules.dayLeaveUnexcusedRate}đ/em
                    </span>
                  </div>
                  <div className="text-2xl font-black text-rose-900">{totalUnexcused} em</div>
                  <div className="text-xs text-rose-600 font-semibold mt-0.5">
                    Tổng trừ: -{totalUnexcused * deductionRules.dayLeaveUnexcusedRate} điểm
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-amber-600 font-bold mb-1">
                    <span>HS Bỏ Tiết</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px]">
                      -{deductionRules.daySkippedClassRate}đ/em
                    </span>
                  </div>
                  <div className="text-2xl font-black text-amber-900">{totalSkipped} em</div>
                  <div className="text-xs text-amber-600 font-semibold mt-0.5">
                    Tổng trừ: -{totalSkipped * deductionRules.daySkippedClassRate} điểm
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-purple-200 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-purple-600 font-bold mb-1">
                    <span>Ăn Không Đi Học</span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px]">
                      -{deductionRules.dayAteNoClassRate}đ/em
                    </span>
                  </div>
                  <div className="text-2xl font-black text-purple-900">{totalAteNoClass} em</div>
                  <div className="text-xs text-purple-600 font-semibold mt-0.5">
                    Tổng trừ: -{totalAteNoClass * deductionRules.dayAteNoClassRate} điểm
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                  <div className="text-xs text-slate-500 font-bold mb-1">Tổng Trừ Chuyên Cần Ngày</div>
                  <div className="text-2xl font-black text-rose-600">-{totalDayDeduction} điểm</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">
                    Áp dụng toàn trường (25 phòng)
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Table of 25 Rooms: Day Attendance Penalties */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">
                  Bảng Chi Tiết Trừ Điểm Chuyên Cần Chính Khóa 25 Phòng Ở
                </h4>
                <p className="text-xs text-slate-500">
                  Số liệu từ buổi điểm danh của GVCN ngày {selectedDate}
                </p>
              </div>

              <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full">
                25 Phòng Ở (12 Nam • 13 Nữ)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3 text-center w-12">STT</th>
                    <th className="p-3">Phòng Ở</th>
                    <th className="p-3 text-center">Khu Vực</th>
                    <th className="p-3 text-center">Sĩ Số</th>
                    <th className="p-3 text-center bg-rose-50/60 text-rose-900">
                      Vắng Không Phép (-{deductionRules.dayLeaveUnexcusedRate}đ)
                    </th>
                    <th className="p-3 text-center bg-amber-50/60 text-amber-900">
                      HS Bỏ Tiết (-{deductionRules.daySkippedClassRate}đ)
                    </th>
                    <th className="p-3 text-center bg-purple-50/60 text-purple-900">
                      Ăn Không Học (-{deductionRules.dayAteNoClassRate}đ)
                    </th>
                    <th className="p-3 text-center text-slate-500">Nghỉ Có Phép (0đ)</th>
                    <th className="p-3 text-center text-slate-500">Chưa Lên (0đ)</th>
                    <th className="p-3 text-center bg-rose-100/70 text-rose-950 font-extrabold">
                      TỔNG TRỪ NGÀY
                    </th>
                    <th className="p-3 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {[...maleRanking, ...femaleRanking].map((room, idx) => {
                    const b = room.attendanceBreakdown;
                    const hasPenalty = (b?.totalDayDeduction || 0) > 0;
                    return (
                      <tr
                        key={room.roomId}
                        className={`hover:bg-slate-50 transition ${
                          hasPenalty ? 'bg-rose-50/20' : ''
                        }`}
                      >
                        <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <span>{room.roomName}</span>
                            {hasPenalty && (
                              <span className="w-2 h-2 rounded-full bg-rose-500" title="Có học sinh vi phạm" />
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              room.roomGender === 'Nam'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-pink-100 text-pink-800'
                            }`}
                          >
                            {room.roomGender === 'Nam' ? 'Khu Nam (12 phòng)' : 'Khu Nữ (13 phòng)'}
                          </span>
                        </td>
                        <td className="p-3 text-center text-slate-700 font-semibold">
                          {b?.dayTotalStudents || 0} em
                        </td>
                        <td className="p-3 text-center bg-rose-50/40">
                          {b && b.dayLeaveUnexcusedCount > 0 ? (
                            <span className="font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                              {b.dayLeaveUnexcusedCount} em (-{b.dayLeaveUnexcusedDeduction}đ)
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="p-3 text-center bg-amber-50/40">
                          {b && b.daySkippedClassCount > 0 ? (
                            <span className="font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                              {b.daySkippedClassCount} em (-{b.daySkippedClassDeduction}đ)
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="p-3 text-center bg-purple-50/40">
                          {b && b.dayAteNoClassCount > 0 ? (
                            <span className="font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                              {b.dayAteNoClassCount} em (-{b.dayAteNoClassDeduction}đ)
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="p-3 text-center text-slate-500">
                          {b?.dayLeaveExcusedCount || 0}
                        </td>
                        <td className="p-3 text-center text-slate-500">
                          {b?.dayNotAtSchoolCount || 0}
                        </td>
                        <td className="p-3 text-center bg-rose-100/50">
                          <span
                            className={`font-black text-sm ${
                              hasPenalty ? 'text-rose-700' : 'text-slate-400'
                            }`}
                          >
                            {hasPenalty ? `-${b?.totalDayDeduction}đ` : '0đ'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => setDetailRoomModal(room)}
                            className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition"
                            title="Xem chi tiết vi phạm & điểm thi đua"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 3: CHUYÊN CẦN TỰ HỌC ĐÊM (MỤC THỨ HAI - 19H ĐẾN 20H30) */}
      {/* ============================================================== */}
      {subTab === 'night_attendance' && (
        <div className="space-y-6">
          {/* Header Banner for Night Attendance */}
          <div className="bg-gradient-to-r from-indigo-800 via-purple-800 to-indigo-900 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white text-indigo-950 flex items-center gap-1">
                    <Moon className="w-3.5 h-3.5" />
                    Mục Thứ Hai
                  </span>
                  <span className="text-xs text-indigo-200">
                    Điểm danh tự học đêm (19h đến 20h30) • 25 Phòng Ở
                  </span>
                </div>
                <h3 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  CHUYÊN CẦN TỰ HỌC ĐÊM & TRỪ ĐIỂM THI ĐUA
                </h3>
                <p className="text-xs md:text-sm text-indigo-100/90 max-w-3xl">
                  Đối với học sinh của phòng ở đi học tự học đêm (19h đến 20h30): 1 HS vắng không phép trừ{' '}
                  <strong className="text-white underline">{deductionRules.nightLeaveUnexcusedRate} điểm</strong> (2 HS vắng không phép thì phòng đó bị trừ {deductionRules.nightLeaveUnexcusedRate * 2} điểm). Vắng có phép không trừ điểm. Số điểm trừ được tự động tổng hợp vào điểm thi đua toàn trường.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setRulesDraft(deductionRules);
                    setIsRulesModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-indigo-950 hover:bg-indigo-50 transition shadow-md"
                >
                  <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                  <span>Tùy Chỉnh Điểm Trừ Đêm</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Metrics for Night Attendance */}
          {(() => {
            const allRooms = [...maleRanking, ...femaleRanking];
            const totalPresent = allRooms.reduce(
              (sum, r) => sum + (r.attendanceBreakdown?.nightPresentCount || 0),
              0
            );
            const totalExcused = allRooms.reduce(
              (sum, r) => sum + (r.attendanceBreakdown?.nightLeaveExcusedCount || 0),
              0
            );
            const totalUnexcused = allRooms.reduce(
              (sum, r) => sum + (r.attendanceBreakdown?.nightLeaveUnexcusedCount || 0),
              0
            );
            const totalNightDeduction = allRooms.reduce(
              (sum, r) => sum + (r.attendanceBreakdown?.totalNightDeduction || 0),
              0
            );

            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-xs">
                  <div className="text-xs text-emerald-700 font-bold mb-1">Có Mặt Tự Học Đêm</div>
                  <div className="text-2xl font-black text-emerald-900">{totalPresent} em</div>
                  <div className="text-xs text-emerald-600 font-medium mt-0.5">
                    Đúng giờ, nghiêm túc (19h-20h30)
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-blue-200 shadow-xs">
                  <div className="text-xs text-blue-700 font-bold mb-1">Vắng Có Phép (0đ)</div>
                  <div className="text-2xl font-black text-blue-900">{totalExcused} em</div>
                  <div className="text-xs text-blue-600 font-medium mt-0.5">
                    Có đơn xin phép (Không trừ điểm)
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-rose-200 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-rose-600 font-bold mb-1">
                    <span>Vắng Không Phép Đêm</span>
                    <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px]">
                      -{deductionRules.nightLeaveUnexcusedRate}đ/em
                    </span>
                  </div>
                  <div className="text-2xl font-black text-rose-900">{totalUnexcused} em</div>
                  <div className="text-xs text-rose-600 font-semibold mt-0.5">
                    Tổng trừ: -{totalUnexcused * deductionRules.nightLeaveUnexcusedRate} điểm
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-purple-200 shadow-xs">
                  <div className="text-xs text-purple-700 font-bold mb-1">Tổng Trừ Tự Học Đêm</div>
                  <div className="text-2xl font-black text-purple-900">-{totalNightDeduction} điểm</div>
                  <div className="text-xs text-purple-600 font-medium mt-0.5">
                    Trừ vào điểm thi đua phòng
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Table of 25 Rooms: Night Study Penalties */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">
                  Bảng Chi Tiết Trừ Điểm Tự Học Đêm (19h - 20h30) 25 Phòng Ở
                </h4>
                <p className="text-xs text-slate-500">
                  Số liệu từ ca trực tự học đêm ngày {selectedDate}
                </p>
              </div>

              <span className="text-xs font-bold text-indigo-800 bg-indigo-100 px-2.5 py-1 rounded-full">
                25 Phòng Ở (12 Nam • 13 Nữ)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3 text-center w-12">STT</th>
                    <th className="p-3">Phòng Ở</th>
                    <th className="p-3 text-center">Khu Vực</th>
                    <th className="p-3 text-center">Sĩ Số</th>
                    <th className="p-3 text-center bg-emerald-50/60 text-emerald-900">
                      Có Mặt Tự Học Đêm
                    </th>
                    <th className="p-3 text-center text-slate-500">Vắng Có Phép (0đ)</th>
                    <th className="p-3 text-center bg-rose-50/60 text-rose-900">
                      Vắng Không Phép (-{deductionRules.nightLeaveUnexcusedRate}đ)
                    </th>
                    <th className="p-3 text-center bg-purple-100/70 text-purple-950 font-extrabold">
                      TỔNG TRỪ ĐÊM
                    </th>
                    <th className="p-3 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {[...maleRanking, ...femaleRanking].map((room, idx) => {
                    const b = room.attendanceBreakdown;
                    const hasNightPenalty = (b?.totalNightDeduction || 0) > 0;
                    return (
                      <tr
                        key={room.roomId}
                        className={`hover:bg-slate-50 transition ${
                          hasNightPenalty ? 'bg-purple-50/20' : ''
                        }`}
                      >
                        <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <span>{room.roomName}</span>
                            {hasNightPenalty && (
                              <span className="w-2 h-2 rounded-full bg-purple-600" title="Có học sinh vắng đêm không phép" />
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              room.roomGender === 'Nam'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-pink-100 text-pink-800'
                            }`}
                          >
                            {room.roomGender === 'Nam' ? 'Khu Nam (12 phòng)' : 'Khu Nữ (13 phòng)'}
                          </span>
                        </td>
                        <td className="p-3 text-center text-slate-700 font-semibold">
                          {b?.nightTotalStudents || 0} em
                        </td>
                        <td className="p-3 text-center bg-emerald-50/40">
                          <span className="font-bold text-emerald-800">
                            {b?.nightPresentCount || 0} em
                          </span>
                        </td>
                        <td className="p-3 text-center text-slate-500">
                          {b?.nightLeaveExcusedCount || 0}
                        </td>
                        <td className="p-3 text-center bg-rose-50/40">
                          {b && b.nightLeaveUnexcusedCount > 0 ? (
                            <span className="font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                              {b.nightLeaveUnexcusedCount} em (-{b.nightLeaveUnexcusedDeduction}đ)
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="p-3 text-center bg-purple-100/50">
                          <span
                            className={`font-black text-sm ${
                              hasNightPenalty ? 'text-purple-700' : 'text-slate-400'
                            }`}
                          >
                            {hasNightPenalty ? `-${b?.totalNightDeduction}đ` : '0đ'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => setDetailRoomModal(room)}
                            className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition"
                            title="Xem chi tiết vi phạm & điểm thi đua"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 4: CỘNG ĐIỂM THI ĐUA KHEN THƯỞNG (QUẢN TRỊ VIÊN)        */}
      {/* ============================================================== */}
      {subTab === 'bonus' && (
        <div className="space-y-6">
          {/* Header Banner for Bonus */}
          <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-cyan-900 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-400 text-slate-950 flex items-center gap-1">
                    <Gift className="w-3.5 h-3.5" />
                    Khen Thưởng Thi Đua
                  </span>
                  <span className="text-xs text-emerald-200">
                    Dành cho Quản trị viên • Định mức tối đa {deductionRules.maxBonusPointsLimit || 100} điểm
                  </span>
                </div>
                <h3 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  TRẠNG THÁI CỘNG ĐIỂM THI ĐUA CHO CÁC PHÒNG Ở
                </h3>
                <p className="text-xs md:text-sm text-emerald-100/90 max-w-3xl">
                  Quản trị viên tùy chọn cộng điểm thi đua cho các phòng ở theo định mức chuẩn 100 điểm kèm theo lý do khen thưởng (phòng vệ sinh xuất sắc, gương mẫu nề nếp, 100% chuyên cần tốt, tích cực phong trào ký túc xá...). Điểm cộng này được tự động cộng vào Tổng điểm thi đua của phòng.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setBonusTargetRoom(maleRooms[0] || 'Phòng Nam 01');
                    setBonusPointsInput(10);
                    setBonusReasonInput('');
                    setIsBonusModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 transition shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Thêm Điểm Thưởng</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          {(() => {
            const activeBonuses = Object.values(roomBonuses).filter((b) => b && b.points > 0);
            const totalBonusPoints = activeBonuses.reduce((sum, b) => sum + (b.points || 0), 0);

            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-xs flex items-center gap-3">
                  <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
                    <Building className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Số phòng được cộng điểm</p>
                    <h4 className="text-xl font-extrabold text-emerald-900">
                      {activeBonuses.length} / 25 phòng
                    </h4>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-xs flex items-center gap-3">
                  <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
                    <Sparkles className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Tổng điểm thưởng đã cấp</p>
                    <h4 className="text-xl font-extrabold text-amber-900">
                      +{totalBonusPoints} điểm
                    </h4>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3">
                  <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
                    <Percent className="w-6 h-6 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Định mức thưởng tối đa</p>
                    <h4 className="text-xl font-extrabold text-slate-900">
                      {deductionRules.maxBonusPointsLimit || 100} điểm / phòng
                    </h4>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Grid of 25 Rooms with Bonus State */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">
                  Danh Sách Điểm Thưởng Thi Đua 25 Phòng Ở
                </h4>
                <p className="text-xs text-slate-500">
                  Ngày áp dụng: {selectedDate}
                </p>
              </div>

              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
                {Object.keys(roomBonuses).length} phòng có thưởng
              </span>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...maleRooms, ...femaleRooms].map((roomName) => {
                const bonus = roomBonuses[roomName];
                const isMale = roomName.toLowerCase().includes('nam');
                const hasBonus = bonus && bonus.points > 0;

                return (
                  <div
                    key={roomName}
                    className={`p-3.5 rounded-xl border transition flex flex-col justify-between ${
                      hasBonus
                        ? 'bg-amber-50/40 border-amber-300 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-slate-900 text-sm">{roomName}</h5>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isMale ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                            }`}
                          >
                            {isMale ? 'Khu Nam' : 'Khu Nữ'}
                          </span>
                        </div>

                        <span
                          className={`font-black text-sm px-2 py-0.5 rounded-lg ${
                            hasBonus
                              ? 'bg-amber-200 text-amber-950'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {hasBonus ? `+${bonus.points}đ` : '0đ'}
                        </span>
                      </div>

                      {hasBonus ? (
                        <div className="mt-2 text-xs text-amber-900 bg-white p-2 rounded-lg border border-amber-200">
                          <p className="font-semibold">{bonus.reason}</p>
                          <span className="text-[10px] text-amber-700 block mt-1">
                            Cấp bởi: {bonus.awardedBy || 'Quản trị viên'}
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 mt-2 italic">
                          Chưa có điểm cộng khen thưởng
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-1.5 mt-3 pt-2 border-t border-slate-100">
                      {hasBonus && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm(`Bạn muốn xóa điểm thưởng của ${roomName}?`)) {
                              await deleteRoomCompetitionBonus(roomName, selectedDate);
                              setRoomBonuses((prev) => {
                                const copy = { ...prev };
                                delete copy[roomName];
                                return copy;
                              });
                            }
                          }}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-xs"
                          title="Xóa điểm thưởng này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setBonusTargetRoom(roomName);
                          setBonusPointsInput(bonus?.points || 10);
                          setBonusReasonInput(bonus?.reason || '');
                          setIsBonusModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs transition shadow-xs flex items-center gap-1"
                      >
                        <Gift className="w-3.5 h-3.5" />
                        <span>{hasBonus ? 'Sửa Thưởng' : '+ Thưởng'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 5: CHẤM ĐIỂM PHÒNG Ở (EVALUATION INPUT CARD)           */}
      {/* ============================================================== */}
      {subTab === 'scoring' && (
        <div className="space-y-6">
          {/* Room Selector Carousel / Tabs */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <Building className="w-5 h-5 text-emerald-600" />
                  Chọn Phòng Cần Chấm Điểm (25 Phòng Ở)
                </h3>
                <p className="text-xs text-slate-500">
                  Bấm chọn phòng để nhập điểm theo định mức 100 điểm cho từng tiêu chí
                </p>
              </div>

              {/* Evaluator Identity display */}
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs">
                <span className="text-emerald-800 font-bold">Người chấm:</span>
                <span className="text-emerald-950 font-semibold">{evaluatorName}</span>
                <span className="text-emerald-600 text-[10px]">({evaluatorEmail})</span>
              </div>
            </div>

            {/* Room Tabs: Split 12 Nam & 13 Nu */}
            <div className="space-y-3">
              {/* 12 Male Rooms */}
              <div>
                <div className="text-xs font-bold text-blue-800 mb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  Khu 12 Phòng Nam:
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {maleRooms.map((r) => {
                    const isSelected = selectedRoom === r;
                    const hasEval = evaluations.some((e) => e.roomId === r && e.date === selectedDate);
                    return (
                      <button
                        key={r}
                        onClick={() => setSelectedRoom(r)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 border ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-300'
                            : hasEval
                            ? 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span>{r}</span>
                        {hasEval && (
                          <span className={`text-[9px] ${isSelected ? 'text-blue-100' : 'text-blue-600 font-semibold'}`}>
                            ✓ Đã có điểm
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 13 Female Rooms */}
              <div>
                <div className="text-xs font-bold text-pink-800 mb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-pink-600"></span>
                  Khu 13 Phòng Nữ:
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-2">
                  {femaleRooms.map((r) => {
                    const isSelected = selectedRoom === r;
                    const hasEval = evaluations.some((e) => e.roomId === r && e.date === selectedDate);
                    return (
                      <button
                        key={r}
                        onClick={() => setSelectedRoom(r)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 border ${
                          isSelected
                            ? 'bg-pink-600 text-white border-pink-700 shadow-md ring-2 ring-pink-300'
                            : hasEval
                            ? 'bg-pink-50 text-pink-900 border-pink-200 hover:bg-pink-100'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span>{r}</span>
                        {hasEval && (
                          <span className={`text-[9px] ${isSelected ? 'text-pink-100' : 'text-pink-600 font-semibold'}`}>
                            ✓ Đã có điểm
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Scoring Form Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header of Form */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-amber-400 text-slate-950 font-extrabold text-xs rounded-full">
                    {currentRoomGender === 'Nam' ? 'Khu Nam' : 'Khu Nữ'}
                  </span>
                  <span className="text-emerald-200 text-xs">{currentWeekLabel}</span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white mt-0.5">
                  PHIẾU CHẤM ĐIỂM: {selectedRoom}
                </h3>
              </div>

              {/* Department Selector */}
              <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-xl border border-white/20">
                <span className="text-xs text-emerald-200 font-medium">Bộ phận chấm:</span>
                <select
                  value={selectedDepartmentId}
                  onChange={(e) => setSelectedDepartmentId(e.target.value)}
                  className="bg-emerald-950 text-white font-bold text-xs rounded-lg px-2.5 py-1.5 focus:outline-none border border-emerald-600"
                >
                  {departments
                    .filter((d) => d.isActive)
                    .map((dept) => (
                      <option key={dept.id} value={dept.id} className="text-slate-900 bg-white">
                        {dept.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Criteria Evaluation List */}
            <div className="p-4 sm:p-6 space-y-6">
              <div className="space-y-4">
                {criteria
                  .filter((c) => c.isActive)
                  .map((crit, idx) => {
                    const currentScore = scores[crit.id] ?? crit.standardPoints ?? 100;
                    const maxPts = crit.standardPoints || 100;

                    return (
                      <div
                        key={crit.id}
                        className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/80 space-y-3 hover:border-slate-300 transition"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
                                {idx + 1}
                              </span>
                              <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
                                {crit.name}
                              </h4>
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Định mức: {maxPts} điểm
                              </span>
                            </div>
                            {crit.description && (
                              <p className="text-xs text-slate-500 pl-8">{crit.description}</p>
                            )}
                          </div>

                          {/* Score Input & Quick Adjustment */}
                          <div className="flex items-center gap-3 self-end sm:self-auto">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-600">Điểm chấm:</span>
                              <div className="flex items-center border border-slate-300 rounded-xl bg-white px-2.5 py-1 shadow-inner">
                                <input
                                  type="number"
                                  min={0}
                                  max={maxPts}
                                  value={currentScore}
                                  onChange={(e) =>
                                    handleSetScore(crit.id, parseInt(e.target.value) || 0, maxPts)
                                  }
                                  className="w-14 text-center font-extrabold text-base text-slate-900 focus:outline-none"
                                />
                                <span className="text-xs text-slate-400 font-semibold">/{maxPts}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Quick Deductions / Preset Buttons */}
                        <div className="flex items-center flex-wrap gap-1.5 pt-1 pl-8">
                          <span className="text-[11px] font-semibold text-slate-400 mr-1">
                            Trừ nhanh:
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSetScore(crit.id, maxPts, maxPts)}
                            className={`px-2 py-1 rounded-lg text-xs font-bold transition border ${
                              currentScore === maxPts
                                ? 'bg-emerald-600 text-white border-emerald-700'
                                : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50'
                            }`}
                          >
                            ✓ Chuẩn ({maxPts}đ)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeduct(crit.id, 5, maxPts)}
                            className="px-2 py-1 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition"
                          >
                            -5 điểm
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeduct(crit.id, 10, maxPts)}
                            className="px-2 py-1 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition"
                          >
                            -10 điểm
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeduct(crit.id, 20, maxPts)}
                            className="px-2 py-1 rounded-lg text-xs font-semibold bg-white text-rose-700 border border-rose-200 hover:bg-rose-50 transition"
                          >
                            -20 điểm
                          </button>
                        </div>

                        {/* Specific Violation Note */}
                        <div className="pl-8 pt-1">
                          <input
                            type="text"
                            placeholder="Ghi chú cụ thể lỗi vi phạm (nếu có): ví dụ rác góc phòng, quên gấp 1 chăn màn..."
                            value={criterionNotes[crit.id] || ''}
                            onChange={(e) =>
                              setCriterionNotes((prev) => ({ ...prev, [crit.id]: e.target.value }))
                            }
                            className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        {/* Ô TẢI HÌNH ẢNH HOẶC CHỤP TRỰC TIẾP HÌNH ẢNH MINH CHỨNG CHO TỪNG TIÊU CHÍ */}
                        <div className="pl-8 pt-1.5">
                          <div className="bg-amber-50/70 rounded-xl p-3 border border-amber-200/90 space-y-2.5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Camera className="w-4 h-4 text-amber-700" />
                                <span className="text-xs font-bold text-slate-800">
                                  Minh chứng tiêu chí: {crit.name}
                                </span>
                                {(criterionPhotos[crit.id]?.length || 0) > 0 && (
                                  <span className="text-[10px] bg-amber-200/90 text-amber-950 font-extrabold px-2 py-0.5 rounded-full border border-amber-300">
                                    {criterionPhotos[crit.id]?.length} ảnh
                                  </span>
                                )}
                                {(criterionVideos[crit.id]?.length || 0) > 0 && (
                                  <span className="text-[10px] bg-purple-200 text-purple-950 font-extrabold px-2 py-0.5 rounded-full border border-purple-300">
                                    {criterionVideos[crit.id]?.length} video
                                  </span>
                                )}
                              </div>

                              {/* Three Action Buttons: Chụp trực tiếp, Tải hình ảnh, Tải video */}
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Hidden Camera input for this criterion */}
                                <input
                                  id={`camera-crit-${crit.id}`}
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  className="hidden"
                                  onChange={(e) => handleCriterionPhotoUpload(crit.id, e)}
                                />
                                <button
                                  type="button"
                                  onClick={() => document.getElementById(`camera-crit-${crit.id}`)?.click()}
                                  className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg transition shadow-2xs cursor-pointer border border-amber-400"
                                  title={`Chụp ảnh trực tiếp minh chứng cho tiêu chí ${crit.name}`}
                                >
                                  <Camera className="w-3.5 h-3.5" />
                                  <span>Chụp trực tiếp</span>
                                </button>

                                {/* Hidden File input for this criterion */}
                                <input
                                  id={`file-crit-${crit.id}`}
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  className="hidden"
                                  onChange={(e) => handleCriterionPhotoUpload(crit.id, e)}
                                />
                                <button
                                  type="button"
                                  onClick={() => document.getElementById(`file-crit-${crit.id}`)?.click()}
                                  className="flex items-center gap-1.5 bg-white hover:bg-slate-100 active:scale-95 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-lg transition border border-slate-300 shadow-2xs cursor-pointer"
                                  title={`Tải ảnh minh chứng cho tiêu chí ${crit.name} từ thư viện ảnh`}
                                >
                                  <Upload className="w-3.5 h-3.5 text-slate-600" />
                                  <span>Tải hình ảnh</span>
                                </button>

                                {/* Hidden Video File input for this criterion */}
                                <input
                                  id={`video-crit-${crit.id}`}
                                  type="file"
                                  accept="video/*"
                                  multiple
                                  className="hidden"
                                  onChange={(e) => handleCriterionVideoUpload(crit.id, e)}
                                />
                                <button
                                  type="button"
                                  disabled={uploadingCriterionVideo[crit.id]}
                                  onClick={() => document.getElementById(`video-crit-${crit.id}`)?.click()}
                                  className="flex items-center gap-1.5 bg-purple-100 hover:bg-purple-200 active:scale-95 text-purple-950 font-bold text-xs px-3 py-1.5 rounded-lg transition border border-purple-300 shadow-2xs cursor-pointer disabled:opacity-50"
                                  title={`Tải video minh chứng cho tiêu chí ${crit.name}`}
                                >
                                  {uploadingCriterionVideo[crit.id] ? (
                                    <>
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-700" />
                                      <span>Đang tải...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Video className="w-3.5 h-3.5 text-purple-700" />
                                      <span>Tải video</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Photo Previews Grid for this criterion */}
                            {criterionPhotos[crit.id] && criterionPhotos[crit.id].length > 0 && (
                              <div className="space-y-1 pt-1">
                                <span className="text-[11px] font-bold text-amber-900 block">
                                  Ảnh minh chứng ({criterionPhotos[crit.id].length} ảnh):
                                </span>
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                  {criterionPhotos[crit.id].map((photoUrl, pIdx) => (
                                    <div
                                      key={pIdx}
                                      className="group relative rounded-xl overflow-hidden border border-amber-300 bg-white aspect-square shadow-2xs"
                                    >
                                      <img
                                        src={photoUrl}
                                        alt={`Minh chứng ${crit.name} ${pIdx + 1}`}
                                        className="w-full h-full object-cover cursor-pointer"
                                        onClick={() => setPreviewPhoto(photoUrl)}
                                      />
                                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setPreviewPhoto(photoUrl)}
                                          className="p-1.5 bg-white/90 text-slate-900 rounded-lg hover:bg-white cursor-pointer shadow-xs"
                                          title="Xem ảnh phóng to"
                                        >
                                          <Maximize2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveCriterionPhoto(crit.id, pIdx)}
                                          className="p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 cursor-pointer shadow-xs"
                                          title="Xóa ảnh này"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Video Previews Grid for this criterion */}
                            {criterionVideos[crit.id] && criterionVideos[crit.id].length > 0 && (
                              <div className="space-y-1.5 pt-2">
                                <span className="text-[11px] font-bold text-purple-950 flex items-center gap-1.5">
                                  <Video className="w-3.5 h-3.5 text-purple-700" />
                                  Video minh chứng ({criterionVideos[crit.id].length} video):
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                  {criterionVideos[crit.id].map((videoUri, vIdx) => (
                                    <CriterionVideoPlayer
                                      key={vIdx}
                                      videoUri={videoUri}
                                      title={`Minh chứng video ${crit.name} ${vIdx + 1}`}
                                      onPreview={(resolvedUrl) =>
                                        setPreviewVideo({
                                          url: resolvedUrl,
                                          title: `Video minh chứng: ${crit.name} (${selectedRoom})`,
                                        })
                                      }
                                      onDelete={() => handleRemoveCriterionVideo(crit.id, vIdx)}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Empty state when neither photos nor videos */}
                            {(!criterionPhotos[crit.id] || criterionPhotos[crit.id].length === 0) &&
                            (!criterionVideos[crit.id] || criterionVideos[crit.id].length === 0) && (
                              <div className="text-[11px] text-amber-900/80 italic flex items-center gap-1.5 bg-white/60 p-2 rounded-lg border border-amber-200/50">
                                <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>Chưa có ảnh hoặc video minh chứng cho tiêu chí này. Bấm <strong>Chụp trực tiếp</strong>, <strong>Tải hình ảnh</strong> hoặc <strong>Tải video</strong> khi phát hiện lỗi hoặc cần lưu bằng chứng phòng ở.</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* General Note */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-slate-600" />
                  Nhận xét chung của bộ phận chấm điểm:
                </label>
                <textarea
                  rows={2}
                  value={generalNote}
                  onChange={(e) => setGeneralNote(e.target.value)}
                  placeholder="Ghi nhận nỗ lực của phòng, nhắc nhở nề nếp chung hoặc kiến nghị..."
                  className="w-full text-xs bg-white border border-slate-200 rounded-xl p-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* ========================================== */}
              {/* PHOTO EVIDENCE UPLOAD SECTION              */}
              {/* ========================================== */}
              <div className="bg-amber-50/60 rounded-2xl p-4 sm:p-5 border border-amber-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Camera className="w-4 h-4 text-amber-600" />
                      Hình Ảnh Minh Chứng Khi Chấm Điểm
                    </h4>
                    <p className="text-xs text-slate-600">
                      Chụp ảnh trực tiếp từ camera hoặc tải ảnh phòng ở, giường chiếu, vi phạm làm minh chứng
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Camera Capture Input */}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      ref={cameraInputRef}
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition shadow-xs active:scale-95"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Chụp Ảnh Ngay</span>
                    </button>

                    {/* File Upload Input */}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      ref={fileInputRef}
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 bg-white text-slate-800 border border-slate-300 hover:bg-slate-100 font-bold text-xs px-3 py-2 rounded-xl transition active:scale-95"
                    >
                      <Upload className="w-3.5 h-3.5 text-slate-600" />
                      <span>Chọn Từ Thư Viện</span>
                    </button>
                  </div>
                </div>

                {/* Photo Previews */}
                {evidencePhotos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2">
                    {evidencePhotos.map((photoUrl, pIdx) => (
                      <div
                        key={pIdx}
                        className="group relative rounded-xl overflow-hidden border border-amber-300 bg-white aspect-square shadow-xs"
                      >
                        <img
                          src={photoUrl}
                          alt={`Minh chứng ${pIdx + 1}`}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => setPreviewPhoto(photoUrl)}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewPhoto(photoUrl)}
                            className="p-1.5 bg-white/90 text-slate-900 rounded-lg hover:bg-white"
                            title="Xem phóng to ảnh"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(pIdx)}
                            className="p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700"
                            title="Xóa ảnh này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border border-dashed border-amber-300 rounded-xl p-4 text-center text-xs text-amber-800/80 bg-white/50">
                    Chưa có hình ảnh minh chứng nào được tải lên cho lượt chấm này.
                  </div>
                )}
              </div>

              {/* Total & Save Action Bar */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-400 text-slate-950 rounded-xl font-black text-2xl shadow-md">
                    {currentFormTotalScore}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-base">
                      ĐIỂM TỔNG KẾT BỘ PHẬN: {currentFormTotalScore}/100
                    </h4>
                    <p className="text-xs text-slate-300">
                      Tính theo điểm trung bình thang 100 từ {criteria.filter((c) => c.isActive).length} tiêu chí
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {saveSuccessMsg && (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> {saveSuccessMsg}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveEvaluation}
                    disabled={isSavingScore}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold text-sm px-6 py-3 rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingScore ? 'Đang Lưu...' : 'Lưu Điểm Thi Đua'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 3: CẤU HÌNH TIÊU CHÍ & BỘ PHẬN CHẤM (ADMIN CONFIG)    */}
      {/* ============================================================== */}
      {subTab === 'config' && (
        <div className="space-y-6">
          {/* Section 1: Criteria Configuration */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base flex items-center gap-2">
                  <Settings className="w-5 h-5 text-amber-400" />
                  CẤU HÌNH CÁC TIÊU CHÍ THI ĐUA (ĐỊNH MỨC 100 ĐIỂM)
                </h3>
                <p className="text-xs text-slate-300">
                  Quản trị viên tự thêm, sửa tiêu chí, đặt định mức điểm cho 25 phòng ở
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    if (confirm('Khôi phục danh sách tiêu chí mặc định chuẩn của trường?')) {
                      const res = await resetCompetitionCriteria();
                      setCriteria(res);
                    }
                  }}
                  className="text-xs font-semibold text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 transition flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Khôi phục mặc định</span>
                </button>

                <button
                  onClick={() =>
                    setEditingCriterion({
                      id: `criterion_${Date.now()}`,
                      name: '',
                      standardPoints: 100,
                      description: '',
                      order: criteria.length + 1,
                      isActive: true,
                    })
                  }
                  className="bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm Tiêu Chí</span>
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {criteria.map((crit) => (
                <div
                  key={crit.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-sm">{crit.name}</span>
                      <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-md border border-emerald-200">
                        Định mức: {crit.standardPoints} điểm
                      </span>
                      {!crit.isActive && (
                        <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          Đã ẩn
                        </span>
                      )}
                    </div>
                    {crit.description && (
                      <p className="text-xs text-slate-500">{crit.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => setEditingCriterion({ ...crit })}
                      className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 hover:text-slate-900 transition"
                      title="Sửa tiêu chí"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm(`Bạn có chắc muốn xóa tiêu chí "${crit.name}"?`)) {
                          await deleteCompetitionCriterion(crit.id);
                          setCriteria((prev) => prev.filter((c) => c.id !== crit.id));
                        }
                      }}
                      className="p-1.5 hover:bg-rose-100 rounded-lg text-rose-600 transition"
                      title="Xóa tiêu chí"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Department Configuration */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base flex items-center gap-2">
                  <Users className="w-5 h-5 text-teal-400" />
                  CÁC BỘ PHẬN THAM GIA CHẤM ĐIỂM THI ĐUA
                </h3>
                <p className="text-xs text-slate-300">
                  Ban Giám hiệu, Ban Quản sinh (4 thành viên), Y tế, GV trực đêm, Ban Thanh tra, Đoàn Thanh niên...
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    if (confirm('Khôi phục danh sách các bộ phận chấm điểm mặc định?')) {
                      const res = await resetCompetitionDepartments();
                      setDepartments(res);
                    }
                  }}
                  className="text-xs font-semibold text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 transition flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Khôi phục mặc định</span>
                </button>

                <button
                  onClick={() =>
                    setEditingDepartment({
                      id: `dept_${Date.now()}`,
                      name: '',
                      description: '',
                      membersCount: 1,
                      order: departments.length + 1,
                      isActive: true,
                    })
                  }
                  className="bg-teal-400 hover:bg-teal-500 text-slate-950 text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm Bộ Phận</span>
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {departments.map((dept) => (
                <div
                  key={dept.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-sm">{dept.name}</span>
                      {dept.membersCount && dept.membersCount > 1 && (
                        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-md border border-blue-200">
                          {dept.membersCount} thành viên
                        </span>
                      )}
                      {!dept.isActive && (
                        <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          Đã ẩn
                        </span>
                      )}
                    </div>
                    {dept.description && (
                      <p className="text-xs text-slate-500">{dept.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => setEditingDepartment({ ...dept })}
                      className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 hover:text-slate-900 transition"
                      title="Sửa bộ phận"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm(`Bạn có chắc muốn xóa bộ phận "${dept.name}"?`)) {
                          await deleteCompetitionDepartment(dept.id);
                          setDepartments((prev) => prev.filter((d) => d.id !== dept.id));
                        }
                      }}
                      className="p-1.5 hover:bg-rose-100 rounded-lg text-rose-600 transition"
                      title="Xóa bộ phận"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: EDIT / ADD CRITERION                                    */}
      {/* ============================================================== */}
      {editingCriterion && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="font-extrabold text-base text-slate-900">
                {criteria.some((c) => c.id === editingCriterion.id)
                  ? 'Chỉnh Sửa Tiêu Chí'
                  : 'Thêm Tiêu Chí Thi Đua Mới'}
              </h4>
              <button
                onClick={() => setEditingCriterion(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Tên tiêu chí *</label>
                <input
                  type="text"
                  value={editingCriterion.name || ''}
                  onChange={(e) => setEditingCriterion({ ...editingCriterion, name: e.target.value })}
                  placeholder="Ví dụ: Vệ sinh phòng ở, Nề nếp phòng ở..."
                  className="w-full text-xs border border-slate-300 rounded-xl p-2.5 mt-1 focus:outline-none focus:border-emerald-500 font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Định mức điểm chuẩn (thang điểm)</label>
                <input
                  type="number"
                  value={editingCriterion.standardPoints || 100}
                  onChange={(e) =>
                    setEditingCriterion({
                      ...editingCriterion,
                      standardPoints: parseInt(e.target.value) || 100,
                    })
                  }
                  className="w-full text-xs border border-slate-300 rounded-xl p-2.5 mt-1 focus:outline-none focus:border-emerald-500 font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Mô tả / Hướng dẫn chấm</label>
                <textarea
                  rows={2}
                  value={editingCriterion.description || ''}
                  onChange={(e) =>
                    setEditingCriterion({ ...editingCriterion, description: e.target.value })
                  }
                  placeholder="Tiêu chuẩn cần đạt, các lỗi trừ điểm thông thường..."
                  className="w-full text-xs border border-slate-300 rounded-xl p-2.5 mt-1 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="crit_active"
                  checked={editingCriterion.isActive ?? true}
                  onChange={(e) =>
                    setEditingCriterion({ ...editingCriterion, isActive: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="crit_active" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Kích hoạt tiêu chí này trong phiếu chấm điểm
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setEditingCriterion(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!editingCriterion.name?.trim()) {
                    alert('Vui lòng nhập tên tiêu chí!');
                    return;
                  }
                  const payload: CompetitionCriterion = {
                    id: editingCriterion.id || `crit_${Date.now()}`,
                    name: editingCriterion.name.trim(),
                    standardPoints: editingCriterion.standardPoints || 100,
                    description: editingCriterion.description?.trim() || '',
                    order: editingCriterion.order || criteria.length + 1,
                    isActive: editingCriterion.isActive ?? true,
                  };
                  await saveCompetitionCriterion(payload);
                  setCriteria((prev) => {
                    const idx = prev.findIndex((c) => c.id === payload.id);
                    if (idx >= 0) {
                      const updated = [...prev];
                      updated[idx] = payload;
                      return updated;
                    }
                    return [...prev, payload];
                  });
                  setEditingCriterion(null);
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm"
              >
                Lưu Tiêu Chí
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: EDIT / ADD DEPARTMENT                                   */}
      {/* ============================================================== */}
      {editingDepartment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="font-extrabold text-base text-slate-900">
                {departments.some((d) => d.id === editingDepartment.id)
                  ? 'Chỉnh Sửa Bộ Phận Chấm'
                  : 'Thêm Bộ Phận Chấm Điểm Mới'}
              </h4>
              <button
                onClick={() => setEditingDepartment(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Tên bộ phận *</label>
                <input
                  type="text"
                  value={editingDepartment.name || ''}
                  onChange={(e) => setEditingDepartment({ ...editingDepartment, name: e.target.value })}
                  placeholder="Ví dụ: Ban Giám hiệu, Ban Quản sinh, Y tế..."
                  className="w-full text-xs border border-slate-300 rounded-xl p-2.5 mt-1 focus:outline-none focus:border-teal-500 font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Số lượng thành viên (nếu có)</label>
                <input
                  type="number"
                  value={editingDepartment.membersCount || 1}
                  onChange={(e) =>
                    setEditingDepartment({
                      ...editingDepartment,
                      membersCount: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-full text-xs border border-slate-300 rounded-xl p-2.5 mt-1 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Mô tả nhiệm vụ</label>
                <textarea
                  rows={2}
                  value={editingDepartment.description || ''}
                  onChange={(e) =>
                    setEditingDepartment({ ...editingDepartment, description: e.target.value })
                  }
                  placeholder="Nội dung phụ trách chấm, lịch kiểm tra..."
                  className="w-full text-xs border border-slate-300 rounded-xl p-2.5 mt-1 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="dept_active"
                  checked={editingDepartment.isActive ?? true}
                  onChange={(e) =>
                    setEditingDepartment({ ...editingDepartment, isActive: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="dept_active" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Kích hoạt bộ phận này tham gia chấm điểm
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setEditingDepartment(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!editingDepartment.name?.trim()) {
                    alert('Vui lòng nhập tên bộ phận!');
                    return;
                  }
                  const payload: CompetitionDepartment = {
                    id: editingDepartment.id || `dept_${Date.now()}`,
                    name: editingDepartment.name.trim(),
                    description: editingDepartment.description?.trim() || '',
                    membersCount: editingDepartment.membersCount || 1,
                    order: editingDepartment.order || departments.length + 1,
                    isActive: editingDepartment.isActive ?? true,
                  };
                  await saveCompetitionDepartment(payload);
                  setDepartments((prev) => {
                    const idx = prev.findIndex((d) => d.id === payload.id);
                    if (idx >= 0) {
                      const updated = [...prev];
                      updated[idx] = payload;
                      return updated;
                    }
                    return [...prev, payload];
                  });
                  setEditingDepartment(null);
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white shadow-sm"
              >
                Lưu Bộ Phận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ROOM DETAIL & DEPARTMENT BREAKDOWN                      */}
      {/* ============================================================== */}
      {detailRoomModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-slate-950">
                    {detailRoomModal.roomGender === 'Nam' ? 'Khu Nam' : 'Khu Nữ'}
                  </span>
                  <span className="text-xs text-emerald-200">
                    Vị thứ: #{detailRoomModal.rank} ({detailRoomModal.statusAward})
                  </span>
                </div>
                <h3 className="text-lg font-black text-white mt-1">
                  CHI TIẾT ĐIỂM THI ĐUA: {detailRoomModal.roomName}
                </h3>
              </div>
              <button
                onClick={() => setDetailRoomModal(null)}
                className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {/* Final Competition Synthesis Card */}
              {(() => {
                const b = detailRoomModal.attendanceBreakdown;
                return (
                  <div className="space-y-3">
                    <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 block">
                          Tổng Điểm Thi Đua Xếp Hạng
                        </span>
                        <h4 className="text-xl font-black text-white mt-0.5">
                          {detailRoomModal.finalTotalScore ?? detailRoomModal.averageScore} / 100 điểm
                        </h4>
                        <p className="text-xs text-emerald-200 mt-0.5">
                          Vị thứ #{detailRoomModal.rank} ({detailRoomModal.roomGender === 'Nam' ? 'Khu Nam 12 phòng' : 'Khu Nữ 13 phòng'}) • {detailRoomModal.statusAward}
                        </p>
                      </div>

                      <div className="bg-white/10 backdrop-blur-md px-3 py-2 rounded-xl border border-white/20 text-right">
                        <span className="text-[10px] text-emerald-200 block">Công thức tính:</span>
                        <span className="text-xs font-mono font-bold text-white">
                          ({b?.departmentBaseScore ?? 100}đ) - ({b?.totalDayDeduction || 0}đ) - ({b?.totalNightDeduction || 0}đ) + ({b?.adminBonusPoints || 0}đ)
                        </span>
                      </div>
                    </div>

                    {/* 4 Metrics Components */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-bold block">Ban Chấm / Chuẩn:</span>
                        <span className="text-sm font-black text-slate-800">{b?.departmentBaseScore ?? 100}đ</span>
                      </div>
                      <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                        <span className="text-[10px] text-rose-600 font-bold block">☀️ Trừ Chính Khóa:</span>
                        <span className="text-sm font-black text-rose-700">-{b?.totalDayDeduction || 0}đ</span>
                      </div>
                      <div className="bg-purple-50 p-2.5 rounded-xl border border-purple-200">
                        <span className="text-[10px] text-purple-600 font-bold block">🌙 Trừ Học Đêm:</span>
                        <span className="text-sm font-black text-purple-700">-{b?.totalNightDeduction || 0}đ</span>
                      </div>
                      <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-300">
                        <span className="text-[10px] text-amber-800 font-bold block">🎁 Thưởng Quản Trị:</span>
                        <span className="text-sm font-black text-amber-900">+{b?.adminBonusPoints || 0}đ</span>
                      </div>
                    </div>

                    {/* Detailed Attendance Penalty Cards */}
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-2">
                      <div className="flex items-center justify-between font-bold text-slate-800">
                        <span>☀️ Mục 1: Điểm danh GVCN (Học chính khóa)</span>
                        <span className="text-rose-700 font-black">Trừ: -{b?.totalDayDeduction || 0}đ</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px] text-slate-600">
                        <div className="bg-white p-2 rounded-lg border border-slate-100">
                          Vắng không phép (-{deductionRules.dayLeaveUnexcusedRate}đ/em): <strong className="text-rose-700">{b?.dayLeaveUnexcusedCount || 0} em</strong> (-{b?.dayLeaveUnexcusedDeduction || 0}đ)
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-100">
                          Bỏ tiết (-{deductionRules.daySkippedClassRate}đ/em): <strong className="text-amber-700">{b?.daySkippedClassCount || 0} em</strong> (-{b?.daySkippedClassDeduction || 0}đ)
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-100">
                          Ăn không học (-{deductionRules.dayAteNoClassRate}đ/em): <strong className="text-purple-700">{b?.dayAteNoClassCount || 0} em</strong> (-{b?.dayAteNoClassDeduction || 0}đ)
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-100">
                          Nghỉ có phép (0đ): <strong>{b?.dayLeaveExcusedCount || 0} em</strong> (Không trừ)
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-100">
                          Chưa lên tuần (0đ): <strong>{b?.dayNotAtSchoolCount || 0} em</strong> (Không trừ)
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-2">
                      <div className="flex items-center justify-between font-bold text-slate-800">
                        <span>🌙 Mục 2: Điểm danh tự học đêm (19h - 20h30)</span>
                        <span className="text-purple-700 font-black">Trừ: -{b?.totalNightDeduction || 0}đ</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px] text-slate-600">
                        <div className="bg-white p-2 rounded-lg border border-slate-100">
                          Có mặt học đêm: <strong className="text-emerald-700">{b?.nightPresentCount || 0} em</strong>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-100">
                          Vắng không phép (-{deductionRules.nightLeaveUnexcusedRate}đ/em): <strong className="text-rose-700">{b?.nightLeaveUnexcusedCount || 0} em</strong> (-{b?.nightLeaveUnexcusedDeduction || 0}đ)
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-100">
                          Vắng có phép (0đ): <strong>{b?.nightLeaveExcusedCount || 0} em</strong> (Không trừ)
                        </div>
                      </div>
                    </div>

                    {b && b.adminBonusPoints > 0 && (
                      <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-xs space-y-1">
                        <div className="flex items-center justify-between font-bold text-amber-900">
                          <span className="flex items-center gap-1.5">
                            <Gift className="w-4 h-4 text-amber-600" />
                            Điểm cộng thi đua của Quản trị viên
                          </span>
                          <span className="text-amber-800 font-black text-sm">+{b.adminBonusPoints} điểm</span>
                        </div>
                        {b.adminBonusReason && (
                          <p className="text-[11px] text-amber-800 italic">
                            Lý do khen thưởng: {b.adminBonusReason}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Department Breakdown */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-700" />
                  Điểm Chấm Theo Từng Bộ Phận:
                </h4>

                {detailRoomModal.departmentScores.length > 0 ? (
                  <div className="space-y-2.5">
                    {detailRoomModal.departmentScores.map((deptScore, dIdx) => (
                      <div
                        key={dIdx}
                        className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-900 text-sm">
                              {deptScore.departmentName}
                            </span>
                            <span className="text-xs text-slate-500 ml-2">
                              (Chấm bởi: {deptScore.evaluatorName})
                            </span>
                          </div>
                          <div className="text-base font-black text-emerald-800">
                            {deptScore.totalScore}
                            <span className="text-xs font-normal text-slate-500">/100</span>
                          </div>
                        </div>

                        {deptScore.generalNote && (
                          <p className="text-xs text-slate-600 bg-white p-2 rounded-lg border border-slate-100">
                            <strong>Nhận xét:</strong> {deptScore.generalNote}
                          </p>
                        )}

                        {/* Criteria Breakdown, Photos & Videos for this department */}
                        <div className="pt-2 border-t border-slate-200/80 space-y-2">
                          <span className="text-[11px] font-bold text-slate-700 block">
                            Chi tiết điểm, ảnh & video minh chứng theo tiêu chí:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {criteria
                              .filter((c) => c.isActive)
                              .map((crit) => {
                                const critScore = deptScore.scores?.[crit.id] ?? crit.standardPoints ?? 100;
                                const critNote = deptScore.notes?.[crit.id];
                                const critImgs = deptScore.criterionPhotos?.[crit.id] || [];
                                const critVids = deptScore.criterionVideos?.[crit.id] || [];

                                return (
                                  <div
                                    key={crit.id}
                                    className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1.5"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-slate-800 text-[11px]">
                                        {crit.name}:
                                      </span>
                                      <span className="font-bold text-emerald-800 text-[11px]">
                                        {critScore}/{crit.standardPoints || 100}đ
                                      </span>
                                    </div>
                                    {critNote && (
                                      <p className="text-[10px] text-rose-700 italic bg-rose-50/60 px-1.5 py-0.5 rounded border border-rose-200/60">
                                        Lỗi: {critNote}
                                      </p>
                                    )}

                                    {/* Photos */}
                                    {critImgs.length > 0 && (
                                      <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
                                        {critImgs.map((imgUrl, imgIdx) => (
                                          <img
                                            key={imgIdx}
                                            src={imgUrl}
                                            alt={`Minh chứng ${crit.name}`}
                                            onClick={() => setPreviewPhoto(imgUrl)}
                                            className="w-12 h-12 object-cover rounded-md border border-slate-300 cursor-pointer hover:opacity-80 transition shrink-0"
                                            title="Bấm để xem ảnh to"
                                          />
                                        ))}
                                      </div>
                                    )}

                                    {/* Videos */}
                                    {critVids.length > 0 && (
                                      <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
                                        {critVids.map((vidUri, vidIdx) => (
                                          <button
                                            key={vidIdx}
                                            type="button"
                                            onClick={async () => {
                                              const resolved = await resolveVideoUrl(vidUri);
                                              setPreviewVideo({
                                                url: resolved,
                                                title: `Video: ${crit.name} (${deptScore.departmentName})`,
                                              });
                                            }}
                                            className="flex items-center gap-1 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 px-2 py-1 rounded-md text-[10px] font-bold shrink-0 cursor-pointer transition shadow-2xs"
                                            title="Bấm để phát video"
                                          >
                                            <Play className="w-3 h-3 text-purple-700 fill-purple-700" />
                                            <span>Video {vidIdx + 1}</span>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        </div>

                        {/* Photos from this department */}
                        {deptScore.evidencePhotos && deptScore.evidencePhotos.length > 0 && (
                          <div className="pt-1">
                            <span className="text-[11px] font-bold text-slate-500 block mb-1">
                              Tất cả ảnh minh chứng của ca chấm ({deptScore.evidencePhotos.length} ảnh):
                            </span>
                            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                              {deptScore.evidencePhotos.map((imgUrl, i) => (
                                <img
                                  key={i}
                                  src={imgUrl}
                                  alt="Minh chứng"
                                  onClick={() => setPreviewPhoto(imgUrl)}
                                  className="w-16 h-16 object-cover rounded-lg border border-slate-300 cursor-pointer hover:opacity-80 transition shrink-0"
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Videos from this department */}
                        {deptScore.evidenceVideos && deptScore.evidenceVideos.length > 0 && (
                          <div className="pt-1">
                            <span className="text-[11px] font-bold text-slate-500 block mb-1">
                              Tất cả video minh chứng của ca chấm ({deptScore.evidenceVideos.length} video):
                            </span>
                            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                              {deptScore.evidenceVideos.map((vidUri, vi) => (
                                <button
                                  key={vi}
                                  type="button"
                                  onClick={async () => {
                                    const resolved = await resolveVideoUrl(vidUri);
                                    setPreviewVideo({
                                      url: resolved,
                                      title: `Video ca chấm: ${deptScore.departmentName} (${detailRoomModal.roomName})`,
                                    });
                                  }}
                                  className="flex items-center gap-1.5 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 px-2.5 py-1.5 rounded-lg text-xs font-bold shrink-0 cursor-pointer transition shadow-2xs"
                                >
                                  <Play className="w-3.5 h-3.5 text-purple-700 fill-purple-700" />
                                  <span>Phát video {vi + 1}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 p-4 bg-slate-50 rounded-xl text-center">
                    Chưa có bộ phận nào chấm điểm cho phòng này trong khoảng thời gian đã chọn.
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-100 border-t flex justify-end">
              <button
                type="button"
                onClick={() => setDetailRoomModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CUSTOMIZE COMPETITION DEDUCTION & BONUS RULES           */}
      {/* ============================================================== */}
      {isRulesModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <SlidersHorizontal className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-slate-900">
                    Quy Tắc Trừ & Cộng Điểm Thi Đua
                  </h4>
                  <p className="text-xs text-slate-500">
                    Tùy chỉnh định mức trừ điểm chuyên cần và điểm cộng Quản trị viên
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRulesModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Mục 1: Chính khóa */}
              <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 space-y-2.5">
                <span className="font-extrabold text-amber-950 flex items-center gap-1.5">
                  <Sun className="w-4 h-4 text-amber-600" />
                  Mục 1: Chuyên cần học chính khóa (GVCN điểm danh)
                </span>

                <div className="space-y-2 text-slate-700">
                  <div className="flex items-center justify-between gap-3 bg-white p-2 rounded-lg border border-amber-100">
                    <div>
                      <span className="font-bold text-slate-900 block">Vắng không phép:</span>
                      <span className="text-[11px] text-slate-500">1 HS vắng không phép bị trừ (2 HS = nhân đôi)</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={rulesDraft.dayLeaveUnexcusedRate}
                        onChange={(e) =>
                          setRulesDraft({
                            ...rulesDraft,
                            dayLeaveUnexcusedRate: Math.max(0, parseInt(e.target.value) || 0),
                          })
                        }
                        className="w-16 text-center font-bold text-rose-700 border border-slate-300 rounded-lg py-1 focus:outline-none focus:border-amber-500"
                      />
                      <span className="font-bold text-slate-600">điểm</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 bg-white p-2 rounded-lg border border-amber-100">
                    <div>
                      <span className="font-bold text-slate-900 block">Bỏ tiết (HS Bỏ tiết):</span>
                      <span className="text-[11px] text-slate-500">1 HS bỏ tiết bị trừ (2 HS = nhân đôi)</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={rulesDraft.daySkippedClassRate}
                        onChange={(e) =>
                          setRulesDraft({
                            ...rulesDraft,
                            daySkippedClassRate: Math.max(0, parseInt(e.target.value) || 0),
                          })
                        }
                        className="w-16 text-center font-bold text-amber-700 border border-slate-300 rounded-lg py-1 focus:outline-none focus:border-amber-500"
                      />
                      <span className="font-bold text-slate-600">điểm</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 bg-white p-2 rounded-lg border border-amber-100">
                    <div>
                      <span className="font-bold text-slate-900 block">Ăn không học (Lên ăn không đi học):</span>
                      <span className="text-[11px] text-slate-500">Tùy chỉnh số điểm trừ cho mỗi em</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={rulesDraft.dayAteNoClassRate}
                        onChange={(e) =>
                          setRulesDraft({
                            ...rulesDraft,
                            dayAteNoClassRate: Math.max(0, parseInt(e.target.value) || 0),
                          })
                        }
                        className="w-16 text-center font-bold text-purple-700 border border-slate-300 rounded-lg py-1 focus:outline-none focus:border-amber-500"
                      />
                      <span className="font-bold text-slate-600">điểm</span>
                    </div>
                  </div>

                  <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Nghỉ có phép và Chưa lên trong tuần: <strong>0 điểm (Không bị trừ điểm)</strong></span>
                  </div>
                </div>
              </div>

              {/* Mục 2: Tự học đêm */}
              <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200 space-y-2.5">
                <span className="font-extrabold text-indigo-950 flex items-center gap-1.5">
                  <Moon className="w-4 h-4 text-indigo-600" />
                  Mục 2: Chuyên cần tự học đêm (19h đến 20h30)
                </span>

                <div className="flex items-center justify-between gap-3 bg-white p-2 rounded-lg border border-indigo-100">
                  <div>
                    <span className="font-bold text-slate-900 block">Vắng không phép học đêm:</span>
                    <span className="text-[11px] text-slate-500">1 HS vắng đêm không phép trừ (2 HS = nhân đôi)</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={rulesDraft.nightLeaveUnexcusedRate}
                      onChange={(e) =>
                        setRulesDraft({
                          ...rulesDraft,
                          nightLeaveUnexcusedRate: Math.max(0, parseInt(e.target.value) || 0),
                        })
                      }
                      className="w-16 text-center font-bold text-rose-700 border border-slate-300 rounded-lg py-1 focus:outline-none focus:border-indigo-500"
                    />
                    <span className="font-bold text-slate-600">điểm</span>
                  </div>
                </div>

                <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Vắng có phép tự học đêm: <strong>0 điểm (Không bị trừ điểm)</strong></span>
                </div>
              </div>

              {/* Định mức điểm thưởng Quản trị viên */}
              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-2">
                <span className="font-extrabold text-emerald-950 flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-emerald-600" />
                  Định mức cộng điểm thi đua khen thưởng của Quản trị viên
                </span>
                <div className="flex items-center justify-between gap-3 bg-white p-2 rounded-lg border border-emerald-100">
                  <div>
                    <span className="font-bold text-slate-900 block">Điểm thưởng tối đa:</span>
                    <span className="text-[11px] text-slate-500">Định mức Quản trị viên tùy chọn (chuẩn 100 điểm)</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number"
                      min="10"
                      max="200"
                      value={rulesDraft.maxBonusPointsLimit}
                      onChange={(e) =>
                        setRulesDraft({
                          ...rulesDraft,
                          maxBonusPointsLimit: Math.max(10, parseInt(e.target.value) || 100),
                        })
                      }
                      className="w-16 text-center font-bold text-emerald-700 border border-slate-300 rounded-lg py-1 focus:outline-none focus:border-emerald-500"
                    />
                    <span className="font-bold text-slate-600">điểm</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <button
                type="button"
                onClick={() => setRulesDraft(DEFAULT_COMPETITION_DEDUCTION_RULES)}
                className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs font-semibold py-1.5 px-2 rounded-lg hover:bg-slate-100"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Khôi phục mặc định</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsRulesModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={isSavingRules}
                  onClick={async () => {
                    setIsSavingRules(true);
                    try {
                      await saveCompetitionDeductionRules(rulesDraft);
                      setDeductionRules(rulesDraft);
                      setIsRulesModalOpen(false);
                    } catch (err) {
                      console.error('Failed to save deduction rules:', err);
                      alert('Không thể lưu quy tắc. Vui lòng thử lại!');
                    } finally {
                      setIsSavingRules(false);
                    }
                  }}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-sm"
                >
                  {isSavingRules ? 'Đang lưu...' : 'Lưu Quy Tắc'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ADMIN AWARD COMPETITION BONUS POINTS (MAX 100 PTS)      */}
      {/* ============================================================== */}
      {isBonusModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <Gift className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-slate-900">
                    Cộng Điểm Thi Đua Khen Thưởng
                  </h4>
                  <p className="text-xs text-slate-500">
                    Quản trị viên tùy chọn định mức tối đa {deductionRules.maxBonusPointsLimit || 100} điểm
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBonusModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Chọn phòng ở */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Chọn phòng ở khen thưởng (25 phòng):
                </label>
                <select
                  value={bonusTargetRoom}
                  onChange={(e) => {
                    const room = e.target.value;
                    setBonusTargetRoom(room);
                    if (roomBonuses[room]) {
                      setBonusPointsInput(roomBonuses[room].points);
                      setBonusReasonInput(roomBonuses[room].reason);
                    }
                  }}
                  className="w-full text-xs font-bold border border-slate-300 rounded-xl p-2.5 bg-slate-50 focus:outline-none focus:border-amber-500"
                >
                  <optgroup label="12 Phòng Nam">
                    {maleRooms.map((r) => (
                      <option key={r} value={r}>
                        {r} {roomBonuses[r] ? `(+${roomBonuses[r].points}đ đã cấp)` : ''}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="13 Phòng Nữ">
                    {femaleRooms.map((r) => (
                      <option key={r} value={r}>
                        {r} {roomBonuses[r] ? `(+${roomBonuses[r].points}đ đã cấp)` : ''}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Số điểm cộng */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Số điểm cộng khen thưởng:
                  </label>
                  <span className="font-black text-amber-700 text-sm">
                    +{bonusPointsInput} / {deductionRules.maxBonusPointsLimit || 100} điểm
                  </span>
                </div>

                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max={deductionRules.maxBonusPointsLimit || 100}
                    step="1"
                    value={bonusPointsInput}
                    onChange={(e) => setBonusPointsInput(parseInt(e.target.value) || 0)}
                    className="w-full accent-amber-500 cursor-pointer"
                  />

                  {/* Quick addition chips */}
                  <div className="flex items-center flex-wrap gap-1.5">
                    {[5, 10, 15, 20, 30, 50, 100].map((pts) => (
                      <button
                        key={pts}
                        type="button"
                        onClick={() => setBonusPointsInput(Math.min(deductionRules.maxBonusPointsLimit || 100, pts))}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                          bonusPointsInput === pts
                            ? 'bg-amber-500 text-slate-950 shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        +{pts}đ
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Lý do khen thưởng */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Lý do / Nội dung khen thưởng:
                </label>
                <textarea
                  rows={2}
                  value={bonusReasonInput}
                  onChange={(e) => setBonusReasonInput(e.target.value)}
                  placeholder="Ví dụ: Phòng vệ sinh sạch đẹp gương mẫu, 100% chuyên cần tốt..."
                  className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:border-amber-500 font-medium"
                />

                {/* Quick reason suggestions */}
                <div className="flex items-center flex-wrap gap-1 mt-1.5">
                  {[
                    'Vệ sinh phòng ở ngăn nắp, sạch sẽ xuất sắc',
                    'Chuyên cần 100%, không học sinh vi phạm',
                    'Nêu gương tự học nghiêm túc, trật tự mẫu mực',
                    'Tích cực tham gia phong trào nội trú',
                  ].map((sug, sIdx) => (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => setBonusReasonInput(sug)}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              {roomBonuses[bonusTargetRoom] ? (
                <button
                  type="button"
                  disabled={isSavingBonus}
                  onClick={async () => {
                    if (confirm(`Bạn có chắc muốn xóa điểm cộng của ${bonusTargetRoom}?`)) {
                      setIsSavingBonus(true);
                      try {
                        await deleteRoomCompetitionBonus(bonusTargetRoom, selectedDate);
                        setRoomBonuses((prev) => {
                          const copy = { ...prev };
                          delete copy[bonusTargetRoom];
                          return copy;
                        });
                        setIsBonusModalOpen(false);
                      } catch (err) {
                        console.error('Failed to delete bonus:', err);
                      } finally {
                        setIsSavingBonus(false);
                      }
                    }
                  }}
                  className="flex items-center gap-1 text-rose-600 hover:text-rose-800 text-xs font-semibold py-1.5 px-2 rounded-lg hover:bg-rose-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa thưởng</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBonusModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={isSavingBonus}
                  onClick={async () => {
                    if (!bonusTargetRoom) {
                      alert('Vui lòng chọn phòng ở!');
                      return;
                    }
                    setIsSavingBonus(true);
                    try {
                      const payload: RoomCompetitionBonus = {
                        roomId: bonusTargetRoom,
                        dateOrWeek: selectedDate,
                        points: bonusPointsInput,
                        reason: bonusReasonInput.trim() || 'Khen thưởng thi đua nội trú',
                        awardedBy: evaluatorEmail || 'admin@gmail.com',
                        awardedAt: new Date().toISOString(),
                      };
                      await saveRoomCompetitionBonus(payload);
                      setRoomBonuses((prev) => ({
                        ...prev,
                        [bonusTargetRoom]: payload,
                      }));
                      setIsBonusModalOpen(false);
                    } catch (err) {
                      console.error('Failed to save bonus:', err);
                      alert('Không thể lưu điểm cộng!');
                    } finally {
                      setIsSavingBonus(false);
                    }
                  }}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-sm"
                >
                  {isSavingBonus ? 'Đang lưu...' : 'Lưu Điểm Cộng'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* FULL PHOTO PREVIEW MODAL                                       */}
      {/* ============================================================== */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewPhoto}
              alt="Ảnh phóng to minh chứng"
              className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl"
            />
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-2 right-2 p-2 bg-black/60 text-white rounded-full hover:bg-black cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* FULL VIDEO PREVIEW MODAL                                       */}
      {/* ============================================================== */}
      {previewVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-3 sm:p-6 cursor-pointer"
          onClick={() => setPreviewVideo(null)}
        >
          <div
            className="relative w-full max-w-4xl bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700 text-white">
              <div className="flex items-center gap-2 min-w-0">
                <Video className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="text-sm font-bold truncate">
                  {previewVideo.title || 'Xem video minh chứng'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewVideo(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition cursor-pointer shrink-0"
                title="Đóng video"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 sm:p-4 bg-black flex items-center justify-center max-h-[75vh]">
              <video
                src={previewVideo.url}
                controls
                autoPlay
                className="max-w-full max-h-[70vh] rounded-lg shadow-lg"
              />
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/90 border-t border-slate-700 text-xs text-slate-300">
              <span>Đang phát video minh chứng phòng ở</span>
              <a
                href={previewVideo.url}
                download="minh-chung-video.mp4"
                className="flex items-center gap-1 text-purple-300 hover:text-white underline font-semibold"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải về máy</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
