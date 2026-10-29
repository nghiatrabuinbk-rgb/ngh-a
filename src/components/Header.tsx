import React from 'react';
import { 
  Building2, 
  Calendar, 
  UserCheck, 
  LogOut, 
  LogIn, 
  ShieldCheck, 
  Users, 
  FileSpreadsheet, 
  ClipboardCheck,
  Sparkles,
  QrCode,
  Moon,
  Trophy,
  BedDouble,
  CloudCheck,
  RefreshCw
} from 'lucide-react';
import { AuthorizedUser } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  currentDate: string;
  onDateChange: (newDate: string) => void;
  currentUser: { email?: string | null; displayName?: string | null } | null;
  authorizedInfo: AuthorizedUser | null;
  isAdmin?: boolean;
  allowedTabs?: ('attendance' | 'night_study' | 'competition' | 'room_duty' | 'report' | 'students' | 'permissions')[];
  onLogin: () => void;
  onOpenZaloLogin: () => void;
  onLogout: () => void;
  activeTab: 'attendance' | 'night_study' | 'competition' | 'room_duty' | 'report' | 'students' | 'permissions';
  onTabChange: (tab: 'attendance' | 'night_study' | 'competition' | 'room_duty' | 'report' | 'students' | 'permissions') => void;
  serverSyncStatus?: 'synced' | 'syncing' | 'offline';
  lastSyncedTime?: string;
  onForceSync?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentDate,
  onDateChange,
  currentUser,
  authorizedInfo,
  isAdmin = false,
  allowedTabs = ['attendance', 'night_study', 'competition', 'room_duty', 'report', 'students', 'permissions'],
  onLogin,
  onOpenZaloLogin,
  onLogout,
  activeTab,
  onTabChange,
  serverSyncStatus = 'synced',
  lastSyncedTime,
  onForceSync,
}) => {
  return (
    <header className="bg-gradient-to-r from-emerald-800 via-teal-800 to-cyan-900 text-white shadow-lg sticky top-0 z-40">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-3 border-b border-emerald-700/50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/20 shadow-inner">
            <Building2 className="w-7 h-7 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs tracking-wider uppercase bg-emerald-700/80 px-2 py-0.5 rounded font-bold text-amber-300">
                Trường PTDTBT THCS Trà Đốc - TP Đà Nẵng
              </span>
              <span className="text-xs text-emerald-200/90 hidden sm:inline-block">
                Hệ Thống Quản Lý Nội Trú
              </span>
            </div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              QUẢN LÝ SĨ SỐ HỌC SINH NỘI TRÚ
            </h1>
          </div>
        </div>

        {/* Date Selector & Auth info */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* PWA Cross-Platform Install Button */}
          <PWAInstallButton variant="header" />

          {/* Date Picker */}
          <div className="flex items-center gap-1.5 bg-emerald-900/60 border border-emerald-600/50 rounded-lg px-2.5 py-1.5 backdrop-blur-sm text-sm">
            <Calendar className="w-4 h-4 text-emerald-300" />
            <span className="text-xs text-emerald-200 hidden sm:inline">Ngày:</span>
            <input
              type="date"
              value={currentDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="bg-transparent text-white font-medium text-xs sm:text-sm focus:outline-none cursor-pointer"
            />
          </div>

          {/* Server Real-time Sync Status Badge */}
          <div 
            onClick={onForceSync}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border backdrop-blur-sm cursor-pointer transition select-none shadow-xs ${
              serverSyncStatus === 'syncing'
                ? 'bg-amber-900/60 border-amber-500/50 text-amber-200'
                : serverSyncStatus === 'offline'
                ? 'bg-rose-900/60 border-rose-500/50 text-rose-200'
                : 'bg-emerald-900/60 border-emerald-500/50 text-emerald-200 hover:bg-emerald-800/80'
            }`}
            title="Trạng thái kết nối máy chủ Firestore. Bấm vào để kích hoạt đồng bộ lại dữ liệu tức thì."
          >
            {serverSyncStatus === 'syncing' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-300" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
            )}
            <span className="hidden sm:inline">
              {serverSyncStatus === 'syncing' ? 'Đang đồng bộ...' : 'Máy chủ: Đã đồng bộ'}
            </span>
            {lastSyncedTime && serverSyncStatus === 'synced' && (
              <span className="text-[10px] text-emerald-300/80 hidden md:inline">({lastSyncedTime})</span>
            )}
          </div>

          {/* User Account / Login */}
          {currentUser ? (
            <div className="flex items-center gap-2.5 bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-xs sm:text-sm shadow-xs backdrop-blur-sm">
              <div className="w-8 h-8 rounded-full bg-emerald-600 border border-emerald-400/50 flex items-center justify-center font-extrabold text-white uppercase text-xs shadow-inner shrink-0">
                {currentUser.displayName ? currentUser.displayName[0] : (currentUser.email ? currentUser.email[0] : 'G')}
              </div>
              <div className="hidden sm:block text-left">
                <div className="font-bold leading-tight text-white truncate max-w-[160px]" title={currentUser.displayName || currentUser.email || ''}>
                  {authorizedInfo?.name || currentUser.displayName || currentUser.email}
                </div>
                <div className="text-[10px] text-emerald-200 flex items-center gap-1.5 mt-0.5">
                  {authorizedInfo?.role === 'admin' ? (
                    <span className="bg-amber-400 text-slate-950 font-extrabold px-1.5 py-0.2 rounded">BGH / Quản Trị</span>
                  ) : (
                    <span className="bg-cyan-400 text-slate-950 font-bold px-1.5 py-0.2 rounded">GV Trực Phòng</span>
                  )}
                  {currentUser.email && (
                    <span className="text-emerald-300 truncate max-w-[130px] font-medium" title={currentUser.email}>
                      • {currentUser.email}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={onLogout}
                title="Đăng xuất khỏi tài khoản này"
                className="p-1.5 hover:bg-rose-500/30 rounded-lg text-emerald-200 hover:text-white transition cursor-pointer ml-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {/* Zalo QR Login Button */}
              <button
                onClick={onOpenZaloLogin}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm px-3.5 py-1.5 rounded-xl shadow-md transition transform active:scale-95 border border-blue-400"
                title="Quét mã QR Zalo cá nhân của giáo viên để đăng nhập ngay"
              >
                <QrCode className="w-4 h-4 text-white" />
                <span>Quét QR Zalo</span>
              </button>

              {/* Gmail Login Button */}
              <button
                onClick={onLogin}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-xs sm:text-sm px-3 py-1.5 rounded-xl shadow transition transform active:scale-95"
                title="Đăng nhập bằng tài khoản Google Gmail"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Đăng nhập</span> Gmail
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 flex items-center overflow-x-auto gap-1 py-1.5 text-sm">
        {allowedTabs.includes('attendance') && (
          <button
            onClick={() => onTabChange('attendance')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium transition whitespace-nowrap ${
              activeTab === 'attendance'
                ? 'bg-white text-emerald-900 shadow-md font-semibold'
                : 'text-emerald-100 hover:bg-emerald-700/60'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Điểm danh của GVCN</span>
          </button>
        )}

        {/* Dedicated Independent Night Study Attendance Tab */}
        {allowedTabs.includes('night_study') && (
          <button
            onClick={() => onTabChange('night_study')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition whitespace-nowrap ${
              activeTab === 'night_study'
                ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                : 'text-amber-200 hover:bg-emerald-700/60'
            }`}
            title="Trạng thái điểm danh giáo viên trực tự học đêm (độc lập, quản lý 25 phòng)"
          >
            <Moon className="w-4 h-4 text-amber-300" />
            <span>Điểm danh tự học đêm</span>
          </button>
        )}

        {/* Chấm điểm thi đua */}
        {allowedTabs.includes('competition') && (
          <button
            onClick={() => onTabChange('competition')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition whitespace-nowrap ${
              activeTab === 'competition'
                ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                : 'text-amber-200 hover:bg-emerald-700/60'
            }`}
            title="Chấm điểm thi đua 25 phòng (12 phòng nam, 13 phòng nữ)"
          >
            <Trophy className="w-4 h-4 text-amber-300" />
            <span>Chấm điểm thi đua</span>
          </button>
        )}

        {/* Theo dõi và điểm danh của giáo viên trực phòng (Nằm giữa Chấm điểm thi đua và Tổng hợp báo cáo & Xuất file) */}
        {allowedTabs.includes('room_duty') && (
          <button
            onClick={() => onTabChange('room_duty')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition whitespace-nowrap ${
              activeTab === 'room_duty'
                ? 'bg-white text-emerald-950 shadow-md font-extrabold'
                : 'text-emerald-100 hover:bg-emerald-700/60'
            }`}
            title="Theo dõi và điểm danh của giáo viên trực phòng (25 phòng: 12 nam, 13 nữ)"
          >
            <BedDouble className="w-4 h-4 text-emerald-300" />
            <span>Theo dõi và điểm danh của giáo viên trực phòng</span>
          </button>
        )}

        {allowedTabs.includes('report') && (
          <button
            onClick={() => onTabChange('report')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium transition whitespace-nowrap ${
              activeTab === 'report'
                ? 'bg-white text-emerald-900 shadow-md font-semibold'
                : 'text-emerald-100 hover:bg-emerald-700/60'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Tổng hợp báo cáo & Xuất file</span>
          </button>
        )}

        {allowedTabs.includes('students') && (
          <button
            onClick={() => onTabChange('students')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium transition whitespace-nowrap ${
              activeTab === 'students'
                ? 'bg-white text-emerald-900 shadow-md font-semibold'
                : 'text-emerald-100 hover:bg-emerald-700/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Danh sách học sinh nội trú</span>
          </button>
        )}

        {allowedTabs.includes('permissions') && (
          <button
            onClick={() => onTabChange('permissions')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium transition whitespace-nowrap ${
              activeTab === 'permissions'
                ? 'bg-white text-emerald-900 shadow-md font-semibold'
                : 'text-emerald-100 hover:bg-emerald-700/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Phân quyền GV trực phòng</span>
          </button>
        )}
      </div>
    </header>
  );
};
