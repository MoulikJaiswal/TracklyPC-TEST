

import React, { useMemo, useState, memo, useCallback, useEffect, useRef } from 'react';
import { Plus, Trash2, Activity, Zap, Atom, Calculator, CalendarClock, ArrowRight, CheckCircle2, Pencil, X, Brain, ChevronRight, History, ChevronDown, ShieldCheck, Dna, Clock, Timer, BookOpen, Settings, Globe, Landmark, Feather, Info } from 'lucide-react';
import { Session, Target, MistakeCounts, SyllabusData } from '../types';
import { Card } from './Card';
import { MISTAKE_TYPES } from '../constants';
import { AdUnit } from './AdUnit';
import { logAnalyticsEvent } from '../firebase';

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

const formatDurationSimple = (seconds: number) => {
    const m = Math.round(seconds / 60);
    return `${m}m`;
};

// Helper to deterministically assign colors to dynamic subjects
const getSubjectColor = (subject: string): string => {
    if (subject === 'Physics') return 'blue';
    if (subject === 'Chemistry') return 'orange';
    if (subject === 'Maths') return 'rose';
    if (subject === 'Biology') return 'emerald';
    if (subject === 'English') return 'violet';
    if (subject === 'History') return 'amber';
    if (subject === 'Geography') return 'cyan';

    const colors = ['blue', 'orange', 'rose', 'emerald', 'indigo', 'cyan', 'violet', 'amber', 'fuchsia'];
    let hash = 0;
    for (let i = 0; i < subject.length; i++) {
        hash = subject.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

const getIconForSubject = (subject: string) => {
    if (subject === 'Physics') return Atom;
    if (subject === 'Chemistry') return Zap;
    if (subject === 'Maths') return Calculator;
    if (subject === 'Biology') return Dna;
    if (subject === 'English') return Feather;
    if (subject === 'History') return Landmark;
    if (subject === 'Geography') return Globe;
    return BookOpen;
};

interface DashboardProps {
  sessions: Session[];
  targets: Target[];
  quote: { text: string; author: string };
  onDelete: (id: string) => void;
  goals: Record<string, number>;
  setGoals: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  onSaveSession: (session: Omit<Session, 'id' | 'timestamp' | 'stream'>) => void;
  userName: string | null;
  onOpenPrivacy: () => void;
  subjects: string[];
  syllabus: SyllabusData;
}

const ActivityHeatmap = memo(({ sessions }: { sessions: Session[] }) => {
  const days = useMemo(() => {
    const counts: Record<string, number> = {};
    sessions.forEach(s => { const d = getLocalDateFromTimestamp(s.timestamp); counts[d] = (counts[d] || 0) + 1; });
    const result = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const str = getLocalDate(d); result.push({ date: str, day: d.toLocaleDateString('en-US', { weekday: 'narrow' }), count: counts[str] || 0 }); }
    return result;
  }, [sessions]);
  return (
    <div className="w-full max-w-[280px]">
        <div className="flex items-end gap-1.5 h-12">
            {days.map((d) => {
                const pct = Math.min(100, Math.max(15, (d.count / 8) * 100));
                return (
                    <div key={d.date} className="flex-1 flex flex-col justify-end gap-1 group relative h-full cursor-help">
                        <div className="relative w-full flex-1 flex items-end">
                             <div className={`w-full rounded-sm transition-all duration-500 ${d.count > 0 ? 'bg-indigo-500 dark:bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.4)]' : 'bg-slate-200 dark:bg-white/5 h-1'}`} style={{ height: d.count > 0 ? `${pct}%` : undefined }} />
                             <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-slate-800 text-white text-[9px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20 shadow-lg">{d.count} Sessions</div>
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 text-center uppercase">{d.day}</span>
                    </div>
                )
            })}
        </div>
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
  themeColor: string,
  onClick: () => void
}) => {
  const safeTarget = Math.max(1, target || 1);
  const percent = Math.min(100, (count / safeTarget) * 100);
  const scaleXValue = isFinite(percent) ? percent / 100 : 0;
  
  const [isEditing, setIsEditing] = useState(false);
  const [tempGoal, setTempGoal] = useState(target.toString());
  const isCompleted = count >= safeTarget;

  // Simplified color logic
  const colors = {
      text: `text-${themeColor}-500 dark:text-${themeColor}-400`,
      bgBase: `from-${themeColor}-500/5 to-transparent`,
      bgHover: `from-${themeColor}-500/20 to-${themeColor}-500/5`,
      bar: `bg-${themeColor}-500`,
      icon: `text-${themeColor}-500 dark:text-${themeColor}-400`
  };

  return (
    <div 
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('.goal-input')) return;
        onClick();
      }}
      className="relative overflow-hidden rounded-[2rem] border border-slate-200 dark:border-white/5 p-5 md:p-6 flex flex-col justify-between min-h-[160px] md:min-h-[220px] group cursor-pointer hover:scale-[1.02] hover:shadow-2xl hover:border-slate-300 dark:hover:border-white/20 active:scale-[0.98] backdrop-blur-md transform-gpu will-change-transform transition-[transform,box-shadow,border-color,background-color] duration-300"
      style={{ 
        transform: 'translate3d(0,0,0)',
        backgroundColor: 'rgba(var(--theme-card-rgb), 0.4)'
      }}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.bgHover} opacity-0 group-hover:opacity-100 transition-opacity duration-500 will-change-composite`} />
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
              onBlur={() => { onGoalChange(parseInt(tempGoal) || target); setIsEditing(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { onGoalChange(parseInt(tempGoal) || target); setIsEditing(false); } }}
            />
          ) : (
            <div onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="flex items-center gap-1.5 group/edit p-1 rounded-lg hover:bg-black/5 dark:hover:bg-black/20 transition-colors">
              {isCompleted && (<div className="bg-emerald-500/20 p-0.5 rounded-full animate-in zoom-in duration-300"><CheckCircle2 size={12} className="text-emerald-500 dark:text-emerald-400" /></div>)}
              <p className={`text-[10px] md:text-xs font-bold uppercase tracking-widest transition-colors ${isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-white/60 group-hover/edit:text-slate-800 dark:group-hover/edit:text-white'}`}>Goal: {target}</p>
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

      <div className="absolute bottom-0 left-0 h-1.5 w-full bg-slate-200 dark:bg-black/20">
        <div className={`h-full transition-all duration-1000 ease-out origin-left will-change-transform ${isCompleted ? 'bg-emerald-500' : colors.bar}`} style={{ width: '100%', transform: `scaleX(${scaleXValue})` }} />
      </div>
    </div>
  );
});

