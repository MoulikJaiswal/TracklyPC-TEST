import React, { useState, useMemo, memo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Zap, 
  Atom, 
  Calculator, 
  ChevronDown, 
  Plus, 
  Timer as TimerIcon, 
  Clock, 
  Minus,
  Maximize2,
  Minimize2,
  Lock,
  BookOpen,
  PenTool,
  Calendar,
  Flame,
  Target,
  PieChart,
  Activity,
  Layers,
  ChevronUp,
  Check,
  Square,
  TrendingDown,
  Scale,
  Settings2,
  Coffee,
  Brain,
  Armchair,
  X,
  Dna
} from 'lucide-react';
import { MISTAKE_TYPES } from '../constants';
import { Target as TargetType, QuestionLog, Session, SyllabusData } from '../types';
import { logAnalyticsEvent } from '../firebase';
import { ConfirmationModal } from './ConfirmationModal';

// --- Types & Interfaces ---

interface FocusTimerProps {
  targets?: TargetType[];
  sessions: Session[];
  mode: 'focus' | 'short' | 'long';
  timeLeft: number;
  timerState: 'idle' | 'running' | 'paused'; 
  durations: { focus: number; short: number; long: number };
  sessionLogs: QuestionLog[];
  lastLogTime: number;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onSwitchMode: (mode: 'focus' | 'short' | 'long') => void;
  onUpdateDurations: (newDuration: number, mode: 'focus' | 'short' | 'long') => void;
  onAddLog: (log: QuestionLog, subject: string) => void;
  onCompleteSession: () => void;
  sessionCount: number;
  userName: string;
  syllabus: SyllabusData;
}

type TimeRange = 'weekly' | 'monthly' | 'yearly';

// --- Helper Functions ---

const getStartOfRange = (range: TimeRange): Date => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of day normalization
    
    if (range === 'weekly') {
        const d = new Date(now);
        const day = d.getDay(); // 0 is Sunday
        const diff = d.getDate() - day; // Start on Sunday
        return new Date(d.setDate(diff));
    }
    if (range === 'monthly') return new Date(now.getFullYear(), now.getMonth(), 1);
    return new Date(now.getFullYear(), 0, 1);
};

const filterSessions = (sessions: Session[], range: TimeRange) => {
    const start = getStartOfRange(range).getTime();
    const end = range === 'weekly' 
        ? start + 7 * 24 * 60 * 60 * 1000 // End of week
        : range === 'monthly' 
            ? new Date(new Date(start).setMonth(new Date(start).getMonth() + 1)).getTime() // End of month
            : new Date(new Date(start).setFullYear(new Date(start).getFullYear() + 1)).getTime(); // End of year
            
    return sessions.filter(s => s.timestamp >= start && s.timestamp < end);
};

