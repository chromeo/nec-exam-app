import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { AlertTriangle, Clock, LogOut, RefreshCw } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface SessionWarningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExtendSession: () => Promise<boolean>;
  onLogout: () => void;
  timeUntilExpiry?: number | null;
}

export const SessionWarningDialog: React.FC<SessionWarningDialogProps> = ({
  isOpen,
  onClose,
  onExtendSession,
  onLogout,
  timeUntilExpiry
}) => {
  const [isExtending, setIsExtending] = useState(false);
  const [countdown, setCountdown] = useState<number>(0);

  // Handle session extension
  const handleExtendSession = async () => {
    setIsExtending(true);
    try {
      const success = await onExtendSession();
      if (success) {
        onClose();
        toast.success('Session extended successfully', {
          description: 'You can continue working for another hour.',
          duration: 3000,
        });
      } else {
        toast.error('Failed to extend session', {
          description: 'Please save your work and log in again.',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error extending session:', error);
      toast.error('Error extending session', {
        description: 'Please save your work and log in again.',
        duration: 5000,
      });
    } finally {
      setIsExtending(false);
    }
  };

  // Handle logout with confirmation
  const handleLogout = () => {
    toast.info('Logging out...', {
      description: 'Make sure to save any unsaved work.',
      duration: 2000,
    });
    setTimeout(() => {
      onLogout();
    }, 1000);
  };

  // Countdown timer for auto-close
  useEffect(() => {
    if (!isOpen) return;

    // Start with 5 minutes countdown if no specific time provided
    const initialTime = timeUntilExpiry ? Math.floor(timeUntilExpiry * 60) : 300;
    setCountdown(initialTime);

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Auto-logout when countdown reaches 0
          toast.error('Session expired', {
            description: 'You have been automatically logged out.',
            duration: 5000,
          });
          onLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, timeUntilExpiry, onLogout]);

  // Format countdown time
  const formatCountdown = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Calculate urgency level for styling
  const getUrgencyLevel = (): 'low' | 'medium' | 'high' => {
    if (countdown <= 60) return 'high'; // Less than 1 minute
    if (countdown <= 180) return 'medium'; // Less than 3 minutes
    return 'low';
  };

  const urgencyLevel = getUrgencyLevel();

  return (
    <Dialog open={isOpen} onOpenChange={() => {}} modal>
      <DialogContent 
        className="max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`
              p-2 rounded-full
              ${urgencyLevel === 'high' ? 'bg-destructive/20' : 
                urgencyLevel === 'medium' ? 'bg-orange-500/20' : 
                'bg-yellow-500/20'}
            `}>
              <AlertTriangle className={`
                h-6 w-6
                ${urgencyLevel === 'high' ? 'text-destructive' : 
                  urgencyLevel === 'medium' ? 'text-orange-500' : 
                  'text-yellow-500'}
              `} />
            </div>
            <div>
              <DialogTitle className="text-left">
                Session Expiring Soon
              </DialogTitle>
              <DialogDescription className="text-left mt-1">
                Your session will expire automatically to protect your account
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Countdown Display */}
          <div className={`
            p-4 rounded-lg border text-center
            ${urgencyLevel === 'high' ? 'bg-destructive/10 border-destructive/20' : 
              urgencyLevel === 'medium' ? 'bg-orange-500/10 border-orange-500/20' : 
              'bg-yellow-500/10 border-yellow-500/20'}
          `}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className={`
                h-5 w-5
                ${urgencyLevel === 'high' ? 'text-destructive' : 
                  urgencyLevel === 'medium' ? 'text-orange-500' : 
                  'text-yellow-500'}
              `} />
              <span className="font-medium">Time Remaining</span>
            </div>
            <div className={`
              text-2xl font-mono font-bold
              ${urgencyLevel === 'high' ? 'text-destructive' : 
                urgencyLevel === 'medium' ? 'text-orange-600' : 
                'text-yellow-600'}
            `}>
              {formatCountdown(countdown)}
            </div>
          </div>

          {/* Warning Message */}
          <div className="bg-muted/30 p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>💾 Save your work now</strong> to avoid losing any changes. 
              You can extend your session to continue working or log out safely.
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          {/* Logout Button */}
          <Button
            variant="outline"
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Save & Logout
          </Button>
          
          {/* Extend Session Button */}
          <Button
            onClick={handleExtendSession}
            disabled={isExtending}
            className="flex items-center gap-2"
          >
            {isExtending ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Extending...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Extend Session
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};