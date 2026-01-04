import React, { useMemo, useState, memo, useCallback } from 'react';
import { Plus, Trash2, Activity, Zap, Atom, Calculator, CalendarClock, ArrowRight, CheckCircle2, Pencil, X, Brain, ChevronRight, History } from 'lucide-react';
import { Session, Target, MistakeCounts } from '../types';
import { Card } from './Card';
import { JEE_SYLLABUS, MISTAKE_TYPES } from '../constants';

// Helper for local date string YYYY-MM-DD
const getLocalDate = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to convert timestamp to local YYYY-MM-DD
const getLocalDateFromTimestamp = (ts: number) => {
    return getLocalDate(new Date(ts));
};

interface DashboardProps {
  sessions: Session[];
  targets: Target[];
  quote: { text: string; author: string };
  onDelete: (id: string) => void;
  goals: { Physics: number; Chemistry: number; Maths: number };
  setGoals: React.Dispatch<React.SetStateAction<{ Physics: number; Chemistry: number; Maths: number }>>;
  onSaveSession: (session: Omit<Session, 'id' | 'timestamp'>) => void;
  userName: string | null;
}

const ActivityHeatmap = memo(({ sessions }: { sessions: Session[] }) => {
  const days = useMemo(() => {
    // Optimized: Create lookup map first
    const dateCounts: Record<string, number> = {};
    sessions.forEach(s => {
        const d = getLocalDateFromTimestamp(s.timestamp);
        dateCounts[d] = (dateCounts[d] || 0) + 1;
    });

    const d = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const str = getLocalDate(date);
      const count = dateCounts[str] || 0;
      d.push({ date: str, count, dayName: date.toLocaleDateString('en-US', { weekday: 'narrow' }) });
    }
    return d;
  }, [sessions]);

  return (
    <div className="flex gap-2 md:gap-4 items-end">
      {days.map((day, i) => (
        <div key={day.date} className="flex flex-col items-center gap-1.5 md:gap-3 group cursor-default">
          <div 
            className={`w-3.5 md:w-8 rounded-md transition-all duration-500 relative transform-gpu ${
              day.count === 0 ? 'h-4 md:h-8 bg-slate-200 dark:bg-white/5' : 
              day.count < 3 ? 'h-8 md:h-16 bg-indigo-400/40 dark:bg-indigo-500/40' : 
              'h-16 md:h-24 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.4)] dark:shadow-[0_0_15px_rgba(99,102,241,0.6)]'
            }`} 
          >
             {/* Desktop Tooltip */}
             <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none hidden md:block whitespace-nowrap z-20">
                {day.count} Sessions
             </div>
          </div>
          <span className="text-[9px] md:text-xs font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wider">{day.dayName}</span>
        </div>
      ))}
    </div>
  );
});

