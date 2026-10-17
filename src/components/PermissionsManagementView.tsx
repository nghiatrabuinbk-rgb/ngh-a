import React, { useState } from 'react';
import { 
  ShieldCheck, 
  UserPlus, 
  Mail, 
  Trash2, 
  Edit2, 
  CheckCircle2, 
  AlertCircle, 
  KeyRound, 
  Home, 
  X,
  Phone,
  Info,
  QrCode,
  Printer,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { AuthorizedUser } from '../types';

interface PermissionsManagementViewProps {
  authorizedUsers: AuthorizedUser[];
  onSaveUser: (user: AuthorizedUser) => Promise<void>;
  onDeleteUser: (email: string) => Promise<void>;
  currentUserEmail: string | null | undefined;
  isAdmin: boolean;
  rooms: string[];
}

export const PermissionsManagementView: React.FC<PermissionsManagementViewProps> = ({
  authorizedUsers,
  onSaveUser,
  onDeleteUser,
  currentUserEmail,
  isAdmin,
  rooms,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AuthorizedUser | null>(null);
  const [viewingQrUser, setViewingQrUser] = useState<AuthorizedUser | null>(null);

  // Form states
  const [formEmail, setFormEmail] = useState('');
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState<'admin' | 'teacher'>('teacher');
  const [formPhone, setFormPhone] = useState('');
  const [formZaloQrData, setFormZaloQrData] = useState('');
  const [formZaloId, setFormZaloId] = useState('');
  const [formAssignedRooms, setFormAssignedRooms] = useState<string[]>(['ALL']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Open modal
  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormEmail('');
    setFormName('');
    setFormRole('teacher');
    setFormPhone('');
    setFormZaloQrData('');
    setFormZaloId('');
    setFormAssignedRooms(['ALL']);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (u: AuthorizedUser) => {
    setEditingUser(u);
    setFormEmail(u.email);
    setFormName(u.name);
    setFormRole(u.role);
    setFormPhone(u.phone || '');
    setFormZaloQrData(u.zaloQrData || '');
    setFormZaloId(u.zaloId || '');
    setFormAssignedRooms(u.assignedRooms && u.assignedRooms.length > 0 ? u.assignedRooms : ['ALL']);
    setIsModalOpen(true);
  };

  const toggleRoomSelection = (roomName: string) => {
    if (roomName === 'ALL') {
      setFormAssignedRooms(['ALL']);
      return;
    }

    let updated = formAssignedRooms.filter((r) => r !== 'ALL');
    if (updated.includes(roomName)) {
      updated = updated.filter((r) => r !== roomName);
      if (updated.length === 0) updated = ['ALL'];
    } else {
      updated.push(roomName);
    }
    setFormAssignedRooms(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail.trim() || !formName.trim()) {
      alert('Vui lòng điền đầy đủ Gmail và Họ tên giáo viên');
      return;
    }

    setIsSubmitting(true);
    try {
      const userPayload: AuthorizedUser = {
        email: formEmail.trim().toLowerCase(),
        name: formName.trim(),
        role: formRole,
        assignedRooms: formAssignedRooms,
        phone: formPhone.trim(),
        zaloQrData: formZaloQrData.trim() || (formPhone.trim() ? `https://zalo.me/${formPhone.trim()}` : ''),
        zaloId: formZaloId.trim(),
        active: true,
        createdAt: editingUser?.createdAt || new Date().toISOString(),
      };

      await onSaveUser(userPayload);
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Có lỗi khi lưu thông tin phân quyền.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (email: string, name: string) => {
    if (confirm(`Bạn có chắc muốn thu hồi quyền truy cập của "${name}" (${email})?`)) {
      await onDeleteUser(email);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-700" />
            <h2 className="text-lg font-bold text-slate-900">
              PHÂN QUYỀN & QUẢN LÝ ĐĂNG NHẬP GMAIL / MÃ QR ZALO GIÁO VIÊN
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Giáo viên trực phòng có thể đăng nhập bằng <strong>Gmail được cấp quyền</strong> hoặc quét <strong>mã QR Zalo cá nhân</strong> để vào thực hiện điểm danh và gửi báo cáo trực phòng nhanh chóng.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Cấp Quyền Giáo Viên Mới</span>
          </button>
        )}
      </div>

      {/* Guide Note Box */}
      <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-900 flex items-start gap-3">
        <Info className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-emerald-950">Quy trình đăng nhập & cấp quyền cho giáo viên trực phòng:</p>
          <ul className="list-disc list-inside space-y-0.5 text-emerald-800">
            <li>
              <strong>Đăng nhập qua Gmail:</strong> Giáo viên nhấn nút <em>"Đăng nhập Gmail GV"</em> và chọn tài khoản Google đã được BGH cấp phép.
            </li>
            <li>
              <strong>Đăng nhập qua mã QR Zalo cá nhân:</strong> Giáo viên chỉ cần đưa mã QR Zalo cá nhân (mở trên app Zalo điện thoại) trước camera hoặc tải ảnh mã QR lên để đăng nhập tức thì.
            </li>
            <li>
              <strong>Phân công trực phòng:</strong> Giáo viên trực phòng chỉ xem và điểm danh đúng các phòng được phân công; Quản trị viên (BGH) quản lý toàn bộ hệ thống.
            </li>
            <li>
              Tài khoản quản trị khởi tạo: <strong>nghiatrabui.nbk@gmail.com</strong>
            </li>
          </ul>
        </div>
      </div>

      {/* Authorized Users List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">
            DANH SÁCH GIÁO VIÊN & TÀI KHOẢN ĐƯỢC CẤP QUYỀN ({authorizedUsers.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-semibold border-b text-[11px] uppercase">
                <th className="py-3 px-3 text-center w-10">STT</th>
                <th className="py-3 px-3">Họ và tên</th>
                <th className="py-3 px-3">Tài khoản Gmail</th>
                <th className="py-3 px-3">Vai trò</th>
                <th className="py-3 px-3">Phòng được phân công</th>
                <th className="py-3 px-3">Mã QR Zalo / SĐT</th>
                <th className="py-3 px-3 text-center">Trạng thái</th>
                <th className="py-3 px-3 text-center w-28">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {authorizedUsers.map((user, idx) => {
                const isCurrent = currentUserEmail?.toLowerCase() === user.email.toLowerCase();
                const hasZalo = Boolean(user.zaloQrData || user.phone);
                return (
                  <tr key={user.email} className={`hover:bg-slate-50/80 transition ${isCurrent ? 'bg-emerald-50/30' : ''}`}>
                    <td className="py-3 px-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span>{user.name}</span>
                        {isCurrent && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-semibold">
                            Bạn
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-700">
                      <span className="flex items-center gap-1 text-slate-800 font-mono text-xs">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {user.email}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {user.role === 'admin' ? (
                        <span className="bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2 py-0.5 rounded text-xs">
                          Quản Trị Viên (BGH)
                        </span>
                      ) : (
                        <span className="bg-cyan-100 text-cyan-900 border border-cyan-300 font-medium px-2 py-0.5 rounded text-xs">
                          Giáo Viên Trực Phòng
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-xs">
                      {user.assignedRooms && user.assignedRooms.includes('ALL') ? (
                        <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded">
                          Tất cả các phòng
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {user.assignedRooms?.map((r) => (
                            <span key={r} className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded text-[11px] font-medium border border-emerald-200">
                              {r}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {hasZalo ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setViewingQrUser(user)}
                            className="inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-800 px-2 py-0.5 rounded-lg border border-blue-200 text-xs font-semibold transition"
                            title="Bấm để xem và in thẻ QR Zalo"
                          >
                            <QrCode className="w-3.5 h-3.5 text-blue-600" />
                            <span>{user.phone || 'QR Zalo'}</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">Chưa cài đặt</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Đã cấp phép</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setViewingQrUser(user)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                          title="Xem thẻ QR Zalo của giáo viên"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleOpenEditModal(user)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                            title="Chỉnh sửa phân quyền"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {isAdmin && user.email !== 'nghiatrabui.nbk@gmail.com' && (
                          <button
                            onClick={() => handleDelete(user.email, user.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                            title="Thu hồi quyền"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit User */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {editingUser ? 'Chỉnh Sửa Quyền & Mã Zalo Giáo Viên' : 'Cấp Quyền Đăng Nhập Mới Cho Giáo Viên'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Địa chỉ Gmail (*):
                </label>
                <input
                  type="email"
                  required
                  placeholder="giaovien@gmail.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Giáo viên dùng Gmail này để đăng nhập qua Google Auth.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Họ và tên giáo viên (*):
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Thầy Trần Văn Bình"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Vai trò:</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as 'admin' | 'teacher')}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-medium"
                  >
                    <option value="teacher">Giáo viên trực phòng</option>
                    <option value="admin">Quản trị viên (BGH / BQL)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Số điện thoại Zalo:</label>
                  <input
                    type="tel"
                    placeholder="09xx xxx xxx"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono"
                  />
                </div>
              </div>

              {/* Zalo QR link or handle */}
              <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-200 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                  <QrCode className="w-4 h-4 text-blue-700" />
                  <span>Cài đặt đăng nhập bằng mã QR Zalo cá nhân</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    Link Zalo cá nhân hoặc nội dung mã QR Zalo:
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: https://zalo.me/0981234567 hoặc để trống nếu dùng SĐT ở trên"
                    value={formZaloQrData}
                    onChange={(e) => setFormZaloQrData(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Khi giáo viên quét mã QR trong Zalo, app sẽ tự động nhận diện và đăng nhập trực tiếp.
                  </span>
                </div>
              </div>

              {/* Room assignment multi-selector */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Phân công phòng trực:
                </label>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="room_all"
                      checked={formAssignedRooms.includes('ALL')}
                      onChange={() => toggleRoomSelection('ALL')}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <label htmlFor="room_all" className="text-xs font-bold text-slate-800 cursor-pointer">
                      Phụ trách tất cả các phòng (hoặc Ban Quản Lý)
                    </label>
                  </div>

                  {!formAssignedRooms.includes('ALL') && (
                    <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-slate-200">
                      {rooms.map((r) => (
                        <div key={r} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`room_${r}`}
                            checked={formAssignedRooms.includes(r)}
                            onChange={() => toggleRoomSelection(r)}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <label htmlFor={`room_${r}`} className="text-xs text-slate-700 cursor-pointer line-clamp-1">
                            {r}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold shadow transition"
                >
                  {isSubmitting ? 'Đang lưu...' : 'Lưu Phân Quyền'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW / PRINT TEACHER ZALO QR CARD MODAL */}
      {viewingQrUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-slate-200 text-center relative">
            <button
              onClick={() => setViewingQrUser(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="pt-2">
              <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                Trường PTDTBT THCS Trà Đốc
              </div>
              <h3 className="font-extrabold text-lg text-slate-900 mt-0.5">
                THẺ GIÁO VIÊN TRỰC PHÒNG
              </h3>
              <p className="text-xs text-slate-500">Mã QR đăng nhập nhanh hệ thống nội trú</p>
            </div>

            {/* QR Card Frame */}
            <div className="bg-gradient-to-b from-blue-50 via-white to-blue-50 border-2 border-blue-400 rounded-2xl p-5 shadow-inner space-y-3">
              <div className="w-44 h-44 mx-auto bg-white p-3 rounded-2xl shadow-md border border-slate-200 flex items-center justify-center">
                {/* Visual QR presentation with teacher details */}
                <div className="text-center space-y-2">
                  <div className="w-36 h-36 mx-auto bg-slate-900 rounded-xl p-2.5 flex flex-col items-center justify-center relative overflow-hidden">
                    {/* Simulated visual QR pattern with Zalo branding */}
                    <div className="w-full h-full border-2 border-dashed border-white/60 rounded-lg flex flex-col items-center justify-center bg-slate-950 p-2">
                      <QrCode className="w-16 h-16 text-white" />
                      <span className="text-[9px] font-mono text-blue-300 font-bold mt-1 uppercase">
                        Zalo: {viewingQrUser.phone || 'QR Auth'}
                      </span>
                    </div>
                    {/* Center badge */}
                    <div className="absolute inset-0 m-auto w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-md border-2 border-white">
                      Z
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-base text-slate-900">{viewingQrUser.name}</h4>
                <div className="text-xs text-blue-700 font-semibold mt-0.5">
                  {viewingQrUser.role === 'admin' ? 'Quản Trị Viên (BGH)' : 'Giáo Viên Trực Phòng'}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Phụ trách: <strong>{viewingQrUser.assignedRooms?.join(', ') || 'Tất cả các phòng'}</strong>
                </div>
                {viewingQrUser.phone && (
                  <div className="text-xs text-slate-600 mt-0.5 font-mono">
                    SĐT Zalo: {viewingQrUser.phone}
                  </div>
                )}
              </div>
            </div>

            <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-left">
              <strong>Hướng dẫn đăng nhập:</strong> Giáo viên mở ứng dụng Zalo trên điện thoại, đưa mã QR cá nhân vào trước camera máy tính/điện thoại tại màn hình đăng nhập để vào điểm danh.
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow"
              >
                <Printer className="w-4 h-4" />
                <span>In Thẻ Giáo Viên</span>
              </button>
              <button
                onClick={() => setViewingQrUser(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2.5 px-3 rounded-xl transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

