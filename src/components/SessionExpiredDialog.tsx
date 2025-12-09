import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { AlertTriangle, LogIn } from 'lucide-react';

interface SessionExpiredDialogProps {
  isOpen: boolean;
  onGoToLogin: () => void;
}

/**
 * Dialog shown when user's session has expired
 * Provides clear messaging and a direct link back to login
 */
export const SessionExpiredDialog: React.FC<SessionExpiredDialogProps> = ({
  isOpen,
  onGoToLogin,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={() => {}} modal>
      <DialogContent 
        className="max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-destructive/20">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-left">
                Session Expired
              </DialogTitle>
              <DialogDescription className="text-left mt-1">
                You've been logged out due to inactivity
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
          <p className="text-sm text-foreground">
            For security reasons, you've been automatically logged out after a period of inactivity.
          </p>
        </div>

        <DialogFooter>
          <Button
            onClick={onGoToLogin}
            className="w-full flex items-center justify-center gap-2"
          >
            <LogIn className="h-4 w-4" />
            Go to Login Page
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
