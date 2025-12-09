import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, ChevronLeft, ChevronRight, MessageSquare, Send } from 'lucide-react';
import { ScrollArea } from '../../ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../ui/collapsible';
import { FeedbackButton } from '../../FeedbackButton';
import { QuestionCommentDialog } from '../../QuestionCommentDialog';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer?: number; // Make optional - undefined for unanswered questions
  explanation?: string;
  category?: string;
  code_reference?: string;
}

interface ExamReviewViewProps {
  questions: Question[];
  userAnswers: Record<string, number>;
  accessToken: string;
  onBack: () => void;
}

export const ExamReviewView: React.FC<ExamReviewViewProps> = ({
  questions,
  userAnswers,
  accessToken,
  onBack,
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect' | 'unanswered'>('all');
  const [questionComments, setQuestionComments] = useState<Record<string, { text: string; category: string }>>({});
  


  // Filter questions based on selected filter
  const filteredQuestions = questions.filter((q) => {
    const userAnswer = userAnswers[q.id];
    const isCorrect = userAnswer !== undefined && userAnswer === q.correctAnswer;
    const isAnswered = userAnswer !== undefined;

    switch (filter) {
      case 'correct':
        return isAnswered && isCorrect;
      case 'incorrect':
        return isAnswered && !isCorrect;
      case 'unanswered':
        return !isAnswered;
      default:
        return true;
    }
  });

  const currentQuestion = filteredQuestions[currentQuestionIndex];
  
  // Calculate stats for all questions
  const stats = {
    total: questions.length,
    correct: questions.filter(q => {
      const ans = userAnswers[q.id];
      return ans !== undefined && ans === q.correctAnswer;
    }).length,
    incorrect: questions.filter(q => {
      const ans = userAnswers[q.id];
      return ans !== undefined && ans !== q.correctAnswer;
    }).length,
    unanswered: questions.filter(q => userAnswers[q.id] === undefined).length,
  };

  // Only calculate these if we have a current question
  const originalIndex = currentQuestion ? questions.findIndex(q => q.id === currentQuestion.id) : -1;
  const userAnswer = currentQuestion ? userAnswers[currentQuestion.id] : undefined;
  const isCorrect = currentQuestion && userAnswer !== undefined && userAnswer === currentQuestion.correctAnswer;
  const isAnswered = currentQuestion && userAnswer !== undefined;

  // Handler for submitting comment (using user-feedback endpoint)
  const handleCommentSave = async (questionId: string, commentData: { text: string; category: string }) => {
    if (!commentData.text.trim()) {
      toast.error('Empty Comment', {
        description: 'Please enter your feedback before saving.',
      });
      return;
    }

    console.log('📝 Submitting comment for question:', questionId);
    console.log('📝 Comment data:', commentData);

    try {
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-a9be5165/user-feedback`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          questionId: questionId,
          comment: commentData.text.trim(),
          category: commentData.category,
          context: 'exam_review',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server responded with ${response.status}: ${errorText}`);
      }

      toast.success('Comment Submitted', {
        description: 'Thank you for your feedback! We\'ll review it shortly.',
      });

      // Clear the local comment for this question so the dialog opens fresh next time
      // This allows users to submit multiple comments on the same question if needed
      const newComments = { ...questionComments };
      delete newComments[questionId];
      setQuestionComments(newComments);
    } catch (error) {
      console.error('❌ Error submitting comment:', error);
      toast.error('Submission Failed', {
        description: error instanceof Error ? error.message : 'Could not submit comment. Please try again.',
      });
    }
  };

  return (
    <div className="flex-1 bg-background flex flex-col overflow-hidden">
      {/* Feedback Button */}
      <FeedbackButton />
      
      {/* Header */}
      <header className="border-b bg-card flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
              >
                <ArrowLeft className="size-4 mr-2" />
                Back to Results
              </Button>
              <div className="h-6 w-px bg-border" />
              <h1 className="text-xl font-semibold text-foreground">Answer Review</h1>
            </div>
            <div className="flex items-center gap-3">
              {/* Status Badge - Only show when there's a current question */}
              {currentQuestion && (
                <>
                  {!isAnswered ? (
                    <Badge variant="secondary" className="text-base px-4 py-2">
                      <AlertCircle className="size-4 mr-2" />
                      Not Answered
                    </Badge>
                  ) : isCorrect ? (
                    <Badge variant="default" className="text-base px-4 py-2 bg-green-600">
                      <CheckCircle className="size-4 mr-2" />
                      Correct
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-base px-4 py-2">
                      <XCircle className="size-4 mr-2" />
                      Incorrect
                    </Badge>
                  )}
                  <div className="h-6 w-px bg-border" />
                </>
              )}
              <Badge variant="outline">
                {filteredQuestions.length > 0 
                  ? `Question ${currentQuestionIndex + 1} of ${filteredQuestions.length}`
                  : `No ${filter !== 'all' ? filter : ''} questions`.trim()
                }
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Question Review */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {/* Show message when no questions match the filter */}
              {!currentQuestion ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <AlertCircle className="size-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Questions Match This Filter</h3>
                  <p className="text-muted-foreground mb-6">
                    Try selecting a different filter to view questions.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFilter('all');
                      setCurrentQuestionIndex(0);
                    }}
                  >
                    Show All Questions
                  </Button>
                </div>
              ) : (
                <>
                  {/* Question Text */}
                  <Card className="bg-muted/30 mb-6">
                    <CardContent className="pt-6">
                      <p className="text-lg leading-relaxed text-foreground">
                        {currentQuestion.question}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Answer Options */}
                  <div className="space-y-2 mb-6">
                    {currentQuestion.options.map((option, index) => {
                      const isUserAnswer = userAnswer === index;
                      // Only show correct answer if the question was answered (correctAnswer is defined)
                      const isCorrectAnswer = currentQuestion.correctAnswer !== undefined && index === currentQuestion.correctAnswer;
                      
                      let borderColor = 'border-border';
                      let bgColor = 'bg-card';
                      
                      if (isCorrectAnswer) {
                        borderColor = 'border-green-500';
                        bgColor = 'bg-green-50 dark:bg-green-950/50';
                      } else if (isUserAnswer && !isCorrect) {
                        borderColor = 'border-red-500';
                        bgColor = 'bg-red-50 dark:bg-red-950/50';
                      }

                      return (
                        <div
                          key={index}
                          className={`p-3 border-2 rounded-lg ${borderColor} ${bgColor}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                              {isCorrectAnswer ? (
                                <div className="size-6 rounded-full bg-green-500 flex items-center justify-center">
                                  <CheckCircle className="size-4 text-white" />
                                </div>
                              ) : isUserAnswer && !isCorrect ? (
                                <div className="size-6 rounded-full bg-red-500 flex items-center justify-center">
                                  <XCircle className="size-4 text-white" />
                                </div>
                              ) : (
                                <div className="size-6 rounded-full border-2 border-muted-foreground/50" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-base">
                                  {String.fromCharCode(65 + index)}.
                                </span>
                                {isUserAnswer && (
                                  <Badge variant="outline" className="text-xs">
                                    Your Answer
                                  </Badge>
                                )}
                                {isCorrectAnswer && (
                                  <Badge className="text-xs bg-green-600">
                                    Correct Answer
                                  </Badge>
                                )}
                              </div>
                              <p className="text-base leading-relaxed">{option}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  {currentQuestion.explanation && (
                    <Card className="border-2 border-primary/50 bg-primary/5 mb-6">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Explanation
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-base leading-relaxed">{currentQuestion.explanation}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Reference Information */}
                  {currentQuestion.code_reference && (
                    <Card className="border-2 border-blue-500 dark:border-blue-600 bg-blue-50 dark:bg-blue-950/30 mb-6">
                      <CardHeader className="py-[10px] px-[21px]">
                        <CardTitle className="text-base text-blue-900 dark:text-blue-100 flex items-center gap-2">
                          <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                          Reference
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-blue-800 dark:text-blue-200 text-sm leading-relaxed">
                          {currentQuestion.code_reference}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Feedback Section */}
                  <div className="bg-muted/30 border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <MessageSquare className="size-5 text-muted-foreground flex-shrink-0" />
                      <p className="text-sm text-muted-foreground">
                        Problem with this question, answers, or code reference?
                      </p>
                    </div>
                    <QuestionCommentDialog
                      currentComment={questionComments[currentQuestion.id]?.text || ''}
                      currentCategory={questionComments[currentQuestion.id]?.category as 'Uncategorized' | 'Spelling' | 'Flawed Logic' | 'Poor Structure' | undefined}
                      onCommentSave={(commentData) => handleCommentSave(currentQuestion.id, commentData)}
                      questionNumber={originalIndex + 1}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Navigation Footer - Fixed at bottom */}
          <div className="border-t bg-card p-4 flex-shrink-0">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  const newIndex = Math.max(0, currentQuestionIndex - 1);
                  setCurrentQuestionIndex(newIndex);
                  console.log('⬅️ Previous button clicked. New index:', newIndex);
                }}
                disabled={currentQuestionIndex === 0}
              >
                <ChevronLeft className="size-4 mr-2" />
                Previous Question
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentQuestionIndex + 1} of {filteredQuestions.length} {filter !== 'all' ? `(${filter})` : ''}
              </span>
              <Button
                variant="outline"
                onClick={() => {
                  const newIndex = Math.min(filteredQuestions.length - 1, currentQuestionIndex + 1);
                  setCurrentQuestionIndex(newIndex);
                  console.log('➡️ Next button clicked. New index:', newIndex);
                }}
                disabled={currentQuestionIndex === filteredQuestions.length - 1}
              >
                Next Question
                <ChevronRight className="size-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right: Question Index */}
        <div className="w-80 border-l bg-muted/30">
          <div className="p-4 border-b bg-card">
            <h2 className="font-semibold mb-4">Filter Questions</h2>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setFilter('all');
                  setCurrentQuestionIndex(0);
                }}
                className="justify-start"
              >
                All ({stats.total})
              </Button>
              <Button
                variant={filter === 'correct' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setFilter('correct');
                  setCurrentQuestionIndex(0);
                }}
                className="justify-start"
              >
                <CheckCircle className="size-3 mr-1" />
                Correct ({stats.correct})
              </Button>
              <Button
                variant={filter === 'incorrect' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setFilter('incorrect');
                  setCurrentQuestionIndex(0);
                }}
                className="justify-start"
              >
                <XCircle className="size-3 mr-1" />
                Wrong ({stats.incorrect})
              </Button>
              <Button
                variant={filter === 'unanswered' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setFilter('unanswered');
                  setCurrentQuestionIndex(0);
                }}
                className="justify-start"
              >
                <AlertCircle className="size-3 mr-1" />
                Skipped ({stats.unanswered})
              </Button>
            </div>
          </div>
          
          <ScrollArea className="h-[calc(100vh-16rem)]">
            <div className="p-4 space-y-2">
              {filteredQuestions.map((q, index) => {
                const qIndex = questions.findIndex(question => question.id === q.id);
                const answer = userAnswers[q.id];
                const correct = answer !== undefined && answer === q.correctAnswer;
                const answered = answer !== undefined;
                const isCurrent = index === currentQuestionIndex;

                // Determine border color based on answer status
                let borderColorClass = 'border-border';
                let bgColorClass = 'bg-card';
                
                if (answered) {
                  if (correct) {
                    borderColorClass = 'border-green-500';
                    bgColorClass = isCurrent ? 'bg-green-50 dark:bg-green-950/30' : 'bg-card';
                  } else {
                    borderColorClass = 'border-red-500';
                    bgColorClass = isCurrent ? 'bg-red-50 dark:bg-red-950/30' : 'bg-card';
                  }
                } else {
                  borderColorClass = 'border-gray-400 dark:border-gray-600';
                  bgColorClass = isCurrent ? 'bg-gray-50 dark:bg-gray-900/30' : 'bg-card';
                }
                
                if (isCurrent) {
                  borderColorClass = borderColorClass + ' border-2';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIndex(index)}
                    className={`w-full p-3 text-left border rounded-lg transition-all ${borderColorClass} ${bgColorClass} hover:shadow-sm`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">Q{qIndex + 1}</span>
                      {!answered ? (
                        <AlertCircle className="size-4 text-gray-500" />
                      ) : correct ? (
                        <CheckCircle className="size-4 text-green-500" />
                      ) : (
                        <XCircle className="size-4 text-red-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {q.question}
                    </p>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};