// SubjectDetailModal Component (Adapted for Dynamic Subjects)
const SubjectDetailModal = memo(({ 
  subject, 
  sessions, 
  onClose,
  onSaveSession,
  onDeleteSession,
  syllabus
}: { 
  subject: string, 
  sessions: Session[], 
  onClose: () => void,
  onSaveSession: (data: Omit<Session, 'id' | 'timestamp' | 'stream'>) => void,
  onDeleteSession: (id: string) => void,
  syllabus: SyllabusData
}) => {
  const [activeTab, setActiveTab] = useState<'log' | 'history'>('log');
  const [step, setStep] = useState(1);
  const [logData, setLogData] = useState({ topic: '', attempted: 0, correct: 0, mistakes: {} as MistakeCounts });
  const incorrectCount = logData.attempted - logData.correct;
  const allocatedMistakes = (Object.values(logData.mistakes) as (number|undefined)[]).reduce((a: number, b) => a + (Number(b) || 0), 0);

  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = 'unset'; }; }, []);

  const updateMistake = (type: keyof MistakeCounts, val: number) => {
    const current = (logData.mistakes[type] as number) || 0;
    const next = Math.max(0, current + val);
    if (val > 0 && allocatedMistakes >= incorrectCount) return;
    setLogData({ ...logData, mistakes: { ...logData.mistakes, [type]: next } });
  };

  const handleSave = () => {
    onSaveSession({ subject, ...logData });
    logAnalyticsEvent('manual_session_logged', { subject, topic: logData.topic, questions: logData.attempted });
    setLogData({ topic: '', attempted: 0, correct: 0, mistakes: {} });
    setStep(1);
    setActiveTab('history');
  };

  const mistakesSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    sessions.forEach(s => { Object.entries(s.mistakes).forEach(([k, v]) => { const val = Number(v); counts[k] = (counts[k] || 0) + (isNaN(val) ? 0 : val); }); });
    return counts;
  }, [sessions]);

  const color = getSubjectColor(subject);
  const theme = { 
      bg: `bg-${color}-500`, 
      text: `text-${color}-500`, 
      border: `border-${color}-500`, 
      lightBg: `bg-${color}-50 dark:bg-${color}-500/10`,
      gradient: `from-${color}-500 to-${color}-600`,
      lightText: `text-${color}-600 dark:text-${color}-400`
  };

  const Icon = getIconForSubject(subject);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200 backdrop-blur-sm" onTouchMove={(e) => { if(e.target === e.currentTarget) e.preventDefault(); }}>
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 w-full md:max-w-2xl rounded-[2rem] shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300 overflow-hidden transform-gpu" onTouchMove={(e) => e.stopPropagation()}>
        <div className={`p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center ${theme.lightBg} shrink-0 relative overflow-hidden`}>
          <div className={`absolute top-0 right-0 w-64 h-64 ${theme.bg} opacity-5 dark:opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none`} />
          <div className="flex items-center gap-4 relative z-10">
             <div className={`p-3 rounded-xl bg-white dark:bg-black/20 shadow-sm ${theme.text}`}>
                 <Icon size={24} />
             </div>
             <div>
               <h2 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-wider leading-none">{subject} Hub</h2>
               <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${theme.lightText}`}>Chapter Progress</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white/50 dark:bg-black/10 hover:bg-white dark:hover:bg-white/10 rounded-full transition-colors text-slate-500 dark:text-slate-400 relative z-10"><X size={20} /></button>
        </div>

        {/* ... [Tabs and Content logic unchanged, just uses dynamic theme] ... */}
        <div className="p-2 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20 shrink-0">
          <div className="flex bg-slate-200/50 dark:bg-white/5 p-1 rounded-xl">
              <button onClick={() => setActiveTab('log')} className={`flex-1 py-2.5 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'log' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Add Session</button>
              <button onClick={() => setActiveTab('history')} className={`flex-1 py-2.5 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Past Sessions</button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-grow overscroll-contain bg-white dark:bg-[#0f172a]">
          {activeTab === 'log' ? (
            <div className="space-y-8">
              {step === 1 ? (
                  <div className="space-y-6">
                     <div className="space-y-2">
                        <label className={`text-[10px] uppercase font-bold ${theme.lightText} ml-1 tracking-widest`}>Topic / Chapter</label>
                        <div className="relative">
                            <select 
                              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-4 pr-10 rounded-2xl text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all text-sm appearance-none font-medium truncate"
                              value={logData.topic}
                              onChange={e => setLogData({...logData, topic: e.target.value})}
                            >
                              <option value="">Select Chapter...</option>
                              {(syllabus[subject] || []).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className={`text-[10px] uppercase font-bold ${theme.lightText} ml-1 tracking-widest`}>Attempted</label>
                          <input type="number" min="0" placeholder="0" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-4 rounded-2xl text-slate-900 dark:text-white font-mono text-2xl font-bold outline-none focus:border-indigo-500 transition-all" value={logData.attempted || ''} onChange={e => setLogData({...logData, attempted: parseInt(e.target.value) || 0})} />
                        </div>
                        <div className="space-y-2">
                          <label className={`text-[10px] uppercase font-bold ${theme.lightText} ml-1 tracking-widest`}>Correct</label>
                          <input type="number" min="0" placeholder="0" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-4 rounded-2xl text-slate-900 dark:text-white font-mono text-2xl font-bold outline-none focus:border-indigo-500 transition-all" value={logData.correct || ''} onChange={e => setLogData({...logData, correct: Math.min(logData.attempted, parseInt(e.target.value) || 0)})} />
                        </div>
                     </div>
                  </div>
              ) : (
                <>
                  <div className="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-2xl flex justify-between items-center mb-4">
                     <div><span className="text-xs font-bold text-rose-600 dark:text-rose-300 uppercase block">Incorrect Answers</span><span className="text-[10px] text-rose-500/80 font-bold uppercase">{allocatedMistakes} / {incorrectCount} Tagged</span></div>
                     <span className="text-2xl font-mono text-rose-500 dark:text-rose-400 font-bold">{incorrectCount - allocatedMistakes} Left</span>
                  </div>
                  <div className="space-y-2">
                    {MISTAKE_TYPES.map(type => {
                        const count = logData.mistakes[type.id as any] || 0;
                        return (
                          <div key={type.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${count > 0 ? 'bg-slate-50 dark:bg-white/10 border-slate-200 dark:border-white/10' : 'bg-transparent border-slate-100 dark:border-white/5'}`}>
                            <div className="flex-1 min-w-0 flex items-center gap-3">
                               <div className={`p-2 rounded-lg bg-slate-100 dark:bg-black/20 ${type.color} shrink-0`}>{type.icon}</div>
                               <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 truncate">{type.label}</span>
                            </div>
                            <div className="flex items-center gap-1 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg p-1 shrink-0 shadow-sm ml-2">
                              <button onClick={() => updateMistake(type.id as any, -1)} className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 rounded text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">-</button>
                              <span className="w-6 text-center text-sm font-mono font-bold text-slate-900 dark:text-white">{count}</span>
                              <button onClick={() => updateMistake(type.id as any, 1)} className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 rounded text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">+</button>
                            </div>
                          </div>
                        )
                    })}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-6 pb-10">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 p-4 rounded-2xl"><p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Questions Done</p><p className="text-2xl font-mono font-bold text-slate-900 dark:text-white mt-1">{sessions.reduce((a,b) => a + b.attempted, 0)}</p></div>
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 p-4 rounded-2xl"><p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Success Rate</p><p className="text-2xl font-mono font-bold text-slate-900 dark:text-white mt-1">{sessions.length > 0 ? Math.round((sessions.reduce((a,b) => a + b.correct, 0) / sessions.reduce((a,b) => a + b.attempted, 0)) * 100) : 0}%</p></div>
              </div>
              <div className="space-y-3">
                 <div className="group relative flex items-center gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2"><Brain size={14} /> Mistake Patterns</h4>
                    <Info size={12} className="text-slate-400 cursor-help" />
                     <div className="absolute bottom-full mb-2 left-0 w-max max-w-[200px] p-2 bg-slate-800 text-white text-[10px] font-bold rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        Common mistakes made in this subject based on your logs.
                        <div className="absolute top-full left-4 w-2 h-2 bg-slate-800 rotate-45" />
                    </div>
                 </div>
                 {Object.keys(mistakesSummary).length === 0 ? (<p className="text-xs text-slate-600 italic">No mistakes recorded yet.</p>) : (
                   MISTAKE_TYPES.map(type => {
                     const count = mistakesSummary[type.id] || 0;
                     if(count === 0) return null;
                     const values = Object.values(mistakesSummary) as number[];
                     const max = Math.max(...values, 1);
                     const scaleVal = isFinite(count/max) ? count/max : 0;
                     return (<div key={type.id} className="flex items-center gap-3"><div className={`w-2 h-2 rounded-full shrink-0 ${type.color.replace('text', 'bg')}`} /><span className="text-[10px] uppercase font-bold text-slate-400 w-32 shrink-0 truncate">{type.label}</span><div className="flex-grow h-1.5 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden"><div className={`h-full ${type.color.replace('text', 'bg')} origin-left transition-transform duration-500`} style={{ width: '100%', transform: `scaleX(${scaleVal})` }} /></div><span className="text-xs font-mono text-slate-700 dark:text-white shrink-0 w-6 text-right">{count}</span></div>)
                   })
                 )}
              </div>
              <div className="space-y-3">
                <div className="group relative flex items-center gap-2 mt-2">
                   <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2"><History size={14} /> Recent Sessions</h4>
                   <Info size={12} className="text-slate-400 cursor-help" />
                   <div className="absolute bottom-full mb-2 left-0 w-max max-w-[200px] p-2 bg-slate-800 text-white text-[10px] font-bold rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        A list of practice sessions you've logged for this subject.
                        <div className="absolute top-full left-4 w-2 h-2 bg-slate-800 rotate-45" />
                   </div>
                </div>
                {sessions.length === 0 ? (<div className="text-center py-8 opacity-30 border border-dashed border-slate-400 dark:border-white/10 rounded-xl"><p className="text-[10px] uppercase font-bold tracking-widest">No history</p></div>) : (
                  sessions.map(s => (<div key={s.id} className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl flex justify-between items-center group active:scale-[0.98] transition-all border border-transparent hover:border-slate-200 dark:hover:border-white/10"><div className="min-w-0 pr-4"><p className="text-xs font-bold text-slate-900 dark:text-white truncate">{s.topic}</p><p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-0.5">{new Date(s.timestamp).toLocaleDateString()}</p></div><div className="flex items-center gap-4 shrink-0"><div className="text-right"><span className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-300">{s.correct}/{s.attempted}</span></div><button onClick={() => onDeleteSession(s.id)} className="text-rose-500/50 hover:text-rose-500 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all p-2 bg-rose-500/10 rounded-lg"><Trash2 size={14} /></button></div></div>))
                )}
              </div>
            </div>
          )}
        </div>

        {activeTab === 'log' && (
            <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/80 dark:bg-black/20 backdrop-blur-md shrink-0 safe-area-bottom">
               {step === 1 ? (
                  <button disabled={!logData.topic || logData.attempted < 1} onClick={() => { if (incorrectCount > 0) setStep(2); else handleSave(); }} className={`w-full py-4 rounded-2xl text-white font-bold uppercase tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r ${theme.gradient}`}>{incorrectCount > 0 ? 'Next: Review Mistakes' : 'Save Session'}</button>
               ) : (
                  <div className="flex gap-3"><button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400 font-bold uppercase text-xs tracking-wider hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 transition-all border border-slate-200 dark:border-white/10">Back</button><button onClick={handleSave} disabled={allocatedMistakes !== incorrectCount} className="flex-[2] py-3 rounded-xl bg-emerald-600 text-white font-bold uppercase text-xs tracking-wider hover:bg-emerald-500 disabled:opacity-50 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all">Save Progress</button></div>
               )}
            </div>
        )}
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
  userName,
  onOpenPrivacy,
  subjects,
  syllabus
}: DashboardProps) => {
  const todayStr = getLocalDate();
  const todaysSessions = useMemo(() => sessions.filter(s => getLocalDateFromTimestamp(s.timestamp) === todayStr), [sessions, todayStr]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const scrollPosRef = useRef(0);

  const { greeting, displayName } = useMemo(() => {
    const hour = new Date().getHours();
    let greetingText = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
    const name = userName ? `, ${userName.split(' ')[0]}` : '';
    return { greeting: greetingText, displayName: name };
  }, [userName]);
  
  const stats = useMemo(() => {
    const subjectCounts: Record<string, number> = subjects.reduce((acc, sub) => ({...acc, [sub]: 0}), {});
    todaysSessions.forEach(s => {
        if (subjectCounts[s.subject] !== undefined) {
            subjectCounts[s.subject] += s.attempted;
        }
    });
    return subjectCounts;
  }, [todaysSessions, subjects]);

  const pendingTargets = useMemo(() => targets.filter(t => t.date === todayStr && !t.completed).slice(0, 3), [targets, todayStr]);
  
  const handleGoalChange = useCallback((subject: string, value: number) => {
      setGoals(g => ({ ...g, [subject]: value }));
  }, [setGoals]);

  const handleOpenSubject = useCallback((subject: string) => {
      scrollPosRef.current = window.scrollY;
      logAnalyticsEvent('dashboard_subject_open', { subject });
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
          const element = document.getElementById('dashboard-subjects');
          if (element) {
              const rect = element.getBoundingClientRect();
              const absoluteElementTop = rect.top + window.scrollY;
              const elementCenter = absoluteElementTop + (rect.height / 2);
              const viewportCenter = window.innerHeight / 2;
              const offset = 60;
              const targetScroll = elementCenter - viewportCenter + offset;
              window.scrollTo({ top: targetScroll, behavior: 'smooth' });
          }
          setTimeout(() => { setSelectedSubject(subject); }, 400); 
      } else {
          setSelectedSubject(subject);
      }
  }, []);

  const handleCloseModal = useCallback(() => {
      setSelectedSubject(null);
      const isMobile = window.innerWidth < 768;
      if (isMobile) { setTimeout(() => { window.scrollTo({ top: scrollPosRef.current, behavior: 'smooth' }); }, 100); }
  }, []);

  return (
    <>
      <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-end gap-6">
          <div className="flex flex-col items-center md:items-start gap-3 order-2 md:order-1 w-full md:w-auto">
             <div className="group relative flex items-center gap-2 w-full justify-center md:justify-start">
                <span className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest">Last 7 Days</span>
                <Info size={12} className="text-slate-400 cursor-help" />
                <div className="absolute bottom-full mb-2 left-0 w-max max-w-[200px] p-2 bg-slate-800 text-white text-[10px] font-bold rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    Your session count for the last 7 days. Higher bars mean more sessions.
                    <div className="absolute top-full left-4 w-2 h-2 bg-slate-800 rotate-45" />
                </div>
             </div>
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
        
        {subjects.length === 0 ? (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl animate-in fade-in zoom-in duration-500">
                <div className="p-4 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-full mb-4">
                    <BookOpen size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Build Your Curriculum</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-6 text-sm">
                    Your study stream is currently empty. Add subjects in Settings to start tracking your progress.
                </p>
                <div className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                    Go to Settings <Settings size={12} className="inline"/> <ChevronRight size={10} /> Study Stream
                </div>
            </div>
        ) : (
            <div id="dashboard-subjects" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {subjects.map(subject => (
                <SubjectPod 
                    key={subject}
                    subject={subject}
                    icon={getIconForSubject(subject)}
                    count={stats[subject] || 0}
                    target={goals[subject] || 30}
                    onGoalChange={(val) => handleGoalChange(subject, val)}
                    themeColor={getSubjectColor(subject)}
                    onClick={() => handleOpenSubject(subject)}
                />
              ))}
            </div>
        )}

        {/* ... [Rest of the Dashboard: Up Next, Recent Activity, AdUnit] ... */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          <div className="space-y-6">
             <div className="bg-white/60 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-3xl p-5 md:p-8 relative overflow-hidden backdrop-blur-md h-full transform-gpu" style={{ transform: 'translate3d(0,0,0)', backgroundColor: 'rgba(var(--theme-card-rgb), 0.4)' }}>
                <div className="flex justify-between items-center mb-6">
                  <div className="group relative flex items-center gap-2">
                    <h3 className="text-xs md:text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2"><CalendarClock size={16} className="text-indigo-500 dark:text-indigo-400" /> Up Next</h3>
                    <Info size={12} className="text-slate-400 cursor-help" />
                    <div className="absolute bottom-full mb-2 left-0 w-max max-w-[200px] p-2 bg-slate-800 text-white text-[10px] font-bold rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        Your top 3 unfinished tasks scheduled for today.
                        <div className="absolute top-full left-4 w-2 h-2 bg-slate-800 rotate-45" />
                    </div>
                  </div>
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
                  <div className="py-12 text-center opacity-40"><CheckCircle2 size={32} className="mx-auto mb-3 text-emerald-500 dark:text-emerald-400" /><p className="text-xs uppercase font-bold tracking-widest text-slate-900 dark:text-white">All caught up for today</p></div>
                )}
             </div>
          </div>
          <div>
             <div className="bg-white/60 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-3xl p-5 md:p-8 backdrop-blur-md h-full transform-gpu" style={{ transform: 'translate3d(0,0,0)', backgroundColor: 'rgba(var(--theme-card-rgb), 0.4)' }}>
                <div className="flex justify-between items-center mb-6">
                  <div className="group relative flex items-center gap-2">
                    <h3 className="text-xs md:text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2"><Activity size={16} className="text-indigo-500 dark:text-indigo-400" /> Recent Activity</h3>
                    <Info size={12} className="text-slate-400 cursor-help" />
                     <div className="absolute bottom-full mb-2 left-0 w-max max-w-[200px] p-2 bg-slate-800 text-white text-[10px] font-bold rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        A log of your most recent practice and focus sessions from today.
                        <div className="absolute top-full left-4 w-2 h-2 bg-slate-800 rotate-45" />
                    </div>
                  </div>
                </div>
                <div className="space-y-3 max-h-[400px] overflow-y-auto no-scrollbar mask-gradient-bottom">
                  {todaysSessions.length === 0 ? (
                    <div className="text-center py-12 opacity-30 border border-dashed border-slate-300 dark:border-white/10 rounded-2xl"><p className="text-xs uppercase font-bold tracking-widest text-slate-500 dark:text-white">No activity yet</p></div>
                  ) : (
                    todaysSessions.slice(0, 5).map((s, idx) => {
                      const isFocusSession = s.topic === 'Focus Session' || (s.duration && s.attempted === 0);
                      const sColor = getSubjectColor(s.subject);
                      return (
                      <div key={s.id} className="bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 p-4 rounded-2xl flex justify-between items-center group hover:bg-white dark:hover:bg-white/5 transition-colors active:scale-95">
                        <div className="flex items-center gap-4 overflow-hidden">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full shadow-[0_0_8px_currentColor] shrink-0 ${isFocusSession ? 'text-indigo-500 bg-indigo-100 dark:bg-indigo-500/20' : `text-${sColor}-500 bg-${sColor}-100 dark:bg-${sColor}-500/20`}`}>
                             {isFocusSession ? <Timer size={14} /> : <div className="w-2.5 h-2.5 rounded-full bg-current" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{isFocusSession ? 'Focus Session' : s.topic}</p>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-0.5">{isFocusSession ? (s.duration ? formatDurationSimple(s.duration) : '0m') : `${s.attempted} Qs`}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          {isFocusSession ? (
                              <div className="flex items-center gap-1 text-indigo-500 dark:text-indigo-400 opacity-80"><Clock size={12} /><span className="text-[10px] font-bold uppercase tracking-wider">{s.duration ? formatDurationSimple(s.duration) : '0m'}</span></div>
                          ) : (
                              <span className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-300">{s.attempted > 0 ? Math.round((s.correct / s.attempted) * 100) : 0}%</span>
                          )}
                          <button onClick={() => onDelete(s.id)} className="opacity-0 group-hover:opacity-100 text-rose-500 hover:bg-rose-500/10 p-2 rounded-lg transition-all"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    )})
                  )}
                </div>
             </div>
          </div>
        </div>
      </div>
      
      <AdUnit client="ca-pub-YOUR_PUBLISHER_ID_HERE" slot="1234567890" label="Sponsored" />

      {selectedSubject && (
        <SubjectDetailModal 
          subject={selectedSubject}
          sessions={sessions.filter(s => s.subject === selectedSubject)}
          onClose={handleCloseModal}
          onSaveSession={onSaveSession}
          onDeleteSession={(id) => onDelete(id)}
          syllabus={syllabus}
        />
      )}
    </>
  );
});