const formatDuration = (totalMinutes: number) => {
    if (isNaN(totalMinutes)) return "0h 0m";
    const roundedMinutes = Math.round(totalMinutes);
    const h = Math.floor(roundedMinutes / 60);
    const m = roundedMinutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const formatDigitalTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// --- SUB-COMPONENTS ---

const StatCard = ({ 
    label, 
    value, 
    subtext, 
    icon: Icon, 
    colorClass = "text-white", 
    bgClass = "bg-slate-800" 
}: { 
    label: string, 
    value: string | number, 
    subtext?: string, 
    icon: any, 
    colorClass?: string, 
    bgClass?: string 
}) => (
    <div className={`p-5 rounded-3xl border border-white/5 flex flex-col justify-between h-full ${bgClass}`}>
        <div className="flex justify-between items-start mb-2">
            <div className={`p-2.5 rounded-2xl bg-white/10 ${colorClass}`}>
                <Icon size={20} />
            </div>
            {subtext && <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">{subtext}</span>}
        </div>
        <div>
            <div className="text-3xl font-display font-bold tracking-tight mb-1">{value}</div>
            <div className="text-xs font-bold uppercase tracking-widest opacity-50">{label}</div>
        </div>
    </div>
);

const DonutChart = ({ data }: { data: { label: string, value: number, color: string }[] }) => {
    const total = data.reduce((a, b) => a + b.value, 0);
    let cumulative = 0;

    if (total === 0) {
        return (
            <div className="relative w-32 h-32 flex items-center justify-center">
                <div className="w-full h-full rounded-full border-4 border-slate-800 opacity-20" />
                <span className="absolute text-[10px] uppercase font-bold text-slate-600">No Data</span>
            </div>
        );
    }

    return (
        <div className="relative w-32 h-32">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {data.map((item, i) => {
                    const percent = item.value / total;
                    const dashArray = percent * 314; 
                    const offset = cumulative * 314;
                    cumulative += percent;
                    
                    return (
                        <circle
                            key={i}
                            cx="50" cy="50" r="40"
                            fill="transparent"
                            stroke={item.color}
                            strokeWidth="12"
                            strokeDasharray={`${dashArray} 314`}
                            strokeDashoffset={-offset}
                            className="transition-all duration-1000 ease-out"
                        />
                    );
                })}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-xs font-bold">{formatDuration(total)}</span>
                <span className="text-[8px] uppercase tracking-widest opacity-60">Total</span>
            </div>
        </div>
    );
};

const Heatmap = ({ sessions, range }: { sessions: Session[], range: TimeRange }) => {
    const [hoveredData, setHoveredData] = useState<{
        date: Date;
        stats: { level: number; count: number; duration: number };
        pos: { x: number; y: number };
    } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const generateDays = () => {
        const today = new Date();
        const days = [];

        if (range === 'weekly') {
            const day = today.getDay(); // 0 is Sunday
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - day); // Start on Sunday
            
            for (let i = 0; i < 7; i++) {
                const d = new Date(startOfWeek);
                d.setDate(startOfWeek.getDate() + i);
                days.push(d);
            }
        } else if (range === 'monthly') {
            const year = today.getFullYear();
            const month = today.getMonth();
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            
            // Pad start to align with week (Sunday start)
            const startPadding = firstDay.getDay(); 
            for (let i = startPadding; i > 0; i--) {
                const d = new Date(firstDay);
                d.setDate(d.getDate() - i);
                days.push(d);
            }
            
            // Current month days
            for (let i = 1; i <= lastDay.getDate(); i++) {
                days.push(new Date(year, month, i));
            }
            
            // Pad end to complete the grid (optional, but looks better)
            const totalSlots = Math.ceil(days.length / 7) * 7;
            const currentLen = days.length;
            for (let i = 1; i <= totalSlots - currentLen; i++) {
                const d = new Date(lastDay);
                d.setDate(d.getDate() + i);
                days.push(d);
            }
        } else {
            // Yearly (Jan 1 to Dec 31)
            const year = today.getFullYear();
            const d = new Date(year, 0, 1); // Jan 1
            const end = new Date(year, 11, 31); // Dec 31

            while (d <= end) {
                days.push(new Date(d));
                d.setDate(d.getDate() + 1);
            }
        }
        return days;
    };

    const days = useMemo(() => generateDays(), [range]);

    const getDayStats = (date: Date) => {
        const dateStr = date.toDateString();
        const daysSessions = sessions.filter(s => new Date(s.timestamp).toDateString() === dateStr);
        const duration = daysSessions.reduce((acc, s) => acc + (s.duration || 0), 0) / 60; // in minutes
        
        let level = 0;
        if (duration > 0) level = 1;
        if (duration >= 30) level = 2;
        if (duration >= 60) level = 3;
        if (duration >= 120) level = 4;

        return { level, duration, count: daysSessions.length };
    };

    const getTileStyle = (level: number, isCurrentMonth: boolean) => {
        const baseOpacity = isCurrentMonth ? 'opacity-100' : 'opacity-30 grayscale';
        
        switch(level) {
            case 0: return `bg-slate-800/40 border-slate-800 ${baseOpacity}`;
            case 1: return `bg-emerald-900/60 border-emerald-800/50 ${baseOpacity}`;
            case 2: return `bg-emerald-700/80 border-emerald-600/50 ${baseOpacity}`;
            case 3: return `bg-emerald-500 border-emerald-400/50 shadow-[0_0_12px_rgba(16,185,129,0.4)] ${baseOpacity}`;
            case 4: return `bg-emerald-400 border-emerald-300/50 shadow-[0_0_20px_rgba(52,211,153,0.6)] ${baseOpacity}`;
            default: return `bg-slate-800/40 border-slate-800 ${baseOpacity}`;
        }
    };

    // Responsive grid classes based on range
    const getGridClass = () => {
        if (range === 'weekly') return 'grid grid-cols-7 h-20 gap-3 w-full';
        if (range === 'monthly') return 'grid grid-cols-7 gap-2 w-full';
        return 'flex flex-wrap gap-1 justify-start w-full'; // Dense flex layout for year
    };

    return (
        <div className="relative" ref={containerRef} onMouseLeave={() => setHoveredData(null)}>
            {/* Weekday Labels for Monthly View */}
            {range === 'monthly' && (
                <div className="grid grid-cols-7 gap-2 mb-2">
                    {['S','M','T','W','T','F','S'].map((d, i) => (
                        <div key={i} className="text-center text-[10px] font-bold text-slate-500 uppercase">{d}</div>
                    ))}
                </div>
            )}

            <div className={`transition-opacity ${getGridClass()}`}>
                {days.map((d, i) => {
                    const stats = getDayStats(d);
                    const isToday = d.toDateString() === new Date().toDateString();
                    // Check if day belongs to current month (for Monthly view opacity)
                    const isCurrentMonth = range !== 'monthly' || d.getMonth() === new Date().getMonth();
                    
                    const tileColorClass = getTileStyle(stats.level, isCurrentMonth);
                    
                    // Text Color: Darker for bright tiles, lighter for dark tiles
                    const textColor = stats.level >= 3 ? 'text-slate-900/90' : 'text-white/50';

                    return (
                        <div 
                            key={i} 
                            onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const parent = containerRef.current?.getBoundingClientRect();
                                if(parent) {
                                    setHoveredData({
                                        date: d,
                                        stats,
                                        pos: { 
                                            x: rect.left - parent.left + rect.width/2,
                                            y: rect.top - parent.top
                                        }
                                    })
                                }
                            }}
                            className={`
                                relative rounded-md border flex items-center justify-center transition-all duration-300 cursor-pointer
                                ${tileColorClass}
                                ${isToday ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 z-10 scale-105' : 'hover:scale-110 hover:z-20 hover:border-white/30'}
                                ${range === 'weekly' ? 'h-full flex-col rounded-xl' : range === 'monthly' ? 'aspect-square rounded-xl' : 'w-3 h-3 md:w-3.5 md:h-3.5 rounded-sm'}
                            `}
                        >
                            {range === 'weekly' && (
                                <>
                                    <span className={`text-[10px] font-bold uppercase ${textColor} opacity-60 mb-1`}>
                                        {d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}
                                    </span>
                                    {stats.duration > 0 && (
                                        <span className={`text-xs font-mono font-bold ${textColor}`}>
                                            {Math.round(stats.duration)}m
                                        </span>
                                    )}
                                </>
                            )}
                            {range === 'monthly' && (
                                <span className={`text-[10px] font-bold ${textColor} ${isToday ? 'text-white' : ''}`}>
                                    {d.getDate()}
                                </span>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Custom Tooltip */}
            <AnimatePresence>
                {hoveredData && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: -12, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 pointer-events-none"
                        style={{ 
                            left: hoveredData.pos.x, 
                            top: hoveredData.pos.y,
                            transform: 'translateX(-50%)' 
                        }}
                    >
                        <div className="bg-slate-800/95 text-white p-3 rounded-xl shadow-2xl border border-white/10 whitespace-nowrap flex flex-col items-center -translate-x-1/2 -translate-y-full mb-2 backdrop-blur-md">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                                {hoveredData.date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                            </span>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-xl font-mono font-bold text-emerald-400 leading-none">
                                    {formatDuration(hoveredData.stats.duration)}
                                </span>
                            </div>
                            <span className="text-[9px] font-medium text-slate-500 mt-1 uppercase tracking-wide">
                                {hoveredData.stats.count} {hoveredData.stats.count === 1 ? 'Session' : 'Sessions'}
                            </span>
                            
                            {/* Arrow */}
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2.5 h-2.5 bg-slate-800 border-r border-b border-white/10" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// --- SETTINGS MODAL ---
const TimerSettingsModal = ({ 
    isOpen, 
    onClose, 
    durations, 
    onUpdate 
}: { 
    isOpen: boolean;
    onClose: () => void;
    durations: { focus: number; short: number; long: number };
    onUpdate: (val: number, mode: 'focus' | 'short' | 'long') => void;
}) => {
    if (!isOpen) return null;

    const formatTimeDisplay = (mins: number) => {
        if (mins < 60) return null;
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    };

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-white/10 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Settings2 size={18} /> Timer Settings
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>
                
                <div className="space-y-6">
                    {(['focus', 'short', 'long'] as const).map(mode => (
                        <div key={mode} className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                    {mode === 'focus' && <Brain size={14} className="text-indigo-500" />}
                                    {mode === 'short' && <Coffee size={14} className="text-emerald-500" />}
                                    {mode === 'long' && <Armchair size={14} className="text-blue-500" />}
                                    {mode === 'focus' ? 'Focus Duration' : mode === 'short' ? 'Short Break' : 'Long Break'}
                                </label>
                                <div className="flex items-center gap-2">
                                    {durations[mode] >= 60 && (
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md hidden sm:block">
                                            {formatTimeDisplay(durations[mode])}
                                        </span>
                                    )}
                                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/10 px-2 py-1 rounded-lg border border-slate-200 dark:border-white/5 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
                                        <input
                                            type="number"
                                            min="1"
                                            max="1440"
                                            value={durations[mode]}
                                            onChange={(e) => {
                                                let val = parseInt(e.target.value);
                                                if (isNaN(val)) val = 0; // Allow typing
                                                if (val > 1440) val = 1440; // Max 24 hours
                                                onUpdate(val, mode);
                                            }}
                                            className="w-12 bg-transparent text-right font-mono font-bold text-slate-900 dark:text-white outline-none p-0 text-sm appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">min</span>
                                    </div>
                                </div>
                            </div>
                            <input 
                                type="range" 
                                min="1" 
                                max={mode === 'focus' ? 180 : 60} 
                                value={durations[mode]} 
                                // FIX: Add a NaN check to the parseInt call to ensure a valid number is passed to onUpdate.
                                onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    if (!isNaN(val)) {
                                        onUpdate(val, mode);
                                    }
                                }}
                                className={`w-full h-2 rounded-full appearance-none cursor-pointer ${
                                    mode === 'focus' ? 'bg-indigo-100 dark:bg-indigo-500/20 accent-indigo-500' :
                                    mode === 'short' ? 'bg-emerald-100 dark:bg-emerald-500/20 accent-emerald-500' :
                                    'bg-blue-100 dark:bg-blue-500/20 accent-blue-500'
                                }`}
                            />
                        </div>
                    ))}
                </div>

                <div className="mt-8">
                    <button 
                        onClick={onClose}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// --- MAIN COMPONENT ---

export const FocusTimer: React.FC<FocusTimerProps> = memo((props) => {
  const { 
    timerState, 
    sessions, 
    onToggleTimer, 
    mode, 
    timeLeft, 
    durations,
    onResetTimer,
    onCompleteSession,
    lastLogTime,
    onSwitchMode,
    onUpdateDurations,
    userName,
    syllabus
  } = props;

  const subjectKeys = useMemo(() => Object.keys(syllabus), [syllabus]);
  
  const [timeRange, setTimeRange] = useState<TimeRange>('weekly');
  const [selectedSubject, setSelectedSubject] = useState<string>(subjectKeys[0] || '');
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [customTimeInput, setCustomTimeInput] = useState(durations.focus.toString());
  const [showSettings, setShowSettings] = useState(false);
  
  const isActive = timerState === 'running';
  const isSessionInProgress = timerState !== 'idle';

  useEffect(() => {
      // Ensure selected subject is valid
      if (!subjectKeys.includes(selectedSubject) && subjectKeys.length > 0) {
          setSelectedSubject(subjectKeys[0]);
      }
  }, [subjectKeys, selectedSubject]);

  // Clock state for the header
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
      const timer = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => clearInterval(timer);
  }, []);

  // --- ANALYTICS LOGIC ---
  const analyticsData = useMemo(() => {
      const filtered = filterSessions(sessions, timeRange);
      const totalMinutes = filtered.reduce((acc, s) => acc + (s.duration ? s.duration / 60 : 0), 0); 
      const sessionCount = filtered.length;
      
      const subjectDist: Record<string, number> = {};
      subjectKeys.forEach(key => subjectDist[key] = 0);
      
      filtered.forEach(s => {
          if (subjectDist[s.subject] !== undefined) {
              subjectDist[s.subject] += (s.duration ? s.duration / 60 : 0);
          }
      });
      
      const reviews = filtered.reduce((acc, s) => acc + (s.attempted || 0), 0);
      
      // Calculate Subject Balance Insight
      let balanceMessage = "No data recorded for this period yet.";
      let balanceAction = "Start a session to see insights.";
      
      if (totalMinutes > 0 && subjectKeys.length >= 2) {
          const sorted = Object.entries(subjectDist).sort(([,a], [,b]) => b - a);
          const maxSub = sorted[0][0];
          const maxPct = Math.round((sorted[0][1] / totalMinutes) * 100);
          
          if (maxPct > 60) {
              balanceMessage = `Heavy focus on ${maxSub} (${maxPct}%).`;
              balanceAction = "Try rotating subjects to avoid burnout.";
          } else {
              balanceMessage = "Great balance across subjects!";
              balanceAction = "Keep maintaining this variety.";
          }
      }

      // Streak & Consistency Calculation
      const dailyDurations: Record<string, number> = {};
      sessions.forEach(s => {
          const d = new Date(s.timestamp);
          d.setHours(0,0,0,0);
          const dateKey = d.getTime().toString();
          dailyDurations[dateKey] = (dailyDurations[dateKey] || 0) + (s.duration || 0); // duration is in seconds
      });

      const validDates = Object.entries(dailyDurations)
          .filter(([_, seconds]) => seconds >= 3600)
          .map(([ts]) => parseInt(ts))
          .sort((a, b) => b - a); // Descending order

      let currentStreak = 0;
      if (validDates.length > 0) {
          const today = new Date();
          today.setHours(0,0,0,0);
          const todayTime = today.getTime();
          const yesterdayTime = todayTime - 86400000;
          
          if (validDates[0] === todayTime || validDates[0] === yesterdayTime) {
              currentStreak = 1;
              for (let i = 0; i < validDates.length - 1; i++) {
                  const diff = validDates[i] - validDates[i+1];
                  if (diff >= 86400000 - 3600000 && diff <= 86400000 + 3600000) { 
                      currentStreak++;
                  } else {
                      break;
                  }
              }
          }
      }

      let consistency = 0;
      const startOfRange = getStartOfRange(timeRange).getTime();
      let endOfRange = 0;
      let totalDays = 1;

      if (timeRange === 'weekly') {
          totalDays = 7;
          endOfRange = startOfRange + 7 * 86400000;
      } else if (timeRange === 'monthly') {
          const d = new Date(startOfRange);
          const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
          endOfRange = nextMonth.getTime();
          totalDays = Math.round((endOfRange - startOfRange) / 86400000);
      } else {
          const d = new Date(startOfRange);
          const nextYear = new Date(d.getFullYear() + 1, 0, 1);
          endOfRange = nextYear.getTime();
          totalDays = Math.round((endOfRange - startOfRange) / 86400000);
      }

      const validDaysInRange = validDates.filter(t => t >= startOfRange && t < endOfRange).length;
      consistency = Math.round((validDaysInRange / totalDays) * 100);

      return {
          totalMinutes,
          sessionCount,
          subjectDist,
          balanceMessage,
          balanceAction,
          currentStreak,
          consistency
      };
  }, [sessions, timeRange, subjectKeys, syllabus]);
  
  const subjectColorMap: Record<string, string> = useMemo(() => {
    const colors: Record<string, string> = {
        Physics: '#3b82f6',   // blue
        Chemistry: '#f97316', // orange
        Maths: '#f43f5e',     // rose
        Biology: '#10b981'    // emerald
    };
    return subjectKeys.reduce((acc, key) => {
        acc[key] = colors[key] || '#64748b'; // default slate
        return acc;
    }, {} as Record<string, string>);
  }, [subjectKeys]);

  const donutData = useMemo(() => {
    return Object.entries(analyticsData.subjectDist).map(([subj, val]) => ({
        label: subj,
        value: val,
        color: subjectColorMap[subj] || '#64748b'
    }));
  }, [analyticsData.subjectDist, subjectColorMap]);

  // --- HANDLERS ---
  const adjustDuration = (deltaMinutes: number) => {
      const current = durations[mode];
      const next = Math.max(1, Math.min(1440, current + deltaMinutes)); // Cap at 24h
      onUpdateDurations(next, mode);
  };

  const handleTimeBlur = () => {
      setIsEditingTime(false);
      let val = parseInt(customTimeInput);
      if (isNaN(val) || val < 1) val = 25;
      if (val > 1440) val = 1440; // Cap at 24 hours
      onUpdateDurations(val, mode);
      setCustomTimeInput(val.toString());
  };

  const handleStopClick = () => {
      setShowStopConfirm(true);
  };

  const handleConfirmStop = () => {
      onCompleteSession();
      setShowStopConfirm(false);
  };

  const getQuickDurations = () => {
      if (mode === 'short') return [5, 10, 15];
      if (mode === 'long') return [15, 20, 30];
      return [25, 45, 60];
  };

  const getThemeColor = () => {
      if (mode === 'short') return 'emerald';
      if (mode === 'long') return 'blue';
      return 'indigo';
  };

  const themeColor = getThemeColor();

  // --- RENDER ---
  return (
    <>
      <div id="timer-container" className="pb-20 animate-in fade-in duration-500 space-y-6">
          
          {/* 1. Header & Time Range Filter */}
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-2">
              <div>
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                      Focus & Analytics
                  </h2>
                  
                  {/* Clock Display */}
                  <div className="mt-2 flex flex-col md:flex-row md:items-baseline md:gap-3">
                        <p className="text-4xl md:text-5xl font-display font-bold text-indigo-500 dark:text-indigo-400 tracking-tighter leading-none mb-1 md:mb-0">
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold">
                            {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                   </div>
              </div>
              <div className="flex bg-slate-200 dark:bg-white/5 p-1 rounded-xl">
                  {(['weekly', 'monthly', 'yearly'] as const).map(range => (
                      <button
                          key={range}
                          onClick={() => setTimeRange(range)}
                          className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${timeRange === range ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                      >
                          {range}
                      </button>
                  ))}
              </div>
          </div>

          {/* --- NEW COMPACT TIMER HERO --- */}
          <div className="w-full bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/10 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden group">
              {/* Background Glow */}
              <div className={`absolute top-0 right-0 w-[300px] h-[300px] rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none transition-all duration-1000 ${isActive ? 'opacity-100' : 'opacity-50'} bg-${themeColor}-500/10`} />
              
              <div className="relative z-10">
                  {isSessionInProgress ? (
                      // ACTIVE VIEW
                      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                          <div className="flex-1 text-center md:text-left">
                              <div className={`inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 border ${isActive ? `bg-${themeColor}-500/10 text-${themeColor}-500 border-${themeColor}-500/20` : `bg-slate-500/10 text-slate-500 border-slate-500/20`}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? `bg-${themeColor}-500 animate-pulse` : `bg-slate-500`}`} />
                                  {isActive ? 'Active' : 'Paused'}
                              </div>
                              <div className="text-6xl md:text-8xl font-display font-bold text-slate-900 dark:text-white leading-none tracking-tighter tabular-nums">
                                  {formatDigitalTime(timeLeft)}
                              </div>
                              <p className="text-slate-500 dark:text-slate-400 font-medium mt-1 text-sm">
                                  {mode === 'focus' ? (
                                      <>Focusing on <span className="text-indigo-500 font-bold">{selectedSubject}</span></>
                                  ) : (
                                      <span className="text-slate-400">Rest & Recharge</span>
                                  )}
                              </p>
                          </div>

                          <div className="flex items-center gap-3 w-full md:w-auto">
                               <button onClick={onToggleTimer} className="h-14 w-14 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white font-bold hover:bg-slate-200 dark:hover:bg-white/20 transition-all flex items-center justify-center">
                                   {isActive ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                               </button>
                               <button onClick={handleStopClick} className="h-14 w-14 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center border border-rose-500/20">
                                   <Square size={20} fill="currentColor" />
                               </button>
                          </div>
                      </div>
                  ) : (
                      // SETUP VIEW
                      <div className="flex flex-col gap-6">
                          
                          {/* Header with Mode Switcher & Settings */}
                          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                              <div className="flex p-1 bg-slate-100 dark:bg-white/5 rounded-xl w-full sm:w-auto">
                                  {(['focus', 'short', 'long'] as const).map(m => (
                                      <button 
                                        key={m}
                                        onClick={() => onSwitchMode(m)}
                                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                                            mode === m 
                                            ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' 
                                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                      >
                                          {m === 'focus' ? 'Focus' : m === 'short' ? 'Short Break' : 'Long Break'}
                                      </button>
                                  ))}
                              </div>
                              <button 
                                onClick={() => setShowSettings(true)} 
                                className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                              >
                                 <Settings2 size={18} />
                              </button>
                          </div>

                          <div className="flex flex-col md:flex-row items-center gap-8">
                              
                              {/* Time Selection */}
                              <div className="flex flex-col items-center gap-3 min-w-[140px]">
                                  <div className="relative group/time cursor-pointer p-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                      {isEditingTime ? (
                                          <div className="flex flex-col items-center">
                                              <div className="flex items-baseline justify-center">
                                                  <input 
                                                      autoFocus
                                                      type="number"
                                                      className={`w-40 bg-transparent text-6xl md:text-7xl font-display font-bold text-center outline-none p-0 leading-none text-${themeColor}-500 [&::-webkit-inner-spin-button]:appearance-none`}
                                                      value={customTimeInput}
                                                      onChange={(e) => setCustomTimeInput(e.target.value)}
                                                      onBlur={handleTimeBlur}
                                                      onKeyDown={(e) => e.key === 'Enter' && handleTimeBlur()}
                                                  />
                                                  <span className="text-xl text-slate-400 font-medium">m</span>
                                              </div>
                                              {/* LIVE CONVERSION PREVIEW */}
                                              {parseInt(customTimeInput) > 0 && (
                                                  <p className="text-xs text-indigo-500 font-bold uppercase tracking-widest mt-2 animate-in fade-in">
                                                      {formatDuration(parseInt(customTimeInput))}
                                                  </p>
                                              )}
                                          </div>
                                      ) : (
                                          <div onClick={() => { setIsEditingTime(true); setCustomTimeInput(durations[mode].toString()); }} className="flex items-baseline justify-center">
                                              <div className="text-6xl md:text-7xl font-display font-bold text-slate-900 dark:text-white leading-none tracking-tighter tabular-nums select-none">
                                                  {durations[mode]}
                                              </div>
                                              <span className="text-2xl text-slate-300 font-normal ml-1">m</span>
                                          </div>
                                      )}
                                  </div>
                                  <div className="flex gap-1.5">
                                      {getQuickDurations().map(m => (
                                          <button key={m} onClick={() => onUpdateDurations(m, mode)} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${durations[mode] === m ? `bg-${themeColor}-500 text-white` : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'}`}>
                                              {m}
                                          </button>
                                      ))}
                                  </div>
                              </div>

                              {/* Conditional Spacer & Configuration */}
                              {mode === 'focus' ? (
                                  <>
                                    <div className="hidden md:block w-px h-24 bg-slate-200 dark:bg-white/5" />
                                    <div className="flex-1 w-full flex flex-col gap-4 justify-center">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Subject</label>
                                            <div className="flex flex-wrap gap-1.5 justify-center md:justify-start">
                                                {subjectKeys.map(sub => (
                                                    <button
                                                        key={sub}
                                                        onClick={() => setSelectedSubject(sub)}
                                                        className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                                                            selectedSubject === sub 
                                                            ? 'border-indigo-500 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400' 
                                                            : 'border-transparent bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'
                                                        }`}
                                                    >
                                                        {sub}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                  </>
                              ) : (
                                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-2 min-h-[100px] border-t md:border-t-0 md:border-l border-slate-200 dark:border-white/5 pt-6 md:pt-0 md:pl-8">
                                      {mode === 'short' ? <Coffee size={32} /> : <Armchair size={32} />}
                                      <p className="text-sm font-medium">Take a breather. You earned it.</p>
                                  </div>
                              )}

                              {/* Start Button */}
                              <button 
                                  onClick={onToggleTimer}
                                  className={`w-full md:w-24 h-16 md:h-24 bg-${themeColor}-600 hover:bg-${themeColor}-500 text-white rounded-2xl shadow-lg shadow-${themeColor}-600/20 active:scale-95 transition-all flex flex-col items-center justify-center gap-1 group shrink-0`}
                              >
                                  <Play size={24} fill="currentColor" className="group-hover:scale-110 transition-transform" />
                                  <span className="font-bold uppercase tracking-widest text-[10px]">Start</span>
                              </button>
                          </div>
                      </div>
                  )}
              </div>
          </div>

          {/* 2. Primary Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                  <StatCard 
                      icon={Clock}
                      label="Focus Time"
                      value={formatDuration(analyticsData.totalMinutes)}
                      subtext={`${timeRange} total`}
                      bgClass="bg-indigo-600"
                      colorClass="text-indigo-200 bg-indigo-500/30"
                  />
              </div>
              <StatCard 
                  icon={Layers}
                  label="Sessions"
                  value={analyticsData.sessionCount}
                  subtext="Completed"
                  bgClass="bg-slate-900 dark:bg-white/5"
                  colorClass="text-blue-400"
              />
              <StatCard 
                  icon={Flame}
                  label="Current Streak"
                  value={`${analyticsData.currentStreak} Days`}
                  subtext="Min 1h Daily"
                  bgClass="bg-slate-900 dark:bg-white/5"
                  colorClass="text-orange-500"
              />
          </div>

          {/* 3. Detailed Breakdown Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Subject Distribution */}
              <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <PieChart size={16} className="text-indigo-500" /> Subject Split
                      </h3>
                  </div>
                  <div className="flex items-center gap-8">
                      <DonutChart data={donutData} />
                      <div className="space-y-3 flex-1">
                          {donutData.map((item) => (
                              <div key={item.label} className="flex justify-between items-center text-xs">
                                  <div className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full`} style={{backgroundColor: item.color}} />
                                      <span className="font-bold text-slate-700 dark:text-slate-300">{item.label}</span>
                                  </div>
                                  <span className="font-mono text-slate-500">{formatDuration(item.value)}</span>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>

              {/* Secondary Stats */}
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5">
                      <div className="flex items-center gap-3 mb-2 text-emerald-500">
                          <Activity size={20} />
                          <span className="text-xs font-bold uppercase tracking-widest">Consistency</span>
                      </div>
                      <div className="text-4xl font-display font-bold text-slate-900 dark:text-white mb-1">
                          {analyticsData.consistency}%
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden mt-4">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${analyticsData.consistency}%` }} />
                      </div>
                  </div>

                  {/* SMART BALANCE CARD (Replaced Reviews/Lagging) */}
                  <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 border border-white/10 relative overflow-hidden group flex flex-col justify-between text-white">
                      <div>
                          <div className="flex items-center gap-3 mb-3 text-white/80">
                              <Scale size={20} />
                              <span className="text-xs font-bold uppercase tracking-widest">Study Balance</span>
                          </div>
                          <p className="text-sm leading-relaxed font-medium opacity-90 mb-4">
                              {analyticsData.balanceMessage}
                          </p>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider bg-white/10 px-3 py-2 rounded-xl w-fit backdrop-blur-sm border border-white/10">
                           {analyticsData.balanceAction}
                      </div>
                      {/* Decorative elements */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-[40px] translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-400/20 rounded-full blur-[30px] -translate-x-1/3 translate-y-1/3 pointer-events-none" />
                  </div>
              </div>
          </div>

          {/* 4. Heatmap Section */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-white/10 relative">
              <div className="flex justify-between items-start mb-6 relative z-10">
                  <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <Calendar size={16} className="text-emerald-500" /> Activity Map
                      </h3>
                      {/* NEW: Total Duration Display */}
                      <div className="mt-2">
                          <span className="text-3xl font-mono font-bold text-white tracking-tight">
                              {formatDuration(analyticsData.totalMinutes)}
                          </span>
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-2">
                              Focused {timeRange === 'weekly' ? 'This Week' : timeRange === 'monthly' ? 'This Month' : 'This Year'}
                          </span>
                      </div>
                  </div>
                  <div className="flex gap-1 text-[9px] font-bold uppercase text-slate-500 items-center">
                      <span>Less</span>
                      <div className="flex gap-1 mx-2">
                          <div className="w-2 h-2 rounded-sm bg-slate-800/40 border border-slate-800" />
                          <div className="w-2 h-2 rounded-sm bg-emerald-900/60 border border-emerald-800/50" />
                          <div className="w-2 h-2 rounded-sm bg-emerald-700/80 border border-emerald-600/50" />
                          <div className="w-2 h-2 rounded-sm bg-emerald-500 border border-emerald-400/50" />
                      </div>
                      <span>More</span>
                  </div>
              </div>
              <Heatmap sessions={sessions} range={timeRange} />
          </div>

          {/* Confirmation Modal */}
          <ConfirmationModal
              isOpen={showStopConfirm}
              onClose={() => setShowStopConfirm(false)}
              onConfirm={handleConfirmStop}
              title="End Session?"
              message="Are you sure you want to stop the timer? Your progress will be saved."
          />

          <TimerSettingsModal 
              isOpen={showSettings} 
              onClose={() => setShowSettings(false)} 
              durations={durations}
              onUpdate={onUpdateDurations}
          />
      </div>
    </>
  );
});
