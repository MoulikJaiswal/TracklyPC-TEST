import React, { useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Flame, Layers, Clock, Activity, Target, Share2, TrendingUp, CheckCircle2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { Session, ActivityThresholds } from '../types';

interface ReportCardProps {
    isOpen: boolean;
    onClose: () => void;
    timeRange: 'daily' | 'weekly' | 'monthly' | 'yearly';
    analyticsData: {
        totalMinutes: number;
        sessionCount: number;
        subjectDist: Record<string, number>;
        currentStreak: number;
        consistency: number;
    };
    subjectColorMap: Record<string, string>;
    username?: string;
}

const formatDuration = (totalMinutes: number) => {
    if (isNaN(totalMinutes)) return "0h 0m";
    const roundedMinutes = Math.round(totalMinutes);
    const h = Math.floor(roundedMinutes / 60);
    const m = roundedMinutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
};

export const ReportCardModal: React.FC<ReportCardProps> = ({
    isOpen,
    onClose,
    timeRange,
    analyticsData,
    subjectColorMap,
    username = "Trackly User"
}) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadSuccess, setDownloadSuccess] = useState(false);

    // Calculate top subjects
    const topSubjects = useMemo(() => {
        return Object.entries(analyticsData.subjectDist)
            .filter(([_, val]) => val > 0)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([label, value]) => ({
                label,
                value,
                color: subjectColorMap[label] || '#6366f1' // default indigo
            }));
    }, [analyticsData.subjectDist, subjectColorMap]);

    if (!isOpen) return null;

    const handleDownload = async () => {
        if (!cardRef.current) return;

        try {
            setIsDownloading(true);
            setDownloadSuccess(false);

            // Enhance quality for retina displays
            const dataUrl = await toPng(cardRef.current, {
                quality: 1.0,
                pixelRatio: 2, // High resolution for sharing
                filter: (node) => {
                    // Filter out any interactive elements if necessary, but standard DOM is fine
                    return true;
                }
            });

            const link = document.createElement('a');
            link.download = `Trackly-${timeRange}-Stats.png`;
            link.href = dataUrl;
            link.click();

            setDownloadSuccess(true);
            setTimeout(() => setDownloadSuccess(false), 3000);
        } catch (err) {
            console.error('Failed to generate report card image:', err);
            // Optionally could add a toast here for error
        } finally {
            setIsDownloading(false);
        }
    };

    const periodLabels = {
        daily: "Today's",
        weekly: "This Week's",
        monthly: "This Month's",
        yearly: "This Year's"
    };

    const gradientColors = {
        daily: 'from-emerald-600 to-teal-800',
        weekly: 'from-indigo-600 to-violet-800',
        monthly: 'from-blue-600 to-indigo-800',
        yearly: 'from-amber-600 to-orange-800'
    };

    const accentColor = {
        daily: 'text-emerald-400',
        weekly: 'text-indigo-400',
        monthly: 'text-blue-400',
        yearly: 'text-amber-400'
    };

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 lg:p-12 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            {/* Close Overlay */}
            <div className="absolute inset-0" onClick={onClose} />

            <div className="relative z-10 w-full max-w-sm flex flex-col items-center">

                {/* The Shareable Card to be captured */}
                <div
                    ref={cardRef}
                    className={`relative w-full min-h-[480px] rounded-[2rem] overflow-hidden bg-gradient-to-br ${gradientColors[timeRange]} shadow-2xl flex flex-col p-6 sm:p-8 text-white animate-in zoom-in-95 duration-500`}
                >
                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-black/20 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/3 pointer-events-none" />

                    {/* Header */}
                    <div className="flex justify-between items-start mb-auto relative z-10 w-full">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Activity size={18} className="text-white/80" />
                                <h2 className="text-sm font-bold uppercase tracking-widest text-white/80">Trackly</h2>
                            </div>
                            <h1 className="text-xl font-display font-bold tracking-tight">
                                {periodLabels[timeRange]} Focus Summary
                            </h1>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-xl">
                            <Target size={24} className="text-white/90" />
                        </div>
                    </div>

                    {/* Main Metric - Centered & Huge */}
                    <div className="flex flex-col items-center justify-center text-center my-auto py-8 relative z-10">
                        <span className="text-xs font-bold uppercase tracking-widest text-white/60 mb-2">Total Time</span>
                        <div className="text-7xl font-display font-black tracking-tighter tabular-nums leading-none mb-1 drop-shadow-xl">
                            {formatDuration(analyticsData.totalMinutes)}
                        </div>
                        <div className="flex items-center gap-2 mt-4 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10">
                            <Layers size={14} className={accentColor[timeRange]} />
                            <span className="text-sm font-bold">{analyticsData.sessionCount} Sessions Completed</span>
                        </div>
                    </div>

                    {/* Footer Stats Grid */}
                    <div className="mt-auto relative z-10 space-y-4">

                        {/* Secondary Stats */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex flex-col justify-between">
                                <div className="flex items-center gap-2 mb-2 opacity-80">
                                    <Flame size={16} className="text-orange-400" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Streak</span>
                                </div>
                                <div className="text-2xl font-bold font-display">{analyticsData.currentStreak} <span className="text-sm font-medium text-white/50">Days</span></div>
                            </div>
                            <div className="bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex flex-col justify-between">
                                <div className="flex items-center gap-2 mb-2 opacity-80">
                                    <TrendingUp size={16} className={accentColor[timeRange]} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Consistency</span>
                                </div>
                                <div className="text-2xl font-bold font-display">{analyticsData.consistency}<span className="text-lg font-bold text-white/50">%</span></div>
                            </div>
                        </div>

                        {/* Top Subjects Minimal Bar */}
                        {topSubjects.length > 0 && (
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Top Subjects</span>
                                </div>

                                {/* Progress Bar Visualization */}
                                <div className="w-full h-2 rounded-full overflow-hidden flex gap-0.5 bg-black/20 mb-3">
                                    {topSubjects.map((sub, i) => (
                                        <div
                                            key={i}
                                            className="h-full"
                                            style={{
                                                width: `${(sub.value / analyticsData.totalMinutes) * 100}%`,
                                                backgroundColor: sub.color
                                            }}
                                        />
                                    ))}
                                </div>

                                {/* Legend */}
                                <div className="flex flex-wrap justify-between gap-x-4 gap-y-2">
                                    {topSubjects.map((sub, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: sub.color }} />
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold leading-tight truncate max-w-[80px]" title={sub.label}>{sub.label}</span>
                                                <span className="text-[9px] font-mono text-white/60">{formatDuration(sub.value)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Watermark */}
                        <div className="w-full text-center pt-2">
                            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">
                                @{username} • trackly.app
                            </span>
                        </div>
                    </div>
                </div>

                {/* Actions outside the captured area */}
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
                        className={`flex-1 ml-4 h-12 flex items-center justify-center gap-2 rounded-2xl text-white font-bold transition-all shadow-lg backdrop-blur-md border ${downloadSuccess
                            ? 'bg-emerald-500/80 border-emerald-400 hover:bg-emerald-500 shadow-emerald-500/20'
                            : `bg-${accentColor[timeRange].split('-')[1]}-600/80 hover:bg-white/20 border-white/20 hover:border-white/40 shadow-${accentColor[timeRange].split('-')[1]}-500/20`
                            } ${isDownloading ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                    >
                        {isDownloading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Generating...</span>
                            </>
                        ) : downloadSuccess ? (
                            <>
                                <CheckCircle2 size={20} />
                                <span>Saved to Device!</span>
                            </>
                        ) : (
                            <>
                                <Download size={20} />
                                <span>Save Image</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
