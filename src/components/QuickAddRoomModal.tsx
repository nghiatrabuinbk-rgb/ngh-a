import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  X, 
  Plus, 
  Bed, 
  Users, 
  Check, 
  Sparkles,
  Info
} from 'lucide-react';
import { RoomConfig } from '../types';

interface QuickAddRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveRoom: (room: RoomConfig) => Promise<void>;
  existingRooms: RoomConfig[];
  onRoomCreated?: (newRoomName: string) => void;
}

export const QuickAddRoomModal: React.FC<QuickAddRoomModalProps> = ({
  isOpen,
  onClose,
  onSaveRoom,
  existingRooms,
  onRoomCreated,
}) => {
  const [gender, setGender] = useState<'Nam' | 'Nữ' | 'Khác'>('Nam');
  const [roomName, setRoomName] = useState('');
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [capacity, setCapacity] = useState<number>(8);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-suggest next room number when gender changes or modal opens
  useEffect(() => {
    if (!isOpen) return;
    const sameGenderRooms = existingRooms.filter((r) => r.gender === gender);

    if (gender === 'Nam') {
      const numbers = sameGenderRooms
        .map((r) => {
          const m = r.name.match(/\d+/);
          return m ? parseInt(m[0], 10) : 0;
        })
        .filter((n) => n > 0);
      const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : sameGenderRooms.length + 1;
      const padded = String(nextNumber).padStart(2, '0');
      setRoomName(`Phòng Nam ${padded}`);
    } else if (gender === 'Nữ') {
      const numbers = sameGenderRooms
        .map((r) => {
          const m = r.name.match(/\d+/);
          return m ? parseInt(m[0], 10) : 0;
        })
        .filter((n) => n > 0);
      const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 13;
      const padded = String(nextNumber).padStart(2, '0');
      setRoomName(`Phòng Nữ ${padded}`);
    } else {
      const nextNumber = sameGenderRooms.length + 1;
      const padded = String(nextNumber).padStart(2, '0');
      setRoomName(`Phòng Dự Bị ${padded}`);
    }
  }, [gender, isOpen, existingRooms]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = roomName.trim();
    if (!trimmed) {
      alert('Vui lòng nhập tên phòng ở!');
      return;
    }

    // Check duplicate
    const isDuplicate = existingRooms.some(
      (r) => r.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      alert(`Phòng "${trimmed}" đã tồn tại! Vui lòng chọn tên khác.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const newRoom: RoomConfig = {
        id: `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: trimmed,
        gender,
        capacity: isUnlimited ? undefined : Number(capacity) || 8,
        notes: notes.trim(),
        order: existingRooms.length + 1,
      };

      await onSaveRoom(newRoom);
      if (onRoomCreated) {
        onRoomCreated(trimmed);
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi tạo phòng mới.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden space-y-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Building2 className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">
                Tùy Chọn Thêm Phòng Ở Mới
              </h3>
              <p className="text-xs text-emerald-200">
                Thêm phòng vào hệ thống nội trú (Nam / Nữ / Sức chứa số giường)
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm">
          {/* Gender selection */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              Khu vực phòng ở (*):
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setGender('Nam')}
                className={`py-2 px-3 rounded-xl font-bold border text-xs sm:text-sm flex items-center justify-center gap-1.5 transition ${
                  gender === 'Nam'
                    ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>Khu Nam</span>
              </button>
              <button
                type="button"
                onClick={() => setGender('Nữ')}
                className={`py-2 px-3 rounded-xl font-bold border text-xs sm:text-sm flex items-center justify-center gap-1.5 transition ${
                  gender === 'Nữ'
                    ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>Khu Nữ</span>
              </button>
              <button
                type="button"
                onClick={() => setGender('Khác')}
                className={`py-2 px-3 rounded-xl font-bold border text-xs sm:text-sm flex items-center justify-center gap-1.5 transition ${
                  gender === 'Khác'
                    ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>Dự Bị / Khác</span>
              </button>
            </div>
          </div>

          {/* Room Name */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Tên phòng ở (*):
            </label>
            <input
              type="text"
              required
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="VD: Phòng Nam 13, Phòng Nữ 14, Phòng 101..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Gợi ý theo thứ tự hoặc bạn có thể tự nhập tên phòng theo quy chuẩn của trường.
            </p>
          </div>

          {/* Capacity & Beds */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-amber-950 flex items-center gap-1.5">
                <Bed className="w-4 h-4 text-amber-700" />
                <span>Quy định sức chứa / số giường ngủ:</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={isUnlimited}
                  onChange={(e) => setIsUnlimited(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Không giới hạn</span>
              </label>
            </div>

            {!isUnlimited ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={capacity}
                    onChange={(e) => setCapacity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 bg-white border border-amber-300 rounded-xl px-3 py-1.5 font-bold text-slate-900 text-center focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="font-bold text-slate-700">giường ngủ / học sinh</span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[11px] text-slate-500 font-medium">Chọn nhanh:</span>
                  {[4, 6, 8, 10, 12].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setCapacity(num)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition ${
                        capacity === num
                          ? 'bg-amber-600 text-white border-amber-700'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-100'
                      }`}
                    >
                      {num} giường
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-xs text-amber-800 bg-white/70 p-2.5 rounded-xl border border-amber-200/80">
                Phòng này sẽ không bị giới hạn số lượng học sinh tối đa.
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Ghi chú vị trí phòng (tùy chọn):
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="VD: Tầng 1 dãy A, cạnh phòng giáo viên trực..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold shadow-md transition transform active:scale-95 text-xs sm:text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Đang tạo...' : 'Tạo Phòng Ở Ngay'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
