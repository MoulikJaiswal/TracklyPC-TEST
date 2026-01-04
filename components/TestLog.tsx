import React, { useState, useMemo, memo, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Trash2, Trophy, Clock, Calendar, UploadCloud, FileText, Image as ImageIcon, Atom, Zap, Calculator, BarChart3, AlertCircle, ChevronRight, PieChart, Filter, Target, Download, TrendingUp, TrendingDown, Crown, Lock, GripHorizontal, Check, Brain, Activity, Layers, BookOpen, ListChecks } from 'lucide-react';
import { TestResult, Target as TargetType, SubjectBreakdown, MistakeCounts } from '../types';
import { Card } from './Card';
import { MISTAKE_TYPES, JEE_SYLLABUS } from '../constants';

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
  isPro: boolean;
  onOpenUpgrade: () => void;
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

// --- CUSTOM INPUT COMPONENT ---
const NumberScrollInput = memo(({ 
    label, 
    value, 
    onChange, 
    min = 0, 
    max = 300, 
    presets,
    step = 1,
    color = 'indigo'
}: { 
    label: string, 
    value: number, 
    onChange: (val: number) => void, 
    min?: number, 
    max?: number, 
    presets?: number[],
    step?: number, 
    color?: 'indigo' | 'emerald' | 'rose'
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Theme Configuration
    const theme = {
        indigo: { bg: 'bg-slate-800', text: 'text-indigo-400', active: 'text-indigo-400', border: 'focus-within:border-indigo-500' },
        emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', active: 'text-emerald-400', border: 'border-emerald-500/20 focus-within:border-emerald-500' },
        rose: { bg: 'bg-rose-500/10', text: 'text-rose-500', active: 'text-rose-400', border: 'border-rose-500/20 focus-within:border-rose-500' }
    }[color];

    // Generate options - Memoized heavily
    const options = useMemo(() => {
        if (presets) return presets;
        const opts = [];
        // Generate reverse range (High to Low)
        for (let i = max; i >= min; i -= step) {
            opts.push(i);
        }
        return opts;
    }, [min, max, presets, step]);

    // Ensure value is in the scroll list logic (handled via UI selection mostly)
    // We do NOT rebuild the options list just because 'value' changes, to save Perf.
    // Instead we trust the list covers the range.

    // Scroll to value on mount or when value changes externally
    useEffect(() => {
        if (scrollRef.current) {
            const btn = scrollRef.current.querySelector(`button[data-value="${value}"]`);
            if (btn) {
                // Use behavior: 'auto' for initial render to prevent jump, 'smooth' for updates
                // Or simplified: just use auto to be snappy and less CPU intensive
                btn.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }
        }
    }, [value]); // Trigger only on value change

    return (
        <div className={`relative flex h-16 ${theme.bg} rounded-xl overflow-hidden border ${color === 'indigo' ? 'border-slate-700' : ''} ${theme.border} transition-all group shadow-sm will-change-transform`}>
            <div className="flex-1 flex flex-col justify-center px-3 min-w-0">
                <label className={`text-[10px] uppercase font-bold ${theme.text} mb-0.5 tracking-wide`}>{label}</label>
                <input 
                    type="number" 
                    className={`bg-transparent text-xl font-mono font-bold ${color === 'indigo' ? 'text-white' : theme.text} outline-none w-full appearance-none`}
                    value={value.toString()} // Handle leading zeros removal
                    onChange={(e) => {
                        const val = parseInt(e.target.value);
                        onChange(isNaN(val) ? 0 : val);
                    }}
                    onFocus={(e) => e.target.select()}
                />
            </div>
            
            {/* Scroll Strip */}
            <div className={`w-px ${color === 'indigo' ? 'bg-slate-700' : 'bg-black/10'}`} />
            <div 
                ref={scrollRef}
                className="w-14 bg-black/10 overflow-y-auto no-scrollbar snap-y snap-mandatory text-center relative hover:bg-black/20 transition-colors"
                style={{ contain: 'strict' }}
            >
                <div className="py-2 space-y-1">
                    {options.map((opt) => (
                        <button
                            key={opt}
                            data-value={opt}
                            type="button" 
                            onClick={() => onChange(opt)}
                            className={`w-full py-1 text-[10px] font-mono font-bold snap-center transition-all ${value === opt ? `${theme.active} scale-110` : 'text-slate-500 hover:text-slate-400'}`}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            </div>
            
            {/* Fade overlays for scroll hint */}
            <div className="absolute top-0 right-0 w-14 h-4 bg-gradient-to-b from-black/10 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-14 h-4 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
        </div>
    );
});

// --- ANALYTICS COMPONENT ---
const TestAnalytics = memo(({ tests }: { tests: TestResult[] }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'subjects' | 'mistakes'>('overview');
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    const sortedTests = useMemo(() => {
        return [...tests].sort((a, b) => a.date.localeCompare(b.date)).slice(-10); // Last 10 tests max
    }, [tests]);

    const dataPoints = useMemo(() => {
        return sortedTests.map(t => {
            const total = safeNum(t.total) || 300;
            const marks = safeNum(t.marks);
            const p = t.breakdown?.Physics;
            const c = t.breakdown?.Chemistry;
            const m = t.breakdown?.Maths;

            // Helper to calc subject %
            const subPct = (sub: SubjectBreakdown | undefined) => {
                if (!sub) return 0;
                const attempted = sub.correct + sub.incorrect;
                const subTotal = attempted + sub.unattempted;
                const score = (sub.correct * 4) - sub.incorrect;
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

    // Graph Dimensions
    // We use a normalized coordinate system for the SVG logic
    const width = 1000;
    const height = 300; 
    const paddingX = 20; // Reduced padding as axis is external
    const paddingY = 40; // Top/Bottom buffer for lines
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
        <Card className="p-0 overflow-hidden border-indigo-200 dark:border-indigo-500/30 flex flex-col h-full bg-slate-50/80 dark:bg-[#0B0F19]">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 bg-white/50 dark:bg-white/5 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20">
                        <TrendingUp size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Performance Trend</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Analysis of Last {dataPoints.length} Tests</p>
                    </div>
                </div>
                <div className="flex bg-slate-200/50 dark:bg-black/40 p-1 rounded-xl shadow-inner border border-slate-200 dark:border-white/5">
                    {(['overview', 'subjects', 'mistakes'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div className="relative w-full h-[340px] bg-white dark:bg-[#0f172a] transition-colors flex">
                {activeTab === 'mistakes' ? (
                    <div className="h-full w-full p-8 flex items-center justify-center">
                        <div className="w-full max-w-3xl grid grid-cols-2 gap-6">
                            {mistakeStats.slice(0, 6).map((m, i) => {
                                const info = MISTAKE_TYPES.find(t => t.id === m.id);
                                return (
                                    <div key={m.id} className="flex flex-col gap-2 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <span className={`${info?.color} scale-125`}>{info?.icon}</span>
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">{info?.label}</span>
                                            </div>
                                            <span className="text-sm font-mono font-bold text-slate-900 dark:text-white bg-white dark:bg-black/20 px-2 py-1 rounded-lg border border-slate-100 dark:border-white/5 shadow-sm">{m.count}</span>
                                        </div>
                                        <div className="w-full h-2 bg-slate-200 dark:bg-black/40 rounded-full overflow-hidden mt-1">
                                            <div className={`h-full ${info?.color.replace('text', 'bg')} opacity-90`} style={{ width: `${m.pct}%` }} />
                                        </div>
                                    </div>
                                )
                            })}
                            {mistakeStats.length === 0 && (
                                <div className="col-span-2 text-center text-slate-400 text-xs font-bold uppercase tracking-widest pt-10">
                                    No mistake data logged yet
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* --- Y-Axis Overlay (HTML) --- */}
                        <div className="w-12 h-full relative border-r border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20 flex-shrink-0 z-10">
                            {[0, 25, 50, 75, 100].map(tick => (
                                <div 
                                    key={tick} 
                                    className="absolute right-2 text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 transform -translate-y-1/2 flex items-center justify-end w-full pr-1"
                                    style={{ top: `${(getY(tick) / height) * 100}%` }}
                                >
                                    {tick}%
                                </div>
                            ))}
                        </div>

                        {/* --- Chart Area --- */}
                        <div className="flex-1 h-full relative overflow-hidden">
                            <svg 
                                viewBox={`0 0 ${width} ${height}`} 
                                preserveAspectRatio="none" 
                                className="w-full h-full overflow-visible"
                            >
                                <defs>
                                    <linearGradient id="grad-overall" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4"/>
                                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0"/>
                                    </linearGradient>
                                    <linearGradient id="grad-phys" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3"/>
                                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
                                    </linearGradient>
                                    <linearGradient id="grad-chem" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#f97316" stopOpacity="0.3"/>
                                        <stop offset="100%" stopColor="#f97316" stopOpacity="0"/>
                                    </linearGradient>
                                    <linearGradient id="grad-math" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.3"/>
                                        <stop offset="100%" stopColor="#f43f5e" stopOpacity="0"/>
                                    </linearGradient>
                                </defs>

                                {/* Grid Lines */}
                                {[0, 25, 50, 75, 100].map(tick => (
                                    <line 
                                        key={tick}
                                        x1="0" y1={safeNum(getY(tick))} 
                                        x2={width} y2={safeNum(getY(tick))} 
                                        stroke="currentColor" 
                                        strokeWidth="1"
                                        className="text-slate-100 dark:text-white/5" 
                                        vectorEffect="non-scaling-stroke"
                                    />
                                ))}

                                {/* Lines with Area Gradients */}
                                {activeTab === 'overview' ? (
                                    <>
                                        <path d={generateAreaPath('overall')} fill="url(#grad-overall)" className="transition-all duration-500" />
                                        <path 
                                            d={generatePath('overall')} 
                                            fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                                            className="drop-shadow-lg animate-in fade-in duration-1000"
                                            vectorEffect="non-scaling-stroke"
                                        />
                                    </>
                                ) : (
                                    <>
                                        {/* Layers background to foreground */}
                                        <path d={generateAreaPath('Physics')} fill="url(#grad-phys)" className="transition-all duration-500" />
                                        <path d={generatePath('Physics')} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                                        
                                        <path d={generateAreaPath('Chemistry')} fill="url(#grad-chem)" className="transition-all duration-500" />
                                        <path d={generatePath('Chemistry')} fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                                        
                                        <path d={generateAreaPath('Maths')} fill="url(#grad-math)" className="transition-all duration-500" />
                                        <path d={generatePath('Maths')} fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                                    </>
                                )}
                            </svg>

                            {/* Interaction Layer - HTML Overlay for Crisp Dots */}
                            {dataPoints.map((d, i) => {
                                // Calculate percentages for positioning
                                const leftPct = (getX(i) / width) * 100;
                                
                                return (
                                    <React.Fragment key={i}>
                                        {/* Interaction Zone (Full Height Bar) */}
                                        <div 
                                            className="absolute top-0 bottom-0 w-[10%] hover:bg-white/5 dark:hover:bg-white/5 cursor-pointer z-20 group"
                                            style={{ left: `calc(${leftPct}% - 5%)` }} // Centered interaction zone
                                            onMouseEnter={() => setHoveredIndex(i)}
                                            onMouseLeave={() => setHoveredIndex(null)}
                                        />

                                        {/* Vertical Guide Line (Visible on Hover) */}
                                        {hoveredIndex === i && (
                                            <div 
                                                className="absolute top-[40px] bottom-[40px] border-l-2 border-dashed border-slate-300 dark:border-white/20 pointer-events-none z-0"
                                                style={{ left: `${leftPct}%` }}
                                            />
                                        )}

                                        {/* Dots */}
                                        {activeTab === 'overview' ? (
                                            <div 
                                                className={`
                                                    absolute w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 shadow-md transition-all duration-300 pointer-events-none z-10
                                                    ${hoveredIndex === i ? 'scale-150 bg-indigo-500' : 'bg-indigo-500 scale-100'}
                                                `}
                                                style={{ 
                                                    left: `${leftPct}%`, 
                                                    top: `${(getY(d.overall) / height) * 100}%`,
                                                    transform: 'translate(-50%, -50%)'
                                                }}
                                            />
                                        ) : (
                                            <>
                                                <div 
                                                    className="absolute w-2 h-2 rounded-full bg-blue-500 border border-white dark:border-slate-900 pointer-events-none"
                                                    style={{ left: `${leftPct}%`, top: `${(getY(d.Physics) / height) * 100}%`, transform: 'translate(-50%, -50%)' }}
                                                />
                                                <div 
                                                    className="absolute w-2 h-2 rounded-full bg-orange-500 border border-white dark:border-slate-900 pointer-events-none"
                                                    style={{ left: `${leftPct}%`, top: `${(getY(d.Chemistry) / height) * 100}%`, transform: 'translate(-50%, -50%)' }}
                                                />
                                                <div 
                                                    className="absolute w-2 h-2 rounded-full bg-rose-500 border border-white dark:border-slate-900 pointer-events-none"
                                                    style={{ left: `${leftPct}%`, top: `${(getY(d.Maths) / height) * 100}%`, transform: 'translate(-50%, -50%)' }}
                                                />
                                            </>
                                        )}
                                    </React.Fragment>
                                )
                            })}

                            {/* Tooltip Overlay */}
                            {hoveredIndex !== null && dataPoints[hoveredIndex] && (
                                <div 
                                    className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none bg-slate-900/95 dark:bg-black/90 backdrop-blur text-white px-4 py-3 rounded-2xl shadow-2xl border border-white/10 z-30 flex gap-4 items-center min-w-[180px]"
                                >
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{dataPoints[hoveredIndex].date}</p>
                                        <p className="text-sm font-bold truncate max-w-[120px]">{dataPoints[hoveredIndex].name}</p>
                                    </div>
                                    <div className="h-8 w-px bg-white/10" />
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{dataPoints[hoveredIndex].temperament}</p>
                                        <p className="text-xl font-mono font-bold text-indigo-400">{Math.round(dataPoints[hoveredIndex].overall)}%</p>
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

export const TestLog = memo(({ tests, targets = [], onSave, onDelete, isPro, onOpenUpgrade }: TestLogProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewFile, setPreviewFile] = useState<{ name: string; type: 'image' | 'pdf' } | null>(null);
  const [viewingAttachment, setViewingAttachment] = useState<TestResult | null>(null);
  const [viewingReport, setViewingReport] = useState<TestResult | null>(null);
  const [reportSubject, setReportSubject] = useState<'Physics' | 'Chemistry' | 'Maths' | null>(null);
  const [activeTab, setActiveTab] = useState<'Physics' | 'Chemistry' | 'Maths'>('Physics');
  
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
    syllabus: { Physics: [], Chemistry: [], Maths: [] },
    attachment: undefined,
    attachmentType: undefined,
    fileName: undefined,
    breakdown: {
      Physics: { ...DEFAULT_BREAKDOWN, unattempted: 25 },
      Chemistry: { ...DEFAULT_BREAKDOWN, unattempted: 25 },
      Maths: { ...DEFAULT_BREAKDOWN, unattempted: 25 }
    }
  });

  const handleAddClick = () => {
      if (!isPro && tests.length >= 2) {
          onOpenUpgrade();
      } else {
          setIsAdding(!isAdding);
      }
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
      alert("File is too large! Please upload an image/PDF smaller than 800KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const type = file.type.includes('pdf') ? 'pdf' : 'image';
      
      setFormData(prev => ({
        ...prev,
        attachment: result,
        attachmentType: type,
        fileName: file.name
      }));
      setPreviewFile({ name: file.name, type });
    };
    reader.readAsDataURL(file);
  };

  const removeAttachment = () => {
    setFormData(prev => ({
      ...prev,
      attachment: undefined,
      attachmentType: undefined,
      fileName: undefined
    }));
    setPreviewFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
      syllabus: { Physics: [], Chemistry: [], Maths: [] },
      attachment: undefined,
      attachmentType: undefined,
      fileName: undefined,
      breakdown: {
        Physics: { ...DEFAULT_BREAKDOWN, unattempted: 25 },
        Chemistry: { ...DEFAULT_BREAKDOWN, unattempted: 25 },
        Maths: { ...DEFAULT_BREAKDOWN, unattempted: 25 }
      }
    });
    setGlobalQCount(75);
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

  const isUpgrade = !isPro && tests.length >= 2;

  return (
    <div id="test-log-container" className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Test Log</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mt-1">
              <p className="text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-bold">Track performance curves</p>
              {!isPro && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 dark:bg-amber-900/20 rounded-full border border-amber-200 dark:border-amber-500/20 w-fit">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-50 animate-pulse shrink-0" />
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap">
                          {tests.length} / 2 Free Tests
                      </span>
                  </div>
              )}
          </div>
        </div>
        <button 
          onClick={handleAddClick} 
          className={`group flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider shadow-lg active:scale-95 transition-all
            ${isUpgrade ? 'bg-amber-500 hover:bg-amber-400 text-white shadow-amber-500/20' : ''}
          `}
          style={!isUpgrade ? {
              backgroundColor: 'var(--theme-accent)',
              color: 'var(--theme-on-accent)',
              boxShadow: '0 10px 15px -3px rgba(var(--theme-accent-rgb), 0.3), 0 4px 6px -2px rgba(var(--theme-accent-rgb), 0.1)'
          } : {}}
        >
          {isAdding 
            ? <X size={16} /> 
            : (isUpgrade) ? <Crown size={16} /> : <Plus size={16} className="group-hover:rotate-90 transition-transform" />
          }
          {isAdding ? 'Cancel' : (isUpgrade) ? 'Upgrade to Log' : 'Log Test'}
        </button>
      </div>

      {/* --- NEW SAFE ANALYTICS COMPONENT --- */}
      <TestAnalytics tests={tests} />

      {/* Add Form */}
      {isAdding && (
        <Card className="bg-slate-900/50 dark:bg-slate-900/50 border border-slate-800 max-w-2xl mx-auto shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Test Name</label>
                <input 
                  type="text" required placeholder="e.g., JEE Mains Mock 12"
                  className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl text-sm text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all placeholder:text-slate-500"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Date</label>
                <input 
                  type="date" required
                  className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl text-sm text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all"
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                />
              </div>

              {/* Test Type Toggle */}
              <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Test Scope</label>
                  <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                      <button 
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, type: 'full' }))}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${formData.type === 'full' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                      >
                          Full Syllabus
                      </button>
                      <button 
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, type: 'part' }))}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${formData.type === 'part' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                      >
                          Part Test
                      </button>
                  </div>
              </div>

              {/* Syllabus Selection (Part Test Only) */}
              {formData.type === 'part' && (
                  <div className="md:col-span-2 space-y-3 bg-slate-800/30 rounded-2xl p-4 border border-slate-700">
                      <div className="flex justify-between items-center">
                          <label className="text-[10px] uppercase font-bold text-indigo-400 flex items-center gap-2">
                              <BookOpen size={14} /> Select Syllabus
                          </label>
                          <div className="flex gap-2">
                              <button 
                                  type="button"
                                  onClick={() => selectAllChapters(syllabusTab)}
                                  className="text-[9px] font-bold uppercase text-slate-400 hover:text-white transition-colors"
                              >
                                  Select All
                              </button>
                              <span className="text-slate-600">|</span>
                              <button 
                                  type="button"
                                  onClick={() => clearChapters(syllabusTab)}
                                  className="text-[9px] font-bold uppercase text-slate-400 hover:text-white transition-colors"
                              >
                                  Clear
                              </button>
                          </div>
                      </div>

                      {/* Subject Tabs */}
                      <div className="flex gap-2 border-b border-slate-700 pb-2 mb-2">
                          {(['Physics', 'Chemistry', 'Maths'] as const).map(sub => (
                              <button
                                  key={sub}
                                  type="button"
                                  onClick={() => setSyllabusTab(sub)}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                                      syllabusTab === sub 
                                      ? 'bg-slate-700 text-white' 
                                      : 'text-slate-500 hover:text-slate-300'
                                  }`}
                              >
                                  {sub} <span className="ml-1 opacity-50">({formData.syllabus?.[sub].length || 0})</span>
                              </button>
                          ))}
                      </div>

                      {/* Chapter Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                          {JEE_SYLLABUS[syllabusTab].map(chapter => {
                              const isSelected = formData.syllabus?.[syllabusTab].includes(chapter);
                              return (
                                  <button
                                      key={chapter}
                                      type="button"
                                      onClick={() => toggleChapter(syllabusTab, chapter)}
                                      className={`
                                          text-left p-2 rounded-lg text-[10px] font-medium transition-all border
                                          ${isSelected 
                                              ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-200' 
                                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                                          }
                                      `}
                                  >
                                      <div className="flex items-start gap-2">
                                          <div className={`mt-0.5 w-3 h-3 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-slate-500'}`}>
                                              {isSelected && <Check size={8} className="text-white" />}
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
                    <button 
                        type="button" 
                        onClick={handleCalculateMarks}
                        className="flex items-center gap-1 px-2 py-0.5 rounded border border-indigo-500/30 text-indigo-400 text-[9px] font-bold uppercase hover:bg-indigo-500/10 transition-colors ml-auto"
                    >
                        <Zap size={10} />
                        Auto-Calc
                    </button>
                  </div>
                  
                  <input 
                    type="number" 
                    placeholder="0"
                    className="w-full h-16 bg-slate-800 border border-slate-700 p-3 rounded-xl text-xl font-mono font-bold text-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
                    value={formData.marks}
                    onChange={(e) => setFormData({...formData, marks: parseInt(e.target.value) || 0})}
                  />
                </div>
                
                <div className="space-y-2">
                   <div className="flex justify-between items-center h-4 mb-1"><label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Total Marks</label></div>
                   <input 
                    type="number" 
                    placeholder="300"
                    className="w-full h-16 bg-slate-800 border border-slate-700 p-3 rounded-xl text-xl font-mono font-bold text-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
                    value={formData.total}
                    onChange={(e) => setFormData({...formData, total: parseInt(e.target.value) || 0})}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center h-4 mb-1"><label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Total Qs</label></div>
                  <input 
                    type="number" 
                    placeholder="75"
                    className="w-full h-16 bg-slate-800 border border-slate-700 p-3 rounded-xl text-xl font-mono font-bold text-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
                    value={globalQCount}
                    onChange={(e) => handleGlobalQuestionChange(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Temperament</label>
                <div className="grid grid-cols-4 gap-2">
                    {['Calm', 'Anxious', 'Focused', 'Fatigued'].map(t => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setFormData({...formData, temperament: t as any})}
                            className={`py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide border transition-all ${formData.temperament === t ? 'bg-white text-slate-900 border-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
              </div>
            </div>

            {/* Deep Dive Analysis Section */}
            <div className="space-y-4 pt-4 border-t border-indigo-500/20">
               <div className="flex items-center justify-between">
                   <label className="text-xs uppercase font-bold text-indigo-400 tracking-widest flex items-center gap-2">
                      <BarChart3 size={16} /> Question Breakdown
                   </label>
               </div>
               
               <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden shadow-sm">
                  {/* Subject Tabs */}
                  <div className="flex border-b border-slate-700 bg-slate-900/50">
                     {(['Physics', 'Chemistry', 'Maths'] as const).map(subject => (
                        <button
                           key={subject}
                           type="button"
                           onClick={() => setActiveTab(subject)}
                           className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 relative
                              ${activeTab === subject 
                                 ? 'text-indigo-400 bg-slate-800' 
                                 : 'text-slate-400 hover:text-slate-300'
                              }`}
                        >
                           {activeTab === subject && <div className="absolute top-0 left-0 w-full h-0.5 bg-indigo-500" />}
                           {subject === 'Physics' && <Atom size={14} />}
                           {subject === 'Chemistry' && <Zap size={14} />}
                           {subject === 'Maths' && <Calculator size={14} />}
                           <span className="hidden md:inline">{subject}</span>
                        </button>
                     ))}
                  </div>

                  {/* Input Fields */}
                  <div className="p-6 space-y-6">
                     {/* Total Questions Row */}
                     <div className="flex items-center gap-4 p-3 bg-slate-900/30 rounded-xl border border-slate-700">
                        <div className="p-2 bg-slate-800 rounded-lg text-slate-400">
                            <Target size={18} />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-bold uppercase text-slate-500">Total {activeTab} Qs</p>
                            <input 
                                type="number" min="0" placeholder="0"
                                className="w-full bg-transparent text-lg font-mono font-bold text-white outline-none"
                                value={activeTotalQuestions || ''}
                                onChange={(e) => handleTotalChange(activeTab, parseInt(e.target.value) || 0)}
                            />
                        </div>
                     </div>

                     <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                           <NumberScrollInput 
                              label="Correct"
                              value={formData.breakdown?.[activeTab].correct || 0}
                              onChange={(val) => handleStatChange(activeTab, 'correct', val)}
                              max={activeTotalQuestions}
                              color="emerald"
                           />
                        </div>
                        <div className="space-y-1">
                           <NumberScrollInput 
                              label="Wrong"
                              value={formData.breakdown?.[activeTab].incorrect || 0}
                              onChange={(val) => handleStatChange(activeTab, 'incorrect', val)}
                              max={activeTotalQuestions}
                              color="rose"
                           />
                        </div>
                        <div className="space-y-1 opacity-60">
                           <label className="text-[9px] uppercase font-bold text-slate-400 ml-1">Skipped</label>
                           <input 
                              type="number" 
                              readOnly
                              disabled
                              className="w-full h-16 bg-slate-700/50 border border-slate-700 p-3 rounded-xl text-center text-xl font-mono font-bold text-slate-400 cursor-not-allowed"
                              value={formData.breakdown?.[activeTab].unattempted || 0}
                           />
                        </div>
                     </div>

                     <div className="p-4 bg-rose-500/10 rounded-xl border border-rose-500/20">
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest flex items-center gap-2">
                                <AlertCircle size={14} /> Mistake Analysis
                            </p>
                            <span className="text-[9px] px-2 py-1 bg-black/20 rounded text-rose-400 font-mono border border-rose-500/20">
                                {activeTaggedCount} / {formData.breakdown?.[activeTab].incorrect} tagged
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {MISTAKE_TYPES.map(type => (
                                <div key={type.id} className="flex items-center justify-between p-2 bg-black/20 rounded-lg border border-white/5 hover:border-rose-500/30 transition-colors">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <span className={`${type.color} shrink-0 scale-75`}>{type.icon}</span>
                                        <span className="text-[9px] font-bold uppercase text-slate-300 truncate">{type.label}</span>
                                    </div>
                                    <div className="flex items-center gap-1 bg-white/10 rounded p-0.5">
                                        <button 
                                            type="button"
                                            onClick={() => updateMistake(activeTab, type.id as keyof MistakeCounts, -1)}
                                            className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-slate-400"
                                        >-</button>
                                        <span className="w-4 text-center font-mono font-bold text-xs text-white">
                                            {activeMistakes[type.id as keyof MistakeCounts] || 0}
                                        </span>
                                        <button 
                                            type="button"
                                            onClick={() => updateMistake(activeTab, type.id as keyof MistakeCounts, 1)}
                                            className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-slate-400"
                                        >+</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* File Upload Section */}
            <div className="space-y-2">
               <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Attachment</label>
               {!previewFile ? (
                 <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-black/20 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all group"
                 >
                    <div className="p-3 bg-white/5 rounded-full mb-2 group-hover:scale-110 transition-transform shadow-sm">
                        <UploadCloud className="text-indigo-400" size={20} />
                    </div>
                    <p className="text-xs font-bold text-slate-400 group-hover:text-indigo-400 transition-colors">Click to upload Scorecard / PDF</p>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                    />
                 </div>
               ) : (
                 <div className="flex items-center justify-between p-3 bg-black/20 border border-slate-700 rounded-xl">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400 shrink-0">
                            {previewFile.type === 'pdf' ? <FileText size={18} /> : <ImageIcon size={18} />}
                        </div>
                        <span className="text-xs font-bold text-slate-200 truncate">{previewFile.name}</span>
                    </div>
                    <button type="button" onClick={removeAttachment} className="p-2 hover:bg-rose-500/10 rounded-lg text-rose-500 transition-colors">
                        <X size={16} />
                    </button>
                 </div>
               )}
            </div>

            <button type="submit" 
                className="w-full py-4 rounded-xl font-bold uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95"
                style={{
                    backgroundColor: 'var(--theme-accent)',
                    color: 'var(--theme-on-accent)',
                    boxShadow: '0 10px 15px -3px rgba(var(--theme-accent-rgb), 0.3), 0 4px 6px -2px rgba(var(--theme-accent-rgb), 0.1)'
                }}
            >
                Save Performance
            </button>
          </form>
        </Card>
      )}

      {/* Grid Layout for Tests */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tests.length === 0 ? (
          <div className="col-span-full text-center py-20 opacity-60 border-2 border-dashed border-slate-300 dark:border-white/10 rounded-3xl bg-white/30 dark:bg-white/5">
            <Trophy size={48} className="mx-auto mb-4 text-slate-400 dark:text-slate-500" />
            <p className="text-xs uppercase font-bold tracking-[0.3em] text-slate-600 dark:text-slate-400">No test records found</p>
          </div>
        ) : (
          tests.map((t, i) => (
            <Card 
                key={t.id} 
                className="group flex flex-col justify-between hover:border-indigo-500/30 cursor-pointer overflow-hidden p-0" 
                delay={i * 0.1}
                onClick={() => { setViewingReport(t); setReportSubject(null); }}
            >
              <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col">
                         <div className="flex items-center gap-2 mb-1">
                             <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{t.date}</span>
                             {t.type === 'part' && (
                                 <span className="px-1.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 text-[8px] font-bold uppercase tracking-wider">
                                     Part
                                 </span>
                             )}
                         </div>
                         <h3 className="text-slate-900 dark:text-white font-bold text-base line-clamp-1 leading-tight">{t.name}</h3>
                         <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider mt-2 w-fit ${
                             t.temperament === 'Calm' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
                             t.temperament === 'Anxious' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400' :
                             'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400'
                         }`}>
                             {t.temperament}
                         </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="text-3xl font-display font-bold text-slate-900 dark:text-white leading-none">
                          {t.marks}
                          <span className="text-xs text-slate-400 font-medium ml-0.5">/{t.total}</span>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-500 mt-1">
                          {Math.round((t.marks/t.total)*100)}% Score
                      </span>
                    </div>
                  </div>
                  
                  {/* Visual Bar Breakdown */}
                  {t.breakdown && (
                    <div className="flex gap-1 h-2 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-white/5 mt-4">
                        {(['Physics', 'Chemistry', 'Maths'] as const).map(sub => {
                            const d = t.breakdown![sub];
                            const correct = Number(d.correct) || 0;
                            const incorrect = Number(d.incorrect) || 0;
                            const accuracy = (correct + incorrect > 0) ? (correct / (correct + incorrect)) : 0;
                            const safeWidth = Number.isFinite(accuracy) ? accuracy * 100 : 0;
                            
                            const width = (100/3); 
                            const color = sub === 'Physics' ? 'bg-blue-500' : sub === 'Chemistry' ? 'bg-orange-500' : 'bg-rose-500';
                            
                            return (
                                <div key={sub} className="h-full relative group/bar" style={{ width: `${width}%` }}>
                                    <div className={`h-full ${color} opacity-30 w-full absolute top-0 left-0`} />
                                    <div className={`h-full ${color} absolute top-0 left-0`} style={{ width: `${safeWidth}%` }} />
                                </div>
                            )
                        })}
                    </div>
                  )}
                  
                  {/* Legend */}
                  <div className="flex justify-between mt-2 px-1">
                      {(['Physics', 'Chemistry', 'Maths'] as const).map(sub => (
                          <span key={sub} className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{sub.slice(0,1)}</span>
                      ))}
                  </div>
              </div>
              
              {/* Footer Actions */}
              <div className="flex justify-between items-center px-5 py-3 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5 mt-auto">
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-indigo-500 transition-colors">
                    View Report <ChevronRight size={12} />
                </div>
                <div className="flex gap-2">
                    {t.attachment && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); setViewingAttachment(t); }}
                            className="p-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-500 transition-colors"
                        >
                            {t.attachmentType === 'pdf' ? <FileText size={14} /> : <ImageIcon size={14} />}
                        </button>
                    )}
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(t.id); }} 
                        className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-500 transition-colors"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* --- Detailed Report Card Modal --- */}
      {viewingReport && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-lg animate-in fade-in duration-200">
              <div className="bg-white dark:bg-[#0f172a] w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white/10">
                  {/* ... (Header) ... */}
                  <div className="relative p-8 bg-slate-900 overflow-hidden shrink-0">
                      <div className="absolute inset-0 opacity-30">
                          <div className={`absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[80px] translate-x-1/2 -translate-y-1/2`} />
                          <div className={`absolute bottom-0 left-0 w-48 h-48 bg-purple-500 rounded-full blur-[60px] -translate-x-1/3 translate-y-1/3`} />
                      </div>
                      
                      <div className="relative z-10 flex justify-between items-start">
                          <div>
                              <div className="flex items-center gap-2 mb-2">
                                  <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">{viewingReport.date}</span>
                                  <span className="w-1 h-1 bg-white/40 rounded-full" />
                                  <span className={`text-[10px] font-bold uppercase tracking-widest ${viewingReport.type === 'part' ? 'text-purple-300' : 'text-emerald-400'}`}>
                                      {viewingReport.type === 'part' ? 'PART TEST' : 'FULL SYLLABUS'}
                                  </span>
                              </div>
                              <h2 className="text-2xl font-bold text-white leading-tight">{viewingReport.name}</h2>
                          </div>
                          <button onClick={() => setViewingReport(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                              <X size={18} />
                          </button>
                      </div>

                      <div className="relative z-10 flex items-end gap-2 mt-6">
                          <span className="text-6xl font-display font-bold text-white tracking-tighter">
                              {viewingReport.marks}
                          </span>
                          <div className="flex flex-col mb-2">
                              <span className="text-sm font-medium text-white/60">/ {viewingReport.total}</span>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">
                                  {Math.round((viewingReport.marks / viewingReport.total) * 100)}% Score
                              </span>
                          </div>
                      </div>
                  </div>

                  {/* Body */}
                  <div className="p-6 overflow-y-auto bg-slate-50 dark:bg-[#0f172a]">
                      
                      {/* Subject Breakdown List */}
                      <div className="mb-8">
                          <div className="flex justify-between items-center mb-4">
                              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                  <PieChart size={14} /> Subject Analysis
                              </h4>
                              {reportSubject && (
                                <button 
                                    onClick={() => setReportSubject(null)}
                                    className="text-[9px] font-bold text-indigo-500 flex items-center gap-1 hover:underline"
                                >
                                    Viewing {reportSubject} <X size={10} />
                                </button>
                              )}
                          </div>
                          
                          <div className="space-y-3">
                              {(['Physics', 'Chemistry', 'Maths'] as const).map(sub => {
                                  const d = viewingReport.breakdown?.[sub] || { correct: 0, incorrect: 0, unattempted: 0 };
                                  const total = d.correct + d.incorrect + d.unattempted;
                                  const attempted = d.correct + d.incorrect;
                                  const acc = attempted > 0 ? Math.round((d.correct / attempted) * 100) : 0;
                                  
                                  const color = sub === 'Physics' ? 'text-blue-500' : sub === 'Chemistry' ? 'text-orange-500' : 'text-rose-500';
                                  const bg = sub === 'Physics' ? 'bg-blue-500' : sub === 'Chemistry' ? 'bg-orange-500' : 'bg-rose-500';
                                  const isSelected = reportSubject === sub;

                                  return (
                                      <div 
                                        key={sub} 
                                        onClick={() => setReportSubject(prev => prev === sub ? null : sub)}
                                        className={`
                                            relative overflow-hidden rounded-2xl p-4 cursor-pointer transition-all duration-300 border
                                            ${isSelected 
                                                ? 'bg-white dark:bg-white/5 border-indigo-500 dark:border-indigo-500 shadow-lg scale-[1.02]' 
                                                : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 hover:border-indigo-300 dark:hover:border-white/20'
                                            }
                                        `}
                                      >
                                          <div className="flex items-center justify-between mb-3 relative z-10">
                                              <div className="flex items-center gap-3">
                                                  <div className={`p-2 rounded-lg ${bg} bg-opacity-10 dark:bg-opacity-20 ${color}`}>
                                                      {sub === 'Physics' ? <Atom size={18} /> : sub === 'Chemistry' ? <Zap size={18} /> : <Calculator size={18} />}
                                                  </div>
                                                  <div>
                                                      <h5 className={`text-sm font-bold ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}`}>{sub}</h5>
                                                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{d.correct}/{total} Correct</p>
                                                  </div>
                                              </div>
                                              <div className="text-right">
                                                  <span className="text-lg font-mono font-bold text-slate-900 dark:text-white">{acc}%</span>
                                                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Accuracy</p>
                                              </div>
                                          </div>
                                          
                                          {/* Mini Stats Grid */}
                                          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-white/5 relative z-10">
                                              <div className="text-center">
                                                  <span className="block text-xs font-mono font-bold text-emerald-500">{d.correct}</span>
                                                  <span className="block text-[8px] uppercase font-bold text-slate-400 tracking-wider">Right</span>
                                              </div>
                                              <div className="text-center">
                                                  <span className="block text-xs font-mono font-bold text-rose-500">{d.incorrect}</span>
                                                  <span className="block text-[8px] uppercase font-bold text-slate-400 tracking-wider">Wrong</span>
                                              </div>
                                              <div className="text-center">
                                                  <span className="block text-xs font-mono font-bold text-slate-500">{d.unattempted}</span>
                                                  <span className="block text-[8px] uppercase font-bold text-slate-400 tracking-wider">Skip</span>
                                              </div>
                                          </div>
                                      </div>
                                  )
                              })}
                          </div>
                      </div>

                      {/* Syllabus Covered Section (Only if Part Test and data exists) */}
                      {viewingReport.type === 'part' && viewingReport.syllabus && (
                          <div className="mb-8">
                              <div className="flex items-center justify-between mb-4">
                                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                      <ListChecks size={14} /> Syllabus Covered
                                  </h4>
                              </div>
                              <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl p-4 space-y-4">
                                  {(['Physics', 'Chemistry', 'Maths'] as const).map(sub => {
                                      const chapters = viewingReport.syllabus?.[sub] || [];
                                      if (chapters.length === 0) return null;
                                      
                                      const color = sub === 'Physics' ? 'text-blue-500' : sub === 'Chemistry' ? 'text-orange-500' : 'text-rose-500';
                                      
                                      return (
                                          <div key={sub}>
                                              <h5 className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${color}`}>{sub}</h5>
                                              <div className="flex flex-wrap gap-1.5">
                                                  {chapters.map(chap => (
                                                      <span key={chap} className="px-2 py-1 bg-slate-100 dark:bg-white/10 rounded-md text-[9px] font-medium text-slate-700 dark:text-slate-300">
                                                          {chap}
                                                      </span>
                                                  ))}
                                              </div>
                                          </div>
                                      )
                                  })}
                                  {(!viewingReport.syllabus.Physics.length && !viewingReport.syllabus.Chemistry.length && !viewingReport.syllabus.Maths.length) && (
                                      <p className="text-[10px] text-slate-400 italic text-center">No specific chapters logged.</p>
                                  )}
                              </div>
                          </div>
                      )}

                      {/* Mistake Analysis Aggregation */}
                      <div>
                          {/* ... (Mistake rendering logic mostly fine as it doesn't use complex styles) ... */}
                          <div className="flex items-center justify-between mb-4">
                              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                  <AlertCircle size={14} className={reportSubject ? 'text-indigo-500' : 'text-slate-400'} /> 
                                  {reportSubject ? `${reportSubject} Mistakes` : 'Overall Mistakes'}
                              </h4>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                              {MISTAKE_TYPES.map(type => {
                                  let count = 0;
                                  if (viewingReport.breakdown) {
                                      if (reportSubject) {
                                          const mistakes = viewingReport.breakdown[reportSubject].mistakes;
                                          if (mistakes) count = mistakes[type.id as keyof MistakeCounts] || 0;
                                          if (type.id === 'calc' && count === 0) count = viewingReport.breakdown[reportSubject].calcErrors || 0;
                                          if (type.id === 'concept' && count === 0) count = viewingReport.breakdown[reportSubject].otherErrors || 0;
                                      } else {
                                          (['Physics', 'Chemistry', 'Maths'] as const).forEach(sub => {
                                              const mistakes = viewingReport.breakdown![sub].mistakes;
                                              if (mistakes) count += (mistakes[type.id as keyof MistakeCounts] || 0);
                                          });
                                          if (type.id === 'calc' && count === 0) (['Physics', 'Chemistry', 'Maths'] as const).forEach(sub => count += viewingReport.breakdown![sub].calcErrors || 0);
                                          if (type.id === 'concept' && count === 0) (['Physics', 'Chemistry', 'Maths'] as const).forEach(sub => count += viewingReport.breakdown![sub].otherErrors || 0);
                                      }
                                  }

                                  if (count === 0) return null;

                                  return (
                                      <div key={type.id} className="flex items-center justify-between p-3 bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm animate-in zoom-in-95 duration-300">
                                          <div className="flex items-center gap-2 overflow-hidden">
                                              <span className={`${type.color} shrink-0`}>{type.icon}</span>
                                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 truncate">{type.label}</span>
                                          </div>
                                          <span className="text-sm font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded">{count}</span>
                                      </div>
                                  )
                              })}
                              
                              <div className="col-span-2 text-center py-4">
                                  {!MISTAKE_TYPES.some(type => {
                                      let count = 0;
                                      if (viewingReport.breakdown) {
                                          if (reportSubject) {
                                              count = (viewingReport.breakdown[reportSubject].mistakes?.[type.id as keyof MistakeCounts] || 0);
                                          } else {
                                              (['Physics', 'Chemistry', 'Maths'] as const).forEach(sub => count += (viewingReport.breakdown![sub].mistakes?.[type.id as keyof MistakeCounts] || 0));
                                          }
                                      }
                                      return count > 0;
                                  }) && (
                                      <p className="text-[10px] uppercase font-bold text-slate-400 italic">No mistakes tagged for this selection</p>
                                  )}
                              </div>
                          </div>
                      </div>
                  </div>
                  
                  {/* Footer with Attachment button if exists */}
                  {viewingReport.attachment && (
                      <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0f172a] shrink-0">
                          <button 
                              onClick={() => { setViewingReport(null); setViewingAttachment(viewingReport); }}
                              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 rounded-xl text-indigo-600 dark:text-indigo-400 font-bold uppercase text-xs tracking-widest transition-all"
                          >
                              {viewingReport.attachmentType === 'pdf' ? <FileText size={16} /> : <ImageIcon size={16} />}
                              View Attached Paper
                          </button>
                      </div>
                  )}
              </div>
          </div>,
          document.body
      )}

      {/* Attachment Viewer Modal */}
      {viewingAttachment && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xl animate-in fade-in duration-200">
              <div className="bg-white dark:bg-[#0f172a] w-full max-w-4xl h-[85vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-white/10">
                  <div className="p-4 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-white dark:bg-[#0f172a]">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                              {viewingAttachment.attachmentType === 'pdf' ? <FileText size={20} /> : <ImageIcon size={20} />}
                          </div>
                          <div>
                              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{viewingAttachment.name}</h3>
                              <p className="text-[10px] text-slate-500 font-mono uppercase">{viewingAttachment.fileName || 'Attachment'}</p>
                          </div>
                      </div>
                      <button 
                        onClick={() => setViewingAttachment(null)}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors"
                      >
                          <X size={20} />
                      </button>
                  </div>
                  <div className="flex-1 bg-slate-100 dark:bg-black/50 overflow-auto flex items-center justify-center p-4 relative">
                      {viewingAttachment.attachmentType === 'image' ? (
                          <img 
                            src={viewingAttachment.attachment} 
                            alt="Test Paper" 
                            className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                          />
                      ) : (
                          <div className="text-center">
                              <FileText size={64} className="text-slate-400 mx-auto mb-4" />
                              <p className="text-slate-500 dark:text-slate-300 mb-6 font-medium">PDF Preview is not supported in this view.</p>
                              <a 
                                href={viewingAttachment.attachment} 
                                download={viewingAttachment.fileName || "test-paper.pdf"}
                                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg transition-all inline-flex items-center gap-2"
                              >
                                  <Download size={16} /> Download PDF
                              </a>
                          </div>
                      )}
                  </div>
              </div>
          </div>,
          document.body
      )}

      {/* Upcoming Tests Section */}
      {upcomingTests.length > 0 && (
          <div className="pt-8 border-t border-slate-200 dark:border-white/10 mt-8">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                  <Calendar size={14} className="text-amber-500" /> Upcoming Scheduled Tests
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcomingTests.map(t => {
                      const dateObj = new Date(t.date + 'T00:00:00'); 
                      const daysLeft = Math.ceil((dateObj.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      
                      return (
                          <div key={t.id} className="bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/20 p-4 rounded-2xl relative overflow-hidden group hover:border-amber-300 dark:hover:border-amber-500/40 transition-colors">
                              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                  <Clock size={48} className="text-amber-600 dark:text-amber-400" />
                              </div>
                              <h4 className="font-bold text-slate-900 dark:text-white truncate pr-6 text-sm">{t.text}</h4>
                              <div className="flex justify-between items-end mt-3">
                                  <div className="flex flex-col">
                                      <span className="text-[10px] uppercase font-bold text-amber-600/70 dark:text-amber-400/70">Date</span>
                                      <span className="text-sm font-mono font-bold text-slate-700 dark:text-slate-300">
                                          {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                      </span>
                                  </div>
                                  <div className="px-2 py-1 bg-amber-500 text-white text-[10px] font-bold uppercase rounded-lg shadow-md">
                                      {daysLeft <= 0 ? 'Today' : `T - ${daysLeft} days`}
                                  </div>
                              </div>
                          </div>
                      )
                  })}
              </div>
          </div>
      )}
    </div>
  );
});