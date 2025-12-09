import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Alert, AlertDescription } from "../ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Loader2, BookOpen, X, AlertCircle } from "lucide-react";
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { ServerTest } from '../ServerTest';

interface LoginPageProps {
  onLoginSuccess: (accessToken: string, userProfile?: any, rememberMe?: boolean) => void;
  onShowResetPassword?: () => void;
  onBack?: () => void;
  sessionTimedOut?: boolean;
  onDismissTimeout?: () => void;
}

export function LoginPage({ onLoginSuccess, onShowResetPassword, onBack, sessionTimedOut, onDismissTimeout }: LoginPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showTimeoutAlert, setShowTimeoutAlert] = useState(sessionTimedOut || false);
  
  // Form states
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  // Password reset states
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");



  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a9be5165`;
  
  const makeRequest = async (endpoint: string, options: RequestInit = {}) => {
    try {
      const response = await fetch(`${serverUrl}${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      if (!response.ok) {
        console.error(`HTTP Error ${response.status}: ${response.statusText}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.info('ℹ️ Network error (server may be unavailable):', error);
      // Friendly error message for users
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('SERVER_DOWN');
      }
      throw error;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const result = await makeRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });

      if (result.success) {
        setMessage("Login successful! Redirecting...");
        
        setTimeout(() => {
          // Extract access token from session
          const accessToken = result.session?.access_token;
          if (accessToken) {
            // Pass rememberMe preference to onLoginSuccess
            // The parent component (App.tsx) will forward this to AuthContext
            onLoginSuccess(accessToken, result.data?.user_profile, rememberMe);
          } else {
            console.error('No access token in server response');
            setError('Login successful but no access token received');
          }
        }, 1000);
      } else {
        setError(result.error || 'Failed to sign in. Please try again.');
      }
    } catch (error) {
      console.info('ℹ️ Login failed (check credentials or server status):', error);
      if (error instanceof Error && error.message === 'SERVER_DOWN') {
        setError('Our server is temporarily offline for maintenance. Please check back in a minute.');
      } else {
        setError('Failed to sign in. Please check your credentials and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setMessage("");

    if (signupPassword !== confirmPassword) {
      setError("Passwords don't match");
      setIsLoading(false);
      return;
    }

    if (signupPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      setIsLoading(false);
      return;
    }

    try {
      const result = await makeRequest('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: signupEmail,
          password: signupPassword,
          name: signupName,
        }),
      });

      if (result.success) {
        const message = result.data.is_first_user 
          ? "Account created successfully with admin privileges! You can now sign in and access the admin panel."
          : "Account created successfully! You can now sign in.";
        setMessage(message);
        // Clear signup form
        setSignupEmail("");
        setSignupPassword("");
        setSignupName("");
        setConfirmPassword("");
        // Switch to login tab
        setTimeout(() => {
          const loginTab = document.querySelector('[value="login"]') as HTMLElement;
          loginTab?.click();
        }, 2000);
      } else {
        setError(result.error || 'Failed to create account');
      }
    } catch (error) {
      console.error('Signup error:', error);
      if (error instanceof Error && error.message === 'SERVER_DOWN') {
        setError('Our server is temporarily offline for maintenance. Please check back in a minute.');
      } else {
        setError('Failed to create account. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetMessage("");

    try {
      const result = await makeRequest('/auth/request-password-reset', {
        method: 'POST',
        body: JSON.stringify({
          email: resetEmail,
        }),
      });

      if (result.success) {
        setResetMessage(result.message);
        setTimeout(() => {
          setShowResetDialog(false);
          setResetEmail("");
          setResetMessage("");
        }, 3000);
      } else {
        setResetMessage(result.error || 'Failed to send reset email');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      if (error instanceof Error && error.message === 'SERVER_DOWN') {
        setResetMessage('Our server is temporarily offline for maintenance. Please check back in a minute.');
      } else {
        setResetMessage('Failed to send reset email. Please try again.');
      }
    } finally {
      setResetLoading(false);
    }
  };



  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        {showTimeoutAlert && (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="flex items-start justify-between gap-2">
              <div>
                <span className="font-semibold text-amber-900 dark:text-amber-100">Session Timed Out.</span>
                <span className="text-amber-800 dark:text-amber-200"> Your session timed out due to inactivity. Please log in again.</span>
              </div>
              <button
                onClick={() => {
                  setShowTimeoutAlert(false);
                  onDismissTimeout?.();
                }}
                className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 flex-shrink-0"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </AlertDescription>
          </Alert>
        )}

        <div className="text-center">
          {onBack && (
            <div className="mb-4">
              <Button 
                variant="ghost" 
                onClick={onBack}
                className="text-muted-foreground hover:text-foreground"
              >
                ← Back to Home
              </Button>
            </div>
          )}
          <div className="flex items-center justify-center mb-4">
            <BookOpen className="size-8 text-primary mr-3" />
            <h1 className="text-3xl font-bold text-foreground">Exam Platform</h1>
          </div>
          <p className="text-foreground mt-2">Sign in to take exams and view your results</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="Enter your email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="remember-me"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
                      disabled={isLoading}
                    />
                    <Label htmlFor="remember-me" className="text-sm text-muted-foreground cursor-pointer">
                      Stay logged in
                    </Label>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                  
                  <div className="text-center">
                    <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                      <DialogTrigger asChild>
                        <button
                          type="button"
                          className="text-sm text-primary hover:text-primary/80 underline"
                        >
                          Forgot your password?
                        </button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <form onSubmit={handlePasswordReset}>
                          <DialogHeader>
                            <DialogTitle>Reset Password</DialogTitle>
                            <DialogDescription>
                              Enter your email address and we'll send you a link to reset your password.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="reset-email">Email</Label>
                              <Input
                                id="reset-email"
                                type="email"
                                placeholder="Enter your email"
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                required
                                disabled={resetLoading}
                              />
                            </div>
                            {resetMessage && (
                              <Alert className={resetMessage.includes('sent') ? 'border-green-500/50 bg-green-500/10' : 'border-destructive/50 bg-destructive/10'}>
                                <AlertDescription className={resetMessage.includes('sent') ? 'text-green-700 dark:text-green-400' : 'text-destructive'}>
                                  {resetMessage}
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                          <DialogFooter>
                            <Button type="submit" disabled={resetLoading}>
                              {resetLoading ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                'Send Reset Link'
                              )}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> The first user to register will automatically receive admin privileges.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Enter your full name"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Create a password (min 6 characters)"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {error && (
              <Alert className="mt-4">
                <AlertDescription className="text-red-600">{error}</AlertDescription>
              </Alert>
            )}

            {message && (
              <Alert className="mt-4">
                <AlertDescription className="text-green-600">{message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <div className="text-center space-y-3">          
          <div className="text-sm text-gray-600">
            <span>Need help? </span>
            <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  Reset your password
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <form onSubmit={handlePasswordReset}>
                  <DialogHeader>
                    <DialogTitle>Reset Password</DialogTitle>
                    <DialogDescription>
                      Enter your email address and we'll send you a link to reset your password.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email-footer">Email</Label>
                      <Input
                        id="reset-email-footer"
                        type="email"
                        placeholder="Enter your email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                        disabled={resetLoading}
                      />
                    </div>
                    {resetMessage && (
                      <Alert>
                        <AlertDescription className={resetMessage.includes('sent') ? 'text-green-600' : 'text-red-600'}>
                          {resetMessage}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={resetLoading}>
                      {resetLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Send Reset Link'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}