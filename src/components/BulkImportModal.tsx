import React, { useState, useMemo } from 'react';
import { 
  Clipboard, 
  X, 
  Check, 
  AlertCircle, 
  UserPlus, 
  Bed, 
  Building2, 
  Sparkles, 
  Layers, 
  ArrowRight,
  FileSpreadsheet,
  Edit3,
  GraduationCap,
  MapPin,
  Home
} from 'lucide-react';
import { Student, RoomConfig } from '../types';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveBatch: (students: Student[], replaceRoom?: string) => Promise<void>;
  rooms: string[];
  roomConfigs: RoomConfig[];
  classes: string[];
  villages: string[];
  hamlets: string[];
  initialRoom?: string;
  existingStudents: Student[];
}

interface ParsedRow {
  name: string;
  className: string;
  gender: 'Nam' | 'Nữ';
  bedNumber: string;
  village: string;
  hamlet: string;
  notes: string;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  onSaveBatch,
  rooms,
  roomConfigs,
  classes,
  villages,
  hamlets,
  initialRoom,
  existingStudents,
}) => {
  const [selectedRoom, setSelectedRoom] = useState<string>(() => {
    return initialRoom || rooms[0] || 'Phòng Nam 01';
  });

  React.useEffect(() => {
    if (initialRoom && rooms.includes(initialRoom)) {
      setSelectedRoom(initialRoom);
    }
  }, [initialRoom, isOpen, rooms]);

  const [rawText, setRawText] = useState<string>('');
  const [defaultClass, setDefaultClass] = useState<string>(classes[0] || '6A');
  const [defaultVillage, setDefaultVillage] = useState<string>(villages[0] || 'Thôn 1');
  const [defaultHamlet, setDefaultHamlet] = useState<string>(hamlets[0] || 'Nóc Tăk Pổ');
  const [rowOverrides, setRowOverrides] = useState<Record<number, Partial<ParsedRow>>>({});
  const [autoAssignBeds, setAutoAssignBeds] = useState<boolean>(true);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  React.useEffect(() => {
    setRowOverrides({});
  }, [rawText, defaultClass, defaultVillage, defaultHamlet]);

  // Find room configuration
  const currentRoomConfig = useMemo(() => {
    return roomConfigs.find((r) => r.name === selectedRoom);
  }, [roomConfigs, selectedRoom]);

  // Determine auto gender based on room
  const roomGender = useMemo<'Nam' | 'Nữ'>(() => {
    if (currentRoomConfig) {
      if (currentRoomConfig.gender === 'Nữ') return 'Nữ';
      if (currentRoomConfig.gender === 'Nam') return 'Nam';
    }
    const lower = selectedRoom.toLowerCase();
    if (lower.includes('nữ')) return 'Nữ';
    return 'Nam';
  }, [selectedRoom, currentRoomConfig]);

  // Number of students currently in this room
  const currentRoomStudentsCount = useMemo(() => {
    return existingStudents.filter((s) => s.room === selectedRoom && s.status === 'active').length;
  }, [existingStudents, selectedRoom]);

  // Parser: converts pasted raw text into structured rows
  const parsedRows = useMemo<ParsedRow[]>(() => {
    if (!rawText.trim()) return [];

    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    const result: ParsedRow[] = [];

    // Starting bed index: if append mode, start after current students; if replace, start from 1
    const startBedIndex = importMode === 'append' ? currentRoomStudentsCount + 1 : 1;

    lines.forEach((line, index) => {
      // Split by tab (\t) first (Excel copy), or semicolon, or comma, or dash
      let parts: string[] = [];
      if (line.includes('\t')) {
        parts = line.split('\t').map((p) => p.trim());
      } else if (line.includes(';') || line.includes(',')) {
        parts = line.split(/[;,]/).map((p) => p.trim());
      } else if (line.includes(' - ')) {
        parts = line.split(' - ').map((p) => p.trim());
      } else {
        parts = [line];
      }

      // Filter out non-empty parts
      parts = parts.filter((p) => p.length > 0);
      if (parts.length === 0) return;

      // Extract Name
      let name = parts[0];
      // Remove leading serial numbers if any (e.g. "1. Nguyễn Văn A", "01/ Trần Thị B", "1 - ")
      name = name.replace(/^\d+[\.\/\-\)]\s*/, '').trim();

      // Extract Class
      let studentClass = defaultClass;
      if (parts.length >= 2) {
        const potentialClass = parts[1].replace(/^[Ll]ớp\s*/, '').trim();
        if (potentialClass) {
          studentClass = potentialClass;
        }
      }

      // Optional note or other info in part 3
      let note = '';
      if (parts.length >= 3) {
        note = parts.slice(2).join(' - ');
      }

      const bedNumber = autoAssignBeds
        ? `Giường ${String(startBedIndex + index).padStart(2, '0')}`
        : '';

      result.push({
        name,
        className: studentClass,
        gender: roomGender,
        bedNumber,
        village: defaultVillage,
        hamlet: defaultHamlet,
        notes: note,
      });
    });

    return result;
  }, [
    rawText,
    defaultClass,
    roomGender,
    defaultVillage,
    defaultHamlet,
    autoAssignBeds,
    importMode,
    currentRoomStudentsCount,
  ]);

  // Sức chứa của phòng
  const roomCapacity = currentRoomConfig?.capacity; // undefined nghĩa là không giới hạn

  // Handle Submit
  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) return;

    setIsSubmitting(true);
    try {
      const timestamp = Date.now();
      const newStudents: Student[] = parsedRows.map((r, i) => {
        const effective = {
          ...r,
          ...(rowOverrides[i] || {}),
        };
        return {
          id: `hs_${timestamp}_${i + 1}`,
          name: effective.name,
          gender: effective.gender,
          dob: '2012-01-01',
          room: selectedRoom,
          bedNumber: effective.bedNumber || `Giường ${String(i + 1).padStart(2, '0')}`,
          class: effective.className,
          village: effective.village,
          hamlet: effective.hamlet,
          ethnicity: 'Ca Dong',
          notes: effective.notes || '',
          status: 'active',
          createdAt: new Date().toISOString(),
        };
      });

      await onSaveBatch(newStudents, importMode === 'replace' ? selectedRoom : undefined);

      setSuccessMessage(`Đã nhập thành công ${newStudents.length} học sinh vào ${selectedRoom}!`);
      setTimeout(() => {
        setSuccessMessage('');
        onClose();
        setRawText('');
      }, 1200);
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi nhập danh sách học sinh hàng loạt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <FileSpreadsheet className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">
                Nhập Hàng Loạt Học Sinh Từng Phòng (Copy & Dán)
              </h3>
              <p className="text-xs text-emerald-100">
                Copy danh sách từ Excel, Word hoặc Zalo rồi dán trực tiếp vào phòng ở
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-full text-white/80 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3.5 rounded-2xl flex items-center gap-2.5 font-bold text-sm">
              <Check className="w-5 h-5 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Room Selection & Controls Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>1. Chọn phòng ở tiếp nhận:</span>
              </label>
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="w-full text-xs font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                {rooms.map((r) => (
                  <option key={r} value={r}>
                    {r} {r.toLowerCase().includes('nam') ? '(Nam)' : r.toLowerCase().includes('nữ') ? '(Nữ)' : ''}
                  </option>
                ))}
              </select>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                <span>Hiện có: <strong>{currentRoomStudentsCount}</strong> HS</span>
                <span>•</span>
                <span>
                  Sức chứa: {roomCapacity ? (
                    <strong className="text-emerald-700">{roomCapacity} giường</strong>
                  ) : (
                    <span className="text-amber-700 font-semibold">Không giới hạn</span>
                  )}
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-700" />
                  <span>2. Lớp mặc định:</span>
                </label>
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  Tùy chọn chỉnh sửa
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  list="bulk-classes-list"
                  value={defaultClass}
                  onChange={(e) => setDefaultClass(e.target.value)}
                  placeholder="Gõ hoặc chọn lớp (VD: 6A, 7/1...)"
                  className="w-full text-xs font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                />
                <datalist id="bulk-classes-list">
                  {classes.map((c) => (
                    <option key={c} value={c}>
                      Lớp {c}
                    </option>
                  ))}
                </datalist>
              </div>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {classes.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setDefaultClass(c)}
                    className={`text-[10px] px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                      defaultClass === c
                        ? 'bg-emerald-700 text-white border-emerald-800 font-bold shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Tự do gõ lớp mới hoặc chọn gợi ý. Nếu dòng dán có ghi lớp (ví dụ: Lê Văn A 7A) sẽ lấy theo lớp của dòng đó.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                  <span>3. Thôn & Nóc mặc định:</span>
                </label>
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  Tùy chọn chỉnh sửa
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">Thôn cư trú:</label>
                  <input
                    type="text"
                    list="bulk-villages-list"
                    value={defaultVillage}
                    onChange={(e) => setDefaultVillage(e.target.value)}
                    placeholder="Gõ hoặc chọn Thôn..."
                    className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  />
                  <datalist id="bulk-villages-list">
                    {villages.map((v) => (
                      <option key={v} value={v} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-purple-700 block mb-0.5">Nóc (bản):</label>
                  <input
                    type="text"
                    list="bulk-hamlets-list"
                    value={defaultHamlet}
                    onChange={(e) => setDefaultHamlet(e.target.value)}
                    placeholder="Gõ hoặc chọn Nóc..."
                    className="w-full text-xs font-semibold bg-white border border-purple-200 rounded-xl px-2.5 py-2 text-purple-950 focus:outline-hidden focus:ring-2 focus:ring-purple-500 shadow-2xs"
                  />
                  <datalist id="bulk-hamlets-list">
                    {hamlets.map((h) => (
                      <option key={h} value={h} />
                    ))}
                  </datalist>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {villages.slice(0, 5).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setDefaultVillage(v)}
                    className={`text-[9px] px-1.5 py-0.5 rounded border transition cursor-pointer ${
                      defaultVillage === v
                        ? 'bg-slate-700 text-white border-slate-800 font-bold'
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Tự do gõ tên thôn/nóc mới bất kỳ hoặc bấm chọn gợi ý cho toàn bộ đợt dán.
              </p>
            </div>
          </div>

          {/* Options: Auto beds & Replace/Append */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200 text-xs">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={autoAssignBeds}
                  onChange={(e) => setAutoAssignBeds(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="flex items-center gap-1">
                  <Bed className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Tự động đánh số giường (Giường 01, Giường 02...)</span>
                </span>
              </label>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-700 text-xs">Chế độ nhập:</span>
              <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-800">
                <input
                  type="radio"
                  name="importMode"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-amber-800 font-bold">Thay thế toàn bộ phòng này</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-800">
                <input
                  type="radio"
                  name="importMode"
                  value="append"
                  checked={importMode === 'append'}
                  onChange={() => setImportMode('append')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span>Thêm tiếp vào phòng</span>
              </label>
            </div>
          </div>

          {/* Raw Text Input Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clipboard className="w-4 h-4 text-emerald-700" />
                <span>Dán danh sách học sinh vào đây (Họ tên [Tab] Lớp hoặc Họ tên, Lớp):</span>
              </label>
              <span className="text-[11px] text-slate-400">
                Gợi ý: Chọn 2 cột Họ tên & Lớp trên Excel rồi bấm Ctrl+C và dán Ctrl+V vào đây
              </span>
            </div>

            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`Ví dụ copy từ Excel hoặc gõ:
Nguyễn Văn An	6A
Trần Quốc Bảo	6B
Hồ Văn Đạt	7A
Đinh Văn Cường	7B
Hồ Văn Hùng	8A`}
              className="w-full text-xs font-mono p-3 bg-slate-900 text-slate-100 rounded-2xl border border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-500"
            />
          </div>

          {/* Live Preview Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Xem trước kết quả nhận diện ({parsedRows.length} học sinh)</span>
                </h4>
                {roomCapacity && parsedRows.length > roomCapacity && (
                  <span className="text-[11px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold border border-rose-200">
                    Cảnh báo: Vượt quá sức chứa phòng ({parsedRows.length}/{roomCapacity} giường)
                  </span>
                )}
                {roomCapacity && parsedRows.length <= roomCapacity && parsedRows.length > 0 && (
                  <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                    Hợp lệ: {parsedRows.length}/{roomCapacity} giường
                  </span>
                )}
                {!roomCapacity && parsedRows.length > 0 && (
                  <span className="text-[11px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold border border-blue-200">
                    Phòng không giới hạn sức chứa
                  </span>
                )}
              </div>

              {parsedRows.length > 0 && (
                <button
                  type="button"
                  onClick={() => setRawText('')}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
                >
                  Xóa nội dung đã dán
                </button>
              )}
            </div>

            {parsedRows.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-6 text-center text-xs text-slate-400">
                Chưa có dữ liệu. Hãy copy từ file Excel hoặc danh sách rồi dán vào khung văn bản phía trên.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                    <tr>
                      <th className="py-2 px-3 w-10 text-center">STT</th>
                      <th className="py-2 px-3">Họ và Tên</th>
                      <th className="py-2 px-3 w-20 text-center">Lớp</th>
                      <th className="py-2 px-3 w-20 text-center">Giới tính</th>
                      <th className="py-2 px-3 w-28 text-center">Phòng</th>
                      <th className="py-2 px-3 w-28 text-center">Giường số</th>
                      <th className="py-2 px-3">Thôn / Nóc</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.map((r, i) => {
                      const eff = { ...r, ...(rowOverrides[i] || {}) };
                      return (
                        <tr key={i} className="hover:bg-slate-50/80">
                          <td className="py-1.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                            {i + 1}
                          </td>
                          <td className="py-1.5 px-3 font-bold text-slate-900">{eff.name}</td>
                          <td className="py-1.5 px-3 text-center">
                            <input
                              type="text"
                              list="bulk-classes-list"
                              value={eff.className}
                              onChange={(e) =>
                                setRowOverrides((prev) => ({
                                  ...prev,
                                  [i]: { ...(prev[i] || {}), className: e.target.value },
                                }))
                              }
                              className="w-16 text-center bg-white border border-slate-300 rounded-md py-0.5 text-xs font-bold text-emerald-800 shadow-2xs focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="py-1.5 px-3 text-center">
                            <select
                              value={eff.gender}
                              onChange={(e) =>
                                setRowOverrides((prev) => ({
                                  ...prev,
                                  [i]: { ...(prev[i] || {}), gender: e.target.value as 'Nam' | 'Nữ' },
                                }))
                              }
                              className="text-[11px] font-semibold rounded-md border border-slate-300 py-0.5 px-1 bg-white"
                            >
                              <option value="Nam">Nam</option>
                              <option value="Nữ">Nữ</option>
                            </select>
                          </td>
                          <td className="py-1.5 px-3 text-center text-slate-700 font-medium">
                            {selectedRoom}
                          </td>
                          <td className="py-1.5 px-3 text-center text-emerald-700 font-bold font-mono">
                            <input
                              type="text"
                              value={eff.bedNumber}
                              onChange={(e) =>
                                setRowOverrides((prev) => ({
                                  ...prev,
                                  [i]: { ...(prev[i] || {}), bedNumber: e.target.value },
                                }))
                              }
                              className="w-20 text-center bg-white border border-slate-300 rounded-md py-0.5 text-xs font-mono font-bold text-emerald-800 shadow-2xs focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="py-1.5 px-3 text-slate-600">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                list="bulk-villages-list"
                                value={eff.village}
                                onChange={(e) =>
                                  setRowOverrides((prev) => ({
                                    ...prev,
                                    [i]: { ...(prev[i] || {}), village: e.target.value },
                                  }))
                                }
                                placeholder="Thôn"
                                className="w-20 bg-white border border-slate-300 rounded-md py-0.5 px-1 text-[11px] text-slate-800"
                              />
                              <span>-</span>
                              <input
                                type="text"
                                list="bulk-hamlets-list"
                                value={eff.hamlet}
                                onChange={(e) =>
                                  setRowOverrides((prev) => ({
                                    ...prev,
                                    [i]: { ...(prev[i] || {}), hamlet: e.target.value },
                                  }))
                                }
                                placeholder="Nóc"
                                className="w-24 bg-white border border-purple-200 rounded-md py-0.5 px-1 text-[11px] text-purple-950 font-medium"
                              />
                            </div>
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

        {/* Footer */}
        <div className="bg-slate-100 px-5 py-3.5 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {parsedRows.length > 0 ? (
              <span>
                Sẵn sàng lưu <strong>{parsedRows.length}</strong> học sinh vào{' '}
                <strong className="text-slate-800">{selectedRoom}</strong> ({importMode === 'replace' ? 'Thay thế' : 'Thêm tiếp'})
              </span>
            ) : (
              <span>Vui lòng dán danh sách học sinh để tiếp tục</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-200 rounded-xl border border-slate-300 transition"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              disabled={parsedRows.length === 0 || isSubmitting}
              onClick={handleConfirmImport}
              className={`flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white rounded-xl shadow transition ${
                parsedRows.length === 0 || isSubmitting
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-emerald-700 hover:bg-emerald-800 active:scale-95'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Đang lưu vào phòng...'
                  : `Xác nhận Lưu ${parsedRows.length} học sinh vào ${selectedRoom}`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
