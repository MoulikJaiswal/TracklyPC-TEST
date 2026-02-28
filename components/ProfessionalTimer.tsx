import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Settings2,
  X,
  Coffee,
  Brain,
  Zap
} from 'lucide-react';

export const ProfessionalTimer: React.FC = () => {
  const [mode, setMode] = useState<'focus' | 'short' | 'long'>('focus');
  const [durations, setDurations] = useState({ focus: 25, short: 5, long: 15 });
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const timerRef = useRef<any>(null);
  const audioCtxRef = useRef<any>(null);

  const initAudio = () => {
    if (!soundEnabled) return;
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.warn("Web Audio API not supported", e);
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const getTotalTime = () => Math.max(1, durations[mode] * 60); // Ensure non-zero divisor

  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const ctx = audioCtxRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) { }
  };

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0 && isActive) {
      clearInterval(timerRef.current);
      setIsActive(false);
      playBeep();
    }
    return () => clearInterval(timerRef.current);
  }, [isActive, timeLeft, soundEnabled]); // added soundEnabled for context warning avoidance

  const toggleTimer = () => {
    if (!isActive) initAudio();
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(durations[mode] * 60);
  };

  const switchMode = (m: 'focus' | 'short' | 'long') => {
    setMode(m);
    setIsActive(false);
    setTimeLeft(durations[m] * 60);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getModeConfig = () => {
    switch (mode) {
      case 'focus': return { color: 'text-indigo-400', glow: 'shadow-indigo-500/40', bg: 'bg-indigo-500' };
      case 'short': return { color: 'text-emerald-400', glow: 'shadow-emerald-500/40', bg: 'bg-emerald-500' };
      case 'long': return { color: 'text-blue-400', glow: 'shadow-blue-500/40', bg: 'bg-blue-500' };
    }
  };

  const config = getModeConfig();
  const radius = 130;
  const circumference = 2 * Math.PI * radius;
  const totalTime = getTotalTime();
  const progress = Number.isFinite(timeLeft / totalTime) ? timeLeft / totalTime : 0;
  const dashOffset = Number.isFinite(circumference * (1 - progress)) ? circumference * (1 - progress) : 0;

  return (
    <div className="flex flex-col items-center justify-center min-h-[550px] w-full max-w-2xl mx-auto p-4 relative animate-in fade-in duration-700">

      {/* Mode Selector */}
      <div className="flex items-center gap-1.5 mb-14 p-1.5 bg-slate-900/50 rounded-full border border-white/5 backdrop-blur-md shadow-xl">
        {[
          { id: 'focus', label: 'Deep Focus', icon: Brain },
          { id: 'short', label: 'Refresh', icon: Coffee },
          { id: 'long', label: 'Recharge', icon: Zap }
        ].map(m => (
          <button
            key={m.id}
            onClick={() => switchMode(m.id as any)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${mode === m.id
              ? 'bg-white text-slate-950 shadow-lg scale-100'
              : 'text-slate-500 hover:text-white hover:bg-white/5'
              }`}
          >
            <m.icon size={14} />
            <span className="hidden sm:inline">{m.label}</span>
          </button>
        ))}
      </div>

      {/* Main Timer Ring */}
      <div className="relative mb-14 group">
        {/* Dynamic Glow Aura */}
        <div className={`absolute inset-0 rounded-full blur-[80px] transition-all duration-1000 opacity-20 transform scale-110 ${isActive ? config.bg : 'bg-transparent'}`} />

        <svg className="w-80 h-80 md:w-96 md:h-96 transform -rotate-90 relative z-10 drop-shadow-2xl overflow-visible">
          {/* Background Track */}
          <circle
            cx="50%" cy="50%" r={radius}
            className="stroke-white/5 fill-transparent"
            strokeWidth="2"
          />
          {/* Active Progress */}
          <circle
            cx="50%" cy="50%" r={radius}
            className={`fill-transparent transition-all duration-500 ease-out ${config.color}`}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ filter: `drop-shadow(0 0 6px currentColor)` }}
          />
          {/* End Cap Dot (Optional aesthetic detail) */}
          <circle
            cx="50%" cy="50%" r="4"
            className="fill-white transition-all duration-500"
            style={{
              transformOrigin: 'center',
              transform: `rotate(${progress * 360}deg) translate(${radius}px)`,
              filter: 'drop-shadow(0 0 8px white)'
            }}
          />
        </svg>

        {/* Time Display Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
          <span className={`text-7xl md:text-8xl font-display font-medium tracking-tighter tabular-nums transition-colors duration-500 select-none ${isActive ? 'text-white' : 'text-slate-500'}`}>
            {formatTime(timeLeft)}
          </span>
          <div className={`mt-4 px-3 py-1 rounded-full border border-white/5 bg-slate-900/50 backdrop-blur text-[9px] font-bold uppercase tracking-[0.3em] transition-all duration-500 ${isActive ? config.color : 'text-slate-600'}`}>
            {isActive ? 'Flow State' : 'Paused'}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-8 z-10">
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`p-4 rounded-full transition-all duration-300 ${soundEnabled ? 'text-white bg-white/10' : 'text-slate-600 hover:text-slate-400 hover:bg-white/5'}`}
        >
          {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>

        <button
          onClick={toggleTimer}
          className={`w-24 h-24 rounded-[3rem] flex items-center justify-center transition-all duration-500 hover:scale-105 active:scale-95 shadow-2xl ${isActive
            ? 'bg-white text-slate-950 shadow-white/20'
            : 'bg-slate-800 text-white shadow-black/40 hover:bg-slate-700'
            }`}
        >
          {isActive ? <Pause size={36} fill="currentColor" /> : <Play size={36} fill="currentColor" className="ml-1" />}
        </button>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-4 rounded-full transition-all duration-300 ${showSettings ? 'text-white bg-white/10' : 'text-slate-600 hover:text-slate-400 hover:bg-white/5'}`}
        >
          {showSettings ? <X size={20} /> : <Settings2 size={20} />}
        </button>
      </div>

      {/* Subtle Reset Link */}
      <button
        onClick={resetTimer}
        className="mt-10 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-700 hover:text-rose-500 transition-colors"
      >
        Reset
      </button>

      {/* Floating Settings Panel */}
      {showSettings && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-[#0B0F19]/95 backdrop-blur-2xl border border-white/10 p-6 rounded-3xl shadow-2xl animate-in slide-in-from-bottom-6 fade-in duration-300 z-50">
          <div className="flex items-center gap-2 mb-6 text-indigo-400">
            <Settings2 size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Timer Config</span>
          </div>
          <div className="space-y-6">
            {Object.entries(durations).map(([key, val]) => (
              <div key={key} className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold uppercase text-slate-400">{key === 'focus' ? 'Focus Duration' : key === 'short' ? 'Short Break' : 'Long Break'}</span>
                  <span className="font-mono text-white">{val}m</span>
                </div>
                <input
                  type="range" min="1" max={key === 'focus' ? 120 : 30}
                  value={val}
                  onChange={(e) => {
                    const v = parseInt(e.target.value);
                    setDurations(p => ({ ...p, [key]: v }));
                    if (mode === key && !isActive) setTimeLeft(v * 60);
                  }}
                  className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}