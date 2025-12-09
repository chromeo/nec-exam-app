import React, { memo, useMemo, useCallback } from 'react';
import { Clock, Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { useExamTimer } from '../../hooks/useExamTimer';
import { usePerformanceOptimizations } from '../../hooks/usePerformanceOptimizations';

interface OptimizedExamTimerProps {
  duration: number; // Total exam duration in seconds
  onTimeUp?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  showControls?: boolean;
  size?: 'sm' | 'md' | 'lg';
  autoStart?: boolean;
}

/**
 * Optimized exam timer component with performance monitoring
 * Uses memoization and optimized rendering to prevent unnecessary updates
 */
export const OptimizedExamTimer: React.FC<OptimizedExamTimerProps> = memo(({
  duration,
  onTimeUp,
  onPause,
  onResume,
  showControls = false,
  size = 'md',
  autoStart = true
}) => {
  // Track component performance
  const { renderCount } = usePerformanceOptimizations();

  // Timer logic
  const {
    timeRemaining,
    isRunning,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    formatTime
  } = useExamTimer(onTimeUp);

  // Start timer automatically if specified
  React.useEffect(() => {
    if (autoStart && duration > 0) {
      startTimer(duration);
    }
  }, [autoStart, duration, startTimer]);

  // Memoized calculations to prevent unnecessary computations
  const timeInfo = useMemo(() => {
    const progress = duration > 0 ? ((duration - timeRemaining) / duration) * 100 : 0;
    const formattedTime = formatTime(timeRemaining);
    const percentRemaining = duration > 0 ? (timeRemaining / duration) * 100 : 0;
    
    // Determine urgency level for styling
    let urgencyLevel: 'normal' | 'warning' | 'critical' = 'normal';
    if (percentRemaining <= 10) {
      urgencyLevel = 'critical';
    } else if (percentRemaining <= 25) {
      urgencyLevel = 'warning';
    }

    return {
      progress,
      formattedTime,
      percentRemaining,
      urgencyLevel
    };
  }, [timeRemaining, duration, formatTime]);

  // Memoized styles based on size and urgency
  const styles = useMemo(() => {
    const sizeStyles = {
      sm: {
        container: 'text-sm',
        icon: 'h-4 w-4',
        button: 'h-7 w-7 p-0'
      },
      md: {
        container: 'text-base',
        icon: 'h-5 w-5',
        button: 'h-8 w-8 p-0'
      },
      lg: {
        container: 'text-lg',
        icon: 'h-6 w-6',
        button: 'h-9 w-9 p-0'
      }
    };

    const urgencyStyles = {
      normal: 'text-foreground',
      warning: 'text-yellow-600 dark:text-yellow-400',
      critical: 'text-red-600 dark:text-red-400 animate-pulse'
    };

    return {
      ...sizeStyles[size],
      urgency: urgencyStyles[timeInfo.urgencyLevel]
    };
  }, [size, timeInfo.urgencyLevel]);

  // Memoized event handlers
  const handlePause = useCallback(() => {
    pauseTimer();
    onPause?.();
  }, [pauseTimer, onPause]);

  const handleResume = useCallback(() => {
    resumeTimer();
    onResume?.();
  }, [resumeTimer, onResume]);

  const handleReset = useCallback(() => {
    resetTimer();
    if (duration > 0) {
      startTimer(duration);
    }
  }, [resetTimer, startTimer, duration]);

  // Progress bar color based on urgency
  const progressColor = useMemo(() => {
    switch (timeInfo.urgencyLevel) {
      case 'critical': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-primary';
    }
  }, [timeInfo.urgencyLevel]);

  if (process.env.NODE_ENV === 'development') {
    // Log excessive renders in development
    if (renderCount > 100) {
      console.warn(`ExamTimer has rendered ${renderCount} times`);
    }
  }

  return (
    <div className={`flex items-center gap-3 ${styles.container}`}>
      {/* Timer Icon */}
      <Clock className={`${styles.icon} ${styles.urgency}`} />
      
      {/* Time Display */}
      <div className="flex flex-col items-center gap-1">
        <div className={`font-mono font-semibold tabular-nums ${styles.urgency} ${
          timeInfo.urgencyLevel === 'normal' ? 'timer-normal' : 
          timeInfo.urgencyLevel === 'warning' ? 'timer-warning' : 'timer-critical'
        }`}>
          {timeInfo.formattedTime}
        </div>
        
        {/* Progress Bar */}
        <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden theme-shadow-sm">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${progressColor}`}
            style={{ width: `${timeInfo.progress}%` }}
          />
        </div>
      </div>

      {/* Status Badge */}
      <Badge 
        variant={timeInfo.urgencyLevel === 'normal' ? 'secondary' : 'destructive'}
        className="text-xs"
      >
        {isRunning ? 'Running' : 'Paused'}
      </Badge>

      {/* Controls */}
      {showControls && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={isRunning ? handlePause : handleResume}
            className={styles.button}
            title={isRunning ? 'Pause timer' : 'Resume timer'}
          >
            {isRunning ? (
              <Pause className={styles.icon} />
            ) : (
              <Play className={styles.icon} />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className={styles.button}
            title="Reset timer"
          >
            <RotateCcw className={styles.icon} />
          </Button>
        </div>
      )}

      {/* Development Performance Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-muted-foreground ml-2">
          R: {renderCount}
        </div>
      )}
    </div>
  );
});

OptimizedExamTimer.displayName = 'OptimizedExamTimer';

/**
 * Hook for managing exam timer state across components
 */
export function useOptimizedExamTimer(
  duration: number,
  options: {
    onTimeUp?: () => void;
    onWarning?: (secondsRemaining: number) => void;
    warningThreshold?: number;
    syncInterval?: number;
  } = {}
) {
  const {
    onTimeUp,
    onWarning,
    warningThreshold = 300, // 5 minutes
    syncInterval = 30000 // 30 seconds
  } = options;

  const timer = useExamTimer(onTimeUp);
  const [lastSync, setLastSync] = React.useState(Date.now());

  // Warning notification
  React.useEffect(() => {
    if (timer.timeRemaining <= warningThreshold && timer.timeRemaining > 0) {
      onWarning?.(timer.timeRemaining);
    }
  }, [timer.timeRemaining, warningThreshold, onWarning]);

  // Periodic sync (useful for server synchronization)
  React.useEffect(() => {
    if (!timer.isRunning) return;

    const interval = setInterval(() => {
      setLastSync(Date.now());
      // Here you could sync with server if needed
    }, syncInterval);

    return () => clearInterval(interval);
  }, [timer.isRunning, syncInterval]);

  return {
    ...timer,
    lastSync,
    warningActive: timer.timeRemaining <= warningThreshold && timer.timeRemaining > 0
  };
}