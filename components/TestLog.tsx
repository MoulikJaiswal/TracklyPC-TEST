

import React, { useState, useMemo, memo, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Trash2, Trophy, Clock, Calendar, UploadCloud, FileText, Image as ImageIcon, Atom, Zap, Calculator, BarChart3, AlertCircle, ChevronRight, PieChart, Filter, Target, Download, TrendingUp, TrendingDown, Crown, Lock, GripHorizontal, Check, Brain, Activity, Layers, BookOpen, ListChecks, Loader2, ImagePlus, Search, ArrowDownWideNarrow, ArrowUpNarrowWide, Hammer, Save, Info } from 'lucide-react';
import { TestResult, Target as TargetType, SubjectBreakdown, MistakeCounts } from '../types';
import { Card } from './Card';
import { MISTAKE_TYPES, JEE_SYLLABUS } from '../constants';
import { AdUnit } from './AdUnit';
import { ConfirmationModal } from './ConfirmationModal';

// Helper for local date string YYYY-MM-DD
const getLocalDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface TestLogProps {
  tests: TestResult[];
  onSave: (test: Omit<TestResult, 'id' | 'timestamp' | 'stream'>) => void;
  onDelete: (id: string) => void;
}

const DEFAULT_BREAKDOWN: SubjectBreakdown = {
  correct: 0,
  incorrect: 0,
  unattempted: 0,
  calcErrors: 0,
  otherErrors: 0,
  mistakes: {}
};

// --- SAFE GRAPH UTILS ---
const safeNum = (n: any) => Number.isFinite(n) ? n : 0;
const safeDiv = (n: number, d: number) => d === 0 ? 0 : n / d;

// --- NEW STAT INPUT COMPONENTS ---
const StatInput = memo(({ label, value, onChange, max, color }: { label: string, value: number, onChange: (val: number) => void, max: number, color: 'emerald' | 'rose' }) => {
    const theme = {
        emerald: { text: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
        rose: { text: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' }
    }[color];

    const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value);
        if (isNaN(val)) {
            onChange(0);
        } else {
            onChange(Math.max(0, Math.min(val, max)));
        }
    };

    return (
        <div className={`p-3 rounded-2xl border ${theme.bg} ${theme.border} transition-colors`}>
            <label className={`block text-center text-[10px] font-bold uppercase tracking-widest ${theme.text} mb-2`}>{label}</label>
            <div className="flex items-center justify-center gap-2">
                <button
                    type="button"
                    onClick={() => onChange(Math.max(0, value - 1))}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-black/5 dark:bg-black/20 hover:bg-black/10 dark:hover:bg-black/40 text-theme-text-secondary transition-colors"
                >
                    -
                </button>
                <input
                    type="number"
                    value={value}
                    onChange={handleManualChange}
                    onFocus={(e) => e.target.select()}
                    className="w-16 text-center bg-transparent text-3xl font-mono font-bold text-theme-text outline-none appearance-none"
                    style={{ MozAppearance: 'textfield' }} // For Firefox
                />
                <button
                    type="button"
                    onClick={() => onChange(Math.min(max, value + 1))}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-black/5 dark:bg-black/20 hover:bg-black/10 dark:hover:bg-black/40 text-theme-text-secondary transition-colors"
                >
                    +
                </button>
            </div>
        </div>
    );
});

const StatDisplay = memo(({ label, value, color }: { label: string, value: number, color: 'slate' }) => {
    return (
        <div className={`relative p-3 rounded-2xl border bg-theme-bg-tertiary/40 border-theme-border h-full flex flex-col justify-center`}>
            <label className={`block text-center text-[10px] font-bold uppercase tracking-widest text-theme-text-secondary mb-2`}>{label}</label>
            <div className="flex items-center justify-center">
                <span className="text-3xl font-mono font-bold text-theme-text-secondary">{value}</span>
            </div>
        </div>
    );
});

