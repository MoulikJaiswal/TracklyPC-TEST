
import React, { useState, useMemo, memo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Settings2, 
  X, 
  Zap, 
  Atom, 
  Calculator, 
  CheckCircle2, 
  ListTodo, 
  ChevronDown, 
  Brain, 
  Coffee, 
  Armchair, 
  Plus, 
  Timer as TimerIcon, 
  Clock, 
  Crown, 
  CloudRain, 
  Trees, 
  Music, 
  VolumeX, 
  Minus,
  Maximize2,
  Minimize2,
  History
} from 'lucide-react';
import { JEE_SYLLABUS, MISTAKE_TYPES } from '../constants';
import { Target, QuestionLog, Session } from '../types';

interface FocusTimerProps {
  targets?: Target[];
  mode: 'focus' | 'short' | 'long';
  timeLeft: number;
  isActive: boolean;
  durations: { focus: number; short: number; long: number };
  activeSound: 'off' | 'rain' | 'forest' | 'lofi' | 'cafe';
  sessionLogs: QuestionLog[];
  lastLogTime: number;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onSwitchMode: (mode: 'focus' | 'short' | 'long') => void;
  onSetSound: (type: 'off' | 'rain' | 'forest' | 'lofi' | 'cafe') => void;
  onUpdateDurations: (newDuration: number, mode: 'focus' | 'short' | 'long') => void;
  onAddLog: (log: QuestionLog, subject: string) => void;
  onCompleteSession: () => void;
  isPro: boolean;
  sessionCount: number;
  onOpenUpgrade: () => void;
  sessions: Session[];
}

const DurationControl = ({ 
    label, 
    value, 
    onChange, 
    min, 
    max, 
    step = 1,
    colorHex
}: { 
    label: string, 
    value: number, 
    onChange: (val: number) => void, 
    min: number, 
    max: number, 
    step?: number,
    colorHex: string
}) => {
    return (
        <div 
            className="p-4 rounded-2xl border"
            style={{
                backgroundColor: 'rgba(var(--theme-text-main), 0.03)',
                borderColor: 'rgba(var(--theme-text-main), 0.1)'
            }}
        >
            <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--theme-text-sub)' }}>{label}</span>
                <span className="text-sm font-mono font-bold" style={{ color: colorHex }}>{value}m</span>
            </div>
            <div className="flex items-center gap-3">
                <button 
                    onClick={(e) => { e.stopPropagation(); onChange(Math.max(min, value - step)); }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg shadow-sm border transition-all active:scale-95"
                    style={{
                        backgroundColor: 'var(--theme-card-bg)',
                        borderColor: 'rgba(var(--theme-text-main), 0.1)',
                        color: 'var(--theme-text-main)'
                    }}
                >
                    <Minus size={14} />
                </button>
                <div className="flex-1 relative h-6 flex items-center">
                    <input 
                        type="range" min={min} max={max} step={step}
                        value={value}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => onChange(parseFloat(e.target.value))}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                        style={{ 
                            accentColor: colorHex,
                            backgroundColor: 'rgba(var(--theme-text-main), 0.1)'
                        }}
                    />
                </div>
                <button 
                    onClick={(e) => { e.stopPropagation(); onChange(Math.min(max, value + step)); }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg shadow-sm border transition-all active:scale-95"
                    style={{
                        backgroundColor: 'var(--theme-card-bg)',
                        borderColor: 'rgba(var(--theme-text-main), 0.1)',
                        color: 'var(--theme-text-main)'
                    }}
                >
                    <Plus size={14} />
                </button>
            </div>
        </div>
    )
};

