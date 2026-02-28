import React from 'react';
import { createPortal } from 'react-dom';
import { X, Clock, Activity, Target, Brain, AlertCircle } from 'lucide-react';
import { Session } from '../types';

interface RecentReportsModalProps {
    isOpen: boolean;
    onClose: () => void;
    recentSessions: Session[];
    onSelectSession: (session: Session) => void;
    subjectColorMap: Record<string, string>;
}

const formatDurationShort = (totalSeconds: number | undefined) => {
    if (!totalSeconds || isNaN(totalSeconds)) return "0m";
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
};

export const RecentReportsModal: React.FC<RecentReportsModalProps> = ({
    isOpen,
    onClose,
    recentSessions,
    onSelectSession,
    subjectColorMap
}) => {
    if (!isOpen) return null;

    const stopwatchSessions = recentSessions.filter(s => s.type === 'stopwatch').slice(0, 20);

    return createPortal(
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="absolute inset-0" onClick={onClose} />
            <div className="relative z-10 w-full max-w-lg bg-white dark:bg-[#0B0F19] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-200 dark:border-white/10 animate-in slide-in-from-bottom-8 duration-500">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center border border-indigo-500/20">
                            <Activity size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Recent Reports</h2>
                            <p className="text-xs text-slate-500 font-medium">Last 20 Stopwatch Sessions</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* List */}
                <div className="p-6 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
                    {stopwatchSessions.length === 0 ? (
                        <div className="text-center py-10 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                            <Target size={48} strokeWidth={1.5} className="mb-4 opacity-50" />
                            <p className="text-sm font-medium">No stopwatch sessions yet.</p>
                            <p className="text-xs mt-1">Start a stopwatch deep work session to generate a report!</p>
                        </div>
                    ) : (
                        stopwatchSessions.map((session) => {
                            const acc = session.attempted > 0 ? Math.round((session.correct / session.attempted) * 100) : 0;
                            const color = subjectColorMap[session.subject] || '#6366f1';

                            return (
                                <button
                                    key={session.id}
                                    onClick={() => onSelectSession(session)}
                                    className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 transition-all text-left group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white shadow-sm" style={{ backgroundColor: color }}>
                                            {session.subject.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-indigo-500 transition-colors">
                                                {session.subject}
                                            </h3>
                                            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                                                <Clock size={12} /> {new Date(session.timestamp).toLocaleDateString()} at {new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 text-right">
                                        <div className="hidden sm:flex flex-col">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Questions</span>
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{session.attempted}</span>
                                        </div>
                                        <div className="hidden sm:flex flex-col">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Time</span>
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{formatDurationShort(session.duration)}</span>
                                        </div>
                                        <div className="flex flex-col pr-2 border-r border-slate-200 dark:border-white/10">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Accuracy</span>
                                            <span className={`text-sm font-bold ${acc >= 80 ? 'text-emerald-500' : acc >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                                                {acc}%
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};
