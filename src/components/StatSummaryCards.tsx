import React from 'react';
import { 
  Users, 
  CheckCircle2, 
  UtensilsCrossed, 
  MapPinOff, 
  FileText, 
  AlertTriangle,
  BedDouble
} from 'lucide-react';
import { AggregatedStats, AttendanceStatus } from '../types';

interface StatSummaryCardsProps {
  stats: AggregatedStats;
  selectedFilter: AttendanceStatus | 'all' | 'stay_weekend';
  onSelectFilter: (filter: AttendanceStatus | 'all' | 'stay_weekend') => void;
}

export const StatSummaryCards: React.FC<StatSummaryCardsProps> = ({
  stats,
  selectedFilter,
  onSelectFilter,
}) => {
  const cards = [
    {
      id: 'all' as const,
      label: 'Tổng sĩ số',
      count: stats.total,
      subtext: 'Toàn bộ học sinh nội trú',
      color: 'slate',
      bg: 'bg-white',
      border: 'border-slate-200',
      activeBorder: 'ring-2 ring-slate-800 border-slate-800',
      textColor: 'text-slate-900',
      badgeBg: 'bg-slate-100 text-slate-700',
      icon: Users,
    },
    {
      id: 'present' as const,
      label: 'Có mặt đầy đủ',
      count: stats.present,
      subtext: 'Ăn ở & Đi học trên lớp',
      color: 'emerald',
      bg: 'bg-emerald-50/70',
      border: 'border-emerald-200',
      activeBorder: 'ring-2 ring-emerald-600 border-emerald-600',
      textColor: 'text-emerald-700',
      badgeBg: 'bg-emerald-100 text-emerald-800',
      icon: CheckCircle2,
    },
    {
      id: 'ate_no_class' as const,
      label: 'Lên ăn không đi học',
      count: stats.ateNoClass,
      subtext: 'Ăn bếp nhưng bỏ tiết học',
      color: 'amber',
      bg: 'bg-amber-50/90',
      border: 'border-amber-300',
      activeBorder: 'ring-2 ring-amber-600 border-amber-600',
      textColor: 'text-amber-800',
      badgeBg: 'bg-amber-200 text-amber-900 font-bold',
      icon: UtensilsCrossed,
      alert: stats.ateNoClass > 0,
    },
    {
      id: 'not_at_school_this_week' as const,
      label: 'Chưa lên trường trong tuần',
      count: stats.notAtSchoolThisWeek,
      subtext: 'Còn ở thôn / nóc vùng cao',
      color: 'purple',
      bg: 'bg-purple-50/70',
      border: 'border-purple-200',
      activeBorder: 'ring-2 ring-purple-600 border-purple-600',
      textColor: 'text-purple-700',
      badgeBg: 'bg-purple-100 text-purple-800',
      icon: MapPinOff,
      alert: stats.notAtSchoolThisWeek > 0,
    },
    {
      id: 'leave_excused' as const,
      label: 'Nghỉ có phép',
      count: stats.leaveExcused,
      subtext: 'Ốm, việc gia đình có đơn',
      color: 'blue',
      bg: 'bg-blue-50/70',
      border: 'border-blue-200',
      activeBorder: 'ring-2 ring-blue-600 border-blue-600',
      textColor: 'text-blue-700',
      badgeBg: 'bg-blue-100 text-blue-800',
      icon: FileText,
    },
    {
      id: 'leave_unexcused' as const,
      label: 'Nghỉ không phép',
      count: stats.leaveUnexcused,
      subtext: 'Tự ý bỏ học, trốn ra ngoài',
      color: 'rose',
      bg: 'bg-rose-50/80',
      border: 'border-rose-200',
      activeBorder: 'ring-2 ring-rose-600 border-rose-600',
      textColor: 'text-rose-700',
      badgeBg: 'bg-rose-100 text-rose-800 font-bold',
      icon: AlertTriangle,
      alert: stats.leaveUnexcused > 0,
    },
    {
      id: 'stay_weekend' as const,
      label: 'Ở lại cuối tuần',
      count: stats.stayWeekend,
      subtext: 'Nội trú tại trường T7-CN',
      color: 'teal',
      bg: 'bg-teal-50/90',
      border: 'border-teal-300',
      activeBorder: 'ring-2 ring-teal-600 border-teal-600',
      textColor: 'text-teal-800',
      badgeBg: 'bg-teal-200 text-teal-900 font-bold',
      icon: BedDouble,
      alert: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
      {cards.map((c) => {
        const Icon = c.icon;
        const isSelected = selectedFilter === c.id;
        return (
          <button
            key={c.id}
            onClick={() => onSelectFilter(c.id)}
            className={`text-left p-3.5 rounded-xl border transition-all relative overflow-hidden shadow-sm hover:shadow-md cursor-pointer ${
              c.bg
            } ${c.border} ${isSelected ? `${c.activeBorder} shadow-md` : 'hover:border-slate-300'}`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-600 line-clamp-1">{c.label}</span>
              <Icon className={`w-4 h-4 ${c.textColor}`} />
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-bold tracking-tight ${c.textColor}`}>
                {c.count}
              </span>
              <span className="text-[11px] text-slate-500">em</span>
              {stats.total > 0 && c.id !== 'all' && (
                <span className="text-[10px] text-slate-400 ml-auto font-medium">
                  {Math.round((c.count / stats.total) * 100)}%
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
              {c.subtext}
            </p>

            {isSelected && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-current opacity-80" />
            )}
          </button>
        );
      })}
    </div>
  );
};
