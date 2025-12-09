import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Progress } from "./ui/progress";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { 
  Calendar, 
  Clock, 
  TrendingUp, 
  Award, 
  BookOpen, 
  BarChart3,
  Settings,
  Mail,
  Shield,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  AlertTriangle
} from "lucide-react";
import { useAuthContext } from "../contexts/AuthContext";
import { SettingsDialog } from "./SettingsDialog";
import { useUserApi } from "../hooks/useUserApi";
import { toast } from "sonner@2.0.3";

interface ProfilePageProps {
  onBack: () => void;
}

interface UserStats {
  totalExamsTaken: number;
  totalTimeSpent: number; // in minutes
  averageScore: number;
  bestScore: number;
  currentStreak: number;
  totalQuestions: number;
  questionsCorrect: number;
  lastExamDate: string | null;
  memberSince: string;
  examHistory: Array<{
    id: string;
    title: string;
    score: number;
    totalQuestions: number;
    timeSpent: number;
    date: string;
  }>;
}

export function ProfilePage({ onBack }: ProfilePageProps) {
  const { user, accessToken } = useAuthContext();
  const { profileApi } = useUserApi(accessToken);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const loadUserStats = async () => {
      if (!accessToken) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const result = await profileApi.getStats();
        
        if (result.success && result.data) {
          // Merge with user auth data
          setStats({
            ...result.data,
            memberSince: user?.userProfile?.created_at || result.data.memberSince
          });
        } else {
          setError(result.error || 'Failed to load profile statistics');
          toast.error('Failed to load profile data');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load profile';
        console.error('Error loading user stats:', err);
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadUserStats();
  }, [accessToken, user]);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 dark:text-green-400";
    if (score >= 80) return "text-blue-600 dark:text-blue-400";
    if (score >= 70) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onBack}
                  className="flex items-center space-x-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Dashboard</span>
                </Button>
                <Separator orientation="vertical" className="h-6" />
                <h1 className="text-2xl font-medium text-foreground">My Profile</h1>
              </div>
            </div>
          </div>
        </header>
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <CardTitle>Error Loading Profile</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onBack}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Dashboard</span>
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <h1 className="text-2xl font-medium text-foreground">My Profile</h1>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <Card className="border-border">
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <Avatar className="w-20 h-20">
                    <AvatarFallback className="text-lg font-medium bg-primary/10 text-primary">
                      {user?.userProfile?.name ? getInitials(user.userProfile.name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <CardTitle className="text-xl">{user?.userProfile?.name || 'User'}</CardTitle>
                <CardDescription className="flex items-center justify-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span>{user?.userProfile?.email}</span>
                </CardDescription>
                {user?.isAdmin && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 mt-2">
                    <Shield className="w-3 h-3 mr-1" />
                    Administrator
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    Member since
                  </span>
                  <span className="font-medium">
                    {formatDate(stats?.memberSince || new Date().toISOString())}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    Last exam
                  </span>
                  <span className="font-medium">
                    {stats?.lastExamDate ? formatDate(stats.lastExamDate) : 'Never'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-primary" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className="text-2xl font-medium text-primary">{stats?.totalExamsTaken || 0}</div>
                    <div className="text-xs text-muted-foreground">Exams Taken</div>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className="text-2xl font-medium text-primary">{stats?.currentStreak || 0}</div>
                    <div className="text-xs text-muted-foreground">Day Streak</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Average Score</span>
                    <span className="font-medium">{stats?.averageScore || 0}%</span>
                  </div>
                  <Progress value={stats?.averageScore || 0} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Overall Accuracy</span>
                    <span className="font-medium">
                      {stats ? Math.round((stats.questionsCorrect / stats.totalQuestions) * 100) : 0}%
                    </span>
                  </div>
                  <Progress 
                    value={stats ? (stats.questionsCorrect / stats.totalQuestions) * 100 : 0} 
                    className="h-2" 
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Detailed Stats */}
          <div className="lg:col-span-2 space-y-6">
            {/* Performance Overview */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-primary" />
                  Performance Overview
                </CardTitle>
                <CardDescription>
                  Your exam performance and study progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-medium text-foreground mb-2">
                      {stats?.bestScore || 0}%
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center justify-center">
                      <Award className="w-4 h-4 mr-1" />
                      Best Score
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-medium text-foreground mb-2">
                      {stats ? formatTime(stats.totalTimeSpent) : '0m'}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center justify-center">
                      <Clock className="w-4 h-4 mr-1" />
                      Time Studied
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-medium text-foreground mb-2">
                      {stats?.totalQuestions || 0}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center justify-center">
                      <BookOpen className="w-4 h-4 mr-1" />
                      Questions Answered
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Exam History */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="w-5 h-5 mr-2 text-primary" />
                  Recent Exam History
                </CardTitle>
                <CardDescription>
                  Your latest exam attempts and scores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.examHistory?.length ? stats.examHistory.map((exam) => (
                    <div key={exam.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-foreground mb-1">{exam.title}</div>
                        <div className="text-sm text-muted-foreground flex items-center space-x-4">
                          <span className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {formatDate(exam.date)}
                          </span>
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatTime(exam.timeSpent)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-medium ${getScoreColor(exam.score)}`}>
                          {exam.score}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {exam.totalQuestions} questions
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No exam history yet</p>
                      <p className="text-sm">Start taking exams to see your progress here</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Settings Dialog */}
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        userProfile={{
          name: user?.userProfile?.name || '',
          email: user?.userProfile?.email || '',
          credits: 12, // TODO: Get actual credit balance from API
        }}
        userId={user?.id || ''}
        accessToken={accessToken || ''}
      />
    </div>
  );
}