const SubjectPod = memo(({ 
  subject, 
  icon: Icon, 
  count, 
  target, 
  onGoalChange,
  themeColor,
  onClick
}: { 
  subject: string, 
  icon: any, 
  count: number, 
  target: number, 
  onGoalChange: (newGoal: number) => void;
  themeColor: 'blue' | 'orange' | 'rose',
  onClick: () => void
}) => {
  const safeTarget = Math.max(1, target || 1); // Prevent division by zero
  const percent = Math.min(100, (count / safeTarget) * 100);
  const scaleXValue = isFinite(percent) ? percent / 100 : 0;
  
  const [isEditing, setIsEditing] = useState(false);
  const [tempGoal, setTempGoal] = useState(target.toString());
  const isCompleted = count >= safeTarget;

  const colors = useMemo(() => {
    switch(themeColor) {
      case 'blue': return {
        text: 'text-blue-500 dark:text-blue-400',
        bgBase: 'from-blue-500/5 to-transparent',
        bgHover: 'from-blue-500/20 to-blue-500/5',
        bar: 'bg-blue-500',
        icon: 'text-blue-500 dark:text-blue-400'
      };
      case 'orange': return {
        text: 'text-orange-500 dark:text-orange-400',
        bgBase: 'from-orange-500/5 to-transparent',
        bgHover: 'from-orange-500/20 to-orange-500/5',
        bar: 'bg-orange-500',
        icon: 'text-orange-500 dark:text-orange-400'
      };
      case 'rose': return {
        text: 'text-rose-500 dark:text-rose-400',
        bgBase: 'from-rose-500/5 to-transparent',
        bgHover: 'from-rose-500/20 to-rose-500/5',
        bar: 'bg-rose-500',
        icon: 'text-rose-500 dark:text-rose-400'
      };
    }
  }, [themeColor]);

  return (
    <div 
      onClick={(e) => {
        // Don't trigger modal if clicking the goal input
        if ((e.target as HTMLElement).closest('.goal-input')) return;
        onClick();
      }}
      className="relative overflow-hidden rounded-[2rem] border border-slate-200 dark:border-white/5 p-5 md:p-6 flex flex-col justify-between min-h-[160px] md:min-h-[220px] group cursor-pointer hover:scale-[1.02] hover:shadow-2xl hover:border-slate-300 dark:hover:border-white/20 active:scale-95 backdrop-blur-md transform-gpu will-change-transform transition-[transform,box-shadow,border-color,background-color] duration-300"
      style={{ 
        transform: 'translate3d(0,0,0)',
        backgroundColor: 'rgba(var(--theme-card-rgb), 0.4)'
      }}
    >
      {/* Hover Glow Layer - Absolute positioning for smooth opacity transition (GPU accelerated) */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.bgHover} opacity-0 group-hover:opacity-100 transition-opacity duration-500 will-change-composite`} />
       
      {/* Base Gradient Layer */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.bgBase} opacity-100 pointer-events-none`} />

      <div className="flex justify-between items-start z-10 w-full relative">
        <div className={`p-3 rounded-2xl bg-white dark:bg-slate-800 shadow-sm ring-1 ring-black/5 ${colors.icon} transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 will-change-transform`}>
          <Icon size={24} />
        </div>
        <div className="text-right goal-input z-20 flex-grow flex justify-end">
          {isEditing ? (
            <input 
              type="number" 
              autoFocus
              className="w-16 bg-white/50 dark:bg-black/40 text-slate-900 dark:text-white text-[16px] md:text-xs font-bold p-1 rounded border border-slate-300 dark:border-white/20 outline-none text-right"
              value={tempGoal}
              onChange={(e) => setTempGoal(e.target.value)}
              onBlur={() => {
                onGoalChange(parseInt(tempGoal) || target);
                setIsEditing(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onGoalChange(parseInt(tempGoal) || target);
                  setIsEditing(false);
                }
              }}
            />
          ) : (
            <div 
              onClick={(e) => {
                e.stopPropagation(); 
                setIsEditing(true);
              }}
              className="flex items-center gap-1.5 group/edit p-1 rounded-lg hover:bg-black/5 dark:hover:bg-black/20 transition-colors"
            >
              {isCompleted && (
                <div className="bg-emerald-500/20 p-0.5 rounded-full animate-in zoom-in duration-300">
                  <CheckCircle2 size={12} className="text-emerald-500 dark:text-emerald-400" />
                </div>
              )}
              <p className={`text-[10px] md:text-xs font-bold uppercase tracking-widest transition-colors ${isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-white/60 group-hover/edit:text-slate-800 dark:group-hover/edit:text-white'}`}>
                Goal: {target}
              </p>
              <Pencil size={10} className="opacity-0 group-hover/edit:opacity-100 text-slate-600 dark:text-white" />
            </div>
          )}
        </div>
      </div>
      
      <div className="z-10 mt-4 relative">
        <h4 className={`text-sm md:text-base font-bold uppercase tracking-wider mb-1.5 ${colors.text}`}>{subject}</h4>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl md:text-5xl font-mono font-bold text-slate-800 dark:text-white tracking-tight">{count}</span>
          <span className="text-[10px] md:text-xs font-bold text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-wider">Solved</span>
        </div>
      </div>

      {/* Progress Bar Background - Optimized with ScaleX */}
      <div className="absolute bottom-0 left-0 h-1.5 w-full bg-slate-200 dark:bg-black/20">
        <div 
          className={`h-full transition-all duration-1000 ease-out origin-left will-change-transform ${isCompleted ? 'bg-emerald-500' : colors.bar}`} 
          style={{ 
              width: '100%',
              transform: `scaleX(${scaleXValue})` 
          }}
        />
      </div>
    </div>
  );
});

