import React, { useState, useMemo, memo, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Settings2, 
  X, 
  Zap, 
  Atom, 
  Calculator, 
  Waves, 
  CheckCircle2, 
  ListTodo, 
  ChevronDown, 
  Brain, 
  Coffee, 
  Armchair, 
  Plus, 
  Timer as TimerIcon, 
  Flag, 
  Clock, 
  Crown, 
  CloudRain, 
  Trees, 
  Music, 
  VolumeX,
  Calendar,
  Hourglass
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
  onToggleSound: () => void; // Deprecated but kept for compatibility in prop signature
  onSetSound: (type: 'off' | 'rain' | 'forest' | 'lofi' | 'cafe') => void;
  onUpdateDurations: (newDuration: number, mode: 'focus' | 'short' | 'long') => void;
  onAddLog: (log: QuestionLog, subject: string) => void;
  onCompleteSession: () => void;
  isPro: boolean;
  sessionCount: number;
  onOpenUpgrade: () => void;
  sessions: Session[]; // Add sessions to calculate history
}

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
  const [showSoundMenu, setShowSoundMenu] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string>('');
  const [timeView, setTimeView] = useState<'today' | 'week' | 'month'>('today');
  
  // --- Feature States ---
  const [showTagger, setShowTagger] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [currentQDuration, setCurrentQDuration] = useState(0); 
  // ----------------------

  // Automatically show report card when time runs out in Focus Mode
  useEffect(() => {
      if (mode === 'focus' && timeLeft === 0 && sessionLogs.length > 0 && !isActive) {
          setShowReport(true);
      }
  }, [timeLeft, mode, sessionLogs.length, isActive]);

  // --- Statistics Logic ---
  const stats = useMemo(() => {
      const now = new Date();
      // Start of Today (00:00:00)
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      
      // Start of Week (Sunday 00:00:00)
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day; // Adjust so sunday is first day
      const startOfWeek = new Date(d.setDate(diff)).setHours(0,0,0,0);
      
      // Start of Month (1st 00:00:00)
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

      // Structure
      const data = {
          today: { total: 0, Physics: 0, Chemistry: 0, Maths: 0 },
          week: { total: 0, Physics: 0, Chemistry: 0, Maths: 0 },
          month: { total: 0, Physics: 0, Chemistry: 0, Maths: 0 }
      };

      const addToPeriod = (period: 'today' | 'week' | 'month', subject: string, duration: number) => {
          data[period].total += duration;
          // Safe check for valid subject keys
          if (subject === 'Physics' || subject === 'Chemistry' || subject === 'Maths') {
              data[period][subject] += duration;
          }
      };

      // Add historical sessions duration
      sessions.forEach(s => {
          const dur = s.duration || 0;
          const subj = s.subject;
          if (s.timestamp >= startOfDay) addToPeriod('today', subj, dur);
          if (s.timestamp >= startOfWeek) addToPeriod('week', subj, dur);
          if (s.timestamp >= startOfMonth) addToPeriod('month', subj, dur);
      });

      // Add current active session logs duration to "Today" for instant feedback
      // Note: Current session counts towards all periods
      sessionLogs.forEach(log => {
          const dur = log.duration || 0;
          const subj = log.subject;
          addToPeriod('today', subj, dur);
          addToPeriod('week', subj, dur);
          addToPeriod('month', subj, dur);
      });

      return data;
  }, [sessions, sessionLogs]);

  const formatDurationSimple = (seconds: number) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      if (h === 0) return `${m}m`;
      return `${h}h ${m}m`;
  };
  // ------------------------

  const handleTimerClick = () => {
    if (timeLeft === 0 && !isActive) {
      onResetTimer();
    } else {
      onToggleTimer();
    }
  };

  // --- NEW: +1 Logic ---
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
          subject: selectedSubject // Attach subject to log
      };
      
      onAddLog(newLog, String(selectedSubject));
      setShowTagger(false);
  };

  const handleFinishSession = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      onToggleTimer(); // Pause
      setShowReport(true);
  };

  const handleSaveAndClose = () => {
      onCompleteSession();
      setShowReport(false);
  };

  // Safe Mode Switch
  const handleModeSwitch = (newMode: 'focus' | 'short' | 'long') => {
      if (isActive && mode === 'focus' && newMode !== 'focus') {
          const confirmed = window.confirm("You are currently in a Focus Session. Are you sure you want to take a break?");
          if (!confirmed) return;
      }
      onSwitchMode(newMode);
  };
  // ---------------------

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0 
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const subjects = useMemo(() => [
    { id: 'Physics', icon: Atom, color: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-500/50', shadow: 'shadow-cyan-500/20', bg: 'bg-cyan-600', gradient: 'from-cyan-600 to-blue-600' },
    { id: 'Chemistry', icon: Zap, color: 'text-amber-500 dark:text-amber-400', border: 'border-amber-500/50', shadow: 'shadow-amber-500/20', bg: 'bg-amber-500', gradient: 'from-amber-500 to-orange-600' },
    { id: 'Maths', icon: Calculator, color: 'text-rose-500 dark:text-rose-400', border: 'border-rose-500/50', shadow: 'shadow-rose-500/20', bg: 'bg-rose-500', gradient: 'from-rose-500 to-pink-600' },
  ], []);

  const currentSubject = subjects.find(s => s.id === selectedSubject)!;
  
  const pendingTasks = useMemo(() => targets.filter(t => !t.completed), [targets]);
  const activeTaskObj = useMemo(() => targets.find(t => t.id === selectedTask), [targets, selectedTask]);

  const getTheme = () => {
    if (mode === 'focus') {
        return {
            gradient: currentSubject.gradient,
            color: currentSubject.color,
            bg: currentSubject.bg,
            shadow: currentSubject.shadow,
            stops: [
                selectedSubject === 'Physics' ? '#0891b2' : selectedSubject === 'Chemistry' ? '#fbbf24' : '#fb7185',
                selectedSubject === 'Physics' ? '#2563eb' : selectedSubject === 'Chemistry' ? '#f97316' : '#db2777'
            ]
        };
    } else if (mode === 'short') {
        return {
            gradient: 'from-emerald-400 to-teal-500',
            color: 'text-emerald-500 dark:text-emerald-400',
            bg: 'bg-emerald-500',
            shadow: 'shadow-emerald-500/20',
            stops: ['#34d399', '#14b8a6']
        };
    } else {
        return {
            gradient: 'from-indigo-500 to-indigo-600',
            color: 'text-indigo-500 dark:text-indigo-400',
            bg: 'bg-indigo-500',
            shadow: 'shadow-indigo-500/20',
            stops: ['var(--theme-accent)', 'var(--theme-accent-glow)']
        };
    }
  };

  const theme = getTheme();

  const viewBoxSize = 260;
  const radius = 110; 
  const circumference = 2 * Math.PI * radius;
  const progressPercentage = timeLeft / (durations[mode] * 60);
  const strokeDashoffset = Number.isFinite(progressPercentage) ? circumference * (1 - progressPercentage) : circumference;

  const SOUND_OPTIONS = [
      { id: 'rain', label: 'Rain', icon: CloudRain },
      { id: 'forest', label: 'Forest', icon: Trees },
      { id: 'cafe', label: 'Cafe', icon: Coffee },
      { id: 'lofi', label: 'Lo-fi', icon: Music },
      { id: 'off', label: 'Off', icon: VolumeX },
  ];

  return (
    <>
      <div 
        id="timer-container" 
        className="w-full max-w-5xl mx-auto min-h-[600px] flex flex-col lg:flex-row items-center justify-center gap-12 relative animate-in fade-in duration-700 p-4"
        style={{ contain: 'layout' }}
      >
        {/* TIMER COLUMN */}
        <div className="flex flex-col items-center justify-center flex-1 w-full max-w-xl">
            {/* 1. Top Section: Mode Selector & Context */}
            <div className="w-full flex flex-col items-center gap-6 mb-8 md:mb-10 z-10">
            
            {/* Mode Selector Pill */}
            <div className="p-1 bg-slate-100 dark:bg-white/5 rounded-full flex items-center border border-slate-200 dark:border-white/5 shadow-inner">
                {[
                    { id: 'focus', label: 'Focus', icon: Brain },
                    { id: 'short', label: 'Short Break', icon: Coffee },
                    { id: 'long', label: 'Long Break', icon: Armchair }
                ].map((m) => {
                    const isSelected = mode === m.id;
                    return (
                        <button
                            key={m.id}
                            onClick={() => handleModeSwitch(m.id as any)}
                            className={`
                                relative flex items-center gap-2 px-4 py-2 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all duration-300
                                ${isSelected ? 'text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}
                            `}
                        >
                            {isSelected && (
                                <div className="absolute inset-0 bg-white dark:bg-slate-800 rounded-full shadow-sm animate-in zoom-in-95 duration-200" />
                            )}
                            <span className="relative z-10 flex items-center gap-2">
                                <m.icon size={14} className={isSelected && mode !== 'focus' ? theme.color : ''} />
                                <span className="hidden sm:inline">{m.label}</span>
                            </span>
                        </button>
                    )
                })}
            </div>

            {/* Subject Tabs - Only visible in Focus Mode */}
            {mode === 'focus' && (
                <div className="max-w-full overflow-x-auto no-scrollbar py-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="p-1.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-full flex items-center shadow-xl">
                    {subjects.map(s => {
                        const isSelected = selectedSubject === s.id;
                        return (
                        <button
                            key={s.id}
                            onClick={() => !isActive && setSelectedSubject(s.id as any)}
                            className={`
                            relative flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-300 flex-shrink-0
                            ${isSelected ? 'text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}
                            ${isActive && !isSelected ? 'opacity-30 cursor-not-allowed' : ''}
                            `}
                        >
                            {isSelected && (
                            <div className={`absolute inset-0 ${s.bg} rounded-full opacity-100 dark:opacity-20 animate-in zoom-in-90 duration-300`} />
                            )}
                            {isSelected && (
                            <div className={`absolute inset-0 border ${s.border} rounded-full opacity-100 animate-in zoom-in-95 duration-300`} />
                            )}
                            
                            <div className="relative z-10 flex items-center gap-2">
                                <s.icon size={14} className={isSelected ? 'text-white dark:' + s.color : 'text-slate-400'} />
                                <span className={isSelected ? 'text-white dark:text-current' : ''}>{s.id}</span>
                            </div>
                        </button>
                        )
                    })}
                    </div>
                </div>
            )}

            {/* Task Dropdown Pill - Only visible in Focus Mode */}
            {mode === 'focus' && (
                <div className="relative group w-64 max-w-[90vw] z-20 animate-in fade-in slide-in-from-top-2 duration-300 delay-100">
                    <div className={`absolute inset-0 bg-gradient-to-r ${currentSubject.gradient} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300`} />
                    <div className={`
                        flex items-center justify-between px-4 py-3 bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-2xl cursor-pointer transition-all duration-300
                        ${activeTaskObj ? 'border-white/20 bg-white/80 dark:bg-slate-800/80' : 'hover:bg-white/80 dark:hover:bg-slate-800/60'}
                    `}>
                        <div className="flex items-center gap-3 overflow-hidden">
                            {activeTaskObj ? (
                                <div className={`p-1 rounded-full ${currentSubject.bg} bg-opacity-20`}>
                                    <CheckCircle2 size={12} className={currentSubject.color} />
                                </div>
                            ) : (
                                <ListTodo size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
                            )}
                            
                            {/* Dropdown */}
                            <select 
                                value={selectedTask}
                                onChange={(e) => setSelectedTask(e.target.value)}
                                disabled={isActive}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-base"
                            >
                                <option value="">Select a Goal...</option>
                                {pendingTasks.map(t => <option key={t.id} value={t.id}>{t.text}</option>)}
                            </select>

                            <span className={`text-xs font-medium truncate ${activeTaskObj ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                                {activeTaskObj ? activeTaskObj.text : 'Select Focus Goal...'}
                            </span>
                        </div>
                        <ChevronDown size={14} className="text-slate-400 dark:text-slate-600" />
                    </div>
                </div>
            )}

            {mode !== 'focus' && (
                <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300 italic text-center max-w-xs">
                        {mode === 'short' ? "Take a breath. Stretch your legs. Hydrate." : "Time to recharge completely. Step away from the screen."}
                    </p>
                </div>
            )}
            </div>

            {/* 2. Middle Section: The Timer Ring (Interactive Play/Pause) */}
            <div 
                className="relative mb-12 group cursor-pointer"
                onClick={handleTimerClick}
                title={isActive ? "Pause" : timeLeft === 0 ? "Reset" : "Start"}
            >
            
            <div 
                className={`
                    absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[70vw] max-w-[280px] max-h-[280px] rounded-full
                    transition-all duration-1000 group-hover:scale-105 group-active:scale-95
                `}
                style={{
                    background: isActive 
                        ? `radial-gradient(circle, ${theme.stops[0]}40 0%, transparent 70%)` 
                        : 'radial-gradient(circle, rgba(148, 163, 184, 0.1) 0%, transparent 70%)',
                    opacity: 0.8,
                    transform: 'translate3d(-50%, -50%, 0)',
                    willChange: 'opacity, transform' 
                }} 
            />

            <div className="relative w-[75vw] h-[75vw] max-w-[320px] max-h-[320px] flex items-center justify-center transition-transform duration-300 group-hover:scale-105 group-active:scale-95">
                <svg 
                    className="w-full h-full transform -rotate-90"
                    viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
                    style={{ willChange: 'transform' }}
                >
                    <defs>
                        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={theme.stops[0]} />
                            <stop offset="100%" stopColor={theme.stops[1]} />
                        </linearGradient>
                    </defs>

                    <circle 
                        cx={viewBoxSize/2} 
                        cy={viewBoxSize/2} 
                        r={radius} 
                        className="stroke-slate-200 dark:stroke-slate-800/50 fill-none" 
                        strokeWidth="4" 
                    />

                    <circle 
                        cx={viewBoxSize/2} 
                        cy={viewBoxSize/2} 
                        r={radius} 
                        stroke="url(#progressGradient)"
                        strokeWidth="6"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-1000 ease-linear"
                        style={{ 
                            transition: isActive ? 'stroke-dashoffset 1s linear' : 'stroke-dashoffset 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                    />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`
                        text-6xl md:text-7xl font-display font-medium tracking-tight tabular-nums transition-colors duration-300 select-none
                        ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400'}
                    `} style={{ transform: 'translateZ(0)' }}>
                        {formatTime(timeLeft)}
                    </span>
                    
                    <div className={`
                        mt-4 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-[0.2em] border transition-all duration-500
                        ${isActive 
                            ? `bg-slate-100 dark:bg-slate-900 border-${theme.color.split('-')[1]}-500/30 ${theme.color}` 
                            : 'bg-transparent border-transparent text-slate-400 dark:text-slate-600'}
                    `}>
                        {isActive ? (mode === 'focus' ? 'Flow State' : 'Recharging') : (timeLeft === 0 ? 'Finished!' : 'Tap to Start')}
                    </div>
                </div>
            </div>
            </div>

            {/* 3. Bottom Section: Controls */}
            <div className="flex flex-col items-center gap-8 w-full min-h-[120px] justify-end pb-4">
                
                {/* ACTIVE STATE: SHOW PAUSE AND LOGGING */}
                {isActive ? (
                    <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        
                        {/* The +1 Button (Only in Focus Mode) */}
                        {mode === 'focus' && (
                            <div className="flex flex-col items-center gap-2">
                                <button
                                    onClick={handlePlusOne}
                                    className={`
                                        group relative flex items-center gap-3 px-8 py-4 rounded-3xl
                                        bg-gradient-to-r ${currentSubject.gradient} shadow-2xl shadow-indigo-500/30
                                        transform transition-all duration-150 active:scale-95 hover:scale-105
                                    `}
                                >
                                    <div className="absolute inset-0 rounded-3xl bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
                                    
                                    <div className="relative">
                                        <Plus size={28} className="text-white animate-pulse" strokeWidth={3} />
                                        {!isPro && sessionCount >= 3 && (
                                            <div className="absolute -top-2 -right-2 bg-amber-500 text-white rounded-full p-0.5 border-2 border-transparent shadow-sm">
                                                <Crown size={10} fill="currentColor" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col items-start text-white">
                                        <span className="text-lg font-bold leading-none">+1 Solved</span>
                                        <span className="text-[10px] font-bold uppercase opacity-80 tracking-wide">
                                            {!isPro && sessionCount >= 3 ? 'Pro Feature' : 'Log Question'}
                                        </span>
                                    </div>
                                </button>
                                {!isPro && (
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                                        {sessionCount < 3 
                                            ? `Free Sessions Remaining: ${3 - sessionCount}` 
                                            : 'Free Limit Reached (3/3)'}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* DEDICATED HIGH-VISIBILITY CONTROLS */}
                        <div className="mt-2 flex items-center gap-3">
                            <button
                                onClick={(e) => { e.stopPropagation(); onToggleTimer(); }}
                                className="flex items-center gap-2 px-8 py-3 rounded-full bg-slate-100 hover:bg-white text-slate-900 border-2 border-transparent hover:border-indigo-500 transition-all text-xs font-extrabold uppercase tracking-widest shadow-xl active:scale-95"
                            >
                                <Pause size={16} fill="currentColor" />
                                PAUSE
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onResetTimer(); }}
                                className="p-3 rounded-full bg-slate-800/50 dark:bg-white/10 hover:bg-rose-500/20 text-slate-400 dark:text-white/60 hover:text-rose-500 border-2 border-transparent hover:border-rose-500/50 transition-all shadow-xl active:scale-95 backdrop-blur-sm"
                                title="Reset Session"
                            >
                                <RotateCcw size={18} />
                            </button>
                        </div>
                    </div>
                ) : (
                    /* INACTIVE STATE: SHOW START, SETTINGS, SOUND */
                    <div className="flex items-center gap-6 p-2 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200 dark:border-white/5 rounded-[2rem] shadow-2xl transition-all duration-300 hover:bg-white/70 dark:hover:bg-slate-900/70 hover:border-slate-300 dark:hover:border-white/10 hover:shadow-indigo-500/5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    
                        <div className="relative">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setShowSoundMenu(!showSoundMenu); }}
                                className={`
                                w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300
                                ${activeSound !== 'off' ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'}
                                `}
                                title="Ambient Sound"
                            >
                                <Waves size={18} className={activeSound !== 'off' ? 'animate-pulse' : ''} />
                            </button>
                            
                            {showSoundMenu && (
                                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-48 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl animate-in slide-in-from-bottom-2 fade-in duration-200 z-50 overflow-hidden">
                                    {SOUND_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSetSound(opt.id as any);
                                                setShowSoundMenu(false);
                                            }}
                                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-xs font-bold uppercase tracking-wider ${activeSound === opt.id ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                                        >
                                            <opt.icon size={14} />
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button 
                            onClick={(e) => { e.stopPropagation(); handleTimerClick(); }}
                            className={`
                            w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg active:scale-95
                            ${isActive 
                                ? 'bg-slate-100 text-slate-900 hover:bg-white shadow-slate-200 dark:shadow-white/10' 
                                : `bg-gradient-to-br ${theme.gradient} text-white shadow-lg`}
                            `}
                        >
                            {isActive ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                        </button>

                        <div className="relative">
                            <button 
                            onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }}
                            className={`
                                w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300
                                ${showSettings ? 'bg-black/5 dark:bg-white/10 text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'}
                            `}
                            >
                            {showSettings ? <X size={18} /> : <Settings2 size={18} />}
                            </button>

                            {showSettings && (
                            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-72 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl animate-in slide-in-from-bottom-2 fade-in duration-200 z-50">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 text-center">Timer Config</h4>
                                
                                <div className="mb-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Focus</span>
                                        <span className="text-xs font-mono font-bold text-indigo-500">{durations.focus}m</span>
                                    </div>
                                    <input 
                                        type="range" min="0.5" max="480" step="0.5"
                                        value={durations.focus}
                                        onChange={(e) => onUpdateDurations(parseFloat(e.target.value), 'focus')}
                                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
                                    />
                                </div>

                                <div className="mb-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Short Break</span>
                                        <span className="text-xs font-mono font-bold text-emerald-500">{durations.short}m</span>
                                    </div>
                                    <input 
                                        type="range" min="0.5" max="60" step="0.5"
                                        value={durations.short}
                                        onChange={(e) => onUpdateDurations(parseFloat(e.target.value), 'short')}
                                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-emerald-500"
                                    />
                                </div>

                                <div className="mb-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Long Break</span>
                                        <span className="text-xs font-mono font-bold text-blue-500">{durations.long}m</span>
                                    </div>
                                    <input 
                                        type="range" min="0.5" max="120" step="0.5"
                                        value={durations.long}
                                        onChange={(e) => onUpdateDurations(parseFloat(e.target.value), 'long')}
                                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>

                                <div className="flex justify-center mt-2 border-t border-slate-100 dark:border-white/5 pt-3">
                                    <button onClick={(e) => { e.stopPropagation(); onResetTimer(); }} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 transition-colors">
                                        <RotateCcw size={10} /> Reset Current
                                    </button>
                                </div>
                            </div>
                            )}
                        </div>
                    </div>
                )}
                
                {/* Session Stats (Small) */}
                {sessionLogs.length > 0 && mode === 'focus' && (
                    <div className="mt-2 flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-black/5 dark:bg-white/5 rounded-full">
                            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Current Session:</span>
                            <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">{sessionLogs.length} Qs</span>
                        </div>
                        {/* Finish Button */}
                        <button 
                            onClick={handleFinishSession}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 rounded-full text-slate-600 dark:text-slate-300 transition-colors"
                        >
                            <Flag size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Finish</span>
                        </button>
                    </div>
                )}
            </div>
        </div>

        {/* --- STATS PANEL --- */}
        <div className="flex flex-col gap-6 w-full max-w-sm lg:w-72 mt-10 lg:mt-0 animate-in fade-in slide-in-from-bottom-8 lg:slide-in-from-right-8 duration-700">
            <div className="p-5 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200 dark:border-white/5 rounded-[2rem] shadow-xl flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6 text-indigo-500 dark:text-indigo-400">
                    <Hourglass size={20} />
                    <span className="text-xs font-bold uppercase tracking-widest">Time Analysis</span>
                </div>

                {/* Tabs */}
                <div className="flex p-1 bg-slate-200/50 dark:bg-black/20 rounded-xl mb-6">
                    {['Today', 'Week', 'Month'].map((v) => (
                        <button
                            key={v}
                            onClick={() => setTimeView(v.toLowerCase() as any)}
                            className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${timeView === v.toLowerCase() ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            {v}
                        </button>
                    ))}
                </div>

                {/* Big Total */}
                <div className="text-center mb-8">
                    <span className="text-4xl font-mono font-bold text-slate-900 dark:text-white block">
                        {formatDurationSimple(stats[timeView].total)}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Total Focused</span>
                </div>

                {/* Breakdown List */}
                <div className="space-y-4 flex-1">
                    {subjects.map(sub => {
                        const duration = stats[timeView][sub.id as keyof typeof stats.today];
                        const pct = stats[timeView].total > 0 ? (duration / stats[timeView].total) * 100 : 0;
                        
                        return (
                            <div key={sub.id} className="group">
                                <div className="flex justify-between items-end mb-1">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${sub.color.split(' ')[0]}`}>{sub.id}</span>
                                    <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">{formatDurationSimple(duration)}</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full ${sub.bg.split(' ')[0]} transition-all duration-500`}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
      </div>

      {/* --- REPORT CARD OVERLAY --- */}
      {showReport && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
              <div className="absolute inset-0 bg-black/60" />
              <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                  
                  {/* Header */}
                  <div className="p-6 bg-gradient-to-r from-indigo-50 to-transparent dark:from-indigo-500/10 dark:to-transparent border-b border-slate-100 dark:border-white/5">
                      <div className="flex justify-between items-start">
                          <div>
                              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                  <CheckCircle2 className="text-emerald-500" /> Session Complete
                              </h2>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Great job! Here's your performance breakdown.</p>
                          </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-6">
                          <div className="bg-white/50 dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-white/5">
                              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block mb-1">Accuracy</span>
                              <span className="text-2xl font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                  {sessionLogs.length > 0 
                                    ? Math.round((sessionLogs.filter(l => l.result === 'correct').length / sessionLogs.length) * 100) 
                                    : 0}%
                              </span>
                          </div>
                          <div className="bg-white/50 dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-white/5">
                              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block mb-1">Questions</span>
                              <span className="text-2xl font-mono font-bold text-slate-900 dark:text-white">
                                  {sessionLogs.length}
                              </span>
                          </div>
                      </div>
                  </div>

                  {/* Question List */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                      {sessionLogs.map((log, i) => {
                          const isCorrect = log.result === 'correct';
                          const mistake = !isCorrect ? MISTAKE_TYPES.find(m => m.id === log.result) : null;
                          const subjectConfig = subjects.find(s => s.id === log.subject);

                          return (
                              <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-xl">
                                  <div className={`p-2 rounded-lg bg-white dark:bg-white/5 ${subjectConfig?.color}`}>
                                      {subjectConfig?.icon ? <subjectConfig.icon size={14} /> : <Atom size={14} />}
                                  </div>
                                  <div className="flex-grow min-w-0">
                                      <div className="flex justify-between items-center mb-1">
                                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Question {i + 1}</span>
                                          <span className="text-[10px] font-mono font-bold text-slate-400 flex items-center gap-1">
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

                  {/* Footer Actions */}
                  <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-900/50">
                      <button 
                          onClick={handleSaveAndClose}
                          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold uppercase tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                          Save to Dashboard
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- REAL-TIME TAGGING OVERLAY --- */}
      {showTagger && !showReport && (
          <div className="absolute inset-0 z-50 flex items-end justify-center pb-8 animate-in slide-in-from-bottom-10 fade-in duration-300">
              <div className="absolute inset-0 bg-black/60" onClick={() => setShowTagger(false)} />
              
              <div className="relative w-[90%] max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-4">
                      <div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Log Question #{sessionLogs.length + 1}</h3>
                          <div className="flex items-center gap-2 mt-1">
                              <TimerIcon size={12} className="text-slate-400" />
                              <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
                                  Time taken: <span className="text-indigo-500 font-bold">{formatTime(currentQDuration)}</span>
                              </span>
                          </div>
                      </div>
                      <button onClick={() => setShowTagger(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400">
                          <X size={20} />
                      </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                      {/* Massive Correct Button */}
                      <button 
                          onClick={() => handleTagResult('correct')}
                          className="col-span-2 py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                      >
                          <CheckCircle2 size={20} /> Solved / Correct
                      </button>
                      
                      <div className="col-span-2 text-center my-1">
                          <span className="text-[9px] font-bold uppercase text-slate-400 tracking-widest bg-white dark:bg-slate-900 px-2 relative z-10">or mark issue</span>
                          <div className="h-px bg-slate-100 dark:bg-white/5 -mt-2"></div>
                      </div>

                      {MISTAKE_TYPES.slice(0, 4).map(type => (
                          <button
                              key={type.id}
                              onClick={() => handleTagResult(type.id)}
                              className={`
                                  flex items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-all active:scale-95
                                  ${type.color.replace('text-', 'text-')}
                              `}
                          >
                              <span className="shrink-0">{type.icon}</span>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">{type.label}</span>
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      )}
    </>
  );
});