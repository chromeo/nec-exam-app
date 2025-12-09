import React, { useState } from 'react';
import { ExamSelectionView } from './views/ExamSelectionView';
import { ExamTakingView } from './views/ExamTakingView';
import { ExamResultsView } from './views/ExamResultsView';
import { ExamReviewView } from './views/ExamReviewView';
import { useUnifiedExam } from '../../hooks/useUnifiedExam';
import { useExamTimer } from '../../hooks/useExamTimer';
import { SavedExamProgress, saveExamProgress, deleteExamProgress } from '../../utils/examProgress';
import type { ExamTemplate, ExamSession } from '../../supabase/functions/server/types';
import { getTimeLimit, getQuestionCount } from '../../utils/typeConverters';
import { Button } from '../ui/button';

// Re-export for backwards compatibility
export type { ExamTemplate, ExamSession };

export type ExamView = 'selection' | 'taking' | 'results' | 'review';

interface ExamManagerProps {
  accessToken: string;
  userProfile: any;
  isAdmin?: boolean; // NEW: For mobile header
  initialTemplate?: ExamTemplate | null; // NEW: Optional initial template to start immediately
  onBack: () => void;
  onAdminView?: () => void; // NEW: For mobile header
  onProfileView?: () => void; // NEW: For mobile header
  onLogout?: () => void; // NEW: For mobile header
}

