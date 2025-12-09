import { useState, useEffect, useRef, useCallback } from 'react';

interface UseExamTimerReturn {
  timeRemaining: number;
  isRunning: boolean;
  startTimer: (duration: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  setTimeRemaining: (time: number) => void;
  formatTime: (seconds: number) => string;
}

export const useExamTimer = (onTimeUp?: () => void): UseExamTimerReturn => {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }, []);

  const startTimer = useCallback((duration: number) => {
    setTimeRemaining(duration);
    setIsRunning(true);
  }, []);

  const pauseTimer = useCallback(() => {
    setIsRunning(false);
  }, []);

  const resumeTimer = useCallback(() => {
    setIsRunning(true);
  }, []);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setTimeRemaining(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Timer effect
  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            if (onTimeUp) {
              onTimeUp();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, timeRemaining, onTimeUp]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    timeRemaining,
    isRunning,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    setTimeRemaining,
    formatTime,
  };
};