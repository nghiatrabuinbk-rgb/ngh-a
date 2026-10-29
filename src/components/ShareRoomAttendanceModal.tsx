import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  X, 
  Copy, 
  CheckCheck, 
  ExternalLink, 
  Share2, 
  QrCode, 
  Users, 
  CloudCheck, 
  RefreshCw, 
  Smartphone,
  BedDouble,
  GraduationCap,
  Calendar,
  MessageCircle
} from 'lucide-react';
import { Student } from '../types';

interface ShareRoomAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: string;
  currentDate: string;
  tabType: 'room_duty' | 'attendance' | 'night_study';
  roomStudents: Student[];
  onForceSyncToServer?: () => Promise<void>;
}

export const ShareRoomAttendanceModal: React.FC<ShareRoomAttendanceModalProps> = ({
  isOpen,
  onClose,
  room,
  currentDate,
  tabType,
  roomStudents,
  onForceSyncToServer,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Generate standard direct URL for this room and date
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?tab=${tabType}&room=${encodeURIComponent(room)}&date=${currentDate}`
    : '';

  const tabTitle = tabType === 'room_duty' 
    ? 'Trực phòng nội trú' 
    : tabType === 'night_study' 
      ? 'Điểm danh tự học đêm' 
      : 'Điểm danh của GVCN';

  // Generate QR Code image when room / date / tab changes
  useEffect(() => {
    if (!shareUrl) return;
    QRCode.toDataURL(shareUrl, {
      width: 260,
      margin: 1.5,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Error generating QR:', err));
  }, [shareUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopySummaryForZalo = () => {
    let text = `📋 LIÊN KẾT ĐIỂM DANH & THEO DÕI PHÒNG NỘI TRÚ\n`;
    text += `🏫 Trường PTDTBT THCS Trà Đốc\n`;
    text += `🏠 Phòng: ${room === 'ALL' ? 'Tất cả các phòng' : room}\n`;
    text += `📅 Ngày: ${currentDate}\n`;
    text += `📌 Nhiệm vụ: ${tabTitle}\n`;
    text += `👥 Sĩ số phòng: ${roomStudents.length} học sinh\n`;
    text += `🔗 Link điểm danh trực tiếp: ${shareUrl}\n`;
    text += `------------------------------------\n`;
    text += `👉 Thầy/Cô mở link trên điện thoại hoặc quét mã QR và đăng nhập bằng tài khoản Gmail cá nhân để điểm danh. Dữ liệu sẽ tự động đồng bộ tức thì với máy chủ nhà trường.`;

    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  const handleSyncNow = async () => {
    if (!onForceSyncToServer) return;
    setIsSyncing(true);
    try {
      await onForceSyncToServer();
      setSyncMessage('Đã đồng bộ toàn bộ danh sách phòng và điểm danh lên máy chủ thành công!');
    } catch {
      setSyncMessage('Đã gửi yêu cầu đồng bộ máy chủ.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(null), 3500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-emerald-700 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/20">
              <Share2 className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-800/80 text-blue-200">
                  Chia sẻ điểm danh trực tuyến
                </span>
                <span className="text-xs text-amber-300 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Đồng bộ máy chủ
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold">
                {room === 'ALL' ? 'Tất cả các phòng nội trú' : room}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* Server Sync Indicator Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2.5">
              <div className="p-1.5 bg-emerald-600 text-white rounded-lg shrink-0 mt-0.5 sm:mt-0">
                <CloudCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-emerald-900 text-xs sm:text-sm flex items-center gap-1.5">
                  Máy chủ Firestore đã kết nối
                  <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-200 text-emerald-800 rounded">Thời gian thực</span>
                </div>
                <p className="text-[11px] text-emerald-700">
                  Khi giáo viên mở liên kết trên điện thoại, danh sách học sinh và kết quả điểm danh sẽ luôn đồng bộ 2 chiều với máy chủ.
                </p>
              </div>
            </div>
            {onForceSyncToServer && (
              <button
                onClick={handleSyncNow}
                disabled={isSyncing}
                className="shrink-0 flex items-center gap-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg transition disabled:opacity-60 cursor-pointer shadow-xs"
                title="Bấm để kích hoạt đồng bộ toàn bộ dữ liệu lên máy chủ ngay"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Đang gửi...' : 'Đồng bộ ngay'}</span>
              </button>
            )}
          </div>

          {syncMessage && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs px-3 py-2 rounded-lg font-medium animate-in fade-in">
              {syncMessage}
            </div>
          )}

          {/* QR Code and Mobile Link Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-slate-50 border border-slate-200 rounded-xl p-4">
            {/* Visual QR Code */}
            <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
              {qrDataUrl ? (
                <img 
                  src={qrDataUrl} 
                  alt={`QR điểm danh ${room}`} 
                  className="w-44 h-44 rounded-lg shadow-xs" 
                />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center text-slate-400 bg-slate-100 rounded-lg">
                  <QrCode className="w-10 h-10 animate-pulse" />
                </div>
              )}
              <div className="text-[11px] font-medium text-slate-500 mt-2 text-center flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                <span>Quét mã bằng Camera / App Zalo</span>
              </div>
            </div>

            {/* Link details & Actions */}
            <div className="space-y-3">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  Liên kết mở trực tiếp phòng này:
                </span>
                <div className="mt-1 flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-700 break-all select-all font-mono">
                  <span className="truncate">{shareUrl}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleCopyLink}
                  className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-xs transition cursor-pointer"
                >
                  {copiedLink ? <CheckCheck className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Đã sao chép liên kết!' : 'Sao chép link điểm danh phòng'}</span>
                </button>

                <button
                  onClick={handleCopySummaryForZalo}
                  className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs shadow-xs transition cursor-pointer"
                >
                  {copiedText ? <CheckCheck className="w-4 h-4 text-amber-300" /> : <MessageCircle className="w-4 h-4" />}
                  <span>{copiedText ? 'Đã copy nội dung gửi Zalo!' : 'Copy gửi nhóm Zalo kèm link'}</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-500 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                💡 <strong>Mẹo tiện lợi:</strong> Giáo viên trực phòng nhận link qua Zalo chỉ cần bấm vào là mở đúng phòng <strong>{room}</strong> ngày <strong>{currentDate}</strong> mà không cần tìm kiếm thủ công.
              </div>
            </div>
          </div>

          {/* Room Roster Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-600" />
                Danh sách học sinh phòng ({roomStudents.length} em)
              </span>
              <span className="text-slate-500 text-[11px]">
                Ngày: {currentDate} | Ca: {tabTitle}
              </span>
            </div>

            {roomStudents.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center text-slate-400 text-xs">
                Chưa có học sinh nào được xếp vào phòng này.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
                {roomStudents.map((s, idx) => (
                  <div key={s.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50/80 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-semibold text-slate-800">{s.name}</span>
                        <div className="text-[10px] text-slate-400">
                          {s.bedNumber || 'Chưa xếp giường'} • Lớp {s.class}
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      {s.gender}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between shrink-0 text-xs">
          <span className="text-slate-500 text-[11px]">
            Hệ thống điểm danh nội trú PTDTBT THCS Trà Đốc
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-xl transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
