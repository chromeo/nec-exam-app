import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Alert, AlertDescription } from "../ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { LogOut, BookOpen, Award, Clock, Settings, User, Trophy, Calendar, Info } from "lucide-react";
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { parseMarkdown } from '../../utils/markdown';
import { ThemeToggle } from '../ThemeToggle';

interface ExamTemplate {
  id: string;
  title: string;
  description: string;
  moreDetails?: string;
  questionCount: number;
  timeLimit: number;
  categories: string[];
}

interface ExamResult {
  userId: string;
  studentId: string;
  examTemplateId: string;
  examTitle: string;
  submittedAt: string;
  score: number;
  totalQuestions: number;
  percentage: number;
}

interface UserProfile {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

interface UserDashboardProps {
  accessToken: string;
  onExamSelect: (templateId: string) => void;
  onLogout: () => void;
  onAdminMode: () => void;
  isAdmin: boolean;
}

export function UserDashboard({ accessToken, onExamSelect, onLogout, onAdminMode, isAdmin }: UserDashboardProps) {
  const [examTemplates, setExamTemplates] = useState<ExamTemplate[]>([]);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a9be5165`;
  
  const makeRequest = async (endpoint: string, options: RequestInit = {}) => {
    const response = await fetch(`${serverUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    return response.json();
  };

  // Function to get unique color for each exam category
  const getCategoryBadgeColor = (category: string) => {
    const colors = {
      '01 Journeyman': 'bg-blue-100 text-blue-800 border-blue-200',
      '02 Journeyman': 'bg-green-100 text-green-800 border-green-200',
      '06 Journeyman': 'bg-purple-100 text-purple-800 border-purple-200',
      'RCW/WAC': 'bg-orange-100 text-orange-800 border-orange-200'
    };
    
    return colors[category as keyof typeof colors] || 'bg-slate-100 text-slate-800 border-slate-200';
  };

  useEffect(() => {
    loadDashboardData();
  }, [accessToken]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError("");

    try {
      // Load user profile
      try {
        const profileResult = await makeRequest('/user/profile');
        if (profileResult.success) {
          setUserProfile(profileResult.data);
        } else {
          console.error('Failed to load user profile:', profileResult.error);
        }
      } catch (profileError) {
        console.error('Error loading user profile:', profileError);
        // Don't set error for profile failure as it's not critical
      }

      // Load available exam templates
      try {
        const templatesResult = await makeRequest('/exam-templates');
        if (templatesResult.success) {
          setExamTemplates(templatesResult.data);
        } else {
          console.error('Failed to load exam templates:', templatesResult.error);
          setError('Failed to load available exams. Please try again.');
        }
      } catch (templatesError) {
        console.error('Error loading exam templates:', templatesError);
        setError('Failed to load available exams. Please try again.');
      }

      // Load user's exam results
      try {
        const resultsResult = await makeRequest('/user/results');
        if (resultsResult.success) {
          setExamResults(resultsResult.data);
        } else {
          console.error('Failed to load user results:', resultsResult.error);
          // Don't set error for results failure as it's not critical
        }
      } catch (resultsError) {
        console.error('Error loading user results:', resultsError);
        // Don't set error for results failure as it's not critical
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    // Simply call the onLogout callback to clear frontend state
    // No server-side logout needed as we're using JWT tokens
    onLogout();
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

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600";
    if (percentage >= 80) return "text-blue-600";
    if (percentage >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeVariant = (percentage: number) => {
    if (percentage >= 80) return "default";
    if (percentage >= 70) return "secondary";
    return "destructive";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold text-foreground mb-2">Loading Dashboard...</div>
          <div className="text-muted-foreground">Please wait while we load your data</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 bg-background">
            <div className="flex items-center space-x-4">
              <BookOpen className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Exam Dashboard</h1>
                {userProfile && (
                  <p className="text-muted-foreground">Welcome back, {userProfile.name}!</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAdminMode}
                  className="flex items-center space-x-2"
                >
                  <Settings className="w-4 h-4" />
                  <span>Admin</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert className="mb-6">
            <AlertDescription className="text-red-600">{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="exams" className="space-y-6">
          <TabsList>
            <TabsTrigger value="exams" className="flex items-center space-x-2">
              <BookOpen className="w-4 h-4" />
              <span>Available Exams</span>
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center space-x-2">
              <Trophy className="w-4 h-4" />
              <span>My Results</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span>Profile</span>
            </TabsTrigger>
          </TabsList>

          {/* Available Exams Tab */}
          <TabsContent value="exams">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Available Exams</h2>
                <p className="mb-6">Choose an exam to take. Your results will be saved to your account.</p>
              </div>

              {examTemplates.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <BookOpen className="h-12 w-12 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Exams Available</h3>
                    <p className="">There are no exam templates configured. Please contact your administrator.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {examTemplates.map((exam) => (
                    <Card key={exam.id} className="hover:shadow-md transition-shadow flex flex-col bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                      <CardHeader>
                        <CardTitle className="space-y-2">
                          <div className="text-lg text-foreground">{exam.title}</div>
                        </CardTitle>
                        <CardDescription className="min-h-[2.5rem] text-muted-foreground">
                          {exam.description}
                          {exam.moreDetails && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="link" 
                                  className="text-xs text-blue-600 hover:text-blue-800 p-0 h-auto flex items-center text-[14px]"
                                >
                                  <Info className="w-3 h-3 mr-1" />
                                  More details...
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>{exam.title} - Additional Details</DialogTitle>
                                  <DialogDescription>
                                    Additional information and details about this exam.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="mt-4">
                                  <div 
                                    className="text-sm text-gray-700 dark:text-gray-300 prose prose-sm max-w-none leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: exam.moreDetails }}
                                  />
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-col flex-grow">
                        <div className="space-y-2 text-sm text-gray-600 mb-4 flex-grow">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center space-x-1">
                              <BookOpen className="w-4 h-4" />
                              <span>Questions</span>
                            </span>
                            <span className="font-medium">{exam.questionCount}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>Duration</span>
                            </span>
                            <span className="font-medium">{formatDuration(exam.timeLimit)}</span>
                          </div>
                        </div>
                        <Button 
                          onClick={() => onExamSelect(exam.id)} 
                          className="w-full mt-auto bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Start Exam
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">My Exam Results</h2>
                <p className="text-gray-600 mb-6">View your exam history and performance.</p>
              </div>

              {examResults.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Results Yet</h3>
                    <p className="text-gray-600">Take your first exam to see your results here.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {examResults.map((result, index) => (
                    <Card key={index}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {result.examTitle}
                            </h3>
                            <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(result.submittedAt)}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${getScoreColor(result.percentage)}`}>
                              {result.percentage}%
                            </div>
                            <div className="text-sm text-gray-600">
                              {result.score}/{result.totalQuestions} correct
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge variant={getScoreBadgeVariant(result.percentage)}>
                            {result.percentage >= 80 ? 'Passed' : 'Failed'}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            Score: {result.score} / {result.totalQuestions}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">My Profile</h2>
              </div>

              {userProfile && (
                <Card>
                  <CardHeader>
                    <CardTitle>Account Information</CardTitle>
                    <CardDescription>Your account details and statistics</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Full Name</label>
                        <p className="text-gray-900">{userProfile.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Email</label>
                        <p className="text-gray-900">{userProfile.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Member Since</label>
                        <p className="text-gray-900">{formatDate(userProfile.created_at)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Exams Taken</label>
                        <p className="text-gray-900">{examResults.length}</p>
                      </div>
                    </div>

                    {examResults.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h3>
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {Math.round(examResults.reduce((sum, r) => sum + r.percentage, 0) / examResults.length)}%
                            </div>
                            <div className="text-sm text-gray-600">Average Score</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {examResults.filter(r => r.percentage >= 80).length}
                            </div>
                            <div className="text-sm text-gray-600">Passed Exams</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">
                              {Math.max(...examResults.map(r => r.percentage), 0)}%
                            </div>
                            <div className="text-sm text-gray-600">Best Score</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}