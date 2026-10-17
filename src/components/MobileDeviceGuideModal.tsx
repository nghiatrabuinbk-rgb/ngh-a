import React, { useState } from 'react';
import { 
  X, 
  Smartphone, 
  Share2, 
  PlusSquare, 
  Download, 
  CheckCircle2, 
  Sparkles, 
  Zap, 
  Globe, 
  Wifi, 
  WifiOff, 
  Layers,
  ArrowRight,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { DetectedOS } from '../hooks/usePWAInstall';

interface MobileDeviceGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  detectedOS: DetectedOS;
  isInstallable: boolean;
  onTriggerInstall: () => Promise<boolean>;
}

export const MobileDeviceGuideModal: React.FC<MobileDeviceGuideModalProps> = ({
  isOpen,
  onClose,
  detectedOS,
  isInstallable,
  onTriggerInstall,
}) => {
  // Select initial tab based on user's current detected OS
  const getInitialTab = (): string => {
    if (detectedOS === 'ios') return 'ios';
    if (detectedOS === 'samsung') return 'samsung';
    if (detectedOS === 'xiaomi') return 'hyperos';
    if (detectedOS === 'huawei') return 'harmonyos';
    if (detectedOS === 'kaios') return 'kaios';
    return 'android';
  };

  const [activeOsTab, setActiveOsTab] = useState<string>(getInitialTab);
  const [installSuccess, setInstallSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    const success = await onTriggerInstall();
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-cyan-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner">
              <Smartphone className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-700 px-2 py-0.5 rounded-full text-emerald-200">
                  Đa Nền Tảng • Cross-Platform PWA
                </span>
              </div>
              <h3 className="font-bold text-base sm:text-lg text-white">
                Cài Đặt & Sử Dụng Trên Mọi Dòng Điện Thoại
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white hover:bg-white/10 rounded-xl transition"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick 1-Click Install Button if browser supports it */}
        {isInstallable && (
          <div className="bg-emerald-50 border-b border-emerald-200 p-3 sm:px-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-emerald-950 font-medium">
              <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Thiết bị của bạn hỗ trợ cài đặt ứng dụng trực tiếp ngay lập tức!</span>
            </div>
            <button
              onClick={handleInstallClick}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold px-3.5 py-1.5 rounded-xl transition shadow flex items-center gap-1.5 shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Cài đặt ngay</span>
            </button>
          </div>
        )}

        {/* Operating System Tab Bar */}
        <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto text-xs font-bold scrollbar-none">
          <button
            onClick={() => setActiveOsTab('android')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
              activeOsTab === 'android'
                ? 'border-emerald-600 text-emerald-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>🤖 Android</span>
          </button>

          <button
            onClick={() => setActiveOsTab('ios')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
              activeOsTab === 'ios'
                ? 'border-emerald-600 text-emerald-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>🍏 iOS (iPhone/iPad)</span>
          </button>

          <button
            onClick={() => setActiveOsTab('samsung')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
              activeOsTab === 'samsung'
                ? 'border-emerald-600 text-emerald-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>🌌 Samsung (One UI)</span>
          </button>

          <button
            onClick={() => setActiveOsTab('hyperos')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
              activeOsTab === 'hyperos'
                ? 'border-emerald-600 text-emerald-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>⚡ Xiaomi (HyperOS)</span>
          </button>

          <button
            onClick={() => setActiveOsTab('harmonyos')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
              activeOsTab === 'harmonyos'
                ? 'border-emerald-600 text-emerald-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>🔴 Huawei (HarmonyOS)</span>
          </button>

          <button
            onClick={() => setActiveOsTab('kaios')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
              activeOsTab === 'kaios'
                ? 'border-emerald-600 text-emerald-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>📱 KaiOS (Phím 4G)</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* TAB 1: ANDROID (CHROME, BRAVE, EDGE) */}
          {activeOsTab === 'android' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-green-100 text-green-800 px-2.5 py-0.5 rounded-full">
                  Android OS (Google Chrome, Edge, Cốc Cốc, Brave)
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Ứng dụng hỗ trợ chuẩn PWA hiện đại nhất trên Android, hoạt động mượt mà không cần tải từ Google Play Store:
              </p>

              <div className="space-y-2.5 text-xs text-slate-700 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                    1
                  </div>
                  <div>
                    Mở trang web trong trình duyệt <strong>Google Chrome</strong> hoặc <strong>Cốc Cốc</strong>.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                    2
                  </div>
                  <div>
                    Nhấn vào biểu tượng <strong>Ba chấm (⋮)</strong> ở góc trên bên phải màn hình.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                    3
                  </div>
                  <div>
                    Chọn <strong>"Cài đặt ứng dụng"</strong> hoặc <strong>"Thêm vào Màn hình chính"</strong> (Add to Home screen).
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                    4
                  </div>
                  <div>
                    Biểu tượng <strong>QLNT Trà Đốc</strong> sẽ xuất hiện trên màn hình chính như một ứng dụng độc lập, toàn màn hình không có thanh địa chỉ duyệt web.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: APPLE IOS (IPHONE / IPAD) */}
          {activeOsTab === 'ios' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-slate-200 text-slate-800 px-2.5 py-0.5 rounded-full">
                  Apple iOS / iPadOS (Safari)
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Trên iPhone và iPad, Apple hỗ trợ cài đặt ứng dụng trực tiếp từ trình duyệt Safari với biểu tượng độc lập:
              </p>

              <div className="space-y-2.5 text-xs text-slate-700 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                    1
                  </div>
                  <div>
                    Mở link hệ thống bằng trình duyệt <strong>Safari</strong> trên iPhone/iPad.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                    2
                  </div>
                  <div>
                    Bấm vào nút <strong className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200"><Share2 className="w-3.5 h-3.5" /> Chia sẻ</strong> ở thanh công cụ dưới đáy màn hình.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                    3
                  </div>
                  <div>
                    Cuộn xuống và chọn <strong className="inline-flex items-center gap-1 text-slate-800 bg-slate-200 px-1.5 py-0.5 rounded"><PlusSquare className="w-3.5 h-3.5" /> Thêm vào MH chính</strong> (Add to Home Screen).
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                    4
                  </div>
                  <div>
                    Nhấn <strong>Thêm</strong> ở góc trên bên phải. Ứng dụng sẽ có icon xanh riêng biệt, mở toàn màn hình (hỗ trợ tai thỏ notch và Dynamic Island).
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SAMSUNG ONE UI */}
          {activeOsTab === 'samsung' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-indigo-100 text-indigo-900 px-2.5 py-0.5 rounded-full">
                  Samsung Galaxy (Giao diện One UI & Samsung Internet)
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Điện thoại Samsung Galaxy (A, S, Z Fold/Flip, Note, M) tối ưu hóa vượt trội với trình duyệt Samsung Internet:
              </p>

              <div className="space-y-2.5 text-xs text-slate-700 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                    1
                  </div>
                  <div>
                    Trong <strong>Samsung Internet</strong>, nhìn vào thanh địa chỉ: bấm vào biểu tượng <strong>Mũi tên tải xuống (⤓)</strong> ngay trên thanh địa chỉ.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                    2
                  </div>
                  <div>
                    Hoặc bấm nút <strong>Menu (☰)</strong> ở góc dưới bên phải &gt; Chọn <strong>"Thêm trang vào"</strong> &gt; Chọn <strong>"Màn hình chờ"</strong> (Home screen).
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                    3
                  </div>
                  <div>
                    Giao diện One UI tự động ghim biểu tượng <strong>QLNT Trà Đốc</strong> vào ngăn ứng dụng và màn hình chính.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: XIAOMI HYPEROS & MIUI */}
          {activeOsTab === 'hyperos' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full">
                  Xiaomi, Redmi, POCO (Xiaomi HyperOS & MIUI)
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Hệ điều hành HyperOS / MIUI của Xiaomi hỗ trợ PWA và Web App mượt mà:
              </p>

              <div className="space-y-2.5 text-xs text-slate-700 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-amber-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                    1
                  </div>
                  <div>
                    Mở trình duyệt <strong>Mi Browser</strong> hoặc <strong>Chrome</strong> trên điện thoại Xiaomi/Redmi.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-amber-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                    2
                  </div>
                  <div>
                    Nhấn vào <strong>Menu góc màn hình</strong> &gt; Chọn <strong>"Thêm vào Màn hình chính"</strong>.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-amber-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                    3
                  </div>
                  <div>
                    <em>(Mẹo HyperOS):</em> Nếu xuất hiện thông báo cấp quyền, chọn <strong>Cho phép tạo lối tắt trên màn hình chính</strong> trong cài đặt bảo mật HyperOS.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: HUAWEI HARMONYOS */}
          {activeOsTab === 'harmonyos' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-rose-100 text-rose-900 px-2.5 py-0.5 rounded-full">
                  Huawei & Honor (HarmonyOS / EMUI)
                </span>
              </div>
              <p className="text-xs text-slate-600">
                HarmonyOS của Huawei không bị ảnh hưởng bởi Google Play Services vì ứng dụng chạy trực tiếp trên nền web PWA độc lập:
              </p>

              <div className="space-y-2.5 text-xs text-slate-700 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-rose-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                    1
                  </div>
                  <div>
                    Mở trang web trong <strong>Huawei Browser</strong> hoặc <strong>Petal Browser</strong>.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-rose-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                    2
                  </div>
                  <div>
                    Bấm vào biểu tượng <strong>Bốn chấm / Cài đặt</strong> ở thanh công cụ dưới đáy hoặc góc phải.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-rose-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                    3
                  </div>
                  <div>
                    Chọn <strong>"Thêm vào màn hình chính"</strong> (Add to Home Screen). HarmonyOS sẽ tạo biểu tượng ứng dụng độc lập với thông báo trực quan.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: KAIOS (FEATURE PHONES 4G) */}
          {activeOsTab === 'kaios' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-purple-100 text-purple-900 px-2.5 py-0.5 rounded-full">
                  Điện thoại phím bấm 4G thông minh KaiOS (Nokia 8110, 2720 Flip, JioPhone)
                </span>
              </div>
              <p className="text-xs text-slate-600">
                KaiOS chạy trên nền tảng Gecko / Firefox di động. Giao diện được tối ưu nhẹ, cuộn mượt và hỗ trợ phím điều hướng:
              </p>

              <div className="space-y-2.5 text-xs text-slate-700 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                    1
                  </div>
                  <div>
                    Mở trình duyệt <strong>Browser</strong> trên điện thoại KaiOS và nhập địa chỉ hệ thống.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                    2
                  </div>
                  <div>
                    Nhấn phím mềm <strong>Tùy chọn (Options)</strong> &gt; Chọn <strong>"Ghim vào Màn hình chính" (Pin to Top Sites / Bookmarks)</strong> để mở nhanh khi cần điểm danh.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                    3
                  </div>
                  <div>
                    Sử dụng phím <strong>D-Pad (Mũi tên Lên/Xuống)</strong> để di chuyển và phím <strong>Chọn (Center Key)</strong> để bấm điểm danh và báo suất ăn.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Key Advantages Checklist across all platforms */}
          <div className="border border-emerald-200 bg-emerald-50/50 rounded-2xl p-3.5 space-y-2 text-xs">
            <h4 className="font-bold text-emerald-950 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Lợi ích khi cài đặt ứng dụng trên điện thoại:</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-emerald-900">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Mở ngay 1 chạm từ màn hình chính</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Không tốn bộ nhớ máy (dưới 3MB)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Tự động cập nhật tính năng mới</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Hỗ trợ lưu tạm offline khi mất mạng vùng cao</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-3.5 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="text-slate-500 flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-slate-400" />
            <span>Tương thích 100% Android, iOS, One UI, HyperOS, HarmonyOS, KaiOS</span>
          </div>
          <button
            onClick={onClose}
            className="font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-4 py-1.5 rounded-xl transition"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};
