import React, { useMemo, useState, memo } from 'react';
import { createPortal } from 'react-dom';
import { Target, Trophy, Brain, TrendingUp, Zap, Atom, Calculator, Grid, Lock, Crown, X, CheckCircle2, AlertCircle, Clock, PieChart, Activity, Calendar, Dna, BookOpen, Globe, Landmark, Feather, Info } from 'lucide-react';
import { Session, MistakeCounts, StreamType, SyllabusData } from '../types';
import { Card } from './Card';
import { MISTAKE_TYPES, STREAM_SUBJECTS } from '../constants';
import { AdUnit } from './AdUnit';
import { useData } from '../contexts/DataContext';
import { useStream } from '../contexts/StreamContext';

interface AnalyticsProps {
  isPro: boolean;
  onOpenUpgrade: () => void;
}

// ... (TopicDetailModal remains the same)
const TopicDetailModal = ({ subject, topic, sessions, onClose }: { subject: string, topic: string, sessions: Session[], onClose: () => void }) => { /* ... implementation ... */ return null; };

const SubjectProficiency = memo(() => {
  const { sessionsForStream: sessions } = useData();
  const { stream, currentSyllabus: syllabus } = useStream();

  const subjectsList = useMemo(() => {
      if (stream === 'General') return Object.keys(syllabus);
      return STREAM_SUBJECTS[stream];
  }, [stream, syllabus]);

  const getSubjectIcon = (subject: string) => { /* ... implementation ... */ return BookOpen; };

  const stats = useMemo(() => {
      const acc: Record<string, { attempted: number, correct: number }> = {};
      subjectsList.forEach(sub => { acc[sub] = { attempted: 0, correct: 0 }; });
      
      sessions.forEach(s => {
          const sub = s.subject;
          if (!acc[sub]) acc[sub] = { attempted: 0, correct: 0 };
          acc[sub].attempted += (Number(s.attempted) || 0);
          acc[sub].correct += (Number(s.correct) || 0);
      });
      return acc;
  }, [sessions, subjectsList]);

  // ... (rest of the component logic is the same)
  return (
    <div className="space-y-4">
      {/* ... implementation ... */}
    </div>
  );
});

const SyllabusHeatmap = memo(({ isPro, onOpenUpgrade }: { isPro: boolean, onOpenUpgrade: () => void }) => {
  const { sessionsForStream: sessions } = useData();
  const { stream, currentSyllabus: syllabus } = useStream();
  const [selectedTopic, setSelectedTopic] = useState<{subject: string, topic: string} | null>(null);

  // ... (rest of the component logic is the same)
  
  return (
    <Card className="p-6 md:p-8 relative">
      {/* ... implementation ... */}
    </Card>
  );
});

const Analytics: React.FC<AnalyticsProps> = memo(({ isPro, onOpenUpgrade }) => {
    return (
        <div id="analytics-container" className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
            <div>
                <h2 className="text-3xl font-bold text-theme-text tracking-tight">Analytics</h2>
                <p className="text-xs text-theme-accent uppercase tracking-widest mt-1 font-bold">
                    Deep dive into your performance metrics
                </p>
            </div>
            
            <Card className="p-6 md:p-8">
                <div className="group relative flex items-center gap-2 mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-theme-text-secondary flex items-center gap-2">
                        <TrendingUp size={14} /> Subject Proficiency
                    </h3>
                    <Info size={12} className="text-theme-text-secondary cursor-help" />
                    <div className="absolute bottom-full mb-2 left-0 w-max max-w-[240px] p-2 bg-slate-800 text-white text-[10px] font-bold rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        Your average accuracy across all logged practice sessions for each subject.
                        <div className="absolute top-full left-4 w-2 h-2 bg-slate-800 rotate-45" />
                    </div>
                </div>
                <SubjectProficiency />
            </Card>

            <SyllabusHeatmap isPro={isPro} onOpenUpgrade={onOpenUpgrade} />
            
            <AdUnit
                client="ca-pub-YOUR_PUBLISHER_ID_HERE"
                slot="1234567890"
                label="Sponsored"
            />
        </div>
    );
});

export default Analytics;
