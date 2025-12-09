import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Menu, Clock, Settings, Eye, RotateCcw, EyeOff, Flag, MessageSquare, Calculator, Highlighter, X, Eraser, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { Checkbox } from './ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { Question, HighlightData } from '../hooks/useExam';
import { QuestionCommentDialog } from './QuestionCommentDialog';
import { HighlighterComponent } from './HighlighterComponent';
import { ThemeToggle } from './ThemeToggle';

interface ExamInterfaceProps {
  questions: Question[];
  currentQuestionIndex: number;
  selectedAnswer: string;
  answers: Record<string, string>;
  eliminatedAnswers: Record<string, string[]>;
  flaggedQuestions: Record<string, boolean>;
  questionComments: Record<string, { text: string; category: string }>;
  questionHighlights: Record<string, HighlightData[]>;
  answeredQuestions: Question[];
  timeRemaining: number;
  timerPaused?: boolean; // NEW: Indicates if timer is paused (e.g., during tour)
  leftPaneWidth: number;
  rightPaneCollapsed: boolean;
  currentCategory: string;
  rightPaneFilter?: string;
  isMobile?: boolean; // NEW: Mobile detection from parent
  userProfile?: any; // For mobile header
  isAdmin?: boolean; // For mobile header
  formatTime: (seconds: number) => string;
  onQuestionChange: (index: number) => void;
  onAnswerSelect: (answer: string) => void;
  onAnswerSubmit: () => void;
  onAnswerClear: () => void;
  onAnswerEliminate: (option: string) => void;
  onResetEliminations: () => void;
  onWidthChange: (width: number) => void;
  onRightPaneToggle: () => void;
  onCategoryChange: (category: string) => void;
  onRightPaneFilterChange?: (filter: string) => void;
  onSubmitExam: () => void;
  onBackToExamList?: () => void;
  onQuestionFlag: () => void;
  onQuestionComment: (commentData: { text: string; category: string }) => void;
  onAddHighlight: (highlight: HighlightData) => void;
  onRemoveQuestionHighlights: () => void;
  onAdminView?: () => void; // For mobile header
  onProfileView?: () => void; // For mobile header
  onLogout?: () => void; // For mobile header
}

