import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Clock, BookOpen, Calendar, Trash2 } from 'lucide-react';
import { getAllSavedExams, deleteExamProgress, SavedExamProgress } from '../utils/examProgress';

interface ResumeExamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResumeExam: (progress: SavedExamProgress) => void;
}

export function ResumeExamDialog({ open, onOpenChange, onResumeExam }: ResumeExamDialogProps) {
  const [savedExams, setSavedExams] = useState<SavedExamProgress[]>([]);

  useEffect(() => {
    if (open) {
      setSavedExams(getAllSavedExams());
    }
  }, [open]);

  const formatTimeRemaining = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProgressPercentage = (progress: SavedExamProgress) => {
    const answeredCount = Object.keys(progress.answers).length;
    return Math.round((answeredCount / progress.questions.length) * 100);
  };

  const handleDeleteExam = (examId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    deleteExamProgress(examId);
    setSavedExams(getAllSavedExams());
  };

  if (savedExams.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resume Exam</DialogTitle>
            <DialogDescription>
              No saved exam progress found.
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              You don't have any saved exam progress to resume.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Resume Exam</DialogTitle>
          <DialogDescription>
            Select an exam to continue where you left off.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {savedExams.map((exam) => (
            <Card
              key={exam.examId}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                onResumeExam(exam);
                onOpenChange(false);
              }}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{exam.examTitle}</CardTitle>
                    <CardDescription className="mt-1">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Saved: {formatDate(exam.savedAt)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>Time left: {formatTimeRemaining(exam.timeRemaining)}</span>
                        </div>
                      </div>
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-red-50"
                    onClick={(e) => handleDeleteExam(exam.examId, e)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Progress</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${getProgressPercentage(exam)}%` }}
                        />
                      </div>
                      <span className="font-medium">{getProgressPercentage(exam)}%</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Questions</span>
                      <div className="font-medium">
                        {Object.keys(exam.answers).length} / {exam.questions.length}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Current</span>
                      <div className="font-medium">#{exam.currentQuestionIndex + 1}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Flagged</span>
                      <div className="font-medium">
                        {Object.values(exam.flags).filter(Boolean).length}
                      </div>
                    </div>
                  </div>

                  {exam.config.categories && exam.config.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {exam.config.categories.map((category) => (
                        <Badge key={category} variant="secondary" className="text-xs">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}