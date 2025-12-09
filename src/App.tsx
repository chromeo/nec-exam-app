import { Suspense, lazy } from "react";
import { supabase } from './utils/supabase/client';
import { LoginPage } from "./components/auth/LoginPage";
import { ResetPasswordPage } from "./components/auth/ResetPasswordPage";
import { LandingPage } from "./components/LandingPage";
import { DemoExam } from "./components/DemoExam";
import { ThemeProvider } from "./components/ThemeProvider";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuthContext } from "./contexts/AuthContext";
import { useState, useEffect } from "react";

// Lazy load heavy components for better initial load performance
const AuthenticatedApp = lazy(() => 
  import("./components/AuthenticatedApp").then(module => ({
    default: module.AuthenticatedApp
  }))
);

// Loading component for Suspense fallback
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      <p className="mt-4 text-muted-foreground">Loading...</p>
    </div>
  </div>
);

// Separate component to use the AuthContext
function AppContent() {
  const { user, loading, login, isLoggedIn, accessToken, sessionTimedOut, clearSessionTimeoutFlag } = useAuthContext();
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  // Use Supabase's built-in auth state detection (more robust than manual hash parsing)
  // Note: We use a singleton client from /utils/supabase/client.ts to avoid multiple instances
  useEffect(() => {
    // Listen for auth state changes - this will catch PASSWORD_RECOVERY events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setShowResetPassword(true);
        setShowLanding(false);
        setShowLogin(false);
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Also check URL hash/query params on mount (fallback for direct navigation)
  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;
    
    // Check both hash and query params (Supabase might use either)
    const hashParams = new URLSearchParams(hash.slice(1));
    const searchParams = new URLSearchParams(search);
    
    const type = hashParams.get('type') || searchParams.get('type');
    const token = hashParams.get('access_token') || searchParams.get('access_token');
    const error = hashParams.get('error') || searchParams.get('error');
    const errorCode = hashParams.get('error_code') || searchParams.get('error_code');
    const errorDescription = hashParams.get('error_description') || searchParams.get('error_description');
    
    // If URL contains recovery type OR password reset error, show reset password page
    // The ResetPasswordPage component will handle displaying the appropriate message
    if (type === 'recovery' || errorCode === 'otp_expired' || (error === 'access_denied' && errorDescription)) {
      setShowResetPassword(true);
      setShowLanding(false);
      setShowLogin(false);
    }
  }, []);



  // IMPORTANT: Check for password reset BEFORE loading check
  // This ensures the reset form shows even while AuthContext is initializing
  if (showResetPassword) {
    return (
      <ThemeProvider>
        <ResetPasswordPage 
          onResetComplete={() => {
            setShowResetPassword(false);
            setShowLogin(true);
            setShowLanding(false);
          }} 
        />
        <Toaster />
      </ThemeProvider>
    );
  }

  if (loading) {
    return (
      <ThemeProvider>
        <LoadingSpinner />
        <Toaster />
      </ThemeProvider>
    );
  }

  if (showDemo) {
    return (
      <ThemeProvider>
        <DemoExam 
          onFinishDemo={() => {
            setShowDemo(false);
            setShowLanding(true);
          }}
          onSignUp={() => {
            setShowDemo(false);
            setShowLogin(true);
          }}
        />
        <Toaster />
      </ThemeProvider>
    );
  }

  if (!user) {
    // Show landing page first, then login page when user clicks to sign in
    if (showLanding && !showLogin) {
      return (
        <ThemeProvider>
          <LandingPage 
            onGetStarted={() => {
              setShowLanding(false);
              setShowLogin(true);
            }}
            onTryDemo={() => {
              setShowLanding(false);
              setShowDemo(true);
            }}
          />
          <Toaster />
        </ThemeProvider>
      );
    }

    return (
      <ThemeProvider>
        <LoginPage 
          onLoginSuccess={login}
          onShowResetPassword={() => setShowResetPassword(true)}
          onBack={() => {
            setShowLogin(false);
            setShowLanding(true);
          }}
          sessionTimedOut={sessionTimedOut}
          onDismissTimeout={clearSessionTimeoutFlag}
        />
        <Toaster />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <Suspense fallback={<LoadingSpinner />}>
        <AuthenticatedApp user={user} />
      </Suspense>
      <Toaster />
    </ThemeProvider>
  );
}

// Main App component with AuthProvider wrapper
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}