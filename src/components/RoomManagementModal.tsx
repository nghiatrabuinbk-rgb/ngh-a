import React, { useState } from 'react';
import { 
  Building2, 
  X, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  RotateCcw, 
  Bed, 
  Users, 
  ShieldCheck, 
  AlertTriangle 
} from 'lucide-react';
import { RoomConfig, Student } from '../types';

interface RoomManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomConfigs: RoomConfig[];
  onSaveRoomConfig: (room: RoomConfig) => Promise<void>;
  onDeleteRoomConfig: (roomId: string, targetNewRoomForStudents?: string) => Promise<void>;
  onResetRoomConfigs: () => Promise<void>;
  students: Student[];
  isAdmin: boolean;
}

export const RoomManagementModal: React.FC<RoomManagementModalProps> = ({
  isOpen,
  onClose,
  roomConfigs,
  onSaveRoomConfig,
  onDeleteRoomConfig,
  onResetRoomConfigs,
  students,
  isAdmin,
}) => {
  // Adding / Editing room state
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formGender, setFormGender] = useState<'Nam' | 'Nữ' | 'Khác'>('Nam');
  const [isUnlimited, setIsUnlimited] = useState<boolean>(false);
  const [formCapacity, setFormCapacity] = useState<number>(8);
  const [formNotes, setFormNotes] = useState('');
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [deleteConfirmRoom, setDeleteConfirmRoom] = useState<RoomConfig | null>(null);

  if (!isOpen) return null;

  const handleStartAdd = () => {
    setEditingRoomId(null);
    setFormName(`Phòng Nam ${String(roomConfigs.length + 1).padStart(2, '0')}`);
    setFormGender('Nam');
    setIsUnlimited(false);
    setFormCapacity(8);
    setFormNotes('');
    setIsAddingNew(true);
  };

  const handleStartEdit = (r: RoomConfig) => {
    setIsAddingNew(false);
    setEditingRoomId(r.id);
    setFormName(r.name);
    setFormGender(r.gender);
    setIsUnlimited(r.capacity === undefined || r.capacity === null);
    setFormCapacity(r.capacity || 8);
    setFormNotes(r.notes || '');
  };

  const handleCancelForm = () => {
    setIsAddingNew(false);
    setEditingRoomId(null);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Vui lòng nhập tên phòng');
      return;
    }

    setIsSubmitting(true);
    try {
      const roomToSave: RoomConfig = {
        id: editingRoomId || `room_${Date.now()}`,
        name: formName.trim(),
        gender: formGender,
        capacity: isUnlimited ? undefined : Number(formCapacity) || 8,
        notes: formNotes.trim(),
        order: editingRoomId
          ? roomConfigs.find((r) => r.id === editingRoomId)?.order || 99
          : roomConfigs.length + 1,
      };

      await onSaveRoomConfig(roomToSave);
      setIsAddingNew(false);
      setEditingRoomId(null);
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi lưu phòng ở');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRoom = async (room: RoomConfig) => {
    const studentCount = students.filter((s) => s.room === room.name && s.status === 'active').length;
    if (studentCount > 0) {
      if (!confirm(`Phòng "${room.name}" hiện đang có ${studentCount} học sinh đang ở. Nếu xóa phòng, các em này sẽ cần được chuyển sang phòng khác. Bạn vẫn muốn tiếp tục xóa phòng này?`)) {
        return;
      }
    } else {
      if (!confirm(`Bạn có chắc chắn muốn bỏ phòng "${room.name}" khỏi danh sách?`)) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onDeleteRoomConfig(room.id);
      setDeleteConfirmRoom(null);
    } catch (err) {
      console.error(err);
      alert('Lỗi khi xóa phòng ở');
    } finally {
      setIsSubmitting(false);
    }
  };

  const maleCount = roomConfigs.filter((r) => r.gender === 'Nam').length;
  const femaleCount = roomConfigs.filter((r) => r.gender === 'Nữ').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Building2 className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">
                Tùy Chỉnh Phòng Ở & Sức Chứa Số Giường ({roomConfigs.length} Phòng)
              </h3>
              <p className="text-xs text-blue-100">
                Thêm/bỏ phòng ở, tùy chỉnh số lượng học sinh từng phòng hoặc bỏ giới hạn số lượng, cấu hình số giường
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

        {/* Toolbar Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Tổng quan hiện tại:</span>
            <span className="bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
              {maleCount} Phòng Nam
            </span>
            <span className="bg-rose-100 text-rose-800 font-bold px-2.5 py-0.5 rounded-full border border-rose-200">
              {femaleCount} Phòng Nữ
            </span>
            <span className="bg-slate-200 text-slate-800 font-bold px-2.5 py-0.5 rounded-full">
              Tổng {roomConfigs.length} Phòng
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && !isAddingNew && !editingRoomId && (
              <button
                type="button"
                onClick={handleStartAdd}
                className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold px-3 py-1.5 rounded-xl shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Phòng Ở Mới</span>
              </button>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Khôi phục danh sách chuẩn 25 phòng (12 nam, 13 nữ, 8 giường/phòng)?')) {
                    onResetRoomConfigs();
                  }
                }}
                className="flex items-center gap-1 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-300 font-medium transition"
                title="Khôi phục chuẩn 25 phòng: 12 nam và 13 nữ"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Khôi Phục Chuẩn 25 Phòng</span>
              </button>
            )}
          </div>
        </div>

        {/* Add/Edit Room Inline Panel */}
        {(isAddingNew || editingRoomId) && (
          <form
            onSubmit={handleSaveForm}
            className="bg-blue-50/70 p-4 border-b border-blue-200 space-y-3 animate-fadeIn"
          >
            <div className="font-bold text-xs text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
              <Edit3 className="w-4 h-4 text-blue-700" />
              <span>{isAddingNew ? 'Thêm Phòng Ở Mới' : 'Chỉnh Sửa Thông Tin Phòng Ở'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên phòng:</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ví dụ: Phòng Nam 01"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Loại phòng:</label>
                <select
                  value={formGender}
                  onChange={(e) => setFormGender(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-slate-800"
                >
                  <option value="Nam">Dành cho Nam</option>
                  <option value="Nữ">Dành cho Nữ</option>
                  <option value="Khác">Khác / Chung</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Sức chứa / Số giường ngủ:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    disabled={isUnlimited}
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(Number(e.target.value))}
                    className="w-20 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={isUnlimited}
                      onChange={(e) => setIsUnlimited(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span>Bỏ giới hạn</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ghi chú phòng:</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ví dụ: Dãy nhà B, tầng 1"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleCancelForm}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 bg-white rounded-xl border border-slate-300"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs"
              >
                {isSubmitting ? 'Đang lưu...' : 'Lưu Thay Đổi Phòng'}
              </button>
            </div>
          </form>
        )}

        {/* Room Table / Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">STT</th>
                  <th className="py-2.5 px-3">Tên Phòng Ở</th>
                  <th className="py-2.5 px-3 w-28 text-center">Giới tính</th>
                  <th className="py-2.5 px-3 w-36 text-center">Sức chứa / Số giường</th>
                  <th className="py-2.5 px-3 w-28 text-center">HS đang ở</th>
                  <th className="py-2.5 px-3">Ghi chú</th>
                  {isAdmin && <th className="py-2.5 px-3 w-28 text-center">Thao tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roomConfigs.map((room, idx) => {
                  const currentStudentsInRoom = students.filter(
                    (s) => s.room === room.name && s.status === 'active'
                  );
                  const isFull = room.capacity && currentStudentsInRoom.length >= room.capacity;
                  const isOver = room.capacity && currentStudentsInRoom.length > room.capacity;

                  return (
                    <tr
                      key={room.id}
                      className={`hover:bg-slate-50 transition ${
                        editingRoomId === room.id ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                        <Building2
                          className={`w-4 h-4 ${
                            room.gender === 'Nam' ? 'text-blue-600' : 'text-rose-600'
                          }`}
                        />
                        <span>{room.name}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`font-semibold text-[11px] px-2 py-0.5 rounded-full ${
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
                      <td className="py-2.5 px-3 text-center">
                        {room.capacity ? (
                          <span className="font-bold text-slate-800 flex items-center justify-center gap-1">
                            <Bed className="w-3.5 h-3.5 text-slate-500" />
                            <span>{room.capacity} giường</span>
                          </span>
                        ) : (
                          <span className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-[11px]">
                            Không giới hạn
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`font-bold text-xs px-2 py-0.5 rounded-full ${
                            isOver
                              ? 'bg-rose-100 text-rose-800 font-extrabold'
                              : isFull
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {currentStudentsInRoom.length}{' '}
                          {room.capacity ? `/ ${room.capacity}` : 'HS'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                        {room.notes || <span className="text-slate-300 italic">Không có</span>}
                      </td>
                      {isAdmin && (
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(room)}
                              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                              title="Chỉnh sửa phòng"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRoom(room)}
                              className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition"
                              title="Bỏ số phòng ở này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <div>
            <span>
              Chuẩn 25 phòng nội trú: <strong>12 phòng nam</strong>, <strong>13 phòng nữ</strong>. Quản trị viên có toàn quyền tùy chỉnh số lượng phòng và số giường.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
