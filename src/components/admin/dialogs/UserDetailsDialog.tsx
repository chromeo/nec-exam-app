import { useState, useEffect } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Alert, AlertDescription } from "../../ui/alert";
import { Switch } from "../../ui/switch";
import { Textarea } from "../../ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../ui/dialog";
import { ScrollArea } from "../../ui/scroll-area";
import { Separator } from "../../ui/separator";
import { 
  Users, Shield, ShieldCheck, Calendar, Mail, User, KeyRound, 
  Eye, EyeOff, Copy, RefreshCw, CreditCard, BookOpen, 
  MessageSquare, Flag, Trophy, Clock, CheckCircle, XCircle,
  BarChart3, Award, Target, TrendingUp
} from "lucide-react";
import { toast } from "sonner@2.0.3";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
  credits?: number;
  created_at: string;
  updated_at?: string;
}

interface ExamResult {
  id: string;
  examId: string;
  examTitle: string;
  score: number;
  totalQuestions: number;
  completedAt: string;
  timeSpent: number;
  passed: boolean;
}

interface UserComment {
  id: string;
  questionId: string;
  questionText: string;
  content: string;
  examId: string;
  createdAt: string;
}

interface UserDetailsDialogProps {
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  makeRequest: (endpoint: string, options?: RequestInit) => Promise<any>;
  onUserUpdate: (updatedUser: UserProfile) => void;
}

