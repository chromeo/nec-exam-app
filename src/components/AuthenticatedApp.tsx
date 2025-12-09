import React, { useState, useCallback, memo, Suspense, lazy, useEffect } from 'react';
import { Button } from './ui/button';
import { BookOpen, User, Settings, LogOut } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { ColorSchemeToggle } from './ColorSchemeToggle';
import { FeedbackButton } from './FeedbackButton';
import { AppNavbar } from './navigation/AppNavbar';
import { useAuthContext } from '../contexts/AuthContext';
import { useSessionMonitor, setupGlobalSessionMonitoring } from '../hooks/useSessionMonitor';
import { useAutoTokenRefresh } from '../hooks/useAutoTokenRefresh';

// Lazy load heavy components that are only needed conditionally
const AdminArea = lazy(() => 
  import('./AdminArea').then(module => ({ default: module.AdminArea }))
);
const ExamScreen = lazy(() => 
  import('./ExamScreen').then(module => ({ default: module.ExamScreen }))
);
const ExamManager = lazy(() => 
  import('./exam/ExamManager').then(module => ({ default: module.ExamManager }))
);
const ProfilePage = lazy(() => 
  import('./ProfilePage').then(module => ({ default: module.ProfilePage }))
);

// Loading fallback component
const ComponentLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
      <p className="mt-4 text-sm text-muted-foreground">Loading component...</p>
    </div>
  </div>
);

// ExamTemplate interface moved to ExamManager

interface AuthenticatedAppProps {
  user: {
    accessToken: string;
    userProfile: any;
    isAdmin: boolean;
  };
}

export const AuthenticatedApp: React.FC<AuthenticatedAppProps> = memo(({
  user,
}) => {
  const { accessToken, userProfile, isAdmin } = user;
  const { logout, logoutDueToTimeout, refreshToken } = useAuthContext();
  const [currentView, setCurrentView] = useState<'exam-list' | 'exam' | 'admin' | 'profile'>('exam-list');

  // Handle session expiration - immediately redirect to login
  const handleSessionExpired = useCallback(() => {
    console.info('ℹ️ Session expired due to inactivity - redirecting to login');
    logoutDueToTimeout();
  }, [logoutDueToTimeout]);

  // Handle successful token refresh
  const handleTokenRefreshed = useCallback((newToken: string) => {
    refreshToken(newToken);
  }, [refreshToken]);

  // Set up automatic token refresh with activity-based timeout
  // Admin users: 48 hours of inactivity allowed
  // Regular users: 3 hours of inactivity allowed
  useAutoTokenRefresh({
    accessToken,
    onTokenRefreshed: handleTokenRefreshed,
    onRefreshFailed: handleSessionExpired,
    refreshThresholdMs: 10 * 60 * 1000, // Refresh 10 minutes before expiry
    checkIntervalMs: 60 * 1000, // Check every minute
    inactivityTimeoutMs: isAdmin 
      ? 48 * 60 * 60 * 1000  // 48 hours for admins
      : 3 * 60 * 60 * 1000,  // 3 hours for regular users
    enabled: true,
  });

  // Set up session monitoring (as a backup to auto-refresh)
  const { sessionStatus } = useSessionMonitor({
    accessToken,
    onSessionExpired: handleSessionExpired,
    checkInterval: 5 * 60 * 1000, // Check every 5 minutes
    enableMonitoring: true,
  });

  // Set up global 401 error monitoring
  useEffect(() => {
    const cleanup = setupGlobalSessionMonitoring(handleSessionExpired);
    return cleanup;
  }, [handleSessionExpired]);



  // Memoized callbacks to prevent unnecessary re-renders
  const handleBackToExamList = useCallback(() => {
    setCurrentView('exam-list');
  }, []);

  const handleAdminView = useCallback(() => {
    setCurrentView('admin');
  }, []);

  const handleProfileView = useCallback(() => {
    setCurrentView('profile');
  }, []);

  if (currentView === 'admin' && isAdmin) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <FeedbackButton isAdmin={isAdmin} />
        <AppNavbar
          userProfile={userProfile}
          isAdmin={isAdmin}
          onProfileView={handleProfileView}
          onAdminView={handleAdminView}
          onLogout={logout}
        />
        <Suspense fallback={<ComponentLoader />}>
          <AdminArea 
            accessToken={accessToken}
            onBack={handleBackToExamList}
          />
        </Suspense>
      </div>
    );
  }

  if (currentView === 'profile') {
    return (
      <div className="h-screen flex flex-col bg-background">
        <FeedbackButton isAdmin={isAdmin} />
        <AppNavbar
          userProfile={userProfile}
          isAdmin={isAdmin}
          onProfileView={handleProfileView}
          onAdminView={handleAdminView}
          onLogout={logout}
        />
        <Suspense fallback={<ComponentLoader />}>
          <ProfilePage onBack={handleBackToExamList} />
        </Suspense>
      </div>
    );
  }



  // Removed separate exam view - now handled by ExamManager in main view
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header - Mobile Responsive Navbar */}
      <AppNavbar
        userProfile={userProfile}
        isAdmin={isAdmin}
        onProfileView={handleProfileView}
        onAdminView={handleAdminView}
        onLogout={logout}
      />

      {/* Main Content - Now using ExamManager */}
      <Suspense fallback={<ComponentLoader />}>
        <ExamManager
          accessToken={accessToken}
          userProfile={userProfile}
          isAdmin={isAdmin}
          onBack={handleBackToExamList}
          onAdminView={handleAdminView}
          onProfileView={handleProfileView}
          onLogout={logout}
        />
      </Suspense>

      {/* Results dialogs now handled by ExamManager */}
    </div>
  );
});