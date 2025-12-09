import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { X, ChevronLeft, ChevronRight, SkipForward, ArrowLeft } from 'lucide-react';

// Tour step definition
export interface TourStep {
  id: string;
  title: string;
  description: string;
  targetSelector: string; // CSS selector for element to highlight
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  allowClickThrough?: boolean; // Allow interaction with highlighted element
}

// Tour data for exam interface
export const EXAM_TOUR_STEPS: TourStep[] = [
  {
    id: 'question-pane',
    title: 'Question Area',
    description: 'This is where exam questions appear. Read carefully and select your answer from the multiple choice options below.',
    targetSelector: '[data-tour="question-pane"]',
    position: 'center'
  },
  {
    id: 'answer-options',
    title: 'Answer Options',
    description: 'Click on any option to select your answer. You can change your selection at any time.',
    targetSelector: '[data-tour="answer-options"]',
    position: 'right'
  },
  {
    id: 'question-counter',
    title: 'Question Progress',
    description: 'Track your progress through the exam. Shows current question number and total questions.',
    targetSelector: '[data-tour="question-counter"]',
    position: 'bottom'
  },
  {
    id: 'timer',
    title: 'Exam Timer',
    description: 'Keep track of remaining time. The timer will change color as time runs low.',
    targetSelector: '[data-tour="timer"]',
    position: 'bottom'
  },
  {
    id: 'tools-dropdown',
    title: 'Tools Menu',
    description: 'Access helpful tools like text highlighter, answer eliminator, and question flagging.',
    targetSelector: '[data-tour="tools-dropdown"]',
    position: 'bottom'
  },
  {
    id: 'index-panel',
    title: 'Question Index',
    description: 'View all questions at a glance. Colored indicators show answered, flagged, and current questions.',
    targetSelector: '[data-tour="index-panel"]',
    position: 'left'
  },
  {
    id: 'navigation-buttons',
    title: 'Navigation',
    description: 'Move between questions using Previous and Next buttons, or click directly in the question index.',
    targetSelector: '[data-tour="navigation-buttons"]',
    position: 'top'
  },
  {
    id: 'submit-button',
    title: 'Submit Exam',
    description: 'When you\'re ready to finish, click here to submit your exam for grading.',
    targetSelector: '[data-tour="submit-button"]',
    position: 'top'
  }
];

interface TourOverlayProps {
  isActive: boolean;
  currentStep: TourStep | null;
  onNext: () => void;
  onPrevious: () => void;
  onExit: () => void;
  stepNumber: number;
  totalSteps: number;
}

