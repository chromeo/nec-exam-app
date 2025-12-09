import { useState, useEffect } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import { Badge } from "../../ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "../../ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../../ui/select";
import { Checkbox } from "../../ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { ScrollArea } from "../../ui/scroll-area";
import { Separator } from "../../ui/separator";
import { 
  FileQuestion, Edit3, Eye, BookOpen, Target, 
  CheckCircle, XCircle, MessageSquare, AlertTriangle,
  Calendar, User, Hash, TrendingUp
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { projectId } from "../../../utils/supabase/info";
import type { Question, QuestionForm, Comment, UserFeedback } from "../../../supabase/functions/server/types";

interface QuestionViewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  questionId: string;
  accessToken: string;
  onSaveEdit?: (question: QuestionForm) => void;
  questionCategories?: string[];
  isEditMode?: boolean;
  onToggleEditMode?: () => void;
}

export const QuestionViewDialog = ({
  isOpen,
  onClose,
  questionId,
  accessToken,
  onSaveEdit,
  questionCategories = [],
  isEditMode = false,
  onToggleEditMode,
}: QuestionViewDialogProps) => {
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("details");
  
  // Comment statistics state
  const [commentStats, setCommentStats] = useState<{
    duringExam: number;
    afterExam: number;
    total: number;
    needsAttention: number;
    loading: boolean;
    // ✅ NEW: Store actual comments for timestamp extraction
    allComments: (Comment | UserFeedback)[];
    firstCommentDate: string | null;
    lastCommentDate: string | null;
  }>({
    duringExam: 0,
    afterExam: 0,
    total: 0,
    needsAttention: 0,
    loading: false,
    allComments: [],
    firstCommentDate: null,
    lastCommentDate: null,
  });
  
  // Edit form state
  const [editForm, setEditForm] = useState<QuestionForm>({
    question: "",
    options: ["", "", "", ""],
    correctAnswer: 0,
    category: "",
    reference: "",
    difficulty: "Medium",
    status: "Final",
  });

  useEffect(() => {
    if (isOpen && questionId) {
      loadQuestion();
      loadCommentStats();
    }
  }, [isOpen, questionId]);

  useEffect(() => {
    if (question && isEditMode) {
      setEditForm({
        question: question.question,  // ✅ Correct field name
        options: [...question.options],  // ✅ Already string[]
        correctAnswer: question.correctAnswer,  // ✅ Already a number
        category: question.category,
        reference: question.reference || "",
        difficulty: question.difficulty || "Medium",
        status: question.status || "Final",
      });
    }
  }, [question, isEditMode]);

  const loadQuestion = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Strip any prefix from the questionId (e.g., "question:123" -> "123")
      const cleanQuestionId = questionId.split(':').pop() || questionId;
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a9be5165/admin/questions/${cleanQuestionId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();
      
      if (result.success && result.data) {
        // ✅ Database uses 'question', 'options', 'correctAnswer' - match our updated types
        const rawQuestion = result.data;
        const normalizedQuestion: Question = {
          id: rawQuestion.id,
          question: rawQuestion.question || '',  // ✅ Matches database field
          options: rawQuestion.options || [],     // ✅ Already string[]
          correctAnswer: rawQuestion.correctAnswer ?? 0,  // ✅ Already number
          category: rawQuestion.category || 'Unknown',
          reference: rawQuestion.reference,
          explanation: rawQuestion.explanation,
          difficulty: rawQuestion.difficulty || 'Medium',
          status: rawQuestion.status || 'Final',
          createdAt: rawQuestion.createdAt || rawQuestion.created_at,
          updatedAt: rawQuestion.updatedAt || rawQuestion.updated_at,
          created_by: rawQuestion.created_by,
          updated_by: rawQuestion.updated_by,
        };
        
        console.log('📝 [Question Load] Raw question data:', rawQuestion);
        console.log('📝 [Question Load] Normalized question:', normalizedQuestion);
        
        setQuestion(normalizedQuestion);
      } else {
        setError(result.error || 'Failed to load question');
      }
    } catch (err) {
      console.error('Error loading question:', err);
      setError('Failed to load question details');
    } finally {
      setLoading(false);
    }
  };

  const loadCommentStats = async () => {
    setCommentStats(prev => ({ ...prev, loading: true }));
    
    try {
      // Strip any prefix from the questionId (e.g., "question:123" -> "123")
      const cleanQuestionId = questionId.split(':').pop() || questionId;
      
      console.log(`📊 [Comment Stats] Starting fetch for question: ${questionId}`);
      console.log(`📊 [Comment Stats] Cleaned question ID: ${cleanQuestionId}`);
      
      // ✅ NEW APPROACH: Fetch ALL comments and ALL user feedback, then filter client-side
      // This uses the same endpoints that CommentsSection uses successfully
      
      // Fetch exam comments (during exam - Comment type)
      const commentsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a9be5165/admin/comments`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`📊 [Comment Stats] Comments response status: ${commentsResponse.status}`);

      // Fetch user feedback (after exam - UserFeedback type)
      const feedbackResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a9be5165/admin/user-feedback`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`📊 [Comment Stats] Feedback response status: ${feedbackResponse.status}`);

      let allComments: Comment[] = [];
      let allFeedback: UserFeedback[] = [];

      // Parse comments response
      if (commentsResponse.ok) {
        const commentsResult = await commentsResponse.json();
        console.log(`📊 [Comment Stats] Comments result:`, commentsResult);
        if (commentsResult.success && commentsResult.data) {
          const commentsArray = commentsResult.data.comments || commentsResult.data;
          allComments = Array.isArray(commentsArray) ? commentsArray : [];
        }
      }

      // Parse feedback response
      if (feedbackResponse.ok) {
        const feedbackResult = await feedbackResponse.json();
        console.log(`📊 [Comment Stats] Feedback result:`, feedbackResult);
        if (feedbackResult.success && feedbackResult.data) {
          allFeedback = Array.isArray(feedbackResult.data) ? feedbackResult.data : [];
        }
      }

      console.log(`📊 [Comment Stats] Total comments fetched: ${allComments.length}`);
      console.log(`📊 [Comment Stats] Total feedback fetched: ${allFeedback.length}`);

      // ✅ Filter to only this question's comments
      const questionComments = allComments.filter(comment => {
        // Strip prefix from comment's questionId too
        const commentQuestionId = comment.questionId.split(':').pop() || comment.questionId;
        return commentQuestionId === cleanQuestionId;
      });

      const questionFeedback = allFeedback.filter(feedback => {
        // Strip prefix from feedback's questionId too
        const feedbackQuestionId = feedback.questionId.split(':').pop() || feedback.questionId;
        return feedbackQuestionId === cleanQuestionId;
      });

      console.log(`📊 [Comment Stats] Filtered to question ${cleanQuestionId}:`);
      console.log(`📊 [Comment Stats] - During exam (Comment): ${questionComments.length}`);
      console.log(`📊 [Comment Stats] - After exam (UserFeedback): ${questionFeedback.length}`);

      // Count by type
      const duringExam = questionComments.length;
      const afterExam = questionFeedback.length;
      const total = duringExam + afterExam;
      
      // Count needs attention
      // Comment type: disposition === 'Under Review'
      // UserFeedback type: status === 'pending' (or undefined/not reviewed)
      const needsAttentionComments = questionComments.filter(c => c.disposition === 'Under Review').length;
      const needsAttentionFeedback = questionFeedback.filter(f => !f.status || f.status === 'pending').length;
      const needsAttention = needsAttentionComments + needsAttentionFeedback;
      
      console.log(`📊 [Comment Stats] Calculated counts:`, {
        duringExam,
        afterExam,
        total,
        needsAttention,
        breakdown: {
          needsAttentionComments,
          needsAttentionFeedback
        }
      });
      
      // ✅ NEW: Store all comments for timestamp extraction
      const combinedComments: (Comment | UserFeedback)[] = [...questionComments, ...questionFeedback];
      const sortedComments = combinedComments.sort((a, b) => {
        const aDate = new Date(a.createdAt || a.created_at);
        const bDate = new Date(b.createdAt || b.created_at);
        return aDate.getTime() - bDate.getTime();
      });
      
      const firstCommentDate = sortedComments.length > 0 ? sortedComments[0].createdAt || sortedComments[0].created_at : null;
      const lastCommentDate = sortedComments.length > 0 ? sortedComments[sortedComments.length - 1].createdAt || sortedComments[sortedComments.length - 1].created_at : null;
      
      setCommentStats({
        duringExam,
        afterExam,
        total,
        needsAttention,
        loading: false,
        allComments: combinedComments,
        firstCommentDate,
        lastCommentDate,
      });
      
      console.log(`✅ [Comment Stats] State updated successfully`);
    } catch (err) {
      console.error('❌ [Comment Stats] Error loading comment statistics:', err);
      console.error('❌ [Comment Stats] Error details:', {
        name: err?.name,
        message: err?.message,
        stack: err?.stack
      });
      // Don't show error to user - just show zeros
      setCommentStats({
        duringExam: 0,
        afterExam: 0,
        total: 0,
        needsAttention: 0,
        loading: false,
        allComments: [],
        firstCommentDate: null,
        lastCommentDate: null,
      });
    }
  };

  const handleSaveEdit = () => {
    if (!editForm.question.trim()) {
      toast.error("Please enter a question");
      return;
    }

    const hasEmptyOptions = editForm.options.some(option => option.trim() === "");
    if (hasEmptyOptions) {
      toast.error("Please fill in all 4 answer options");
      return;
    }

    if (!editForm.reference.trim()) {
      toast.error("Please enter a reference");
      return;
    }

    if (!editForm.category) {
      toast.error("Please select a category");
      return;
    }

    const finalQuestion: QuestionForm = {
      question: editForm.question.trim(),
      options: editForm.options.map(option => option.trim()),
      correctAnswer: editForm.correctAnswer,
      category: editForm.category,
      reference: editForm.reference.trim(),
      difficulty: editForm.difficulty,
      status: editForm.status,
    };

    onSaveEdit?.(finalQuestion);
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...editForm.options];
    newOptions[index] = value;
    setEditForm(prev => ({ ...prev, options: newOptions }));
  };

  const handleCorrectAnswerChange = (index: number) => {
    setEditForm(prev => ({ 
      ...prev, 
      correctAnswer: index 
    }));
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'hard': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'final': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'draft': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <FileQuestion className="h-5 w-5" />
                {isEditMode ? "Edit Question" : "Question Details"}
              </DialogTitle>
              <DialogDescription>
                {isEditMode 
                  ? "Modify the question details below" 
                  : "View question information and metadata"
                }
              </DialogDescription>
            </div>
            {onToggleEditMode && question && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleEditMode}
              >
                {isEditMode ? (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    View Mode
                  </>
                ) : (
                  <>
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit Mode
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* ✅ Scrollable content area with proper flex constraints */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading question details...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-4" />
                <p className="text-destructive">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadQuestion}
                  className="mt-4"
                >
                  Retry
                </Button>
              </div>
            </div>
          ) : question ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Question Details</TabsTrigger>
                <TabsTrigger value="metadata">Metadata & Stats</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="flex-1 overflow-hidden">
                <ScrollArea className="h-full pr-4">
                  <div className="space-y-6">
                    {/* Question Text */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Question Text
                      </Label>
                      {isEditMode ? (
                        <Textarea
                          value={editForm.question}
                          onChange={(e) => setEditForm(prev => ({ 
                            ...prev, 
                            question: e.target.value 
                          }))}
                          rows={3}
                          className="font-medium"
                        />
                      ) : (
                        <Card>
                          <CardContent className="p-4">
                            <p className="font-medium leading-relaxed">{question.question}</p>
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    {/* Answer Options */}
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Answer Options
                      </Label>
                      <div className="space-y-2">
                        {(isEditMode 
                          ? editForm.options 
                          : question.options  // ✅ Now using correct field - already string[]
                        ).map((option, index) => {
                          // ✅ Simple comparison: is this index the correct answer?
                          const isCorrectAnswer = isEditMode 
                            ? editForm.correctAnswer === index
                            : question.correctAnswer === index;
                            
                          return (
                            <div key={index} className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                isCorrectAnswer
                                  ? 'bg-green-600 text-white'
                                  : 'bg-muted text-muted-foreground'
                              }`}>
                                {String.fromCharCode(65 + index)}
                              </div>
                              {isEditMode ? (
                                <div className="flex items-center gap-3 flex-1">
                                  <Input
                                    value={option}
                                    onChange={(e) => handleOptionChange(index, e.target.value)}
                                    className="flex-1"
                                  />
                                  <Checkbox
                                    checked={editForm.correctAnswer === index}
                                    onCheckedChange={() => handleCorrectAnswerChange(index)}
                                    className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                                  />
                                </div>
                              ) : (
                                <div className="flex-1 flex items-center gap-2">
                                  <span className="flex-1">{option}</span>
                                  {isCorrectAnswer && (
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Category and Reference */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Category</Label>
                        {isEditMode ? (
                          <Select 
                            value={editForm.category} 
                            onValueChange={(value) => setEditForm(prev => ({ ...prev, category: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {questionCategories.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="secondary" className="w-fit">
                            {question.category}
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          Reference
                        </Label>
                        {isEditMode ? (
                          <Input
                            value={editForm.reference}
                            onChange={(e) => setEditForm(prev => ({ 
                              ...prev, 
                              reference: e.target.value 
                            }))}
                          />
                        ) : (
                          <p className="text-sm bg-muted p-2 rounded">{question.reference}</p>
                        )}
                      </div>
                    </div>

                    {/* Difficulty and Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Difficulty</Label>
                        {isEditMode ? (
                          <Select 
                            value={editForm.difficulty} 
                            onValueChange={(value) => setEditForm(prev => ({ ...prev, difficulty: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Easy">Easy</SelectItem>
                              <SelectItem value="Medium">Medium</SelectItem>
                              <SelectItem value="Hard">Hard</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge className={getDifficultyColor(question.difficulty || 'Medium')}>
                            {question.difficulty || 'Medium'}
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Status</Label>
                        {isEditMode ? (
                          <Select 
                            value={editForm.status} 
                            onValueChange={(value) => setEditForm(prev => ({ ...prev, status: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Final">Final</SelectItem>
                              <SelectItem value="Draft">Draft</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge className={getStatusColor(question.status || 'Final')}>
                            {question.status || 'Final'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="metadata" className="flex-1 overflow-hidden">
                <ScrollArea className="h-full pr-4">
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Hash className="h-4 w-4" />
                          Question Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Question ID:</span>
                            <p className="font-mono">{question.id}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Category:</span>
                            <p>{question.category}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Difficulty:</span>
                            <Badge className={getDifficultyColor(question.difficulty || 'Medium')} variant="secondary">
                              {question.difficulty || 'Medium'}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Status:</span>
                            <Badge className={getStatusColor(question.status || 'Final')} variant="secondary">
                              {question.status || 'Final'}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Timestamps
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        {/* Question Creation - handle both camelCase and snake_case */}
                        {(question.createdAt || (question as any).created_at) && (
                          <div>
                            <span className="text-muted-foreground">Question Created:</span>
                            <p>{new Date(question.createdAt || (question as any).created_at).toLocaleString()}</p>
                          </div>
                        )}
                        
                        {/* Question Last Updated - handle both camelCase and snake_case */}
                        {(question.updatedAt || (question as any).updated_at) && (
                          <div>
                            <span className="text-muted-foreground">Question Updated:</span>
                            <p>{new Date(question.updatedAt || (question as any).updated_at).toLocaleString()}</p>
                          </div>
                        )}
                        
                        {/* First Comment */}
                        {commentStats.firstCommentDate && (
                          <div>
                            <span className="text-muted-foreground">First Comment:</span>
                            <p>{new Date(commentStats.firstCommentDate).toLocaleString()}</p>
                          </div>
                        )}
                        
                        {/* Most Recent Comment */}
                        {commentStats.lastCommentDate && (
                          <div>
                            <span className="text-muted-foreground">Most Recent Comment:</span>
                            <p>{new Date(commentStats.lastCommentDate).toLocaleString()}</p>
                          </div>
                        )}
                        
                        {/* Show message if no timestamps available */}
                        {!question.createdAt && !(question as any).created_at && 
                         !question.updatedAt && !(question as any).updated_at && 
                         !commentStats.firstCommentDate && !commentStats.lastCommentDate && (
                          <p className="text-muted-foreground italic">No timestamp data available</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Question Usage Stats - Placeholder for future implementation */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Usage Statistics</CardTitle>
                        <CardDescription>
                          Statistics about this question's usage in exams
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground text-sm">
                          Usage statistics will be available in a future update.
                        </p>
                      </CardContent>
                    </Card>

                    {/* Comment Statistics */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Comment Statistics</CardTitle>
                        <CardDescription>
                          Statistics about comments on this question
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {commentStats.loading ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="text-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                              <p className="text-muted-foreground">Loading comment statistics...</p>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Total Comments:</span>
                              <p className="font-mono">{commentStats.total}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">During Exam:</span>
                              <p className="font-mono">{commentStats.duringExam}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">After Exam:</span>
                              <p className="font-mono">{commentStats.afterExam}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Needs Attention:</span>
                              <p className="font-mono">{commentStats.needsAttention}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">First Comment:</span>
                              <p className="font-mono">{commentStats.firstCommentDate ? new Date(commentStats.firstCommentDate).toLocaleString() : 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Last Comment:</span>
                              <p className="font-mono">{commentStats.lastCommentDate ? new Date(commentStats.lastCommentDate).toLocaleString() : 'N/A'}</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          ) : null}
        </div>

        <DialogFooter>
          <div className="flex justify-between w-full">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {isEditMode && onSaveEdit && (
              <Button onClick={handleSaveEdit}>
                Save Changes
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};