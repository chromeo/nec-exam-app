import React from 'react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Trophy, ArrowLeft, RotateCcw, CheckCircle, XCircle, Clock, Target, FileText, Printer, Download } from 'lucide-react';
import { FeedbackButton } from '../../FeedbackButton';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

interface ExamResultsViewProps {
  results: any;
  examSession?: any; // Add examSession prop to access question data
  onBackToSelection: () => void;
  onBackToMain: () => void;
  onReviewExam?: () => void;
}

export const ExamResultsView: React.FC<ExamResultsViewProps> = ({
  results,
  examSession,
  onBackToSelection,
  onBackToMain,
  onReviewExam,
}) => {
  if (!results) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold text-foreground mb-2">
            No Results Available
          </div>
          <div className="text-muted-foreground mb-4">
            There was an error loading your exam results.
          </div>
          <Button onClick={onBackToSelection}>
            Back to Exams
          </Button>
        </div>
      </div>
    );
  }

  const {
    examId,
    templateId,
    totalQuestions,
    answeredQuestions,
    correctAnswers,
    score,
    completedAt,
    answers,
    examTitle
  } = results;

  const completionRate = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;
  const accuracyRate = answeredQuestions > 0 ? (correctAnswers / answeredQuestions) * 100 : 0;

  const handlePrintResults = async () => {
    try {
      // Check if we have the necessary data
      if (!examSession || !examSession.questions || !results.detailedResults) {
        toast.error('Missing Data', {
          description: 'Unable to generate print view. Question data is not available.',
        });
        return;
      }

      // Detect current theme
      const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';

      // Build maps from detailedResults (same logic as ExamReviewView)
      const correctAnswersMap: Record<string, number> = {};
      const userAnswersMap: Record<string, number> = {}; // Build from detailedResults
      const codeReferencesMap: Record<string, string> = {};
      
      results.detailedResults.forEach((result: any) => {
        if (result.questionId) {
          const wasAnswered = result.userAnswer !== undefined && result.userAnswer !== null;
          
          // Store correct answer if question was answered
          if (wasAnswered && result.correctAnswer !== undefined && result.correctAnswer !== null) {
            correctAnswersMap[result.questionId] = result.correctAnswer;
          }
          
          // Store user's answer
          if (wasAnswered) {
            userAnswersMap[result.questionId] = result.userAnswer;
          }
          
          // Store code reference
          if (result.code_reference) {
            codeReferencesMap[result.questionId] = result.code_reference;
          }
        }
      });

      // Transform questions with correct answers and code references
      const questions = examSession.questions.map((q: any) => ({
        id: q.id,
        question: q.question || q.text,
        options: [q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean),
        correctAnswer: correctAnswersMap[q.id],
        code_reference: codeReferencesMap[q.id] || q.code_reference,
      }));

      // Generate questions HTML
      const questionsHTML = questions
        .map((q: any, index: number) => {
          const userAnswer = userAnswersMap[q.id]; // Use the map we built from detailedResults
          const isAnswered = userAnswer !== undefined;
          const isCorrect = isAnswered && userAnswer === q.correctAnswer;

          // Generate status badge
          let statusBadge = '';
          let statusColor = '';
          if (!isAnswered) {
            statusBadge = 'Unanswered';
            statusColor = '#6b7280';
          } else if (isCorrect) {
            statusBadge = 'Correct';
            statusColor = '#16a34a';
          } else {
            statusBadge = 'Incorrect';
            statusColor = '#dc2626';
          }

          // Generate options HTML
          const optionsHTML = q.options
            .map((option: string, optIndex: number) => {
              const isUserAnswer = isAnswered && userAnswer === optIndex;
              const isCorrectAnswer = optIndex === q.correctAnswer;
              const optionLetter = String.fromCharCode(65 + optIndex);

              return `
                <div class="option ${isCorrectAnswer ? 'correct-option' : ''}">
                  <div class="option-radio">
                    <input type="radio" ${isUserAnswer ? 'checked' : ''} disabled />
                  </div>
                  <div class="option-content">
                    <span class="option-letter">${optionLetter}.</span>
                    <span class="option-text">${option}</span>
                    ${isCorrectAnswer ? '<span class="checkmark">✓</span>' : ''}
                  </div>
                </div>
              `;
            })
            .join('');

          // Status message
          let statusMessage = '';
          if (!isAnswered) {
            statusMessage = '<p class="status-message unanswered">You did not answer this question.</p>';
          } else if (isCorrect) {
            statusMessage = `<p class="status-message correct">Your answer is correct.</p>`;
          } else {
            statusMessage = `<p class="status-message incorrect">Your answer is incorrect.</p>`;
          }

          return `
            <div class="question-card">
              <div class="question-header">
                <div class="question-title">
                  <span class="question-number">Question ${index + 1}</span>
                </div>
                <div class="question-meta">
                  <span class="status-badge" style="background-color: ${statusColor}">${statusBadge}</span>
                  <span class="points">1.00 points out of 1.00</span>
                </div>
              </div>
              
              <div class="question-text">${q.question}</div>
              
              <div class="select-one">Select one:</div>
              
              <div class="options">
                ${optionsHTML}
              </div>
              
              ${statusMessage}
              <p class="correct-answer">The correct answer is: ${q.options[q.correctAnswer] || 'N/A'}</p>
              
              ${q.code_reference ? `<div class="reference-box">${q.code_reference}</div>` : ''}
              
              <p class="feedback-note">Problem with this question? Use <strong>Review Answers</strong> mode to report issues.</p>
            </div>
          `;
        })
        .join('');

      // Create print window
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Popup Blocked', {
          description: 'Please allow popups to print results.',
        });
        return;
      }

      // Generate full HTML
      const printContent = `
        <!DOCTYPE html>\n        <html class="${currentTheme}">
        <head>
          <title>Exam Results - ${examTitle || 'Exam'}</title>
          <style>
            @media print {
              @page { 
                margin: 0.75in;
                size: letter;
              }
              body { 
                margin: 0;
                background: #fff !important;
                color: #000 !important;
              }
            }
            
            * {
              box-sizing: border-box;
            }
            
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              max-width: 8.5in;
              margin: 0 auto;
              padding: 20px;
              color: #000;
              background: #fff;
              line-height: 1.6;
              font-size: 14px;
            }
            
            /* Dark theme for screen view only */
            @media screen {
              html.dark body {
                background: #0a0a0a;
                color: #e5e7eb;
              }
              
              html.dark .header {
                border-bottom-color: #27272a;
              }
              
              html.dark .header h1 {
                color: #fafafa;
              }
              
              html.dark .header .exam-info {
                color: #a1a1aa;
              }
              
              html.dark .summary {
                background: #18181b;
                border-color: #27272a;
              }
              
              html.dark .summary h2 {
                color: #fafafa;
              }
              
              html.dark .summary-item {
                background: #09090b;
              }
              
              html.dark .summary-item .label {
                color: #a1a1aa;
              }
              
              html.dark .summary-item .value {
                color: #fafafa;
              }
              
              html.dark .questions-section h2 {
                border-bottom-color: #27272a;
                color: #fafafa;
              }
              
              html.dark .question-card {
                background: #18181b;
                border-color: #27272a;
              }
              
              html.dark .question-header {
                border-bottom-color: #27272a;
              }
              
              html.dark .question-number {
                color: #fafafa;
              }
              
              html.dark .points {
                color: #a1a1aa;
              }
              
              html.dark .question-text {
                color: #e5e7eb;
              }
              
              html.dark .select-one {
                color: #fafafa;
              }
              
              html.dark .option {
                background: #09090b;
              }
              
              html.dark .option.correct-option {
                background: #14532d;
              }
              
              html.dark .option-letter {
                color: #fafafa;
              }
              
              html.dark .option-text {
                color: #e5e7eb;
              }
              
              html.dark .ref-code {
                background: #27272a;
                color: #a1a1aa;
              }
              
              html.dark .correct-answer {
                color: #e5e7eb;
              }
              
              html.dark .footer {
                border-top-color: #27272a;
              }
              
              html.dark .footer p {
                color: #71717a;
              }
              
              /* Dark mode for feedback note */
              html.dark .feedback-note {
                color: #9ca3af;
              }
            }
            
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #e5e7eb;
            }
            
            .header h1 {
              margin: 0 0 10px 0;
              font-size: 24px;
              font-weight: 600;
              color: #000;
            }
            
            .header .exam-info {
              margin: 8px 0;
              color: #666;
              font-size: 13px;
            }
            
            .summary {
              background: #f9fafb;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 30px;
              border: 1px solid #e5e7eb;
              page-break-inside: avoid;
            }
            
            .summary h2 {
              margin: 0 0 15px 0;
              font-size: 18px;
              font-weight: 600;
            }
            
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 12px;
            }
            
            .summary-item {
              display: flex;
              justify-content: space-between;
              padding: 8px;
              background: #fff;
              border-radius: 4px;
            }
            
            .summary-item .label {
              color: #666;
              font-size: 13px;
            }
            
            .summary-item .value {
              font-weight: 600;
              color: #000;
              font-size: 13px;
            }
            
            .questions-section {
              margin-top: 30px;
            }
            
            .questions-section h2 {
              font-size: 18px;
              font-weight: 600;
              margin-bottom: 20px;
              padding-bottom: 10px;
              border-bottom: 2px solid #e5e7eb;
            }
            
            .question-card {
              background: #fff;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 20px;
              margin-bottom: 20px;
              page-break-inside: avoid;
            }
            
            .question-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding-bottom: 12px;
              border-bottom: 1px solid #e5e7eb;
              margin-bottom: 15px;
            }
            
            .question-number {
              font-size: 16px;
              font-weight: 600;
              color: #000;
            }
            
            .question-meta {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            
            .status-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: 600;
              color: #fff;
            }
            
            .points {
              font-size: 12px;
              color: #666;
            }
            
            .question-text {
              font-size: 14px;
              line-height: 1.6;
              margin-bottom: 15px;
              color: #000;
            }
            
            .select-one {
              font-size: 16px;
              font-weight: 600;
              margin-bottom: 12px;
              color: #000;
            }
            
            .options {
              margin-bottom: 15px;
            }
            
            .option {
              display: flex;
              align-items: flex-start;
              padding: 10px;
              margin-bottom: 8px;
              border-radius: 4px;
              background: #fff;
            }
            
            .option.correct-option {
              background: #f0fdf4;
            }
            
            .option-radio {
              margin-right: 10px;
              margin-top: 2px;
            }
            
            .option-radio input[type="radio"] {
              width: 16px;
              height: 16px;
            }
            
            .option-content {
              flex: 1;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            
            .option-letter {
              font-weight: 600;
              color: #000;
            }
            
            .option-text {
              flex: 1;
              color: #000;
            }
            
            .checkmark {
              color: #16a34a;
              font-size: 18px;
              font-weight: bold;
            }
            
            .ref-code {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              color: #666;
              background: #f3f4f6;
              padding: 2px 6px;
              border-radius: 3px;
            }
            
            .status-message {
              margin: 10px 0;
              font-size: 13px;
            }
            
            .status-message.correct {
              color: #16a34a;
            }
            
            .status-message.incorrect {
              color: #dc2626;
            }
            
            .status-message.unanswered {
              color: #6b7280;
            }
            
            .correct-answer {
              margin: 5px 0 0 0;
              font-size: 13px;
              color: #000;
            }
            
            .reference-box {
              margin-top: 15px;
              padding: 12px 14px;
              background: #eff6ff;
              border: 2px solid #3b82f6;
              border-radius: 6px;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              font-size: 13px;
              line-height: 1.6;
              color: #1e3a8a;
            }
            
            /* Dark mode for reference box */
            @media screen {
              html.dark .reference-box {
                background: #1e293b;
                border-color: #60a5fa;
                color: #bfdbfe;
              }
            }
            
            /* Print mode for reference box */
            @media print {
              .reference-box {
                background: #eff6ff !important;
                border-color: #3b82f6 !important;
                color: #1e3a8a !important;
              }
            }
            
            .feedback-note {
              margin-top: 10px;
              font-size: 12px;
              color: #6b7280;
            }
            
            /* Dark mode for feedback note */
            @media screen {
              html.dark .feedback-note {
                color: #9ca3af;
              }
            }
            
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              text-align: center;
            }
            
            .footer p {
              margin: 5px 0;
              color: #6b7280;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Exam Results</h1>
            <div class="exam-info">
              <strong>${examTitle || 'Exam'}</strong>
            </div>
            <div class="exam-info">
              Completed: ${completedAt ? new Date(completedAt).toLocaleString() : 'N/A'}
            </div>
          </div>

          <div class="summary">
            <h2>Score Summary</h2>
            <div class="summary-grid">
              <div class="summary-item">
                <span class="label">Final Score:</span>
                <span class="value">${score}%</span>
              </div>
              <div class="summary-item">
                <span class="label">Correct Answers:</span>
                <span class="value">${correctAnswers} / ${answeredQuestions}</span>
              </div>
              <div class="summary-item">
                <span class="label">Completion Rate:</span>
                <span class="value">${Math.round(completionRate)}% (${answeredQuestions}/${totalQuestions})</span>
              </div>
              <div class="summary-item">
                <span class="label">Accuracy:</span>
                <span class="value">${Math.round(accuracyRate)}%</span>
              </div>
            </div>
          </div>

          <div class="questions-section">
            <h2>Question & Answer Details</h2>
            ${questionsHTML}
          </div>

          <div class="footer">
            <p>End of Exam Results</p>
            <p>Generated: ${new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}</p>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();

      // Wait for content to load, then trigger print
      printWindow.onload = () => {
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };

      toast.success('Print Ready', {
        description: 'Print dialog opened. Use the browser\'s print dialog to save as PDF.',
      });
    } catch (error) {
      console.error('Error generating print view:', error);
      toast.error('Print Failed', {
        description: 'Could not generate print view. Please try again.',
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Feedback Button */}
      <FeedbackButton />
      
      {/* Header */}
      <header className="border-b flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBackToMain}
                className="mr-4"
              >
                <ArrowLeft className="size-4 mr-2" />
                Back to Exams
              </Button>
              <Trophy className="size-8 text-muted-foreground mr-3" />
              <h1 className="text-2xl font-semibold text-foreground">Exam Results</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Results Overview */}
          <div className="mb-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">
                {score >= 90 ? '🎉' : score >= 70 ? '👍' : '📚'}
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-2">
                {score >= 90 ? 'Excellent Work!' : score >= 70 ? 'Good Effort!' : 'Keep Studying!'}
              </h2>
              <p className="text-muted-foreground">
                Your exam has been completed and scored
              </p>
            </div>

            {/* Score Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Final Score</CardTitle>
                  <Target className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{score}%</div>
                  <p className="text-xs text-muted-foreground">
                    Overall performance
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Correct Answers</CardTitle>
                  <CheckCircle className="size-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{correctAnswers}</div>
                  <p className="text-xs text-muted-foreground">
                    Out of {answeredQuestions} answered
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                  <XCircle className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Math.round(completionRate)}%</div>
                  <p className="text-xs text-muted-foreground">
                    {answeredQuestions} of {totalQuestions} questions
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Accuracy</CardTitle>
                  <Trophy className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Math.round(accuracyRate)}%</div>
                  <p className="text-xs text-muted-foreground">
                    Of answered questions
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Performance Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Summary</CardTitle>
                  <CardDescription>
                    Your exam performance breakdown
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Questions Answered:</span>
                    <Badge variant="outline">
                      {answeredQuestions} / {totalQuestions}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Correct Answers:</span>
                    <Badge variant="default" className="bg-green-500">
                      {correctAnswers}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Incorrect Answers:</span>
                    <Badge variant="destructive">
                      {answeredQuestions - correctAnswers}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Unanswered:</span>
                    <Badge variant="secondary">
                      {totalQuestions - answeredQuestions}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Exam Details</CardTitle>
                  <CardDescription>
                    Information about your exam session
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Exam:</span>
                    <span className="text-sm font-medium">
                      {examTitle || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Completed:</span>
                    <span className="text-sm">
                      {completedAt ? new Date(completedAt).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Action Button */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {onReviewExam && (
                <Button
                  onClick={onReviewExam}
                  size="lg"
                  variant="default"
                  className="flex items-center gap-2"
                >
                  <FileText className="size-4" />
                  Review Answers
                </Button>
              )}
              <Button
                onClick={handlePrintResults}
                size="lg"
                variant="outline"
                className="flex items-center gap-2"
              >
                <Printer className="size-4" />
                Print Results
              </Button>
              <Button
                onClick={() => {
                  // Create a formatted text version of results
                  const resultsText = `
EXAM RESULTS
============

Exam: ${examTitle || 'N/A'}
Completed: ${completedAt ? new Date(completedAt).toLocaleString() : 'N/A'}

SCORE SUMMARY
-------------
Final Score: ${score}%
Correct Answers: ${correctAnswers} / ${answeredQuestions} answered
Completion Rate: ${Math.round(completionRate)}% (${answeredQuestions} of ${totalQuestions} questions)
Accuracy: ${Math.round(accuracyRate)}% of answered questions

BREAKDOWN
---------
Questions Answered: ${answeredQuestions}
Correct: ${correctAnswers}
Incorrect: ${answeredQuestions - correctAnswers}
Unanswered: ${totalQuestions - answeredQuestions}
                  `.trim();

                  // Create and download the file
                  const blob = new Blob([resultsText], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `exam-results-${examTitle?.replace(/\s+/g, '-').toLowerCase() || 'unknown'}-${new Date().toISOString().split('T')[0]}.txt`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                size="lg"
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="size-4" />
                Download Results
              </Button>
              <Button
                onClick={onBackToMain}
                size="lg"
                variant="ghost"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="size-4" />
                Back to Exam Selection
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};