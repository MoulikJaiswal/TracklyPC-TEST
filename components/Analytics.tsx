
import React, { useMemo, useState, memo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Target, Trophy, Brain, TrendingUp, Zap, Atom, Calculator, Grid, Lock, Crown,
  X, CheckCircle2, AlertCircle, Clock, PieChart, Activity, Calendar, Dna, BookOpen, Globe, Landmark, Feather
} from 'lucide-react';
import { Session, TestResult, MistakeCounts, StreamType, SyllabusData } from '../types';
import { Card } from './Card';
import { MISTAKE_TYPES, ALL_SYLLABUS, STREAM_SUBJECTS } from '../constants';
import { AdUnit } from './AdUnit';

interface AnalyticsProps {
  sessions: Session[];
  tests: TestResult[];
  isPro: boolean;
  onOpenUpgrade: () => void;
  stream: StreamType;
  syllabus: SyllabusData;
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
        const masteryScore = Math.min(100, Math.round((accuracy * 0.7) + (Math.min(attempted, 50) * 0.6))); 

        return { attempted, correct, accuracy, mistakes, masteryScore };
    }, [sessions]);

    const mistakeList = (Object.entries(stats.mistakes) as [string, number][])
        .sort((a, b) => b[1] - a[1])
        .filter(([_, count]) => count > 0);

    // Helper for subject color hashing
    const getSubjectStyle = (sub: string) => {
        if (sub === 'Physics') return { text: 'text-blue-500', bg: 'bg-blue-500' };
        if (sub === 'Chemistry') return { text: 'text-orange-500', bg: 'bg-orange-500' };
        if (sub === 'Maths') return { text: 'text-rose-500', bg: 'bg-rose-500' };
        if (sub === 'Biology') return { text: 'text-emerald-500', bg: 'bg-emerald-500' };
        if (sub === 'English') return { text: 'text-violet-500', bg: 'bg-violet-500' };
        if (sub === 'History') return { text: 'text-amber-500', bg: 'bg-amber-500' };
        if (sub === 'Geography') return { text: 'text-cyan-500', bg: 'bg-cyan-500' };
        
        const colors = [
            { text: 'text-indigo-500', bg: 'bg-indigo-500' },
            { text: 'text-purple-500', bg: 'bg-purple-500' },
            { text: 'text-pink-500', bg: 'bg-pink-500' },
        ];
        let hash = 0;
        for (let i = 0; i < sub.length; i++) hash = sub.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    const { text: subjectColor, bg: subjectBg } = getSubjectStyle(subject);

    return createPortal(
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#0f172a] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-white/10">
                <div className="relative p-6 bg-slate-900 overflow-hidden shrink-0">
                    <div className="absolute inset-0 opacity-20">
                        <div className={`absolute top-0 right-0 w-32 h-32 ${subjectBg} rounded-full blur-[50px] translate-x-1/2 -translate-y-1/2`} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/10 w-fit backdrop-blur-md border border-white/10">
                                <BookOpen size={12} className="text-white" />
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
                <div className="p-6 overflow-y-auto bg-slate-50 dark:bg-[#0f172a]">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 shadow-sm relative overflow-hidden">
                            <div className="relative z-10">
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Accuracy</p>
                                <p className={`text-3xl font-display font-bold ${stats.accuracy >= 80 ? 'text-emerald-500' : stats.accuracy >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                                    {Math.round(stats.accuracy)}%
                                </p>
                            </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 shadow-sm">
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Solved</p>
                            <p className="text-3xl font-display font-bold text-slate-900 dark:text-white">
                                {stats.attempted}
                            </p>
                        </div>
                    </div>
                    <div className="mb-6">
                        <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500 mb-2 tracking-wider">
                            <span>Correct</span>
                            <span>Wrong</span>
                        </div>
                        <div className="h-3 w-full bg-rose-500/20 rounded-full overflow-hidden flex">
                            <div className="h-full bg-emerald-500" style={{ width: `${stats.accuracy}%`, transition: 'width 1s ease-out' }} />
                        </div>
                        <div className="flex justify-between text-xs font-mono font-bold mt-1.5">
                            <span className="text-emerald-600 dark:text-emerald-400">{stats.correct}</span>
                            <span className="text-rose-500">{stats.attempted - stats.correct}</span>
                        </div>
                    </div>
                    {/* Mistakes */}
                    {mistakeList.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2"><Brain size={14} /> Mistake DNA</h4>
                            <div className="space-y-3">
                                {mistakeList.map(([typeId, count]) => {
                                    const typeInfo = MISTAKE_TYPES.find(m => m.id === typeId);
                                    const pct = (count / (stats.attempted - stats.correct)) * 100;
                                    return (
                                        <div key={typeId} className="flex items-center gap-3">
                                            <div className={`p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 ${typeInfo?.color}`}>{typeInfo?.icon}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{typeInfo?.label}</span>
                                                    <span className="text-[10px] font-mono text-slate-500">{count}</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                                                    <div className={`h-full ${typeInfo?.color.replace('text', 'bg')}`} style={{ width: `${Math.min(100, pct)}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

const SubjectProficiency = memo(({ sessions, stream, syllabus }: { sessions: Session[], stream: StreamType, syllabus: SyllabusData }) => {
  const subjectsList = useMemo(() => {
      // Prioritize syllabus keys for 'General' (Others) to support dynamic subjects
      if (stream === 'General') return Object.keys(syllabus);
      return STREAM_SUBJECTS[stream];
  }, [stream, syllabus]);

  const getSubjectInfo = (subject: string) => {
      // Standard Mapping
      if (subject === 'Physics') return { icon: Atom, color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-500 dark:bg-blue-400' };
      if (subject === 'Chemistry') return { icon: Zap, color: 'text-orange-500 dark:text-orange-400', bg: 'bg-orange-500 dark:bg-orange-400' };
      if (subject === 'Maths') return { icon: Calculator, color: 'text-rose-500 dark:text-rose-400', bg: 'bg-rose-500 dark:bg-rose-400' };
      if (subject === 'Biology') return { icon: Dna, color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-500 dark:bg-emerald-400' };
      if (subject === 'English') return { icon: Feather, color: 'text-violet-500 dark:text-violet-400', bg: 'bg-violet-500 dark:bg-violet-400' };
      if (subject === 'History') return { icon: Landmark, color: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-500 dark:bg-amber-400' };
      if (subject === 'Geography') return { icon: Globe, color: 'text-cyan-500 dark:text-cyan-400', bg: 'bg-cyan-500 dark:bg-cyan-400' };
      
      // Dynamic Hashing for unknown subjects
      const colors = [
          { color: 'text-indigo-500 dark:text-indigo-400', bg: 'bg-indigo-500 dark:bg-indigo-400' },
          { color: 'text-purple-500 dark:text-purple-400', bg: 'bg-purple-500 dark:bg-purple-400' },
          { color: 'text-pink-500 dark:text-pink-400', bg: 'bg-pink-500 dark:bg-pink-400' },
      ];
      let hash = 0;
      for (let i = 0; i < subject.length; i++) hash = subject.charCodeAt(i) + ((hash << 5) - hash);
      const style = colors[Math.abs(hash) % colors.length];
      
      return { icon: BookOpen, ...style };
  };

  const stats = useMemo(() => {
      const acc: Record<string, { attempted: number, correct: number }> = {};
      subjectsList.forEach(sub => { acc[sub] = { attempted: 0, correct: 0 }; });
      
      sessions.forEach(s => {
          const sub = s.subject;
          // Ensure we count even if it wasn't in initial list (though list should cover it)
          if (!acc[sub]) acc[sub] = { attempted: 0, correct: 0 };
          acc[sub].attempted += (Number(s.attempted) || 0);
          acc[sub].correct += (Number(s.correct) || 0);
      });
      return acc;
  }, [sessions, subjectsList]);

  // Use keys from stats to ensure we show all relevant subjects found in sessions + syllabus
  const displaySubjects = Array.from(new Set([...subjectsList, ...Object.keys(stats)]));

  if (displaySubjects.length === 0) {
      return (
          <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-white/5 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
              <p className="text-xs font-bold uppercase tracking-widest">No Data Available</p>
              <p className="text-[10px] mt-1 opacity-70">Add subjects to see proficiency stats</p>
          </div>
      );
  }

  return (
    <div className="space-y-4">
      {displaySubjects.map(sub => {
        const { attempted, correct } = stats[sub] || { attempted: 0, correct: 0 };
        const rawAccuracy = attempted > 0 ? (correct / attempted) : 0;
        const accuracyPercent = Math.round(rawAccuracy * 100);
        const scaleVal = Number.isFinite(rawAccuracy) ? rawAccuracy : 0;
        const { icon: Icon, color, bg } = getSubjectInfo(sub);
        
        return (
          <div key={sub} className="flex items-center gap-4 bg-slate-50 dark:bg-black/20 p-3 rounded-2xl border border-slate-200 dark:border-white/5">
             <div className={`p-2.5 rounded-xl bg-white dark:bg-white/5 ${color}`}>
                <Icon size={18} />
             </div>
             <div className="flex-grow min-w-0">
               <div className="flex justify-between items-end mb-1.5">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider truncate mr-2">{sub}</span>
                  <span className="text-xs font-mono font-bold text-slate-900 dark:text-white shrink-0">{accuracyPercent}%</span>
               </div>
               <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                 <div 
                    className={`h-full ${bg} transition-transform duration-1000 origin-left will-change-transform`} 
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

const SyllabusHeatmap = memo(({ sessions, isPro, onOpenUpgrade, stream, syllabus }: { sessions: Session[], isPro: boolean, onOpenUpgrade: () => void, stream: StreamType, syllabus: SyllabusData }) => {
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

  const visibleSubjects = Object.entries(syllabus);

  const getSubjectColor = (sub: string) => {
      if (sub === 'Physics') return 'bg-blue-500';
      if (sub === 'Chemistry') return 'bg-orange-500';
      if (sub === 'Maths') return 'bg-rose-500';
      if (sub === 'Biology') return 'bg-emerald-500';
      if (sub === 'English') return 'bg-violet-500';
      if (sub === 'History') return 'bg-amber-500';
      if (sub === 'Geography') return 'bg-cyan-500';
      
      const colors = ['bg-indigo-500', 'bg-purple-500', 'bg-pink-500'];
      let hash = 0;
      for (let i = 0; i < sub.length; i++) hash = sub.charCodeAt(i) + ((hash << 5) - hash);
      return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="mt-8 space-y-6 relative">
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
         <Grid size={14} /> Topic Mastery Heatmap
         {!isPro && <span className="bg-amber-500/10 text-amber-500 text-[9px] px-2 py-0.5 rounded border border-amber-500/20">PRO</span>}
      </h3>
      
      {visibleSubjects.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-white/5 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
              <p className="text-xs font-bold uppercase tracking-widest">Syllabus Empty</p>
              <p className="text-[10px] mt-1 opacity-70">Add subjects and topics in Settings to view the heatmap.</p>
          </div>
      ) : (
          <div className={`grid grid-cols-1 gap-6 transition-all duration-300 ${!isPro ? 'preserve-filter blur-sm opacity-60 pointer-events-none select-none grayscale-[0.2]' : ''}`}>
             {visibleSubjects.map(([subject, topics]) => (
                <div key={subject} className="bg-white/60 dark:bg-slate-900/60 p-4 rounded-3xl border border-slate-200 dark:border-white/5">
                    <div className="flex items-center gap-2 mb-4">
                        <span className={`w-2 h-2 rounded-full ${getSubjectColor(subject)}`} />
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
                                    bgClass = "bg-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/30 border-rose-500/10";
                                } else if (accuracy < 0.6) {
                                    bgClass = "bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/30 border-amber-500/10";
                                } else {
                                    bgClass = "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/30 border-emerald-500/10";
                                }
                            }

                            return (
                                <button 
                                    key={topic} 
                                    onClick={() => handleTopicClick(subject, topic, attempted)}
                                    className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors ${bgClass}`}
                                    title={`Solved: ${attempted} | Accuracy: ${Math.round(accuracy * 100)}%`}
                                >
                                    {topic}
                                </button>
                            )
                        })}
                    </div>
                </div>
             ))}
          </div>
      )}
      
      {!isPro && (
          <div 
              onClick={onOpenUpgrade}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/50 backdrop-blur-md rounded-3xl cursor-pointer group"
          >
              <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center shadow-2xl shadow-amber-500/30 mb-4 group-hover:scale-110 transition-transform">
                  <Lock size={32} className="text-white" />
              </div>
              <h4 className="text-xl font-bold text-white mb-1">Unlock Pro Analytics</h4>
              <p className="text-sm text-slate-300 mb-6">Gain full access to the Topic Heatmap and more.</p>
              <div className="flex items-center gap-2 px-5 py-3 bg-white text-slate-900 rounded-xl font-bold uppercase text-xs tracking-wider shadow-lg group-hover:bg-amber-400 transition-colors">
                  <Crown size={14} /> Upgrade Now
              </div>
          </div>
      )}

      {selectedTopic && (
          <TopicDetailModal 
              subject={selectedTopic.subject} 
              topic={selectedTopic.topic}
              sessions={sessions.filter(s => s.subject === selectedTopic.subject && s.topic === selectedTopic.topic)}
              onClose={() => setSelectedTopic(null)} 
          />
      )}

      {toastMessage && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[160] px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
              {toastMessage}
          </div>
      )}
    </div>
  );
});

export const Analytics: React.FC<AnalyticsProps> = memo(({ sessions, tests, isPro, onOpenUpgrade, stream, syllabus }: AnalyticsProps) => {
    return (
        <div id="analytics-container" className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
            <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Analytics</h2>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-1 font-bold">
                    Deep dive into your performance metrics
                </p>
            </div>
            
            <Card className="p-6 md:p-8">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                    <TrendingUp size={14} /> Subject Proficiency
                </h3>
                <SubjectProficiency sessions={sessions} stream={stream} syllabus={syllabus} />
            </Card>

            <SyllabusHeatmap 
                sessions={sessions} 
                isPro={isPro} 
                onOpenUpgrade={onOpenUpgrade} 
                stream={stream}
                syllabus={syllabus}
            />
            
            <AdUnit
                client="ca-pub-YOUR_PUBLISHER_ID_HERE"
                slot="1234567890"
                label="Sponsored"
            />
        </div>
    );
});
