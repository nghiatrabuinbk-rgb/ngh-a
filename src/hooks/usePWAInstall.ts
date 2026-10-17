import { useEffect, useState, useCallback } from 'react';

export type DetectedOS = 
  | 'ios'
  | 'android'
  | 'samsung'
  | 'xiaomi'
  | 'huawei'
  | 'kaios'
  | 'desktop'
  | 'other';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [detectedOS, setDetectedOS] = useState<DetectedOS>('other');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    // 1. Detect standalone mode (already installed or launched from home screen)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');

    setIsInstalled(isStandalone);

    // 2. Comprehensive OS and Browser detection
    const ua = (window.navigator.userAgent || '').toLowerCase();

    if (/iphone|ipad|ipod/.test(ua)) {
      setDetectedOS('ios');
    } else if (/kaios/.test(ua)) {
      setDetectedOS('kaios');
    } else if (/samsungbrowser|sm-[a-z0-9]+/i.test(ua)) {
      setDetectedOS('samsung'); // Samsung One UI
    } else if (/miui|xiaomi|poco|redmi/i.test(ua)) {
      setDetectedOS('xiaomi'); // Xiaomi HyperOS / MIUI
    } else if (/harmonyos|huawei|honor/i.test(ua)) {
      setDetectedOS('huawei'); // Huawei HarmonyOS
    } else if (/android/.test(ua)) {
      setDetectedOS('android'); // General Android
    } else {
      setDetectedOS('desktop');
    }

    // 3. Online/offline tracking
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 4. Standard PWA beforeinstallprompt handler
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return true;
      }
    } catch (err) {
      console.warn('Install prompt error:', err);
    }
    return false;
  }, [deferredPrompt]);

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    detectedOS,
    isOnline,
    install,
  };
}