export function UserDetailsDialog({ 
  user, 
  isOpen, 
  onClose, 
  makeRequest, 
  onUserUpdate 
}: UserDetailsDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  
  // User data state
  const [userExams, setUserExams] = useState<ExamResult[]>([]);
  const [userComments, setUserComments] = useState<UserComment[]>([]);
  const [userStats, setUserStats] = useState({
    totalExams: 0,
    averageScore: 0,
    totalTimeSpent: 0,
    passRate: 0,
    totalComments: 0,
    flaggedQuestions: 0
  });
  
  // Credits management
  const [creditAmount, setCreditAmount] = useState(0);
  const [creditNote, setCreditNote] = useState("");
  const [isIssuingCredits, setIsIssuingCredits] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      loadUserData();
    }
  }, [user, isOpen]);

  const loadUserData = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError("");
      
      // Load user exam results and comments in parallel
      const [examResults, commentsResults] = await Promise.all([
        makeRequest(`/admin/users/${user.id}/exams`),
        makeRequest(`/admin/comments?userId=${user.id}`)
      ]);
      
      if (examResults.success) {
        const exams = examResults.data || [];
        setUserExams(exams);
        
        // Calculate stats
        const totalExams = exams.length;
        const averageScore = totalExams > 0 ? 
          exams.reduce((sum: number, exam: ExamResult) => sum + exam.score, 0) / totalExams : 0;
        const totalTimeSpent = exams.reduce((sum: number, exam: ExamResult) => sum + exam.timeSpent, 0);
        const passedExams = exams.filter((exam: ExamResult) => exam.passed).length;
        const passRate = totalExams > 0 ? (passedExams / totalExams) * 100 : 0;
        
        setUserStats(prev => ({
          ...prev,
          totalExams,
          averageScore,
          totalTimeSpent,
          passRate
        }));
      }
      
      if (commentsResults.success) {
        const comments = commentsResults.data?.comments || [];
        setUserComments(comments);
        
        setUserStats(prev => ({
          ...prev,
          totalComments: comments.length,
          flaggedQuestions: comments.filter((c: UserComment) => c.content.toLowerCase().includes('flag')).length
        }));
      }
      
    } catch (error) {
      console.error('Error loading user data:', error);
      setError('Failed to load user data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleIssueCredits = async () => {
    if (!user || creditAmount <= 0) return;
    
    try {
      setIsIssuingCredits(true);
      
      const result = await makeRequest(`/admin/users/${user.id}/credits`, {
        method: 'POST',
        body: JSON.stringify({
          amount: creditAmount,
          note: creditNote || `Credits issued by admin`
        })
      });
      
      if (result.success) {
        toast.success(`${creditAmount} credits issued to ${user.name}`);
        const updatedUser = { ...user, credits: (user.credits || 0) + creditAmount };
        onUserUpdate(updatedUser);
        setCreditAmount(0);
        setCreditNote("");
      } else {
        setError(result.error || 'Failed to issue credits');
      }
    } catch (error) {
      console.error('Error issuing credits:', error);
      setError('Failed to issue credits');
    } finally {
      setIsIssuingCredits(false);
    }
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

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 overflow-y-auto">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center space-x-3">
            {user.is_admin ? (
              <Shield className="w-6 h-6 text-green-500" />
            ) : (
              <User className="w-6 h-6 text-muted-foreground" />
            )}
            <div>
              <span className="text-xl">{user.name}</span>
              {user.is_admin && (
                <Badge variant="default" className="ml-2">Admin</Badge>
              )}
            </div>
          </DialogTitle>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-2">
            <div className="flex items-center space-x-1">
              <Mail className="w-4 h-4" />
              <span>{user.email}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>Joined {formatDate(user.created_at)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <CreditCard className="w-4 h-4" />
              <span>{user.credits || 0} credits</span>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="px-6">
            <Alert>
              <AlertDescription className="text-red-600">{error}</AlertDescription>
            </Alert>
          </div>
        )}

        <div className="flex-1 px-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="exams">Exams</TabsTrigger>
              <TabsTrigger value="comments">Comments</TabsTrigger>
              <TabsTrigger value="credits">Credits</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[500px] mt-4">
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <BookOpen className="w-6 h-6 text-blue-600" />
                        <div>
                          <p className="text-2xl font-semibold">{userStats.totalExams}</p>
                          <p className="text-sm text-muted-foreground">Exams Taken</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <Trophy className="w-6 h-6 text-yellow-600" />
                        <div>
                          <p className="text-2xl font-semibold">{userStats.averageScore.toFixed(1)}%</p>
                          <p className="text-sm text-muted-foreground">Avg Score</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <Target className="w-6 h-6 text-green-600" />
                        <div>
                          <p className="text-2xl font-semibold">{userStats.passRate.toFixed(1)}%</p>
                          <p className="text-sm text-muted-foreground">Pass Rate</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-6 h-6 text-purple-600" />
                        <div>
                          <p className="text-2xl font-semibold">{Math.floor(userStats.totalTimeSpent / 3600)}h</p>
                          <p className="text-sm text-muted-foreground">Study Time</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid md:grid-cols-2 gap-6 max-h-96 pr-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {userExams.slice(0, 5).map((exam) => (
                          <div key={exam.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div>
                              <p className="font-medium">{exam.examTitle}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(exam.completedAt)}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              {exam.passed ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-500" />
                              )}
                              <span className="font-semibold">{exam.score}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Comments</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {userComments.slice(0, 5).map((comment) => (
                          <div key={comment.id} className="p-3 bg-muted rounded-lg">
                            <p className="text-sm font-medium mb-1">
                              {comment.questionText.substring(0, 60)}...
                            </p>
                            <p className="text-sm text-muted-foreground">
                              "{comment.content}"
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(comment.createdAt)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="exams" className="space-y-4 max-h-96 pr-2">
                <div className="space-y-4">
                  {userExams.map((exam) => (
                    <Card key={exam.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{exam.examTitle}</h3>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                              <span>Completed: {formatDate(exam.completedAt)}</span>
                              <span>Duration: {formatDuration(exam.timeSpent)}</span>
                              <span>{exam.score}/{exam.totalQuestions} questions</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="text-right">
                              <p className="text-2xl font-bold">{exam.score}%</p>
                              <p className="text-sm text-muted-foreground">
                                {exam.passed ? 'Passed' : 'Failed'}
                              </p>
                            </div>
                            {exam.passed ? (
                              <CheckCircle className="w-8 h-8 text-green-500" />
                            ) : (
                              <XCircle className="w-8 h-8 text-red-500" />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="comments" className="space-y-4 max-h-96 pr-2">
                <div className="space-y-4">
                  {userComments.map((comment) => (
                    <Card key={comment.id}>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium">{comment.questionText}</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                Exam: {comment.examId}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(comment.createdAt)}
                            </span>
                          </div>
                          <div className="bg-muted p-3 rounded-lg">
                            <p className="text-sm">"{comment.content}"</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="credits" className="space-y-6 max-h-96 pr-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Issue Credits</CardTitle>
                    <CardDescription>
                      Add exam credits to this user's account
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="credit-amount">Credit Amount</Label>
                        <Input
                          id="credit-amount"
                          type="number"
                          min="1"
                          value={creditAmount || ""}
                          onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)}
                          placeholder="Enter number of credits"
                        />
                      </div>
                      <div>
                        <Label>Current Credits</Label>
                        <div className="flex items-center h-10 px-3 border rounded-md bg-muted">
                          <CreditCard className="w-4 h-4 mr-2" />
                          <span>{user.credits || 0}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="credit-note">Note (Optional)</Label>
                      <Textarea
                        id="credit-note"
                        value={creditNote}
                        onChange={(e) => setCreditNote(e.target.value)}
                        placeholder="Add a note about this credit issuance..."
                        rows={3}
                      />
                    </div>

                    <Button
                      onClick={handleIssueCredits}
                      disabled={creditAmount <= 0 || isIssuingCredits}
                      className="w-full"
                    >
                      {isIssuingCredits ? 'Issuing Credits...' : `Issue ${creditAmount} Credits`}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 max-h-96 pr-2">
                <Card>
                  <CardHeader>
                    <CardTitle>User Settings</CardTitle>
                    <CardDescription>
                      Manage user account settings and permissions
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Admin Privileges</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow this user to access the admin panel
                        </p>
                      </div>
                      <Switch
                        checked={user.is_admin}
                        onCheckedChange={() => {
                          // Handle admin toggle - this would need to be implemented
                          toast.info("Admin status changes should be handled through the main user management");
                        }}
                      />
                    </div>

                    <Separator />

                    <div>
                      <Label className="text-base">Account Actions</Label>
                      <div className="mt-2 space-y-2">
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => {
                            // Handle password reset
                            toast.info("Password reset should be handled through the main user management");
                          }}
                        >
                          <KeyRound className="w-4 h-4 mr-2" />
                          Reset Password
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>

        <DialogFooter className="p-6">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}