// SubjectDetailModal Component (Abbreviated to focus on fix, but including full content for consistency)
const SubjectDetailModal = memo(({ 
  subject, 
  sessions, 
  onClose,
  onSaveSession,
  onDeleteSession
}: { 
  subject: string, 
  sessions: Session[], 
  onClose: () => void,
  onSaveSession: (data: Omit<Session, 'id' | 'timestamp'>) => void,
  onDeleteSession: (id: string) => void
}) => {
  const [activeTab, setActiveTab] = useState<'log' | 'history'>('log');
  
  // Logging State
  const [step, setStep] = useState(1);
  const [logData, setLogData] = useState({ 
    topic: '', 
    attempted: 0, 
    correct: 0, 
    mistakes: {} as MistakeCounts 
  });
  
  const incorrectCount = logData.attempted - logData.correct;
  const allocatedMistakes = (Object.values(logData.mistakes) as number[]).reduce((a, b) => a + (b || 0), 0);

  const updateMistake = (type: keyof MistakeCounts, val: number) => {
    const current = logData.mistakes[type] || 0;
    const next = Math.max(0, current + val);
    if (val > 0 && allocatedMistakes >= incorrectCount) return;
    setLogData({ ...logData, mistakes: { ...logData.mistakes, [type]: next } });
  };

  const handleSave = () => {
    onSaveSession({ subject, ...logData });
    // Reset and show history/success
    setLogData({ topic: '', attempted: 0, correct: 0, mistakes: {} });
    setStep(1);
    setActiveTab('history');
  };

  const mistakesSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    sessions.forEach(s => {
      Object.entries(s.mistakes).forEach(([k, v]) => {
        counts[k] = (counts[k] || 0) + ((v as number) || 0);
      });
    });
    return counts;
  }, [sessions]);

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0f172a] border-t md:border border-slate-200 dark:border-white/10 w-full md:max-w-2xl rounded-t-[2rem] md:rounded-3xl shadow-2xl flex flex-col h-[85vh] md:h-auto md:max-h-[90vh] animate-in slide-in-from-bottom-10 duration-300 overflow-hidden transform-gpu">
        
        {/* Header */}
        <div className="p-5 md:p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-transparent dark:from-indigo-500/10 dark:to-transparent shrink-0">
          <div className="flex items-center gap-3 md:gap-4">
             {subject === 'Physics' && <Atom className="text-blue-500 dark:text-blue-400" size={24} />}
             {subject === 'Chemistry' && <Zap className="text-orange-500 dark:text-orange-400" size={24} />}
             {subject === 'Maths' && <Calculator className="text-rose-500 dark:text-rose-400" size={24} />}
             <div>
               <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-wider">{subject} Hub</h2>
               <p className="text-[9px] md:text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">Chapter Progress</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex p-2 gap-2 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-black/20 shrink-0">
          <button 
            onClick={() => setActiveTab('log')}
            className={`flex-1 py-3 rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'log' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-white/5'}`}
          >
            Add Session
          </button>
          <button 
             onClick={() => setActiveTab('history')}
             className={`flex-1 py-3 rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-white/5'}`}
          >
            Past Sessions
          </button>
        </div>

        {/* Content */}
        <div className="p-5 md:p-6 overflow-y-auto flex-grow overscroll-contain">
          {activeTab === 'log' ? (
            <div className="space-y-6 pb-10">
              {step === 1 ? (
                <>
                  <div className="space-y-5">
                     <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-indigo-500 dark:text-indigo-400 ml-1 tracking-widest">Topic / Chapter</label>
                        <select 
                          className="w-full bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 p-4 rounded-2xl text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all text-sm appearance-none"
                          value={logData.topic}
                          onChange={e => setLogData({...logData, topic: e.target.value})}
                        >
                          <option value="">Select Chapter...</option>
                          {JEE_SYLLABUS[subject as keyof typeof JEE_SYLLABUS].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold text-indigo-500 dark:text-indigo-400 ml-1 tracking-widest">Attempted</label>
                          <input 
                            type="number" min="0" 
                            className="w-full bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 p-4 rounded-2xl text-slate-900 dark:text-white font-mono text-xl outline-none focus:border-indigo-500"
                            value={logData.attempted || ''}
                            onChange={e => setLogData({...logData, attempted: parseInt(e.target.value) || 0})}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold text-indigo-500 dark:text-indigo-400 ml-1 tracking-widest">Correct</label>
                          <input 
                            type="number" min="0" 
                            className="w-full bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 p-4 rounded-2xl text-slate-900 dark:text-white font-mono text-xl outline-none focus:border-indigo-500"
                            value={logData.correct || ''}
                            onChange={e => setLogData({...logData, correct: Math.min(logData.attempted, parseInt(e.target.value) || 0)})}
                          />
                        </div>
                     </div>
                  </div>
                  <button 
                    disabled={!logData.topic || logData.attempted < 1} 
                    onClick={() => {
                      if (incorrectCount > 0) setStep(2);
                      else handleSave();
                    }}
                    className="w-full bg-indigo-600 py-4 rounded-2xl text-white font-bold uppercase tracking-widest hover:bg-indigo-500 disabled:opacity-50 shadow-lg shadow-indigo-600/20 transition-all mt-6 active:scale-95"
                  >
                    {incorrectCount > 0 ? 'Next: Review Mistakes' : 'Save Session'}
                  </button>
                </>
              ) : (
                <>
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex justify-between items-center mb-4">
                     <div>
                       <span className="text-xs font-bold text-rose-500 dark:text-rose-300 uppercase block">Incorrect Answers</span>
                       <span className="text-[10px] text-rose-500/60 font-bold uppercase">{allocatedMistakes} / {incorrectCount} Tagged</span>
                     </div>
                     <span className="text-2xl font-mono text-rose-500 dark:text-rose-400">{incorrectCount - allocatedMistakes} Left</span>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2">
                    {MISTAKE_TYPES.map(type => (
                      <div key={type.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5">
                        <div className="flex items-center gap-3 overflow-hidden">
                           <span className={`${type.color} shrink-0`}>{type.icon}</span>
                           <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 truncate">{type.label}</span>
                        </div>
                        <div className="flex items-center gap-3 bg-white dark:bg-black/40 border border-slate-200 dark:border-none rounded-lg p-1 shrink-0">
                          <button onClick={() => updateMistake(type.id as any, -1)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 rounded-md text-slate-500 dark:text-slate-400 transition-colors text-lg active:scale-90">-</button>
                          <span className="w-6 text-center text-base font-mono text-slate-900 dark:text-white">{logData.mistakes[type.id as any] || 0}</span>
                          <button onClick={() => updateMistake(type.id as any, 1)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 rounded-md text-slate-500 dark:text-slate-400 transition-colors text-lg active:scale-90">+</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl bg-slate-200 dark:bg-white/5 text-slate-600 dark:text-slate-400 font-bold uppercase text-xs tracking-wider hover:bg-slate-300 dark:hover:bg-white/10 active:scale-95 transition-all">Back</button>
                    <button 
                      onClick={handleSave} 
                      disabled={allocatedMistakes !== incorrectCount}
                      className="flex-[2] py-3 rounded-xl bg-emerald-600 text-white font-bold uppercase text-xs tracking-wider hover:bg-emerald-500 disabled:opacity-50 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                    >
                      Save Progress
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-6 pb-10">
              {/* History Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 p-4 rounded-2xl">
                   <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Questions Done</p>
                   <p className="text-2xl font-mono font-bold text-slate-900 dark:text-white mt-1">
                     {sessions.reduce((a,b) => a + b.attempted, 0)}
                   </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 p-4 rounded-2xl">
                   <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Success Rate</p>
                   <p className="text-2xl font-mono font-bold text-slate-900 dark:text-white mt-1">
                     {sessions.length > 0 ? Math.round((sessions.reduce((a,b) => a + b.correct, 0) / sessions.reduce((a,b) => a + b.attempted, 0)) * 100) : 0}%
                   </p>
                </div>
              </div>

              {/* Mistake Breakdown */}
              <div className="space-y-3">
                 <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2"><Brain size={14} /> Mistake Patterns</h4>
                 {Object.keys(mistakesSummary).length === 0 ? (
                   <p className="text-xs text-slate-600 italic">No mistakes recorded yet.</p>
                 ) : (
                   MISTAKE_TYPES.map(type => {
                     const count = mistakesSummary[type.id] || 0;
                     if(count === 0) return null;
                     const max = Math.max(...(Object.values(mistakesSummary) as number[]), 1);
                     const scaleVal = isFinite(count/max) ? count/max : 0;
                     
                     return (
                       <div key={type.id} className="flex items-center gap-3">
                         <div className={`w-2 h-2 rounded-full shrink-0 ${type.color.replace('text', 'bg')}`} />
                         <span className="text-[10px] uppercase font-bold text-slate-400 w-32 shrink-0 truncate">{type.label}</span>
                         <div className="flex-grow h-1.5 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                           <div 
                                className={`h-full ${type.color.replace('text', 'bg')} origin-left transition-transform duration-500`} 
                                style={{ width: '100%', transform: `scaleX(${scaleVal})` }} 
                           />
                         </div>
                         <span className="text-xs font-mono text-slate-700 dark:text-white shrink-0 w-6 text-right">{count}</span>
                       </div>
                     )
                   })
                 )}
              </div>

              {/* Session List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 mt-2"><History size={14} /> Recent Sessions</h4>
                {sessions.length === 0 ? (
                  <div className="text-center py-8 opacity-30 border border-dashed border-slate-400 dark:border-white/10 rounded-xl">
                    <p className="text-[10px] uppercase font-bold tracking-widest">No history</p>
                  </div>
                ) : (
                  sessions.map(s => (
                    <div key={s.id} className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl flex justify-between items-center group active:scale-[0.98] transition-all">
                      <div className="min-w-0 pr-4">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{s.topic}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-0.5">{new Date(s.timestamp).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <span className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-300">{s.correct}/{s.attempted}</span>
                        </div>
                        <button onClick={() => onDeleteSession(s.id)} className="text-rose-500/50 hover:text-rose-500 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all p-2"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export const Dashboard = memo(({ 
  sessions, 
  targets, 
  quote, 
  onDelete, 
  goals, 
  setGoals, 
  onSaveSession,
  userName
}: DashboardProps) => {
  const todayStr = getLocalDate();
  const todaysSessions = useMemo(() => sessions.filter(s => getLocalDateFromTimestamp(s.timestamp) === todayStr), [sessions, todayStr]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const { greeting, displayName } = useMemo(() => {
    const hour = new Date().getHours();
    let greetingText = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
    const name = userName ? `, ${userName.split(' ')[0]}` : '';
    return { greeting: greetingText, displayName: name };
  }, [userName]);
  const stats = useMemo(() => ({
      Physics: todaysSessions.filter(s => s.subject === 'Physics').reduce((a, b) => a + b.attempted, 0),
      Chemistry: todaysSessions.filter(s => s.subject === 'Chemistry').reduce((a, b) => a + b.attempted, 0),
      Maths: todaysSessions.filter(s => s.subject === 'Maths').reduce((a, b) => a + b.attempted, 0),
  }), [todaysSessions]);
  const pendingTargets = useMemo(() => targets.filter(t => t.date === todayStr && !t.completed).slice(0, 3), [targets, todayStr]);
  const handlePhysicsGoal = useCallback((val: number) => setGoals(g => ({...g, Physics: val})), [setGoals]);
  const handleChemGoal = useCallback((val: number) => setGoals(g => ({...g, Chemistry: val})), [setGoals]);
  const handleMathsGoal = useCallback((val: number) => setGoals(g => ({...g, Maths: val})), [setGoals]);
  const openPhysics = useCallback(() => setSelectedSubject('Physics'), []);
  const openChem = useCallback(() => setSelectedSubject('Chemistry'), []);
  const openMaths = useCallback(() => setSelectedSubject('Maths'), []);

  return (
    <>
      <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-end gap-6">
          <div className="flex flex-col items-center md:items-start gap-3 order-2 md:order-1 w-full md:w-auto">
             <span className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest w-full text-center md:text-left">Weekly Streak</span>
             <ActivityHeatmap sessions={sessions} />
          </div>
          <div className="text-center md:text-right order-1 md:order-2 w-full md:w-auto">
            <h2 className="text-2xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight flex items-center justify-center md:justify-end gap-3">
              {greeting}{displayName}!
            </h2>
            <p className="text-xs md:text-sm text-indigo-600 dark:text-indigo-300 uppercase tracking-widest font-bold opacity-70">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
        <Card className="bg-indigo-50/50 dark:bg-indigo-600/5 border-indigo-100 dark:border-indigo-500/10 p-5 md:p-8 flex flex-col justify-center items-center text-center relative overflow-hidden transform-gpu will-change-transform">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/30 dark:via-indigo-500/50 to-transparent opacity-50"></div>
            <p className="text-base md:text-2xl font-serif italic text-indigo-900 dark:text-indigo-100 leading-relaxed max-w-4xl mx-auto relative z-10 drop-shadow-sm dark:drop-shadow-lg">"{quote.text}"</p>
            <div className="mt-4 md:mt-6 flex items-center justify-center gap-3 opacity-60">
                <div className="h-[1px] w-8 md:w-16 bg-indigo-400"></div>
                <span className="text-[9px] md:text-xs uppercase tracking-[0.3em] font-bold text-indigo-700 dark:text-indigo-300">{quote.author}</span>
                <div className="h-[1px] w-8 md:w-16 bg-indigo-400"></div>
            </div>
        </Card>
        <div id="dashboard-subjects" className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <SubjectPod subject="Physics" icon={Atom} count={stats.Physics} target={goals.Physics} onGoalChange={handlePhysicsGoal} themeColor="blue" onClick={openPhysics} />
          <SubjectPod subject="Chemistry" icon={Zap} count={stats.Chemistry} target={goals.Chemistry} onGoalChange={handleChemGoal} themeColor="orange" onClick={openChem} />
          <SubjectPod subject="Maths" icon={Calculator} count={stats.Maths} target={goals.Maths} onGoalChange={handleMathsGoal} themeColor="rose" onClick={openMaths} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          <div className="space-y-6">
             <div className="bg-white/60 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-3xl p-5 md:p-8 relative overflow-hidden backdrop-blur-md h-full transform-gpu" style={{ transform: 'translate3d(0,0,0)', backgroundColor: 'rgba(var(--theme-card-rgb), 0.4)' }}>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xs md:text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <CalendarClock size={16} className="text-indigo-500 dark:text-indigo-400" /> Up Next
                  </h3>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{pendingTargets.length} Tasks</span>
                </div>
                {pendingTargets.length > 0 ? (
                  <div className="space-y-4">
                    {pendingTargets.map(t => (
                      <div key={t.id} className="flex items-center gap-4 p-4 bg-white dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-colors">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                        <span className="text-sm md:text-base font-medium text-slate-700 dark:text-slate-200 flex-grow truncate">{t.text}</span>
                        <ArrowRight size={16} className="text-slate-400 dark:text-slate-500" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center opacity-40">
                    <CheckCircle2 size={32} className="mx-auto mb-3 text-emerald-500 dark:text-emerald-400" />
                    <p className="text-xs uppercase font-bold tracking-widest text-slate-900 dark:text-white">All caught up for today</p>
                  </div>
                )}
             </div>
          </div>
          <div>
             <div className="bg-white/60 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-3xl p-5 md:p-8 backdrop-blur-md h-full transform-gpu" style={{ transform: 'translate3d(0,0,0)', backgroundColor: 'rgba(var(--theme-card-rgb), 0.4)' }}>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xs md:text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Activity size={16} className="text-indigo-500 dark:text-indigo-400" /> Recent Activity
                  </h3>
                </div>
                <div className="space-y-3 max-h-[400px] overflow-y-auto no-scrollbar mask-gradient-bottom">
                  {todaysSessions.length === 0 ? (
                    <div className="text-center py-12 opacity-30 border border-dashed border-slate-300 dark:border-white/10 rounded-2xl">
                      <p className="text-xs uppercase font-bold tracking-widest text-slate-500 dark:text-white">No activity yet</p>
                    </div>
                  ) : (
                    todaysSessions.slice(0, 5).map((s, idx) => (
                      <div key={s.id} className="bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 p-4 rounded-2xl flex justify-between items-center group hover:bg-white dark:hover:bg-white/5 transition-colors active:scale-95">
                        <div className="flex items-center gap-4 overflow-hidden">
                          <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor] shrink-0 ${s.subject === 'Physics' ? 'text-blue-500 bg-blue-500 dark:text-blue-400 dark:bg-blue-400' : s.subject === 'Chemistry' ? 'text-orange-500 bg-orange-500 dark:text-orange-400 dark:bg-orange-400' : 'text-rose-500 bg-rose-500 dark:text-rose-400 dark:bg-rose-400'}`} />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{s.topic}</p>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-0.5">{s.attempted} Qs</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <span className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-300">{s.attempted > 0 ? Math.round((s.correct / s.attempted) * 100) : 0}%</span>
                          <button onClick={() => onDelete(s.id)} className="opacity-0 group-hover:opacity-100 text-rose-500 hover:bg-rose-500/10 p-2 rounded-lg transition-all"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
             </div>
          </div>
        </div>
      </div>
      {selectedSubject && (
        <SubjectDetailModal 
          subject={selectedSubject}
          sessions={sessions.filter(s => s.subject === selectedSubject)}
          onClose={() => setSelectedSubject(null)}
          onSaveSession={onSaveSession}
          onDeleteSession={(id) => onDelete(id)}
        />
      )}
    </>
  );
});