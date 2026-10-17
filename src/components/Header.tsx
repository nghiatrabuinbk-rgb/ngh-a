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
  Moon
} from 'lucide-react';
import { AuthorizedUser } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  currentDate: string;
  onDateChange: (newDate: string) => void;
  currentUser: { email?: string | null; displayName?: string | null } | null;
  authorizedInfo: AuthorizedUser | null;
  onLogin: () => void;
  onOpenZaloLogin: () => void;
  onLogout: () => void;
  activeTab: 'attendance' | 'night_study' | 'report' | 'students' | 'permissions';
  onTabChange: (tab: 'attendance' | 'night_study' | 'report' | 'students' | 'permissions') => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentDate,
  onDateChange,
  currentUser,
  authorizedInfo,
  onLogin,
  onOpenZaloLogin,
  onLogout,
  activeTab,
  onTabChange,
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

          {/* User Account / Login */}
          {currentUser ? (
            <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm shadow-xs">
              <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white uppercase text-xs shadow-inner">
                {currentUser.displayName ? currentUser.displayName[0] : (currentUser.email ? currentUser.email[0] : 'G')}
              </div>
              <div className="hidden sm:block text-left">
                <div className="font-semibold leading-tight text-emerald-100 truncate max-w-[150px]">
                  {authorizedInfo?.name || currentUser.displayName || currentUser.email}
                </div>
                <div className="text-[10px] text-emerald-300 flex items-center gap-1">
                  {authorizedInfo?.role === 'admin' ? (
                    <span className="bg-amber-500/30 text-amber-200 px-1 rounded font-medium">BGH / Quản Trị</span>
                  ) : (
                    <span className="bg-cyan-500/30 text-cyan-200 px-1 rounded font-medium">GV Trực Phòng</span>
                  )}
                  {authorizedInfo?.phone && (
                    <span className="text-emerald-300/80">• Zalo: {authorizedInfo.phone}</span>
                  )}
                </div>
              </div>
              <button
                onClick={onLogout}
                title="Đăng xuất"
                className="p-1 hover:bg-white/20 rounded text-emerald-200 hover:text-white transition"
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
        <button
          onClick={() => onTabChange('attendance')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium transition whitespace-nowrap ${
            activeTab === 'attendance'
              ? 'bg-white text-emerald-900 shadow-md font-semibold'
              : 'text-emerald-100 hover:bg-emerald-700/60'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          <span>Điểm danh hằng ngày</span>
        </button>

        {/* Dedicated Independent Night Study Attendance Tab */}
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
      </div>
    </header>
  );
};
