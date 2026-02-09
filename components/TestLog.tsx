
import React, { useState, useMemo, memo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    Plus, X, Trash2, Trophy, Clock, Calendar, TrendingUp, Info, ArrowLeft, Layers, Brain, Divide, Wind, Timer as TimerIcon,
    Search, ArrowUpNarrowWide, Check, ChevronRight, BookOpen, Target as TargetIcon, Calculator, Hash
} from 'lucide-react';
import { TestResult, SubjectBreakdown, SyllabusData, StreamType, MarkingScheme, MistakeCounts } from '../types';
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
            <label className="block text-center text-[10px] font-bold uppercase tracking-widest mb-2">{label}</label>
            <div className="flex items-center justify-center gap-1">
                <button type="button" onClick={() => onChange(Math.max(0, value - 1))} className="w-8 h-8 rounded-lg bg-black/5 dark:bg-black/20 hover:bg-black/10 dark:hover:bg-black/40">-</button>
                <input type="number" value={value} onChange={(e) => onChange(parseInt(e.target.value) || 0)} className="w-14 text-center bg-transparent text-2xl font-mono font-bold" />
                <button type="button" onClick={() => onChange(value + 1)} className="w-8 h-8 rounded-lg bg-black/5 dark:bg-black/20 hover:bg-black/10 dark:hover:bg-black/40">+</button>
            </div>
        </div>
    );
});

const MarkInput = memo(({ label, value, onChange, placeholder }: { label: string, value: number | undefined, onChange: (val: number) => void, placeholder?: string }) => {
    return (
        <div className="p-3 rounded-2xl border border-slate-500/20 bg-opacity-10">
            <label className="block text-center text-[10px] font-bold uppercase tracking-widest mb-2">{label}</label>
            <input 
                type="number" 
                value={value || ''} 
                onChange={(e) => onChange(parseFloat(e.target.value) || 0)} 
                className="w-full text-center bg-transparent text-2xl font-mono font-bold placeholder:text-theme-text-secondary/20"
                placeholder={placeholder}
            />
        </div>
    );
});