// Overlay component that highlights elements
const TourOverlay: React.FC<TourOverlayProps> = ({
  isActive,
  currentStep,
  onNext,
  onPrevious,
  onExit,
  stepNumber,
  totalSteps
}) => {
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const updateHighlight = useCallback(() => {
    if (!currentStep || !isActive) {
      setHighlightRect(null);
      return;
    }

    const element = document.querySelector(currentStep.targetSelector);
    if (element) {
      const rect = element.getBoundingClientRect();
      setHighlightRect(rect);

      // Calculate tooltip position with smart positioning to avoid viewport edges
      const padding = 20;
      const tooltipWidth = 320; // Increased for more content
      const tooltipHeight = 200; // Increased to accommodate content
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let x = 0, y = 0;

      switch (currentStep.position) {
        case 'top':
          x = rect.left + rect.width / 2;
          y = rect.top - padding;
          // Ensure tooltip doesn't go off top of screen
          if (y - tooltipHeight < 10) {
            y = rect.bottom + padding; // Flip to bottom
          }
          break;
        case 'bottom':
          x = rect.left + rect.width / 2;
          y = rect.bottom + padding;
          // Ensure tooltip doesn't go off bottom of screen
          if (y + tooltipHeight > viewportHeight - 10) {
            y = rect.top - padding; // Flip to top
          }
          break;
        case 'left':
          x = rect.left - padding;
          y = rect.top + rect.height / 2;
          // Ensure tooltip doesn't go off left of screen
          if (x - tooltipWidth < 10) {
            x = rect.right + padding; // Flip to right
          }
          break;
        case 'right':
          x = rect.right + padding;
          y = rect.top + rect.height / 2;
          // Ensure tooltip doesn't go off right of screen
          if (x + tooltipWidth > viewportWidth - 10) {
            x = rect.left - padding; // Flip to left
          }
          break;
        case 'center':
          x = viewportWidth / 2;
          y = viewportHeight / 2;
          break;
      }

      setTooltipPosition({ x, y });
    }
  }, [currentStep, isActive]);

  useEffect(() => {
    updateHighlight();
    
    const handleResize = () => updateHighlight();
    const handleScroll = () => updateHighlight();
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [updateHighlight]);

  if (!isActive || !currentStep || !highlightRect) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* Full-screen blocking overlay to prevent interaction with exam */}
      <div 
        className="absolute inset-0 bg-black/60 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      />
      
      {/* Highlight border around target element */}
      <div
        className="absolute border-2 border-primary rounded-md pointer-events-none z-10"
        style={{
          left: highlightRect.left - 2,
          top: highlightRect.top - 2,
          width: highlightRect.width + 4,
          height: highlightRect.height + 4,
          boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.3), 0 0 0 9999px rgba(0, 0, 0, 0.6)'
        }}
      />

      {/* Tooltip */}
      <div
        className="absolute bg-popover border border-border rounded-lg shadow-lg p-4 max-w-sm pointer-events-auto z-50"
        style={{
          left: Math.min(Math.max(
            currentStep.position === 'center' ? tooltipPosition.x - 160 :
            (currentStep.position === 'top' || currentStep.position === 'bottom') ? tooltipPosition.x - 160 :
            (currentStep.position === 'left') ? tooltipPosition.x - 320 :
            tooltipPosition.x, 
            10), window.innerWidth - 330),
          top: Math.min(Math.max(
            currentStep.position === 'center' ? tooltipPosition.y - 100 :
            (currentStep.position === 'left' || currentStep.position === 'right') ? tooltipPosition.y - 100 :
            (currentStep.position === 'top') ? tooltipPosition.y - 200 :
            tooltipPosition.y, 
            10), window.innerHeight - 210),
          transform: 'none' // Remove transforms since we're calculating absolute positions
        }}
      >
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-medium text-popover-foreground text-base">{currentStep.title}</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onExit}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground ml-2 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          {currentStep.description}
        </p>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium">
            Step {stepNumber} of {totalSteps}
          </span>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onPrevious}
              disabled={stepNumber === 1}
              className="h-8"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            
            {stepNumber === totalSteps ? (
              <Button size="sm" onClick={onExit} className="h-8">
                Finish Tour
              </Button>
            ) : (
              <Button size="sm" onClick={onNext} className="h-8">
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface TourSystemProps {
  isVisible: boolean;
  onStart: () => void;
  onExit: () => void;
  onCancel?: () => void; // NEW: Optional callback for canceling without starting exam
}

export const TourSystem: React.FC<TourSystemProps> = ({
  isVisible,
  onStart,
  onExit,
  onCancel
}) => {
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const currentStep = EXAM_TOUR_STEPS[currentStepIndex] || null;

  const handleStartTour = () => {
    setIsTourActive(true);
    setCurrentStepIndex(0);
    onStart();
  };

  const handleNext = () => {
    if (currentStepIndex < EXAM_TOUR_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      handleExitTour();
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleExitTour = () => {
    setIsTourActive(false);
    setCurrentStepIndex(0);
    onExit();
  };

  return (
    <>
      {/* Pre-exam dialog */}
      <Dialog open={isVisible && !isTourActive} onOpenChange={(open) => {
        if (!open && onCancel) {
          onCancel(); // Use onCancel for X button/Escape/outside click
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Welcome to Your Exam</DialogTitle>
            <DialogDescription>
              Would you like a quick guided tour of the exam interface before you begin?
              This will help you understand all the available tools and features.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="ghost"
              onClick={() => onCancel?.()}
              className="w-full sm:w-auto sm:mr-auto"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              variant="outline"
              onClick={handleStartTour}
              className="w-full sm:w-auto"
              style={{ backgroundColor: 'dodgerblue', color: 'white', borderColor: 'dodgerblue' }}
            >
              Take the Tour
            </Button>
            <Button
              onClick={onExit}
              className="w-full sm:w-auto"
            >
              Start Exam
              <SkipForward className="w-4 h-4 mr-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tour overlay */}
      <TourOverlay
        isActive={isTourActive}
        currentStep={currentStep}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onExit={handleExitTour}
        stepNumber={currentStepIndex + 1}
        totalSteps={EXAM_TOUR_STEPS.length}
      />
    </>
  );
};