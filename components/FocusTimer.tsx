import React, { useState, useMemo, memo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Play,
    Pause,
    RotateCcw,
    Clock,
    Timer as TimerIcon,
    Calendar,
    Flame,
    PieChart,
    Activity,
    ChevronUp,
    Check,
    Settings2,
    Coffee,
    Armchair,
    X,
    Info,
    TrendingDown,
    Brain,
    Square,
    Share2,
    Loader2,
    Layers,
    Scale,
    BarChart2, MoreVertical, Search, Filter, Plus, FileText, CheckCircle2, ChevronDown, ListFilter,
    Target, CalendarDays, BrainCircuit, Lightbulb, Zap, TrendingUp, Sparkles, Medal, Star, History,
    Lock, AlertTriangle,
} from 'lucide-react';
import { Target as TargetType, Session, SyllabusData, ActivityThresholds, PresenceState, QuestionLog, MistakeCounts } from '../types';
import { ConfirmationModal } from './ConfirmationModal';
import { ReportCardModal } from './ReportCardModal';
import { SessionReportCardModal } from './SessionReportCardModal';
import { RecentReportsModal } from './RecentReportsModal';
import { MISTAKE_TYPES } from '../constants';

// --- Types & Interfaces ---

interface FocusTimerProps {
    sessions: Session[];
    mode: 'focus' | 'short' | 'long' | 'stopwatch';
    timeLeft: number;
    timerState: 'idle' | 'running' | 'paused';
    durations: { focus: number; short: number; long: number; stopwatch?: number };
    onToggleTimer: () => void;
    onResetTimer: () => void;
    onSwitchMode: (mode: 'focus' | 'short' | 'long' | 'stopwatch') => void;
    onUpdateDurations: (newDuration: number, mode: 'focus' | 'short' | 'long' | 'stopwatch') => void;
    onCompleteSession: (isInterrupted?: boolean, sessionData?: { attempted: number, correct: number, mistakes: MistakeCounts, questionLogs: QuestionLog[], topic?: string }) => void;
    sessionCount: number;
    syllabus: SyllabusData;
    selectedSubject: string;
    onSelectSubject: (subject: string) => void;
    activityThresholds: ActivityThresholds;
    onOpenSettings: () => void;
    onStatusChange: (status: Partial<PresenceState>) => void;
    username?: string;
    streakGoal: number;
    onStreakGoalChange?: (goal: number) => void;
}

type TimeRange = 'daily' | 'weekly' | 'monthly' | 'yearly';

// --- Helper Functions ---

