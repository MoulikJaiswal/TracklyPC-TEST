
import React, { useState, useMemo, memo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    Plus, X, Trash2, Trophy, TrendingUp, ArrowLeft, Layers, Brain,
    Search, ArrowUpNarrowWide, Check, ChevronRight, BookOpen, Target as TargetIcon, Loader2
} from 'lucide-react';
import { TestResult, SubjectBreakdown, SyllabusData, StreamType, MistakeCounts, AdvancedQuestionType, AdvancedMarkingScheme } from '../types';
import { Card } from './Card';
import { MISTAKE_TYPES, EXAM_PRESETS } from '../constants';
import { ConfirmationModal } from './ConfirmationModal';
import { AnimatePresence, motion } from 'framer-motion';

const getLocalDate = () => new Date().toISOString().split('T')[0];
const safeNum = (n: any): number => (typeof n === 'number' && isFinite(n) ? n : 0);
const safeDiv = (n: number, d: number): number => (d === 0 ? 0 : n / d);

interface TestLogProps {
    tests: TestResult[];
    onSave: (test: Omit<TestResult, 'id' | 'timestamp' | 'stream'>) => void;
    onDelete: (id: string) => void;
    syllabus: SyllabusData;
    stream: StreamType;
}

const StatInput = memo(({ label, value, onChange, color, className }: { label: string, value: number, onChange: (val: number) => void, color: string, className?: string }) => {
    return (
        <div className={`p-3 rounded-2xl border ${color} bg-opacity-10 ${className}`}>
            <label className="block text-center text-[10px] font-bold uppercase tracking-widest mb-2 text-white/50">{label}</label>
            <div className="flex items-center justify-center gap-1">
                <button type="button" onClick={() => onChange(Math.max(0, value - 1))} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-colors">-</button>
                <input type="number" value={value || ''} onChange={(e) => onChange(parseInt(e.target.value) || 0)} className="w-14 text-center bg-transparent text-2xl font-mono font-bold text-white focus:outline-none" />
                <button type="button" onClick={() => onChange(value + 1)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-colors">+</button>
            </div>
        </div>
    );
});

const MarkInput = memo(({ label, value, onChange, placeholder }: { label: string, value: number | undefined, onChange: (val: number) => void, placeholder?: string }) => {
    return (
        <div className="p-3 rounded-2xl border border-slate-500/20 bg-opacity-10">
            <label className="block text-center text-[10px] font-bold uppercase tracking-widest mb-2 text-white/50">{label}</label>
            <input
                type="number"
                value={value || ''}
                onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                className="w-full text-center bg-transparent text-2xl font-mono font-bold placeholder:text-white/20 text-white focus:outline-none"
                placeholder={placeholder}
            />
        </div>
    );
});

const TestLogForm = ({ onSave, onCancel, syllabus, stream }: { onSave: (test: Omit<TestResult, 'id' | 'timestamp' | 'stream'>) => void, onCancel: () => void, syllabus: SyllabusData, stream: StreamType }) => {
    const [step, setStep] = useState(1);
    const subjects = useMemo(() => Object.keys(syllabus), [syllabus]);
    const [testSubjects, setTestSubjects] = useState<string[]>(subjects);

    const examTypeOptions = useMemo(() => {
        if (stream === 'JEE') return ['JEE Main', 'JEE Advanced'];
        if (stream === 'NEET') return ['NEET'];
        return ['Custom / General'];
    }, [stream]);

    const getInitialState = useCallback(() => {
        const initialExamType = examTypeOptions[0] as TestResult['examType'];
        return {
            name: '',
            date: getLocalDate(),
            examType: initialExamType,
            markingScheme: EXAM_PRESETS[initialExamType as keyof typeof EXAM_PRESETS].markingScheme,
            advancedMarkingScheme: (EXAM_PRESETS[initialExamType as keyof typeof EXAM_PRESETS] as any)?.advancedMarkingScheme,
            temperament: 'Focused' as const,
            breakdown: Object.keys(syllabus).reduce((acc, sub) => ({
                ...acc, [sub]: {
                    correct: 0,
                    incorrect: 0,
                    unattempted: 0,
                    marks: undefined,
                    total: undefined,
                    timeSpent: 0,
                    mistakes: MISTAKE_TYPES.reduce((m, t) => ({ ...m, [t.id]: 0 }), {}),
                    advancedBreakdown: {
                        singleCorrect: { correct: 0, incorrect: 0, unattempted: 0 },
                        multipleCorrect: { correct: 0, incorrect: 0, unattempted: 0, partialCorrect: 0 },
                        numerical: { correct: 0, incorrect: 0, unattempted: 0 },
                        matchFollowing: { correct: 0, incorrect: 0, unattempted: 0, partialCorrect: 0 },
                        paragraph: { correct: 0, incorrect: 0, unattempted: 0 }
                    }
                }
            }), {} as Record<string, SubjectBreakdown>),
            weakTopics: [],
            postTestNotes: '',
            testScope: 'Full' as const,
            partTestChapters: {},
        } as Partial<TestResult>;
    }, [syllabus, examTypeOptions]);

    const [testData, setTestData] = useState<Partial<TestResult>>(getInitialState());

    const isCustomTest = testData.examType === 'Custom / General';

    useEffect(() => {
        setTestData(getInitialState());
        setTestSubjects(Object.keys(syllabus));
    }, [stream, getInitialState, syllabus]);

    const calculatedScores = useMemo(() => {
        if (!testData.breakdown) return { totalMarks: 0, maxMarks: 0 };

        let totalMarks = 0;
        let maxMarks = 0;
        const subjectsForCalc = stream === 'General' ? testSubjects : subjects;
        const isAdvanced = testData.examType === 'JEE Advanced';

        if (isCustomTest) {
            for (const subject of subjectsForCalc) {
                const b = testData.breakdown[subject];
                if (b) {
                    totalMarks += safeNum(b.marks);
                    maxMarks += safeNum(b.total);
                }
            }
        } else if (isAdvanced && testData.advancedMarkingScheme) {
            const scheme = testData.advancedMarkingScheme;
            for (const subject of subjectsForCalc) {
                const b = testData.breakdown[subject]?.advancedBreakdown;
                if (b) {
                    for (const key of Object.keys(b)) {
                        const qType = key as AdvancedQuestionType;
                        const stats = b[qType];
                        const sScheme = scheme[qType];
                        if (stats && sScheme) {
                            const partialMarkTarget = (sScheme as any).partial || 0;
                            totalMarks += safeNum(stats.correct) * sScheme.correct + safeNum(stats.incorrect) * sScheme.incorrect + safeNum(stats.partialCorrect) * safeNum(partialMarkTarget);
                            maxMarks += (safeNum(stats.correct) + safeNum(stats.incorrect) + safeNum(stats.unattempted)) * sScheme.correct;
                        }
                    }
                }
            }
        } else {
            if (!testData.markingScheme) return { totalMarks: 0, maxMarks: 0 };
            const scheme = testData.markingScheme;
            for (const subject of subjectsForCalc) {
                const b = testData.breakdown[subject];
                if (b) {
                    totalMarks += safeNum(b.correct) * scheme.correct + safeNum(b.incorrect) * scheme.incorrect;
                    maxMarks += (safeNum(b.correct) + safeNum(b.incorrect) + safeNum(b.unattempted)) * scheme.correct;
                }
            }
        }
        return { totalMarks, maxMarks };
    }, [testData.breakdown, testData.markingScheme, testData.advancedMarkingScheme, testData.examType, subjects, testSubjects, stream, isCustomTest]);

    const handleExamTypeChange = (type: TestResult['examType']) => {
        const preset = EXAM_PRESETS[type as keyof typeof EXAM_PRESETS];
        setTestData(prev => ({
            ...prev,
            examType: type,
            markingScheme: preset.markingScheme,
            advancedMarkingScheme: (preset as any).advancedMarkingScheme // fallback for TS
        }));
    };

    const toggleSubject = (subject: string) => {
        setTestSubjects(prev =>
            prev.includes(subject)
                ? prev.filter(s => s !== subject)
                : [...prev, subject]
        );
    };

    const handleChapterToggle = (subject: string, chapter: string) => {
        setTestData(prev => {
            const currentChapters = prev.partTestChapters?.[subject] || [];
            const newChapters = currentChapters.includes(chapter)
                ? currentChapters.filter(c => c !== chapter)
                : [...currentChapters, chapter];

            return {
                ...prev,
                partTestChapters: {
                    ...prev.partTestChapters,
                    [subject]: newChapters,
                }
            };
        });
    };

    const handleSubjectChange = (subject: string, field: 'correct' | 'incorrect' | 'unattempted', value: number) => {
        setTestData(prev => ({ ...prev, breakdown: { ...prev!.breakdown, [subject]: { ...prev!.breakdown![subject]!, [field]: value } } }));
    };

    const handleSubjectMarksChange = (subject: string, field: 'marks' | 'total', value: number) => {
        setTestData(prev => {
            const breakdown = { ...prev.breakdown! };
            const subjectBreakdown = { ...breakdown[subject]! };

            if (field === 'marks') {
                subjectBreakdown.marks = value;
            } else if (field === 'total') {
                subjectBreakdown.total = value;
            }

            if (subjectBreakdown.total !== undefined && subjectBreakdown.marks !== undefined && subjectBreakdown.marks > subjectBreakdown.total) {
                subjectBreakdown.marks = subjectBreakdown.total;
            }

            breakdown[subject] = subjectBreakdown;
            return { ...prev, breakdown };
        });
    };

    const handleMistakeChange = (subject: string, mistakeType: string, value: number) => {
        setTestData(prev => {
            const currentMistakes = prev.breakdown?.[subject]?.mistakes || {};
            const incorrectCount = prev.breakdown?.[subject]?.incorrect || 0;
            const currentTagged = Object.entries(currentMistakes).reduce((sum: number, [key, val]) => sum + (key === mistakeType ? 0 : safeNum(val as number | undefined)), 0);
            const newValue = Math.min(value, incorrectCount - currentTagged);

            return { ...prev, breakdown: { ...prev.breakdown, [subject]: { ...prev.breakdown![subject]!, mistakes: { ...currentMistakes, [mistakeType]: newValue } } } }
        });
    };

    const handleSave = () => {
        const finalData: Omit<TestResult, 'id' | 'timestamp' | 'stream'> = {
            ...testData,
            name: testData.name || 'Untitled Test',
            date: testData.date || getLocalDate(),
            marks: calculatedScores.totalMarks,
            total: calculatedScores.maxMarks,
            examType: testData.examType || 'Custom / General',
            temperament: testData.temperament || 'Focused',
            partTestChapters: testData.testScope === 'Part' ? testData.partTestChapters : undefined,
        };
        onSave(finalData);
    };

    const isAdvanced = testData.examType === 'JEE Advanced';
    const allSteps = [
        { title: 'Test Details' },
        ...(isAdvanced ? [{ title: 'Test Pattern' }] : []),
        { title: 'Performance' },
        { title: 'Mistake Analysis' },
        { title: 'Final Review' }
    ];

    const getDisplayStep = () => {
        if (isCustomTest) {
            if (step === 1) return { current: 1, total: 3, title: 'Test Details' };
            if (step === 3) return { current: 2, total: 3, title: 'Performance' };
            if (step === 5) return { current: 3, total: 3, title: 'Final Review' };
            return { current: 1, total: 3, title: 'Error' };
        }

        let visualTotal = isAdvanced ? 5 : 4;
        let displayCurrent = step;
        if (!isAdvanced) {
            if (step === 1) displayCurrent = 1;
            else if (step === 3) displayCurrent = 2; // Performance
            else if (step === 4) displayCurrent = 3; // Mistakes
            else if (step === 5) displayCurrent = 4; // Final Review
        }

        return { current: displayCurrent, total: visualTotal, title: allSteps[displayCurrent - 1]?.title || 'Error' };
    }
    const { current: displayCurrent, total: displayTotal, title: displayTitle } = getDisplayStep();

    const handleNext = () => {
        if (step === 1 && !isAdvanced) setStep(3); // Skip pattern config
        else if (step === 3 && isCustomTest) setStep(5); // Skip mistakes for custom
        else setStep(s => s + 1);
    };

    const handleBack = () => {
        if (step === 5 && isCustomTest) setStep(3);
        else if (step === 3 && !isAdvanced) setStep(1); // Jump back over pattern config
        else setStep(s => s - 1);
    };

    const currentStepValid = useMemo(() => {
        if (step === 1) {
            if (stream === 'General' && testSubjects.length === 0) return false;
            if (stream !== 'General' && testData.testScope === 'Part') {
                const hasChapters = Object.values(testData.partTestChapters || {}).some(chapters => Array.isArray(chapters) && chapters.length > 0);
                if (!hasChapters) return false;
            }
            return !!testData.name?.trim();
        }
        if (step === 2) {
            // Step 2 is now ONLY the Pattern Configurator for Advanced tests
            if (isAdvanced) {
                return testData.advancedMarkingScheme && Object.keys(testData.advancedMarkingScheme).length > 0;
            }
            return true;
        }
        if (step === 3) {
            // Step 3 is Score Entry for ALL tests
            if (isCustomTest) {
                return testSubjects.some(sub => safeNum(testData.breakdown?.[sub]?.total) > 0);
            }
            if (isAdvanced) {
                return testSubjects.some(sub => {
                    const aBreakdown = testData.breakdown?.[sub]?.advancedBreakdown;
                    if (!aBreakdown) return false;
                    return Object.values(aBreakdown).some(stats => (safeNum(stats.correct) + safeNum(stats.incorrect) + safeNum(stats.unattempted)) > 0);
                });
            }
            return testSubjects.some(sub => {
                const b = testData.breakdown?.[sub];
                return b && (safeNum(b.correct) + safeNum(b.incorrect) + safeNum(b.unattempted)) > 0;
            });
        }
        return true;
    }, [step, testData, testSubjects, stream, isCustomTest]);

    return createPortal(
        <div className="fixed inset-0 z-[120] bg-[#080b14] flex flex-col">
            {/* Atmospheric orbs */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-theme-accent/20 blur-[100px]" />
                <div className="absolute top-1/3 -right-32 w-80 h-80 rounded-full bg-violet-600/15 blur-[120px]" />
                <div className="absolute bottom-0 left-1/3 w-72 h-72 rounded-full bg-sky-600/10 blur-[80px]" />
            </div>

            {/* ── HEADER ── */}
            <div className="shrink-0 relative z-10 px-4 pt-5 pb-2 flex flex-col gap-3">

                <div className="flex justify-between items-center">
                    <button
                        onClick={step > 1 ? handleBack : onCancel}
                        className="group flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white/80 transition-colors"
                    >
                        <ArrowLeft size={15} />
                        {step > 1 ? 'Back' : 'Cancel'}
                    </button>

                    <div className="flex items-center gap-1.5">
                        {Array.from({ length: displayTotal }, (_, i) => (
                            <div key={i} className={`rounded-full transition-all duration-500 ${i < displayCurrent - 1 ? 'w-6 h-2 bg-theme-accent/50' :
                                i === displayCurrent - 1 ? 'w-6 h-2 bg-theme-accent shadow-[0_0_8px_var(--theme-accent)]' :
                                    'w-2 h-2 bg-white/15'
                                }`} />
                        ))}
                    </div>


                    {displayCurrent < displayTotal
                        ? <button onClick={handleNext} disabled={!currentStepValid} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-theme-accent text-black disabled:bg-white/10 disabled:text-white/30 disabled:shadow-none disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-theme-accent/30 hover:shadow-theme-accent/50">
                            Next <ChevronRight size={13} />
                        </button>
                        : <button onClick={handleSave} disabled={!currentStepValid} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-400 text-black disabled:bg-white/10 disabled:text-white/30 disabled:shadow-none disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50">
                            <Check size={13} /> Save
                        </button>
                    }
                </div>

                {step === 3 ? (
                    <div className="flex flex-col items-center gap-1">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/70">Live Score</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-mono font-black text-white tabular-nums">{calculatedScores.totalMarks}</span>
                            <span className="text-xl text-white/30 font-mono">/ {calculatedScores.maxMarks}</span>
                        </div>
                        {calculatedScores.maxMarks > 0 && (
                            <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-theme-accent to-violet-400 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.max(0, Math.min(100, (calculatedScores.totalMarks / calculatedScores.maxMarks) * 100))}%` }} />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center">
                        <p className="text-lg font-black text-white tracking-tight">{displayTitle}</p>
                        <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.25em]">Step {displayCurrent} of {displayTotal}</p>
                    </div>
                )}
            </div>

            {/* ── BODY ── */}
            <div className="flex-1 overflow-y-auto relative z-10">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                        className="max-w-2xl mx-auto px-4 pb-10 pt-2 md:px-8 space-y-4"
                    >
                        {/* ── STEP 1: Test Details ── */}
                        {step === 1 && (
                            <>
                                {/* Test Name — big hero input */}
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Test name, e.g. AITS-3..."
                                        value={testData.name}
                                        onChange={e => setTestData({ ...testData, name: e.target.value })}
                                        className="w-full px-5 py-5 bg-white/5 border border-white/10 rounded-3xl text-2xl font-black text-white placeholder:text-white/15 outline-none focus:border-theme-accent/50 focus:bg-white/8 transition-all"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl pointer-events-none">🏆</div>
                                </div>

                                {/* Date + Exam Type */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white/5 border border-white/8 rounded-2xl p-4 space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-[0.25em] text-white/35">📅 Date</label>
                                        <input
                                            type="date"
                                            value={testData.date}
                                            onChange={e => setTestData({ ...testData, date: e.target.value })}
                                            className="w-full bg-transparent text-sm font-bold text-white outline-none [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-30"
                                        />
                                    </div>
                                    <div className="bg-white/5 border border-white/8 rounded-2xl p-4 space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-[0.25em] text-white/35">📝 Exam</label>
                                        <select
                                            value={testData.examType}
                                            onChange={e => handleExamTypeChange(e.target.value as any)}
                                            className="w-full bg-transparent text-sm font-bold text-white outline-none"
                                            style={{ colorScheme: 'dark' }}
                                        >
                                            {examTypeOptions.map(key => <option key={key} className="bg-slate-900">{key}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Subject pills (General stream) */}
                                {stream === 'General' && (
                                    <div className="bg-white/3 border border-white/8 rounded-2xl p-4 space-y-3">
                                        <label className="text-[9px] font-black uppercase tracking-[0.25em] text-white/35">Subjects in this Test</label>
                                        <div className="flex flex-wrap gap-2">
                                            {subjects.map(sub => (
                                                <button
                                                    key={sub} type="button"
                                                    onClick={() => toggleSubject(sub)}
                                                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${testSubjects.includes(sub)
                                                        ? 'bg-theme-accent/20 border-theme-accent text-theme-accent shadow-[0_0_12px_rgba(139,92,246,0.2)]'
                                                        : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70 hover:border-white/20'
                                                        }`}
                                                >
                                                    {sub}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Test Scope toggle */}
                                {stream !== 'General' && (
                                    <div className="grid grid-cols-2 gap-3">
                                        {(['Full', 'Part'] as const).map(scope => (
                                            <button
                                                key={scope} type="button"
                                                onClick={() => setTestData(prev => ({ ...prev, testScope: scope }))}
                                                className={`py-5 rounded-2xl text-sm font-black transition-all border flex flex-col items-center gap-1 ${testData.testScope === scope
                                                    ? 'bg-theme-accent/15 border-theme-accent text-theme-accent'
                                                    : 'bg-white/4 border-white/8 text-white/40 hover:text-white/70'
                                                    }`}
                                            >
                                                <span className="text-2xl">{scope === 'Full' ? '📄' : '📂'}</span>
                                                <span>{scope === 'Full' ? 'Full Test' : 'Part Test'}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Part test chapters */}
                                {stream !== 'General' && testData.testScope === 'Part' && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 ml-1">Select Chapters</label>
                                        <div className="space-y-2">
                                            {subjects.map(sub => (
                                                <details key={sub} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden group">
                                                    <summary className="flex justify-between items-center px-4 py-3 cursor-pointer list-none font-bold text-sm text-white/80 hover:text-white">
                                                        <span>{sub}</span>
                                                        <ChevronRight size={15} className="text-white/30 transition-transform duration-200 group-open:rotate-90" />
                                                    </summary>
                                                    <div className="px-4 pb-4 pt-1 flex flex-wrap gap-1.5">
                                                        {syllabus[sub]?.map(chapter => {
                                                            const isSel = testData.partTestChapters?.[sub]?.includes(chapter);
                                                            return (
                                                                <button
                                                                    key={chapter}
                                                                    type="button"
                                                                    onClick={() => handleChapterToggle(sub, chapter)}
                                                                    className={`px-2.5 py-1 text-[10px] rounded-lg border transition-all ${isSel ? 'bg-theme-accent/20 border-theme-accent text-theme-accent' : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'}`}
                                                                >
                                                                    {chapter}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </details>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* ── STEP 2 (Advanced Only): Pattern Configurator ── */}
                        {step === 2 && isAdvanced && (
                            <div className="space-y-4">
                                <div className="text-center p-4 bg-white/5 border border-white/10 rounded-2xl mb-4">
                                    <h4 className="font-bold text-white mb-1">Advanced Exam Pattern</h4>
                                    <p className="text-xs text-white/60">Enable the question types present in this paper and set their marking scheme.</p>
                                </div>
                                {(['singleCorrect', 'multipleCorrect', 'numerical', 'matchFollowing', 'paragraph'] as AdvancedQuestionType[]).map(type => {
                                    const labels = {
                                        singleCorrect: 'Single Correct MCQ',
                                        multipleCorrect: 'Multiple Correct (MSQ)',
                                        numerical: 'Numerical / Integer',
                                        matchFollowing: 'Match the Following',
                                        paragraph: 'Paragraph / Comprehension'
                                    };
                                    const scheme = testData.advancedMarkingScheme?.[type];
                                    const isEnabled = !!scheme;

                                    return (
                                        <div key={type} className={`bg-white/5 border rounded-3xl p-5 space-y-4 transition-all ${isEnabled ? 'border-theme-accent/50' : 'border-white/10 opacity-50'}`}>
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-bold text-sm text-white">{labels[type]}</h4>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newScheme = { ...testData.advancedMarkingScheme } as any;
                                                        if (isEnabled) delete newScheme[type];
                                                        else {
                                                            const defaults: any = EXAM_PRESETS['JEE Advanced']?.advancedMarkingScheme || {};
                                                            newScheme[type] = defaults[type] || { correct: 3, incorrect: 0 };
                                                        }
                                                        setTestData(prev => ({ ...prev, advancedMarkingScheme: newScheme }));
                                                    }}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${isEnabled ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}
                                                >
                                                    {isEnabled ? 'Disable' : 'Enable'}
                                                </button>
                                            </div>

                                            {isEnabled && (
                                                <div className="grid grid-cols-3 gap-2">
                                                    <StatInput label="+ Correct" value={scheme.correct || 0} onChange={v => setTestData(p => ({ ...p, advancedMarkingScheme: { ...p.advancedMarkingScheme, [type]: { ...scheme, correct: v } } as any }))} color="border-emerald-500/40" />
                                                    <StatInput label="- Wrong" value={Math.abs(scheme.incorrect || 0)} onChange={v => setTestData(p => ({ ...p, advancedMarkingScheme: { ...p.advancedMarkingScheme, [type]: { ...scheme, incorrect: -v } } as any }))} color="border-rose-500/40" />
                                                    {type !== 'singleCorrect' && type !== 'numerical' && type !== 'paragraph' && (
                                                        <StatInput label="+ Partial" value={(scheme as any).partial || 0} onChange={v => setTestData(p => ({ ...p, advancedMarkingScheme: { ...p.advancedMarkingScheme, [type]: { ...scheme, partial: v } } as any }))} color="border-amber-500/40" />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* ── STEP 3: Scores ── */}
                        {step === 3 && (
                            <>
                                {isAdvanced && !isCustomTest && (
                                    <div className="flex flex-wrap justify-center gap-6 p-3 mb-2 bg-white/5 border border-white/10 rounded-2xl">
                                        <div className="flex items-center gap-2"><span className="text-emerald-400/80 bg-emerald-400/10 rounded-md px-1.5 py-0.5 text-xs">✅</span> <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/50">Correct</span></div>
                                        <div className="flex items-center gap-2"><span className="text-rose-400/80 bg-rose-400/10 rounded-md px-1.5 py-0.5 text-xs">❌</span> <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/50">Wrong</span></div>
                                        <div className="flex items-center gap-2"><span className="text-amber-400/80 bg-amber-400/10 rounded-md px-1.5 py-0.5 text-xs">⚡</span> <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/50">Partial</span></div>
                                        <div className="flex items-center gap-2"><span className="text-slate-400/80 bg-slate-400/10 rounded-md px-1.5 py-0.5 text-xs">⬜</span> <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/50">Skip</span></div>
                                    </div>
                                )}
                                {testSubjects.map(sub => {
                                    const b = testData.breakdown?.[sub];
                                    const subTotal = isCustomTest ? safeNum(b?.total) : (safeNum(b?.correct) + safeNum(b?.incorrect) + safeNum(b?.unattempted));
                                    const subMarks = isCustomTest ? safeNum(b?.marks) : (testData.markingScheme ? safeNum(b?.correct) * testData.markingScheme.correct + safeNum(b?.incorrect) * testData.markingScheme.incorrect : 0);
                                    const pct = subTotal > 0 || (isCustomTest && safeNum(b?.total) > 0)
                                        ? isCustomTest
                                            ? Math.round(safeDiv(subMarks, safeNum(b?.total)) * 100)
                                            : Math.round(safeDiv(safeNum(b?.correct), safeNum(b?.correct) + safeNum(b?.incorrect)) * 100)
                                        : null;
                                    const scoreColor = pct === null ? 'text-white/50' : pct >= 70 ? 'text-emerald-400' : pct >= 45 ? 'text-amber-400' : 'text-rose-400';
                                    const borderGlow = pct === null ? 'border-white/8' : pct >= 70 ? 'border-emerald-500/25' : pct >= 45 ? 'border-amber-500/25' : 'border-rose-500/25';

                                    return (
                                        <div key={sub} className={`border rounded-3xl overflow-hidden transition-all ${borderGlow} bg-white/4`}>
                                            <div className="flex justify-between items-center px-5 pt-4 pb-3">
                                                <h4 className="font-black text-base text-white">{sub}</h4>
                                                {pct !== null && (
                                                    <span className={`text-2xl font-black tabular-nums ${scoreColor}`}>{pct}%</span>
                                                )}
                                            </div>
                                            <div className="px-4 pb-4">
                                                {isCustomTest ? (
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <MarkInput label="Marks Obtained" value={b?.marks} onChange={v => handleSubjectMarksChange(sub, 'marks', v)} placeholder="--" />
                                                        <MarkInput label="Total Marks" value={b?.total} onChange={v => handleSubjectMarksChange(sub, 'total', v)} placeholder="--" />
                                                    </div>
                                                ) : isAdvanced ? (
                                                    <div className="space-y-4">
                                                        {testData.advancedMarkingScheme && Object.keys(testData.advancedMarkingScheme).map((key) => {
                                                            const qType = key as AdvancedQuestionType;
                                                            const stats = b?.advancedBreakdown?.[qType] || { correct: 0, incorrect: 0, unattempted: 0 };
                                                            const isMsQ = qType === 'multipleCorrect' || qType === 'matchFollowing';
                                                            const shortLabels = {
                                                                singleCorrect: 'Single Correct',
                                                                multipleCorrect: 'Multiple Correct',
                                                                numerical: 'Numerical',
                                                                matchFollowing: 'Match Following',
                                                                paragraph: 'Paragraph'
                                                            };
                                                            return (
                                                                <div key={key} className="p-3 bg-black/20 rounded-2xl border border-white/5 space-y-3">
                                                                    <p className="text-[10px] uppercase font-bold text-white/50">{shortLabels[qType]}</p>
                                                                    <div className={`grid ${isMsQ ? 'grid-cols-4' : 'grid-cols-3'} gap-2`}>
                                                                        <StatInput label="✅" value={stats.correct || 0} onChange={v => setTestData(p => ({ ...p, breakdown: { ...p.breakdown, [sub]: { ...p.breakdown![sub]!, advancedBreakdown: { ...p.breakdown![sub]!.advancedBreakdown, [qType]: { ...stats, correct: v } } } as any } }))} color="border-emerald-500/30 bg-emerald-500/5 text-xs" />
                                                                        <StatInput label="❌" value={stats.incorrect || 0} onChange={v => setTestData(p => ({ ...p, breakdown: { ...p.breakdown, [sub]: { ...p.breakdown![sub]!, advancedBreakdown: { ...p.breakdown![sub]!.advancedBreakdown, [qType]: { ...stats, incorrect: v } } } as any } }))} color="border-rose-500/30 bg-rose-500/5 text-xs" />
                                                                        {isMsQ && (
                                                                            <StatInput label="⚡" value={stats.partialCorrect || 0} onChange={v => setTestData(p => ({ ...p, breakdown: { ...p.breakdown, [sub]: { ...p.breakdown![sub]!, advancedBreakdown: { ...p.breakdown![sub]!.advancedBreakdown, [qType]: { ...stats, partialCorrect: v } } } as any } }))} color="border-amber-500/30 bg-amber-500/5 text-xs" />
                                                                        )}
                                                                        <StatInput label="⬜" value={stats.unattempted || 0} onChange={v => setTestData(p => ({ ...p, breakdown: { ...p.breakdown, [sub]: { ...p.breakdown![sub]!, advancedBreakdown: { ...p.breakdown![sub]!.advancedBreakdown, [qType]: { ...stats, unattempted: v } } } as any } }))} color="border-slate-500/30 bg-slate-500/5 text-xs" />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-3 gap-3 mt-2">
                                                        <StatInput label="✅ Correct" value={b?.correct || 0} onChange={v => handleSubjectChange(sub, 'correct', v)} color="border-emerald-500/20 bg-emerald-500/5" />
                                                        <StatInput label="❌ Wrong" value={b?.incorrect || 0} onChange={v => handleSubjectChange(sub, 'incorrect', v)} color="border-rose-500/20 bg-rose-500/5" />
                                                        <StatInput label="⬜ Skip" value={b?.unattempted || 0} onChange={v => handleSubjectChange(sub, 'unattempted', v)} color="border-white/10 bg-white/5" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        )}

                        {/* ── STEP 4: Mistakes ── */}
                        {step === 4 && !isCustomTest && (
                            <>
                                <div className="rounded-2xl p-4 bg-amber-500/8 border border-amber-500/20 flex items-center gap-3">
                                    <span className="text-2xl">🔍</span>
                                    <div>
                                        <p className="text-xs font-black text-amber-400">Optional but valuable</p>
                                        <p className="text-[11px] text-amber-400/60">Tag your mistakes to spot patterns over time.</p>
                                    </div>
                                </div>
                                {testSubjects.map(sub => {
                                    let incorrect = 0;
                                    if (isAdvanced && testData.advancedMarkingScheme) {
                                        const aBreakdown = testData.breakdown?.[sub]?.advancedBreakdown;
                                        if (aBreakdown) {
                                            for (const key of Object.keys(aBreakdown)) {
                                                incorrect += safeNum(aBreakdown[key as AdvancedQuestionType]?.incorrect);
                                            }
                                        }
                                    } else {
                                        incorrect = testData.breakdown?.[sub]?.incorrect || 0;
                                    }

                                    const mistakes = testData.breakdown?.[sub]?.mistakes || {};
                                    const tagged = Object.values(mistakes as MistakeCounts).reduce((a, b) => a + safeNum(b), 0);
                                    if (incorrect === 0) return null;
                                    const allTagged = tagged === incorrect;
                                    return (
                                        <div key={sub} className="bg-white/4 border border-white/8 rounded-3xl p-4 space-y-3">
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-black text-white">{sub}</h4>
                                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${allTagged ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-white/8 border-white/10 text-white/40'
                                                    }`}>
                                                    {tagged}/{incorrect} {allTagged ? '✓ Done' : 'tagged'}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {MISTAKE_TYPES.map(m => (
                                                    <StatInput key={m.id} label={m.label} value={safeNum(mistakes[m.id as keyof MistakeCounts])} onChange={v => handleMistakeChange(sub, m.id, v)} color="border-white/10" />
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        )}

                        {/* ── STEP 5: Review & Notes ── */}
                        {step === 5 && (
                            <>
                                {/* Score hero */}
                                <div className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-theme-accent/25 via-violet-500/10 to-transparent border border-theme-accent/20 text-center">
                                    <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-theme-accent/15 blur-3xl pointer-events-none" />
                                    <p className="text-[9px] font-black uppercase tracking-[0.35em] text-white/70 mb-2">Final Score</p>
                                    <p className="text-6xl font-mono font-black text-white leading-none">
                                        {calculatedScores.totalMarks}
                                        <span className="text-2xl text-white/30 font-normal"> / {calculatedScores.maxMarks}</span>
                                    </p>
                                    {calculatedScores.maxMarks > 0 && (
                                        <p className="text-3xl font-black text-theme-accent mt-2">
                                            {Math.round((calculatedScores.totalMarks / calculatedScores.maxMarks) * 100)}%
                                        </p>
                                    )}
                                </div>

                                {/* Temperament — large cards */}
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.25em] text-white/35 ml-1">How did the test feel?</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { val: 'Focused', emoji: '🎯', desc: 'In the zone', clr: 'emerald' },
                                            { val: 'Calm', emoji: '😌', desc: 'Cool-headed', clr: 'sky' },
                                            { val: 'Anxious', emoji: '😰', desc: 'Feeling nervous', clr: 'amber' },
                                            { val: 'Fatigued', emoji: '😴', desc: 'Running low', clr: 'rose' },
                                        ].map(t => (
                                            <button key={t.val} type="button"
                                                onClick={() => setTestData({ ...testData, temperament: t.val as any })}
                                                className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${testData.temperament === t.val
                                                    ? `bg-${t.clr}-500/15 border-${t.clr}-500/40`
                                                    : 'bg-white/4 border-white/8 hover:border-white/15'
                                                    }`}
                                            >
                                                <span className="text-2xl">{t.emoji}</span>
                                                <div>
                                                    <p className={`text-sm font-black ${testData.temperament === t.val ? `text-${t.clr}-400` : 'text-white/70'}`}>{t.val}</p>
                                                    <p className="text-[10px] text-white/30">{t.desc}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Weak topics */}
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-[0.25em] text-white/35 ml-1">Weak Topics (comma separated)</label>
                                    <textarea
                                        placeholder="e.g. Limits, Electrochemistry, Modern Physics..."
                                        value={(testData.weakTopics || []).join(', ')}
                                        onChange={e => setTestData({ ...testData, weakTopics: e.target.value.split(',').map(t => t.trim()) })}
                                        className="w-full px-4 py-3 h-20 bg-white/5 border border-white/8 rounded-2xl text-sm text-white placeholder:text-white/15 outline-none focus:border-theme-accent/40 transition-all resize-none"
                                    />
                                </div>

                                {/* Notes */}
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-[0.25em] text-white/35 ml-1">Post-Test Notes</label>
                                    <textarea
                                        placeholder="What went well? What to focus on? Key takeaways..."
                                        value={testData.postTestNotes}
                                        onChange={e => setTestData({ ...testData, postTestNotes: e.target.value })}
                                        className="w-full px-4 py-3 h-32 bg-white/5 border border-white/8 rounded-2xl text-sm text-white placeholder:text-white/15 outline-none focus:border-theme-accent/40 transition-all resize-none"
                                    />
                                </div>
                            </>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>,
        document.body
    );
};


const TestReportModal = ({ test, onClose }: { test: TestResult, onClose: () => void }) => {
    const { breakdown } = test;
    const subjects = breakdown ? Object.keys(breakdown) : [];
    const percentage = safeDiv(test.marks, test.total) * 100;
    const isCustomTest = test.examType === 'Custom / General';

    const totals = useMemo(() => {
        let correct = 0, incorrect = 0, unattempted = 0;
        let mistakes: Record<string, number> = {};
        if (breakdown) {
            const isAdvanced = test.examType === 'JEE Advanced' && test.advancedMarkingScheme;
            for (const sub of subjects) {
                if (isAdvanced) {
                    const aBreak = breakdown[sub].advancedBreakdown;
                    if (aBreak) {
                        for (const key of Object.keys(aBreak)) {
                            const stats = aBreak[key as AdvancedQuestionType];
                            if (stats) {
                                correct += safeNum(stats.correct);
                                incorrect += safeNum(stats.incorrect);
                                unattempted += safeNum(stats.unattempted);
                            }
                        }
                    }
                } else {
                    correct += safeNum(breakdown[sub].correct);
                    incorrect += safeNum(breakdown[sub].incorrect);
                    unattempted += safeNum(breakdown[sub].unattempted);
                }
                for (const m of MISTAKE_TYPES) {
                    mistakes[m.id] = (mistakes[m.id] || 0) + safeNum((breakdown[sub].mistakes as MistakeCounts)?.[m.id as keyof MistakeCounts]);
                }
            }
        }
        return { correct, incorrect, unattempted, totalQuestions: correct + incorrect + unattempted, mistakes };
    }, [breakdown, subjects]);

    return createPortal(
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="bg-theme-bg w-full max-w-2xl rounded-3xl shadow-2xl border border-theme-border overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-theme-border flex justify-between items-start shrink-0">
                    <div><h2 className="text-2xl font-bold text-theme-text">{test.name}</h2><p className="text-xs text-theme-text-secondary font-bold uppercase tracking-wider">{test.date} • {test.examType}{test.testScope && test.examType !== 'Custom / General' && ` (${test.testScope} Test)`}</p></div>
                    <button onClick={onClose}><X /></button>
                </div>
                <div className="p-6 overflow-y-auto space-y-8">
                    <div className={`grid ${isCustomTest ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'} gap-4 text-center`}>
                        <div className="p-4 bg-theme-bg-tertiary rounded-xl"><p className="text-[10px] uppercase font-bold text-theme-text-secondary">Score</p><p className="text-2xl font-mono font-bold text-theme-accent">{test.marks}/{test.total}</p></div>
                        <div className="p-4 bg-theme-bg-tertiary rounded-xl"><p className="text-[10px] uppercase font-bold text-theme-text-secondary">Percentage</p><p className="text-2xl font-mono font-bold text-theme-accent">{percentage.toFixed(1)}%</p></div>
                        {!isCustomTest && (
                            <>
                                <div className="p-4 bg-theme-bg-tertiary rounded-xl"><p className="text-[10px] uppercase font-bold text-theme-text-secondary">Accuracy</p><p className="text-2xl font-mono font-bold text-theme-text">{(safeDiv(totals.correct, totals.correct + totals.incorrect) * 100).toFixed(1)}%</p></div>
                                <div className="p-4 bg-theme-bg-tertiary rounded-xl"><p className="text-[10px] uppercase font-bold text-theme-text-secondary">Attempt Rate</p><p className="text-2xl font-mono font-bold text-theme-text">{(safeDiv(totals.correct + totals.incorrect, totals.totalQuestions) * 100).toFixed(1)}%</p></div>
                            </>
                        )}
                    </div>

                    {test.testScope === 'Part' && test.partTestChapters && Object.values(test.partTestChapters).some(c => c && c.length > 0) && (
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-theme-text-secondary mb-3 flex items-center gap-2"><Layers size={14} /> Part Test Syllabus</h3>
                            <div className="space-y-3">
                                {Object.entries(test.partTestChapters).map(([subject, chapters]) => {
                                    if (!chapters || chapters.length === 0) return null;
                                    return (
                                        <div key={subject} className="p-3 bg-theme-bg-tertiary rounded-xl border border-theme-border">
                                            <p className="text-sm font-bold text-theme-text mb-2">{subject}</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {chapters.map(chapter => (
                                                    <span key={chapter} className="px-2 py-1 bg-theme-card text-theme-text-secondary text-[10px] font-medium rounded border border-theme-border">{chapter}</span>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {subjects.length > 0 && breakdown && (
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-theme-text-secondary mb-3 flex items-center gap-2"><Layers size={14} /> Subject Breakdown</h3>
                            <div className="space-y-4">
                                {subjects.map(sub => {
                                    const b = breakdown[sub];
                                    if (!b) return null;

                                    const isAdvanced = test.examType === 'JEE Advanced' && test.advancedMarkingScheme;

                                    let subMarks = 0;
                                    let subTotalMarks = 0;
                                    let subCorrect = 0;
                                    let subIncorrect = 0;
                                    let subUnattempted = 0;

                                    if (isCustomTest) {
                                        subMarks = safeNum(b.marks);
                                        subTotalMarks = safeNum(b.total);
                                    } else if (isAdvanced) {
                                        const aBreak = b.advancedBreakdown;
                                        if (aBreak) {
                                            for (const key of Object.keys(aBreak)) {
                                                const stats = aBreak[key as AdvancedQuestionType];
                                                const sScheme = test.advancedMarkingScheme![key as keyof AdvancedMarkingScheme];
                                                if (stats && sScheme) {
                                                    const partialMarkTarget = (sScheme as any).partial || 0;
                                                    subMarks += safeNum(stats.correct) * sScheme.correct + safeNum(stats.incorrect) * sScheme.incorrect + safeNum(stats.partialCorrect) * safeNum(partialMarkTarget);
                                                    const qs = safeNum(stats.correct) + safeNum(stats.incorrect) + safeNum(stats.unattempted);
                                                    subTotalMarks += qs * sScheme.correct;

                                                    subCorrect += safeNum(stats.correct);
                                                    subIncorrect += safeNum(stats.incorrect);
                                                    subUnattempted += safeNum(stats.unattempted);
                                                }
                                            }
                                        }
                                    } else {
                                        subCorrect = safeNum(b.correct);
                                        subIncorrect = safeNum(b.incorrect);
                                        subUnattempted = safeNum(b.unattempted);
                                        if (test.markingScheme) {
                                            subMarks = subCorrect * test.markingScheme.correct + subIncorrect * test.markingScheme.incorrect;
                                            subTotalMarks = (subCorrect + subIncorrect + subUnattempted) * test.markingScheme.correct;
                                        }
                                    }

                                    const totalQs = subCorrect + subIncorrect + subUnattempted;
                                    if (totalQs === 0 && subTotalMarks === 0 && subMarks === 0) return null;

                                    const accPercent = totalQs > 0 ? safeDiv(subCorrect, subCorrect + subIncorrect) * 100 : 0;
                                    const mistakesForSub = b.mistakes || {};
                                    const hasMistakes = MISTAKE_TYPES.some(m => safeNum(mistakesForSub[m.id as keyof MistakeCounts]) > 0);

                                    return (
                                        <div key={sub} className="bg-theme-bg-tertiary border border-theme-border rounded-2xl overflow-hidden">
                                            {/* Header */}
                                            <div className="p-4 flex justify-between items-center border-b border-theme-border/50 bg-white/4">
                                                <div className="flex items-center gap-3">
                                                    <h4 className="font-bold text-lg text-theme-text">{sub}</h4>
                                                    {!isCustomTest && totalQs > 0 && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-500">{accPercent.toFixed(0)}% Acc</span>}
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xl font-mono font-bold text-theme-accent">{subMarks}</span>
                                                    <span className="text-xs font-mono text-theme-text-secondary"> / {subTotalMarks}</span>
                                                </div>
                                            </div>

                                            <div className="p-4 space-y-4">
                                                {/* Stats Grid */}
                                                {!isCustomTest && (
                                                    <div className="flex items-center gap-5">
                                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20"><span className="text-emerald-500 text-[10px]">✅</span><span className="text-sm font-mono font-bold text-emerald-500">{subCorrect}</span></div>
                                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20"><span className="text-rose-500 text-[10px]">❌</span><span className="text-sm font-mono font-bold text-rose-500">{subIncorrect}</span></div>
                                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-500/10 border border-slate-500/20"><span className="text-slate-400 text-[10px]">⬜</span><span className="text-sm font-mono font-bold text-slate-400">{subUnattempted}</span></div>
                                                    </div>
                                                )}

                                                {/* Mistakes */}
                                                {hasMistakes && (
                                                    <div className={`${!isCustomTest ? 'pt-3 border-t border-theme-border/50' : ''} space-y-2`}>
                                                        <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-theme-text-secondary flex items-center gap-1.5"><Brain size={12} /> Mistakes Logged</h5>
                                                        <div className="flex flex-wrap gap-2">
                                                            {MISTAKE_TYPES.map(m => {
                                                                const cnt = safeNum(mistakesForSub[m.id as keyof MistakeCounts]);
                                                                if (cnt === 0) return null;
                                                                return (
                                                                    <div key={m.id} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-black/20 rounded-lg border border-theme-border/50">
                                                                        <span className={`text-[10px] ${m.color}`}>{m.icon}</span>
                                                                        <span className="text-xs font-mono font-bold text-theme-text">{cnt}</span>
                                                                        <span className="text-[9px] uppercase font-bold tracking-widest text-theme-text-secondary ml-1">{m.label}</span>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {test.weakTopics && test.weakTopics.length > 0 && (
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-theme-text-secondary mb-2 flex items-center gap-2"><TargetIcon size={14} /> Weak Topics</h3>
                            <div className="flex flex-wrap gap-2">{test.weakTopics.map(t => t && <span key={t} className="px-2 py-1 bg-rose-500/10 text-rose-500 text-[10px] font-bold rounded">{t}</span>)}</div>
                        </div>
                    )}

                    {test.postTestNotes && (
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-theme-text-secondary mb-2 flex items-center gap-2"><BookOpen size={14} /> Notes</h3>
                            <div className="text-sm text-theme-text-secondary p-4 bg-theme-bg-tertiary rounded-xl border border-theme-border whitespace-pre-wrap">{test.postTestNotes}</div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>, document.body
    );
};


const TestAnalytics = ({ tests }: { tests: TestResult[] }) => {
    if (tests.length < 2) return null;

    const chartData = useMemo(() => {
        // Take last 20 tests sorted oldest → newest
        const last20 = [...tests]
            .sort((a, b) => a.timestamp - b.timestamp)
            .slice(-20);

        if (last20.length < 2) return [];

        const maxMarks = Math.max(...last20.map(t => t.marks));
        const marksRange = Math.max(maxMarks, 1);

        return last20.map((t, i) => ({
            test: t,
            date: new Date(t.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            x: (i / (last20.length - 1)) * 100,
            y: 88 - (t.marks / marksRange) * 76,
            marks: t.marks,
            maxMarks: t.total,
            pct: t.total > 0 ? Math.round((t.marks / t.total) * 100) : 0,
        }));
    }, [tests]);

    const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

    if (chartData.length < 2) return null;

    const maxScored = Math.max(...chartData.map(d => d.marks));
    const midScored = Math.round(maxScored / 2);

    // Smooth cubic bezier path
    const buildSmoothPath = () => {
        const pts = chartData;
        let d = `M ${pts[0].x} ${pts[0].y}`;
        for (let i = 1; i < pts.length; i++) {
            const x0 = pts[i - 1].x, y0 = pts[i - 1].y;
            const x1 = pts[i].x, y1 = pts[i].y;
            const cpx = (x0 + x1) / 2;
            d += ` C ${cpx} ${y0}, ${cpx} ${y1}, ${x1} ${y1}`;
        }
        return d;
    };
    const smoothPath = buildSmoothPath();
    const areaPath = `M ${chartData[0].x} 100 L ${chartData[0].x} ${chartData[0].y} ${smoothPath.replace(/^M \S+ \S+ /, '')} L ${chartData[chartData.length - 1].x} 100 Z`;

    return (
        <Card className="overflow-visible !p-6 md:!p-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-theme-text-secondary flex items-center gap-2">
                        <TrendingUp size={14} /> Performance Trend
                    </h3>
                    <p className="text-[10px] text-theme-text-secondary/50 mt-0.5 font-bold uppercase tracking-widest">Last {chartData.length} tests</p>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-mono font-bold text-theme-accent">{chartData[chartData.length - 1].pct}%</p>
                    <p className="text-[10px] text-theme-text-secondary font-bold uppercase tracking-widest">Latest</p>
                </div>
            </div>

            <div className="relative h-44 w-full">
                {/* Y-Axis Labels */}
                <div className="absolute -left-1 top-[6%] -translate-y-1/2 text-[9px] font-mono font-bold text-theme-text-secondary/60 select-none">{maxScored}</div>
                <div className="absolute -left-1 top-[45%] -translate-y-1/2 text-[9px] font-mono font-bold text-theme-text-secondary/40 select-none">{midScored}</div>
                <div className="absolute -left-1 top-[88%] -translate-y-1/2 text-[9px] font-mono font-bold text-theme-text-secondary/60 select-none">0</div>

                {/* Grid lines */}
                <div className="absolute left-6 right-0 top-[6%] border-t border-dashed border-theme-border/40" />
                <div className="absolute left-6 right-0 top-[45%] border-t border-dashed border-theme-border/25" />
                <div className="absolute left-6 right-0 top-[88%] border-t border-dashed border-theme-border/40" />

                <div className="absolute inset-0 ml-6">
                    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none">
                        <defs>
                            <linearGradient id="trendGradient2" x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor="var(--theme-accent)" stopOpacity="0.35" />
                                <stop offset="100%" stopColor="var(--theme-accent)" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <path d={areaPath} fill="url(#trendGradient2)" />
                        <path d={smoothPath} fill="none" stroke="var(--theme-accent)" strokeWidth="0.6" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>

                    {/* HTML data-point overlays */}
                    {chartData.map((p, i) => {
                        const isHovered = hoveredPoint === i;
                        const isNearTop = p.y < 20;
                        return (
                            <div
                                key={i}
                                className="absolute w-5 h-5 -ml-2.5 -mt-2.5 z-10 cursor-pointer flex items-center justify-center"
                                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                                onMouseEnter={() => setHoveredPoint(i)}
                                onMouseLeave={() => setHoveredPoint(null)}
                            >
                                <div className={`absolute inset-0 rounded-full transition-all duration-300 ${isHovered ? 'scale-100 opacity-100 bg-[var(--theme-accent)]/20' : 'scale-0 opacity-0'}`} />
                                <div className={`w-2 h-2 rounded-full border-2 border-theme-bg transition-all duration-300 ${isHovered ? 'bg-white scale-125 shadow-[0_0_10px_var(--theme-accent)]' : 'bg-[var(--theme-accent)]'}`} />

                                <div className={`absolute ${isNearTop ? 'top-full mt-3' : 'bottom-full mb-3'} left-1/2 -translate-x-1/2 w-max z-50 pointer-events-none transition-all duration-200 ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
                                    <div className="bg-slate-900 border border-white/10 text-white px-3.5 py-2.5 rounded-xl shadow-2xl flex flex-col items-center gap-0.5">
                                        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">{p.date}</span>
                                        <span className="text-xs font-bold text-white max-w-[140px] truncate">{p.test.name}</span>
                                        <div className="flex items-baseline gap-1 mt-1">
                                            <span className="text-lg font-mono font-bold text-[var(--theme-accent)]">{p.marks}</span>
                                            <span className="text-[10px] text-slate-500">/ {p.maxMarks}</span>
                                            <span className="ml-1 text-[10px] font-bold text-emerald-400">{p.pct}%</span>
                                        </div>
                                    </div>
                                    <div className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45 ${isNearTop ? '-top-1' : '-bottom-1'}`} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* X-Axis: first and last date */}
            <div className="flex justify-between mt-3 ml-6 text-[9px] font-mono font-bold uppercase tracking-widest text-theme-text-secondary/50">
                <span>{chartData[0].date}</span>
                <span>{chartData[chartData.length - 1].date}</span>
            </div>
        </Card>
    );
};

const TestCard = memo(({ test, onView, onDelete }: { test: TestResult, onView: () => void, onDelete: (e: React.MouseEvent) => void }) => {
    const percentage = test.total > 0 ? Math.round((test.marks / test.total) * 100) : 0;
    const performanceColor = percentage >= 80 ? 'border-emerald-500' : percentage >= 50 ? 'border-amber-500' : 'border-rose-500';

    return (
        <Card onClick={onView} className={`group p-0 overflow-hidden flex flex-col justify-between border-l-4 ${performanceColor}`}>
            <div className="p-5">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-theme-text-secondary tracking-widest">{test.date}</p>
                        <h3 className="font-bold text-theme-text text-lg leading-tight group-hover:text-theme-accent">{test.name}</h3>
                        <p className="text-xs text-theme-text-secondary font-medium">{test.examType}</p>
                    </div>
                    <button onClick={onDelete} className="p-2 rounded-lg text-theme-text-secondary hover:text-rose-500 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                </div>
                <div className="flex items-baseline gap-2 mt-4">
                    <span className="text-4xl font-display font-bold text-theme-accent truncate min-w-0">{test.marks}</span>
                    <span className="text-sm font-bold text-theme-text-secondary">/ {test.total}</span>
                    <span className="ml-auto text-2xl font-mono font-bold text-theme-text">{percentage}%</span>
                </div>
            </div>
        </Card>
    );
});

const TestLog = memo(({ tests, onSave, onDelete, syllabus, stream }: TestLogProps) => {
    if (!tests || !syllabus) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 animate-pulse">Loading Test Logs...</p>
            </div>
        );
    }
    const [isAdding, setIsAdding] = useState(false);
    const [viewingReport, setViewingReport] = useState<TestResult | null>(null);
    const [deletingTestId, setDeletingTestId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

    const handleSaveTest = (test: Omit<TestResult, 'id' | 'timestamp' | 'stream'>) => { onSave(test); setIsAdding(false); };

    const processedTests = useMemo(() => {
        let filtered = tests;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(t => t.name.toLowerCase().includes(q) || t.examType?.toLowerCase().includes(q) || t.date.includes(q));
        }
        return filtered.sort((a, b) => sortOrder === 'newest' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp);
    }, [tests, searchQuery, sortOrder]);

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
            <ConfirmationModal isOpen={!!deletingTestId} onClose={() => setDeletingTestId(null)} onConfirm={() => { if (deletingTestId) { onDelete(deletingTestId); setDeletingTestId(null); } }} title="Delete Test?" message="Are you sure you want to delete this test log? This action cannot be undone." />
            <AnimatePresence>{isAdding && (<TestLogForm onSave={handleSaveTest} onCancel={() => setIsAdding(false)} syllabus={syllabus} stream={stream} />)}</AnimatePresence>
            {viewingReport && (<TestReportModal test={viewingReport} onClose={() => setViewingReport(null)} />)}

            {!isAdding && !viewingReport && (
                <>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div><h2 className="text-3xl font-bold text-theme-text tracking-tight">Test Logs</h2><p className="text-xs text-theme-accent uppercase tracking-widest mt-1 font-bold">Analyze your mock tests in detail</p></div>
                        <button onClick={() => setIsAdding(true)} className="flex items-center justify-center gap-2 px-6 py-3 bg-theme-accent text-theme-text-on-accent rounded-2xl text-xs font-bold uppercase tracking-wider shadow-lg hover:opacity-90 transition-opacity active:scale-95 whitespace-nowrap" style={{ boxShadow: '0 10px 15px -3px rgba(var(--theme-accent-rgb), 0.2)' }}><Plus size={16} /> Log New Test</button>
                    </div>
                    <TestAnalytics tests={tests} />
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1 group"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-secondary group-focus-within:text-theme-accent" /><input type="text" placeholder="Search tests..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-theme-card border border-theme-border rounded-xl py-2 pl-8 pr-3 text-sm focus:border-theme-accent outline-none text-theme-text" /></div>
                        <button onClick={() => setSortOrder(s => s === 'newest' ? 'oldest' : 'newest')} className="p-2.5 bg-theme-card border border-theme-border rounded-xl text-theme-text-secondary hover:text-theme-text"><ArrowUpNarrowWide size={14} className={`transition-transform ${sortOrder === 'oldest' ? 'rotate-180' : ''}`} /></button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {processedTests.map(test => (<TestCard key={test.id} test={test} onView={() => setViewingReport(test)} onDelete={(e) => { e.stopPropagation(); setDeletingTestId(test.id); }} />))}
                    </div>

                    {processedTests.length === 0 && (
                        <div className="text-center py-20 opacity-40 border-2 border-dashed border-theme-border rounded-3xl">
                            <Trophy size={48} className="mx-auto mb-4" /><p className="text-xs uppercase font-bold tracking-widest">No tests logged yet</p><p className="text-[10px] mt-1">Click 'Log New Test' to get started</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
});

export default TestLog;
