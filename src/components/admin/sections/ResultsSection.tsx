import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../../ui/alert-dialog";
import { AdminSectionHeader } from "../AdminSectionHeader";
import { useAdminApi } from "../../../hooks/useAdminApi";
import { RefreshCw, MessageSquare, Eye, Trash2, AlertTriangle } from "lucide-react";
import type { ExamResult, ExamTemplate } from "../../../supabase/functions/server/types";
import { getTemplateId } from "../../../utils/typeConverters";

interface ResultsSectionProps {
  accessToken: string;
}

/**
 * Simplified 3-Status Filter System
 * 
 * CORE PRINCIPLE: Results = Submitted Exams Only
 * - An exam must be submitted (have submittedAt timestamp) to be a "result"
 * - Submission triggers: Timer expires OR user clicks "Submit Exam"
 * - Real-world behavior: Exams are scored even with unanswered questions
 * 
 * Filter Options:
 * - "All" = All submitted exams (passed + failed)
 * - "Passed" = Submitted with percentage >= 70
 * - "Failed" = Submitted with percentage < 70
 * 
 * Removed: "In Progress", "Not Started", "Abandoned", "Completed" (redundant/ambiguous)
 */
type FilterOption = "All" | "Passed" | "Failed";

export const ResultsSection = ({ accessToken }: ResultsSectionProps) => {
  const { 
    resultsApi, 
    templatesApi, 
    isLoading, 
    error
  } = useAdminApi(accessToken);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [allResults, setAllResults] = useState<ExamResult[]>([]);
  const [templates, setTemplates] = useState<ExamTemplate[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>("All");
  const [selectedExamType, setSelectedExamType] = useState<string>("All");
  const [selectedExamForDetail, setSelectedExamForDetail] = useState<ExamResult | null>(null);
  const [deletingResultId, setDeletingResultId] = useState<string | null>(null);

  // Create a template lookup map using useMemo
  const templateMap = useMemo(() => {
    const map = new Map<string, string>();
    templates.forEach(t => {
      map.set(t.id, t.title);
    });
    return map;
  }, [templates]);

  // Helper function to get template title (uses the memoized map)
  const getTemplateTitle = (result: ExamResult): string => {
    // First check if result already has a valid title
    if (result.templateTitle && result.templateTitle !== 'Unknown Exam') {
      return result.templateTitle;
    }
    if (result.examTitle && result.examTitle !== 'Unknown Exam') {
      return result.examTitle;
    }
    
    // Try to get from template map
    let templateId = getTemplateId(result);
    
    // 🛡️ DEFENSIVE: Strip any prefix (e.g., "exam-template:" or "template:")
    // This handles inconsistency between old data (with prefixes) and new data (clean IDs)
    if (templateId && templateId.includes(':')) {
      templateId = templateId.split(':').pop() || templateId;
    }
    
    if (templateId && templateMap.has(templateId)) {
      return templateMap.get(templateId)!;
    }
    
    return 'Unknown Exam';
  };

  // Get available exam types from results (dynamically resolved)
  const availableExamTypes = useMemo(() => {
    const types = new Set<string>();
    allResults.forEach(result => {
      types.add(getTemplateTitle(result));
    });
    return Array.from(types).sort();
  }, [allResults, templateMap]);

  // Filter results based on selected filters
  // NOTE: Server endpoint now only returns submitted exams (not sessions)
  // The submittedAt check below is defensive (server already filtered)
  const filteredResults = useMemo(() => {
    // Defensive filter: ensure all results have submittedAt timestamp
    let filtered = allResults.filter(result => result.submittedAt);

    // Apply status filter
    switch (selectedFilter) {
      case "Passed":
        filtered = filtered.filter(result => result.percentage >= 70);
        break;
      case "Failed":
        filtered = filtered.filter(result => result.percentage < 70);
        break;
      case "All":
        // Already filtered to submitted exams only
        break;
    }

    // Apply exam type filter
    if (selectedExamType !== "All") {
      filtered = filtered.filter(result => getTemplateTitle(result) === selectedExamType);
    }

    return filtered;
  }, [allResults, selectedFilter, selectedExamType, templateMap]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([
      loadResults(),
      loadTemplates()
    ]);
  };

  const loadTemplates = async () => {
    const result = await templatesApi.getAll();
    if (result.success && result.data) {
      setTemplates(result.data);
    }
  };

  const loadResults = async () => {
    const result = await resultsApi.getAll();
    
    if (result.success && result.data) {
      // Remove duplicates
      const uniqueResults = result.data.filter((exam, index, self) => 
        index === self.findIndex(e => e.id === exam.id)
      );
      
      setAllResults(uniqueResults);
      setResults(uniqueResults);
    }
  };

  // Update results when filters change
  useEffect(() => {
    setResults(filteredResults);
  }, [filteredResults]);

  // ✅ FIXED: Removed legacy questionComments field reference
  // Comment system now uses standalone Comment entities, not embedded fields
  const examHasComments = (exam: ExamResult) => {
    return exam.detailedResults && exam.detailedResults.some(dr => dr.comment);
  };

  // ✅ FIXED: Removed legacy questionComments field reference
  const getCommentCount = (exam: ExamResult) => {
    if (exam.detailedResults) {
      return exam.detailedResults.filter(dr => dr.comment).length;
    }
    return 0;
  };

  const handleDeleteResult = async (resultId: string) => {
    setDeletingResultId(resultId);
    
    try {
      const response = await resultsApi.delete(resultId);
      
      if (response.success) {
        setAllResults(prev => prev.filter(result => result.id !== resultId));
        setResults(prev => prev.filter(result => result.id !== resultId));
        
        if (selectedExamForDetail?.id === resultId) {
          setSelectedExamForDetail(null);
        }
      } else {
        console.error('Failed to delete result:', response.error);
        alert('Failed to delete exam result. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting result:', error);
      alert('An error occurred while deleting the exam result.');
    } finally {
      setDeletingResultId(null);
    }
  };

  return (
    <div className="p-6 pt-0 space-y-6">
      <AdminSectionHeader
        title="Exam Results"
        description="View student exam results and performance"
      />

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive font-medium">Error:</span>
            <span className="text-sm text-destructive">{error}</span>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Results</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Showing {results.length} of {allResults.length} results
                {templates.length > 0 && (
                  <span className="text-chart-2"> • {templates.length} templates loaded</span>
                )}
                {(selectedFilter !== "All" || selectedExamType !== "All") && (
                  <span>
                    {" "}(filtered by: {[
                      selectedFilter !== "All" ? `Status: ${selectedFilter}` : null,
                      selectedExamType !== "All" ? `Exam: ${selectedExamType}` : null
                    ].filter(Boolean).join(", ")})
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Select value={selectedFilter} onValueChange={(value) => setSelectedFilter(value as FilterOption)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Results</SelectItem>
                  <SelectItem value="Passed">Passed (≥70%)</SelectItem>
                  <SelectItem value="Failed">Failed (&lt;70%)</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedExamType} onValueChange={setSelectedExamType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by exam type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Exam Types</SelectItem>
                  {availableExamTypes.map(examType => (
                    <SelectItem key={examType} value={examType}>
                      {examType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={loadData} size="sm" variant="outline">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading results...</div>
          ) : results.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {selectedFilter === "All" && selectedExamType === "All" 
                ? "No exam results found" 
                : "No results found for the selected filters"}
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((result, index) => {
                const hasComments = examHasComments(result);
                const commentCount = getCommentCount(result);
                const displayTitle = getTemplateTitle(result);
                
                return (
                  <div 
                    key={result.id || `result-${index}`} 
                    className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedExamForDetail(result)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{displayTitle}</h3>
                          {hasComments && (
                            <Badge 
                              variant="outline" 
                              className="bg-primary/10 text-primary border-primary/20"
                            >
                              <MessageSquare className="w-3 h-3 mr-1" />
                              {commentCount} Comment{commentCount !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Student: {result.studentId}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {result.submittedAt 
                            ? `Submitted: ${new Date(result.submittedAt).toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })}`
                            : `Progress: ${result.answeredQuestions}/${result.totalQuestions} questions answered`
                          }
                        </p>
                      </div>
                      <div className="text-right space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline"
                            className={result.percentage >= 70 
                              ? "bg-chart-2/10 text-chart-2 border-chart-2/20" 
                              : "bg-chart-4/10 text-chart-4 border-chart-4/20"
                            }
                          >
                            {result.score}/{result.totalQuestions} ({result.percentage}%)
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedExamForDetail(result);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Details
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={(e) => e.stopPropagation()}
                                disabled={deletingResultId === result.id}
                                className="bg-[rgba(201,83,83,0.73)] text-[rgba(249,249,249,1)]"
                              >
                                {deletingResultId === result.id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Exam Result</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this exam result? This action cannot be undone.
                                  <br /><br />
                                  <strong>Exam:</strong> {displayTitle}
                                  <br />
                                  <strong>Student:</strong> {result.studentId}
                                  <br />
                                  <strong>Score:</strong> {result.score}/{result.totalQuestions} ({result.percentage}%)
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteResult(result.id);
                                  }}
                                  className="bg-destructive hover:bg-destructive/90 focus:ring-destructive"
                                >
                                  Delete Result
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {result.percentage >= 70 ? "Passed" : "Failed"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Exam View Dialog */}
      <Dialog open={!!selectedExamForDetail} onOpenChange={() => setSelectedExamForDetail(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Exam Details: {selectedExamForDetail ? getTemplateTitle(selectedExamForDetail) : ''}
            </DialogTitle>
            <DialogDescription>
              Detailed breakdown of exam results, questions, and user responses
            </DialogDescription>
          </DialogHeader>

          {selectedExamForDetail && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Exam Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Student</p>
                      <p className="text-sm">{selectedExamForDetail.studentId}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Exam Template</p>
                      <p className="text-sm">{getTemplateTitle(selectedExamForDetail)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Score</p>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline"
                          className={selectedExamForDetail.percentage >= 70 
                            ? "bg-chart-2/10 text-chart-2 border-chart-2/20" 
                            : "bg-chart-4/10 text-chart-4 border-chart-4/20"
                          }
                        >
                          {selectedExamForDetail.score}/{selectedExamForDetail.totalQuestions} ({selectedExamForDetail.percentage}%)
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Submission Date</p>
                      <p className="text-sm">
                        {selectedExamForDetail.submittedAt 
                          ? new Date(selectedExamForDetail.submittedAt).toLocaleString('en-US', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric', 
                              hour: 'numeric', 
                              minute: 'numeric', 
                              second: 'numeric' 
                            })
                          : 'Not submitted'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Questions Answered</p>
                      <p className="text-sm">{selectedExamForDetail.answeredQuestions}/{selectedExamForDetail.totalQuestions}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <p className="text-sm">
                        {selectedExamForDetail.percentage >= 70 ? "Passed" : "Failed"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {examHasComments(selectedExamForDetail) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-primary" />
                      Questions with Comments ({getCommentCount(selectedExamForDetail)})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedExamForDetail.questionComments && Object.entries(selectedExamForDetail.questionComments).map(([questionId, comment]) => {
                        const questionDetail = selectedExamForDetail.detailedResults?.find(dr => dr.questionId === questionId);
                        return (
                          <div key={questionId} className="p-4 border rounded-lg bg-primary/5">
                            <div className="flex items-start gap-3">
                              <MessageSquare className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="font-medium text-sm mb-2">
                                  Question: {questionDetail?.question || questionId}
                                </p>
                                {questionDetail && (
                                  <div className="text-xs text-muted-foreground mb-2">
                                    User Answer: {questionDetail.userAnswer !== null ? `Option ${questionDetail.userAnswer + 1}` : 'Not answered'} | 
                                    Correct Answer: Option {questionDetail.correctAnswer + 1} | 
                                    {questionDetail.isCorrect ? '✅ Correct' : '❌ Incorrect'}
                                  </div>
                                )}
                                <div className="text-sm bg-card p-3 rounded border-l-4 border-primary">
                                  <span className="font-medium text-primary">Student Comment:</span>
                                  <p className="mt-1">{comment}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {selectedExamForDetail.detailedResults?.filter(dr => dr.comment).map((questionDetail) => (
                        <div key={questionDetail.questionId} className="p-4 border rounded-lg bg-primary/5">
                          <div className="flex items-start gap-3">
                            <MessageSquare className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="font-medium text-sm mb-2">
                                Question: {questionDetail.question}
                              </p>
                              <div className="text-xs text-muted-foreground mb-2">
                                User Answer: {questionDetail.userAnswer !== null ? `Option ${questionDetail.userAnswer + 1}` : 'Not answered'} | 
                                Correct Answer: Option {questionDetail.correctAnswer + 1} | 
                                {questionDetail.isCorrect ? '✅ Correct' : '❌ Incorrect'}
                              </div>
                              <div className="text-sm bg-card p-3 rounded border-l-4 border-primary">
                                <span className="font-medium text-primary">Student Comment:</span>
                                <p className="mt-1">{questionDetail.comment}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedExamForDetail.detailedResults && selectedExamForDetail.detailedResults.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Performance Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(
                        selectedExamForDetail.detailedResults.reduce((acc, result) => {
                          const category = result.category || 'Uncategorized';
                          if (!acc[category]) {
                            acc[category] = { total: 0, correct: 0 };
                          }
                          acc[category].total++;
                          if (result.isCorrect) {
                            acc[category].correct++;
                          }
                          return acc;
                        }, {} as Record<string, { total: number; correct: number }>)
                      ).map(([category, stats]) => (
                        <div key={category} className="flex items-center justify-between p-3 border rounded">
                          <span className="font-medium">{category}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {stats.correct}/{stats.total} ({Math.round((stats.correct / stats.total) * 100)}%)
                            </span>
                            <Badge 
                              variant="outline"
                              className={stats.correct / stats.total >= 0.7 
                                ? "bg-chart-2/10 text-chart-2 border-chart-2/20" 
                                : "bg-chart-4/10 text-chart-4 border-chart-4/20"
                              }
                            >
                              {stats.correct / stats.total >= 0.7 ? "Pass" : "Fail"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};