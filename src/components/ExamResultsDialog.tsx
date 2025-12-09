import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Trophy, Target, Award, TrendingUp, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface CategoryBreakdown {
  correct: number;
  total: number;
  percentage: number;
}

interface ExamResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  score: number;
  totalQuestions: number;
  percentage: number;
  categoryBreakdown?: { [category: string]: CategoryBreakdown };
  timeSpent?: number;
  examTitle?: string;
  onContinue: () => void;
}

export function ExamResultsDialog({
  open,
  onOpenChange,
  score,
  totalQuestions,
  percentage,
  categoryBreakdown,
  timeSpent,
  examTitle,
  onContinue,
}: ExamResultsDialogProps) {
  const passed = percentage >= 80;
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const getScoreColor = (percent: number) => {
    if (percent >= 90) return "text-green-600 bg-green-50 border-green-200";
    if (percent >= 80) return "text-blue-600 bg-blue-50 border-blue-200";
    if (percent >= 70) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getCategoryIcon = (percent: number) => {
    if (percent >= 80) return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  const sortedCategories = categoryBreakdown 
    ? Object.entries(categoryBreakdown).sort(([, a], [, b]) => b.percentage - a.percentage)
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Exam Results
          </DialogTitle>
          <DialogDescription>
            {examTitle && `${examTitle} - `}Detailed breakdown of your performance
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Overall Score Card */}
          <Card className={`border-2 ${getScoreColor(percentage)}`}>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="space-y-2">
                  <div className="text-4xl font-bold">{percentage}%</div>
                  <div className="text-lg font-medium">
                    {score} out of {totalQuestions} questions correct
                  </div>
                </div>
                
                <Badge 
                  variant={passed ? "default" : "destructive"}
                  className="text-lg px-4 py-2"
                >
                  {passed ? (
                    <>
                      <Award className="h-4 w-4 mr-2" />
                      PASSED
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      FAILED
                    </>
                  )}
                </Badge>

                {timeSpent && (
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>Time taken: {formatTime(timeSpent)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          {sortedCategories.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Performance by Category
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {sortedCategories.map(([category, breakdown]) => (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(breakdown.percentage)}
                        <span className="font-medium">{category}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600">
                          {breakdown.correct}/{breakdown.total}
                        </span>
                        <span className="font-medium min-w-[3rem] text-right">
                          {breakdown.percentage}%
                        </span>
                      </div>
                    </div>
                    <Progress 
                      value={breakdown.percentage} 
                      className="h-2"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Performance Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {percentage >= 90 && (
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <Trophy className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-green-800">Excellent Performance!</div>
                    <div className="text-sm text-green-700">
                      You demonstrated exceptional mastery of the material.
                    </div>
                  </div>
                </div>
              )}
              
              {percentage >= 80 && percentage < 90 && (
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <Award className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-blue-800">Good Performance!</div>
                    <div className="text-sm text-blue-700">
                      You passed the exam with a solid understanding of the material.
                    </div>
                  </div>
                </div>
              )}
              
              {percentage < 80 && (
                <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-red-800">Additional Study Recommended</div>
                    <div className="text-sm text-red-700">
                      Consider reviewing the material and retaking the exam when ready.
                    </div>
                  </div>
                </div>
              )}

              {/* Category-specific recommendations */}
              {sortedCategories.length > 0 && (
                <div className="pt-3 border-t">
                  <div className="text-sm font-medium mb-2">Focus Areas:</div>
                  <div className="space-y-1">
                    {sortedCategories
                      .filter(([, breakdown]) => breakdown.percentage < 80)
                      .slice(0, 3)
                      .map(([category, breakdown]) => (
                        <div key={category} className="text-sm text-gray-600">
                          • <span className="font-medium">{category}</span>: 
                          Consider additional study in this area ({breakdown.percentage}%)
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-center pt-4">
            <Button onClick={onContinue} size="lg" className="px-8">
              Continue
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}