// --- TEST REPORT MODAL ---
const TestReportModal = memo(({ test, onClose }: { test: TestResult, onClose: () => void }) => {
    const percentage = safeDiv(test.marks, test.total || 300) * 100;
    
    // Helper for subject stats
    const getSubStats = (sub: 'Physics' | 'Chemistry' | 'Maths') => {
        const data = test.breakdown?.[sub] || DEFAULT_BREAKDOWN;
        const totalQs = (Number(data.correct)||0) + (Number(data.incorrect)||0) + (Number(data.unattempted)||0);
        const score = ((Number(data.correct)||0) * 4) - (Number(data.incorrect)||0);
        return { ...data, totalQs, score };
    };

    const physics = getSubStats('Physics');
    const chemistry = getSubStats('Chemistry');
    const maths = getSubStats('Maths');

    return createPortal(
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-theme-bg w-full max-w-2xl rounded-3xl shadow-2xl border border-theme-border overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-6 border-b border-theme-border flex justify-between items-start bg-theme-bg-tertiary/40">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-theme-accent/10 text-theme-accent border border-theme-accent/20">
                                {test.testType || 'Mock Test'}
                            </span>
                            <span className="text-[10px] font-bold text-theme-text-secondary uppercase tracking-widest">{test.date}</span>
                        </div>
                        <h2 className="text-2xl font-bold text-theme-text leading-tight">{test.name}</h2>
                        {test.coachingName && <p className="text-xs text-theme-text-secondary font-medium mt-1">{test.coachingName}</p>}
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-theme-bg-tertiary text-theme-text-secondary transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {/* Score Card */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        {/* Overall */}
                        <div className="p-4 rounded-2xl bg-theme-accent text-theme-text-on-accent flex flex-col justify-between relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2" />
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">Total Score</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-display font-bold">{test.marks}</span>
                                    <span className="text-sm opacity-60">/ {test.total}</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-end mt-4">
                                <span className="text-xs font-bold bg-black/20 px-2 py-1 rounded-lg">{Math.round(percentage)}%</span>
                                <Trophy size={20} className="text-yellow-300 opacity-80" />
                            </div>
                        </div>

                        {/* Temperament */}
                        <div className="p-4 rounded-2xl bg-theme-bg-tertiary/50 border border-theme-border flex flex-col justify-center items-center text-center">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-theme-text-secondary mb-2">Temperament</p>
                            <span className={`text-xl font-bold ${
                                test.temperament === 'Calm' ? 'text-emerald-500' : 
                                test.temperament === 'Focused' ? 'text-blue-500' :
                                test.temperament === 'Anxious' ? 'text-orange-500' : 'text-rose-500'
                            }`}>
                                {test.temperament}
                            </span>
                        </div>

                        {/* Accuracy (Calculated) */}
                        <div className="p-4 rounded-2xl bg-theme-bg-tertiary/50 border border-theme-border flex flex-col justify-center items-center text-center">
                             <div className="group relative flex items-center gap-2 mb-2">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-theme-text-secondary">Accuracy</p>
                                <Info size={12} className="text-theme-text-secondary cursor-help" />
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max max-w-[200px] p-2 bg-slate-800 text-white text-[10px] font-bold rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                    Percentage of correct answers out of total attempted questions.
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45" />
                                </div>
                             </div>
                             <span className="text-xl font-bold text-theme-text">
                                 {(() => {
                                     const totalAttempted = (physics.correct + physics.incorrect) + (chemistry.correct + chemistry.incorrect) + (maths.correct + maths.incorrect);
                                     const totalCorrect = physics.correct + chemistry.correct + maths.correct;
                                     return totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;
                                 })()}%
                             </span>
                        </div>
                    </div>

                    {/* Subject Breakdown */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-theme-text-secondary flex items-center gap-2">
                            <BarChart3 size={16} /> Subject Analysis
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                            {[
                                { label: 'Physics', data: physics, icon: Atom, opacity: 1 },
                                { label: 'Chemistry', data: chemistry, icon: Zap, opacity: 0.8 },
                                { label: 'Maths', data: maths, icon: Calculator, opacity: 0.6 }
                            ].map(sub => (
                                <div key={sub.label} className="bg-theme-bg-tertiary/50 rounded-xl p-3 border border-theme-border flex items-center gap-4">
                                    <div className="p-2.5 rounded-xl bg-theme-card text-theme-accent shadow-sm">
                                        <sub.icon size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className="text-sm font-bold text-theme-text">{sub.label}</span>
                                            <span className="text-sm font-mono font-bold text-theme-accent" style={{opacity: sub.opacity}}>{sub.data.score} <span className="text-[10px] text-theme-text-secondary font-sans font-medium opacity-60 uppercase">Marks</span></span>
                                        </div>
                                        <div className="flex h-2 rounded-full overflow-hidden bg-black/20 dark:bg-black/40">
                                            <div style={{ width: `${safeDiv(sub.data.correct, sub.data.totalQs) * 100}%` }} className="bg-emerald-500" />
                                            <div style={{ width: `${safeDiv(sub.data.incorrect, sub.data.totalQs) * 100}%` }} className="bg-rose-500" />
                                        </div>
                                        <div className="flex justify-between mt-1 text-[9px] font-bold uppercase text-theme-text-secondary/70 tracking-wider">
                                            <span>{sub.data.correct} Correct</span>
                                            <span>{sub.data.incorrect} Wrong</span>
                                            <span>{sub.data.unattempted} Skip</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Mistakes */}
                    <div className="mt-8">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-theme-text-secondary mb-3 flex items-center gap-2">
                            <AlertCircle size={16} /> Mistake Distribution
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {MISTAKE_TYPES.map(type => {
                                const count = (physics.mistakes?.[type.id as keyof MistakeCounts] || 0) + 
                                              (chemistry.mistakes?.[type.id as keyof MistakeCounts] || 0) + 
                                              (maths.mistakes?.[type.id as keyof MistakeCounts] || 0);
                                if (count === 0) return null;
                                return (
                                    <div key={type.id} className="flex items-center gap-2 px-3 py-1.5 bg-theme-bg-tertiary/50 rounded-lg border border-theme-border">
                                        <span className={type.color}>{type.icon}</span>
                                        <span className="text-[10px] font-bold uppercase text-theme-text-secondary">{type.label}</span>
                                        <span className="text-xs font-mono font-bold text-theme-text bg-theme-card px-1.5 rounded ml-1">{count}</span>
                                    </div>
                                )
                            })}
                            {(() => {
                                const totalMistakes = Object.values(physics.mistakes || {}).reduce((a,b) => a+(b||0),0) + 
                                                      Object.values(chemistry.mistakes || {}).reduce((a,b) => a+(b||0),0) + 
                                                      Object.values(maths.mistakes || {}).reduce((a,b) => a+(b||0),0);
                                return totalMistakes === 0 ? <p className="text-xs text-theme-text-secondary italic">No mistakes categorized for this test.</p> : null;
                            })()}
                        </div>
                    </div>
                </div>
                
                {test.attachment && (
                    <div className="p-4 border-t border-theme-border bg-theme-bg-tertiary/30">
                        <a 
                            href={test.attachment} 
                            download={test.fileName || "test-report"}
                            className="flex items-center justify-center gap-2 w-full py-3 bg-theme-text text-theme-bg rounded-xl font-bold uppercase text-xs tracking-widest hover:opacity-90 transition-opacity"
                        >
                            <Download size={16} /> Download {test.attachmentType === 'pdf' ? 'Question Paper' : 'Attachment'}
                        </a>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
});

// --- ANALYTICS COMPONENT ---
const TestAnalytics = memo(({ tests }: { tests: TestResult[] }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'subjects' | 'mistakes'>('overview');
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    const sortedTests = useMemo(() => {
        const recentTests = [...tests].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
        return recentTests.reverse();
    }, [tests]);

    const dataPoints = useMemo(() => {
        return sortedTests.map(t => {
            const total = safeNum(t.total) || 300;
            const marks = safeNum(t.marks);
            const p = t.breakdown?.Physics;
            const c = t.breakdown?.Chemistry;
            const m = t.breakdown?.Maths;

            const subPct = (sub: SubjectBreakdown | undefined) => {
                if (!sub) return 0;
                const correct = Number(sub.correct) || 0;
                const incorrect = Number(sub.incorrect) || 0;
                const unattempted = Number(sub.unattempted) || 0;
                const attempted = correct + incorrect;
                const subTotal = attempted + unattempted;
                const score = (correct * 4) - incorrect;
                const max = subTotal * 4;
                return max > 0 ? Math.max(0, (score / max) * 100) : 0;
            };

            return {
                id: t.id,
                date: t.date,
                name: t.name,
                overall: safeDiv(marks, total) * 100,
                Physics: subPct(p),
                Chemistry: subPct(c),
                Maths: subPct(m),
                temperament: t.temperament
            };
        });
    }, [sortedTests]);

    const mistakeStats = useMemo(() => {
        const counts: Record<string, number> = {};
        sortedTests.forEach(t => {
            (['Physics', 'Chemistry', 'Maths'] as const).forEach(sub => {
                const mistakes = t.breakdown?.[sub]?.mistakes || {};
                Object.entries(mistakes).forEach(([type, count]) => {
                    counts[type] = (counts[type] || 0) + (Number(count) || 0);
                });
            });
        });
        const total = (Object.values(counts) as number[]).reduce((a, b) => a + b, 0);
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .map(([id, count]) => ({ id, count, pct: safeDiv(count, total) * 100 }));
    }, [sortedTests]);

    if (dataPoints.length < 2) return null;

    const width = 1000;
    const height = 300; 
    const paddingX = 20;
    const paddingY = 40;
    const graphWidth = width - (paddingX * 2);
    const graphHeight = height - (paddingY * 2);

    const getX = (i: number) => paddingX + (safeDiv(i, dataPoints.length - 1) * graphWidth);
    const getY = (val: number) => (height - paddingY) - (safeDiv(val, 100) * graphHeight);

    const generatePath = (key: 'overall' | 'Physics' | 'Chemistry' | 'Maths') => {
        return dataPoints.map((d, i) => 
            `${i === 0 ? 'M' : 'L'} ${safeNum(getX(i))} ${safeNum(getY(d[key]))}`
        ).join(' ');
    };

    const generateAreaPath = (key: 'overall' | 'Physics' | 'Chemistry' | 'Maths') => {
        if (dataPoints.length === 0) return '';
        const linePath = generatePath(key);
        const lastX = getX(dataPoints.length - 1);
        const firstX = getX(0);
        const bottomY = height - paddingY;
        return `${linePath} L ${safeNum(lastX)} ${safeNum(bottomY)} L ${safeNum(firstX)} ${safeNum(bottomY)} Z`;
    };

    return (
        <Card className="p-0 overflow-hidden border-theme-accent/20 flex flex-col h-full bg-theme-bg-tertiary/20">
            <div className="p-4 border-b border-theme-border flex flex-col md:flex-row justify-between items-center gap-4 bg-theme-card/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-theme-accent text-theme-text-on-accent rounded-xl shadow-lg" style={{ boxShadow: '0 4px 15px -3px rgba(var(--theme-accent-rgb), 0.3)'}}>
                        <TrendingUp size={20} />
                    </div>
                    <div>
                        <div className="group relative flex items-center gap-2">
                           <h3 className="text-sm font-bold text-theme-text uppercase tracking-wider">Performance Trend</h3>
                           <Info size={12} className="text-theme-text-secondary cursor-help" />
                           <div className="absolute bottom-full mb-2 left-0 w-max max-w-[200px] p-2 bg-slate-800 text-white text-[10px] font-bold rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                Your score percentage over the last {dataPoints.length} tests.
                                <div className="absolute top-full left-4 w-2 h-2 bg-slate-800 rotate-45" />
                           </div>
                        </div>
                        <p className="text-[10px] text-theme-text-secondary font-bold uppercase tracking-wide">Analysis of Last {dataPoints.length} Tests</p>
                    </div>
                </div>
                <div className="flex bg-theme-bg-tertiary/70 p-1 rounded-xl shadow-inner border border-theme-border">
                    {(['overview', 'subjects', 'mistakes'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-theme-card text-theme-accent shadow-sm' : 'text-theme-text-secondary hover:text-theme-text'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div className="relative w-full h-[340px] bg-theme-card transition-colors flex">
                {activeTab === 'mistakes' ? (
                    <div className="h-full w-full p-8 flex items-center justify-center">
                        <div className="w-full max-w-3xl grid grid-cols-2 gap-6">
                            {mistakeStats.slice(0, 6).map((m, i) => {
                                const info = MISTAKE_TYPES.find(t => t.id === m.id);
                                return (
                                    <div key={m.id} className="flex flex-col gap-2 p-4 rounded-2xl bg-theme-bg-tertiary/50 border border-theme-border">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <span className={`${info?.color} scale-125`}>{info?.icon}</span>
                                                <span className="text-xs font-bold text-theme-text-secondary uppercase tracking-wide">{info?.label}</span>
                                            </div>
                                            <span className="text-sm font-mono font-bold text-theme-text bg-theme-card px-2 py-1 rounded-lg border border-theme-border shadow-sm">{m.count}</span>
                                        </div>
                                        <div className="w-full h-2 bg-theme-border rounded-full overflow-hidden mt-1">
                                            <div className={`h-full ${info?.color.replace('text', 'bg')} opacity-90`} style={{ width: `${m.pct}%` }} />
                                        </div>
                                    </div>
                                )
                            })}
                            {mistakeStats.length === 0 && (
                                <div className="col-span-2 text-center text-theme-text-secondary text-xs font-bold uppercase tracking-widest pt-10">
                                    No mistake data logged yet
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="w-12 h-full relative border-r border-theme-border bg-theme-bg-tertiary/30 flex-shrink-0 z-10">
                            {[0, 25, 50, 75, 100].map(tick => (
                                <div 
                                    key={tick} 
                                    className="absolute right-2 text-[10px] md:text-xs font-bold text-theme-text-secondary transform -translate-y-1/2 flex items-center justify-end w-full pr-1"
                                    style={{ top: `${(getY(tick) / height) * 100}%` }}
                                >
                                    {tick}%
                                </div>
                            ))}
                        </div>

                        <div className="flex-1 h-full relative overflow-hidden">
                            <svg 
                                viewBox={`0 0 ${width} ${height}`} 
                                preserveAspectRatio="none" 
                                className="w-full h-full overflow-visible"
                            >
                                <defs>
                                    <linearGradient id="grad-main" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="var(--theme-accent)" stopOpacity="0.4"/>
                                        <stop offset="100%" stopColor="var(--theme-accent)" stopOpacity="0"/>
                                    </linearGradient>
                                </defs>

                                {[0, 25, 50, 75, 100].map(tick => (
                                    <line key={tick} x1="0" y1={safeNum(getY(tick))} x2={width} y2={safeNum(getY(tick))} className="stroke-theme-border" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                                ))}

                                {activeTab === 'overview' ? (
                                    <>
                                        <path d={generateAreaPath('overall')} fill="url(#grad-main)" />
                                        <path d={generatePath('overall')} fill="none" stroke="var(--theme-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                                    </>
                                ) : (
                                    <>
                                        <path d={generatePath('Physics')} fill="none" stroke="var(--theme-accent)" strokeOpacity="1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                                        <path d={generatePath('Chemistry')} fill="none" stroke="var(--theme-accent)" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                                        <path d={generatePath('Maths')} fill="none" stroke="var(--theme-accent)" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                                    </>
                                )}
                            </svg>

                            {dataPoints.map((d, i) => {
                                const leftPct = (getX(i) / width) * 100;
                                return (
                                    <React.Fragment key={i}>
                                        <div className="absolute top-0 bottom-0 w-[10%] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer z-20" style={{ left: `calc(${leftPct}% - 5%)` }} onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)} />
                                        {hoveredIndex === i && <div className="absolute top-[40px] bottom-[40px] border-l-2 border-dashed border-theme-border/50 pointer-events-none z-0" style={{ left: `${leftPct}%` }} />}
                                        {activeTab === 'overview' ? (
                                            <div className={`absolute w-3 h-3 rounded-full border-2 border-theme-bg shadow-md transition-all duration-300 pointer-events-none z-10 ${hoveredIndex === i ? 'scale-150' : 'scale-100'}`} style={{ left: `${leftPct}%`, top: `${(getY(d.overall) / height) * 100}%`, transform: 'translate(-50%, -50%)', backgroundColor: 'var(--theme-accent)'}} />
                                        ) : (
                                            <>
                                                <div className="absolute w-2 h-2 rounded-full border border-theme-bg pointer-events-none" style={{ left: `${leftPct}%`, top: `${(getY(d.Physics) / height) * 100}%`, transform: 'translate(-50%, -50%)', backgroundColor: 'var(--theme-accent)', opacity: 1 }} />
                                                <div className="absolute w-2 h-2 rounded-full border border-theme-bg pointer-events-none" style={{ left: `${leftPct}%`, top: `${(getY(d.Chemistry) / height) * 100}%`, transform: 'translate(-50%, -50%)', backgroundColor: 'var(--theme-accent)', opacity: 0.7 }} />
                                                <div className="absolute w-2 h-2 rounded-full border border-theme-bg pointer-events-none" style={{ left: `${leftPct}%`, top: `${(getY(d.Maths) / height) * 100}%`, transform: 'translate(-50%, -50%)', backgroundColor: 'var(--theme-accent)', opacity: 0.5 }} />
                                            </>
                                        )}
                                    </React.Fragment>
                                )
                            })}

                            {hoveredIndex !== null && dataPoints[hoveredIndex] && (
                                <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none bg-theme-bg/90 backdrop-blur text-theme-text px-4 py-3 rounded-2xl shadow-2xl border border-theme-border z-30 flex gap-4 items-center min-w-[180px]">
                                    <div>
                                        <p className="text-[10px] text-theme-text-secondary font-bold uppercase tracking-wider">{dataPoints[hoveredIndex].date}</p>
                                        <p className="text-sm font-bold truncate max-w-[120px]">{dataPoints[hoveredIndex].name}</p>
                                    </div>
                                    <div className="h-8 w-px bg-theme-border" />
                                    <div className="text-right">
                                        <p className="text-[10px] text-theme-text-secondary font-bold uppercase tracking-wider">{dataPoints[hoveredIndex].temperament}</p>
                                        <p className="text-xl font-mono font-bold text-theme-accent">{Math.round(dataPoints[hoveredIndex].overall)}%</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </Card>
    );
});

const TestLog = memo(({ tests, onSave, onDelete }: TestLogProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [previewFile, setPreviewFile] = useState<{ name: string; type: 'image' | 'pdf', thumbnail?: string } | null>(null);
  const [viewingAttachment, setViewingAttachment] = useState<TestResult | null>(null);
  const [viewingReport, setViewingReport] = useState<TestResult | null>(null); // State for report modal
  const [activeTab, setActiveTab] = useState<'Physics' | 'Chemistry' | 'Maths'>('Physics');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isProcessingThumbnail, setIsProcessingThumbnail] = useState(false);
  const [deletingTestId, setDeletingTestId] = useState<string | null>(null);
  
  // Search & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Syllabus Picker State
  const [syllabusTab, setSyllabusTab] = useState<'Physics' | 'Chemistry' | 'Maths'>('Physics');
  
  const [globalQCount, setGlobalQCount] = useState<number>(75); 

  const [formData, setFormData] = useState<Omit<TestResult, 'id' | 'timestamp' | 'stream'>>({
    name: '',
    date: getLocalDate(),
    marks: 0,
    total: 300,
    temperament: 'Calm',
    type: 'full',
    testType: 'Generic',
    pypYear: new Date().getFullYear() - 1,
    pypSession: 'Jan Shift 1',
    coachingName: '',
    syllabus: { Physics: [], Chemistry: [], Maths: [] },
    attachment: null,
    attachmentType: null,
    fileName: null,
    thumbnail: null,
    breakdown: {
      Physics: { ...DEFAULT_BREAKDOWN, unattempted: 25 },
      Chemistry: { ...DEFAULT_BREAKDOWN, unattempted: 25 },
      Maths: { ...DEFAULT_BREAKDOWN, unattempted: 25 }
    }
  });

  const processedTests = useMemo(() => {
      let filtered = tests;
      
      if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          filtered = filtered.filter(t => 
              t.name.toLowerCase().includes(q) || 
              t.testType?.toLowerCase().includes(q) ||
              t.date.includes(q)
          );
      }

      return filtered.sort((a, b) => {
          if (sortOrder === 'newest') {
              return b.timestamp - a.timestamp;
          } else {
              return a.timestamp - b.timestamp;
          }
      });
  }, [tests, searchQuery, sortOrder]);

  // --- BLOB URL GENERATION FOR VIEWER ---
  useEffect(() => {
    if (viewingAttachment && viewingAttachment.attachmentType === 'pdf' && viewingAttachment.attachment) {
        try {
            const base64Data = viewingAttachment.attachment.includes(',') 
                ? viewingAttachment.attachment.split(',')[1] 
                : viewingAttachment.attachment;
            
            const binaryString = window.atob(base64Data);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            setPdfBlobUrl(url);

            return () => {
                URL.revokeObjectURL(url);
            };
        } catch (e) {
            console.error("Failed to generate PDF blob", e);
            setPdfBlobUrl(null);
        }
    } else {
        setPdfBlobUrl(null);
    }
  }, [viewingAttachment]);

  const handleAddClick = () => {
      setIsAdding(!isAdding);
  };

  const handleCalculateMarks = useCallback(() => {
    setFormData(prev => {
        if (!prev.breakdown) return prev;

        const { Physics, Chemistry, Maths } = prev.breakdown;

        const totalCorrect = (Physics.correct || 0) + (Chemistry.correct || 0) + (Maths.correct || 0);
        const totalIncorrect = (Physics.incorrect || 0) + (Chemistry.incorrect || 0) + (Maths.incorrect || 0);

        const calculatedMarks = (totalCorrect * 4) - totalIncorrect;

        return { ...prev, marks: calculatedMarks };
    });
  }, []);

  const toggleChapter = (subject: 'Physics' | 'Chemistry' | 'Maths', chapter: string) => {
      setFormData(prev => {
          const currentSyllabus = prev.syllabus?.[subject] || [];
          const newSyllabus = currentSyllabus.includes(chapter) 
              ? currentSyllabus.filter(c => c !== chapter)
              : [...currentSyllabus, chapter];
          
          return {
              ...prev,
              syllabus: {
                  ...prev.syllabus!,
                  [subject]: newSyllabus
              }
          }
      });
  };

  const selectAllChapters = (subject: 'Physics' | 'Chemistry' | 'Maths') => {
      setFormData(prev => ({
          ...prev,
          syllabus: {
              ...prev.syllabus!,
              [subject]: [...JEE_SYLLABUS[subject]]
          }
      }));
  };

  const clearChapters = (subject: 'Physics' | 'Chemistry' | 'Maths') => {
      setFormData(prev => ({
          ...prev,
          syllabus: {
              ...prev.syllabus!,
              [subject]: []
          }
      }));
  };

  const handleThumbnailFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 1 * 1024 * 1024) {
          alert("Thumbnail image is too large! Please use an image under 1MB.");
          return;
      }

      setIsProcessingThumbnail(true);
      const reader = new FileReader();
      reader.onloadend = () => {
          const thumbnailData = reader.result as string;
          setFormData(prev => ({ ...prev, thumbnail: thumbnailData }));
          if (previewFile) {
              setPreviewFile({ ...previewFile, thumbnail: thumbnailData });
          }
          setIsProcessingThumbnail(false);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
  };

  const updateMistake = (subject: 'Physics' | 'Chemistry' | 'Maths', type: keyof MistakeCounts, delta: number) => {
    setFormData(prev => {
        const currentBreakdown = prev.breakdown![subject];
        const currentMistakes = currentBreakdown.mistakes || {};
        const totalWrong = currentBreakdown.incorrect;
        const totalTagged = (Object.values(currentMistakes) as number[]).reduce((a, b) => a + (b || 0), 0);
        const currentValue = currentMistakes[type] || 0;
        
        if (delta < 0 && currentValue <= 0) return prev;
        if (delta > 0 && totalTagged >= totalWrong) return prev;

        const nextValue = Math.max(0, currentValue + delta);
        const newMistakes = { ...currentMistakes, [type]: nextValue };
        
        return {
            ...prev,
            breakdown: {
                ...prev.breakdown!,
                [subject]: {
                    ...currentBreakdown,
                    mistakes: newMistakes,
                    calcErrors: newMistakes.calc || 0,
                    otherErrors: (Object.entries(newMistakes)
                        .filter(([k]) => k !== 'calc')
                        .reduce((acc, [_, v]) => acc + ((v as number) || 0), 0))
                }
            }
        };
    });
  };

  const handleGlobalQuestionChange = (val: number) => {
      setGlobalQCount(val);
      const perSubject = Math.floor(val / 3);
      const remainder = val % 3;

      setFormData(prev => {
          const newBreakdown = { ...prev.breakdown! };
          (['Physics', 'Chemistry', 'Maths'] as const).forEach((sub, idx) => {
              const subTotal = perSubject + (idx < remainder ? 1 : 0);
              const current = newBreakdown[sub];
              const minNeeded = current.correct + current.incorrect;
              const safeTotal = Math.max(minNeeded, subTotal);
              
              newBreakdown[sub] = {
                  ...current,
                  unattempted: safeTotal - current.correct - current.incorrect
              };
          });
          return { ...prev, breakdown: newBreakdown };
      });
  };

  const handleTotalChange = (subject: 'Physics' | 'Chemistry' | 'Maths', newTotal: number) => {
    const currentBreakdown = formData.breakdown![subject];
    const minTotal = currentBreakdown.correct + currentBreakdown.incorrect;
    const validSubjectTotal = Math.max(minTotal, newTotal);
    const newUnattempted = validSubjectTotal - currentBreakdown.correct - currentBreakdown.incorrect;

    let newGlobalTotal = 0;
    (['Physics', 'Chemistry', 'Maths'] as const).forEach(s => {
        if (s === subject) {
            newGlobalTotal += validSubjectTotal;
        } else {
            const b = formData.breakdown![s];
            newGlobalTotal += (b.correct + b.incorrect + b.unattempted);
        }
    });
    setGlobalQCount(newGlobalTotal);

    setFormData(prev => ({
        ...prev,
        breakdown: {
            ...prev.breakdown!,
            [subject]: { ...currentBreakdown, unattempted: newUnattempted }
        }
    }));
  };

  const handleStatChange = (subject: 'Physics' | 'Chemistry' | 'Maths', field: 'correct' | 'incorrect', newValue: number) => {
    setFormData(prev => {
        const current = prev.breakdown![subject];
        const totalQuestions = current.correct + current.incorrect + current.unattempted;
        
        const otherMainFieldVal = field === 'correct' ? current.incorrect : current.correct;
        const validValue = Math.min(Math.max(0, newValue), totalQuestions - otherMainFieldVal);
        const newUnattempted = totalQuestions - validValue - otherMainFieldVal;

        const updatedSubject = {
            ...current,
            [field]: validValue,
            unattempted: newUnattempted
        };

        if (field === 'incorrect') {
            const newWrong = validValue;
            let currentMistakes = { ...(current.mistakes || {}) };
            let totalTagged = (Object.values(currentMistakes) as number[]).reduce((a, b) => a + (b || 0), 0);
            
            while (totalTagged > newWrong) {
                // Reduce from largest category first
                const largestCat = (Object.entries(currentMistakes) as [keyof MistakeCounts, number][])
                    .filter(([_,v]) => v > 0)
                    .sort((a, b) => b[1] - a[1])[0];
                
                if (largestCat) {
                    currentMistakes[largestCat[0]] = (currentMistakes[largestCat[0]] || 1) - 1;
                    totalTagged--;
                } else {
                    break; 
                }
            }
            updatedSubject.mistakes = currentMistakes;
        }

        return {
            ...prev,
            breakdown: {
                ...prev.breakdown!,
                [subject]: updatedSubject
            }
        };
    });
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
      <ConfirmationModal
        isOpen={deletingTestId !== null}
        onClose={() => setDeletingTestId(null)}
        onConfirm={() => {
            if (deletingTestId) {
                onDelete(deletingTestId);
                setDeletingTestId(null);
            }
        }}
        title="Delete Test?"
        message="Are you sure you want to delete this test log? This action cannot be undone."
      />

      {isAdding ? (
        <AdUnit client="ca-pub-YOUR_PUBLISHER_ID_HERE" slot="1234567890" />
      ) : (
        <>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-theme-text tracking-tight">Test Logs</h2>
                    <p className="text-xs text-theme-accent uppercase tracking-widest mt-1 font-bold">Analyze your mock tests in detail</p>
                </div>
                <button 
                    onClick={handleAddClick}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-theme-accent text-theme-text-on-accent rounded-2xl text-xs font-bold uppercase tracking-wider shadow-lg hover:opacity-90 transition-opacity active:scale-95 whitespace-nowrap"
                    style={{boxShadow: '0 10px 15px -3px rgba(var(--theme-accent-rgb), 0.2)'}}
                >
                    <Plus size={16} /> Log New Test
                </button>
            </div>
            
            <TestAnalytics tests={tests} />
            
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 group">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search by name, type or date..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-theme-card border border-theme-border rounded-xl py-3 pl-12 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400"
                    />
                </div>
                <div className="flex bg-theme-card border border-theme-border p-1 rounded-xl">
                    <button
                        onClick={() => setSortOrder('newest')}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${sortOrder === 'newest' ? 'bg-theme-bg-tertiary text-theme-accent shadow-sm' : 'text-theme-text-secondary hover:text-theme-text'}`}
                    >
                        <ArrowDownWideNarrow size={12} /> Newest
                    </button>
                    <button
                        onClick={() => setSortOrder('oldest')}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${sortOrder === 'oldest' ? 'bg-theme-bg-tertiary text-theme-accent shadow-sm' : 'text-theme-text-secondary hover:text-theme-text'}`}
                    >
                        <ArrowUpNarrowWide size={12} /> Oldest
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Test Cards */}
            </div>

            {processedTests.length === 0 && (
                <div className="text-center py-20 opacity-40 border-2 border-dashed border-theme-border rounded-3xl">
                    <Trophy size={48} className="mx-auto mb-4"/>
                    <p className="text-xs uppercase font-bold tracking-widest">No tests logged yet</p>
                    <p className="text-[10px] mt-1">Click 'Log New Test' to get started</p>
                </div>
            )}
        </>
      )}

      {viewingReport && <TestReportModal test={viewingReport} onClose={() => setViewingReport(null)} />}
    </div>
  );
});

export default TestLog;