export const FocusTimer: React.FC<FocusTimerProps> = memo(({ 
    targets = [], 
    mode, 
    timeLeft, 
    isActive, 
    durations, 
    activeSound, 
    sessionLogs, 
    lastLogTime,
    onToggleTimer,
    onResetTimer,
    onSwitchMode,
    onSetSound,
    onUpdateDurations,
    onAddLog,
    onCompleteSession,
    isPro,
    sessionCount,
    onOpenUpgrade,
    sessions
}) => {
  const [selectedSubject, setSelectedSubject] = useState<keyof typeof JEE_SYLLABUS>('Physics');
  const [showSettings, setShowSettings] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string>('');
  const [zenMode, setZenMode] = useState(false);
  
  // --- Feature States ---
  const [showTagger, setShowTagger] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [currentQDuration, setCurrentQDuration] = useState(0); 
  
  // Automatically show report card when time runs out in Focus Mode
  useEffect(() => {
      if (mode === 'focus' && timeLeft === 0 && sessionLogs.length > 0 && !isActive) {
          setShowReport(true);
      }
  }, [timeLeft, mode, sessionLogs.length, isActive]);

  const handleModeSwitch = (newMode: 'focus' | 'short' | 'long') => {
      if (isActive && mode === 'focus' && newMode !== 'focus') {
          const confirmed = window.confirm("You are currently in a Focus Session. Are you sure you want to take a break?");
          if (!confirmed) return;
      }
      onSwitchMode(newMode);
  };

  const handlePlusOne = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (!isPro && sessionCount >= 3) {
          onOpenUpgrade();
          return;
      }
      const now = Date.now();
      const duration = Math.ceil((now - lastLogTime) / 1000);
      setCurrentQDuration(duration);
      setShowTagger(true);
  };

  const handleTagResult = (result: 'correct' | string) => {
      const now = Date.now();
      const newLog: QuestionLog = {
          timestamp: now,
          duration: currentQDuration,
          result: result as any,
          subject: selectedSubject
      };
      onAddLog(newLog, String(selectedSubject));
      setShowTagger(false);
  };

  const handleCloseTagger = () => {
      setShowTagger(false);
  };

  const handleOpenSettings = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setShowSettings(true);
  };

  const handleCloseSettings = () => {
      setShowSettings(false);
  };

  const handleSaveAndClose = () => {
      onCompleteSession();
      setShowReport(false);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0 
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Subject Configs
  const subjects = useMemo(() => [
    { id: 'Physics', icon: Atom, color: 'text-blue-500', bg: 'bg-blue-500', border: 'border-blue-500', gradient: 'from-blue-500 to-indigo-600', ring: 'ring-blue-500', shadow: 'shadow-blue-500/20' },
    { id: 'Chemistry', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500', border: 'border-amber-500', gradient: 'from-amber-500 to-orange-600', ring: 'ring-amber-500', shadow: 'shadow-amber-500/20' },
    { id: 'Maths', icon: Calculator, color: 'text-rose-500', bg: 'bg-rose-500', border: 'border-rose-500', gradient: 'from-rose-500 to-pink-600', ring: 'ring-rose-500', shadow: 'shadow-rose-500/20' },
  ], []);

  const currentSubject = subjects.find(s => s.id === selectedSubject)!;
  const pendingTasks = useMemo(() => targets.filter(t => !t.completed), [targets]);
  const activeTaskObj = useMemo(() => targets.find(t => t.id === selectedTask), [targets, selectedTask]);

  // Theme Logic
  const getTheme = () => {
    if (mode === 'focus') return currentSubject;
    if (mode === 'short') return { color: 'text-emerald-500', bg: 'bg-emerald-500', border: 'border-emerald-500', gradient: 'from-emerald-400 to-teal-500', ring: 'ring-emerald-500', shadow: 'shadow-emerald-500/20' };
    return { color: 'text-indigo-500', bg: 'bg-indigo-500', border: 'border-indigo-500', gradient: 'from-indigo-500 to-violet-600', ring: 'ring-indigo-500', shadow: 'shadow-indigo-500/20' };
  };
  const theme = getTheme();

  // Circle Math
  const radius = 160; 
  const circumference = 2 * Math.PI * radius;
  const progressPercentage = timeLeft / (durations[mode] * 60);
  const strokeDashoffset = Number.isFinite(progressPercentage) ? circumference * (1 - progressPercentage) : circumference;

  const SOUND_OPTIONS = [
      { id: 'rain', label: 'Rain', icon: CloudRain },
      { id: 'forest', label: 'Forest', icon: Trees },
      { id: 'cafe', label: 'Cafe', icon: Coffee },
      { id: 'lofi', label: 'Lo-fi', icon: Music },
      { id: 'off', label: 'Silent', icon: VolumeX },
  ];

  const modeSelector = (
      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/5 p-2 rounded-3xl shadow-sm">
          <div className="flex bg-slate-100 dark:bg-black/40 p-1.5 rounded-2xl">
              {[
                  { id: 'focus', label: 'Focus', icon: Brain },
                  { id: 'short', label: 'Short', icon: Coffee },
                  { id: 'long', label: 'Long', icon: Armchair }
              ].map((m) => (
                  <button
                      key={m.id}
                      onClick={() => handleModeSwitch(m.id as any)}
                      className={`
                          flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-300
                          ${mode === m.id 
                              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' 
                              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-white/5'
                          }
                      `}
                  >
                      <m.icon size={16} className={mode === m.id && mode === 'focus' ? theme.color : ''} />
                      <span>{m.label}</span>
                  </button>
              ))}
          </div>
      </div>
  );

  return (
    <div 
        id="focus-timer-container"
        className={`
        transition-all duration-700 ease-in-out w-full
        ${zenMode ? 'fixed inset-0 z-[100] bg-[#020617] text-white flex flex-col' : 'min-h-[80vh] flex flex-col md:grid md:grid-cols-12 gap-8 relative'}
    `}>
      
      {/* MOBILE ONLY: Mode Selector at the top */}
      {!zenMode && (
          <div className="md:hidden order-first w-full animate-in slide-in-from-top-4 duration-500">
              {modeSelector}
          </div>
      )}

      {/* --- LEFT / MAIN COLUMN (THE TIMER) --- */}
      <div className={`
          flex flex-col items-center justify-center relative transition-all duration-500
          ${zenMode ? 'flex-1 w-full scale-110' : 'md:col-span-7 lg:col-span-8 order-1'}
      `}>
          
          {/* Zen Mode Toggle (Desktop Overlay) */}
          {!zenMode && (
              <button 
                onClick={() => setZenMode(true)}
                className="absolute top-0 right-0 p-3 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors z-20 md:block hidden"
                title="Enter Zen Mode"
              >
                  <Maximize2 size={20} />
              </button>
          )}

          {/* Close Zen Mode Button */}
          {zenMode && (
              <button 
                onClick={() => setZenMode(false)}
                className="absolute top-6 right-6 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white/50 hover:text-white transition-all z-50 backdrop-blur-md"
              >
                  <Minimize2 size={24} />
              </button>
          )}

          {/* The Interactive Timer Visualization */}
          <div 
            onClick={onToggleTimer}
            className="relative w-[320px] h-[320px] md:w-[480px] md:h-[480px] flex items-center justify-center cursor-pointer group select-none"
          >
              {/* Pulse Effect */}
              <div className={`
                  absolute inset-0 rounded-full blur-[60px] opacity-20 transition-all duration-[4000ms] ease-in-out
                  ${isActive ? 'scale-110 opacity-30 animate-pulse-slow' : 'scale-100'} 
                  ${theme.bg}
              `} />
              
              <svg className="w-full h-full transform -rotate-90 relative z-10 drop-shadow-2xl overflow-visible">
                  {/* Track */}
                  <circle cx="50%" cy="50%" r={radius} className="stroke-slate-200 dark:stroke-white/5 fill-transparent" strokeWidth="4" />
                  {/* Progress */}
                  <circle 
                      cx="50%" cy="50%" r={radius} 
                      className={`fill-transparent transition-all duration-1000 ease-linear ${theme.color}`}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      style={{ filter: `drop-shadow(0 0 10px currentColor)` }}
                  />
                  {/* Knob (Optional, aesthetic) */}
                  {isActive && (
                      <circle 
                          cx="50%" cy="50%" r="6" 
                          className="fill-white"
                          style={{
                              transformOrigin: 'center',
                              transform: `rotate(${progressPercentage * 360}deg) translate(${radius}px)`,
                              transition: 'transform 1s linear'
                          }}
                      />
                  )}
              </svg>

              {/* Digital Time */}
              <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                  <div className={`text-7xl md:text-9xl font-display font-black tracking-tighter tabular-nums transition-colors duration-300 ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                      {formatTime(timeLeft)}
                  </div>
                  <div className={`flex items-center gap-2 mt-4 px-4 py-1.5 rounded-full border border-current transition-all duration-500 ${isActive ? theme.color + ' bg-opacity-10 bg-white dark:bg-white/5' : 'text-slate-400 border-transparent'}`}>
                      {isActive ? (
                          <>
                            <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                            <span className="text-xs md:text-sm font-bold uppercase tracking-[0.2em]">
                                {mode === 'focus' ? 'Deep Work' : 'Recharging'}
                            </span>
                          </>
                      ) : (
                          <span className="text-xs md:text-sm font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                              <Play size={12} fill="currentColor" /> Tap to Start
                          </span>
                      )}
                  </div>
              </div>

              {/* Settings Trigger (Beside Timer) */}
              <button 
                  onClick={handleOpenSettings}
                  className="absolute top-0 right-4 p-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-full text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 shadow-lg border border-slate-200 dark:border-white/10 transition-all z-30 hover:scale-110 active:scale-95"
                  title="Timer Configuration"
              >
                  <Settings2 size={18} />
              </button>
          </div>

          {/* Primary Action Button (Below Timer) */}
          <div className="mt-12 md:mt-16 flex flex-col items-center gap-6 relative z-30">
              {isActive ? (
                  <div className="flex flex-col items-center gap-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
                      {mode === 'focus' && (
                          <button
                              onClick={handlePlusOne}
                              className={`
                                  group relative flex items-center justify-center gap-4 px-10 py-5 rounded-[2rem]
                                  bg-gradient-to-r ${theme.gradient} shadow-2xl ${theme.shadow}
                                  transform transition-all duration-150 active:scale-95 hover:scale-[1.02] hover:-translate-y-1
                              `}
                          >
                              <div className="absolute inset-0 rounded-[2rem] bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
                              <Plus size={32} className="text-white" strokeWidth={3} />
                              <div className="text-left text-white">
                                  <span className="block text-xl font-bold leading-none uppercase tracking-wide">Log Solved</span>
                                  <span className="block text-[10px] font-bold opacity-80 uppercase tracking-widest mt-1">Capture Progress</span>
                              </div>
                          </button>
                      )}

                      <div className="flex items-center gap-6">
                          <button 
                              onClick={onToggleTimer}
                              className="flex items-center gap-2 px-8 py-3 rounded-full bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 text-slate-900 dark:text-white text-xs font-bold uppercase tracking-widest transition-all shadow-lg backdrop-blur-md"
                          >
                              <Pause size={16} fill="currentColor" /> Pause
                          </button>
                          <button 
                              onClick={onResetTimer}
                              className="p-3 rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/20 transition-all"
                              title="Reset Session"
                          >
                              <RotateCcw size={20} />
                          </button>
                      </div>
                  </div>
              ) : (
                  <button
                      onClick={onToggleTimer}
                      className={`
                          group relative w-24 h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center 
                          bg-gradient-to-br ${theme.gradient} text-white shadow-2xl ${theme.shadow}
                          transition-all duration-300 hover:scale-110 active:scale-95
                      `}
                  >
                      <Play size={40} fill="currentColor" className="ml-2 relative z-10" />
                      <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity animate-pulse" />
                  </button>
              )}
          </div>
      </div>

      {/* --- RIGHT COLUMN (HUD / CONTROLS) --- */}
      {!zenMode && (
          <div className="md:col-span-5 lg:col-span-4 order-2 flex flex-col gap-6 md:h-full md:overflow-y-auto no-scrollbar md:pr-2">
              
              {/* 1. Mode Selector Card (Desktop Only) */}
              <div className="hidden md:block">
                  {modeSelector}
              </div>

              {/* 2. Session Context Card */}
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/5 p-6 rounded-3xl shadow-sm space-y-6">
                  
                  {/* Subject Picker (Only in Focus Mode) */}
                  {mode === 'focus' && !isActive && (
                      <div className="space-y-3">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <Atom size={14} /> Subject
                          </label>
                          <div className="flex flex-wrap gap-2">
                              {subjects.map(s => (
                                  <button
                                      key={s.id}
                                      onClick={() => setSelectedSubject(s.id as any)}
                                      className={`
                                          flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border
                                          ${selectedSubject === s.id 
                                              ? `${s.bg} text-white border-transparent shadow-md` 
                                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20'
                                          }
                                      `}
                                  >
                                      {selectedSubject === s.id && <CheckCircle2 size={12} />}
                                      {s.id}
                                  </button>
                              ))}
                          </div>
                      </div>
                  )}

                  {/* Task Selector */}
                  <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <ListTodo size={14} /> Objective
                      </label>
                      <div className="relative">
                          <select 
                              value={selectedTask}
                              onChange={(e) => setSelectedTask(e.target.value)}
                              className="w-full appearance-none bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm font-medium rounded-xl p-3 pr-10 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all truncate"
                          >
                              <option value="">No specific task</option>
                              {pendingTasks.map(t => <option key={t.id} value={t.id}>{t.text}</option>)}
                          </select>
                          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                  </div>

                  {/* Soundscape Control */}
                  <div className="space-y-3">
                      <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <Music size={14} /> Soundscape
                          </label>
                          <button 
                              onClick={handleOpenSettings} 
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          >
                              <Settings2 size={14} />
                          </button>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                          {SOUND_OPTIONS.map(opt => (
                              <button
                                  key={opt.id}
                                  onClick={() => onSetSound(opt.id as any)}
                                  className={`
                                      flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl transition-all
                                      ${activeSound === opt.id 
                                          ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30' 
                                          : 'bg-slate-50 dark:bg-black/20 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent'
                                      }
                                  `}
                                  title={opt.label}
                              >
                                  <opt.icon size={18} />
                              </button>
                          ))}
                      </div>
                  </div>
              </div>

              {/* 3. Live Session Stats */}
              <div className="flex-1 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/5 p-6 rounded-3xl shadow-sm flex flex-col min-h-[200px]">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <History size={14} /> Session Log
                  </h3>
                  
                  {sessionLogs.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center opacity-40 py-8">
                          <div className="p-3 bg-slate-100 dark:bg-white/5 rounded-full mb-3">
                              <Clock size={24} />
                          </div>
                          <p className="text-xs font-bold uppercase tracking-widest text-center">Ready to Start</p>
                      </div>
                  ) : (
                      <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pr-1 -mr-2">
                          {sessionLogs.map((log, i) => {
                              const isCorrect = log.result === 'correct';
                              const mistake = !isCorrect ? MISTAKE_TYPES.find(m => m.id === log.result) : null;
                              return (
                                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                                      <div className="flex items-center gap-3">
                                          <span className="text-[10px] font-mono text-slate-400 w-4">#{sessionLogs.length - i}</span>
                                          <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${isCorrect ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400'}`}>
                                              {isCorrect ? 'Solved' : mistake?.label || 'Miss'}
                                          </div>
                                      </div>
                                      <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                                          {formatTime(log.duration)}
                                      </span>
                                  </div>
                              );
                          })}
                      </div>
                  )}

                  {sessionLogs.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/5 grid grid-cols-2 gap-4">
                          <div>
                              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Qs</p>
                              <p className="text-2xl font-mono font-bold text-slate-900 dark:text-white">{sessionLogs.length}</p>
                          </div>
                          <div>
                              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Avg Pace</p>
                              <p className="text-2xl font-mono font-bold text-slate-900 dark:text-white">
                                  {sessionLogs.length > 0 ? Math.round(sessionLogs.reduce((a,b) => a+b.duration, 0) / sessionLogs.length / 60) : 0}
                                  <span className="text-sm ml-1 text-slate-500">min</span>
                              </p>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* --- SETTINGS MODAL (PORTAL) --- */}
      {showSettings && createPortal(
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200 backdrop-blur-sm" onClick={handleCloseSettings}>
            <div 
                className="w-full max-w-sm rounded-[2rem] overflow-hidden animate-in zoom-in-95 duration-200" 
                onClick={(e) => e.stopPropagation()}
                style={{ 
                    backgroundColor: 'rgba(var(--theme-card-rgb), 0.85)',
                    backgroundImage: `
                        radial-gradient(circle at top left, rgba(var(--theme-accent-rgb), 0.25), transparent 70%),
                        radial-gradient(circle at bottom right, rgba(var(--theme-accent-rgb), 0.15), transparent 70%)
                    `,
                    borderColor: 'rgba(var(--theme-accent-rgb), 0.3)',
                    borderWidth: '1px',
                    boxShadow: '0 25px 50px -12px rgba(var(--theme-accent-rgb), 0.3), 0 0 15px rgba(var(--theme-accent-rgb), 0.1)',
                    backdropFilter: 'blur(24px)'
                }}
            >
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--theme-text-main)' }}>Timer Config</h4>
                        <button onClick={handleCloseSettings} className="p-2 -mr-2 transition-colors" style={{ color: 'var(--theme-text-sub)' }}><X size={18} /></button>
                    </div>
                    <div className="space-y-4">
                        <DurationControl label="Focus Duration" value={durations.focus} onChange={(val) => onUpdateDurations(val, 'focus')} min={1} max={120} step={1} colorHex="#6366f1" />
                        <DurationControl label="Short Break" value={durations.short} onChange={(val) => onUpdateDurations(val, 'short')} min={1} max={30} step={1} colorHex="#10b981" />
                        <DurationControl label="Long Break" value={durations.long} onChange={(val) => onUpdateDurations(val, 'long')} min={5} max={60} step={5} colorHex="#3b82f6" />
                    </div>
                </div>
            </div>
        </div>,
        document.body
      )}

      {/* --- REAL-TIME TAGGING OVERLAY (PORTAL) --- */}
      {showTagger && !showReport && createPortal(
          <div className="fixed inset-0 z-[150] flex items-end justify-center pb-8 animate-in slide-in-from-bottom-10 fade-in duration-300">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseTagger} />
              
              <div 
                className="relative w-[90%] max-w-md rounded-3xl p-6 flex flex-col gap-4 mb-safe"
                style={{ 
                    backgroundColor: 'rgba(var(--theme-card-rgb), 0.85)',
                    backgroundImage: `
                        radial-gradient(circle at top left, rgba(var(--theme-accent-rgb), 0.25), transparent 70%),
                        radial-gradient(circle at bottom right, rgba(var(--theme-accent-rgb), 0.15), transparent 70%)
                    `,
                    borderColor: 'rgba(var(--theme-accent-rgb), 0.3)',
                    borderWidth: '1px',
                    boxShadow: '0 25px 50px -12px rgba(var(--theme-accent-rgb), 0.3), 0 0 15px rgba(var(--theme-accent-rgb), 0.1)',
                    backdropFilter: 'blur(24px)'
                }}
              >
                  <div className="flex justify-between items-center border-b pb-4" style={{ borderColor: 'rgba(var(--theme-text-main), 0.1)' }}>
                      <div>
                          <h3 className="text-lg font-bold" style={{ color: 'var(--theme-text-main)' }}>Log Question #{sessionLogs.length + 1}</h3>
                          <div className="flex items-center gap-2 mt-1">
                              <TimerIcon size={12} style={{ color: 'var(--theme-text-sub)' }} />
                              <span className="text-xs font-mono font-medium" style={{ color: 'var(--theme-text-sub)' }}>
                                  Time taken: <span className="font-bold" style={{ color: 'var(--theme-accent)' }}>{formatTime(currentQDuration)}</span>
                              </span>
                          </div>
                      </div>
                      <button onClick={handleCloseTagger} className="p-2 rounded-full hover:bg-white/10 transition-colors" style={{ color: 'var(--theme-text-sub)' }}>
                          <X size={20} />
                      </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                      <button 
                          onClick={() => handleTagResult('correct')}
                          className="col-span-2 py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                      >
                          <CheckCircle2 size={20} /> Solved / Correct
                      </button>
                      
                      <div className="col-span-2 text-center my-1 relative">
                          <span 
                            className="text-[9px] font-bold uppercase tracking-widest rounded px-2 relative z-10"
                            style={{ color: 'var(--theme-text-sub)', backgroundColor: 'var(--theme-card-bg)' }}
                          >
                              or mark issue
                          </span>
                          <div className="h-px w-full absolute top-1/2 left-0 -z-0" style={{ backgroundColor: 'rgba(var(--theme-text-main), 0.1)' }}></div>
                      </div>

                      {MISTAKE_TYPES.slice(0, 4).map(type => (
                          <button
                              key={type.id}
                              onClick={() => handleTagResult(type.id)}
                              className={`
                                  flex items-center gap-2 p-3 rounded-xl border hover:bg-white/5 transition-all active:scale-95
                                  ${type.color.replace('text-', 'text-')}
                              `}
                              style={{ borderColor: 'rgba(var(--theme-text-main), 0.1)' }}
                          >
                              <span className="shrink-0">{type.icon}</span>
                              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-main)' }}>{type.label}</span>
                          </button>
                      ))}
                  </div>
              </div>
          </div>,
          document.body
      )}

      {/* --- REPORT CARD OVERLAY (PORTAL) --- */}
      {showReport && createPortal(
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
              <div 
                className="relative w-full max-w-md rounded-[2rem] overflow-hidden flex flex-col max-h-[80vh]"
                style={{ 
                    backgroundColor: 'rgba(var(--theme-card-rgb), 0.85)',
                    backgroundImage: `
                        radial-gradient(circle at top left, rgba(var(--theme-accent-rgb), 0.25), transparent 70%),
                        radial-gradient(circle at bottom right, rgba(var(--theme-accent-rgb), 0.15), transparent 70%)
                    `,
                    borderColor: 'rgba(var(--theme-accent-rgb), 0.3)',
                    borderWidth: '1px',
                    boxShadow: '0 25px 50px -12px rgba(var(--theme-accent-rgb), 0.3), 0 0 15px rgba(var(--theme-accent-rgb), 0.1)',
                    backdropFilter: 'blur(24px)'
                }}
              >
                  
                  <div 
                    className="p-6 border-b"
                    style={{ 
                        background: 'linear-gradient(to bottom right, rgba(var(--theme-accent-rgb), 0.15), transparent)',
                        borderColor: 'rgba(var(--theme-text-main), 0.1)'
                    }}
                  >
                      <div className="flex justify-between items-start">
                          <div>
                              <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--theme-text-main)' }}>
                                  <CheckCircle2 className="text-emerald-500" /> Session Complete
                              </h2>
                              <p className="text-xs font-medium mt-1" style={{ color: 'var(--theme-text-sub)' }}>Great job! Here's your performance breakdown.</p>
                          </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-6">
                          <div className="p-3 rounded-xl border" style={{ backgroundColor: 'rgba(var(--theme-text-main), 0.03)', borderColor: 'rgba(var(--theme-text-main), 0.1)' }}>
                              <span className="text-[10px] uppercase font-bold tracking-widest block mb-1" style={{ color: 'var(--theme-text-sub)' }}>Accuracy</span>
                              <span className="text-2xl font-mono font-bold" style={{ color: 'var(--theme-accent)' }}>
                                  {sessionLogs.length > 0 
                                    ? Math.round((sessionLogs.filter(l => l.result === 'correct').length / sessionLogs.length) * 100) 
                                    : 0}%
                              </span>
                          </div>
                          <div className="p-3 rounded-xl border" style={{ backgroundColor: 'rgba(var(--theme-text-main), 0.03)', borderColor: 'rgba(var(--theme-text-main), 0.1)' }}>
                              <span className="text-[10px] uppercase font-bold tracking-widest block mb-1" style={{ color: 'var(--theme-text-sub)' }}>Questions</span>
                              <span className="text-2xl font-mono font-bold" style={{ color: 'var(--theme-text-main)' }}>
                                  {sessionLogs.length}
                              </span>
                          </div>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                      {sessionLogs.map((log, i) => {
                          const isCorrect = log.result === 'correct';
                          const mistake = !isCorrect ? MISTAKE_TYPES.find(m => m.id === log.result) : null;
                          const subjectConfig = subjects.find(s => s.id === log.subject);

                          return (
                              <div key={i} className="flex items-center gap-3 p-3 rounded-xl border" style={{ backgroundColor: 'rgba(var(--theme-text-main), 0.02)', borderColor: 'rgba(var(--theme-text-main), 0.05)' }}>
                                  <div className={`p-2 rounded-lg bg-white dark:bg-white/5 ${subjectConfig?.color}`}>
                                      {subjectConfig?.icon ? <subjectConfig.icon size={14} /> : <Atom size={14} />}
                                  </div>
                                  <div className="flex-grow min-w-0">
                                      <div className="flex justify-between items-center mb-1">
                                          <span className="text-xs font-bold" style={{ color: 'var(--theme-text-main)' }}>Question {i + 1}</span>
                                          <span className="text-[10px] font-mono font-bold flex items-center gap-1" style={{ color: 'var(--theme-text-sub)' }}>
                                              <Clock size={10} /> {formatTime(log.duration)}
                                          </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                          {isCorrect ? (
                                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Correct</span>
                                          ) : (
                                              <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 flex items-center gap-1`}>
                                                  {mistake?.label || 'Incorrect'}
                                              </span>
                                          )}
                                      </div>
                                  </div>
                              </div>
                          );
                      })}
                  </div>

                  <div className="p-4 border-t" style={{ borderColor: 'rgba(var(--theme-text-main), 0.1)', backgroundColor: 'rgba(var(--theme-text-main), 0.02)' }}>
                      <button 
                          onClick={handleSaveAndClose}
                          className="w-full py-4 text-white rounded-2xl font-bold uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
                          style={{
                              backgroundColor: 'var(--theme-accent)',
                              color: 'var(--theme-on-accent)',
                              boxShadow: '0 10px 15px -3px rgba(var(--theme-accent-rgb), 0.3), 0 4px 6px -2px rgba(var(--theme-accent-rgb), 0.1)'
                          }}
                      >
                          Save to Dashboard
                      </button>
                  </div>
              </div>
          </div>,
          document.body
      )}
    </div>
  );
});
