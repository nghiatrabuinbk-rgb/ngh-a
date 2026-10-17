import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  QrCode, 
  Camera, 
  Upload, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Smartphone, 
  ShieldCheck, 
  UserCheck, 
  Sparkles,
  Search,
  ExternalLink,
  Info
} from 'lucide-react';
import jsQR from 'jsqr';
import { AuthorizedUser } from '../types';

interface ZaloQrLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  authorizedUsers: AuthorizedUser[];
  onZaloLoginSuccess: (user: AuthorizedUser) => void;
  onLinkZaloQr?: (userId: string, zaloQrData: string, zaloId?: string) => Promise<void>;
}

export const ZaloQrLoginModal: React.FC<ZaloQrLoginModalProps> = ({
  isOpen,
  onClose,
  authorizedUsers,
  onZaloLoginSuccess,
  onLinkZaloQr,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'quick'>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [matchedTeacher, setMatchedTeacher] = useState<AuthorizedUser | null>(null);
  const [unmatchedZaloData, setUnmatchedZaloData] = useState<string | null>(null);
  const [selectedTeacherToLink, setSelectedTeacherToLink] = useState<string>('');
  const [isLinking, setIsLinking] = useState<boolean>(false);
  const [linkSuccess, setLinkSuccess] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Normalize phone number for matching: remove spaces, dots, country code +84 / 84 -> 0
  const normalizePhone = (p?: string): string => {
    if (!p) return '';
    let cleaned = p.replace(/\D/g, '');
    if (cleaned.startsWith('84') && cleaned.length >= 11) {
      cleaned = '0' + cleaned.slice(2);
    }
    return cleaned;
  };

  // Extract potential phone or Zalo ID from QR text
  const parseZaloQrContent = (text: string) => {
    const raw = text.trim();
    let detectedPhone = '';
    let detectedHandle = '';

    // Check if zalo.me link: https://zalo.me/0981234567 or https://zalo.me/qr/p/...
    const zaloUrlMatch = raw.match(/zalo\.me\/([a-zA-Z0-9_.-]+)/i);
    if (zaloUrlMatch) {
      const part = zaloUrlMatch[1];
      if (/^\d+$/.test(part)) {
        detectedPhone = normalizePhone(part);
      } else {
        detectedHandle = part;
      }
    }

    // Direct phone number inside QR text
    const phoneMatch = raw.match(/(0\d{9,10}|84\d{9,10})/);
    if (phoneMatch && !detectedPhone) {
      detectedPhone = normalizePhone(phoneMatch[1]);
    }

    return { raw, detectedPhone, detectedHandle };
  };

  // Find teacher matching the scanned QR code
  const matchTeacherFromQr = useCallback(
    (qrContent: string): AuthorizedUser | null => {
      const { raw, detectedPhone, detectedHandle } = parseZaloQrContent(qrContent);

      return (
        authorizedUsers.find((u) => {
          if (!u.active) return false;

          // 1. Direct match with registered zaloQrData
          if (u.zaloQrData && (u.zaloQrData.trim() === raw || raw.includes(u.zaloQrData.trim()))) {
            return true;
          }

          // 2. Match phone number extracted from Zalo QR with teacher's phone
          const uPhone = normalizePhone(u.phone);
          if (detectedPhone && uPhone && (detectedPhone === uPhone || uPhone.endsWith(detectedPhone))) {
            return true;
          }

          // 3. Match Zalo ID / handle
          if (detectedHandle && u.zaloId && u.zaloId.toLowerCase() === detectedHandle.toLowerCase()) {
            return true;
          }

          // 4. Raw text contains email or phone
          if (raw.toLowerCase().includes(u.email.toLowerCase())) {
            return true;
          }

          return false;
        }) || null
      );
    },
    [authorizedUsers]
  );

  // Handle successful QR detection
  const handleQrDetected = useCallback(
    (qrText: string) => {
      setScannedResult(qrText);
      const teacher = matchTeacherFromQr(qrText);

      if (teacher) {
        setMatchedTeacher(teacher);
        setUnmatchedZaloData(null);
        // Play subtle success feedback and auto login after brief confirmation
        setTimeout(() => {
          onZaloLoginSuccess(teacher);
          onClose();
        }, 1200);
      } else {
        setMatchedTeacher(null);
        setUnmatchedZaloData(qrText);
      }
    },
    [matchTeacherFromQr, onZaloLoginSuccess, onClose]
  );

  // Stop camera stream safely
  const stopCamera = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  }, []);

  // Frame processing loop for QR scanner
  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        stopCamera();
        handleQrDetected(code.data);
        return;
      }
    }

    animationFrameId.current = requestAnimationFrame(scanFrame);
  }, [handleQrDetected, stopCamera]);

  // Start camera stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    setScannedResult(null);
    setMatchedTeacher(null);
    setUnmatchedZaloData(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Trình duyệt không hỗ trợ truy cập máy ảnh.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setIsScanning(true);
        animationFrameId.current = requestAnimationFrame(scanFrame);
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      let msg = 'Không thể mở máy ảnh. Vui lòng cấp quyền camera trong cài đặt trình duyệt.';
      if (err.name === 'NotAllowedError') {
        msg = 'Bạn chưa cấp quyền truy cập máy ảnh. Vui lòng nhấn Cho phép (Allow) để quét mã QR.';
      } else if (err.name === 'NotFoundError') {
        msg = 'Không tìm thấy thiết bị camera trên máy.';
      }
      setCameraError(msg);
      setIsScanning(false);
    }
  }, [facingMode, scanFrame, stopCamera]);

  // Handle uploaded image file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          handleQrDetected(code.data);
        } else {
          alert('Không tìm thấy mã QR trong hình ảnh đã chọn. Vui lòng thử lại với ảnh rõ nét hơn hoặc dùng camera.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    // Reset file input
    e.target.value = '';
  };

  // Switch camera front/back
  const handleSwitchCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Link unmatched QR to a teacher
  const handleLinkZaloQrToTeacher = async () => {
    if (!selectedTeacherToLink || !unmatchedZaloData || !onLinkZaloQr) return;
    setIsLinking(true);
    try {
      const { detectedHandle } = parseZaloQrContent(unmatchedZaloData);
      await onLinkZaloQr(selectedTeacherToLink, unmatchedZaloData, detectedHandle);
      const targetUser = authorizedUsers.find((u) => (u.id || u.email) === selectedTeacherToLink);
      if (targetUser) {
        setMatchedTeacher(targetUser);
        setLinkSuccess(true);
        setTimeout(() => {
          onZaloLoginSuccess(targetUser);
          onClose();
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      alert('Có lỗi khi liên kết mã Zalo. Vui lòng thử lại.');
    } finally {
      setIsLinking(false);
    }
  };

  // Lifecycle when modal opens/closes or tab changes
  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, startCamera, stopCamera]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-inner">
              <QrCode className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold tracking-wider uppercase bg-blue-500/50 px-2 py-0.5 rounded-full text-blue-100">
                  Zalo QR Login
                </span>
                <span className="text-[10px] text-blue-200">Bảo mật & Tiện lợi</span>
              </div>
              <h3 className="font-bold text-base sm:text-lg tracking-tight text-white flex items-center gap-1.5">
                Đăng Nhập Bằng Mã QR Zalo
              </h3>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs sm:text-sm font-semibold">
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-3 px-2 flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'camera'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Quét Camera</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-3 px-2 flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'upload'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Tải Ảnh Mã QR</span>
          </button>

          <button
            onClick={() => setActiveTab('quick')}
            className={`flex-1 py-3 px-2 flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'quick'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Chọn Giáo Viên</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* TAB 1: CAMERA SCANNER */}
          {activeTab === 'camera' && (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-square max-h-[320px] mx-auto flex items-center justify-center border-2 border-slate-800 shadow-inner">
                {/* Video Preview */}
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Scanning HUD Overlay */}
                {isScanning && !matchedTeacher && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    {/* Viewfinder frame */}
                    <div className="w-52 h-52 sm:w-60 sm:h-60 border-2 border-blue-400 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                      {/* Corner marks */}
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl-lg" />
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr-lg" />
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl-lg" />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br-lg" />

                      {/* Laser scanning line */}
                      <div className="absolute inset-x-2 top-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent rounded animate-bounce shadow-[0_0_8px_#38bdf8]" />
                    </div>
                    <p className="text-[11px] font-medium text-white/90 bg-slate-900/80 px-3 py-1 rounded-full mt-3 backdrop-blur-sm">
                      Hướng camera vào mã QR Zalo cá nhân của thầy/cô
                    </p>
                  </div>
                )}

                {/* Camera error message */}
                {cameraError && (
                  <div className="absolute inset-0 bg-slate-900/90 text-white p-6 flex flex-col items-center justify-center text-center space-y-3">
                    <AlertCircle className="w-10 h-10 text-amber-400" />
                    <p className="text-xs sm:text-sm text-slate-200">{cameraError}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={startCamera}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Thử lại</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('upload')}
                        className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold px-4 py-2 rounded-xl transition flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Tải ảnh QR</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Camera Controls */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>Cách lấy mã: Mở app Zalo &gt; Tab Cá nhân &gt; Biểu tượng mã QR</span>
                <button
                  onClick={handleSwitchCamera}
                  className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded-lg border border-slate-300 transition"
                  title="Đổi camera trước/sau"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Đổi Camera</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD IMAGE */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50 rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3 group"
              >
                <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center group-hover:scale-105 transition shadow-inner">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm sm:text-base">
                    Tải lên hình ảnh mã QR Zalo cá nhân
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Chụp màn hình mã QR trong app Zalo hoặc chọn ảnh mã QR đã lưu trong thư viện ảnh điện thoại
                  </p>
                </div>
                <span className="text-xs font-bold text-blue-700 bg-blue-100 px-3.5 py-1.5 rounded-xl border border-blue-200 shadow-2xs">
                  Chọn hình ảnh từ máy
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Mẹo mở mã QR Zalo cá nhân:</strong> Trên ứng dụng Zalo điện thoại, vào mục <em>Cá nhân</em> &gt; Nhấn vào hình đại diện hoặc biểu tượng <strong>Mã QR của tôi</strong> &gt; Chọn <em>Lưu mã QR vào máy</em> rồi tải lên đây.
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: QUICK TEACHER SELECTOR (DIRECT LOGIN FOR DEMO & TESTING) */}
          {activeTab === 'quick' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-600">
                Thầy/cô có thể chọn nhanh tài khoản giáo viên trực phòng đã cấp quyền dưới đây để đăng nhập ngay:
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl max-h-60 overflow-y-auto">
                {authorizedUsers.map((user) => (
                  <div
                    key={user.id || user.email}
                    onClick={() => {
                      onZaloLoginSuccess(user);
                      onClose();
                    }}
                    className="p-3 hover:bg-blue-50/70 transition cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shadow-2xs">
                        {user.name ? user.name[0] : 'G'}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm group-hover:text-blue-700 flex items-center gap-1.5">
                          <span>{user.name}</span>
                          {user.role === 'admin' && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-semibold">
                              BGH
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          {user.phone ? `Zalo: ${user.phone}` : user.email}
                          {user.assignedRooms?.length > 0 && (
                            <span className="text-slate-400 ml-1">
                              • Phụ trách: {user.assignedRooms.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button className="text-xs font-bold text-blue-700 bg-blue-100 group-hover:bg-blue-600 group-hover:text-white px-3 py-1.5 rounded-lg transition">
                      Vào làm việc
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SUCCESS BANNER: MATCHED TEACHER */}
          {matchedTeacher && (
            <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-4 text-emerald-950 flex items-start gap-3 animate-fade-in shadow-sm">
              <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                    Nhận diện thành công
                  </span>
                  <span className="text-xs text-emerald-700">Đang đăng nhập...</span>
                </div>
                <h4 className="font-extrabold text-base text-emerald-900 mt-1">
                  Thầy/Cô: {matchedTeacher.name}
                </h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Phân công trực phòng: <strong>{matchedTeacher.assignedRooms?.join(', ') || 'Tất cả các phòng'}</strong>
                </p>
                <div className="mt-2 text-[11px] text-emerald-700 font-medium">
                  Hệ thống tự động chuyển vào giao diện điểm danh và nộp báo cáo...
                </div>
              </div>
            </div>
          )}

          {/* UNMATCHED QR CODE BANNER: ALLOW LINKING TO AN ACCOUNT */}
          {unmatchedZaloData && !matchedTeacher && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 text-amber-950 space-y-3 animate-fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-amber-900">
                    Đã quét được mã Zalo nhưng chưa liên kết tài khoản
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5 break-all">
                    Nội dung mã: <code className="bg-amber-100/80 px-1 py-0.5 rounded">{unmatchedZaloData}</code>
                  </p>
                </div>
              </div>

              {onLinkZaloQr && (
                <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Liên kết mã QR Zalo này với giáo viên trực:
                  </label>
                  <select
                    value={selectedTeacherToLink}
                    onChange={(e) => setSelectedTeacherToLink(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Chọn tên thầy/cô để liên kết --</option>
                    {authorizedUsers.map((u) => (
                      <option key={u.id || u.email} value={u.id || u.email}>
                        {u.name} ({u.phone || u.email}) - {u.assignedRooms?.join(', ')}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleLinkZaloQrToTeacher}
                    disabled={!selectedTeacherToLink || isLinking}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow"
                  >
                    {isLinking ? (
                      <span>Đang liên kết...</span>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Xác nhận liên kết & Đăng nhập ngay</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-3.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Chỉ giáo viên được Ban Giám Hiệu cấp quyền mới có thể truy cập</span>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
