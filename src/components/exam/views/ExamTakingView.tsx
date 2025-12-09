import React, { useState, useEffect, useMemo } from 'react';
import { ExamInterface } from '../../ExamInterface';
import { SubmitExamDialog } from '../../SubmitExamDialog';
import { TourSystem } from '../../tour/TourSystem';
import { ExamSession } from '../ExamManager';
import { useExamTimer } from '../../../hooks/useExamTimer';
import { Question, HighlightData } from '../../../hooks/useExam';
import { toast } from 'sonner@2.0.3';

interface ExamTakingViewProps {
  examSession: ExamSession | null;
  timer: ReturnType<typeof useExamTimer>;
  userProfile?: any; // NEW: For mobile header
  isAdmin?: boolean; // NEW: For mobile header
  onSubmitExam: (
    currentAnswers?: Record<string, string>,
    questionComments?: Record<string, string>,
    flaggedQuestions?: Record<string, boolean>
  ) => void;
  onExitExam: (examState?: {
    currentQuestionIndex: number;
    answers: Record<string, string>;
    questionComments: Record<string, string>;
    flaggedQuestions: Record<string, boolean>;
    eliminatedAnswers: Record<string, string[]>;
    questionHighlights: Record<string, HighlightData[]>;
  }) => void;
  onAdminView?: () => void; // NEW: For mobile header
  onProfileView?: () => void; // NEW: For mobile header
  onLogout?: () => void; // NEW: For mobile header
}

