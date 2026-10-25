import React, { useState, useMemo, useEffect } from 'react';
import {
  Trash2,
  X,
  AlertTriangle,
  Building2,
  Check,
  CheckSquare,
  Square,
  Bed,
  Users,
  ArrowRight,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { RoomConfig, Student } from '../types';

interface DeleteRoomsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomConfigs: RoomConfig[];
  students: Student[];
  onDeleteRoom: (roomId: string, targetNewRoomForStudents?: string) => Promise<void>;
  onDeleteMultipleRooms: (roomIds: string[], targetNewRoomForStudents?: string) => Promise<void>;
  initialSelectedRoomId?: string | null;
  isAdmin: boolean;
}

export const DeleteRoomsModal: React.FC<DeleteRoomsModalProps> = ({
  isOpen,
  onClose,
  roomConfigs,
  students,
  onDeleteRoom,
  onDeleteMultipleRooms,
  initialSelectedRoomId,
  isAdmin,
}) => {
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [studentAction, setStudentAction] = useState<'unassign' | 'relocate'>('unassign');
  const [relocateTargetRoom, setRelocateTargetRoom] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [confirmStep, setConfirmStep] = useState<boolean>(false);
  const [filterGender, setFilterGender] = useState<'ALL' | 'Nam' | 'Nữ'>('ALL');
  const [search, setSearch] = useState<string>('');

  // Initialize selection when opened
  useEffect(() => {
    if (isOpen) {
      if (initialSelectedRoomId) {
        setSelectedRoomIds([initialSelectedRoomId]);
      } else {
        setSelectedRoomIds([]);
      }
      setConfirmStep(false);
      setIsDeleting(false);
    }
  }, [isOpen, initialSelectedRoomId]);

  // Set default relocation target room when selected rooms change
  const remainingRooms = useMemo(() => {
    const selectedSet = new Set(selectedRoomIds);
    return roomConfigs.filter((r) => !selectedSet.has(r.id));
  }, [roomConfigs, selectedRoomIds]);

  useEffect(() => {
    if (remainingRooms.length > 0 && !remainingRooms.some((r) => r.name === relocateTargetRoom)) {
      setRelocateTargetRoom(remainingRooms[0].name);
    }
  }, [remainingRooms, relocateTargetRoom]);

  // Count active students per room
  const studentCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    roomConfigs.forEach((r) => {
      map[r.name] = students.filter((s) => s.room === r.name && s.status === 'active').length;
    });
    return map;
  }, [roomConfigs, students]);

  // Total affected students
  const affectedStudentsCount = useMemo(() => {
    const selectedNames = new Set(
      roomConfigs.filter((r) => selectedRoomIds.includes(r.id)).map((r) => r.name)
    );
    return students.filter((s) => selectedNames.has(s.room) && s.status === 'active').length;
  }, [roomConfigs, selectedRoomIds, students]);

  // Filtered rooms in modal table
  const displayedRooms = useMemo(() => {
    return roomConfigs.filter((r) => {
      if (filterGender !== 'ALL' && r.gender !== filterGender) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        return r.name.toLowerCase().includes(q) || (r.notes || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [roomConfigs, filterGender, search]);

  if (!isOpen) return null;

  // Toggle selection for a room
  const toggleSelectRoom = (roomId: string) => {
    setSelectedRoomIds((prev) =>
      prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]
    );
    setConfirmStep(false);
  };

  // Quick Select: Select all empty rooms (0 students)
  const handleSelectEmptyRooms = () => {
    const emptyRoomIds = roomConfigs
      .filter((r) => (studentCountMap[r.name] || 0) === 0)
      .map((r) => r.id);
    setSelectedRoomIds(emptyRoomIds);
    setConfirmStep(false);
  };

  // Quick Select: All male rooms
  const handleSelectMaleRooms = () => {
    const maleRoomIds = roomConfigs
      .filter((r) => r.gender === 'Nam' || r.name.toLowerCase().includes('nam'))
      .map((r) => r.id);
    setSelectedRoomIds(maleRoomIds);
    setConfirmStep(false);
  };

  // Quick Select: All female rooms
  const handleSelectFemaleRooms = () => {
    const femaleRoomIds = roomConfigs
      .filter((r) => r.gender === 'Nữ' || r.name.toLowerCase().includes('nữ'))
      .map((r) => r.id);
    setSelectedRoomIds(femaleRoomIds);
    setConfirmStep(false);
  };

  // Quick Select: All visible rooms
  const handleSelectAllVisible = () => {
    const allVisibleIds = displayedRooms.map((r) => r.id);
    const areAllSelected = allVisibleIds.every((id) => selectedRoomIds.includes(id));
    if (areAllSelected) {
      setSelectedRoomIds((prev) => prev.filter((id) => !allVisibleIds.includes(id)));
    } else {
      setSelectedRoomIds((prev) => Array.from(new Set([...prev, ...allVisibleIds])));
    }
    setConfirmStep(false);
  };

  const handleClearSelection = () => {
    setSelectedRoomIds([]);
    setConfirmStep(false);
  };

  // Execute deletion
  const handleExecuteDelete = async () => {
    if (selectedRoomIds.length === 0) {
      alert('Vui lòng chọn ít nhất một phòng cần xóa.');
      return;
    }

    if (!confirmStep) {
      setConfirmStep(true);
      return;
    }

    setIsDeleting(true);
    try {
      const destination = studentAction === 'relocate' ? relocateTargetRoom : 'Chưa xếp phòng';
      if (selectedRoomIds.length === 1) {
        await onDeleteRoom(selectedRoomIds[0], destination);
      } else {
        await onDeleteMultipleRooms(selectedRoomIds, destination);
      }
      onClose();
    } catch (err) {
      console.error('Lỗi khi xóa các phòng:', err);
      alert('Có lỗi xảy ra khi xóa các phòng ở.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-rose-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-red-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-2xl border border-white/20">
              <Trash2 className="w-6 h-6 text-rose-200" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>TÙY CHỌN XÓA CÁC PHÒNG Ở NỘI TRÚ</span>
              </h3>
              <p className="text-xs text-rose-200 mt-0.5">
                Chọn một hoặc nhiều phòng cần xóa, tự động xử lý và điều chuyển học sinh an toàn
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

        {/* Quick Selection Toolbar */}
        <div className="bg-rose-50/70 border-b border-rose-100 p-3 sm:px-5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-slate-700 mr-1">Chọn nhanh:</span>
              <button
                type="button"
                onClick={handleSelectEmptyRooms}
                className="px-2.5 py-1 rounded-xl font-bold bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-50 transition shadow-2xs"
                title="Chọn tất cả các phòng hiện chưa có học sinh nào"
              >
                ✨ Phòng trống (0 HS)
              </button>
              <button
                type="button"
                onClick={handleSelectMaleRooms}
                className="px-2.5 py-1 rounded-xl font-bold bg-white text-blue-800 border border-blue-300 hover:bg-blue-50 transition shadow-2xs"
              >
                Khu Nam
              </button>
              <button
                type="button"
                onClick={handleSelectFemaleRooms}
                className="px-2.5 py-1 rounded-xl font-bold bg-white text-rose-800 border border-rose-300 hover:bg-rose-50 transition shadow-2xs"
              >
                Khu Nữ
              </button>
              {selectedRoomIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="px-2.5 py-1 rounded-xl font-bold bg-white text-slate-600 border border-slate-300 hover:bg-slate-100 transition shadow-2xs"
                >
                  Bỏ chọn ({selectedRoomIds.length})
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-rose-900 bg-rose-100 px-3 py-1 rounded-xl border border-rose-200">
                Đã chọn: <strong>{selectedRoomIds.length}</strong> / {roomConfigs.length} phòng
              </span>
            </div>
          </div>

          {/* Filter by gender or search name */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-1 text-xs">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setFilterGender('ALL')}
                className={`px-2.5 py-0.5 rounded-lg font-bold text-[11px] ${
                  filterGender === 'ALL' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                Tất cả ({roomConfigs.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterGender('Nam')}
                className={`px-2.5 py-0.5 rounded-lg font-bold text-[11px] ${
                  filterGender === 'Nam' ? 'bg-blue-700 text-white' : 'bg-white text-blue-700 border border-blue-200'
                }`}
              >
                Chỉ phòng Nam
              </button>
              <button
                type="button"
                onClick={() => setFilterGender('Nữ')}
                className={`px-2.5 py-0.5 rounded-lg font-bold text-[11px] ${
                  filterGender === 'Nữ' ? 'bg-rose-700 text-white' : 'bg-white text-rose-700 border border-rose-200'
                }`}
              >
                Chỉ phòng Nữ
              </button>
            </div>

            <input
              type="text"
              placeholder="Tìm tên phòng cần xóa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white border border-rose-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500 w-44 sm:w-56"
            />
          </div>
        </div>

        {/* Room Selection Table */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={handleSelectAllVisible}
                      className="text-slate-600 hover:text-slate-900"
                      title="Chọn/Bỏ chọn tất cả phòng đang hiển thị"
                    >
                      {displayedRooms.length > 0 &&
                      displayedRooms.every((r) => selectedRoomIds.includes(r.id)) ? (
                        <CheckSquare className="w-4 h-4 text-rose-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="py-2.5 px-3">Tên Phòng Ở</th>
                  <th className="py-2.5 px-3 text-center w-24">Khu vực</th>
                  <th className="py-2.5 px-3 text-center w-32">Sức chứa</th>
                  <th className="py-2.5 px-3 text-center w-44">Sĩ số học sinh</th>
                  <th className="py-2.5 px-3 text-center w-20">Chọn xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedRooms.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Không tìm thấy phòng ở phù hợp bộ lọc
                    </td>
                  </tr>
                ) : (
                  displayedRooms.map((room) => {
                    const isSelected = selectedRoomIds.includes(room.id);
                    const sCount = studentCountMap[room.name] || 0;
                    const isEmpty = sCount === 0;

                    return (
                      <tr
                        key={room.id}
                        onClick={() => toggleSelectRoom(room.id)}
                        className={`cursor-pointer transition ${
                          isSelected
                            ? 'bg-rose-50/80 hover:bg-rose-100/70 font-semibold'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => toggleSelectRoom(room.id)}
                            className="text-slate-600"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-rose-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center gap-2">
                          <Building2
                            className={`w-4 h-4 ${
                              room.gender === 'Nam'
                                ? 'text-blue-600'
                                : room.gender === 'Nữ'
                                ? 'text-rose-600'
                                : 'text-purple-600'
                            }`}
                          />
                          <span>{room.name}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              room.gender === 'Nam'
                                ? 'bg-blue-100 text-blue-800'
                                : room.gender === 'Nữ'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {room.gender}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-600">
                          {room.capacity ? `${room.capacity} giường` : 'Không giới hạn'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isEmpty ? (
                            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                              ✓ Phòng trống (0 HS)
                            </span>
                          ) : (
                            <span className="text-[11px] font-extrabold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                              ⚠️ Có {sCount} học sinh đang ở
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => toggleSelectRoom(room.id)}
                            className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition ${
                              isSelected
                                ? 'bg-rose-600 text-white border-rose-700'
                                : 'bg-white text-slate-600 border-slate-300 hover:border-rose-400 hover:text-rose-600'
                            }`}
                          >
                            {isSelected ? 'Đã chọn' : 'Chọn'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Student Relocation Configuration Section if affected students > 0 */}
          {affectedStudentsCount > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-950">
                    Lưu ý: Có {affectedStudentsCount} học sinh đang ở trong các phòng bạn chuẩn bị xóa!
                  </h4>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Hệ thống sẽ bảo đảm thông tin các em không bị mất. Vui lòng chọn cách xử lý chỗ ở cho các em:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                <label
                  className={`p-2.5 rounded-xl border cursor-pointer flex items-start gap-2 transition ${
                    studentAction === 'unassign'
                      ? 'bg-white border-amber-500 ring-2 ring-amber-400'
                      : 'bg-white/60 border-amber-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="studentAction"
                    value="unassign"
                    checked={studentAction === 'unassign'}
                    onChange={() => setStudentAction('unassign')}
                    className="mt-0.5 text-amber-600"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block">
                      1. Chuyển về "Chưa xếp phòng" (Khuyên dùng)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Học sinh vẫn giữ nguyên hồ sơ và lớp học, chờ phân bổ vào phòng mới.
                    </span>
                  </div>
                </label>

                <label
                  className={`p-2.5 rounded-xl border cursor-pointer flex items-start gap-2 transition ${
                    studentAction === 'relocate'
                      ? 'bg-white border-amber-500 ring-2 ring-amber-400'
                      : 'bg-white/60 border-amber-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="studentAction"
                    value="relocate"
                    checked={studentAction === 'relocate'}
                    onChange={() => setStudentAction('relocate')}
                    className="mt-0.5 text-amber-600"
                  />
                  <div className="flex-1">
                    <span className="font-bold text-slate-800 block">
                      2. Gộp chuyển sang phòng khác
                    </span>
                    {studentAction === 'relocate' && (
                      <select
                        value={relocateTargetRoom}
                        onChange={(e) => setRelocateTargetRoom(e.target.value)}
                        className="mt-1 w-full bg-amber-50 border border-amber-300 rounded-lg p-1 text-xs text-slate-800 font-bold focus:outline-none"
                      >
                        {remainingRooms.map((r) => (
                          <option key={r.id} value={r.name}>
                            {r.name} ({r.gender})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Confirm Step Warning Alert */}
          {confirmStep && (
            <div className="bg-rose-100 border-2 border-rose-400 rounded-2xl p-4 text-xs space-y-2 animate-fadeIn">
              <div className="flex items-center gap-2 text-rose-950 font-black text-sm">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                <span>XÁC NHẬN CUỐI CÙNG: XÓA {selectedRoomIds.length} PHÒNG ĐÃ CHỌN</span>
              </div>
              <p className="text-rose-900 leading-relaxed">
                Hành động này sẽ xóa hoàn toàn <strong>{selectedRoomIds.length} phòng</strong> khỏi hệ thống quản lý phòng ở và bảng điểm danh tự học đêm.
                {affectedStudentsCount > 0 && (
                  <span>
                    {' '}
                    <strong>{affectedStudentsCount} học sinh</strong> sẽ được tự động cập nhật về trạng thái{' '}
                    <strong>{studentAction === 'relocate' ? relocateTargetRoom : 'Chưa xếp phòng'}</strong>.
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 transition"
          >
            Đóng / Hủy bỏ
          </button>

          <div className="flex items-center gap-2">
            {confirmStep ? (
              <>
                <button
                  type="button"
                  onClick={() => setConfirmStep(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 transition"
                >
                  Quay lại chọn
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDelete}
                  disabled={isDeleting}
                  className="px-5 py-2 rounded-xl text-xs font-black text-white bg-rose-700 hover:bg-rose-800 shadow-md transition transform active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeleting ? 'Đang thực hiện xóa...' : `Đồng Ý Xóa ${selectedRoomIds.length} Phòng`}</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={selectedRoomIds.length === 0}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 shadow-md transition transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Tiếp Tục Xóa ({selectedRoomIds.length} phòng)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
