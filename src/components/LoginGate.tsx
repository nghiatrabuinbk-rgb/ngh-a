import React, { useState } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  Lock, 
  Smartphone, 
  Users, 
  QrCode, 
  AlertCircle, 
  CheckCircle2,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { INITIAL_ADMIN_EMAIL } from '../mockData';

interface LoginGateProps {
  onLoginWithGoogle: () => Promise<void>;
  onOpenZaloLogin: () => void;
}

export const LoginGate: React.FC<LoginGateProps> = ({
  onLoginWithGoogle,
  onOpenZaloLogin,
}) => {
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleClick = async () => {
    setIsLoggingIn(true);
    setErrorMessage(null);
    try {
      await onLoginWithGoogle();
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      if (err?.code === 'auth/popup-closed-by-user') {
        setErrorMessage('Cửa sổ đăng nhập Google đã bị đóng. Thầy cô vui lòng bấm nút bên dưới để thử lại.');
      } else if (err?.code === 'auth/popup-blocked') {
        setErrorMessage('Trình duyệt đang chặn cửa sổ bật lên (popup). Vui lòng cho phép popup để đăng nhập Google.');
      } else if (err?.code === 'auth/network-request-failed') {
        setErrorMessage('Lỗi kết nối mạng khi liên hệ máy chủ Google. Vui lòng kiểm tra lại kết nối Internet.');
      } else {
        setErrorMessage(err?.message || 'Đăng nhập không thành công. Vui lòng thử lại với tài khoản Gmail cá nhân.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-950 flex flex-col justify-between text-white selection:bg-amber-400 selection:text-slate-900">
      {/* Top Banner Branding */}
      <header className="border-b border-emerald-800/40 bg-emerald-900/30 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-400/30 shadow-inner">
              <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-300" />
            </div>
            <div>
              <span className="text-[11px] sm:text-xs uppercase tracking-wider font-extrabold text-amber-300 block">
                Trường PTDTBT THCS Trà Đốc - TP Đà Nẵng
              </span>
              <h1 className="text-sm sm:text-base md:text-lg font-bold tracking-tight text-white">
                HỆ THỐNG QUẢN LÝ SĨ SỐ HỌC SINH NỘI TRÚ
              </h1>
            </div>
          </div>
          <PWAInstallButton variant="header" />
        </div>
      </header>

      {/* Main Login Gate Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="max-w-xl w-full mx-auto space-y-6">
          
          {/* Main Card */}
          <div className="bg-slate-900/85 backdrop-blur-xl border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            {/* Background glowing accents */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header / Security Badge */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Yêu Cầu Xác Thực Danh Tính Bắt Buộc</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Đăng Nhập Bằng Gmail Cá Nhân
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
                Tất cả cán bộ, giáo viên và nhân viên khi vào ứng dụng <strong className="text-emerald-300 font-semibold">bắt buộc phải đăng nhập bằng tài khoản Gmail cá nhân</strong> để đảm bảo an toàn thông tin và phân quyền chính xác theo chỉ đạo của Nhà trường.
              </p>
            </div>

            {/* Error Message Notice if any */}
            {errorMessage && (
              <div className="mt-5 p-4 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-3 animate-in fade-in">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-rose-100">Thông báo đăng nhập:</div>
                  <div className="text-rose-200/90">{errorMessage}</div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 space-y-3.5">
              {/* Primary Google Login Button */}
              <button
                type="button"
                onClick={handleGoogleClick}
                disabled={isLoggingIn}
                className="w-full flex items-center justify-center gap-3.5 bg-white hover:bg-slate-100 active:scale-[0.99] text-slate-900 font-bold text-sm sm:text-base py-3.5 px-6 rounded-2xl shadow-xl transition-all duration-200 border border-slate-200 disabled:opacity-70 disabled:cursor-not-allowed group cursor-pointer"
              >
                {/* Official Google 'G' icon */}
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>

                <span className="font-extrabold tracking-tight">
                  {isLoggingIn ? 'Đang kết nối Google...' : 'Đăng nhập bằng tài khoản Gmail cá nhân'}
                </span>
              </button>

              {/* Alternative Zalo QR Login Button */}
              <div className="pt-1">
                <div className="relative flex items-center justify-center mb-3">
                  <div className="border-t border-slate-700/80 w-full" />
                  <span className="bg-slate-900 px-3 text-[11px] uppercase tracking-wider text-slate-400 font-semibold absolute">
                    hoặc
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onOpenZaloLogin}
                  className="w-full flex items-center justify-center gap-2.5 bg-blue-600/90 hover:bg-blue-600 active:scale-[0.99] text-white font-bold text-xs sm:text-sm py-3 px-5 rounded-2xl shadow transition border border-blue-500/50 cursor-pointer"
                >
                  <QrCode className="w-4 h-4 text-white" />
                  <span>Quét mã QR Zalo giáo viên đã đăng ký</span>
                </button>
              </div>
            </div>

            {/* Quick Informational Highlights */}
            <div className="mt-6 pt-5 border-t border-slate-800 space-y-3">
              <div className="flex items-start gap-3 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Tự động nhận diện phân quyền:</strong> Hệ thống đối chiếu Gmail với danh sách phân công (BGH, GVCN, Giáo viên trực phòng) để cấp quyền truy cập chính xác.
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Bảo mật dữ liệu học sinh:</strong> Toàn bộ dữ liệu điểm danh, phòng ở và minh chứng thi đua được đồng bộ bảo mật theo tài khoản được BGH duyệt.
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs text-slate-300">
                <Smartphone className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Sử dụng trên mọi thiết bị:</strong> Thầy cô có thể đăng nhập trên điện thoại Android, iPhone hoặc máy tính. Có thể bấm "Cài Đặt App ĐT" để lưu app vào màn hình chính.
                </div>
              </div>
            </div>

            {/* Support info */}
            <div className="mt-5 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-[11px] text-slate-400 flex items-start gap-2">
              <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Nếu Gmail cá nhân của thầy cô chưa được cấp quyền sau khi đăng nhập, vui lòng báo Quản trị viên BGH (<strong className="text-amber-300">{INITIAL_ADMIN_EMAIL}</strong>) để được bổ sung vào danh sách.
              </span>
            </div>
          </div>

          {/* Mobile Install Reminder Banner */}
          <div className="text-center">
            <PWAInstallButton variant="banner" />
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-emerald-900/30 text-center text-xs text-emerald-300/70">
        © 2026 Trường PTDTBT THCS Trà Đốc - TP Đà Nẵng • Hệ Thống Quản Lý Nội Trú Trực Tuyến
      </footer>
    </div>
  );
};
