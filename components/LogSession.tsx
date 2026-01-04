
import React, { useState } from 'react';
import { X, ChevronRight, Brain, Info } from 'lucide-react';
import { JEE_SYLLABUS, MISTAKE_TYPES } from '../constants';
import { Session, MistakeCounts } from '../types';
import { Card } from './Card';

interface LogSessionProps {
  onSave: (session: Omit<Session, 'id' | 'timestamp'>) => void;
  onCancel: () => void;
}

export const LogSession: React.FC<LogSessionProps> = ({ onSave, onCancel }) => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({ 
    subject: 'Physics' as keyof typeof JEE_SYLLABUS, 
    topic: '', 
    attempted: 0, 
    correct: 0, 
    mistakes: {} as MistakeCounts 
  });

  const incorrectCount = data.attempted - data.correct;
  const allocatedMistakes = (Object.values(data.mistakes) as (number | undefined)[]).reduce<number>((acc, curr) => acc + (curr || 0), 0);

  const handleNext = () => {
    if (incorrectCount > 0) setStep(2);
    else handleComplete();
  };

  const handleComplete = () => {
    onSave(data);
  };

  const updateMistake = (type: keyof MistakeCounts, val: number) => {
    const current = data.mistakes[type] || 0;
    const next = Math.max(0, current + val);
    
    if (val > 0 && allocatedMistakes >= incorrectCount) return;

    setData({
      ...data,
      mistakes: { ...data.mistakes, [type]: next }
    });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className="flex justify-between items-center mb-6 md:mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Log Session</h2>
        <button 
          onClick={onCancel} 
          className="text-xs font-bold text-slate-500 hover:text-white px-4 py-2 bg-white/5 rounded-xl transition-colors uppercase tracking-widest"
        >
          Cancel
        </button>
      </div>
      
      <Card className="min-h-[400px] md:min-h-[500px] flex flex-col justify-center">
        {step === 1 ? (
          <div className="space-y-6 md:space-y-8 animate-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-indigo-400 ml-1 tracking-widest">Subject</label>
                <select 
                  className="w-full bg-slate-900 border border-white/10 p-3 md:p-4 rounded-2xl text-white outline-none focus:border-indigo-500 transition-all appearance-none"
                  value={data.subject}
                  onChange={e => setData({...data, subject: e.target.value as any, topic: ''})}
                >
                  {Object.keys(JEE_SYLLABUS).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-indigo-400 ml-1 tracking-widest">Chapter</label>
                <select 
                  className="w-full bg-slate-900 border border-white/10 p-3 md:p-4 rounded-2xl text-white outline-none focus:border-indigo-500 transition-all appearance-none"
                  value={data.topic}
                  onChange={e => setData({...data, topic: e.target.value})}
                >
                  <option value="">Select Topic...</option>
                  {JEE_SYLLABUS[data.subject].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-indigo-400 ml-1 tracking-widest">Attempted</label>
                <input 
                  type="number" min="0"
                  className="w-full bg-black/20 border border-white/10 p-3 md:p-4 rounded-2xl text-white focus:border-indigo-500 outline-none transition-all font-mono text-xl"
                  value={data.attempted || ''}
                  onChange={e => setData({...data, attempted: Math.max(0, parseInt(e.target.value) || 0)})} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-indigo-400 ml-1 tracking-widest">Correct</label>
                <input 
                  type="number" min="0" max={data.attempted}
                  className="w-full bg-black/20 border border-white/10 p-3 md:p-4 rounded-2xl text-white focus:border-indigo-500 outline-none transition-all font-mono text-xl"
                  value={data.correct || ''}
                  onChange={e => setData({...data, correct: Math.min(data.attempted, Math.max(0, parseInt(e.target.value) || 0))})} 
                />
              </div>
            </div>

            <button 
              disabled={!data.topic || data.attempted < 1} 
              onClick={handleNext}
              className="w-full py-4 md:py-5 rounded-2xl font-bold uppercase disabled:opacity-30 transition-all shadow-lg active:scale-95 tracking-[0.2em]"
              style={{
                  backgroundColor: 'var(--theme-accent)',
                  color: 'var(--theme-on-accent)',
                  boxShadow: '0 10px 15px -3px rgba(var(--theme-accent-rgb), 0.2)'
              }}
            >
              Analyze Mistakes <ChevronRight size={18} className="inline ml-1" />
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
            <div className="p-4 md:p-6 bg-gradient-to-r from-rose-500/10 to-transparent border border-rose-500/20 rounded-2xl flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-rose-500/20 rounded-xl text-rose-400"><Brain size={24} /></div>
                <div>
                  <span className="text-sm text-rose-200/80 uppercase font-bold block tracking-wider">Mistake Analysis</span>
                  <span className="text-[10px] text-rose-500/50 font-bold uppercase">Categorize {incorrectCount} Errors</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-3xl md:text-4xl font-mono text-rose-400">{incorrectCount - allocatedMistakes}</span>
                <p className="text-[9px] uppercase text-rose-500/50 font-bold">Unmapped</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {MISTAKE_TYPES.map(type => (
                <div key={type.id} className="flex items-center justify-between p-3 md:p-4 bg-white/[0.03] rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                  <div className="flex items-center gap-3">
                    <span className={type.color}>{type.icon}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider text-slate-300`}>{type.label}</span>
                  </div>
                  <div className="flex items-center gap-3 bg-black/40 rounded-xl p-1">
                    <button 
                      onClick={() => updateMistake(type.id as keyof MistakeCounts, -1)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-colors"
                    > - </button>
                    <span className="w-4 text-center font-mono text-white text-sm">{data.mistakes[type.id as keyof MistakeCounts] || 0}</span>
                    <button 
                      onClick={() => updateMistake(type.id as keyof MistakeCounts, 1)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-colors"
                    > + </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
               <button 
                onClick={() => setStep(1)}
                className="w-1/3 bg-white/5 hover:bg-white/10 py-4 md:py-5 rounded-2xl text-slate-400 font-bold uppercase tracking-widest transition-all"
               >
                Back
               </button>
               <button 
                disabled={allocatedMistakes !== incorrectCount} 
                onClick={handleComplete}
                className="w-2/3 bg-emerald-600 hover:bg-emerald-500 py-4 md:py-5 rounded-2xl text-white font-bold uppercase transition-all shadow-lg shadow-emerald-600/20 tracking-widest disabled:opacity-30"
               >
                Finalize Log
               </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
