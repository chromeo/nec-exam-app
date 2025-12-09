import { useState, useEffect } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { DashboardSection } from "./sections/DashboardSection";
import { QuestionsSection } from "./sections/QuestionsSection";
import { QuestionCategoriesSection } from "./sections/QuestionCategoriesSection";
import { ExamTemplatesSection } from "./sections/ExamTemplatesSection";
import { ResultsSection } from "./sections/ResultsSection";
import { SessionsSection } from "./sections/SessionsSection";
import { UserManagementSection } from "./sections/UserManagementSection";
import { CommentsSection } from "./sections/CommentsSection";
import { TestingFeedbackSection } from "./sections/TestingFeedbackSection";
import { ApiValidationSection } from "./sections/ApiValidationSection";
import { RouteTestingSection } from "./sections/RouteTestingSection";
import { TourManagementSection } from "./sections/TourManagementSection";
import { ServerDebugger } from "./ServerDebugger";
import { useAdminApi } from "../../hooks/useAdminApi";
import type { 
  Question, 
  ExamTemplate, 
  ExamResult
} from "../../supabase/functions/server/types";
import type { AdminSection } from "./types";
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface AdminDashboardProps {
  onExitAdmin: () => void;
  accessToken: string;
}

export const AdminDashboard = ({ onExitAdmin, accessToken }: AdminDashboardProps) => {
  const { questionsApi, questionCategoriesApi, templatesApi, resultsApi, commentsApi, userFeedbackApi, sessionsApi } = useAdminApi(accessToken);
  
  // Navigation state
  const [currentSection, setCurrentSection] = useState<AdminSection>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [preselectedQuestionCategory, setPreselectedQuestionCategory] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  // Data state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionCategories, setQuestionCategories] = useState<string[]>([]);
  const [templates, setTemplates] = useState<ExamTemplate[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [userFeedback, setUserFeedback] = useState<any[]>([]);  // ✅ NEW: Store user feedback separately
  const [sessionsCount, setSessionsCount] = useState(0);

  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a9be5165`;

  const makeRequest = async (endpoint: string, options: RequestInit = {}) => {
    try {
      const response = await fetch(`${serverUrl}${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      const responseText = await response.text();
      
      if (!response.ok) {
        console.error('❌ HTTP Error Response:', responseText);
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }
      
      // Try to parse as JSON
      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError);
        console.error('📝 Raw response text:', responseText);
        return { success: false, error: `Invalid JSON response: ${responseText.slice(0, 100)}...` };
      }
    } catch (error) {
      console.error('❌ Request failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Request failed' };
    }
  };

  // Load all data on component mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    await Promise.all([
      loadQuestions(),
      loadQuestionCategories(),
      loadTemplates(),
      loadResults(),
      loadUsers(),
      loadComments(),
      loadUserFeedback(),
      loadSessions(),
    ]);
  };

  const loadQuestions = async () => {
    const result = await questionsApi.getAll();
    if (result.success && result.data) {
      setQuestions(result.data);
    }
  };

  const loadQuestionCategories = async () => {
    const result = await questionCategoriesApi.getAll();
    if (result.success && result.data) {
      setQuestionCategories(result.data);
    }
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
      setResults(result.data);
    }
  };

  const loadUsers = async () => {
    try {
      const result = await makeRequest('/admin/users');
      if (result.success && result.data) {
        setUsers(result.data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadComments = async () => {
    try {
      const result = await commentsApi.getAll();
      if (result.success && result.data) {
        // Handle new API response structure: { comments: [], total: number, hasMore: boolean }
        // Type assertion to handle the flexible response structure
        const responseData = result.data as any;
        const commentsArray = responseData.comments || responseData;
        setComments(Array.isArray(commentsArray) ? commentsArray : []);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const loadUserFeedback = async () => {
    try {
      const result = await userFeedbackApi.getAll();
      if (result.success && result.data) {
        setUserFeedback(result.data);
      }
    } catch (error) {
      console.error('Error loading user feedback:', error);
    }
  };

  const loadSessions = async () => {
    try {
      const result = await sessionsApi.getAll();
      if (result.success && result.data) {
        // Count only active sessions (not stale)
        const activeSessions = result.data.filter((session: any) => !session.isStale);
        setSessionsCount(activeSessions.length);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  // ✅ Calculate total comment count: During exam (comments) + After exam (user feedback)
  const calculateTotalCommentCount = () => {
    return comments.length + userFeedback.length;
  };

  const handleSectionChange = (section: AdminSection) => {
    setCurrentSection(section);
    // Clear preselected category when switching sections unless going to questions
    if (section !== 'questions') {
      setPreselectedQuestionCategory(null);
    }
    // Clear selected user when switching sections unless going to users
    if (section !== 'users') {
      setSelectedUserId(null);
    }
  };

  const handleNavigateToQuestions = (preselectedCategory: string) => {
    setPreselectedQuestionCategory(preselectedCategory);
    setCurrentSection('questions');
  };

  const handleNavigateToUser = (userId: string) => {
    setSelectedUserId(userId);
    setCurrentSection('users');
  };

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const renderCurrentSection = () => {
    switch (currentSection) {
      case 'dashboard':
        return <DashboardSection accessToken={accessToken} />;
      case 'questions':
        return (
          <QuestionsSection 
            questionCategories={questionCategories}
            onRefreshCategories={loadQuestionCategories}
            preselectedCategory={preselectedQuestionCategory}
            accessToken={accessToken}
          />
        );
      case 'question-categories':
        return <QuestionCategoriesSection onNavigateToQuestions={handleNavigateToQuestions} accessToken={accessToken} />;
      case 'exam-templates':
        return <ExamTemplatesSection accessToken={accessToken} />;
      case 'results':
        return <ResultsSection accessToken={accessToken} />;
      case 'sessions':
        return <SessionsSection accessToken={accessToken} />;
      case 'users':
        return <UserManagementSection makeRequest={makeRequest} accessToken={accessToken} selectedUserId={selectedUserId} />;
      case 'comments':
        return (
          <CommentsSection 
            accessToken={accessToken}
            onNavigateToUser={handleNavigateToUser}
            onNavigateToQuestion={(questionId) => {
              // Navigate to questions and potentially highlight the question
              setCurrentSection('questions');
            }}
          />
        );
      case 'testing-feedback':
        return <TestingFeedbackSection accessToken={accessToken} />;
      case 'api-validation':
        return <ApiValidationSection accessToken={accessToken} />;
      case 'route-testing':
        return <RouteTestingSection accessToken={accessToken} />;
      case 'tour-management':
        return <TourManagementSection accessToken={accessToken} />;
      case 'debug':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">Server Debugger</h2>
            <ServerDebugger accessToken={accessToken} />
          </div>
        );
      default:
        return <div className="p-6">Section not found</div>;
    }
  };

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      <AdminSidebar
        currentSection={currentSection}
        onSectionChange={handleSectionChange}
        onExitAdmin={onExitAdmin}
        questionsCount={questions.length}
        templatesCount={templates.length}
        resultsCount={results.length}
        questionCategoriesCount={questionCategories.length}
        usersCount={users.length}
        commentsCount={calculateTotalCommentCount()}
        sessionsCount={sessionsCount}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-background">
        {renderCurrentSection()}
      </div>
    </div>
  );
};