const TestLogForm = ({ onSave, onCancel, syllabus, stream }: { onSave: (test: Omit<TestResult, 'id'|'timestamp'|'stream'>) => void, onCancel: () => void, syllabus: SyllabusData, stream: StreamType }) => {
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
            temperament: 'Focused',
            breakdown: Object.keys(syllabus).reduce((acc, sub) => ({
                ...acc, [sub]: { correct: 0, incorrect: 0, unattempted: 0, marks: undefined, total: undefined, timeSpent: 0, mistakes: MISTAKE_TYPES.reduce((m, t) => ({...m, [t.id]: 0}), {}) }
            }), {} as Record<string, SubjectBreakdown>),
            weakTopics: [],
            postTestNotes: '',
            testScope: 'Full',
            partTestChapters: {},
        };
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

        if (isCustomTest) {
            for(const subject of subjectsForCalc) {
                const b = testData.breakdown[subject];
                if (b) {
                    totalMarks += safeNum(b.marks);
                    maxMarks += safeNum(b.total);
                }
            }
        } else {
            if (!testData.markingScheme) return { totalMarks: 0, maxMarks: 0 };
            const scheme = testData.markingScheme;
            for(const subject of subjectsForCalc) {
                const b = testData.breakdown[subject];
                if(b) {
                    totalMarks += safeNum(b.correct) * scheme.correct + safeNum(b.incorrect) * scheme.incorrect;
                    maxMarks += (safeNum(b.correct) + safeNum(b.incorrect) + safeNum(b.unattempted)) * scheme.correct;
                }
            }
        }
        return { totalMarks, maxMarks };
    }, [testData.breakdown, testData.markingScheme, testData.examType, subjects, testSubjects, stream, isCustomTest]);

    const handleExamTypeChange = (type: TestResult['examType']) => {
        const preset = EXAM_PRESETS[type as keyof typeof EXAM_PRESETS];
        setTestData(prev => ({ ...prev, examType: type, markingScheme: preset.markingScheme }));
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
        const finalData: Omit<TestResult, 'id'|'timestamp'|'stream'> = {
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

    const allSteps = [ { title: 'Test Details' }, { title: 'Performance' }, { title: 'Mistake Analysis' }, { title: 'Final Review' } ];
    
    const getDisplayStep = () => {
        if (!isCustomTest) return { current: step, total: 4, title: allSteps[step-1].title };
        if (step === 1) return { current: 1, total: 3, title: allSteps[0].title };
        if (step === 2) return { current: 2, total: 3, title: allSteps[1].title };
        if (step === 4) return { current: 3, total: 3, title: allSteps[3].title };
        return { current: 1, total: 3, title: 'Error' }; // Fallback
    }
    const { current: displayCurrent, total: displayTotal, title: displayTitle } = getDisplayStep();

    const handleNext = () => {
        if (step === 2 && isCustomTest) setStep(4);
        else setStep(s => s + 1);
    };

    const handleBack = () => {
        if (step === 4 && isCustomTest) setStep(2);
        else setStep(s => s - 1);
    };

    const currentStepValid = useMemo(() => {
        if (step === 1) {
            if (stream === 'General' && testSubjects.length === 0) return false;
            if (stream !== 'General' && testData.testScope === 'Part') {
                // FIX: Added Array.isArray check to satisfy TypeScript compiler which inferred 'chapters' as 'unknown'.
                const hasChapters = Object.values(testData.partTestChapters || {}).some(chapters => Array.isArray(chapters) && chapters.length > 0);
                if (!hasChapters) return false;
            }
            return !!testData.name?.trim();
        }
        if (step === 2) {
            if (isCustomTest) {
                return testSubjects.some(sub => safeNum(testData.breakdown?.[sub]?.total) > 0);
            }
            return testSubjects.some(sub => {
                const b = testData.breakdown?.[sub];
                return b && (safeNum(b.correct) + safeNum(b.incorrect) + safeNum(b.unattempted)) > 0;
            });
        }
        return true;
    }, [step, testData, testSubjects, stream, isCustomTest]);

    return createPortal(
        <div className="fixed inset-0 z-[120] bg-theme-bg flex flex-col animate-in fade-in duration-300">
            <div className="p-4 border-b border-theme-border flex justify-between items-center shrink-0">
                <button onClick={step > 1 ? handleBack : onCancel} className="flex items-center gap-2 text-sm text-theme-text-secondary font-bold hover:text-theme-text"><ArrowLeft size={16}/> {step > 1 ? 'Back' : 'Cancel'}</button>
                <div className="text-center"><h3 className="text-sm font-bold uppercase tracking-wider">{displayTitle}</h3><p className="text-[10px] text-theme-text-secondary font-bold">Step {displayCurrent} of {displayTotal}</p></div>
                {step < 4 ? (<button onClick={handleNext} disabled={!currentStepValid} className="px-4 py-2 bg-theme-accent text-theme-text-on-accent rounded-lg text-xs font-bold disabled:opacity-50 flex items-center gap-1.5">Next <ChevronRight size={14}/></button>) : (<button onClick={handleSave} className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"><Check size={14}/> Save Test</button>)}
            </div>
            <div className="w-full h-1 bg-theme-border"><div className="h-full bg-theme-accent transition-all duration-300" style={{ width: `${(displayCurrent / displayTotal) * 100}%` }}/></div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <AnimatePresence mode="wait">
                <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="max-w-2xl mx-auto">
                    {step === 1 && (
                        <div className="space-y-6">
                            <input type="text" placeholder="Test Name (e.g., AITS-3)" value={testData.name} onChange={e => setTestData({...testData, name: e.target.value})} className="w-full p-4 bg-theme-bg-tertiary border border-theme-border rounded-xl text-lg font-bold" required />
                            <input type="date" value={testData.date} onChange={e => setTestData({...testData, date: e.target.value})} className="w-full p-4 bg-theme-bg-tertiary border border-theme-border rounded-xl" />
                            <select value={testData.examType} onChange={e => handleExamTypeChange(e.target.value as any)} className="w-full p-4 bg-theme-bg-tertiary border border-theme-border rounded-xl">
                                {examTypeOptions.map(key => <option key={key}>{key}</option>)}
                            </select>
                             {stream === 'General' && (
                                <div className="space-y-3">
                                    <label className="block text-sm font-bold text-theme-text-secondary">Subjects in this Test</label>
                                    <div className="flex flex-wrap gap-2 p-3 bg-theme-bg-tertiary rounded-xl border border-theme-border">
                                        {subjects.map(sub => (
                                            <button
                                                key={sub}
                                                type="button"
                                                onClick={() => toggleSubject(sub)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                                    testSubjects.includes(sub)
                                                        ? 'bg-theme-accent/10 border-theme-accent text-theme-accent'
                                                        : 'bg-theme-card border-theme-border text-theme-text-secondary hover:border-theme-text-secondary'
                                                }`}
                                            >
                                                {sub}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                             )}
                            {stream !== 'General' && (
                                <div className="space-y-3">
                                    <label className="block text-sm font-bold text-theme-text-secondary">Test Scope</label>
                                    <div className="flex bg-theme-bg-tertiary p-1 rounded-xl border border-theme-border">
                                        <button type="button" onClick={() => setTestData(prev => ({...prev, testScope: 'Full'}))} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${testData.testScope === 'Full' ? 'bg-theme-accent text-theme-text-on-accent shadow-md' : 'text-theme-text-secondary hover:bg-theme-card'}`}>Full Test</button>
                                        <button type="button" onClick={() => setTestData(prev => ({...prev, testScope: 'Part'}))} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${testData.testScope === 'Part' ? 'bg-theme-accent text-theme-text-on-accent shadow-md' : 'text-theme-text-secondary hover:bg-theme-card'}`}>Part Test</button>
                                    </div>
                                </div>
                            )}
                            {stream !== 'General' && testData.testScope === 'Part' && (
                                <div className="space-y-3">
                                    <label className="block text-sm font-bold text-theme-text-secondary">Select Chapters</label>
                                    <div className="space-y-2 p-3 bg-theme-bg-tertiary rounded-xl border border-theme-border">
                                        {subjects.map(sub => (
                                            <details key={sub} className="p-2 rounded-lg hover:bg-theme-card transition-colors group">
                                                <summary className="font-bold cursor-pointer list-none flex justify-between items-center text-sm">
                                                    <span>{sub}</span>
                                                    <ChevronRight size={16} className="text-theme-text-secondary transition-transform duration-200 group-open:rotate-90" />
                                                </summary>
                                                <div className="flex flex-wrap gap-1.5 p-2 pt-3">
                                                    {syllabus[sub]?.map(chapter => {
                                                        const isSelected = testData.partTestChapters?.[sub]?.includes(chapter);
                                                        return (
                                                            <button
                                                                key={chapter}
                                                                type="button"
                                                                onClick={() => handleChapterToggle(sub, chapter)}
                                                                className={`px-2 py-1 text-[10px] rounded-md border ${isSelected ? 'bg-theme-accent/10 border-theme-accent text-theme-accent' : 'bg-theme-card border-theme-border text-theme-text-secondary hover:border-theme-text-secondary'}`}
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
                        </div>
                    )}
                    {step === 2 && (
                        <div className="space-y-8">
                             <div className="p-4 bg-theme-accent/10 rounded-2xl text-center border border-theme-accent/20">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-theme-accent">Calculated Score</p>
                                <p className="font-display text-5xl font-bold text-theme-text">{calculatedScores.totalMarks}<span className="text-2xl text-theme-text-secondary"> / {calculatedScores.maxMarks}</span></p>
                            </div>
                            {testSubjects.map(sub => (
                                <div key={sub} className="p-4 bg-theme-bg-tertiary rounded-2xl border border-theme-border">
                                    <h4 className="font-bold mb-4">{sub}</h4>
                                    {isCustomTest ? (
                                        <div className="grid grid-cols-2 gap-3">
                                            <MarkInput label="Marks Obtained" value={testData.breakdown?.[sub]?.marks} onChange={v => handleSubjectMarksChange(sub, 'marks', v)} placeholder="--" />
                                            <MarkInput label="Total Marks" value={testData.breakdown?.[sub]?.total} onChange={v => handleSubjectMarksChange(sub, 'total', v)} placeholder="--" />
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-3 gap-3">
                                            <StatInput label="Correct" value={testData.breakdown?.[sub]?.correct || 0} onChange={v => handleSubjectChange(sub, 'correct', v)} color="border-emerald-500/50" />
                                            <StatInput label="Incorrect" value={testData.breakdown?.[sub]?.incorrect || 0} onChange={v => handleSubjectChange(sub, 'incorrect', v)} color="border-rose-500/50" />
                                            <StatInput label="Unattempted" value={testData.breakdown?.[sub]?.unattempted || 0} onChange={v => handleSubjectChange(sub, 'unattempted', v)} color="border-slate-500/50" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    {step === 3 && !isCustomTest && (
                        <div className="space-y-8">
                             <div className="text-center p-4 bg-theme-bg-tertiary rounded-2xl border border-dashed border-theme-border">
                                <p className="text-xs text-theme-text-secondary">This step is optional. You can analyze your mistakes now or save the test and review them later.</p>
                            </div>
                            {testSubjects.map(sub => {
                                const incorrect = testData.breakdown?.[sub]?.incorrect || 0;
                                const mistakes = testData.breakdown?.[sub]?.mistakes || {};
                                const tagged = Object.values(mistakes as MistakeCounts).reduce((a, b) => a + safeNum(b), 0);
                                if (incorrect === 0) return null;
                                return (
                                    <div key={sub} className="p-4 bg-theme-bg-tertiary rounded-2xl border border-theme-border">
                                        <div className="flex justify-between items-center mb-4"><h4 className="font-bold">{sub}</h4><div className={`p-2 rounded-lg text-xs font-bold ${tagged === incorrect ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>{tagged} / {incorrect} Tagged</div></div>
                                        <div className="grid grid-cols-2 gap-3">
                                            {MISTAKE_TYPES.map(m => (<StatInput key={m.id} label={m.label} value={safeNum(mistakes[m.id as keyof MistakeCounts])} onChange={v => handleMistakeChange(sub, m.id, v)} color="border-slate-500/20" />))}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                    {step === 4 && (
                        <div className="space-y-6">
                             <select value={testData.temperament} onChange={e => setTestData({...testData, temperament: e.target.value as any})} className="w-full p-4 bg-theme-bg-tertiary border border-theme-border rounded-xl"><option>Focused</option><option>Calm</option><option>Anxious</option><option>Fatigued</option></select>
                            <textarea placeholder="Weak topics identified (comma separated)..." value={(testData.weakTopics || []).join(', ')} onChange={e => setTestData({...testData, weakTopics: e.target.value.split(',').map(t => t.trim())})} className="w-full p-4 h-32 bg-theme-bg-tertiary border border-theme-border rounded-xl" />
                            <textarea placeholder="General notes and takeaways..." value={testData.postTestNotes} onChange={e => setTestData({...testData, postTestNotes: e.target.value})} className="w-full p-4 h-48 bg-theme-bg-tertiary border border-theme-border rounded-xl" />
                        </div>
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
            for (const sub of subjects) {
                correct += safeNum(breakdown[sub].correct);
                incorrect += safeNum(breakdown[sub].incorrect);
                unattempted += safeNum(breakdown[sub].unattempted);
                for(const m of MISTAKE_TYPES) {
                    mistakes[m.id] = (mistakes[m.id] || 0) + safeNum((breakdown[sub].mistakes as MistakeCounts)?.[m.id as keyof MistakeCounts]);
                }
            }
        }
        return { correct, incorrect, unattempted, totalQuestions: correct + incorrect + unattempted, mistakes };
    }, [breakdown, subjects]);

    return createPortal(
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
            <motion.div initial={{y: 20, opacity: 0}} animate={{y: 0, opacity: 1}} exit={{y: 20, opacity: 0}} className="bg-theme-bg w-full max-w-2xl rounded-3xl shadow-2xl border border-theme-border overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-theme-border flex justify-between items-start shrink-0">
                    <div><h2 className="text-2xl font-bold text-theme-text">{test.name}</h2><p className="text-xs text-theme-text-secondary font-bold uppercase tracking-wider">{test.date} • {test.examType}{test.testScope && test.examType !== 'Custom / General' && ` (${test.testScope} Test)`}</p></div>
                    <button onClick={onClose}><X/></button>
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
                            <h3 className="text-xs font-bold uppercase tracking-widest text-theme-text-secondary mb-3 flex items-center gap-2"><Layers size={14}/> Part Test Syllabus</h3>
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
                            <h3 className="text-xs font-bold uppercase tracking-widest text-theme-text-secondary mb-3 flex items-center gap-2"><Layers size={14}/> Subject Breakdown</h3>
                            <div className="space-y-3">
                                {isCustomTest ? (
                                    subjects.map(sub => {
                                        const marks = breakdown?.[sub]?.marks;
                                        const total = breakdown?.[sub]?.total;
                                        if (safeNum(total) === 0 && safeNum(marks) === 0) return null;
                                        const subPercent = safeDiv(safeNum(marks), safeNum(total)) * 100;
                                        return (
                                            <div key={sub} className="p-3 bg-theme-bg-tertiary rounded-xl border border-theme-border">
                                                <div className="flex justify-between items-center text-sm font-bold mb-2">
                                                    <span className="text-theme-text">{sub}</span>
                                                    <span className="font-mono text-theme-text-secondary">{safeNum(marks)} / {safeNum(total)}</span>
                                                </div>
                                                <div className="h-2 w-full rounded-full flex overflow-hidden bg-rose-500/20">
                                                    <div className="bg-emerald-500" style={{width: `${subPercent}%`}}/>
                                                </div>
                                            </div>
                                        )
                                    })
                                ) : (
                                    subjects.map(sub => {
                                        const { correct, incorrect, unattempted } = breakdown[sub];
                                        const total = correct + incorrect + unattempted;
                                        if(total === 0) return null;
                                        return (<div key={sub} className="p-3 bg-theme-bg-tertiary rounded-xl border border-theme-border"><div className="flex justify-between items-center text-sm font-bold mb-2"><span className="text-theme-text">{sub}</span><span className="font-mono text-theme-text-secondary">{(safeDiv(correct, correct + incorrect) * 100).toFixed(0)}% Acc.</span></div><div className="h-2 w-full rounded-full flex overflow-hidden"><div className="bg-emerald-500" style={{width: `${safeDiv(correct, total) * 100}%`}}/><div className="bg-rose-500" style={{width: `${safeDiv(incorrect, total) * 100}%`}}/><div className="bg-slate-500" style={{width: `${safeDiv(unattempted, total) * 100}%`}}/></div></div>)
                                    })
                                )}
                            </div>
                        </div>
                    )}
                    
                    {totals.incorrect > 0 && (
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-theme-text-secondary mb-3 flex items-center gap-2"><Brain size={14}/> Mistake Analysis</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {MISTAKE_TYPES.map(m => {
                                    const count = totals.mistakes[m.id] || 0;
                                    if(count === 0) return null;
                                    return <div key={m.id} className="flex items-center gap-3 p-3 bg-theme-bg-tertiary rounded-xl border border-theme-border"><div className={`p-2 rounded-lg bg-black/5 dark:bg-white/5 ${m.color}`}>{m.icon}</div><div><p className="font-bold text-lg text-theme-text">{count}</p><p className="text-[10px] text-theme-text-secondary uppercase font-bold tracking-wider">{m.label}</p></div></div>
                                })}
                            </div>
                        </div>
                    )}

                    {test.weakTopics && test.weakTopics.length > 0 && (
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-theme-text-secondary mb-2 flex items-center gap-2"><TargetIcon size={14}/> Weak Topics</h3>
                            <div className="flex flex-wrap gap-2">{test.weakTopics.map(t => t && <span key={t} className="px-2 py-1 bg-rose-500/10 text-rose-500 text-[10px] font-bold rounded">{t}</span>)}</div>
                        </div>
                    )}

                    {test.postTestNotes && (
                         <div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-theme-text-secondary mb-2 flex items-center gap-2"><BookOpen size={14}/> Notes</h3>
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
    
    const sortedTests = useMemo(() => [...tests].sort((a, b) => a.timestamp - b.timestamp), [tests]);
    const chartData = useMemo(() => {
        return sortedTests.map(t => ({
            percent: t.total > 0 ? (t.marks / t.total) * 100 : 0,
            date: new Date(t.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }));
    }, [sortedTests]);

    const maxPercent = 100; const minPercent = 0; const range = maxPercent - minPercent;
    if (range === 0) return null;

    const points = chartData.map((p, i) => {
        const x = chartData.length > 1 ? (i / (chartData.length - 1)) * 100 : 50;
        const y = 100 - ((p.percent - minPercent) / range) * 100;
        return `${x},${y}`;
    }).join(' ');
    
    return (
        <Card>
            <h3 className="text-sm font-bold uppercase tracking-wider text-theme-text-secondary mb-4 flex items-center gap-2"><TrendingUp size={16}/> Performance Trend</h3>
            <div className="h-48 w-full">
                <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                    <defs><linearGradient id="trendGradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--theme-accent)" stopOpacity="0.3"/><stop offset="100%" stopColor="var(--theme-accent)" stopOpacity="0"/></linearGradient></defs>
                    <polyline fill="url(#trendGradient)" points={`0,100 ${points} 100,100`} />
                    <polyline fill="none" stroke="var(--theme-accent)" strokeWidth="0.5" points={points} />
                    {chartData.map((p, i) => {
                         const x = chartData.length > 1 ? (i / (chartData.length - 1)) * 100 : 50;
                         const y = 100 - ((p.percent - minPercent) / range) * 100;
                         return <circle key={i} cx={x} cy={y} r="1" fill="var(--theme-accent)" />;
                    })}
                </svg>
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
                <button onClick={() => setIsAdding(true)} className="flex items-center justify-center gap-2 px-6 py-3 bg-theme-accent text-theme-text-on-accent rounded-2xl text-xs font-bold uppercase tracking-wider shadow-lg hover:opacity-90 transition-opacity active:scale-95 whitespace-nowrap" style={{boxShadow: '0 10px 15px -3px rgba(var(--theme-accent-rgb), 0.2)'}}><Plus size={16} /> Log New Test</button>
            </div>
            <TestAnalytics tests={tests} />
            <div className="flex items-center gap-2">
                <div className="relative flex-1 group"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-secondary group-focus-within:text-theme-accent" /><input type="text" placeholder="Search tests..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-theme-card border border-theme-border rounded-xl py-2 pl-8 pr-3 text-sm focus:border-theme-accent outline-none" /></div>
                <button onClick={() => setSortOrder(s => s === 'newest' ? 'oldest' : 'newest')} className="p-2.5 bg-theme-card border border-theme-border rounded-xl text-theme-text-secondary hover:text-theme-text"><ArrowUpNarrowWide size={14} className={`transition-transform ${sortOrder === 'oldest' ? 'rotate-180' : ''}`} /></button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {processedTests.map(test => (<TestCard key={test.id} test={test} onView={() => setViewingReport(test)} onDelete={(e) => { e.stopPropagation(); setDeletingTestId(test.id); }} />))}
            </div>

            {processedTests.length === 0 && (
                <div className="text-center py-20 opacity-40 border-2 border-dashed border-theme-border rounded-3xl">
                    <Trophy size={48} className="mx-auto mb-4"/><p className="text-xs uppercase font-bold tracking-widest">No tests logged yet</p><p className="text-[10px] mt-1">Click 'Log New Test' to get started</p>
                </div>
            )}
        </>
      )}
    </div>
  );
});

export default TestLog;
