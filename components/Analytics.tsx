
import React, { useMemo, useState, memo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Target, Trophy, Brain, TrendingUp, Zap, Atom, Calculator, Grid, Lock, Crown,
  X, CheckCircle2, AlertCircle, Clock, PieChart, Activity, Calendar, Dna
} from 'lucide-react';
import { Session, TestResult, MistakeCounts, StreamType } from '../types';
import { Card } from './Card';
import { MISTAKE_TYPES, JEE_SYLLABUS, STREAM_SUBJECTS } from '../constants';
import { AdUnit } from './AdUnit';

interface AnalyticsProps {
  sessions: Session[];
  tests: TestResult[];
  isPro: boolean;
  onOpenUpgrade: () => void;
  stream?: StreamType;
}

// --- Topic Detail Modal ---
const TopicDetailModal = ({ 
    subject, 
    topic, 
    sessions, 
    onClose 
}: { 
    subject: string, 
    topic: string, 
    sessions: Session[], 
    onClose: () => void 
}) => {
    const stats = useMemo(() => {
        let attempted = 0;
        let correct = 0;
        const mistakes: Record<string, number> = {};
        
        sessions.forEach(s => {
            attempted += (Number(s.attempted) || 0);
            correct += (Number(s.correct) || 0);
            Object.entries(s.mistakes).forEach(([k, v]) => {
                mistakes[k] = (mistakes[k] || 0) + (Number(v) || 0);
            });
        });

        const accuracy = attempted > 0 ? (correct / attempted) * 100 : 0;
        const masteryScore = Math.min(100, Math.round((accuracy * 0.7) + (Math.min(attempted, 50) * 0.6))); // Heuristic score

        return { attempted, correct, accuracy, mistakes, masteryScore };
    }, [sessions]);

    const mistakeList = (Object.entries(stats.mistakes) as [string, number][])
        .sort((a, b) => b[1] - a[1])
        .filter(([_, count]) => count > 0);

    const subjectColor = subject === 'Physics' ? 'text-blue-500' : subject === 'Chemistry' ? 'text-orange-500' : subject === 'Maths' ? 'text-rose-500' : 'text-emerald-500';
    const subjectBg = subject === 'Physics' ? 'bg-blue-500' : subject === 'Chemistry' ? 'bg-orange-500' : subject === 'Maths' ? 'bg-rose-500' : 'bg-emerald-500';

    return createPortal(
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#0f172a] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-white/10">
                {/* Header */}
                <div className="relative p-6 bg-slate-900 overflow-hidden shrink-0">
                    <div className="absolute inset-0 opacity-20">
                        <div className={`absolute top-0 right-0 w-32 h-32 ${subjectBg} rounded-full blur-[50px] translate-x-1/2 -translate-y-1/2`} />
                    </div>
                    
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/10 w-fit backdrop-blur-md border border-white/10">
                                {subject === 'Physics' && <Atom size={12} className="text-blue-400" />}
                                {subject === 'Chemistry' && <Zap size={12} className="text-orange-400" />}
                                {subject === 'Maths' && <Calculator size={12} className="text-rose-400" />}
                                {subject === 'Biology' && <Dna size={12} className="text-emerald-400" />}
                                <span className="text-[10px] font-bold uppercase tracking-widest text-white">{subject}</span>
                            </div>
                            <button onClick={onClose} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                        <h2 className="text-xl font-bold text-white leading-tight mb-1">{topic}</h2>
                        <p className="text-xs text-slate-400 font-medium">{sessions.length} Sessions Logged</p>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto bg-slate-50 dark:bg-[#0f172a]">
                    
                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 shadow-sm relative overflow-hidden">
                            <div className="relative z-10">
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Accuracy</p>
                                <p className={`text-3xl font-display font-bold ${stats.accuracy >= 80 ? 'text-emerald-500' : stats.accuracy >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                                    {Math.round(stats.accuracy)}%
                                </p>
                            </div>
                            {/* Simple Circular Progress BG */}
                            <svg className="absolute right-[-10px] bottom-[-10px] w-20 h-20 opacity-10" viewBox="0 0 36 36">
                                <path className="text-current" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray={`${stats.accuracy}, 100`} />
                            </svg>
                        </div>
                        <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 shadow-sm">
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Solved</p>
                            <p className="text-3xl font-display font-bold text-slate-900 dark:text-white">
                                {stats.attempted}
                            </p>
                        </div>
                    </div>

                    {/* Performance Bar */}
                    <div className="mb-6">
                        <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500 mb-2 tracking-wider">
                            <span>Correct</span>
                            <span>Wrong</span>
                        </div>
                        <div className="h-3 w-full bg-rose-500/20 rounded-full overflow-hidden flex">
                            <div 
                                className="h-full bg-emerald-500" 
                                style={{ width: `${stats.accuracy}%`, transition: 'width 1s ease-out' }} 
                            />
                        </div>
                        <div className="flex justify-between text-xs font-mono font-bold mt-1.5">
                            <span className="text-emerald-600 dark:text-emerald-400">{stats.correct}</span>
                            <span className="text-rose-500">{stats.attempted - stats.correct}</span>
                        </div>
                    </div>

                    {/* Mistakes Analysis */}
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
                            <Brain size={14} /> Mistake DNA
                        </h4>
                        
                        {mistakeList.length > 0 ? (
                            <div className="space-y-3">
                                {mistakeList.map(([typeId, count]) => {
                                    const typeInfo = MISTAKE_TYPES.find(m => m.id === typeId);
                                    const pct = (count / (stats.attempted - stats.correct)) * 100; // % of total errors
                                    
                                    return (
                                        <div key={typeId} className="flex items-center gap-3">
                                            <div className={`p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 ${typeInfo?.color}`}>
                                                {typeInfo?.icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{typeInfo?.label}</span>
                                                    <span className="text-[10px] font-mono text-slate-500">{count}</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full ${typeInfo?.color.replace('text', 'bg')}`} 
                                                        style={{ width: `${Math.min(100, pct)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-4 border border-dashed border-slate-300 dark:border-white/10 rounded-xl text-center">
                                <p className="text-xs text-slate-500 italic">No specific mistakes logged yet.</p>
                            </div>
                        )}
                    </div>

                    {/* Recent Sessions List */}
                    <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/5">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
                            <Calendar size={14} /> Recent Activity
                        </h4>
                        <div className="space-y-2">
                            {sessions.slice(0, 3).map((s, i) => (
                                <div key={s.id || i} className="flex justify-between items-center text-xs p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                                    <span className="text-slate-600 dark:text-slate-400 font-mono">{new Date(s.timestamp).toLocaleDateString()}</span>
                                    <div className="flex gap-3">
                                        <span className="font-bold text-slate-900 dark:text-white">{s.correct}/{s.attempted}</span>
                                        <span className={`${s.correct/s.attempted >= 0.8 ? 'text-emerald-500' : 'text-amber-500'} font-bold`}>
                                            {Math.round((s.correct/s.attempted)*100)}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>,
        document.body
    );
};

const SubjectProficiency = memo(({ sessions, stream }: { sessions: Session[], stream: StreamType }) => {
  const subjects = useMemo(() => [
    { id: 'Physics', icon: Atom, color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-500 dark:bg-blue-400' },
    { id: 'Chemistry', icon: Zap, color: 'text-orange-500 dark:text-orange-400', bg: 'bg-orange-500 dark:bg-orange-400' },
    { id: 'Maths', icon: Calculator, color: 'text-rose-500 dark:text-rose-400', bg: 'bg-rose-500 dark:bg-rose-400' },
    { id: 'Biology', icon: Dna, color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-500 dark:bg-emerald-400' }
  ].filter(s => STREAM_SUBJECTS[stream].includes(s.id as any)), [stream]);

  const stats = useMemo(() => {
      const acc = {
          Physics: { attempted: 0, correct: 0 },
          Chemistry: { attempted: 0, correct: 0 },
          Maths: { attempted: 0, correct: 0 },
          Biology: { attempted: 0, correct: 0 }
      };
      
      sessions.forEach(s => {
          const sub = s.subject as keyof typeof acc;
          if (acc[sub]) {
              acc[sub].attempted += (Number(s.attempted) || 0);
              acc[sub].correct += (Number(s.correct) || 0);
          }
      });
      return acc;
  }, [sessions]);

  return (
    <div className="space-y-4">
      {subjects.map(sub => {
        const { attempted, correct } = stats[sub.id as keyof typeof stats];
        const rawAccuracy = attempted > 0 ? (correct / attempted) : 0;
        const accuracyPercent = Math.round(rawAccuracy * 100);
        const scaleVal = Number.isFinite(rawAccuracy) ? rawAccuracy : 0;
        
        return (
          <div key={sub.id} className="flex items-center gap-4 bg-slate-50 dark:bg-black/20 p-3 rounded-2xl border border-slate-200 dark:border-white/5">
             <div className={`p-2.5 rounded-xl bg-white dark:bg-white/5 ${sub.color}`}>
                <sub.icon size={18} />
             </div>
             <div className="flex-grow min-w-0">
               <div className="flex justify-between items-end mb-1.5">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{sub.id}</span>
                  <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">{accuracyPercent}%</span>
               </div>
               <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                 <div 
                    className={`h-full ${sub.bg} transition-transform duration-1000 origin-left will-change-transform`} 
                    style={{ width: '100%', transform: `scaleX(${scaleVal})` }} 
                 />
               </div>
               <div className="mt-1.5 text-[9px] text-slate-500 dark:text-slate-600 font-bold uppercase tracking-widest text-right">
                 {attempted} Questions
               </div>
             </div>
          </div>
        )
      })}
    </div>
  );
});

const SyllabusHeatmap = memo(({ sessions, isPro, onOpenUpgrade, stream }: { sessions: Session[], isPro: boolean, onOpenUpgrade: () => void, stream: StreamType }) => {
  const [selectedTopic, setSelectedTopic] = useState<{subject: string, topic: string} | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const topicStats = useMemo(() => {
    const stats: Record<string, { attempted: number, correct: number }> = {};
    sessions.forEach(s => {
        const key = `${s.subject}|${s.topic}`;
        if (!stats[key]) stats[key] = { attempted: 0, correct: 0 };
        stats[key].attempted += (Number(s.attempted) || 0);
        stats[key].correct += (Number(s.correct) || 0);
    });
    return stats;
  }, [sessions]);

  const handleTopicClick = (subject: string, topic: string, attempted: number) => {
      if (attempted > 0) {
          setSelectedTopic({ subject, topic });
      } else {
          setToastMessage(`Log activity in "${topic}" to view its report card.`);
          setTimeout(() => setToastMessage(null), 3000);
      }
  };

  const visibleSubjects = Object.entries(JEE_SYLLABUS).filter(([subject]) => STREAM_SUBJECTS[stream].includes(subject as any));

  return (
    <div className="mt-8 space-y-6 relative">
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
         <Grid size={14} /> Topic Mastery Heatmap
         {!isPro && <span className="bg-amber-500/10 text-amber-500 text-[9px] px-2 py-0.5 rounded border border-amber-500/20">PRO</span>}
      </h3>
      
      <div className={`grid grid-cols-1 gap-6 transition-all duration-300 ${!isPro ? 'preserve-filter blur-sm opacity-60 pointer-events-none select-none grayscale-[0.2]' : ''}`}>
         {visibleSubjects.map(([subject, topics]) => (
            <div key={subject} className="bg-white/60 dark:bg-slate-900/60 p-4 rounded-3xl border border-slate-200 dark:border-white/5">
                <div className="flex items-center gap-2 mb-4">
                    <span className={`w-2 h-2 rounded-full ${
                        subject === 'Physics' ? 'bg-blue-500' : subject === 'Chemistry' ? 'bg-orange-500' : subject === 'Maths' ? 'bg-rose-500' : 'bg-emerald-500'
                    }`} />
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">{subject}</h4>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {topics.map(topic => {
                        const stat = topicStats[`${subject}|${topic}`] || { attempted: 0, correct: 0 };
                        const { attempted, correct } = stat;
                        const accuracy = attempted > 0 ? (correct / attempted) : 0;
                        
                        let bgClass = "bg-slate-200 dark:bg-white/5 text-slate-400 dark:text-slate-600 hover:bg-slate-300 dark:hover:bg-white/10";
                        if (attempted > 0) {
                            if (attempted < 20 || accuracy < 0.3) {
                                bgClass = "bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500/30";
                            } else if (attempted < 50 || accuracy < 0.7) {
                                bgClass = "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/30";
                            } else {
                                bgClass = "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30";
                            }
                        }

                        return (
                            <button 
                              key={topic} 
                              onClick={() => handleTopicClick(subject, topic, attempted)}
                              className={`
                                h-8 px-3 rounded-lg flex items-center justify-center transition-all active:scale-95
                                ${bgClass} cursor-pointer shadow-sm
                              `}
                              title={`${topic}: ${attempted} Qs (${Math.round(accuracy * 100)}%)`}
                            >
                                <span className="text-[9px] font-bold uppercase truncate max-w-[100px]">{topic.split(' ').slice(0, 2).join(' ')}</span>
                            </button>
                        )
                    })}
                </div>
            </div>
         ))}
      </div>

      {/* Paywall Overlay */}
      {!isPro && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
              <div className="p-6 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl flex flex-col items-center text-center max-w-xs animate-in fade-in duration-300">
                  <div className="p-3 bg-amber-500/20 rounded-2xl mb-4 text-amber-500">
                      <Lock size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Advanced Analytics</h3>
                  <p className="text-xs text-slate-400 mb-6">See exactly which chapters need work with the Topic Heatmap.</p>
                  <button 
                    onClick={onOpenUpgrade}
                    className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-amber-500/20 active:scale-95"
                  >
                      <Crown size={14} /> Unlock Pro
                  </button>
              </div>
          </div>
      )}

      {/* Toast Notification for Empty Topics */}
      {toastMessage && createPortal(
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-bottom-5 fade-in duration-300">
              <div className="bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-white/10 flex items-center gap-3 backdrop-blur-xl">
                  <div className="p-1 bg-amber-500/20 rounded-full">
                      <AlertCircle size={16} className="text-amber-500" />
                  </div>
                  <span className="text-xs font-bold">{toastMessage}</span>
              </div>
          </div>,
          document.body
      )}

      {/* Detail Modal */}
      {selectedTopic && (
          <TopicDetailModal 
              subject={selectedTopic.subject}
              topic={selectedTopic.topic}
              sessions={sessions.filter(s => s.subject === selectedTopic.subject && s.topic === selectedTopic.topic)}
              onClose={() => setSelectedTopic(null)}
          />
      )}
    </div>
  )
});

export const Analytics: React.FC<AnalyticsProps> = memo(({ sessions, tests, isPro, onOpenUpgrade, stream = 'JEE' }) => {
  const stats = useMemo(() => {
    const totalAttempted = sessions.reduce((acc, s) => acc + (Number(s.attempted) || 0), 0);
    const totalCorrect = sessions.reduce((acc, s) => acc + (Number(s.correct) || 0), 0);
    const avgAccuracy = totalAttempted > 0 ? (totalCorrect / totalAttempted) * 100 : 0;

    const mistakeDistribution: Record<string, number> = {};
    sessions.forEach(s => {
        Object.entries(s.mistakes).forEach(([key, val]) => {
            mistakeDistribution[key] = (mistakeDistribution[key] || 0) + (Number(val) || 0);
        });
    });

    const totalMistakes = Object.values(mistakeDistribution).reduce((a: number, b: number) => a + b, 0);

    return { totalAttempted, totalCorrect, avgAccuracy, mistakeDistribution, totalMistakes };
  }, [sessions]);


  return (
    <div id="analytics-container" className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="relative overflow-hidden group" delay={0.1}>
           <div className="absolute right-0 top-0 p-3 opacity-20 dark:opacity-5 group-hover:opacity-30 dark:group-hover:opacity-10 transition-opacity">
              <TrendingUp size={80} className="text-indigo-200 dark:text-white" />
           </div>
           <div className="flex flex-col relative z-10">
              <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-300 tracking-widest mb-1">Accuracy</span>
              <div className="flex items-baseline gap-2">
                 <span className="text-4xl font-mono font-light text-slate-900 dark:text-white">{Math.round(stats.avgAccuracy)}%</span>
                 {stats.avgAccuracy > 75 && <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase">Good</span>}
              </div>
           </div>
        </Card>

        <Card className="relative overflow-hidden group" delay={0.2}>
           <div className="absolute right-0 top-0 p-3 opacity-20 dark:opacity-5 group-hover:opacity-30 dark:group-hover:opacity-10 transition-opacity">
              <Target size={80} className="text-emerald-200 dark:text-white" />
           </div>
           <div className="flex flex-col relative z-10">
              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-300 tracking-widest mb-1">Solved</span>
              <div className="flex items-baseline gap-2">
                 <span className="text-4xl font-mono font-light text-slate-900 dark:text-white">{stats.totalAttempted}</span>
                 <span className="text-xs text-slate-500 font-bold uppercase">Qs</span>
              </div>
           </div>
        </Card>

        <Card className="relative overflow-hidden group" delay={0.3}>
           <div className="absolute right-0 top-0 p-3 opacity-20 dark:opacity-5 group-hover:opacity-30 dark:group-hover:opacity-10 transition-opacity">
              <Trophy size={80} className="text-amber-200 dark:text-white" />
           </div>
           <div className="flex flex-col relative z-10">
              <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-300 tracking-widest mb-1">Tests</span>
              <div className="flex items-baseline gap-2">
                 <span className="text-4xl font-mono font-light text-slate-900 dark:text-white">{tests.length}</span>
                 <span className="text-xs text-slate-500 font-bold uppercase">Taken</span>
              </div>
           </div>
        </Card>
      </div>

      <div className="animate-in fade-in duration-500 space-y-6 md:space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                {/* Subject Breakdown */}
                <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Subject Proficiency</h3>
                    <SubjectProficiency sessions={sessions} stream={stream} />
                </div>

                {/* Error Distribution */}
                <div>
                    <Card className="bg-white/60 dark:bg-slate-900/60 p-6 h-full">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-rose-500 dark:text-rose-400 mb-6 flex items-center gap-2">
                        <Brain size={16} /> Error Analysis
                    </h3>
                    <div className="space-y-5">
                        {MISTAKE_TYPES.map(type => {
                        const count = stats.mistakeDistribution[type.id] || 0;
                        const totalMistakes = stats.totalMistakes;
                        const percent = totalMistakes > 0 ? (count / totalMistakes) : 0;
                        
                        if (totalMistakes > 0 && count === 0) return null;

                        const scaleVal = Math.max(Number.isFinite(percent) ? percent : 0, totalMistakes > 0 ? 0.05 : 0);

                        return (
                            <div key={type.id} className="group">
                            <div className="flex justify-between items-end mb-2">
                                <div className="flex items-center gap-2">
                                <span className={`${type.color.replace('text-','text-').replace('-400','-500 dark:text-' + type.color.split('-')[1] + '-400')} opacity-80 group-hover:opacity-100 transition-opacity`}>{type.icon}</span>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">{type.label}</span>
                                </div>
                                <span className="text-[10px] font-mono text-slate-500">{count}</span>
                            </div>
                            <div className="h-2 w-full bg-slate-200 dark:bg-black/40 rounded-full overflow-hidden">
                                <div 
                                className={`h-full ${type.color.replace('text', 'bg').replace('-400', '-500 dark:bg-' + type.color.split('-')[1] + '-400')} transition-transform duration-1000 ease-out origin-left will-change-transform`}
                                style={{ width: '100%', transform: `scaleX(${scaleVal})` }}
                                />
                            </div>
                            </div>
                        );
                        })}
                        {Object.keys(stats.mistakeDistribution).length === 0 && (
                        <div className="text-center py-10 opacity-30">
                            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-900 dark:text-white">No mistakes recorded</p>
                        </div>
                        )}
                    </div>
                    </Card>
                </div>
            </div>
            
            {/* Syllabus Heatmap Section - Locked if not Pro */}
            <SyllabusHeatmap sessions={sessions} isPro={isPro} onOpenUpgrade={onOpenUpgrade} stream={stream} />

            <AdUnit 
                client="ca-pub-YOUR_PUBLISHER_ID_HERE" 
                slot="1234567890" 
                label="Sponsored"
            />
      </div>
    </div>
  );
});
