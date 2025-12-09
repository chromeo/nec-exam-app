import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Textarea } from "../../ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../ui/alert-dialog";
import { AdminSectionHeader } from "../AdminSectionHeader";
import { QuestionViewDialog } from "../dialogs/QuestionViewDialog";
import { useAdminApi } from "../../../hooks/useAdminApi";
import { validateCommentUpdateRequest, validateCommentUpdateResponse } from "../../../schemas/comments";
import { 
  RefreshCw, 
  User, 
  FileQuestion, 
  Clock, 
  Reply, 
  AlertCircle, 
  CheckCircle, 
  Eye,
  XCircle,
  Trash2
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import type { Comment, UserFeedback, CommentDisposition } from "../../../supabase/functions/server/types";
import { projectId } from "../../../utils/supabase/info";

interface CommentsSectionProps {
  accessToken: string;
  onNavigateToUser?: (userId: string) => void;
  onNavigateToQuestion?: (questionId: string) => void;
}

export const CommentsSection = ({ 
  accessToken, 
  onNavigateToUser, 
  onNavigateToQuestion 
}: CommentsSectionProps) => {
  const { commentsApi, userFeedbackApi } = useAdminApi(accessToken);
  
  // Exam Comments (during exam) state
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentStatusFilter, setCommentStatusFilter] = useState<string>('all');
  const [commentCategoryFilter, setCommentCategoryFilter] = useState<string>('all');
  
  // Review Feedback (after exam) state
  const [userFeedback, setUserFeedback] = useState<UserFeedback[]>([]);
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState<string>('all');
  const [feedbackCategoryFilter, setFeedbackCategoryFilter] = useState<string>('all');
  
  // UI state
  const [activeTab, setActiveTab] = useState<'during-exam' | 'after-exam'>('during-exam');
  const [selectedItem, setSelectedItem] = useState<Comment | UserFeedback | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  
  // Archive confirmation state (renamed from Delete)
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [itemToArchive, setItemToArchive] = useState<Comment | UserFeedback | null>(null);

  // Load comments when showArchived changes
  useEffect(() => {
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived]);
  
  // Load feedback once on mount
  useEffect(() => {
    loadUserFeedback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadComments = async () => {
    const result = await commentsApi.getAll(showArchived);
    
    if (result.success && result.data) {
      const commentsArray = result.data.comments || result.data;
      
      const sortedComments = Array.isArray(commentsArray) ? 
        commentsArray.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ) : [];
        
      setComments(sortedComments);
    } else {
      console.error('❌ [CommentsSection] Failed to load comments:', result.error);
      toast.error('Failed to load exam comments');
    }
  };

  const loadUserFeedback = async () => {
    const result = await userFeedbackApi.getAll();
    if (result.success && result.data) {
      const feedbackArray = Array.isArray(result.data) ? result.data : [];
      const sortedFeedback = feedbackArray.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setUserFeedback(sortedFeedback);
    } else {
      console.error('Failed to load user feedback:', result.error);
      // Don't show error toast if endpoint doesn't exist yet
    }
  };

  // Filter comments by status/disposition and category
  const filteredComments = comments
    .filter(c => commentStatusFilter === 'all' || c.disposition === commentStatusFilter)
    .filter(c => commentCategoryFilter === 'all' || (c.category || 'Uncategorized') === commentCategoryFilter);

  // Filter feedback by status and category
  const filteredFeedback = userFeedback
    .filter(f => feedbackStatusFilter === 'all' || f.status === feedbackStatusFilter)
    .filter(f => feedbackCategoryFilter === 'all' || (f.category || 'Uncategorized') === feedbackCategoryFilter);

  const handleManageComment = (item: Comment | UserFeedback) => {
    setSelectedItem(item);
    if ('disposition' in item) {
      // It's a Comment
      setSelectedStatus(item.disposition);
      // Get the latest response from responses array
      const latestResponse = item.responses && item.responses.length > 0 
        ? item.responses[item.responses.length - 1].content 
        : "";
      setAdminNotes(latestResponse);
    } else {
      // It's UserFeedback
      setSelectedStatus(item.status || 'pending');
      setAdminNotes(item.adminNotes || "");
    }
    setIsDialogOpen(true);
  };

  const handleSaveChanges = async () => {
    if (!selectedItem) return;

    try {
      if ('disposition' in selectedItem) {
        // Update exam comment
        const updateRequest: {
          disposition: CommentDisposition;
          metadata: {
            updatedBy: string;
            updatedAt: string;
          };
          response?: {
            content: string;
            adminUserId: string;
          };
        } = {
          disposition: selectedStatus as CommentDisposition,
          metadata: {
            updatedBy: 'admin',
            updatedAt: new Date().toISOString(),
          }
        };

        if (adminNotes.trim()) {
          updateRequest.response = {
            content: adminNotes.trim(),
            adminUserId: 'admin-user',
          };
        }

        const validatedRequest = validateCommentUpdateRequest(updateRequest);
        const result = await commentsApi.update(selectedItem.id, validatedRequest);
        const validatedResponse = validateCommentUpdateResponse(result);
        
        if (validatedResponse.success) {
          toast.success("Comment updated successfully");
          setIsDialogOpen(false);
          setSelectedItem(null);
          setAdminNotes("");
          loadComments();
        } else {
          toast.error(validatedResponse.error || "Failed to update comment");
        }
      } else {
        // Update user feedback
        const result = await userFeedbackApi.update(selectedItem.id, {
          status: selectedStatus,
          adminNotes: adminNotes.trim() || undefined
        });
        
        if (result.success) {
          toast.success("Feedback updated successfully");
          setIsDialogOpen(false);
          setSelectedItem(null);
          setAdminNotes("");
          loadUserFeedback();
        } else {
          toast.error(result.error || "Failed to update feedback");
        }
      }
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error(error instanceof Error ? error.message : "Failed to update");
    }
  };

  const handleViewQuestion = (questionId: string) => {
    setSelectedQuestionId(questionId);
    setIsQuestionDialogOpen(true);
  };

  const handleArchiveClick = (item: Comment | UserFeedback) => {
    setItemToArchive(item);
    setIsArchiveDialogOpen(true);
  };

  const handleConfirmArchive = async () => {
    if (!itemToArchive) return;

    try {
      if ('disposition' in itemToArchive) {
        // Archive exam comment (DELETE endpoint now archives standalone comments)
        const result = await commentsApi.delete(itemToArchive.id);
        
        if (result.success) {
          toast.success("Comment archived successfully");
          setIsArchiveDialogOpen(false);
          setItemToArchive(null);
          loadComments();
        } else {
          toast.error(result.error || "Failed to archive comment");
        }
      } else {
        // Delete user feedback (still deletes)
        const result = await userFeedbackApi.delete(itemToArchive.id);
        
        if (result.success) {
          toast.success("Feedback deleted successfully");
          setIsArchiveDialogOpen(false);
          setItemToArchive(null);
          loadUserFeedback();
        } else {
          toast.error(result.error || "Failed to delete feedback");
        }
      }
    } catch (error) {
      console.error('Error processing item:', error);
      toast.error(error instanceof Error ? error.message : "Failed to process request");
    }
  };



  const getStatusBadge = (item: Comment | UserFeedback) => {
    const status = 'disposition' in item ? item.disposition : item.status || 'pending';
    
    const statusConfig = {
      'Needs Attention': { variant: 'destructive' as const, icon: AlertCircle },
      'pending': { variant: 'destructive' as const, icon: AlertCircle },
      'Under Review': { variant: 'secondary' as const, icon: Eye },
      'reviewed': { variant: 'secondary' as const, icon: Eye },
      'Problem Solved': { variant: 'default' as const, icon: CheckCircle },
      'resolved': { variant: 'default' as const, icon: CheckCircle },
      'dismissed': { variant: 'outline' as const, icon: XCircle },
      'Archived': { variant: 'outline' as const, icon: XCircle },
    };

    const config = statusConfig[status] || { variant: 'outline' as const, icon: AlertCircle };
    const Icon = config.icon;

    return (
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <Badge variant={config.variant}>{status}</Badge>
      </div>
    );
  };

  const truncate = (text: string, maxLength: number) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const renderFeedbackCard = (item: Comment | UserFeedback, type: 'during-exam' | 'after-exam') => {
    // Comment has 'content' (new) with 'comment' fallback (backwards compat)
    // UserFeedback has 'comment'
    const commentText = 'content' in item ? (item.content || item.comment) : item.comment;
    
    // Comment has 'responses' array, UserFeedback has 'adminNotes' string
    const latestAdminResponse = 'responses' in item 
      ? (item.responses && item.responses.length > 0 
          ? item.responses[item.responses.length - 1].content 
          : null)
      : item.adminNotes;

    // Get category from the item
    const category = item.category || 'Uncategorized';

    return (
      <Card key={item.id} className="p-4 hover:bg-muted/50 transition-colors">
        {/* Header: Status + Type + Category + Date */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {getStatusBadge(item)}
            <Badge variant="outline" className="text-xs">
              {type === 'during-exam' ? 'During Exam' : 'After Exam'}
            </Badge>
            <Badge 
              variant="secondary" 
              className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300"
            >
              {category}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDate(item.createdAt)}
          </div>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-2 mb-3">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
            {item.userName || item.userEmail || 'Anonymous'}
          </span>
        </div>

        {/* Question Info */}
        {item.questionId && (
          <div className="mb-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handleViewQuestion(item.questionId!)}
              className="text-sm p-0 h-auto hover:underline"
            >
              <FileQuestion className="h-4 w-4 mr-2" />
              Question: {item.questionId}
            </Button>
          </div>
        )}

        {/* User's Comment */}
        <div className="bg-muted p-3 rounded-md mb-3">
          <p className="text-sm font-medium mb-1">User's Report:</p>
          <p className="text-sm">{commentText}</p>
        </div>

        {/* Context Information */}
        {(('examId' in item && item.examId) || ('examSessionId' in item && item.examSessionId) || item.context) && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
            {/* For Comment type (has examId) */}
            {'examId' in item && item.examId && (
              <span>Session: {item.examId.slice(0, 8)}...</span>
            )}
            {/* For UserFeedback type (has examSessionId) */}
            {'examSessionId' in item && item.examSessionId && (
              <span>Session: {item.examSessionId.slice(0, 8)}...</span>
            )}
            {item.context && (
              <span>Context: {item.context}</span>
            )}
          </div>
        )}

        {/* Admin Response/Notes */}
        {latestAdminResponse && (
          <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-md border-l-4 border-blue-500 mb-3">
            <p className="text-sm font-medium mb-1">Admin Notes:</p>
            <p className="text-sm">{latestAdminResponse}</p>
            {('reviewedAt' in item && item.reviewedAt) && (
              <p className="text-xs text-muted-foreground mt-2">
                Reviewed: {formatDate(item.reviewedAt)}
                {('reviewedBy' in item && item.reviewedBy) && ` by ${item.reviewedBy}`}
              </p>
            )}
            {/* For Comment type - show most recent response timestamp */}
            {'responses' in item && item.responses && item.responses.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Responded: {formatDate(item.responses[item.responses.length - 1].createdAt)}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => handleManageComment(item)}
            className="border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-500 dark:hover:text-white"
          >
            <Reply className="h-3 w-3 mr-1" />
            Manage
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => handleArchiveClick(item)}
            title={'disposition' in item ? 'Archive this comment' : 'Delete this feedback'}
            className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white dark:border-red-500 dark:text-red-400 dark:hover:bg-red-500 dark:hover:text-white"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            {'disposition' in item ? 'Archive' : 'Delete'}
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <div className="p-6 pt-0 space-y-6">
      {/* Header */}
      <AdminSectionHeader
        title="User Feedback & Reports"
        description="Manage user-submitted comments and feedback from exams"
      >
        <div className="flex gap-2">
          <Button
            onClick={() => {
              loadComments();
              loadUserFeedback();
            }}
            size="sm"
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh All
          </Button>
        </div>
      </AdminSectionHeader>

      {/* Tabs for During vs After Exam */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'during-exam' | 'after-exam')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="during-exam">
            During Exam ({filteredComments.length})
          </TabsTrigger>
          <TabsTrigger value="after-exam">
            After Exam ({filteredFeedback.length})
          </TabsTrigger>
        </TabsList>

        {/* During Exam Tab */}
        <TabsContent value="during-exam" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Comments Submitted During Exam</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Users submit these while taking the exam
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showArchived}
                      onChange={(e) => setShowArchived(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span>Show Archived</span>
                  </label>
                  <Select value={commentCategoryFilter} onValueChange={setCommentCategoryFilter}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Filter by Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="Uncategorized">Uncategorized</SelectItem>
                      <SelectItem value="Spelling">Spelling</SelectItem>
                      <SelectItem value="Flawed Logic">Flawed Logic</SelectItem>
                      <SelectItem value="Poor Structure">Poor Structure</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={commentStatusFilter} onValueChange={setCommentStatusFilter}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Filter by Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Needs Attention">Needs Attention</SelectItem>
                      <SelectItem value="Under Review">Under Review</SelectItem>
                      <SelectItem value="Problem Solved">Problem Solved</SelectItem>
                      <SelectItem value="Archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              
              {filteredComments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {commentStatusFilter === 'all' 
                    ? "No exam comments found" 
                    : "No comments found for the selected status"}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredComments.map(comment => renderFeedbackCard(comment, 'during-exam'))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* After Exam Tab */}
        <TabsContent value="after-exam" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Feedback Submitted After Exam</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Users submit these during exam review (after completion)
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Select value={feedbackCategoryFilter} onValueChange={setFeedbackCategoryFilter}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Filter by Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="Uncategorized">Uncategorized</SelectItem>
                      <SelectItem value="Spelling">Spelling</SelectItem>
                      <SelectItem value="Flawed Logic">Flawed Logic</SelectItem>
                      <SelectItem value="Poor Structure">Poor Structure</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={feedbackStatusFilter} onValueChange={setFeedbackStatusFilter}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Filter by Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="reviewed">Reviewed</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="dismissed">Dismissed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredFeedback.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {feedbackStatusFilter === 'all' 
                    ? "No review feedback found" 
                    : "No feedback found for the selected status"}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredFeedback.map(feedback => renderFeedbackCard(feedback, 'after-exam'))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Management Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Feedback</DialogTitle>
            <DialogDescription>
              Update the status and add admin notes.
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-6">
              {/* Item Details */}
              <div className="bg-muted p-4 rounded-lg">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="font-medium">{selectedItem.userName || selectedItem.userEmail}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-muted-foreground">
                      Question ID: {selectedItem.questionId}
                    </div>
                    <Badge 
                      variant="secondary" 
                      className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300"
                    >
                      {selectedItem.category || 'Uncategorized'}
                    </Badge>
                  </div>
                  <div className="text-sm mt-3">
                    <strong>User's Report:</strong>
                    <p className="mt-1">
                      {'content' in selectedItem ? (selectedItem.content || (selectedItem as any).comment) : selectedItem.comment}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {'disposition' in selectedItem ? (
                      <>
                        <SelectItem value="Needs Attention">Needs Attention</SelectItem>
                        <SelectItem value="Under Review">Under Review</SelectItem>
                        <SelectItem value="Problem Solved">Problem Solved</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="reviewed">Reviewed</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="dismissed">Dismissed</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Admin Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Admin Notes (Optional)</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes or response for the user..."
                  rows={4}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveChanges}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Question View Dialog */}
      {selectedQuestionId && (
        <QuestionViewDialog
          isOpen={isQuestionDialogOpen}
          onClose={() => {
            setIsQuestionDialogOpen(false);
            setSelectedQuestionId(null);
          }}
          questionId={selectedQuestionId}
          accessToken={accessToken}
        />
      )}

      {/* Archive/Delete Confirmation Dialog */}
      <AlertDialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {itemToArchive && 'disposition' in itemToArchive ? 'Archive Comment?' : 'Delete Feedback?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {itemToArchive && 'disposition' in itemToArchive ? (
                <>
                  This will archive the comment and hide it from the default view. 
                  Archived comments are preserved for historical purposes and can be viewed by enabling "Show Archived".
                </>
              ) : (
                'This will permanently delete this feedback entry. This action cannot be undone.'
              )}
              {itemToArchive && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium">
                    From: {itemToArchive.userName || itemToArchive.userEmail || 'Anonymous'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Question: {itemToArchive.questionId}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToArchive(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmArchive}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {itemToArchive && 'disposition' in itemToArchive ? 'Archive' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


    </div>
  );
};