export const ExamManager: React.FC<ExamManagerProps> = ({
  accessToken,
  userProfile,
  isAdmin,
  initialTemplate, // NEW: Receive initial template
  onBack,
  onAdminView,
  onProfileView,
  onLogout,
}) => {
  const [currentView, setCurrentView] = useState<ExamView>('selection');
  const [examResults, setExamResults] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [completedExamSession, setCompletedExamSession] = useState<ExamSession | null>(null);

  // Unified exam management
  const {
    examSession,
    isLoading,
    error,
    startExam,
    submitExam,
    exitExam,
  } = useUnifiedExam(accessToken, userProfile);

  // Timer management with auto-submit
  const timer = useExamTimer(() => {
    handleSubmitExam();
  });

  // NEW: Auto-start exam if initial template is provided
  React.useEffect(() => {
    if (initialTemplate && currentView === 'selection') {
      handleStartExam(initialTemplate);
    }
  }, [initialTemplate]); // Remove currentView from dependencies to prevent loops

  const handleStartExam = async (template: ExamTemplate, isDemo = false) => {
    const result = await startExam(template, isDemo);
    
    if (result.success && result.session) {
      // Start the timer
      const timeLimit = result.session.timeLimit;
      timer.startTimer(timeLimit);
      setCurrentView('taking');
    } else {
      console.error('❌ ❌ [ExamManager.tsx:117] Failed to start exam:', {
        error: result.error,
        success: result.success,
        hasSession: !!result.session,
        fullResult: result
      });
      alert('Failed to start exam. Please try again. Error: ' + result.error);
    }
  };

  const handleSubmitExam = async (
    currentAnswers?: Record<string, string>,
    questionComments?: Record<string, string>,
    flaggedQuestions?: Record<string, boolean>
  ) => {
    timer.pauseTimer();
    
    const result = await submitExam(currentAnswers, questionComments, flaggedQuestions);
    
    if (result.success) {
      // Clear saved progress since exam is now completed
      if (examSession?.id) {
        deleteExamProgress(examSession.id);
      }
      
      // Add exam title to results data
      const resultsWithTitle = {
        ...result.data,
        examTitle: examSession?.title || 'Unknown Exam'
      };
      setExamResults(resultsWithTitle);
      setCurrentView('results');
      setCompletedExamSession(examSession);
    } else {
      console.error('❌ ExamManager: Failed to submit exam:', result.error);
      // Show error in a less intrusive way instead of alert
      console.error('❌ ExamManager: Submission failed, resuming timer');
      timer.resumeTimer();
    }
  };

  const handleResumeExam = async (progress: SavedExamProgress) => {
    try{
      // Create exam session from saved progress
      const examSession = {
        id: progress.examId,
        studentId: progress.studentId,
        title: progress.examTitle,
        questions: progress.questions,
        timeLimit: progress.timeRemaining,
        currentQuestionIndex: progress.currentQuestionIndex,
        answers: progress.answers,
        comments: progress.comments,
        flags: progress.flags,
        bookmarks: progress.bookmarks,
        eliminatedAnswers: progress.eliminatedAnswers,
        startedAt: progress.startedAt,
      };

      // Resume the exam using the saved progress
      const result = await startExam(null, false, progress);
      
      if (result.success && result.session) {
        // Start the timer with remaining time
        timer.startTimer(progress.timeRemaining);
        
        setCurrentView('taking');
      } else {
        console.error('❌ ExamManager: Failed to resume exam:', result.error);
        alert('Failed to resume exam. Please try again. Error: ' + result.error);
      }
    } catch (error) {
      console.error('❌ ExamManager: Error resuming exam:', error);
      alert('Failed to resume exam. Please try again.');
    }
  };

  const handleExitExam = (examState?: {
    currentQuestionIndex: number;
    answers: Record<string, string>;
    questionComments: Record<string, string>;
    flaggedQuestions: Record<string, boolean>;
    eliminatedAnswers: Record<string, string[]>;
    questionHighlights: any;
  }) => {
    // Save progress before exiting if we have an active exam session and exam state
    if (examSession && examState) {
      try {
        const progressData: SavedExamProgress = {
          examId: examSession.id,
          examTitle: examSession.title || 'Untitled Exam',
          studentId: examSession.user_id || userProfile?.id || 'anonymous',
          questions: examSession.questions,
          config: {
            questionCount: examSession.questions.length,
            timeLimit: examSession.timeLimit,
            categories: [...new Set(examSession.questions.map((q: any) => q.category))],
            title: examSession.title || 'Untitled Exam',
          },
          currentQuestionIndex: examState.currentQuestionIndex,
          answers: Object.fromEntries(
            Object.entries(examState.answers).map(([key, value]) => [
              key, 
              { 
                answer: parseInt(value) || 0, 
                flagged: examState.flaggedQuestions[key] || false 
              }
            ])
          ),
          comments: examState.questionComments,
          flags: examState.flaggedQuestions,
          bookmarks: {}, // Not currently tracked
          eliminatedAnswers: Object.fromEntries(
            Object.entries(examState.eliminatedAnswers).map(([key, values]) => [
              key, 
              new Set(values.map(v => parseInt(v) || 0))
            ])
          ),
          timeRemaining: timer.timeRemaining,
          savedAt: new Date().toISOString(),
          startedAt: examSession.started_at || new Date().toISOString(),
        };
        
        // Save to localStorage
        saveExamProgress(progressData);
      } catch (error) {
        console.error('❌ ExamManager: Failed to save progress:', error);
      }
    }
    
    exitExam();
    timer.resetTimer();
    setCurrentView('selection');
    setRefreshKey(prev => prev + 1); // Force refresh of ExamSelectionView
  };

  const handleBackToSelection = () => {
    // Clear any remaining saved progress to prevent loop issues
    if (examSession?.id) {
      deleteExamProgress(examSession.id);
    }
    
    // Reset all exam state
    setCurrentView('selection');
    setExamResults(null);
    exitExam(); // Properly clear exam session using the hook's method
    
    // Force refresh of ExamSelectionView to show updated saved exams list
    setRefreshKey(prev => prev + 1);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-xl font-semibold text-foreground mb-2">
            Loading exam...
          </div>
          <div className="text-muted-foreground">
            Please wait while we prepare your exam
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <div className="text-xl font-semibold text-destructive mb-2">
            Error Loading Exam
          </div>
          <div className="text-muted-foreground mb-4">
            {error}
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Back to Main
          </button>
        </div>
      </div>
    );
  }

  // Route to appropriate view
  switch (currentView) {
    case 'selection':
      return (
        <ExamSelectionView
          key={refreshKey}
          accessToken={accessToken}
          onStartExam={handleStartExam}
          onResumeExam={handleResumeExam}
          onBack={onBack}
        />
      );
      
    case 'taking':
      return (
        <ExamTakingView
          examSession={examSession!}
          timer={timer}
          userProfile={userProfile}
          isAdmin={isAdmin}
          onSubmitExam={handleSubmitExam}
          onExitExam={handleExitExam}
          onAdminView={onAdminView}
          onProfileView={onProfileView}
          onLogout={onLogout}
        />
      );
      
    case 'results':
      return (
        <ExamResultsView
          results={examResults}
          examSession={completedExamSession}
          onBackToSelection={handleBackToSelection}
          onBackToMain={handleBackToSelection}
          onReviewExam={() => setCurrentView('review')}
        />
      );
      
    case 'review':
      if (!completedExamSession || !examResults) {
        return (
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
              <div className="text-xl font-semibold text-foreground mb-2">
                Unable to load review
              </div>
              <Button onClick={handleBackToSelection} className="mt-4">
                Back to Exam Selection
              </Button>
            </div>
          </div>
        );
      }
      
      // Build a map of questionId -> correctAnswer from server's detailedResults
      // (correctAnswer was stripped from questions during exam for security)
      const correctAnswersMap: Record<string, number> = {};
      const userAnswers: Record<string, number> = {};
      const codeReferencesMap: Record<string, string> = {}; // ADD: Map for code references from server
      
      if (examResults.detailedResults && Array.isArray(examResults.detailedResults)) {
        examResults.detailedResults.forEach((result: any) => {
          if (result.questionId) {
            // Only store correct answer if the question was actually answered
            // Don't give away answers for questions they didn't attempt
            const wasAnswered = result.userAnswer !== undefined && result.userAnswer !== null;
            
            if (wasAnswered && result.correctAnswer !== undefined && result.correctAnswer !== null) {
              correctAnswersMap[result.questionId] = result.correctAnswer;
            }
            // Store the user's answer
            if (result.userAnswer !== undefined && result.userAnswer !== null) {
              userAnswers[result.questionId] = result.userAnswer;
            }
            // ADD: Store the code reference from server response
            if (result.code_reference) {
              codeReferencesMap[result.questionId] = result.code_reference;
            }
          }
        });
      }
      
      // Transform questions to the format expected by ExamReviewView
      // Use correctAnswersMap to inject the correct answers (which were stripped during exam for security)
      // Use codeReferencesMap to inject the code references from server
      const questions = completedExamSession.questions.map((q: any) => ({
        id: q.id,
        question: q.question || q.text,
        options: [q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean),
        correctAnswer: correctAnswersMap[q.id], // Only set if question was answered (undefined otherwise)
        explanation: q.explanation,
        category: q.category,
        code_reference: codeReferencesMap[q.id] || q.code_reference, // Try server response first, fall back to question data
      }));
      
      return (
        <ExamReviewView
          questions={questions}
          userAnswers={userAnswers}
          accessToken={accessToken}
          onBack={() => setCurrentView('results')}
        />
      );
      
    default:
      return null;
  }
};