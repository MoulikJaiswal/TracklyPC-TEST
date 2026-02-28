import React, { useState } from 'react';
import { X, Sparkles, Wrench, ChevronRight, Zap, Pencil, Users, LayoutDashboard, Timer, Bug, CheckCircle2, CalendarClock, BarChart2 } from 'lucide-react';
import { createPortal } from 'react-dom';


interface PatchItem {
    icon: React.ReactNode;
    text: string;
}

const NEW_FEATURES: PatchItem[] = [
    { icon: <Timer size={14} />, text: 'Stopwatch with Reports — a new stopwatch mode that auto-generates a session report when you stop' },
    { icon: <CalendarClock size={14} />, text: 'Dashboard Countdown — pin your exam date and watch a live countdown right on the home screen' },
    { icon: <Pencil size={14} />, text: 'Session Naming — rename any study or focus session directly from the dashboard' },
    { icon: <LayoutDashboard size={14} />, text: 'Revamped Mobile UI — smoother bottom navigation, new mobile header, and a cleaner hero card' },
    { icon: <BarChart2 size={14} />, text: 'Better Test Graphs — improved breakdown charts with per-subject accuracy and mistake patterns' },
    { icon: <Users size={14} />, text: 'Shareable Friend Stats — interactive daily, weekly & yearly views you can share with study buddies' },
    { icon: <Zap size={14} />, text: 'Improved Focus Timer — high-precision wall-clock tracking, fewer bugs, smoother UX overall' },
];

const BUG_FIXES: PatchItem[] = [
    { icon: <Bug size={14} />, text: 'Fixed presence state not updating correctly in Realtime Database after app refactor' },
    { icon: <Bug size={14} />, text: 'Fixed historical focus-time stats not aggregating properly in the Stats tab' },
    { icon: <Bug size={14} />, text: 'Fixed subject-split data not syncing to friends\' presence view' },
];

export const PatchNotesModal: React.FC = () => {
    const [showModal, setShowModal] = useState(false);

    const handleOpen = () => setShowModal(true);
    const handleClose = () => setShowModal(false);

    return createPortal(
        <>
            {/* Floating badge — always pinned to bottom-right */}
            <button
                onClick={handleOpen}
                className="fixed bottom-24 md:bottom-6 right-4 z-[200] flex items-center gap-2 px-3 py-2 rounded-2xl text-white text-xs font-bold shadow-2xl transition-all hover:scale-105 active:scale-95"
                style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    boxShadow: '0 8px 32px rgba(99,102,241,0.5)',
                }}
            >
                <Sparkles size={14} className="text-yellow-300 animate-pulse" />
                <span>What's New · Feb 28</span>
                <ChevronRight size={12} className="opacity-70" />
            </button>

            {/* Full modal */}
            {showModal && (
                <div
                    className="fixed inset-0 z-[300] flex items-end md:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
                >
                    <div className="w-full md:max-w-lg rounded-[2rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 md:zoom-in-95 duration-300"
                        style={{ background: 'linear-gradient(160deg, #0f0f1a 0%, #1a1040 100%)' }}
                    >
                        {/* Header */}
                        <div className="relative px-6 pt-6 pb-4 overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500 opacity-10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

                            <div className="flex items-start justify-between relative z-10">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="p-1.5 rounded-xl bg-indigo-500/20 text-indigo-400">
                                            <Sparkles size={16} className="text-yellow-300" />
                                        </div>
                                        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-400">Changelog</span>
                                    </div>
                                    <h2 className="text-2xl font-bold text-white tracking-tight">What's New</h2>
                                    <p className="text-sm text-slate-400 font-medium mt-0.5">February 28, 2026 · v2.2</p>
                                </div>
                                <button
                                    onClick={handleClose}
                                    className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="px-6 pb-6 space-y-5 max-h-[60vh] overflow-y-auto no-scrollbar">
                            {/* New Features */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="p-1 rounded-lg bg-indigo-500/20 text-indigo-400">
                                        <Zap size={12} />
                                    </div>
                                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400">New Features</h3>
                                </div>
                                <div className="space-y-2">
                                    {NEW_FEATURES.map((item, i) => (
                                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all">
                                            <div className="text-indigo-400 mt-0.5 shrink-0">{item.icon}</div>
                                            <p className="text-sm text-slate-300 leading-snug">{item.text}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Bug Fixes */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400">
                                        <Wrench size={12} />
                                    </div>
                                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">Bug Fixes</h3>
                                </div>
                                <div className="space-y-2">
                                    {BUG_FIXES.map((item, i) => (
                                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all">
                                            <div className="text-emerald-400 mt-0.5 shrink-0">{item.icon}</div>
                                            <p className="text-sm text-slate-300 leading-snug">{item.text}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 pb-6">
                            <button
                                onClick={handleClose}
                                className="w-full py-3 rounded-2xl text-white font-bold text-sm uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                            >
                                <CheckCircle2 size={16} />
                                Got it, thanks!
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>,
        document.body
    );
};
