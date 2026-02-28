import React, { useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Clock, Activity, Target, CheckCircle2, AlertCircle, TrendingDown, History } from 'lucide-react';
import { toPng } from 'html-to-image';
import { Session } from '../types';

interface SessionReportCardProps {
    isOpen: boolean;
    onClose: () => void;
    session: Session | null;
    subjectColor?: string;
}

const formatDuration = (totalSeconds: number | undefined) => {
    if (!totalSeconds || isNaN(totalSeconds)) return "0m 0s";
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
};

const formatTime = (totalSeconds: number | undefined) => {
    if (!totalSeconds || isNaN(totalSeconds)) return "0.0s";
    return totalSeconds < 60 ? `${totalSeconds.toFixed(1)}s` : `${Math.floor(totalSeconds / 60)}m ${Math.floor(totalSeconds % 60)}s`;
};

export const SessionReportCardModal: React.FC<SessionReportCardProps> = ({
    isOpen,
    onClose,
    session,
    subjectColor = '#6366f1' // default indigo
}) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadSuccess, setDownloadSuccess] = useState(false);

    const stats = useMemo(() => {
        if (!session) return null;
        const logs = session.questionLogs || [];
        const fastest = logs.length > 0 ? [...logs].sort((a, b) => a.duration - b.duration)[0] : null;
        const slowest = logs.length > 0 ? [...logs].sort((a, b) => b.duration - a.duration)[0] : null;
        const avg = logs.length > 0 ? logs.reduce((acc, l) => acc + l.duration, 0) / logs.length : 0;

        const accuracy = session.attempted > 0 ? Math.round((session.correct / session.attempted) * 100) : 0;

        return { fastest, slowest, avg, accuracy, logs };
    }, [session]);

    if (!isOpen || !session || !stats) return null;

    const handleDownload = async () => {
        if (!cardRef.current) return;
        try {
            setIsDownloading(true);
            setDownloadSuccess(false);
            const dataUrl = await toPng(cardRef.current, { quality: 1.0, pixelRatio: 2 });
            const link = document.createElement('a');
            link.download = `Trackly-Stopwatch-${new Date(session.timestamp).toLocaleDateString().replace(/\//g, '-')}.png`;
            link.href = dataUrl;
            link.click();
            setDownloadSuccess(true);
            setTimeout(() => setDownloadSuccess(false), 3000);
        } catch (err) {
            console.error('Failed to generate report card:', err);
        } finally {
            setIsDownloading(false);
        }
    };

    const gradientClass = 'from-slate-900 to-indigo-950/80';

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 lg:p-12 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="absolute inset-0" onClick={onClose} />
            <div className="relative z-10 w-full max-w-[420px] flex flex-col items-center">
                <div
                    ref={cardRef}
                    className={`relative w-full rounded-[2rem] overflow-hidden bg-gradient-to-br ${gradientClass} shadow-2xl flex flex-col p-6 sm:p-8 text-white animate-in zoom-in-95 duration-500`}
                >
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />

                    {/* Header */}
                    <div className="flex justify-between items-start mb-6 relative z-10 w-full">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Activity size={16} className="text-white/80" />
                                <h2 className="text-xs font-bold uppercase tracking-widest text-white/80">Stopwatch Report</h2>
                            </div>
                            <h1 className="text-2xl font-display font-bold tracking-tight text-white flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: subjectColor }} />
                                {session.subject}
                            </h1>
                            <p className="text-sm font-medium text-white/60">{new Date(session.timestamp).toLocaleString()}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-xl" style={{ color: subjectColor }}>
                            <History size={20} />
                        </div>
                    </div>

                    {/* Main Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4 relative z-10">
                        <div className="bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center flex flex-col justify-center items-center">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1">Total Time</span>
                            <div className="text-4xl font-display font-black tracking-tighter tabular-nums drop-shadow-md">
                                {formatDuration(session.duration)}
                            </div>
                        </div>
                        <div className="bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center flex flex-col justify-center items-center">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1">Accuracy</span>
                            <div className="text-4xl font-display font-black tracking-tighter tabular-nums drop-shadow-md text-emerald-400">
                                {stats.accuracy}%
                            </div>
                        </div>
                    </div>

                    {/* Detailed Analysis */}
                    <div className="space-y-3 relative z-10">
                        {/* Questions Summary */}
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex divide-x divide-white/10">
                            <div className="flex flex-col flex-1 items-center px-1">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-white/60">Done</span>
                                <span className="text-lg font-bold">{session.attempted}</span>
                            </div>
                            <div className="flex flex-col flex-1 items-center px-1">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">Correct</span>
                                <span className="text-lg font-bold text-emerald-400">{session.correct}</span>
                            </div>
                            <div className="flex flex-col flex-1 items-center px-1">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-rose-400">Mistakes</span>
                                <span className="text-lg font-bold text-rose-400">{session.attempted - session.correct}</span>
                            </div>
                        </div>

                        {/* Timing Insights */}
                        {stats.logs.length > 0 && (
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Per Question</span>
                                    <span className="text-xs font-bold text-indigo-300">Avg: {formatTime(stats.avg)}</span>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between bg-black/20 p-2 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-2">
                                            <Target size={14} className="text-emerald-400" />
                                            <span className="text-xs font-medium text-white/80">Fastest</span>
                                        </div>
                                        <span className="text-sm font-bold font-mono">{formatTime(stats.fastest?.duration)}</span>
                                    </div>
                                    <div className="flex items-center justify-between bg-black/20 p-2 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-2">
                                            <TrendingDown size={14} className="text-rose-400" />
                                            <span className="text-xs font-medium text-white/80">Slowest</span>
                                        </div>
                                        <span className="text-sm font-bold font-mono text-rose-300">{formatTime(stats.slowest?.duration)}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Error Breakdown */}
                        {(session.attempted - session.correct) > 0 && (
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-white/70 block mb-2">Error Breakdown</span>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    {session.mistakes.silly ? <div className="flex justify-between items-center bg-amber-500/20 px-3 py-1.5 rounded-lg border border-amber-500/20"><span className="text-amber-300 font-medium">Silly</span><span className="font-bold">{session.mistakes.silly}</span></div> : null}
                                    {session.mistakes.calculation ? <div className="flex justify-between items-center bg-rose-500/20 px-3 py-1.5 rounded-lg border border-rose-500/20"><span className="text-rose-300 font-medium">Calc</span><span className="font-bold">{session.mistakes.calculation}</span></div> : null}
                                    {session.mistakes.concept ? <div className="flex justify-between items-center bg-indigo-500/20 px-3 py-1.5 rounded-lg border border-indigo-500/20"><span className="text-indigo-300 font-medium">Concept</span><span className="font-bold">{session.mistakes.concept}</span></div> : null}
                                    {session.mistakes.time ? <div className="flex justify-between items-center bg-slate-500/20 px-3 py-1.5 rounded-lg border border-white/10"><span className="text-slate-300 font-medium">Time</span><span className="font-bold">{session.mistakes.time}</span></div> : null}
                                </div>
                            </div>
                        )}

                    </div>

                    <div className="w-full text-center pt-6 relative z-10">
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">trackly.app</span>
                    </div>
                </div>

                {/* Actions outside */}
                <div className="w-full flex justify-between items-center mt-6 animate-in slide-in-from-bottom-4 duration-500 delay-100">
                    <button
                        onClick={onClose}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-md border border-white/10 hover:border-white/30"
                    >
                        <X size={24} />
                    </button>
                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className={`flex-1 ml-4 h-12 flex items-center justify-center gap-2 rounded-2xl text-white font-bold transition-all shadow-lg backdrop-blur-md border ${downloadSuccess ? 'bg-emerald-500/80 border-emerald-400 shadow-emerald-500/20' : 'bg-indigo-600/80 hover:bg-white/20 border-white/20 shadow-indigo-500/20'} ${isDownloading ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                    >
                        {isDownloading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Generating...</span>
                            </>
                        ) : downloadSuccess ? (
                            <>
                                <CheckCircle2 size={20} />
                                <span>Saved!</span>
                            </>
                        ) : (
                            <>
                                <Download size={20} />
                                <span>Save Report</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