const getStartOfRange = (range: TimeRange): Date => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of day normalization

    if (range === 'daily') return new Date(now);
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
    const end = range === 'daily'
        ? start + 24 * 60 * 60 * 1000 // End of today
        : range === 'weekly'
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
    return `${h}h ${m}m`;
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
    subtext?: React.ReactNode,
    icon: any,
    colorClass?: string,
    bgClass?: string
}) => (
    <div className={`p-5 rounded-3xl border border-white/5 flex flex-col justify-between h-full ${bgClass} text-white`}>
        <div className="flex justify-between items-start mb-2">
            <div className={`p-2.5 rounded-2xl bg-white/10 ${colorClass}`}>
                <Icon size={20} />
            </div>
            {subtext && <div className="text-[10px] font-bold uppercase tracking-wider opacity-60 flex items-center gap-1">{subtext}</div>}
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
                    const circumference = 2 * Math.PI * 40; // r=40
                    const percent = item.value / total;
                    const dashArray = percent * circumference;
                    const offset = cumulative * circumference;
                    cumulative += percent;

                    return (
                        <circle
                            key={i}
                            cx="50" cy="50" r="40"
                            fill="transparent"
                            stroke={item.color}
                            strokeWidth="12"
                            strokeDasharray={`${dashArray} ${circumference}`}
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

const Heatmap = ({ sessions, range, thresholds, subjectColorMap }: { sessions: Session[], range: TimeRange, thresholds: ActivityThresholds, subjectColorMap: Record<string, string> }) => {
    const [hoveredData, setHoveredData] = useState<{
        date: Date;
        stats: { level: number; count: number; duration: number };
        pos: { x: number; y: number };
    } | null>(null);
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // ---- Day Report Modal ----
    const DayReportModal = ({ date, onClose }: { date: Date; onClose: () => void }) => {
        const dateStr = date.toDateString();
        const daySessions = sessions.filter(s => new Date(s.timestamp).toDateString() === dateStr);
        const totalDuration = daySessions.reduce((acc, s) => acc + (s.duration || 0), 0);

        // Subject breakdown
        const subjectMap: Record<string, number> = {};
        daySessions.forEach(s => {
            const sub = s.subject || 'Unknown';
            subjectMap[sub] = (subjectMap[sub] || 0) + (s.duration || 0);
        });
        const subjectList = Object.entries(subjectMap).sort(([, a], [, b]) => b - a);

        const fmtDur = (secs: number) => {
            const h = Math.floor(secs / 3600);
            const m = Math.floor((secs % 3600) / 60);
            if (h > 0 && m > 0) return `${h}h ${m}m`;
            if (h > 0) return `${h}h`;
            return `${m}m`;
        };

        return createPortal(
            <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
                <div
                    className="bg-slate-900 border border-white/10 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="p-5 border-b border-white/5 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                {date.toLocaleDateString('en-US', { weekday: 'long' })}
                            </p>
                            <h3 className="text-xl font-bold text-white">
                                {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </h3>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="p-5 space-y-4">
                        {/* Total Time */}
                        <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                            <div className="p-2.5 rounded-xl bg-emerald-500/10">
                                <Clock size={18} className="text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Focus Time</p>
                                <p className="text-2xl font-mono font-bold text-white">{totalDuration > 0 ? fmtDur(totalDuration) : '—'}</p>
                            </div>
                        </div>

                        {/* Subject Breakdown */}
                        {subjectList.length > 0 ? (
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Subject Breakdown</p>
                                {subjectList.map(([sub, secs]) => {
                                    const pct = totalDuration > 0 ? (secs / totalDuration) * 100 : 0;
                                    const color = subjectColorMap[sub];
                                    return (
                                        <div key={sub} className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-slate-300">{sub}</span>
                                                <span className="text-xs font-mono font-bold text-slate-400">{fmtDur(secs)} · {Math.round(pct)}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all"
                                                    style={{ width: `${pct}%`, backgroundColor: color || '#6366f1' }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                <p className="text-sm text-slate-500 font-medium">No sessions logged this day.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>,
            document.body
        );
    };
    // ---- End Day Report Modal ----

    const generateDays = () => {
        const today = new Date();
        const days = [];

        if (range === 'daily') {
            // Generate 24 hourly slots for today
            const start = new Date(today);
            start.setHours(0, 0, 0, 0);
            for (let h = 0; h < 24; h++) {
                const d = new Date(start);
                d.setHours(h);
                days.push(d);
            }
        } else if (range === 'weekly') {
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

    const getHourStats = (hour: Date) => {
        const hourStart = hour.getTime();
        const hourEnd = hourStart + 60 * 60 * 1000;
        const hourSessions = sessions.filter(s => s.timestamp >= hourStart && s.timestamp < hourEnd);
        const duration = hourSessions.reduce((acc, s) => acc + (s.duration || 0), 0) / 60;
        let level = 0;
        if (duration > 0) level = 1;
        if (duration >= 20) level = 2;
        if (duration >= 40) level = 3;
        if (duration >= 55) level = 4;
        return { level, duration, count: hourSessions.length };
    };

    const getDayStats = (date: Date) => {
        const dateStr = date.toDateString();
        const daysSessions = sessions.filter(s => new Date(s.timestamp).toDateString() === dateStr);
        const duration = daysSessions.reduce((acc, s) => acc + (s.duration || 0), 0) / 60; // in minutes

        let level = 0;
        // Thresholds based on props
        if (duration > 0) level = 1;
        if (duration >= thresholds.level2) level = 2;
        if (duration >= thresholds.level3) level = 3;
        if (duration >= thresholds.level4) level = 4;

        return { level, duration, count: daysSessions.length };
    };

    const getTileStyle = (level: number, isCurrentMonth: boolean) => {
        const baseOpacity = isCurrentMonth ? 'opacity-100' : 'opacity-30 grayscale';

        // New Color Scale: Red -> Yellow -> Light Green -> Dark Green
        switch (level) {
            case 0: return `bg-slate-800/40 border-slate-800 ${baseOpacity}`;
            // Lowest: Red
            case 1: return `bg-rose-500/40 border-rose-500/30 text-rose-100 ${baseOpacity}`;
            // Medium-Low: Yellow/Orange
            case 2: return `bg-amber-500/60 border-amber-500/40 ${baseOpacity}`;
            // Medium-High: Light Green
            case 3: return `bg-lime-500/70 border-lime-500/50 shadow-[0_0_12px_rgba(132,204,22,0.4)] ${baseOpacity}`;
            // Highest: Dark Green
            case 4: return `bg-emerald-600 border-emerald-500 shadow-[0_0_15px_rgba(5,150,105,0.6)] ${baseOpacity}`;
            default: return `bg-slate-800/40 border-slate-800 ${baseOpacity}`;
        }
    };

    // Responsive grid classes based on range
    const getGridClass = () => {
        if (range === 'daily') return 'grid grid-cols-12 gap-1.5 w-full';
        if (range === 'weekly') return 'grid grid-cols-7 h-20 gap-3 w-full';
        if (range === 'monthly') return 'grid grid-cols-7 gap-2 w-full';
        return 'flex flex-wrap gap-1 justify-start w-full'; // Dense flex layout for year
    };

    return (
        <div className="relative" ref={containerRef} onMouseLeave={() => setHoveredData(null)}>

            {/* ── DAILY: Bar Chart by time section ── */}
            {range === 'daily' && (() => {
                const now = new Date();
                const sections = [
                    { label: 'Night', timeLabel: '12am–6am', emoji: '🌙', hours: [0, 1, 2, 3, 4, 5] },
                    { label: 'Morning', timeLabel: '6am–12pm', emoji: '🌅', hours: [6, 7, 8, 9, 10, 11] },
                    { label: 'Afternoon', timeLabel: '12pm–5pm', emoji: '☀️', hours: [12, 13, 14, 15, 16] },
                    { label: 'Evening', timeLabel: '5pm–12am', emoji: '🌆', hours: [17, 18, 19, 20, 21, 22, 23] },
                ];

                const BREAK_COLOR = '#22c55e'; // green-500

                // Build per-hour data with dominant subject
                const start = new Date(now); start.setHours(0, 0, 0, 0);
                const hourData = Array.from({ length: 24 }, (_, h) => {
                    const hourStart = new Date(start); hourStart.setHours(h);
                    const hourEnd = hourStart.getTime() + 3600000;
                    const hourSessions = sessions.filter(s => s.timestamp >= hourStart.getTime() && s.timestamp < hourEnd);
                    const mins = hourSessions.reduce((acc, s) => acc + (s.duration || 0) / 60, 0);

                    // Determine dominant subject by minutes
                    const subjectMins: Record<string, number> = {};
                    hourSessions.forEach(s => {
                        const sub = s.subject || 'Break';
                        subjectMins[sub] = (subjectMins[sub] || 0) + (s.duration || 0) / 60;
                    });
                    const dominantSubject = Object.entries(subjectMins).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;
                    const isBreak = dominantSubject === 'Break' || dominantSubject === 'Short Break' || dominantSubject === 'Long Break';
                    const barColor = mins > 0
                        ? (isBreak ? BREAK_COLOR : (subjectColorMap[dominantSubject ?? ''] ?? '#6366f1'))
                        : null;

                    return { h, mins, barColor };
                });

                // Max minutes in any single hour (floor at 15 so bars aren't invisible for short sessions)
                const maxMins = Math.max(15, ...hourData.map(d => d.mins));

                return (
                    <div className="space-y-3">
                        {/* Section bar groups */}
                        <div className="flex gap-3 items-end h-28">
                            {sections.map(sec => {
                                const secMins = sec.hours.reduce((acc, h) => acc + hourData[h].mins, 0);
                                const hasCurrentHour = sec.hours.includes(now.getHours());
                                // Dominant color for section border accent
                                const secSubjectMins: Record<string, number> = {};
                                sec.hours.forEach(h => {
                                    const d = hourData[h];
                                    if (d.barColor && d.mins > 0) secSubjectMins[d.barColor] = (secSubjectMins[d.barColor] || 0) + d.mins;
                                });
                                const secAccentColor = Object.entries(secSubjectMins).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'rgba(255,255,255,0.15)';

                                return (
                                    <div key={sec.label} className="flex-1 flex flex-col gap-1">
                                        {/* Hourly bars */}
                                        <div className="flex items-end gap-0.5 h-20">
                                            {sec.hours.map(h => {
                                                const { mins: m, barColor } = hourData[h];
                                                const pct = maxMins > 0 ? (m / maxMins) * 100 : 0;
                                                const isCurrent = h === now.getHours();
                                                const color = barColor ?? 'rgba(255,255,255,0.06)';
                                                return (
                                                    <div
                                                        key={h}
                                                        className="flex-1 flex flex-col justify-end relative group"
                                                        onMouseEnter={(e) => {
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            const parent = containerRef.current?.getBoundingClientRect();
                                                            if (parent) {
                                                                const hourDate = new Date(start);
                                                                hourDate.setHours(h);
                                                                setHoveredData({
                                                                    date: hourDate,
                                                                    stats: { level: 0, duration: m, count: 0 },
                                                                    pos: { x: rect.left - parent.left + rect.width / 2, y: rect.top - parent.top }
                                                                });
                                                            }
                                                        }}
                                                    >
                                                        {m > 0 && (
                                                            <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap" style={{ color }}>
                                                                {Math.round(m)}m
                                                            </span>
                                                        )}
                                                        <div
                                                            className={`w-full rounded-sm transition-all duration-700 ease-out ${isCurrent ? 'ring-1 ring-white/40' : ''}`}
                                                            style={{
                                                                height: `${Math.max(pct, m > 0 ? 6 : 2)}%`,
                                                                backgroundColor: color,
                                                                opacity: isCurrent && m === 0 ? 0.4 : 1,
                                                                boxShadow: m > 0 ? `0 0 10px ${color}70` : 'none',
                                                            }}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Section footer */}
                                        <div className={`flex justify-between items-center px-0.5 pt-1 border-t transition-colors ${hasCurrentHour ? 'border-white/20' : 'border-white/5'}`}>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: hasCurrentHour ? secAccentColor : 'rgba(255,255,255,0.3)' }}>
                                                    {sec.emoji} {sec.label}
                                                </span>
                                                <span className="text-[8px] font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>
                                                    {sec.timeLabel}
                                                </span>
                                            </div>
                                            {secMins > 0 && (
                                                <span className="text-[9px] font-mono font-bold text-white/50">
                                                    {Math.floor(secMins / 60) > 0 ? `${Math.floor(secMins / 60)}h ` : ''}{Math.round(secMins % 60)}m
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}

            {/* Weekday Labels for Monthly View */}
            {range === 'monthly' && (
                <div className="grid grid-cols-7 gap-2 mb-2">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                        <div key={i} className="text-center text-[10px] font-bold text-slate-500 uppercase">{d}</div>
                    ))}
                </div>
            )}

            {range !== 'daily' && (
                <div className={`transition-opacity ${getGridClass()}`}>
                    {days.map((d, i) => {
                        const stats = getDayStats(d);
                        const isToday = d.toDateString() === new Date().toDateString();
                        const isCurrentMonth = range !== 'monthly' || d.getMonth() === new Date().getMonth();
                        const tileColorClass = getTileStyle(stats.level, isCurrentMonth);
                        const textColor = stats.level >= 3 ? 'text-white' : 'text-slate-400';

                        return (
                            <div
                                key={i}
                                onMouseEnter={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const parent = containerRef.current?.getBoundingClientRect();
                                    if (parent) {
                                        setHoveredData({
                                            date: d,
                                            stats,
                                            pos: {
                                                x: rect.left - parent.left + rect.width / 2,
                                                y: rect.top - parent.top
                                            }
                                        })
                                    }
                                }}
                                onClick={() => setSelectedDay(d)}
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
            )}

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
            {/* Day Report Modal */}
            {selectedDay && <DayReportModal date={selectedDay} onClose={() => setSelectedDay(null)} />}
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
                                onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    if (!isNaN(val)) {
                                        onUpdate(val, mode);
                                    }
                                }}
                                className={`w-full h-2 rounded-full appearance-none cursor-pointer ${mode === 'focus' ? 'bg-indigo-100 dark:bg-indigo-500/20 accent-indigo-500' :
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

// --- Streak Goal Editor Sub-component ---
// Separated so it can use hooks legally at the component level.
const StreakGoalEditor: React.FC<{
    streakGoal: number;
    onStreakGoalChange?: (goal: number) => void;
}> = ({ streakGoal, onStreakGoalChange }) => {
    const [showModal, setShowModal] = useState(false);
    const [pendingGoal, setPendingGoal] = useState(streakGoal);

    return (
        <>
            {/* Compact read-only strip */}
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-900/50 border border-white/5">
                <Flame size={13} className="text-orange-500 shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 shrink-0">Streak Goal</span>
                <span className="text-xs font-mono font-bold text-orange-400">{streakGoal}h / day</span>
                <button
                    onClick={() => { setPendingGoal(streakGoal); setShowModal(true); }}
                    className="ml-auto p-1 rounded-lg text-slate-600 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                    title="Change streak goal — will reset streak"
                >
                    <Lock size={12} />
                </button>
            </div>

            {/* Warning + change modal */}
            {showModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl p-6 space-y-4">
                        <div className="flex items-center gap-3 text-amber-400">
                            <AlertTriangle size={20} />
                            <h3 className="text-base font-bold">Change Streak Goal?</h3>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed">
                            Changing your daily goal will <span className="text-amber-400 font-bold">reset your current streak to 0</span>.
                            Your past study data is preserved, but the streak counter restarts.
                        </p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Only do this if you are absolutely sure.</p>

                        <div className="space-y-2 py-2">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-400 font-bold">New Goal</span>
                                <span className="text-sm font-mono font-bold text-orange-400">{pendingGoal}h / day</span>
                            </div>
                            <input
                                type="range" min={1} max={12} step={1}
                                value={pendingGoal}
                                onChange={e => setPendingGoal(parseInt(e.target.value))}
                                className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-700 accent-orange-500"
                            />
                            <div className="flex justify-between text-[9px] text-slate-600 font-bold">
                                <span>1h</span><span>6h</span><span>12h</span>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest bg-slate-800 text-slate-400 hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => { onStreakGoalChange?.(pendingGoal); setShowModal(false); }}
                                disabled={pendingGoal === streakGoal}
                                className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest bg-amber-500 text-white hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Confirm & Reset
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// --- MAIN COMPONENT ---

const FocusTimer: React.FC<FocusTimerProps> = memo((props) => {
    const {
        timerState,
        sessions,
        onToggleTimer,
        mode,
        timeLeft,
        durations,
        onResetTimer,
        onCompleteSession,
        onSwitchMode,
        onUpdateDurations,
        syllabus,
        selectedSubject,
        onSelectSubject,
        activityThresholds,
        onOpenSettings,
        onStatusChange,
        username,
        streakGoal
    } = props;

    if (!sessions || !syllabus) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 animate-pulse">Initializing Timer...</p>
            </div>
        );
    }

    const subjectKeys = useMemo(() => Object.keys(syllabus), [syllabus]);

    const [timeRange, setTimeRange] = useState<TimeRange>('weekly');
    const [showStopConfirm, setShowStopConfirm] = useState(false);
    const [isEditingTime, setIsEditingTime] = useState(false);
    const [customTimeInput, setCustomTimeInput] = useState(durations.focus.toString());
    const [showSettings, setShowSettings] = useState(false);
    const [showReportCard, setShowReportCard] = useState(false);
    const [isSharing, setIsSharing] = useState(false); // New state for sharing

    // Stopwatch specific modals
    const [showRecentReports, setShowRecentReports] = useState(false);
    const [selectedStopwatchSession, setSelectedStopwatchSession] = useState<Session | null>(null);

    // --- STOPWATCH STATE ---
    const [sessionLogs, setSessionLogs] = useState<QuestionLog[]>([]);
    const [sessionAttempted, setSessionAttempted] = useState(0);
    const [sessionCorrect, setSessionCorrect] = useState(0);
    const [sessionMistakes, setMistakes] = useState<MistakeCounts>({});
    const [sessionChapter, setSessionChapter] = useState<string>('');

    const isActive = timerState === 'running';
    const isSessionInProgress = timerState !== 'idle';



    const handleLogAnswer = (result: 'correct' | keyof MistakeCounts) => {
        if (mode !== 'stopwatch' || timerState !== 'running') return;

        // Calculate this question's duration by subtracting previous logs' sum from current elapsed time
        const previousSum = sessionLogs.reduce((acc, log) => acc + log.duration, 0);
        const questionDuration = timeLeft - previousSum;

        if (questionDuration <= 0) return; // Prevent logging empty or negative times

        const log: QuestionLog = {
            timestamp: Date.now(),
            duration: questionDuration,
            result,
            subject: selectedSubject
        };

        setSessionLogs(prev => [...prev, log]);
        setSessionAttempted(prev => prev + 1);

        if (result === 'correct') {
            setSessionCorrect(prev => prev + 1);
        } else {
            setMistakes(prev => ({ ...prev, [result]: (prev[result] || 0) + 1 }));
        }
    };

    useEffect(() => {
        // Ensure selected subject is valid
        if (!subjectKeys.includes(selectedSubject) && subjectKeys.length > 0) {
            onSelectSubject(subjectKeys[0]);
        }
    }, [subjectKeys, selectedSubject, onSelectSubject]);

    // Clock state for the header
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Prevent accidental exit when timer is running
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (timerState === 'running') {
                e.preventDefault();
                e.returnValue = ''; // Standard way to trigger the browser's confirmation dialog
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [timerState]);

    const previousSessionsLengthRef = useRef(sessions.length);
    useEffect(() => {
        if (sessions.length > previousSessionsLengthRef.current) {
            const latestSession = sessions[0]; // Assuming sessions are sorted descending by timestamp
            if (latestSession && latestSession.type === 'stopwatch') {
                // Auto show report card for the newly created stopwatch session
                setSelectedStopwatchSession(latestSession);
            }
        }
        previousSessionsLengthRef.current = sessions.length;
    }, [sessions]);

    // --- ANALYTICS LOGIC ---
    const analyticsData = useMemo(() => {
        const filtered = filterSessions(sessions, timeRange);
        const totalMinutes = filtered.reduce((acc, s) => acc + (s.duration ? s.duration / 60 : 0), 0);

        const sessionCount = filtered.filter(s =>
            s.duration !== undefined && s.plannedDuration !== undefined && s.duration >= s.plannedDuration
        ).length;

        const subjectDist: Record<string, number> = {};
        subjectKeys.forEach(key => subjectDist[key.trim().toLowerCase()] = 0);

        filtered.forEach(s => {
            const normalizedSubject = s.subject ? s.subject.trim().toLowerCase() : 'unknown';
            if (subjectDist[normalizedSubject] !== undefined) {
                subjectDist[normalizedSubject] += (s.duration ? s.duration / 60 : 0);
            } else {
                subjectDist[normalizedSubject] = (s.duration ? s.duration / 60 : 0);
            }
        });

        // Calculate Subject Balance Insight
        let balanceMessage = "No data recorded for this period yet.";
        let balanceAction = "Start a session to see insights.";

        if (totalMinutes > 0 && subjectKeys.length >= 2) {
            const sorted = Object.entries(subjectDist).sort(([, a], [, b]) => b - a);
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
            d.setHours(0, 0, 0, 0);
            const dateKey = d.getTime().toString();
            dailyDurations[dateKey] = (dailyDurations[dateKey] || 0) + (s.duration || 0); // duration is in seconds
        });

        const streakGoalSeconds = streakGoal * 3600;
        const validDates = Object.entries(dailyDurations)
            .filter(([_, seconds]) => seconds >= streakGoalSeconds)
            .map(([ts]) => parseInt(ts))
            .sort((a, b) => b - a); // Descending order

        let currentStreak = 0;
        if (validDates.length > 0) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayTime = today.getTime();
            const yesterdayTime = todayTime - 86400000;

            if (validDates[0] === todayTime || validDates[0] === yesterdayTime) {
                currentStreak = 1;
                for (let i = 0; i < validDates.length - 1; i++) {
                    const diff = validDates[i] - validDates[i + 1];
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

        if (timeRange === 'daily') {
            totalDays = 1;
            endOfRange = startOfRange + 86400000;
        } else if (timeRange === 'weekly') {
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
    }, [sessions, timeRange, subjectKeys]);

    const subjectColorMap: Record<string, string> = useMemo(() => {
        const colors: Record<string, string> = {
            Physics: '#3b82f6',   // blue-500
            Chemistry: '#f97316', // orange-500
            Maths: '#f43f5e',     // rose-500
            Biology: '#10b981',   // emerald-500
            English: '#8b5cf6',   // violet-500
            History: '#f59e0b',   // amber-500
            Geography: '#06b6d4'  // cyan-500
        };
        return subjectKeys.reduce((acc, key) => {
            acc[key] = colors[key] || '#64748b'; // default slate
            return acc;
        }, {} as Record<string, string>);
    }, [subjectKeys]);

    const donutData = useMemo(() => {
        return Object.entries(analyticsData.subjectDist)
            .filter(([_, val]) => val > 0) // Only show subjects with actual time
            .map(([subj, val]) => {
                // Try to find the original capitalized name from subjectKeys, fallback to capitalized normalized
                const originalName = subjectKeys.find(k => k.trim().toLowerCase() === subj) ||
                    subj.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

                // Try to find color match (case insensitive)
                const colorKey = Object.keys(subjectColorMap).find(k => k.trim().toLowerCase() === subj);

                return {
                    label: originalName,
                    value: val,
                    color: colorKey ? subjectColorMap[colorKey] : '#64748b'
                };
            });
    }, [analyticsData.subjectDist, subjectColorMap, subjectKeys]);

    // --- HANDLERS ---
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
        onStatusChange({ state: 'idle' });
    };

    const handleConfirmStop = () => {
        onCompleteSession(true, {
            attempted: sessionAttempted,
            correct: sessionCorrect,
            mistakes: sessionMistakes,
            questionLogs: sessionLogs,
            topic: sessionChapter
        });
        setShowStopConfirm(false);
        // Reset state for next time
        setSessionLogs([]);
        setSessionAttempted(0);
        setSessionCorrect(0);
        setMistakes({});
        setSessionChapter('');
    };

    const getQuickDurations = () => {
        if (mode === 'short') return [5, 10, 15];
        if (mode === 'long') return [15, 20, 30];
        return [25, 45, 60];
    };

    const getThemeColor = () => {
        if (mode === 'short') return 'emerald';
        if (mode === 'long') return 'blue';
        if (mode === 'stopwatch') return 'amber';
        return 'indigo';
    };

    const themeColor = getThemeColor();

    const handleShareStats = () => {
        setShowReportCard(true);
    };

    // --- RENDER ---
    return (
        <>
            <div id="timer-container" className="pb-20 animate-in fade-in duration-500 space-y-4 md:space-y-6">

                {/* 1. Header & Time Range Filter */}
                <div className="hidden md:flex flex-col md:flex-row justify-between items-end gap-6 mb-2">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                            Focus & Analytics
                        </h2>

                        {/* Clock Display */}
                        <div className="mt-2 flex flex-col md:flex-row md:items-baseline md:gap-3">
                            <p className="text-4xl md:text-5xl font-display font-bold text-indigo-500 dark:text-indigo-400 tracking-tighter leading-none mb-1 md:mb-0">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold">
                                {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                    </div>
                    <div className="flex bg-slate-200 dark:bg-white/5 p-1 rounded-xl">
                        {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(range => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${timeRange === range ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                {range}
                            </button>
                        ))}
                    </div>
                </div>

                {/* --- COMPACT TIMER HERO --- */}
                <div className="w-full bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/10 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden group">
                    {/* Background Glow */}
                    <div className={`absolute top-0 right-0 w-[300px] h-[300px] rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none transition-all duration-1000 ${isActive ? 'opacity-100' : 'opacity-50'} bg-${themeColor}-500/10`} />

                    <div className="relative z-10">
                        {isSessionInProgress ? (
                            // ACTIVE VIEW
                            <div className="flex flex-col items-center justify-center gap-6 md:gap-8 py-6 md:py-8">
                                <div className="text-center w-full">
                                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border ${isActive ? `bg-${themeColor}-500/10 text-${themeColor}-500 border-${themeColor}-500/20` : `bg-slate-500/10 text-slate-500 border-slate-500/20`}`}>
                                        <span className={`w-2 h-2 rounded-full ${isActive ? `bg-${themeColor}-500 animate-pulse` : `bg-slate-500`}`} />
                                        {isActive ? 'Focusing' : 'Paused'}
                                    </div>
                                    <div className="text-[80px] sm:text-[100px] md:text-9xl font-display font-bold text-slate-900 dark:text-white leading-none tracking-tighter tabular-nums mb-2">
                                        {formatDigitalTime(timeLeft)}
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-400 font-medium text-base">
                                        {(mode === 'focus' || mode === 'stopwatch') ? (
                                            <>On <span className={`font-bold text-${themeColor}-500`}>{selectedSubject}</span></>
                                        ) : (
                                            <span className="text-slate-400">Break Time</span>
                                        )}
                                    </p>
                                </div>

                                {/* Mobile: full-width pill buttons stacked; Desktop: square buttons side by side */}
                                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mt-2">
                                    <button onClick={onToggleTimer} className={`w-full sm:w-auto h-16 sm:h-20 sm:w-20 px-8 sm:px-0 rounded-2xl bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white font-bold hover:bg-slate-200 dark:hover:bg-white/20 transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95 text-sm uppercase tracking-widest`}>
                                        {isActive ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                                        <span className="sm:hidden">{isActive ? 'Pause' : 'Resume'}</span>
                                    </button>
                                    <button onClick={handleStopClick} className="w-full sm:w-auto h-16 sm:h-20 sm:w-20 px-8 sm:px-0 rounded-2xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-3 border border-rose-500/20 shadow-lg active:scale-95 text-sm uppercase tracking-widest font-bold">
                                        <Square size={28} fill="currentColor" />
                                        <span className="sm:hidden">End Session</span>
                                    </button>
                                </div>

                                {/* QUESTION STOPWATCH UI */}
                                {mode === 'stopwatch' && (
                                    <div className="w-full max-w-xl mt-4 pt-6 border-t border-slate-200 dark:border-white/10 animate-in slide-in-from-bottom-6 fade-in duration-500">
                                        <div className="flex flex-col items-center bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-inner">

                                            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1 text-center w-full">Log outcome to track time & mistakes</p>
                                            <p className="text-xs font-mono font-bold text-amber-500 mb-4">{sessionAttempted} done{sessionChapter ? ` · ${sessionChapter}` : ''}</p>

                                            {/* Correct button */}
                                            <div className="flex flex-wrap items-center justify-center gap-2 w-full">
                                                <button
                                                    onClick={() => handleLogAnswer('correct')}
                                                    className="flex-1 min-w-[90px] bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:text-white px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                                                >
                                                    ✓ Correct
                                                </button>
                                                {/* Mistake type buttons — same as Dashboard */}
                                                {MISTAKE_TYPES.map(type => (
                                                    <button
                                                        key={type.id}
                                                        onClick={() => handleLogAnswer(type.id as keyof MistakeCounts)}
                                                        className={`flex-1 min-w-[120px] hover:text-white px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border
                                                            ${type.id === 'concept' ? 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400 hover:bg-orange-500' : ''}
                                                            ${type.id === 'calculation' ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500' : ''}
                                                            ${type.id === 'silly' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500' : ''}
                                                            ${type.id === 'time' ? 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400 hover:bg-purple-500' : ''}
                                                        `}
                                                    >
                                                        {type.icon}
                                                        {type.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // SETUP VIEW
                            <div className="flex flex-col gap-6">

                                {/* Header with Mode Switcher & Settings */}
                                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                    <div className="flex p-1 bg-slate-100 dark:bg-white/5 rounded-xl w-full sm:w-auto">
                                        {(['focus', 'stopwatch', 'short', 'long'] as const).map(m => (
                                            <button
                                                key={m}
                                                onClick={() => onSwitchMode(m)}
                                                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${mode === m
                                                    ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white'
                                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                                    }`}
                                            >
                                                {m === 'focus' ? 'Focus' : m === 'stopwatch' ? 'Stopwatch' : m === 'short' ? 'Short Break' : 'Long Break'}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {mode === 'stopwatch' && (
                                            <button
                                                onClick={() => setShowRecentReports(true)}
                                                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white transition-all text-[10px] font-bold uppercase tracking-widest border border-amber-500/20"
                                            >
                                                <History size={14} /> Reports
                                            </button>
                                        )}
                                        <button
                                            onClick={handleShareStats}
                                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all text-[10px] font-bold uppercase tracking-widest border border-indigo-500/20"
                                        >
                                            <Share2 size={14} /> Share Stats
                                        </button>
                                        <button
                                            onClick={() => setShowSettings(true)}
                                            className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                                        >
                                            <Settings2 size={18} />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row items-center gap-8">

                                    {/* Time Selection */}
                                    <div className="flex flex-col items-center gap-3 min-w-[140px] justify-center">
                                        {mode === 'stopwatch' ? (
                                            <div className="flex flex-col items-center justify-center h-full p-2">
                                                <div className="text-4xl md:text-5xl font-display font-bold text-slate-400 dark:text-slate-500 leading-none tracking-tighter tabular-nums select-none mb-2">
                                                    00:00
                                                </div>
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500">Counts Up Infinite</span>
                                            </div>
                                        ) : (
                                            <>
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
                                                        <div onClick={() => { setIsEditingTime(true); setCustomTimeInput((durations[mode as keyof typeof durations] || 0).toString()); }} className="flex items-baseline justify-center">
                                                            <div className="text-6xl md:text-7xl font-display font-bold text-slate-900 dark:text-white leading-none tracking-tighter tabular-nums select-none">
                                                                {durations[mode as keyof typeof durations] || 0}
                                                            </div>
                                                            <span className="text-2xl text-slate-300 font-normal ml-1">m</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex gap-1.5">
                                                    {getQuickDurations().map(m => (
                                                        <button key={m} onClick={() => onUpdateDurations(m, mode)} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${durations[mode as keyof typeof durations] === m ? `bg-${themeColor}-500 text-white` : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'}`}>
                                                            {m}
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Conditional Spacer & Configuration */}
                                    {(mode === 'focus' || mode === 'stopwatch') ? (
                                        <>
                                            <div className="hidden md:block w-px h-24 bg-slate-200 dark:bg-white/5" />
                                            <div className="flex-1 w-full flex flex-col gap-4 justify-center">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Subject</label>
                                                    {subjectKeys.length === 0 ? (
                                                        <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center">
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">No subjects found.</p>
                                                            <p className="text-[10px] text-slate-400 mt-1">Add subjects in Settings to focus.</p>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-1.5 justify-center md:justify-start">
                                                            {subjectKeys.map(sub => (
                                                                <button
                                                                    key={sub}
                                                                    onClick={() => { onSelectSubject(sub); setSessionChapter(''); }}
                                                                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${selectedSubject === sub
                                                                        ? 'border-indigo-500 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400'
                                                                        : 'border-transparent bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'
                                                                        }`}
                                                                >
                                                                    {sub}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Stopwatch: Chapter Selector */}
                                                {mode === 'stopwatch' && (
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                                                            Chapter <span className="text-rose-400">*</span>
                                                        </label>
                                                        <div className="relative">
                                                            <select
                                                                value={sessionChapter}
                                                                onChange={e => setSessionChapter(e.target.value)}
                                                                className={`w-full bg-slate-100 dark:bg-white/5 border p-3 pr-8 rounded-xl text-slate-900 dark:text-white outline-none transition-all text-xs font-medium appearance-none ${sessionChapter === ''
                                                                    ? 'border-rose-400/60 focus:border-rose-400'
                                                                    : 'border-slate-200 dark:border-white/10 focus:border-amber-500'
                                                                    }`}
                                                            >
                                                                <option value="">— Select a chapter —</option>
                                                                {(syllabus[selectedSubject] || []).map(t => (
                                                                    <option key={t} value={t}>{t}</option>
                                                                ))}
                                                            </select>
                                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                                                        </div>
                                                        {sessionChapter === '' && (
                                                            <p className="text-[10px] text-rose-400 font-medium">Please select a chapter to start.</p>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Stopwatch Disclaimer */}
                                                {mode === 'stopwatch' && (
                                                    <div className="flex items-start gap-2 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400">
                                                        <Info size={14} className="shrink-0 mt-0.5" />
                                                        <p className="text-[10px] leading-relaxed">
                                                            <strong>Note:</strong> Log questions manually while the stopwatch runs. They will be counted towards your total questions solved on the dashboard.
                                                        </p>
                                                    </div>
                                                )}
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
                                        disabled={mode === 'stopwatch' && sessionChapter === ''}
                                        className={`w-full md:w-24 h-16 md:h-24 text-white rounded-2xl shadow-lg active:scale-95 transition-all flex flex-col items-center justify-center gap-1 group shrink-0 ${mode === 'stopwatch' && sessionChapter === ''
                                            ? `bg-slate-400 dark:bg-slate-700 cursor-not-allowed shadow-none opacity-60`
                                            : `bg-${themeColor}-600 hover:bg-${themeColor}-500 shadow-${themeColor}-600/20`
                                            }`}
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
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="col-span-2">
                        <StatCard
                            icon={Clock}
                            label="Focus Time"
                            value={formatDuration(analyticsData.totalMinutes)}
                            subtext={
                                <div className="flex items-center gap-1 group relative">
                                    <span>{timeRange} total</span>
                                    <Info size={12} className="cursor-help" />
                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max max-w-[200px] p-2 bg-slate-800 text-white text-[10px] font-bold rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center">
                                        Total time spent in focus sessions for the selected period.
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45" />
                                    </div>
                                </div>
                            }
                            bgClass="bg-indigo-600"
                            colorClass="text-indigo-200 bg-indigo-500/30"
                        />
                    </div>
                    <StatCard
                        icon={Layers}
                        label="Sessions"
                        value={analyticsData.sessionCount}
                        subtext={
                            <div className="flex items-center gap-1 group relative">
                                <span>Completed</span>
                                <Info size={12} className="cursor-help" />
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max max-w-[200px] p-2 bg-slate-800 text-white text-[10px] font-bold rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center">
                                    A session is only counted if the timer finishes completely.
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45" />
                                </div>
                            </div>
                        }
                        bgClass="bg-slate-900 dark:bg-white/5"
                        colorClass="text-blue-400"
                    />
                    <StatCard
                        icon={Flame}
                        label="Current Streak"
                        value={`${analyticsData.currentStreak} Days`}
                        subtext={
                            <div className="flex items-center gap-1 group relative">
                                <span>Min {streakGoal}h Daily</span>
                                <Info size={12} className="cursor-help" />
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max max-w-[200px] p-2 bg-slate-800 text-white text-[10px] font-bold rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center">
                                    Days in a row you've focused for at least {streakGoal} hour{streakGoal === 1 ? '' : 's'}. Keep it up!
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45" />
                                </div>
                            </div>
                        }
                        bgClass="bg-slate-900 dark:bg-white/5"
                        colorClass="text-orange-500"
                    />
                </div>

                {/* Inline Streak Goal — compact, requires confirmation to change */}
                <StreakGoalEditor streakGoal={streakGoal} onStreakGoalChange={props.onStreakGoalChange} />


                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Subject Distribution */}
                    <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 flex flex-col justify-between">
                        <div className="flex justify-between items-center mb-6">
                            <div className="group relative flex items-center gap-2">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <PieChart size={16} className="text-indigo-500" /> Subject Split
                                </h3>
                                <Info size={12} className="text-slate-400 cursor-help" />
                                <div className="absolute bottom-full mb-2 left-0 w-max max-w-[200px] p-2 bg-slate-800 text-white text-[10px] font-bold rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                    How your focus time is distributed across different subjects.
                                    <div className="absolute top-full left-4 w-2 h-2 bg-slate-800 rotate-45" />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-8">
                            <DonutChart data={donutData} />
                            <div className="space-y-3 flex-1">
                                {donutData.map((item) => (
                                    <div key={item.label} className="flex justify-between items-center text-xs">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: item.color }} />
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
                            <div className="flex items-center gap-3 mb-2 text-emerald-500 group relative">
                                <Activity size={20} />
                                <span className="text-xs font-bold uppercase tracking-widest">Consistency</span>
                                <Info size={12} className="cursor-help" />
                                <div className="absolute bottom-full mb-2 left-0 w-max max-w-[220px] p-2 bg-slate-800 text-white text-[10px] font-bold rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                    Percentage of days you met your 1-hour focus goal within the selected period.
                                    <div className="absolute top-full left-4 w-2 h-2 bg-slate-800 rotate-45" />
                                </div>
                            </div>
                            <div className="text-4xl font-display font-bold text-slate-900 dark:text-white mb-1">
                                {analyticsData.consistency}%
                            </div>
                            <div className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden mt-4">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${analyticsData.consistency}%` }} />
                            </div>
                        </div>

                        {/* SMART BALANCE CARD (Replaced Reviews/Lagging) */}
                        <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 border border-white/10 relative overflow-hidden flex flex-col justify-between text-white">
                            <div>
                                <div className="flex items-center gap-3 mb-3 text-white/80 group relative">
                                    <Scale size={20} />
                                    <span className="text-xs font-bold uppercase tracking-widest">Study Balance</span>
                                    <Info size={12} className="cursor-help" />
                                    <div className="absolute bottom-full mb-2 left-0 w-max max-w-[220px] p-2 bg-slate-800 text-white text-[10px] font-bold rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                        Indicates if you're over-focusing on one subject. A balanced approach prevents burnout.
                                        <div className="absolute top-full left-4 w-2 h-2 bg-slate-800 rotate-45" />
                                    </div>
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
                            <div className="group relative flex items-center gap-2">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <Calendar size={16} className="text-emerald-500" /> Activity Map
                                </h3>
                                <Info size={12} className="text-slate-400 cursor-help" />
                                <div className="absolute bottom-full mb-2 left-0 w-max max-w-[220px] p-2 bg-slate-800 text-white text-[10px] font-bold rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                    Your daily focus intensity. Darker squares mean more focus time.
                                    <div className="absolute top-full left-4 w-2 h-2 bg-slate-800 rotate-45" />
                                </div>
                            </div>
                            {/* NEW: Total Duration Display */}
                            <div className="mt-2">
                                <span className="text-3xl font-mono font-bold text-white tracking-tight">
                                    {formatDuration(analyticsData.totalMinutes)}
                                </span>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-2">
                                    Focused {timeRange === 'daily' ? 'Today' : timeRange === 'weekly' ? 'This Week' : timeRange === 'monthly' ? 'This Month' : 'This Year'}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-sm bg-rose-500/40 border border-rose-500/30" />
                                <span className="text-[9px] font-bold text-slate-500 uppercase">&gt;0H</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-sm bg-amber-500/60 border border-amber-500/40" />
                                <span className="text-[9px] font-bold text-slate-500 uppercase">{activityThresholds.level2 / 60}H+</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-sm bg-lime-500/70 border border-lime-500/50 shadow-[0_0_8px_rgba(132,204,22,0.4)]" />
                                <span className="text-[9px] font-bold text-slate-500 uppercase">{activityThresholds.level3 / 60}H+</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-sm bg-emerald-600 border border-emerald-500 shadow-[0_0_15px_rgba(5,150,105,0.6)]" />
                                <span className="text-[9px] font-bold text-slate-500 uppercase">{activityThresholds.level4 / 60}H+</span>
                            </div>
                            <button onClick={onOpenSettings} className="ml-1 p-1 rounded-full text-slate-500 hover:text-white hover:bg-white/10 transition-colors" title="Customize Thresholds">
                                <Settings2 size={12} />
                            </button>
                        </div>
                    </div>
                    <Heatmap sessions={sessions} range={timeRange} thresholds={activityThresholds} subjectColorMap={subjectColorMap} />
                </div>

                {/* Confirmation Modal */}
                <ConfirmationModal
                    isOpen={showStopConfirm}
                    onClose={() => setShowStopConfirm(false)}
                    onConfirm={handleConfirmStop}
                    title="End Stopwatch Session?"
                    message="Are you sure you want to end this stopwatch session and generate a report?"
                    confirmText="End & Save Report"
                    cancelText="Cancel"
                    confirmVariant="danger"
                />

                <TimerSettingsModal
                    isOpen={showSettings}
                    onClose={() => setShowSettings(false)}
                    durations={durations}
                    onUpdate={onUpdateDurations}
                />

                <ReportCardModal
                    isOpen={showReportCard}
                    onClose={() => setShowReportCard(false)}
                    timeRange={timeRange}
                    analyticsData={analyticsData}
                    subjectColorMap={subjectColorMap}
                    username={username}
                />

                {/* New Stopwatch Modals */}
                <RecentReportsModal
                    isOpen={showRecentReports}
                    onClose={() => setShowRecentReports(false)}
                    recentSessions={sessions}
                    onSelectSession={(session) => {
                        setSelectedStopwatchSession(session);
                        setShowRecentReports(false);
                    }}
                    subjectColorMap={subjectColorMap}
                />

                <SessionReportCardModal
                    isOpen={!!selectedStopwatchSession}
                    onClose={() => setSelectedStopwatchSession(null)}
                    session={selectedStopwatchSession}
                    subjectColor={selectedStopwatchSession ? subjectColorMap[selectedStopwatchSession.subject] : '#6366f1'}
                />
            </div>
        </>
    );
});

export default FocusTimer;