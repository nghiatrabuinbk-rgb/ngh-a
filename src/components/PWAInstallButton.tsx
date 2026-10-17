import React, { useState } from 'react';
import { 
  Download, 
  Smartphone, 
  CheckCircle2, 
  HelpCircle 
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { MobileDeviceGuideModal } from './MobileDeviceGuideModal';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'header' | 'banner' | 'compact';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, detectedOS, install } = usePWAInstall();
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const handleAction = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        setIsGuideOpen(true);
      }
    } else {
      setIsGuideOpen(true);
    }
  };

  return (
    <>
      {variant === 'header' && (
        <button
          onClick={handleAction}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs ${
            isInstalled
              ? 'bg-emerald-700/60 hover:bg-emerald-700 text-emerald-100 border border-emerald-500/40'
              : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white border border-emerald-400/60 shadow-md transform active:scale-95'
          } ${className}`}
          title="Cài đặt ứng dụng lên màn hình chính điện thoại (Android, iOS, One UI, HyperOS, HarmonyOS, KaiOS)"
        >
          {isInstalled ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              <span className="hidden md:inline">Đã cài trên ĐT</span>
              <span className="md:hidden">App ĐT</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5 text-white animate-bounce" />
              <span>Cài Đặt App ĐT</span>
            </>
          )}
        </button>
      )}

      {variant === 'banner' && (
        <button
          onClick={handleAction}
          className={`flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white border border-white/30 text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-xs transition transform active:scale-95 ${className}`}
        >
          <Smartphone className="w-4 h-4 text-emerald-300" />
          <span>Cài đặt trên điện thoại</span>
        </button>
      )}

      {variant === 'compact' && (
        <button
          onClick={handleAction}
          className={`p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/15 transition ${className}`}
          title="Cài đặt trên điện thoại"
        >
          <Smartphone className="w-4 h-4" />
        </button>
      )}

      {/* Cross-Platform Device Guide Modal */}
      <MobileDeviceGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        detectedOS={detectedOS}
        isInstallable={isInstallable}
        onTriggerInstall={install}
      />
    </>
  );
};
