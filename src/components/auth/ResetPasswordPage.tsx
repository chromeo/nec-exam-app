import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Alert, AlertDescription } from "../ui/alert";
import { Loader2, CheckCircle, AlertCircle, Mail } from "lucide-react";
import { supabase } from '../../utils/supabase/client';

interface ResetPasswordPageProps {
  onResetComplete: () => void;
}

export function ResetPasswordPage({ onResetComplete }: ResetPasswordPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hasValidSession, setHasValidSession] = useState(false);
  const [linkExpired, setLinkExpired] = useState(false);

  useEffect(() => {
    // Extract tokens from BOTH URL fragment AND query params (Figma.site hosting may strip hash)
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const searchParams = new URLSearchParams(window.location.search);
    
    // Try hash first, fall back to query params
    const type = hashParams.get('type') || searchParams.get('type');
    const errorCode = hashParams.get('error_code') || searchParams.get('error_code');
    const errorDescription = hashParams.get('error_description') || searchParams.get('error_description');
    
    const source = hashParams.get('access_token') ? 'hash fragment' : 
                   searchParams.get('access_token') ? 'query parameters' : 'none';

    // Check for error in URL (expired/invalid link)
    if (errorCode === 'otp_expired' || 
        hashParams.get('error') === 'access_denied' || 
        searchParams.get('error') === 'access_denied') {
      setLinkExpired(true);
      setError(errorDescription ? decodeURIComponent(errorDescription) : 'This password reset link has expired or is invalid.');
      return;
    }

    // Check if Supabase established a recovery session
    // Supabase automatically processes the recovery tokens from the URL
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Error checking session:', error);
        setLinkExpired(true);
        setError('Failed to validate reset link. Please request a new one.');
        return;
      }

      if (session) {
        setHasValidSession(true);
      } else if (type === 'recovery') {
        setLinkExpired(true);
        setError('This password reset link has expired. Please request a new one.');
      } else {
        setLinkExpired(true);
        setError('Invalid or expired reset link. Please request a new password reset.');
      }
    };

    checkSession();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      setIsLoading(false);
      return;
    }

    try {
      // Use Supabase client to update password
      // This works because Supabase already established a recovery session from the URL tokens
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('❌ Password update error:', error);
        
        // Handle specific error cases
        if (error.message.includes('session') || error.message.includes('token')) {
          setLinkExpired(true);
          setError('Your reset link has expired. Please request a new password reset.');
        } else {
          setError(error.message || 'Failed to reset password');
        }
      } else {
        setSuccess(true);
        setTimeout(() => {
          onResetComplete();
        }, 2000);
      }
    } catch (error) {
      console.error('💥 Password reset error:', error);
      setError('Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show expired link warning
  if (linkExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-red-900 dark:text-red-400">Password Reset Link Expired</CardTitle>
            <CardDescription className="text-foreground/70">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
              <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-sm text-blue-900 dark:text-blue-300">
                <strong>Why did this happen?</strong>
                <ul className="mt-2 list-disc list-inside space-y-1 text-xs">
                  <li>Password reset links expire after 1 hour for security</li>
                  <li>Each link can only be used once</li>
                  <li>The link may have been already used</li>
                </ul>
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Button onClick={onResetComplete} className="w-full" variant="default">
                Request New Password Reset
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                You&apos;ll receive a fresh link in your email
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-green-900 dark:text-green-400">Password Reset Successful</CardTitle>
            <CardDescription className="text-foreground/70">
              Your password has been updated successfully. You can now sign in with your new password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={onResetComplete} className="w-full">
              Continue to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Reset Password</h1>
          <p className="text-muted-foreground mt-2">Enter your new password below</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Set New Password</CardTitle>
            <CardDescription>
              Choose a strong password for your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Enter new password (min 6 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isLoading || !hasValidSession}
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                <Input
                  id="confirm-new-password"
                  type="password"
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading || !hasValidSession}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || !hasValidSession}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </form>

            {error && !linkExpired && (
              <Alert className="mt-4 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription className="text-red-600 dark:text-red-400">{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <div className="text-center">
          <Button
            variant="outline"
            onClick={onResetComplete}
            className="text-sm"
          >
            Back to Sign In
          </Button>
        </div>
      </div>
    </div>
  );
}