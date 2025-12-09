import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { getTimeUntilExpiry, getTimeUntilExpiryString, isTokenExpiringSoon } from '../utils/tokenUtils';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface SessionTimerProps {
  accessToken: string | null;
  className?: string;
}

/**
 * Displays remaining session time to the user
 * Shows a countdown and changes color as expiry approaches
 */
export const SessionTimer: React.FC<SessionTimerProps> = ({ accessToken, className = '' }) => {
  const [timeRemaining, setTimeRemaining] = useState<string>('--');
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);
  const [isCritical, setIsCritical] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      setTimeRemaining('--');
      return;
    }

    const updateTimer = () => {
      const timeUntilExpiry = getTimeUntilExpiry(accessToken);
      
      if (timeUntilExpiry === null) {
        setTimeRemaining('Invalid');
        return;
      }

      if (timeUntilExpiry <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const timeString = getTimeUntilExpiryString(accessToken);
      setTimeRemaining(timeString);

      // Update urgency states
      const tenMinutes = 10 * 60 * 1000;
      const fiveMinutes = 5 * 60 * 1000;
      
      setIsCritical(timeUntilExpiry <= fiveMinutes);
      setIsExpiringSoon(timeUntilExpiry <= tenMinutes && timeUntilExpiry > fiveMinutes);
    };

    // Update immediately
    updateTimer();

    // Update every 10 seconds
    const interval = setInterval(updateTimer, 10000);

    return () => clearInterval(interval);
  }, [accessToken]);

  if (!accessToken) {
    return null;
  }

  const getColorClass = () => {
    if (isCritical) {
      return 'text-destructive';
    }
    if (isExpiringSoon) {
      return 'text-orange-500';
    }
    return 'text-muted-foreground';
  };

  const getTooltipContent = () => {
    if (isCritical) {
      return 'Session expiring soon! Save your work.';
    }
    if (isExpiringSoon) {
      return 'Session will expire in less than 10 minutes.';
    }
    return 'Time until your session expires.';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`flex items-center gap-2 ${className}`}
          >
            <Clock className={`h-4 w-4 ${getColorClass()}`} />
            <span className={`text-sm ${getColorClass()}`}>
              {timeRemaining}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipContent()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
