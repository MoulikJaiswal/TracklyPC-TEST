

import React, { useState, useMemo, memo, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Trash2, Trophy, Clock, Calendar, UploadCloud, FileText, Image as ImageIcon, Atom, Zap, Calculator, BarChart3, AlertCircle, ChevronRight, PieChart, Filter, Target, Download, TrendingUp, TrendingDown, Crown, Lock, GripHorizontal, Check, Brain, Activity, Layers, BookOpen, ListChecks, Loader2, ImagePlus, Search, ArrowDownWideNarrow, ArrowUpNarrowWide, Hammer, Save } from 'lucide-react';
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
  targets?: TargetType[]; 
  onSave: (test: Omit<TestResult, 'id' | 'timestamp'>) => void;
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
                             <p className="text-[10px] font-bold uppercase tracking-widest text-theme-text-secondary mb-2">Accuracy</p>
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
                        <h3 className="text-sm font-bold text-theme-text uppercase tracking-wider">Performance Trend</h3>
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

export const TestLog = memo(({ tests, targets = [], onSave, onDelete }: TestLogProps) => {
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

  const [formData, setFormData] = useState<Omit<TestResult, 'id' | 'timestamp'>>({
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
            
            if (totalTagged > newWrong) {
                currentMistakes = {}; 
                updatedSubject.calcErrors = 0;
                updatedSubject.otherErrors = 0;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    onSave(formData);
    setIsAdding(false);
    setPreviewFile(null);
    setFormData({
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
    setGlobalQCount(75);
  };

  const handleConfirmDelete = useCallback(() => {
      if (deletingTestId) {
          onDelete(deletingTestId);
          setDeletingTestId(null);
      }
  }, [deletingTestId, onDelete]);

  const getTestSubtitle = (test: TestResult) => {
    if (test.testType === 'PYP') {
        return `PYP • ${test.pypYear} ${test.pypSession || ''}`;
    }
    if (test.testType === 'Coaching Mock') {
        return `Mock • ${test.coachingName || 'Coaching Test'}`;
    }
    return test.type === 'part' ? 'PART TEST' : 'FULL SYLLABUS';
  };

  const upcomingTests = useMemo(() => {
      const today = getLocalDate();
      return targets
        .filter(t => t.type === 'test' && t.date >= today && !t.completed)
        .sort((a, b) => a.date.localeCompare(b.date));
  }, [targets]);

  const activeBreakdown = formData.breakdown![activeTab];
  const activeTotalQuestions = activeBreakdown.correct + activeBreakdown.incorrect + activeBreakdown.unattempted;
  const activeMistakes = activeBreakdown.mistakes || {};
  const activeTaggedCount = (Object.values(activeMistakes) as number[]).reduce((a, b) => a + (b || 0), 0);

  return (
    <div id="test-log-container" className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-theme-text tracking-tight">Test Log</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mt-1">
              <p className="text-xs text-theme-accent uppercase tracking-widest font-bold">Track performance curves</p>
          </div>
        </div>
        <button 
          onClick={handleAddClick} 
          className={`group flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider shadow-lg active:scale-95 transition-all`}
          style={{
              backgroundColor: 'var(--theme-accent)',
              color: 'var(--theme-text-on-accent)',
              boxShadow: '0 10px 15px -3px rgba(var(--theme-accent-rgb), 0.3), 0 4px 6px -2px rgba(var(--theme-accent-rgb), 0.1)'
          }}
        >
          {isAdding ? <X size={16} /> : <Plus size={16} className="group-hover:rotate-90 transition-transform" />}
          {isAdding ? 'Cancel' : 'Log Test'}
        </button>
      </div>

      <TestAnalytics tests={tests} />

      {tests.length > 0 && !isAdding && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-theme-card/50 p-2 rounded-2xl border border-theme-border backdrop-blur-sm animate-in fade-in duration-300">
              <div className="relative flex-1 w-full sm:w-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-secondary" size={16} />
                  <input
                      type="text"
                      placeholder="Search tests..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-theme-card border border-theme-border rounded-xl py-2 pl-10 pr-4 text-sm outline-none focus:border-theme-accent transition-all placeholder:text-theme-text-secondary text-theme-text"
                  />
              </div>

              <button
                  onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                  className="flex items-center gap-2 px-4 py-2 bg-theme-card border border-theme-border rounded-xl text-xs font-bold uppercase tracking-wider text-theme-text-secondary hover:bg-theme-bg-tertiary transition-colors w-full sm:w-auto justify-center"
              >
                  {sortOrder === 'newest' ? <ArrowDownWideNarrow size={16} /> : <ArrowUpNarrowWide size={16} />}
                  {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
              </button>
          </div>
      )}

      {/* Add Form */}
      {isAdding && (
        <Card className="bg-theme-card/80 border-theme-border max-w-2xl mx-auto shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-8">
            <input 
                type="file" 
                ref={thumbnailInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleThumbnailFileChange}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ... Basic Inputs ... */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-theme-text-secondary ml-1">Test Name</label>
                <input 
                  type="text" required placeholder="e.g., JEE Mains Mock 12"
                  className="w-full bg-theme-bg-tertiary border border-theme-border p-3 rounded-xl text-sm text-theme-text focus:border-theme-accent focus:ring-2 focus:ring-theme-accent/30 outline-none transition-all placeholder:text-theme-text-secondary/70"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-theme-text-secondary ml-1">Date</label>
                <input 
                  type="date" required
                  className="w-full bg-theme-bg-tertiary border border-theme-border p-3 rounded-xl text-sm text-theme-text focus:border-theme-accent focus:ring-2 focus:ring-theme-accent/30 outline-none transition-all"
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                />
              </div>

              {/* Test Category Toggle */}
              <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] uppercase font-bold text-theme-text-secondary ml-1">Test Category</label>
                  <div className="flex bg-theme-bg-tertiary p-1 rounded-xl border border-theme-border">
                      {(['Generic', 'PYP', 'Coaching Mock'] as const).map(cat => (
                           <button 
                              key={cat}
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, testType: cat, type: cat === 'Generic' ? prev.type : 'full' }))}
                              className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${formData.testType === cat ? 'bg-theme-card text-theme-text shadow-sm' : 'text-theme-text-secondary hover:text-theme-text'}`}
                           >
                              {cat === 'Coaching Mock' ? 'Mock' : cat}
                           </button>
                      ))}
                  </div>
              </div>

              {formData.testType === 'PYP' && (
                  <div className="md:col-span-2 grid grid-cols-2 gap-4 animate-in fade-in duration-300">
                      <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold text-theme-text-secondary ml-1">Year</label>
                          <input 
                              type="number" required placeholder="e.g., 2023"
                              className="w-full bg-theme-bg-tertiary border border-theme-border p-3 rounded-xl text-sm text-theme-text focus:border-theme-accent outline-none transition-all placeholder:text-theme-text-secondary/70"
                              value={formData.pypYear || ''}
                              onChange={e => setFormData({...formData, pypYear: parseInt(e.target.value) || undefined})}
                          />
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold text-theme-text-secondary ml-1">Session</label>
                          <input 
                              type="text" required placeholder="e.g., Jan Shift 1"
                              className="w-full bg-theme-bg-tertiary border border-theme-border p-3 rounded-xl text-sm text-theme-text focus:border-theme-accent outline-none transition-all placeholder:text-theme-text-secondary/70"
                              value={formData.pypSession}
                              onChange={e => setFormData({...formData, pypSession: e.target.value})}
                          />
                      </div>
                  </div>
              )}

              {formData.testType === 'Coaching Mock' && (
                  <div className="md:col-span-2 space-y-2 animate-in fade-in duration-300">
                      <label className="text-[10px] uppercase font-bold text-theme-text-secondary ml-1">Coaching / Series Name</label>
                      <input 
                          type="text" required placeholder="e.g., Allen Major Test 3"
                          className="w-full bg-theme-bg-tertiary border border-theme-border p-3 rounded-xl text-sm text-theme-text focus:border-theme-accent outline-none transition-all placeholder:text-theme-text-secondary/70"
                          value={formData.coachingName}
                          onChange={e => setFormData({...formData, coachingName: e.target.value})}
                      />
                  </div>
              )}

              {formData.testType === 'Generic' && (
                  <div className="md:col-span-2 space-y-2 animate-in fade-in duration-300">
                      <label className="text-[10px] uppercase font-bold text-theme-text-secondary ml-1">Test Scope</label>
                      <div className="flex bg-theme-bg-tertiary p-1 rounded-xl border border-theme-border">
                          <button 
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, type: 'full' }))}
                              className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${formData.type === 'full' ? 'shadow-md' : 'text-theme-text-secondary hover:text-theme-text'}`}
                              style={formData.type === 'full' ? { backgroundColor: 'var(--theme-accent)', color: 'var(--theme-text-on-accent)' } : {}}
                          >
                              Full Syllabus
                          </button>
                          <button 
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, type: 'part' }))}
                              className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${formData.type === 'part' ? 'shadow-md' : 'text-theme-text-secondary hover:text-theme-text'}`}
                              style={formData.type === 'part' ? { backgroundColor: 'var(--theme-accent)', color: 'var(--theme-text-on-accent)' } : {}}
                          >
                              Part Test
                          </button>
                      </div>
                  </div>
              )}

              {formData.testType === 'Generic' && formData.type === 'part' && (
                  <div className="md:col-span-2 space-y-3 bg-theme-bg-tertiary/50 rounded-2xl p-4 border border-theme-border animate-in fade-in duration-300">
                      <div className="flex justify-between items-center">
                          <label className="text-[10px] uppercase font-bold text-theme-accent flex items-center gap-2">
                              <BookOpen size={14} /> Select Syllabus
                          </label>
                          <div className="flex gap-2">
                              <button type="button" onClick={() => selectAllChapters(syllabusTab)} className="text-[9px] font-bold uppercase text-theme-text-secondary hover:text-theme-text transition-colors">Select All</button>
                              <span className="text-theme-text-secondary/20">|</span>
                              <button type="button" onClick={() => clearChapters(syllabusTab)} className="text-[9px] font-bold uppercase text-theme-text-secondary hover:text-theme-text transition-colors">Clear</button>
                          </div>
                      </div>
                      <div className="flex gap-2 border-b border-theme-border pb-2 mb-2">
                          {(['Physics', 'Chemistry', 'Maths'] as const).map(sub => (
                              <button
                                  key={sub} type="button" onClick={() => setSyllabusTab(sub)}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${syllabusTab === sub ? 'bg-theme-card text-theme-text' : 'text-theme-text-secondary hover:text-theme-text-secondary/80'}`}
                              >
                                  {sub} <span className="ml-1 opacity-50">({formData.syllabus?.[sub].length || 0})</span>
                              </button>
                          ))}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                          {JEE_SYLLABUS[syllabusTab].map(chapter => {
                              const isSelected = formData.syllabus?.[syllabusTab].includes(chapter);
                              return (
                                  <button key={chapter} type="button" onClick={() => toggleChapter(syllabusTab, chapter)}
                                      className={`text-left p-2 rounded-lg text-[10px] font-medium transition-all border ${isSelected ? 'bg-theme-accent/20 border-theme-accent/50 text-theme-accent' : 'bg-theme-bg-tertiary border-theme-border text-theme-text-secondary hover:bg-theme-border'}`}>
                                      <div className="flex items-start gap-2">
                                          <div className={`mt-0.5 w-3 h-3 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-theme-accent border-theme-accent' : 'border-theme-text-secondary/50'}`}>
                                              {isSelected && <Check size={8} className="text-theme-text-on-accent" />}
                                          </div>
                                          <span className="leading-tight line-clamp-2">{chapter}</span>
                                      </div>
                                  </button>
                              )
                          })}
                      </div>
                  </div>
              )}
              
              <div className="md:col-span-2 grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center h-4 mb-1">
                    <button type="button" onClick={handleCalculateMarks} className="flex items-center gap-1 px-2 py-0.5 rounded border border-theme-accent/30 text-theme-accent text-[9px] font-bold uppercase hover:bg-theme-accent/10 transition-colors ml-auto">
                        <Zap size={10} /> Auto-Calc
                    </button>
                  </div>
                  <input type="number" placeholder="0" className="w-full h-16 bg-theme-bg-tertiary border border-theme-border p-3 rounded-xl text-xl font-mono font-bold text-theme-text focus:border-theme-accent outline-none transition-all placeholder:text-theme-text-secondary/50" value={formData.marks} onChange={(e) => setFormData({...formData, marks: parseInt(e.target.value) || 0})} />
                </div>
                <div className="space-y-2">
                   <div className="flex justify-between items-center h-4 mb-1"><label className="text-[10px] uppercase font-bold text-theme-text-secondary ml-1">Total Marks</label></div>
                   <input type="number" placeholder="300" className="w-full h-16 bg-theme-bg-tertiary border border-theme-border p-3 rounded-xl text-xl font-mono font-bold text-theme-text focus:border-theme-accent outline-none transition-all placeholder:text-theme-text-secondary/50" value={formData.total} onChange={(e) => setFormData({...formData, total: parseInt(e.target.value) || 0})} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center h-4 mb-1"><label className="text-[10px] uppercase font-bold text-theme-text-secondary ml-1">Total Qs</label></div>
                  <input type="number" placeholder="75" className="w-full h-16 bg-theme-bg-tertiary border border-theme-border p-3 rounded-xl text-xl font-mono font-bold text-theme-text focus:border-theme-accent outline-none transition-all placeholder:text-theme-text-secondary/50" value={globalQCount} onChange={(e) => handleGlobalQuestionChange(parseInt(e.target.value) || 0)} />
                </div>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] uppercase font-bold text-theme-text-secondary ml-1">Temperament</label>
                <div className="grid grid-cols-4 gap-2">
                    {['Calm', 'Anxious', 'Focused', 'Fatigued'].map(t => (
                        <button key={t} type="button" onClick={() => setFormData({...formData, temperament: t as any})}
                            className={`py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide border transition-all ${formData.temperament === t ? 'bg-theme-text text-theme-bg border-theme-text' : 'bg-theme-bg-tertiary border-theme-border text-theme-text-secondary hover:border-theme-text-secondary/50'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-theme-accent/20">
               <div className="flex items-center justify-between">
                   <label className="text-xs uppercase font-bold text-theme-accent tracking-widest flex items-center gap-2">
                      <BarChart3 size={16} /> Question Breakdown
                   </label>
               </div>
               <div className="bg-theme-bg-tertiary/50 border border-theme-border rounded-2xl overflow-hidden shadow-sm">
                  <div className="flex border-b border-theme-border bg-theme-bg-tertiary/30">
                     {(['Physics', 'Chemistry', 'Maths'] as const).map(subject => (
                        <button key={subject} type="button" onClick={() => setActiveTab(subject)}
                           className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 relative ${activeTab === subject ? 'text-theme-accent bg-theme-card' : 'text-theme-text-secondary hover:text-theme-text-secondary/80'}`}>
                           {activeTab === subject && <div className="absolute top-0 left-0 w-full h-0.5 bg-theme-accent" />}
                           {subject === 'Physics' && <Atom size={14} />} {subject === 'Chemistry' && <Zap size={14} />} {subject === 'Maths' && <Calculator size={14} />}
                           <span className="hidden md:inline">{subject}</span>
                        </button>
                     ))}
                  </div>
                  <div className="p-6 space-y-6">
                     <div className="flex items-center gap-4 p-3 bg-theme-card/50 rounded-xl border border-theme-border">
                        <div className="p-2 bg-theme-bg-tertiary rounded-lg text-theme-text-secondary"><Target size={18} /></div>
                        <div className="flex-1">
                            <p className="text-[10px] font-bold uppercase text-theme-text-secondary">Total {activeTab} Qs</p>
                            <input type="number" min="0" placeholder="0" className="w-full bg-transparent text-lg font-mono font-bold text-theme-text outline-none" value={activeTotalQuestions || ''} onChange={(e) => handleTotalChange(activeTab, parseInt(e.target.value) || 0)} />
                        </div>
                     </div>
                      <div className="grid grid-cols-3 gap-4">
                          <StatInput label="Correct" value={formData.breakdown?.[activeTab].correct || 0} onChange={(val) => handleStatChange(activeTab, 'correct', val)} max={activeTotalQuestions} color="emerald" />
                          <StatInput label="Wrong" value={formData.breakdown?.[activeTab].incorrect || 0} onChange={(val) => handleStatChange(activeTab, 'incorrect', val)} max={activeTotalQuestions} color="rose" />
                          <StatDisplay label="Skipped" value={formData.breakdown?.[activeTab].unattempted || 0} color="slate" />
                      </div>
                     <div className="p-4 bg-rose-500/10 rounded-xl border border-rose-500/20">
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest flex items-center gap-2"><AlertCircle size={14} /> Mistake Analysis</p>
                            <span className="text-[9px] px-2 py-1 bg-black/20 rounded text-rose-400 font-mono border border-rose-500/20">{activeTaggedCount} / {formData.breakdown?.[activeTab].incorrect} tagged</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {MISTAKE_TYPES.map(type => (
                                <div key={type.id} className="flex items-center justify-between p-2 bg-black/20 rounded-lg border border-white/5 hover:border-rose-500/30 transition-colors">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <span className={`${type.color} shrink-0 scale-75`}>{type.icon}</span>
                                        <span className="text-[9px] font-bold uppercase text-slate-300 truncate">{type.label}</span>
                                    </div>
                                    <div className="flex items-center gap-1 bg-white/10 rounded p-0.5">
                                        <button type="button" onClick={() => updateMistake(activeTab, type.id as keyof MistakeCounts, -1)} className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-slate-400">-</button>
                                        <span className="w-4 text-center font-mono font-bold text-xs text-white">{activeMistakes[type.id as keyof MistakeCounts] || 0}</span>
                                        <button type="button" onClick={() => updateMistake(activeTab, type.id as keyof MistakeCounts, 1)} className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-slate-400">+</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                     </div>
                  </div>
               </div>
            </div>

             <div className="flex gap-4 pt-4 border-t border-theme-border">
               <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-4 rounded-xl bg-theme-bg-tertiary text-theme-text-secondary font-bold uppercase text-xs tracking-wider hover:bg-theme-border transition-all">Cancel</button>
               <button type="submit" disabled={isProcessingThumbnail} className="flex-[2] py-4 rounded-xl bg-theme-accent text-theme-text-on-accent font-bold uppercase text-xs tracking-wider hover:opacity-90 shadow-lg active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2" style={{boxShadow: '0 4px 15px -3px rgba(var(--theme-accent-rgb), 0.3)'}}>
                 {isProcessingThumbnail ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Test Log
               </button>
             </div>
          </form>
        </Card>
      )}

      <div className="space-y-4">
        {processedTests.map((test) => (
          <div key={test.id} onClick={() => setViewingReport(test)} className="group relative bg-theme-card/70 border border-theme-border hover:border-theme-accent/50 p-5 rounded-2xl transition-all hover:shadow-lg active:scale-[0.99] flex flex-col md:flex-row items-start md:items-center gap-4 cursor-pointer">
            <div className="relative shrink-0">
               <svg className="w-16 h-16 transform -rotate-90"><circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-theme-border" /><circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={175} strokeDashoffset={175 - (175 * (safeDiv(test.marks, test.total || 300)))} className="text-theme-accent transition-all duration-1000" /></svg>
               <div className="absolute inset-0 flex items-center justify-center flex-col"><span className="text-sm font-bold text-theme-text">{Math.round(safeDiv(test.marks, test.total || 300) * 100)}%</span></div>
            </div>

            <div className="flex-1 min-w-0">
               <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-theme-text truncate">{test.name}</h3>
                  {test.attachment && (<button onClick={(e) => { e.stopPropagation(); setViewingAttachment(test); }} className="p-1 rounded bg-theme-accent/10 text-theme-accent hover:bg-theme-accent/20 transition-colors" title="View Attachment">{test.attachmentType === 'pdf' ? <FileText size={12} /> : <ImageIcon size={12} />}</button>)}
               </div>
               <div className="flex flex-wrap gap-y-1 gap-x-3 text-[10px] uppercase font-bold text-theme-text-secondary">
                  <span className="flex items-center gap-1"><Calendar size={12} /> {test.date}</span>
                  <span className="flex items-center gap-1"><Trophy size={12} /> {test.marks}/{test.total}</span>
                  <span className="px-1.5 py-0.5 rounded bg-theme-bg-tertiary text-theme-text-secondary">{getTestSubtitle(test)}</span>
               </div>
            </div>

            <div className="flex gap-1 h-12 items-end w-full md:w-32 shrink-0">
                <div className="flex-1 bg-theme-border rounded-t-sm h-full"><div className="w-full bg-theme-accent rounded-t-sm" style={{ height: `${Math.min(100, (safeDiv(test.breakdown?.Physics.correct || 0, 25)) * 100)}%`, opacity: 1 }} /></div>
                <div className="flex-1 bg-theme-border rounded-t-sm h-full"><div className="w-full bg-theme-accent rounded-t-sm" style={{ height: `${Math.min(100, (safeDiv(test.breakdown?.Chemistry.correct || 0, 25)) * 100)}%`, opacity: 0.7 }} /></div>
                <div className="flex-1 bg-theme-border rounded-t-sm h-full"><div className="w-full bg-theme-accent rounded-t-sm" style={{ height: `${Math.min(100, (safeDiv(test.breakdown?.Maths.correct || 0, 25)) * 100)}%`, opacity: 0.5 }} /></div>
            </div>

            <button onClick={(e) => { e.stopPropagation(); setDeletingTestId(test.id); }} className="absolute top-4 right-4 p-2 text-theme-text-secondary hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
          </div>
        ))}

        {processedTests.length === 0 && (
            <div className="text-center py-12 opacity-40 border-2 border-dashed border-theme-border rounded-3xl">
                <FileText size={48} className="mx-auto mb-4 text-theme-text-secondary/50" />
                <p className="text-sm font-bold uppercase tracking-widest text-theme-text-secondary">No tests found</p>
            </div>
        )}
      </div>

      <ConfirmationModal isOpen={!!deletingTestId} onClose={() => setDeletingTestId(null)} onConfirm={handleConfirmDelete} title="Delete Test?" message="This action cannot be undone. All data for this test will be lost." />
      {viewingReport && (<TestReportModal test={viewingReport} onClose={() => setViewingReport(null)} />)}
      {viewingAttachment && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-theme-bg w-full max-w-4xl h-[85vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-theme-border">
                  <div className="p-4 border-b border-theme-border flex justify-between items-center bg-theme-bg">
                      <div className="flex items-center gap-3">
                          {/* FIX: Replaced `viewingFile` with `viewingAttachment` */}
                          <div className="p-2 bg-theme-accent/10 rounded-lg text-theme-accent">{viewingAttachment.attachmentType === 'pdf' ? <FileText size={20} /> : <ImageIcon size={20} />}</div>
                          {/* FIX: Replaced `viewingFile` with `viewingAttachment` */}
                          <div><h3 className="text-sm font-bold text-theme-text">{viewingAttachment.title}</h3><p className="text-[10px] text-theme-text-secondary font-mono uppercase">{new Date(viewingAttachment.timestamp).toLocaleDateString()}</p></div>
                      </div>
                      <div className="flex gap-2">
                          {/* FIX: Replaced `viewingFile` with `viewingAttachment` */}
                          <a href={viewingAttachment.attachment!} download={viewingAttachment.fileName || "download"} className="p-2 rounded-full hover:bg-theme-bg-tertiary text-theme-text-secondary transition-colors" title="Download"><Download size={20} /></a>
                          <button onClick={() => setViewingAttachment(null)} className="p-2 rounded-full hover:bg-theme-bg-tertiary text-theme-text-secondary transition-colors"><X size={20} /></button>
                      </div>
                  </div>
                  <div className="flex-1 bg-black/20 overflow-auto flex items-center justify-center p-4 relative">
                      {/* FIX: Replaced `viewingFile` with `viewingAttachment` */}
                      {viewingAttachment.attachmentType === 'image' ? (
                          <img src={viewingAttachment.attachment!} alt={viewingAttachment.title} className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
                      ) : (
                          <div className="w-full h-full flex flex-col">
                              {pdfBlobUrl ? (
                                  // FIX: Replaced `viewingFile` with `viewingAttachment`
                                  <iframe src={pdfBlobUrl} className="w-full flex-1 rounded-lg shadow-lg border-0 bg-white" title={viewingAttachment.title} />
                              ) : (
                                  <div className="flex flex-col items-center justify-center h-full text-theme-text-secondary"><Loader2 size={32} className="animate-spin mb-2" /><p className="text-xs uppercase font-bold">Loading PDF...</p></div>
                              )}
                          </div>
                      )}
                  </div>
              </div>
          </div>,
          document.body
      )}
      
      <AdUnit client="ca-pub-YOUR_PUBLISHER_ID_HERE" slot="1234567890" label="Sponsored" />
    </div>
  );
});