import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useData } from './DataContext';
import { useAuth } from './AuthContext';

const safeJSONParse = <T,>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) { return fallback; }
};

interface TimerContextType {
  timerMode: 'focus' | 'short' | 'long';
  timeLeft: number;
  timerState: 'idle' | 'running' | 'paused';
  durations: { focus: number; short: number; long: number };
  selectedSubject: string;
  setSelectedSubject: React.Dispatch<React.SetStateAction<string>>;
  handleTimerToggle: () => void;
  handleTimerReset: () => void;
  handleModeSwitch: (mode: 'focus' | 'short' | 'long') => void;
  handleDurationUpdate: (newDuration: number, modeKey: 'focus' | 'short' | 'long') => void;
  handleCompleteSession: (elapsedTime?: number) => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const TimerProvider = ({ children }: { children: ReactNode }) => {
  const { handleSaveSession } = useData();
  const { updatePresence } = useAuth();
  
  const [timerMode, setTimerMode] = useState<'focus' | 'short' | 'long'>('focus');
  const [durations, setDurations] = useLocalStorage('trackly_timer_durations', { focus: 25, short: 5, long: 15 });
  const [timeLeft, setTimeLeft] = useState(() => safeJSONParse('trackly_timer_durations', { focus: 25 }).focus * 60);
  const [timerState, setTimerState] = useState<'idle' | 'running' | 'paused'>('idle');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  
  const timerRef = useRef<any>(null);
  const endTimeRef = useRef<number>(0);

  const handleTimerReset = useCallback(() => {
    clearInterval(timerRef.current);
    setTimerState('idle');
    setTimeLeft(durations[timerMode] * 60);
    updatePresence({ state: 'idle' });
  }, [timerMode, durations, updatePresence]);
  
  const handleCompleteSession = useCallback((elapsedTime?: number) => {
      const plannedDuration = durations[timerMode] * 60;
      const effectiveDuration = elapsedTime !== undefined ? elapsedTime : plannedDuration;
      if (effectiveDuration > 60 && selectedSubject) {
         handleSaveSession({ subject: selectedSubject, topic: 'Focus Session', attempted: 0, correct: 0, mistakes: {}, duration: effectiveDuration, plannedDuration });
      }
      handleTimerReset();
  }, [handleSaveSession, selectedSubject, timerMode, durations, handleTimerReset]);
  
  useEffect(() => {
    if (timerState === 'running') {
        timerRef.current = setInterval(() => {
            const now = Date.now();
            const diff = Math.ceil((endTimeRef.current - now) / 1000);
            if (diff <= 0) {
                setTimeLeft(0); setTimerState('idle'); clearInterval(timerRef.current);
                handleCompleteSession(durations[timerMode] * 60);
            } else { setTimeLeft(diff); }
        }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [timerState, durations, timerMode, handleCompleteSession]);

  const handleTimerToggle = useCallback(() => {
      if (timerState === 'idle' || timerState === 'paused') { 
          setTimerState('running'); 
          endTimeRef.current = Date.now() + timeLeft * 1000;
          updatePresence({ state: 'focus', subject: selectedSubject, endTime: endTimeRef.current });
      } else { 
          setTimerState('paused'); 
          clearInterval(timerRef.current);
          updatePresence({ state: 'idle' });
      }
  }, [timerState, timeLeft, updatePresence, selectedSubject]);

  const handleModeSwitch = useCallback((mode: 'focus'|'short'|'long') => { 
      clearInterval(timerRef.current);
      setTimerMode(mode); 
      setTimerState('idle'); 
      setTimeLeft(durations[mode] * 60);
      updatePresence({ state: mode === 'focus' ? 'idle' : 'break', endTime: Date.now() + durations[mode] * 60 * 1000 });
  }, [durations, updatePresence]);

  const handleDurationUpdate = useCallback((newDuration: number, modeKey: 'focus'|'short'|'long') => {
      setDurations(prev => ({ ...prev, [modeKey]: newDuration }));
      if (timerMode === modeKey && timerState === 'idle') { setTimeLeft(newDuration * 60); }
  }, [timerMode, timerState, setDurations]);

  const value = {
    timerMode, timeLeft, timerState, durations, selectedSubject, setSelectedSubject,
    handleTimerToggle, handleTimerReset, handleModeSwitch, handleDurationUpdate, handleCompleteSession
  };

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
};

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (context === undefined) throw new Error('useTimer must be used within a TimerProvider');
  return context;
};
