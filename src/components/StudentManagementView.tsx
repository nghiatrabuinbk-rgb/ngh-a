import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  MapPin, 
  Phone, 
  GraduationCap, 
  Home, 
  RefreshCw,
  X,
  Check,
  Bed,
  BedDouble,
  Building2,
  Filter,
  Save
} from 'lucide-react';
import { Student } from '../types';

interface StudentManagementViewProps {
  students: Student[];
  onSaveStudent: (student: Student) => Promise<void>;
  onDeleteStudent: (studentId: string) => Promise<void>;
  onResetSeedData: () => Promise<void>;
  rooms: string[];
  classes: string[];
  villages: string[];
  hamlets: string[];
  canEdit: boolean;
}

export const StudentManagementView: React.FC<StudentManagementViewProps> = ({
  students,
  onSaveStudent,
  onDeleteStudent,
  onResetSeedData,
  rooms,
  classes,
  villages,
  hamlets,
  canEdit,
}) => {
  const [search, setSearch] = useState('');
  const [filterRoom, setFilterRoom] = useState('ALL');
  const [filterClass, setFilterClass] = useState('ALL');
  const [filterHamlet, setFilterHamlet] = useState('ALL');
  const [viewMode, setViewMode] = useState<'all' | 'rooms_matrix'>('all');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formGender, setFormGender] = useState<'Nam' | 'Nữ'>('Nam');
  const [formDob, setFormDob] = useState('2012-01-01');
  const [formRoom, setFormRoom] = useState(rooms[0] || 'Phòng Nam 01');
  const [formBedNumber, setFormBedNumber] = useState('Giường 01');
  const [formClass, setFormClass] = useState(classes[0] || '6A');
  const [formVillage, setFormVillage] = useState(villages[0] || 'Thôn 1');
  const [formHamlet, setFormHamlet] = useState(hamlets[0] || 'Nóc Tăk Pổ');
  const [formEthnicity, setFormEthnicity] = useState('Ca Dong');
  const [formParentPhone, setFormParentPhone] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Split rooms into 12 Male and 13 Female
  const maleRooms = useMemo(() => rooms.filter((r) => r.toLowerCase().includes('nam')), [rooms]);
  const femaleRooms = useMemo(() => rooms.filter((r) => r.toLowerCase().includes('nữ')), [rooms]);
  const otherRooms = useMemo(
    () => rooms.filter((r) => !r.toLowerCase().includes('nam') && !r.toLowerCase().includes('nữ')),
    [rooms]
  );

  // Open modal for new student
  const handleOpenAddModal = () => {
    setEditingStudent(null);
    setFormName('');
    setFormGender('Nam');
    setFormDob('2012-01-01');
    setFormRoom(rooms[0] || 'Phòng Nam 01');
    setFormBedNumber('Giường 01');
    setFormClass(classes[0] || '6A');
    setFormVillage(villages[0] || 'Thôn 1');
    setFormHamlet(hamlets[0] || 'Nóc Tăk Pổ');
    setFormEthnicity('Ca Dong');
    setFormParentPhone('');
    setFormNotes('');
    setIsModalOpen(true);
  };

  // Open modal for editing student
  const handleOpenEditModal = (s: Student) => {
    setEditingStudent(s);
    setFormName(s.name);
    setFormGender(s.gender);
    setFormDob(s.dob || '2012-01-01');
    setFormRoom(s.room);
    setFormBedNumber(s.bedNumber || 'Giường 01');
    setFormClass(s.class);
    setFormVillage(s.village);
    setFormHamlet(s.hamlet);
    setFormEthnicity(s.ethnicity || 'Ca Dong');
    setFormParentPhone(s.parentPhone || '');
    setFormNotes(s.notes || '');
    setIsModalOpen(true);
  };

  // Save student
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Vui lòng nhập họ và tên học sinh');
      return;
    }
    if (!formRoom.trim()) {
      alert('Vui lòng chọn số phòng ở');
      return;
    }

    setIsSubmitting(true);
    try {
      const studentId = editingStudent ? editingStudent.id : `hs_${Date.now()}`;
      const newStudent: Student = {
        id: studentId,
        name: formName.trim(),
        gender: formGender,
        dob: formDob,
        room: formRoom.trim(),
        bedNumber: formBedNumber.trim() || 'Giường 01',
        class: formClass.trim(),
        village: formVillage.trim(),
        hamlet: formHamlet.trim(),
        ethnicity: formEthnicity.trim(),
        parentPhone: formParentPhone.trim(),
        notes: formNotes.trim(),
        status: 'active',
      };

      await onSaveStudent(newStudent);
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi lưu thông tin học sinh.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete student
  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa học sinh "${name}" khỏi danh sách nội trú?`)) {
      await onDeleteStudent(id);
    }
  };

  // Filtered list
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (s.status !== 'active') return false;
      if (filterRoom !== 'ALL' && s.room !== filterRoom) return false;
      if (filterClass !== 'ALL' && s.class !== filterClass) return false;
      if (filterHamlet !== 'ALL' && s.hamlet !== filterHamlet) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = s.name.toLowerCase().includes(q);
        const matchClass = s.class.toLowerCase().includes(q);
        const matchRoom = s.room.toLowerCase().includes(q);
        const matchBed = (s.bedNumber || '').toLowerCase().includes(q);
        const matchHamlet = s.hamlet.toLowerCase().includes(q);
        const matchVillage = s.village.toLowerCase().includes(q);
        if (!matchName && !matchClass && !matchRoom && !matchBed && !matchHamlet && !matchVillage) return false;
      }
      return true;
    });
  }, [students, filterRoom, filterClass, filterHamlet, search]);

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-0.5">
            Trường PTDTBT THCS Trà Đốc - TP Đà Nẵng
          </div>
          <h2 className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-700" />
            <span>DANH SÁCH & SẮP XẾP CHỖ Ở HỌC SINH NỘI TRÚ (25 PHÒNG)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tổng số: <strong>{students.length}</strong> học sinh • Quản trị viên được quyền tùy chỉnh sắp xếp chỗ ở cho từng học sinh, từng phòng ở (12 phòng nam, 13 phòng nữ), số giường và ghi chú cá nhân.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {canEdit && (
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm px-4 py-2 rounded-xl shadow transition transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Học Sinh Mới</span>
            </button>
          )}

          <button
            onClick={() => {
              if (confirm('Khởi tạo lại danh sách 25 phòng (12 nam, 13 nữ) và phân bổ học sinh mẫu theo giường?')) {
                onResetSeedData();
              }
            }}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 transition"
            title="Khởi tạo hoặc cập nhật lại danh sách dữ liệu mẫu 25 phòng"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Nạp Dữ Liệu 25 Phòng</span>
          </button>
        </div>
      </div>

      {/* 25 Rooms Quick Assignment Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-emerald-700" />
            <span>Sắp xếp chỗ ở theo 25 phòng nội trú:</span>
          </span>
          <div className="flex items-center gap-2">
            <span className="bg-blue-100 text-blue-900 font-bold px-2 py-0.5 rounded-full border border-blue-200">
              12 Phòng Nam ({students.filter((s) => s.gender === 'Nam').length} HS)
            </span>
            <span className="bg-rose-100 text-rose-900 font-bold px-2 py-0.5 rounded-full border border-rose-200">
              13 Phòng Nữ ({students.filter((s) => s.gender === 'Nữ').length} HS)
            </span>
          </div>
        </div>

        {/* 12 Male Rooms */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-[11px] font-bold text-blue-900 shrink-0">Phòng Nam:</span>
          {maleRooms.map((r) => {
            const count = students.filter((s) => s.room === r && s.status === 'active').length;
            const isSelected = filterRoom === r;
            return (
              <button
                key={r}
                onClick={() => setFilterRoom(isSelected ? 'ALL' : r)}
                className={`px-2.5 py-1 rounded-lg font-bold transition whitespace-nowrap text-[11px] border ${
                  isSelected
                    ? 'bg-blue-700 text-white border-blue-800 shadow-xs'
                    : 'bg-blue-50/80 text-blue-900 hover:bg-blue-100 border-blue-200'
                }`}
              >
                <span>{r.replace('Phòng ', '')}</span>
                <span className="opacity-75 ml-0.5">({count})</span>
              </button>
            );
          })}
        </div>

        {/* 13 Female Rooms */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs pt-1 border-t border-slate-100">
          <span className="text-[11px] font-bold text-rose-900 shrink-0">Phòng Nữ:</span>
          {femaleRooms.map((r) => {
            const count = students.filter((s) => s.room === r && s.status === 'active').length;
            const isSelected = filterRoom === r;
            return (
              <button
                key={r}
                onClick={() => setFilterRoom(isSelected ? 'ALL' : r)}
                className={`px-2.5 py-1 rounded-lg font-bold transition whitespace-nowrap text-[11px] border ${
                  isSelected
                    ? 'bg-rose-700 text-white border-rose-800 shadow-xs'
                    : 'bg-rose-50/80 text-rose-900 hover:bg-rose-100 border-rose-200'
                }`}
              >
                <span>{r.replace('Phòng ', '')}</span>
                <span className="opacity-75 ml-0.5">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="block text-slate-500 mb-1 font-semibold">Tìm kiếm học sinh:</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Tên, phòng, giường, lớp..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-2.5 py-1.5 focus:ring-1 focus:ring-emerald-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          </div>
        </div>

        <div>
          <label className="block text-slate-500 mb-1 font-semibold">Lọc theo phòng ở:</label>
          <select
            value={filterRoom}
            onChange={(e) => setFilterRoom(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium"
          >
            <option value="ALL">-- Tất cả 25 phòng ({students.length} HS) --</option>
            <optgroup label="--- 12 PHÒNG NAM ---">
              {maleRooms.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </optgroup>
            <optgroup label="--- 13 PHÒNG NỮ ---">
              {femaleRooms.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <div>
          <label className="block text-slate-500 mb-1 font-semibold">Lọc theo Lớp:</label>
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium"
          >
            <option value="ALL">-- Tất cả các lớp --</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                Lớp {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-500 mb-1 font-semibold">Lọc theo Nóc:</label>
          <select
            value={filterHamlet}
            onChange={(e) => setFilterHamlet(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium"
          >
            <option value="ALL">-- Tất cả các nóc --</option>
            {hamlets.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Student Table with Bed Number and Notes */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800">
            Hiển thị: <strong>{filteredStudents.length}</strong> / {students.length} học sinh
          </span>
          {filterRoom !== 'ALL' && (
            <span className="bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
              Đang lọc: {filterRoom}
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-semibold border-b text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3 text-center w-10">STT</th>
                <th className="py-2.5 px-3">Họ và tên học sinh</th>
                <th className="py-2.5 px-2.5 text-center">Giới tính</th>
                <th className="py-2.5 px-3">Số phòng ở (25 phòng)</th>
                <th className="py-2.5 px-3 text-center">Ở giường số</th>
                <th className="py-2.5 px-2.5 text-center">Lớp</th>
                <th className="py-2.5 px-3">Thôn cư trú</th>
                <th className="py-2.5 px-3">Nóc (Khu dân cư)</th>
                <th className="py-2.5 px-3 min-w-[160px]">Ghi chú sau mỗi em học sinh</th>
                <th className="py-2.5 px-3 text-center">SĐT Phụ huynh</th>
                {canEdit && <th className="py-2.5 px-3 text-center w-20">Thao tác</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-slate-400">
                    Không tìm thấy học sinh nào phù hợp bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      <div>{s.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{s.id}</div>
                    </td>
                    <td className="py-2.5 px-2.5 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          s.gender === 'Nam'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {s.gender}
                      </span>
                    </td>
                    {/* Số phòng ở */}
                    <td className="py-2.5 px-3 font-bold text-slate-800">
                      <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                        {s.room}
                      </span>
                    </td>
                    {/* Ở giường số */}
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1 font-extrabold text-[11px] bg-amber-100 text-amber-950 px-2.5 py-1 rounded-lg border border-amber-300 shadow-2xs whitespace-nowrap">
                        <BedDouble className="w-3 h-3 text-amber-700" />
                        <span>{s.bedNumber || 'Giường 01'}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-2.5 text-center font-bold text-emerald-800">
                      <span className="bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {s.class}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{s.village}</td>
                    <td className="py-2.5 px-3 text-purple-700 font-semibold bg-purple-50/20">
                      {s.hamlet}
                    </td>
                    {/* Ghi chú sau mỗi em học sinh */}
                    <td className="py-2.5 px-3 text-xs text-slate-700">
                      {s.notes ? (
                        <span className="bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200 block">
                          {s.notes}
                        </span>
                      ) : (
                        <span className="text-slate-300 italic">Chưa có ghi chú</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {s.parentPhone ? (
                        <a
                          href={`tel:${s.parentPhone}`}
                          className="text-emerald-700 hover:underline flex items-center justify-center gap-1 font-semibold text-xs"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{s.parentPhone}</span>
                        </a>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(s)}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                            title="Tùy chỉnh phòng ở, số giường và ghi chú"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(s.id, s.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                            title="Xóa học sinh"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit Student (With Bed Number and Room Customization) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                  <Bed className="w-5 h-5 text-emerald-700" />
                  <span>{editingStudent ? 'Tùy Chỉnh Sắp Xếp Chỗ Ở Học Sinh' : 'Thêm Học Sinh Mới & Xếp Chỗ Ở'}</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Phân bổ vào 25 phòng nội trú (12 phòng nam, 13 phòng nữ), số giường và ghi chú.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Họ và tên học sinh (*):
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Hồ Văn Nam"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Giới tính:</label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as 'Nam' | 'Nữ')}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dân tộc:</label>
                  <input
                    type="text"
                    value={formEthnicity}
                    onChange={(e) => setFormEthnicity(e.target.value)}
                    placeholder="Ca Dong, M'Nông, Co..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              {/* SỐ PHÒNG Ở & Ở GIƯỜNG SỐ (25 PHÒNG) */}
              <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-3.5 space-y-3">
                <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <BedDouble className="w-4 h-4 text-amber-700" />
                  <span>Sắp xếp chỗ ở nội trú (25 phòng: 12 nam, 13 nữ):</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Số phòng ở */}
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Số phòng ở (*):
                    </label>
                    <select
                      value={formRoom}
                      onChange={(e) => setFormRoom(e.target.value)}
                      className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
                    >
                      <optgroup label="--- 12 PHÒNG NAM ---">
                        {maleRooms.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="--- 13 PHÒNG NỮ ---">
                        {femaleRooms.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  {/* Ở giường số */}
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Ở giường số (*):
                    </label>
                    <input
                      type="text"
                      list="bed-suggestions"
                      placeholder="VD: Giường 01, Giường 02..."
                      value={formBedNumber}
                      onChange={(e) => setFormBedNumber(e.target.value)}
                      className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 font-bold text-amber-950 focus:ring-2 focus:ring-amber-500"
                    />
                    <datalist id="bed-suggestions">
                      <option value="Giường 01" />
                      <option value="Giường 02" />
                      <option value="Giường 03" />
                      <option value="Giường 04" />
                      <option value="Giường 05" />
                      <option value="Giường 06" />
                      <option value="Giường 07" />
                      <option value="Giường 08" />
                    </datalist>
                  </div>
                </div>
              </div>

              {/* Lớp & Thôn & Nóc */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Lớp (*):
                  </label>
                  <input
                    type="text"
                    list="class-suggestions"
                    required
                    placeholder="VD: 6A, 7B..."
                    value={formClass}
                    onChange={(e) => setFormClass(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-900"
                  />
                  <datalist id="class-suggestions">
                    {classes.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Thôn cư trú (*):</label>
                  <input
                    type="text"
                    list="village-suggestions"
                    required
                    placeholder="VD: Thôn 1..."
                    value={formVillage}
                    onChange={(e) => setFormVillage(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                  />
                  <datalist id="village-suggestions">
                    {villages.map((v) => (
                      <option key={v} value={v} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-purple-900 mb-1">Nóc (bản cao):</label>
                  <input
                    type="text"
                    list="hamlet-suggestions"
                    placeholder="VD: Nóc Tăk Pổ..."
                    value={formHamlet}
                    onChange={(e) => setFormHamlet(e.target.value)}
                    className="w-full bg-purple-50/50 border border-purple-300 rounded-xl px-3 py-2 font-semibold text-purple-950"
                  />
                  <datalist id="hamlet-suggestions">
                    {hamlets.map((h) => (
                      <option key={h} value={h} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">SĐT Phụ huynh:</label>
                  <input
                    type="tel"
                    placeholder="09xx xxx xxx"
                    value={formParentPhone}
                    onChange={(e) => setFormParentPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              {/* Ô GHI CHÚ SAU MỖI EM HỌC SINH */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Ô ghi chú sau mỗi em học sinh (Cán sự phòng, sức khỏe, diện chính sách, lưu ý):
                </label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú chỗ ở: Trưởng phòng, hay đau ốm, tự học chăm, ở lại cuối tuần..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold shadow-md transition transform active:scale-95"
                >
                  {isSubmitting ? 'Đang lưu...' : 'Lưu & Sắp Xếp Chỗ Ở'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
