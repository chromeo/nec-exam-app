import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Badge } from '../../ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert';
import { BookOpen, Clock, Trophy, ArrowLeft, CreditCard, CheckCircle, Users, AlertCircle, PlayCircle, Timer, Flag } from 'lucide-react';
import { FeedbackButton } from '../../FeedbackButton';
import { ExamTemplate } from '../ExamManager';
import { ApiService } from '../../../services/apiService';
import { ResumeExamDialog } from '../../ResumeExamDialog';
import { getAllSavedExams, SavedExamProgress } from '../../../utils/examProgress';
import { getTimeLimit, getQuestionCount } from '../../../utils/typeConverters';

interface ExamSelectionViewProps {
  accessToken: string;
  onStartExam: (template: ExamTemplate, isDemo?: boolean) => void;
  onResumeExam: (progress: SavedExamProgress) => void;
  onBack: () => void;
}

export const ExamSelectionView: React.FC<ExamSelectionViewProps> = ({
  accessToken,
  onStartExam,
  onResumeExam,
  onBack,
}) => {
  const [examTemplates, setExamTemplates] = useState<ExamTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [selectedExam, setSelectedExam] = useState<ExamTemplate | null>(null);
  const [showExamDialog, setShowExamDialog] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [showNewExamWarning, setShowNewExamWarning] = useState(false);
  const [savedExams, setSavedExams] = useState<SavedExamProgress[]>([]);
  const [userCredits] = useState(100); // For testing purposes - 100 credits

  const handleSelectExam = (template: ExamTemplate) => {
    // Check if user has saved exams and warn them
    if (savedExams.length > 0) {
      setSelectedExam(template);
      setShowNewExamWarning(true);
      return;
    }
    
    setSelectedExam(template);
    setShowExamDialog(true);
  };

  const handleStartExam = () => {
    if (selectedExam) {
      setShowExamDialog(false);
      setShowNewExamWarning(false);
      
      console.log('📤 [ExamSelectionView.tsx:78] Calling onStartExam prop callback with template:', {
        title: selectedExam.title,
        id: selectedExam.id,
        questionCount: getQuestionCount(selectedExam)
      });
      onStartExam(selectedExam);
      console.log('✅ [ExamSelectionView.tsx:84] onStartExam callback completed');
    } else {
      console.warn('⚠️ [ExamSelectionView.tsx:86] No selected exam to start!');
    }
  };

  const handleResumeExam = (progress: SavedExamProgress) => {
    setShowResumeDialog(false);
    onResumeExam(progress);
  };

  const handleProceedWithNewExam = () => {
    if (selectedExam) {
      setShowNewExamWarning(false);
      setShowExamDialog(true);
    }
  };

  const handlePurchaseExam = () => {
    // TODO: Implement purchase flow in production
    console.log('Purchase exam functionality to be implemented');
  };

  const hasEnoughCredits = (template: ExamTemplate): boolean => {
    // For testing purposes, assume each exam costs 1 credit
    return userCredits >= 1;
  };

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

  const loadSavedExams = () => {
    const exams = getAllSavedExams();
    // console.log('🔄 ExamSelectionView: Loading saved exams:', exams.length, exams);
    setSavedExams(exams);
  };

  useEffect(() => {
    loadExamTemplates();
    loadSavedExams();
  }, []);

  // Refresh saved exams when component becomes visible
  useEffect(() => {
    const handleFocus = () => {
      loadSavedExams();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const loadExamTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const result = await ApiService.getExamTemplates(accessToken);
      if (result.success) {
        // Sort exams by displayOrder (admin's custom order), fallback to alphabetical
        const sortedTemplates = (result.data || []).sort((a, b) => {
          // First try to sort by displayOrder if available
          const orderA = a.displayOrder ?? a.display_order ?? null;
          const orderB = b.displayOrder ?? b.display_order ?? null;
          
          if (orderA !== null && orderB !== null) {
            return orderA - orderB;
          }
          
          // Fallback to alphabetical if no displayOrder
          return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });
        });
        setExamTemplates(sortedTemplates);
      } else {
        console.error('Failed to load exam templates:', result.error);
      }
    } catch (error) {
      console.error('Error loading exam templates:', error);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      {/* Feedback Button */}
      <FeedbackButton />
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Select an Exam</h1>
            <p className="text-muted-foreground">Choose an exam to begin your assessment</p>
          </div>
          {savedExams.length > 0 && (
            <Button
              onClick={() => setShowResumeDialog(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              size="lg"
            >
              <PlayCircle className="size-5" />
              Resume Exam ({savedExams.length})
            </Button>
          )}
        </div>
        {/* Priority Alert for Saved Exams */}
        {savedExams.length > 0 && (
          <div className="mb-8">
            <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
              <Timer className="size-4" />
              <AlertTitle className="text-orange-800 dark:text-orange-200">
                You have {savedExams.length} exam{savedExams.length !== 1 ? 's' : ''} in progress
              </AlertTitle>
              <AlertDescription className="text-orange-700 dark:text-orange-300">
                <div className="mt-2">
                  {savedExams.slice(0, 2).map((exam, index) => (
                    <div key={exam.examId} className="flex items-center justify-between py-2 border-b border-orange-200 dark:border-orange-800 last:border-b-0">
                      <div>
                        <div className="font-medium">{exam.examTitle}</div>
                        <div className="text-sm flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            Time left: {formatTimeRemaining(exam.timeRemaining)}
                          </span>
                          <span className="flex items-center gap-1">
                            <BookOpen className="size-3" />
                            Progress: {getProgressPercentage(exam)}%
                          </span>
                          {Object.values(exam.flags).filter(Boolean).length > 0 && (
                            <span className="flex items-center gap-1">
                              <Flag className="size-3" />
                              Flagged: {Object.values(exam.flags).filter(Boolean).length}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={() => handleResumeExam(exam)}
                        className="bg-blue-600 hover:bg-blue-700 text-white ml-4"
                        size="sm"
                      >
                        <PlayCircle className="size-4 mr-1" />
                        Resume
                      </Button>
                    </div>
                  ))}
                  {savedExams.length > 2 && (
                    <div className="pt-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowResumeDialog(true)}
                        className="text-orange-700 border-orange-300 hover:bg-orange-100 dark:text-orange-300 dark:border-orange-700 dark:hover:bg-orange-900 w-full"
                        size="sm"
                      >
                        View All {savedExams.length} Saved Exams
                      </Button>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}



        {isLoadingTemplates ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-muted rounded w-full"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-4 bg-muted rounded w-1/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : examTemplates.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Trophy className="size-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Exams Available</h3>
              <p className="text-muted-foreground">There are currently no exam templates available. Please check back later.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {examTemplates.map((template) => {
              return (
                <Card key={template.id} className="hover:shadow-lg transition-shadow flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-lg">{template.title}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="size-4" />
                          <span>{getTimeLimit(template)} minutes</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <BookOpen className="size-4" />
                          <span>{getQuestionCount(template)} questions</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Fixed button at bottom */}
                    <div className="mt-4">
                      <Button 
                        onClick={() => handleSelectExam(template)}
                        className="w-full"
                      >
                        Select Exam
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })} 
          </div>
        )}

        {/* Exam Details Dialog */}
        <Dialog open={showExamDialog} onOpenChange={setShowExamDialog}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="size-5" />
                {selectedExam?.title}
              </DialogTitle>
              <DialogDescription>
                Review the exam details and rules before proceeding
              </DialogDescription>
            </DialogHeader>
            
            {selectedExam && (
              <>
                <div className="space-y-6 overflow-y-auto flex-1 pr-2">
                  {/* Exam Info */}
                  <div className="grid grid-cols-2 gap-4 text-base">
                    <div className="flex items-center gap-2">
                      <Clock className="size-4 text-muted-foreground" />
                      <span><strong>Duration:</strong> {getTimeLimit(selectedExam)} minutes</span>
                    </div>
                    <div className="flex items-center gap-2 text-base">
                      <BookOpen className="size-4 text-muted-foreground" />
                      <span><strong>Questions:</strong> {getQuestionCount(selectedExam)} questions</span>
                    </div>
                    <div className="flex items-center gap-2 text-base">
                      <CreditCard className="size-4 text-muted-foreground" />
                      <span><strong>Cost:</strong> 1 exam credit</span>
                    </div>
                    <div className="flex items-center gap-2 text-base">
                      <Users className="size-4 text-muted-foreground" />
                      <span><strong>Your Credits:</strong> {userCredits}</span>
                    </div>
                  </div>

                  {/* Credit Status */}
                  <div className="flex items-center gap-2 p-3 rounded-lg border">
                    {hasEnoughCredits(selectedExam) ? (
                      <>
                        <CheckCircle className="size-5 text-green-600" />
                        <span className="text-green-700 dark:text-green-400">
                          You have sufficient credits to take this exam
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="size-5 text-orange-500" />
                        <span className="text-orange-700 dark:text-orange-400">
                          Insufficient credits. Please purchase credits to continue.
                        </span>
                      </>
                    )}
                  </div>

                  {/* Exam Description */}
                  {selectedExam.description && (
                    <div>
                      <h4 className="font-medium mb-2">About This Exam</h4>
                      <p className="text-base text-muted-foreground text-base">{selectedExam.description}</p>
                    </div>
                  )}

                  {/* Rules and Guidelines */}
                  <div>
                    <h4 className="font-medium mb-3">Exam Rules & Guidelines</h4>
                    {selectedExam.rules ? (
                      <div 
                        className="text-base text-muted-foreground prose prose-sm dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: selectedExam.rules }}
                      />
                    ) : (
                      <div className="text-base text-muted-foreground space-y-2">
                        <ul className="list-disc list-inside space-y-1 ml-4">
                          <li>Complete all questions within the time limit</li>
                          <li>You may flag questions for later review</li>
                          <li>Use the comment feature to note any concerns</li>
                          <li>Submit your exam before time expires</li>
                          <li>Results will be available immediately after submission</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons - Fixed at bottom */}
                <div className="flex gap-3 pt-4 border-t mt-4 flex-shrink-0">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowExamDialog(false)}
                    className="flex-1"
                  >
                    Back to Exams
                  </Button>
                  
                  {hasEnoughCredits(selectedExam) ? (
                    <Button 
                      onClick={handleStartExam}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Start Exam
                    </Button>
                  ) : (
                    <Button 
                      onClick={handlePurchaseExam}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      Purchase Exam
                    </Button>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Resume Exam Dialog */}
        <ResumeExamDialog
          open={showResumeDialog}
          onOpenChange={setShowResumeDialog}
          onResumeExam={handleResumeExam}
        />

        {/* New Exam Warning Dialog */}
        <Dialog open={showNewExamWarning} onOpenChange={setShowNewExamWarning}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="size-5 text-orange-500" />
                Exam In Progress
              </DialogTitle>
              <DialogDescription>
                You have {savedExams.length} exam{savedExams.length !== 1 ? 's' : ''} in progress. Starting a new exam will not affect your saved progress.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Show most urgent saved exam */}
              {savedExams.length > 0 && (
                <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded border border-orange-200 dark:border-orange-800">
                  <div className="text-sm">
                    <div className="font-medium text-orange-800 dark:text-orange-200">
                      {savedExams[0].examTitle}
                    </div>
                    <div className="text-orange-700 dark:text-orange-300 mt-1">
                      Time remaining: {formatTimeRemaining(savedExams[0].timeRemaining)} • 
                      Progress: {getProgressPercentage(savedExams[0])}%
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    if (savedExams.length > 0) {
                      handleResumeExam(savedExams[0]);
                    }
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <PlayCircle className="size-4 mr-2" />
                  Resume Current Exam
                </Button>
                <Button
                  variant="outline"
                  onClick={handleProceedWithNewExam}
                  className="flex-1"
                >
                  Start New Exam
                </Button>
              </div>
              
              {savedExams.length > 1 && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowNewExamWarning(false);
                    setShowResumeDialog(true);
                  }}
                  className="w-full text-sm"
                >
                  View All {savedExams.length} Saved Exams
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};