export const ExamInterface: React.FC<ExamInterfaceProps> = ({
  questions,
  currentQuestionIndex,
  selectedAnswer,
  answers,
  eliminatedAnswers,
  flaggedQuestions,
  questionComments,
  questionHighlights,
  answeredQuestions,
  timeRemaining,
  timerPaused = false,
  leftPaneWidth,
  rightPaneCollapsed,
  currentCategory,
  rightPaneFilter = 'answered',
  isMobile = false,
  userProfile,
  isAdmin,
  formatTime,
  onQuestionChange,
  onAnswerSelect,
  onAnswerSubmit,
  onAnswerClear,
  onAnswerEliminate,
  onResetEliminations,
  onWidthChange,
  onRightPaneToggle,
  onCategoryChange,
  onRightPaneFilterChange,
  onSubmitExam,
  onBackToExamList,
  onQuestionFlag,
  onQuestionComment,
  onAddHighlight,
  onRemoveQuestionHighlights,
  onAdminView,
  onProfileView,
  onLogout,
}) => {
  const [activeTools, setActiveTools] = useState<Set<string>>(new Set());
  const [showAnswerEliminator, setShowAnswerEliminator] = useState(false);
  const leftPaneRef = useRef<HTMLDivElement>(null);
  const rightPaneScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentRef = leftPaneRef.current;
    if (currentRef) {
      currentRef.style.width = rightPaneCollapsed ? '100%' : `${leftPaneWidth}%`;
    }
  }, [rightPaneCollapsed, leftPaneWidth]);

  // Auto-scroll right pane to bottom when answers change (new answer added)
  useEffect(() => {
    if (rightPaneScrollRef.current && !rightPaneCollapsed) {
      // Small delay to ensure DOM is updated before scrolling
      const scrollTimeout = setTimeout(() => {
        if (rightPaneScrollRef.current) {
          rightPaneScrollRef.current.scrollTop = rightPaneScrollRef.current.scrollHeight;
        }
      }, 100);
      
      return () => clearTimeout(scrollTimeout);
    }
  }, [Object.keys(answers).length, rightPaneCollapsed]);

  if (!questions.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="text-center p-8 max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-semibold text-foreground mb-4">No Questions Available</h2>
          <p className="text-muted-foreground mb-8">
            This exam template doesn't have any questions yet, or there was an error loading the questions.
          </p>
          {onBackToExamList && (
            <Button
              onClick={onBackToExamList}
              variant="outline"
              size="lg"
            >
              <ChevronLeft className="size-4 mr-2" />
              Back to Exam List
            </Button>
          )}
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = (answeredQuestions.length / questions.length) * 100;
  const questionEliminated = eliminatedAnswers[currentQuestion?.id] || [];

  const categories = ['All Categories', ...Array.from(new Set(questions.map(q => q.category).filter(Boolean)))];

  const filteredQuestions = currentCategory === 'All Categories' 
    ? questions 
    : questions.filter(q => q.category === currentCategory);

  // Apply right pane filter - show questions based on filter criteria
  const rightPaneFilteredQuestions = filteredQuestions.filter((question) => {
    const isAnswered = answers[question.id];
    const isFlagged = flaggedQuestions[question.id];
    const hasComment = questionComments[question.id];

    switch (rightPaneFilter) {
      case 'answered':
        return isAnswered;
      case 'unanswered':
        return !isAnswered;
      case 'flagged':
        return isFlagged;
      case 'comments':
        return hasComment;
      default:
        return isAnswered; // Default to showing answered questions
    }
  });

  // Helper function to get indices of questions matching the current filter
  const getFilteredIndices = () => {
    return questions
      .map((q, index) => {
        const isAnswered = answers[q.id];
        const isFlagged = flaggedQuestions[q.id];
        const hasComment = questionComments[q.id];
        
        let matches = false;
        switch (rightPaneFilter) {
          case 'answered':
            matches = isAnswered;
            break;
          case 'unanswered':
            matches = !isAnswered;
            break;
          case 'flagged':
            matches = isFlagged;
            break;
          case 'comments':
            matches = hasComment;
            break;
          default:
            // For 'all' or no filter, don't filter navigation
            return index;
        }
        
        return matches ? index : -1;
      })
      .filter(index => index !== -1);
  };

  // Navigation handlers that respect the filter
  const handlePreviousQuestion = () => {
    const filteredIndices = getFilteredIndices();
    
    // If no filter is active or filter is empty, use normal navigation
    if (filteredIndices.length === questions.length) {
      onQuestionChange(Math.max(0, currentQuestionIndex - 1));
      return;
    }
    
    // Find current position in filtered list
    const currentPositionInFiltered = filteredIndices.indexOf(currentQuestionIndex);
    
    if (currentPositionInFiltered > 0) {
      // Go to previous filtered question
      onQuestionChange(filteredIndices[currentPositionInFiltered - 1]);
    } else if (currentPositionInFiltered === -1 && filteredIndices.length > 0) {
      // Current question doesn't match filter, go to nearest previous filtered question
      const previousFiltered = filteredIndices.filter(idx => idx < currentQuestionIndex);
      if (previousFiltered.length > 0) {
        onQuestionChange(previousFiltered[previousFiltered.length - 1]);
      }
    }
  };

  const handleNextQuestion = () => {
    const filteredIndices = getFilteredIndices();
    
    // If no filter is active or filter is empty, use normal navigation
    if (filteredIndices.length === questions.length) {
      onQuestionChange(Math.min(questions.length - 1, currentQuestionIndex + 1));
      return;
    }
    
    // Find current position in filtered list
    const currentPositionInFiltered = filteredIndices.indexOf(currentQuestionIndex);
    
    if (currentPositionInFiltered !== -1 && currentPositionInFiltered < filteredIndices.length - 1) {
      // Go to next filtered question
      onQuestionChange(filteredIndices[currentPositionInFiltered + 1]);
    } else if (currentPositionInFiltered === -1 && filteredIndices.length > 0) {
      // Current question doesn't match filter, go to nearest next filtered question
      const nextFiltered = filteredIndices.filter(idx => idx > currentQuestionIndex);
      if (nextFiltered.length > 0) {
        onQuestionChange(nextFiltered[0]);
      }
    }
  };

  // Check if Previous/Next buttons should be disabled
  const canGoPrevious = () => {
    const filteredIndices = getFilteredIndices();
    
    // If no filter, check if at start
    if (filteredIndices.length === questions.length) {
      return currentQuestionIndex > 0;
    }
    
    // Check if there's a previous question in filtered list
    const currentPositionInFiltered = filteredIndices.indexOf(currentQuestionIndex);
    if (currentPositionInFiltered > 0) {
      return true;
    }
    
    // Check if current question is not in filter but there are previous filtered questions
    if (currentPositionInFiltered === -1) {
      return filteredIndices.some(idx => idx < currentQuestionIndex);
    }
    
    return false;
  };

  const canGoNext = () => {
    const filteredIndices = getFilteredIndices();
    
    // If no filter, check if at end
    if (filteredIndices.length === questions.length) {
      return currentQuestionIndex < questions.length - 1;
    }
    
    // Check if there's a next question in filtered list
    const currentPositionInFiltered = filteredIndices.indexOf(currentQuestionIndex);
    if (currentPositionInFiltered !== -1 && currentPositionInFiltered < filteredIndices.length - 1) {
      return true;
    }
    
    // Check if current question is not in filter but there are next filtered questions
    if (currentPositionInFiltered === -1) {
      return filteredIndices.some(idx => idx > currentQuestionIndex);
    }
    
    return false;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = (e.clientX / window.innerWidth) * 100;
      // Updated constraints: min 20%, max 50% for right pane (so left pane is 50-80%)
      if (newWidth >= 50 && newWidth <= 80) {
        onWidthChange(newWidth);
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleToolSelect = (tool: string) => {
    const newActiveTools = new Set(activeTools);
    if (newActiveTools.has(tool)) {
      newActiveTools.delete(tool);
      if (tool === 'Answer Eliminator') {
        setShowAnswerEliminator(false);
      }
    } else {
      newActiveTools.add(tool);
      if (tool === 'Answer Eliminator') {
        setShowAnswerEliminator(true);
      }
    }
    setActiveTools(newActiveTools);
  };
  
  return (
    <div className="flex flex-1 bg-background overflow-hidden">
      {/* Left Pane - Questions */}
      <div 
        className="bg-card border-r flex flex-col"
        ref={leftPaneRef}
      >
        {/* Header */}
        <div className="border-b p-4 bg-card flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-4">
              <Badge variant="outline" className="text-[14px]" data-tour="question-counter">
                {isMobile ? `Q ${currentQuestionIndex + 1}/${questions.length}` : `Question ${currentQuestionIndex + 1} of ${questions.length}`}
              </Badge>
            </div>
            
            {/* Desktop/Mobile: Tools dropdown (centered on desktop, right-aligned on mobile) */}
            <div className={`flex items-center ${isMobile ? '' : 'justify-center flex-1'}`}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size={isMobile ? "sm" : "default"} data-tour="tools-dropdown">
                    <Settings className={`${isMobile ? 'size-4' : 'size-5 mr-2'}`} />
                    {!isMobile && "Tools"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem 
                    onClick={() => handleToolSelect('Answer Eliminator')}
                    className={`text-base py-3 ${activeTools.has('Answer Eliminator') ? 'bg-accent' : ''}`}
                  >
                    <EyeOff className="size-5 mr-3" />
                    Answer Eliminator
                    {activeTools.has('Answer Eliminator') && (
                      <Check className="size-6 ml-auto text-green-500 font-bold" />
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleToolSelect('Highlighter')}
                    className={`text-base py-3 ${activeTools.has('Highlighter') ? 'bg-accent' : ''}`}
                  >
                    <Highlighter className="size-5 mr-3" />
                    Highlighter
                    {activeTools.has('Highlighter') && (
                      <Check className="size-6 ml-auto text-green-500 font-bold" />
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleToolSelect('Calculator')}
                    className={`text-base py-3 ${activeTools.has('Calculator') ? 'bg-accent' : ''}`}
                  >
                    <Calculator className="size-5 mr-3" />
                    Calculator
                    {activeTools.has('Calculator') && (
                      <Check className="size-6 ml-auto text-green-500 font-bold" />
                    )}
                  </DropdownMenuItem>
                  {activeTools.size > 0 && (
                    <>
                      <Separator />
                      <DropdownMenuItem 
                        onClick={() => {
                          setActiveTools(new Set());
                          setShowAnswerEliminator(false);
                        }}
                        className="text-base py-3"
                      >
                        <X className="size-5 mr-3" />
                        Clear Tools
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Desktop: Theme + Timer, Mobile: Timer only */}
            <div className="flex items-center gap-2 md:gap-4">
              {!isMobile && <ThemeToggle />}
              <div className={`flex items-center gap-2 ${isMobile ? 'text-sm' : 'text-lg'} font-mono`} data-tour="timer">
                {timerPaused ? (
                  <>
                    <div className="relative">
                      <Clock className={isMobile ? "size-4" : "size-5"} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="size-2 bg-yellow-500 rounded-full animate-pulse" />
                      </div>
                    </div>
                    <span className="text-yellow-600 dark:text-yellow-500">
                      {formatTime(timeRemaining)} {!isMobile && "(Paused)"}
                    </span>
                  </>
                ) : (
                  <>
                    <Clock className={isMobile ? "size-4" : "size-5"} />
                    <span className={timeRemaining < 300 ? 'text-destructive' : 'text-foreground'}>
                      {formatTime(timeRemaining)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Question Content - Scrollable */}
        <div className="flex-1 overflow-y-auto" data-tour="question-pane">
          <div className="p-6">
            <div className="max-w-4xl relative">
              {/* Question Actions - Flag and Comment */}
              <div className="flex items-center justify-end gap-4 mt-[0px] mr-[0px] mb-[10px] ml-[0px]">
                <div className="flex items-center gap-3">
                  
                  {/* Remove Highlighting Button - only show when highlighter is active and highlights exist */}
                  {activeTools.has('Highlighter') && questionHighlights[currentQuestion?.id]?.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onRemoveQuestionHighlights}
                      className="flex items-center gap-2"
                    >
                      <Eraser className="w-4 h-4" />
                      {!isMobile && "Remove Highlighting"}
                    </Button>
                  )}
                  
                  {/* Clear Checkmarks Button - only show when Answer Eliminator is active and answers are eliminated */}
                  {activeTools.has('Answer Eliminator') && eliminatedAnswers[currentQuestion?.id]?.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onResetEliminations}
                      className="flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      {!isMobile && "Clear Checkmarks"}
                    </Button>
                  )}
                  
                  {/* Grouped Flag and Comment buttons */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant={flaggedQuestions[currentQuestion?.id] ? "destructive" : "outline"}
                      size="sm"
                      onClick={onQuestionFlag}
                      className="flex items-center gap-2"
                      title={flaggedQuestions[currentQuestion?.id] ? "Flagged" : "Flag Question"}
                    >
                      <Flag className="w-4 h-4" />
                      {!isMobile && (flaggedQuestions[currentQuestion?.id] ? "Flagged" : "Flag Question")}
                    </Button>
                    
                    <QuestionCommentDialog
                      currentComment={questionComments[currentQuestion?.id]?.text || ''}
                      currentCategory={questionComments[currentQuestion?.id]?.category as 'Uncategorized' | 'Spelling' | 'Flawed Logic' | 'Poor Structure' | undefined}
                      onCommentSave={onQuestionComment}
                      questionNumber={currentQuestionIndex + 1}
                      iconOnly={isMobile}
                    />
                  </div>
                </div>
              </div>
              
              <HighlighterComponent
                containerId="question"
                isHighlighterActive={activeTools.has('Highlighter')}
                highlights={questionHighlights[currentQuestion?.id] || []}
                onAddHighlight={onAddHighlight}
              >
                <h2 className="text-xl font-semibold mb-6 leading-relaxed">
                  {currentQuestion?.question}
                </h2>
              </HighlighterComponent>
              


              {/* Answer Options Layout - Fixed width container to prevent shrinking */}
              <div className="relative" data-tour="answer-options">
                {/* Answer options container with fixed 75% width */}
                <div className="space-y-3" style={{ width: '75%' }}>
                  {currentQuestion?.options?.map((optionText, index) => {
                    const option = String.fromCharCode(65 + index); // Convert 0,1,2,3 to A,B,C,D
                    const isSelected = selectedAnswer !== '' && parseInt(selectedAnswer) === index;
                    const isEliminated = questionEliminated.includes(option);
                    
                    return (
                      <div key={option} className="relative">
                        <HighlighterComponent
                          containerId={`answer-${option}`}
                          isHighlighterActive={activeTools.has('Highlighter')}
                          highlights={questionHighlights[currentQuestion?.id] || []}
                          onAddHighlight={onAddHighlight}
                          className="w-full"
                        >
                          <button
                            onClick={() => {
                              !isEliminated && onAnswerSelect(index.toString());
                            }}
                            disabled={isEliminated}
                            className={`w-full p-4 text-left border-2 rounded-lg transition-all font-medium ${
                              isEliminated 
                                ? 'bg-muted/50 border-border text-muted-foreground cursor-not-allowed opacity-50' 
                                : isSelected
                                ? 'bg-primary/10 border-primary text-primary shadow-md ring-2 ring-primary/20'
                                : 'bg-card border-border hover:border-primary/30 hover:shadow-sm hover:bg-primary/5'
                            } ${activeTools.has('Highlighter') ? 'cursor-text' : ''}`}
                          >
                            <div className="flex items-start gap-3">
                              <span className={`font-bold min-w-[24px] ${
                                isEliminated ? 'line-through' : isSelected ? 'text-primary' : ''
                              }`}>
                                {option}.
                              </span>
                              <span className={isEliminated ? 'line-through' : ''}>
                                {optionText}
                              </span>
                            </div>
                          </button>
                        </HighlighterComponent>
                        
                        {/* Answer Eliminator Checkbox - positioned absolutely outside the 75% area */}
                        {showAnswerEliminator && (
                          <div 
                            className="absolute top-4 flex items-center justify-center w-10 h-10 bg-card border border-border rounded-lg shadow-sm"
                            style={{ left: 'calc(100% + 1rem)' }}
                          >
                            <Checkbox
                              checked={questionEliminated.includes(option)}
                              onCheckedChange={() => onAnswerEliminate(option)}
                              className="w-5 h-5 border-2 border-slate-600 dark:border-slate-400 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600 data-[state=checked]:text-white"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons - REMOVED: Moved to footer */}
            </div>
          </div>
        </div>
        
        {/* Action Buttons Footer - NEW: Fixed at bottom with original layout */}
        <div className="border-t bg-card p-4 flex-shrink-0">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            {/* Mobile: Icon-only square buttons, Desktop: Full buttons with text */}
            <div className="flex gap-2 md:gap-3">
              {isMobile ? (
                <>
                  {/* Mobile: Icon-only buttons */}
                  <Button 
                    onClick={onAnswerClear}
                    disabled={!answers[currentQuestion?.id]}
                    variant="outline"
                    size="icon"
                    className="h-11 w-11"
                    title="Clear Answer"
                  >
                    <X className="size-5" />
                  </Button>
                </>
              ) : (
                <>
                  {/* Desktop: Full buttons */}
                  <Button 
                    onClick={onAnswerSubmit}
                    disabled={!selectedAnswer}
                  >
                    Submit Answer
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={onAnswerClear}
                    disabled={!answers[currentQuestion?.id]}
                  >
                    Clear Answer
                  </Button>
                </>
              )}
            </div>
            
            <div className="flex gap-2 md:gap-3" data-tour="navigation-buttons">
              {isMobile ? (
                <>
                  {/* Mobile: Icon-only navigation */}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-11 w-11"
                    onClick={() => onQuestionChange(Math.max(0, currentQuestionIndex - 1))}
                    disabled={currentQuestionIndex === 0}
                    title="Previous"
                  >
                    <ChevronLeft className="size-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-11 w-11"
                    onClick={() => onQuestionChange(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                    disabled={currentQuestionIndex === questions.length - 1}
                    title="Next"
                  >
                    <ChevronRight className="size-5" />
                  </Button>
                  <Button 
                    onClick={onAnswerSubmit}
                    disabled={!selectedAnswer}
                    size="icon"
                    className="h-11 w-11"
                    title="Submit Answer"
                  >
                    <Check className="size-5" />
                  </Button>
                </>
              ) : (
                <>
                  {/* Desktop: Full buttons */}
                  <Button
                    variant="outline"
                    onClick={() => onQuestionChange(Math.max(0, currentQuestionIndex - 1))}
                    disabled={currentQuestionIndex === 0}
                  >
                    <ChevronLeft className="size-4 mr-2" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => onQuestionChange(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                    disabled={currentQuestionIndex === questions.length - 1}
                  >
                    Next
                    <ChevronRight className="size-4 ml-2" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Divider - Only show on desktop */}
      {!rightPaneCollapsed && !isMobile && (
        <div
          className="w-6 cursor-col-resize hover:bg-primary/10 transition-colors relative group flex items-center justify-center"
          onMouseDown={handleMouseDown}
        >
          {/* Thin visual divider line */}
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-border group-hover:bg-primary/50 transition-colors"></div>
          
          {/* Grab bar indicator */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-12 bg-border group-hover:bg-primary/40 rounded-full flex flex-col items-center justify-center gap-1 pointer-events-none transition-colors shadow-sm z-10">
            <div className="w-1 h-1 rounded-full bg-muted-foreground/40 group-hover:bg-primary"></div>
            <div className="w-1 h-1 rounded-full bg-muted-foreground/40 group-hover:bg-primary"></div>
            <div className="w-1 h-1 rounded-full bg-muted-foreground/40 group-hover:bg-primary"></div>
            <div className="w-1 h-1 rounded-full bg-muted-foreground/40 group-hover:bg-primary"></div>
            <div className="w-1 h-1 rounded-full bg-muted-foreground/40 group-hover:bg-primary"></div>
          </div>
        </div>
      )}

      {/* Right Pane - Desktop: Regular pane, Mobile: Full-screen Sheet overlay */}
      {isMobile ? (
        // Mobile: Full-screen Sheet overlay (off-canvas)
        <Sheet open={!rightPaneCollapsed} onOpenChange={onRightPaneToggle}>
          <SheetContent side="right" className="w-full p-0 flex flex-col">
            <SheetHeader className="border-b p-4 bg-card">
              <SheetTitle className="flex items-center justify-between">
                <Select value={rightPaneFilter} onValueChange={onRightPaneFilterChange || (() => {})}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="answered">Answered</SelectItem>
                    <SelectItem value="unanswered">Unanswered</SelectItem>
                    <SelectItem value="flagged">Flagged</SelectItem>
                    <SelectItem value="comments">Comments</SelectItem>
                  </SelectContent>
                </Select>
              </SheetTitle>
            </SheetHeader>
            
            {/* Scrollable Question List */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {rightPaneFilteredQuestions.map((question, index) => {
                const isAnswered = answers[question.id];
                const isCurrent = questions[currentQuestionIndex]?.id === question.id;
                const isFlagged = flaggedQuestions[question.id];
                const hasComment = questionComments[question.id];
                const actualIndex = questions.findIndex(q => q.id === question.id);
                const selectedAnswer = answers[question.id];
                const selectedOptionText = selectedAnswer && question.options ? question.options[parseInt(selectedAnswer)] : null;
                
                return (
                  <div key={question.id} className="relative">
                    <button
                      onClick={() => {
                        onQuestionChange(actualIndex);
                        onRightPaneToggle(); // Close overlay after selection
                      }}
                      className={`w-full p-3 text-left border rounded-lg transition-all relative ${
                        isCurrent
                          ? 'border-gray-400 dark:border-gray-500 shadow-md bg-gray-100 dark:bg-gray-800'
                          : isAnswered
                          ? 'bg-card border-border hover:border-primary/30'
                          : 'bg-card border-border hover:border-primary/30 opacity-75'
                      }`}
                    >
                      {/* Question number and status badges */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={isCurrent ? "default" : "secondary"} className="text-xs">
                            Q{actualIndex + 1}
                          </Badge>
                          {isFlagged && (
                            <Badge variant="destructive" className="text-xs">
                              Flagged
                            </Badge>
                          )}
                          {hasComment && (
                            <Badge variant="outline" className="text-xs border-blue-500 text-blue-600">
                              Comment
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Question preview */}
                      <div className="text-sm text-foreground mb-2 line-clamp-2">
                        {question.question}
                      </div>
                      
                      {/* Selected answer preview */}
                      {selectedAnswer && selectedOptionText && (
                        <div className="text-xs text-muted-foreground border-t pt-2 line-clamp-1">
                          <span className="font-medium">{String.fromCharCode(65 + parseInt(selectedAnswer))}:</span> {selectedOptionText}
                        </div>
                      )}
                      
                      {/* Status triangles */}
                      {isFlagged && (
                        <div className="absolute top-1 right-1">
                          <div className="w-0 h-0 border-l-[16px] border-l-transparent border-t-[16px] border-t-red-500" />
                        </div>
                      )}
                      
                      {hasComment && (
                        <div className="absolute bottom-1 right-1">
                          <div className="w-0 h-0 border-l-[16px] border-l-transparent border-b-[16px] border-b-blue-500" />
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
              
              {rightPaneFilteredQuestions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No questions match the current filter
                </div>
              )}
            </div>
            
            {/* Fixed Footer - Action Buttons */}
            <div className="border-t bg-card p-4 space-y-3">
              {onBackToExamList && (
                <Button
                  onClick={onBackToExamList}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <ChevronLeft className="size-4 mr-2" />
                  Back to Exam List
                </Button>
              )}
              <Button
                onClick={onSubmitExam}
                variant="destructive"
                className="w-full"
                size="lg"
              >
                Submit Exam for Scoring
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                This will finalize your exam and submit it for scoring. No further changes can be made.
              </p>
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        // Desktop: Regular right pane
        !rightPaneCollapsed && (
          <div 
            className="bg-muted flex flex-col"
            style={{ width: `${100 - leftPaneWidth}%` }}
            data-tour="index-panel"
          >
            {/* Header */}
            <div className="border-b p-4 bg-card">
              <div className="flex items-center justify-between">
                <Select value={rightPaneFilter} onValueChange={onRightPaneFilterChange || (() => {})}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="answered">Answered</SelectItem>
                    <SelectItem value="unanswered">Unanswered</SelectItem>
                    <SelectItem value="flagged">Flagged</SelectItem>
                    <SelectItem value="comments">Comments</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRightPaneToggle}
                >
                  <Menu className="size-4" />
                </Button>
              </div>
            </div>
            
            {/* Scrollable Question List */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3" ref={rightPaneScrollRef}>
              {rightPaneFilteredQuestions.map((question, index) => {
                const isAnswered = answers[question.id];
                const isCurrent = questions[currentQuestionIndex]?.id === question.id;
                const isFlagged = flaggedQuestions[question.id];
                const hasComment = questionComments[question.id];
                const actualIndex = questions.findIndex(q => q.id === question.id);
                const selectedAnswer = answers[question.id];
                const selectedOptionText = selectedAnswer && question.options ? question.options[parseInt(selectedAnswer)] : null;
                
                return (
                  <div key={question.id} className="relative">
                    <button
                      onClick={() => onQuestionChange(actualIndex)}
                      className={`w-full p-3 text-left border rounded-lg transition-all relative ${
                        isCurrent
                          ? 'border-gray-400 dark:border-gray-500 shadow-md bg-gray-100 dark:bg-gray-800'
                          : isAnswered
                          ? 'bg-card border-border hover:border-primary/30'
                          : 'bg-card border-border hover:border-primary/30 opacity-75'
                      }`}
                    >
                      {/* Question number and status badges */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={isCurrent ? "default" : "secondary"} className="text-xs">
                            Q{actualIndex + 1}
                          </Badge>
                          {isFlagged && (
                            <Badge variant="destructive" className="text-xs">
                              Flagged
                            </Badge>
                          )}
                          {hasComment && (
                            <Badge variant="outline" className="text-xs border-blue-500 text-blue-600">
                              Comment
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Question preview */}
                      <div className="text-sm text-foreground mb-2 line-clamp-2">
                        {question.question}
                      </div>
                      
                      {/* Selected answer preview */}
                      {selectedAnswer && selectedOptionText && (
                        <div className="text-xs text-muted-foreground border-t pt-2 line-clamp-1">
                          <span className="font-medium">{String.fromCharCode(65 + parseInt(selectedAnswer))}:</span> {selectedOptionText}
                        </div>
                      )}
                      
                      {/* Status triangles (maintaining original design) */}
                      {isFlagged && (
                        <div className="absolute top-1 right-1">
                          <div className="w-0 h-0 border-l-[16px] border-l-transparent border-t-[16px] border-t-red-500" />
                        </div>
                      )}
                      
                      {hasComment && !isFlagged && (
                        <div className="absolute bottom-1 right-1">
                          <div className="w-0 h-0 border-l-[16px] border-l-transparent border-b-[16px] border-b-blue-500" />
                        </div>
                      )}
                      
                      {hasComment && isFlagged && (
                        <div className="absolute bottom-1 right-1">
                          <div className="w-0 h-0 border-l-[16px] border-l-transparent border-b-[16px] border-b-blue-500" />
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
              
              {rightPaneFilteredQuestions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No questions match the current filter
                </div>
              )}
            </div>
            
            {/* Fixed Footer - Progress Summary and Action Buttons */}
            <div className="border-t bg-card p-4 space-y-4">
              
              {/* Action Buttons */}
              <div className="space-y-3">
                {onBackToExamList && (
                  <Button
                    onClick={onBackToExamList}
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    <ChevronLeft className="size-4 mr-2" />
                    Back to Exam List
                  </Button>
                )}
                <Button
                  onClick={onSubmitExam}
                  variant="destructive"
                  className="w-full"
                  size="lg"
                  data-tour="submit-button"
                >
                  Submit Exam for Scoring
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  This will finalize your exam and submit it for scoring. No further changes can be made.
                </p>
              </div>
            </div>
          </div>
        )
      )}

      {/* Collapsed Right Pane Toggle - Show hamburger icon on collapsed */}
      {rightPaneCollapsed && (
        <div className={`${isMobile ? 'fixed bottom-20 right-4 z-50' : 'w-12 bg-muted border-l flex flex-col'}`}>
          <Button
            variant={isMobile ? "default" : "ghost"}
            size={isMobile ? "lg" : "sm"}
            onClick={onRightPaneToggle}
            className={isMobile ? 'h-14 w-14 rounded-full shadow-lg' : 'm-2'}
          >
            <Menu className="size-5" />
          </Button>
        </div>
      )}
    </div>
  );
};