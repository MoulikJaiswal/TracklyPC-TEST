import { useState, useEffect, useRef } from 'react';
import { FocusRoom } from '../types';

export const useGroupTimer = (room: FocusRoom | null) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    if (!room) {
        setTimeLeft(0);
        setProgress(0);
        return;
    }

    const calculateTime = () => {
      const { status, startTime, endTime, pausedAt } = room.state;

      // If waiting, show full duration
      if (status === 'waiting' || status === 'completed') {
        const defaultDuration = room.config.focusDuration * 60;
        setTimeLeft(defaultDuration);
        setProgress(0);
        return;
      }

      const now = Date.now();
      
      // If paused, time is frozen at the moment of pause
      if (pausedAt && startTime && endTime) {
        // Calculate remaining based on original duration minus elapsed time before pause
        const totalDurationMs = (room.config.focusDuration * 60 * 1000);
        const elapsedBeforePause = pausedAt - startTime;
        const remainingMs = Math.max(0, totalDurationMs - elapsedBeforePause);
        
        setTimeLeft(Math.ceil(remainingMs / 1000));
        setProgress((elapsedBeforePause / totalDurationMs) * 100);
        return;
      }

      // Running
      if (startTime && endTime) {
          const totalDurationMs = endTime - startTime;
          const remainingMs = Math.max(0, endTime - now);
          
          setTimeLeft(Math.ceil(remainingMs / 1000));
          
          const elapsed = now - startTime;
          const pct = Math.min(100, Math.max(0, (elapsed / totalDurationMs) * 100));
          setProgress(pct);
      }
    };

    calculateTime();
    intervalRef.current = setInterval(calculateTime, 1000);

    return () => clearInterval(intervalRef.current);
  }, [room]);

  return { timeLeft, progress };
};