import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Button } from './ui/button';

interface SubmitExamDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onExit: () => void;
  answeredCount: number;
  totalCount: number;
  isSubmitting: boolean;
  flaggedCount?: number;
  onReviewFlagged?: () => void;
}

export const SubmitExamDialog: React.FC<SubmitExamDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onExit,
  answeredCount,
  totalCount,
  isSubmitting,
  flaggedCount = 0,
  onReviewFlagged,
}) => {
  const unansweredCount = totalCount - answeredCount;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Submit Exam</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>Are you sure you want to submit your exam?</p>
              <div className="p-3 rounded text-sm">
                <div><strong>Answered:</strong> {answeredCount} of {totalCount} questions</div>
                {unansweredCount > 0 && (
                  <div className="text-amber-600">
                    <strong>Unanswered:</strong> {unansweredCount} questions
                  </div>
                )}
                {flaggedCount > 0 && (
                  <div className="text-red-600">
                    <strong>Flagged:</strong> {flaggedCount} questions
                  </div>
                )}
              </div>
              {flaggedCount > 0 && onReviewFlagged && (
                <div className="p-3 bg-red-50 dark:bg-red-950 rounded border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                    You have {flaggedCount} flagged question{flaggedCount !== 1 ? 's' : ''} that may need review.
                  </p>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      onReviewFlagged();
                      onClose();
                    }}
                    className="bg-red-700 hover:bg-red-800 text-white dark:bg-red-600 dark:hover:bg-red-700 border-0"
                  >
                    Review Flagged Questions
                  </Button>
                </div>
              )}
              <p className="text-sm text-foreground">
                Once submitted, you cannot make any changes to your answers.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onExit}>
            Save & Exit
          </Button>
          <AlertDialogCancel onClick={onClose}>
            Continue Exam
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Exam'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};