export const ExamTakingView: React.FC<ExamTakingViewProps> = ({
  examSession,
  timer,
  userProfile,
  isAdmin,
  onSubmitExam,
  onExitExam,
  onAdminView,
  onProfileView,
  onLogout,
}) => {
  // Guard clause: Return early if examSession is null (after submission)
  if (!examSession) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-xl font-semibold text-foreground mb-2">
            Processing exam submission...
          </div>
          <div className="text-muted-foreground">
            Please wait while we finalize your results
          </div>
        </div>
      </div>
    );
  }

  // Local state for exam-taking functionality - initialize from session data for resume support
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(examSession.currentQuestionIndex || 0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    // Convert answers from session (which may be numbers) to strings for UI
    const sessionAnswers = examSession.answers || {};
    return Object.fromEntries(
      Object.entries(sessionAnswers).map(([key, value]) => [key, String(value)])
    );
  });
  const [eliminatedAnswers, setEliminatedAnswers] = useState<Record<string, string[]>>(() => {
    // Convert eliminated answers from Set<number> to string[] for UI
    const sessionEliminated = examSession.eliminatedAnswers || {};
    return Object.fromEntries(
      Object.entries(sessionEliminated).map(([key, value]) => [
        key, 
        Array.from(value instanceof Set ? value : new Set(value)).map(String)
      ])
    );
  });
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>(examSession.flags || {});
  const [questionComments, setQuestionComments] = useState<Record<string, { text: string; category: string }>>(
    // Convert legacy string format to new object format for backward compatibility
    Object.fromEntries(
      Object.entries(examSession.comments || {}).map(([key, value]) => [
        key,
        typeof value === 'string' ? { text: value, category: 'Uncategorized' } : value
      ])
    )
  );
  const [questionHighlights, setQuestionHighlights] = useState<Record<string, HighlightData[]>>({});
  const [leftPaneWidth, setLeftPaneWidth] = useState(60);
  
  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Right pane: Start collapsed on mobile, normal on desktop
  const [rightPaneCollapsed, setRightPaneCollapsed] = useState(isMobile);
  
  // Update collapsed state when switching between mobile/desktop
  useEffect(() => {
    // On mobile, always start collapsed
    // On desktop, keep user's preference
    if (isMobile && !rightPaneCollapsed) {
      // When switching to mobile, collapse the pane
      setRightPaneCollapsed(true);
    }
  }, [isMobile]);
  
  const [currentCategory, setCurrentCategory] = useState('All Categories');
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rightPaneFilter, setRightPaneFilter] = useState<string>('answered');
  
  // Tour system state - only show for new exams (not resumed)
  // Check localStorage to see if user has dismissed tour before
  const [showTour, setShowTour] = useState(() => {
    // Don't show tour if exam is being resumed
    if (examSession.currentQuestionIndex) return false;
    
    // Check if user has previously dismissed the tour
    const tourDismissed = localStorage.getItem('examTourDismissed');
    const shouldShowTour = tourDismissed !== 'true';
    console.log('🎪 [ExamTakingView.tsx:88] Tour initialization:', {
      isResumedExam: !!examSession.currentQuestionIndex,
      tourDismissed,
      shouldShowTour
    });
    return shouldShowTour;
  });
  const [examStarted, setExamStarted] = useState(() => {
    // Show exam immediately if:
    // 1. This is a resumed exam (has currentQuestionIndex), OR
    // 2. Tour was previously dismissed (user doesn't want to see it)
    const isResumedExam = !!examSession.currentQuestionIndex;
    const tourDismissed = localStorage.getItem('examTourDismissed') === 'true';
    const started = isResumedExam || tourDismissed;
    
    console.log('🏁 [ExamTakingView.tsx:96] Exam started initialization:', {
      currentQuestionIndex: examSession.currentQuestionIndex,
      isResumedExam,
      tourDismissed,
      examStarted: started
    });
    
    return started;
  });
  const [tourInProgress, setTourInProgress] = useState(false);

  // FIXED: Memoize the questions array to prevent unnecessary re-renders
  const questions: Question[] = useMemo(() => 
    examSession.questions.map(q => ({
      id: q.id,
      question: q.question || q.text,
      options: [q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean),
      correctAnswer: q.correct_answer,
      category: q.category,
      difficulty: q.difficulty,
      explanation: q.explanation
    })), [examSession.questions]
  );

  // Get answered questions
  const answeredQuestions = questions.filter(q => answers[q.id]);

  // FIXED: Update selected answer when question changes - removed 'questions' from dependencies
  useEffect(() => {
    const currentQuestion = questions[currentQuestionIndex];
    if (currentQuestion) {
      const existingAnswer = answers[currentQuestion.id] || '';
      setSelectedAnswer(existingAnswer);
    }
  }, [currentQuestionIndex, answers]); // Removed 'questions' from dependencies

  // DEBUG: Watch selectedAnswer changes
  useEffect(() => {
  }, [selectedAnswer]);

  // DEBUG: Log restored state when session is resumed
  useEffect(() => {
    if (examSession.currentQuestionIndex !== undefined) {
      console.log('🔄 ExamTakingView: Restoring exam state from saved progress:', {
        currentQuestionIndex: examSession.currentQuestionIndex,
        answersCount: Object.keys(answers).length,
        flagsCount: Object.keys(flaggedQuestions).length,
        commentsCount: Object.keys(questionComments).length,
        eliminatedCount: Object.keys(eliminatedAnswers).length,
        sessionData: {
          flags: examSession.flags,
          comments: examSession.comments,
          answers: examSession.answers
        }
      });
    }
  }, [examSession, answers, flaggedQuestions, questionComments, eliminatedAnswers]);

  const handleAnswerSelect = (answer: string) => {
    console.log('🎯 ExamTakingView: handleAnswerSelect called with:', answer);
    
    // Use functional update to ensure we get the most recent state
    setSelectedAnswer(prevSelected => {
      console.log('🎯 ExamTakingView: setSelectedAnswer - previous:', prevSelected, '→ new:', answer);
      return answer;
    });
  };

  const handleAnswerSubmit = async () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion || !selectedAnswer) {
      console.log('❌ ExamTakingView: Cannot submit - missing question or answer', {
        currentQuestion: currentQuestion?.id,
        selectedAnswer
      });
      return;
    }

    // Save answer
    const newAnswers = { ...answers, [currentQuestion.id]: selectedAnswer };
    setAnswers(newAnswers);

    console.log('✅ ExamTakingView: Answer saved for question', currentQuestion.id, 'Answer:', selectedAnswer);

    // AUTO-ADVANCE: Move to next question after submitting answer
    const isLastQuestion = currentQuestionIndex === questions.length - 1;
    
    if (isLastQuestion) {
      // Small delay to ensure the save operation completes, then show submit dialog
      setTimeout(() => {
        setShowSubmitDialog(true);
      }, 500);
    } else {
      // Auto-advance to next question
      const nextQuestionIndex = currentQuestionIndex + 1;
      console.log('🔄 ExamTakingView: Auto-advancing to question', nextQuestionIndex + 1);
      setCurrentQuestionIndex(nextQuestionIndex);
    }
  };

  // Navigation-triggered auto-save handler
  const handleQuestionChange = (newIndex: number) => {
    const currentQuestion = questions[currentQuestionIndex];
    
    // Check if there's a selected answer that hasn't been submitted yet
    const hasUnsavedAnswer = currentQuestion && 
      selectedAnswer && 
      selectedAnswer !== answers[currentQuestion.id];
    
    // Check if the question has no answer at all (not selected, not saved)
    const hasNoAnswer = currentQuestion && 
      !selectedAnswer && 
      answers[currentQuestion.id] === undefined;
    
    if (hasUnsavedAnswer) {
      // Auto-save the selected answer
      const newAnswers = { ...answers, [currentQuestion.id]: selectedAnswer };
      setAnswers(newAnswers);
      
      console.log('💾 ExamTakingView: Auto-saved answer on navigation for question', currentQuestion.id);
      
      // Show subtle toast notification
      toast.success('Answer saved', {
        duration: 2000,
        className: 'text-sm',
      });
    } else if (hasNoAnswer) {
      // Notify user they're skipping the question
      console.log('⚠️ ExamTakingView: Navigating away from unanswered question', currentQuestion.id);
      
      // Show warning toast notification
      toast.warning('No Answer Selected', {
        duration: 2000,
        className: 'text-sm',
      });
    }
    
    // Proceed with navigation
    setCurrentQuestionIndex(newIndex);
  };

  const handleAnswerClear = () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;

    const newAnswers = { ...answers };
    delete newAnswers[currentQuestion.id];
    setAnswers(newAnswers);
    setSelectedAnswer('');
  };

  const handleAnswerEliminate = (option: string) => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;

    const currentEliminated = eliminatedAnswers[currentQuestion.id] || [];
    const newEliminated = currentEliminated.includes(option)
      ? currentEliminated.filter(o => o !== option)
      : [...currentEliminated, option];

    setEliminatedAnswers({
      ...eliminatedAnswers,
      [currentQuestion.id]: newEliminated
    });
  };

  const handleResetEliminations = () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;

    const newEliminated = { ...eliminatedAnswers };
    delete newEliminated[currentQuestion.id];
    setEliminatedAnswers(newEliminated);
  };

  const handleQuestionFlag = () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;

    setFlaggedQuestions({
      ...flaggedQuestions,
      [currentQuestion.id]: !flaggedQuestions[currentQuestion.id]
    });
  };

  const handleQuestionComment = (commentData: { text: string; category: string }) => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;

    if (commentData.text.trim()) {
      setQuestionComments({
        ...questionComments,
        [currentQuestion.id]: commentData
      });
    } else {
      const newComments = { ...questionComments };
      delete newComments[currentQuestion.id];
      setQuestionComments(newComments);
    }
  };

  const handleAddHighlight = (highlight: HighlightData) => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;

    const currentHighlights = questionHighlights[currentQuestion.id] || [];
    setQuestionHighlights({
      ...questionHighlights,
      [currentQuestion.id]: [...currentHighlights, highlight]
    });
  };

  const handleRemoveQuestionHighlights = () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;

    const newHighlights = { ...questionHighlights };
    delete newHighlights[currentQuestion.id];
    setQuestionHighlights(newHighlights);
  };

  const handleSubmitExamClick = () => {
    setShowSubmitDialog(true);
  };

  const handleReviewFlagged = () => {
    // Find the first flagged question
    const firstFlaggedIndex = questions.findIndex(q => flaggedQuestions[q.id]);
    
    if (firstFlaggedIndex !== -1) {
      // Navigate to the first flagged question
      setCurrentQuestionIndex(firstFlaggedIndex);
    }
    
    // Set right pane to show flagged questions and expand if collapsed
    setRightPaneCollapsed(false);
    setRightPaneFilter('flagged');
  };

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    
    // REMOVED: Validation for empty exam submission - now allows zero answers
    // REMOVED: Browser confirm dialog - no more popup interruptions
    
    // Log submission details for debugging
    const answeredCount = Object.keys(answers).length;
    console.log(`📝 ExamTakingView: Submitting exam with ${answeredCount}/${questions.length} questions answered`);
    
    // Include comment and flag data in submission
    await onSubmitExam(answers, questionComments, flaggedQuestions);
    setIsSubmitting(false);
  };

  const handleExitWithState = () => {
    const examState = {
      currentQuestionIndex,
      answers,
      questionComments,
      flaggedQuestions,
      eliminatedAnswers,
      questionHighlights,
    };
    onExitExam(examState);
  };

  const handleTourStart = () => {
    setShowTour(false);
    setTourInProgress(true);
    setExamStarted(true); // Show exam interface so tour can overlay it
    timer.pauseTimer(); // ⏸️ PAUSE timer during tour
    console.log('🎬 [ExamTakingView] Tour started - timer PAUSED');
    // Don't mark as dismissed if they take the tour - they might want to see it again later
  };

  const handleTourExit = () => {
    setShowTour(false);
    setTourInProgress(false);
    setExamStarted(true);
    if (tourInProgress) {
      timer.resumeTimer(); // ▶️ RESUME timer after tour completes
      console.log('✅ [ExamTakingView] Tour completed - timer RESUMED');
    }
    // Mark tour as dismissed when user exits (completes or skips tour)
    localStorage.setItem('examTourDismissed', 'true');
  };

  const handleTourCancel = () => {
    // Mark tour as dismissed when user goes back
    localStorage.setItem('examTourDismissed', 'true');
    // Cancel and return to exam selection without starting the exam
    onExitExam();
  };

  return (
    <>
      {/* Tour System */}
      <TourSystem
        isVisible={showTour && !examStarted}
        onStart={handleTourStart}
        onExit={handleTourExit}
        onCancel={handleTourCancel}
      />

      {/* Only show exam interface after tour decision */}
      {examStarted && (
        <ExamInterface
          questions={questions}
          currentQuestionIndex={currentQuestionIndex}
          selectedAnswer={selectedAnswer}
          answers={answers}
          eliminatedAnswers={eliminatedAnswers}
          flaggedQuestions={flaggedQuestions}
          questionComments={questionComments}
          questionHighlights={questionHighlights}
          answeredQuestions={answeredQuestions}
          timeRemaining={timer.timeRemaining}
          timerPaused={tourInProgress}
          leftPaneWidth={leftPaneWidth}
          rightPaneCollapsed={rightPaneCollapsed}
          currentCategory={currentCategory}
          rightPaneFilter={rightPaneFilter}
          isMobile={isMobile}
          userProfile={userProfile}
          isAdmin={isAdmin}
          formatTime={timer.formatTime}
          onQuestionChange={handleQuestionChange}
          onAnswerSelect={handleAnswerSelect}
          onAnswerSubmit={handleAnswerSubmit}
          onAnswerClear={handleAnswerClear}
          onAnswerEliminate={handleAnswerEliminate}
          onResetEliminations={handleResetEliminations}
          onWidthChange={setLeftPaneWidth}
          onRightPaneToggle={() => setRightPaneCollapsed(!rightPaneCollapsed)}
          onCategoryChange={setCurrentCategory}
          onRightPaneFilterChange={setRightPaneFilter}
          onSubmitExam={handleSubmitExamClick}
          onBackToExamList={handleExitWithState}
          onQuestionFlag={handleQuestionFlag}
          onQuestionComment={handleQuestionComment}
          onAddHighlight={handleAddHighlight}
          onRemoveQuestionHighlights={handleRemoveQuestionHighlights}
          onAdminView={onAdminView}
          onProfileView={onProfileView}
          onLogout={onLogout}
        />
      )}

      <SubmitExamDialog
        isOpen={showSubmitDialog}
        onClose={() => setShowSubmitDialog(false)}
        onConfirm={handleConfirmSubmit}
        onExit={handleExitWithState}
        answeredCount={answeredQuestions.length}
        totalCount={questions.length}
        isSubmitting={isSubmitting}
        flaggedCount={Object.values(flaggedQuestions).filter(Boolean).length}
        onReviewFlagged={handleReviewFlagged}
      />
    </>
  );
};