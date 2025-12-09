import { useState, useEffect } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Alert, AlertDescription } from "../../ui/alert";
import { Switch } from "../../ui/switch";
import { Textarea } from "../../ui/textarea";
import { AdminSectionHeader } from "../AdminSectionHeader";
import { UserDetailsDialog } from "../dialogs/UserDetailsDialog";
import { Users, Shield, ShieldCheck, Calendar, Mail, User, KeyRound, Eye, EyeOff, Copy, RefreshCw, ExternalLink } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { toast } from "sonner@2.0.3";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
  created_at: string;
  updated_at?: string;
}

interface UserManagementSectionProps {
  makeRequest: (endpoint: string, options?: RequestInit) => Promise<any>;
  accessToken: string;
  selectedUserId?: string; // For direct navigation to specific user
}

export function UserManagementSection({ makeRequest, accessToken, selectedUserId }: UserManagementSectionProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmAction, setConfirmAction] = useState<{
    userId: string;
    userName: string;
    action: 'promote' | 'demote';
  } | null>(null);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);

  // Password reset state
  const [passwordResetDialog, setPasswordResetDialog] = useState<{
    userId: string;
    userName: string;
    userEmail: string;
  } | null>(null);
  const [customPassword, setCustomPassword] = useState("");
  const [showCustomPassword, setShowCustomPassword] = useState(false);
  const [useRandomPassword, setUseRandomPassword] = useState(true);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetResult, setResetResult] = useState<{
    newPassword: string;
    userEmail: string;
    userName: string;
  } | null>(null);
  const [showResetResult, setShowResetResult] = useState(false);
  
  // User details dialog state
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  // Handle direct navigation to specific user
  useEffect(() => {
    if (selectedUserId && users.length > 0) {
      const user = users.find(u => u.id === selectedUserId);
      if (user) {
        setSelectedUser(user);
        setShowUserDetails(true);
      }
    }
  }, [selectedUserId, users]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setError("");
      
      const result = await makeRequest('/admin/users');
      if (result.success && result.data) {
        // Ensure users is an array
        const usersData = Array.isArray(result.data) ? result.data : [];
        setUsers(usersData);
      } else {
        console.error('Error loading users:', result.error);
        setError(result.error || 'Failed to load users');
        setUsers([]); // Set empty array on error
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setError('Failed to load users. Please try again.');
      setUsers([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminToggle = (user: UserProfile) => {
    if (user.is_admin) {
      setConfirmAction({
        userId: user.id,
        userName: user.name,
        action: 'demote'
      });
    } else {
      setConfirmAction({
        userId: user.id,
        userName: user.name,
        action: 'promote'
      });
    }
  };

  const confirmAdminStatusChange = async () => {
    if (!confirmAction) return;

    try {
      setProcessingUserId(confirmAction.userId);
      const newAdminStatus = confirmAction.action === 'promote';
      
      const result = await makeRequest(`/admin/users/${confirmAction.userId}/admin-status`, {
        method: 'PUT',
        body: JSON.stringify({ is_admin: newAdminStatus }),
      });

      if (result.success) {
        // Update the user in the local state
        setUsers(prev => prev.map(user => 
          user.id === confirmAction.userId 
            ? { ...user, is_admin: newAdminStatus, updated_at: new Date().toISOString() }
            : user
        ));
        
        setConfirmAction(null);
      } else {
        setError(result.error || 'Failed to update user admin status');
      }
    } catch (error) {
      console.error('Error updating user admin status:', error);
      setError('Failed to update user admin status. Please try again.');
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleUserClick = (user: UserProfile) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  const handleUserUpdate = (updatedUser: UserProfile) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    setSelectedUser(updatedUser);
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

  const adminCount = users.filter(user => user.is_admin).length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">User Management</h2>
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  const handlePasswordReset = (user: UserProfile) => {
    setPasswordResetDialog({
      userId: user.id,
      userName: user.name,
      userEmail: user.email
    });
    setCustomPassword("");
    setUseRandomPassword(true);
    setShowCustomPassword(false);
  };

  const confirmPasswordReset = async () => {
    if (!passwordResetDialog) return;

    try {
      setIsResettingPassword(true);
      
      const requestBody = useRandomPassword 
        ? { generateRandom: true }
        : { newPassword: customPassword };

      const result = await makeRequest(`/admin/users/${passwordResetDialog.userId}/reset-password`, {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      });

      if (result.success) {
        setResetResult(result.data);
        setPasswordResetDialog(null);
        setShowResetResult(true);
        toast.success('Password reset successfully');
      } else {
        setError(result.error || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      setError('Failed to reset password. Please try again.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const copyPasswordToClipboard = async () => {
    if (!resetResult) return;
    
    try {
      await navigator.clipboard.writeText(resetResult.newPassword);
      toast.success('Password copied to clipboard');
    } catch (error) {
      console.error('Failed to copy password:', error);
      toast.error('Failed to copy password');
    }
  };

  const copyResetInfoToClipboard = async () => {
    if (!resetResult) return;
    
    const resetInfo = `Password Reset for ${resetResult.userName}
Email: ${resetResult.userEmail}
New Password: ${resetResult.newPassword}

Please share this information securely with the user.`;
    
    try {
      await navigator.clipboard.writeText(resetInfo);
      toast.success('Reset information copied to clipboard');
    } catch (error) {
      console.error('Failed to copy reset information:', error);
      toast.error('Failed to copy reset information');
    }
  };

  return (
    <div className="p-6 pt-0 space-y-6">
      <AdminSectionHeader
        title="User Management"
        description="Manage user accounts and admin privileges. The first user to sign up automatically becomes an admin."
      />

      {error && (
        <Alert>
          <AlertDescription className="text-red-600">{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-semibold text-gray-900">{users.length}</p>
                <p className="text-sm text-gray-600">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-semibold text-gray-900">{adminCount}</p>
                <p className="text-sm text-gray-600">Admin Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <User className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-2xl font-semibold text-gray-900">{users.length - adminCount}</p>
                <p className="text-sm text-gray-600">Regular Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            Manage admin privileges for user accounts. At least one admin must remain at all times.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Users Found</h3>
              <p className="text-gray-600">No user accounts have been created yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div 
                  key={user.id} 
                  className="flex items-center justify-between p-4 border border-border rounded-lg bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleUserClick(user)}
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {user.is_admin ? (
                          <Shield className="w-5 h-5 text-green-500 dark:text-green-400" />
                        ) : (
                          <User className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-medium text-foreground">{user.name}</h3>
                          {user.is_admin && (
                            <Badge variant="default" className="text-xs">
                              Admin
                            </Badge>
                          )}
                          <ExternalLink className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                          <div className="flex items-center space-x-1">
                            <Mail className="w-4 h-4" />
                            <span>{user.email}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>Joined {formatDate(user.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-foreground">
                        Admin
                      </label>
                      <Switch
                        checked={user.is_admin}
                        onCheckedChange={() => handleAdminToggle(user)}
                        disabled={
                          processingUserId === user.id || 
                          (user.is_admin && adminCount <= 1)
                        }
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePasswordReset(user);
                      }}
                      disabled={processingUserId === user.id}
                      className="flex items-center space-x-1"
                    >
                      <KeyRound className="w-4 h-4" />
                      <span>Reset Password</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.action === 'promote' ? 'Promote User to Admin' : 'Remove Admin Privileges'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.action === 'promote' 
                ? `Are you sure you want to give admin privileges to ${confirmAction?.userName}? They will be able to manage questions, exams, and other users.`
                : `Are you sure you want to remove admin privileges from ${confirmAction?.userName}? They will no longer be able to access the admin panel.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!processingUserId}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmAdminStatusChange}
              disabled={!!processingUserId}
              className={confirmAction?.action === 'demote' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {processingUserId ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Password Reset Dialog */}
      <Dialog open={!!passwordResetDialog} onOpenChange={() => setPasswordResetDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <KeyRound className="w-5 h-5" />
              <span>Reset Password</span>
            </DialogTitle>
            <DialogDescription>
              Reset password for <strong>{passwordResetDialog?.userName}</strong> ({passwordResetDialog?.userEmail})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="random-password"
                  checked={useRandomPassword}
                  onChange={() => setUseRandomPassword(true)}
                  className="w-4 h-4"
                />
                <Label htmlFor="random-password" className="flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4" />
                  <span>Generate random secure password (recommended)</span>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="custom-password"
                  checked={!useRandomPassword}
                  onChange={() => setUseRandomPassword(false)}
                  className="w-4 h-4"
                />
                <Label htmlFor="custom-password">Set custom password</Label>
              </div>
            </div>

            {!useRandomPassword && (
              <div className="space-y-2">
                <Label htmlFor="custom-password-input">Custom Password</Label>
                <div className="relative">
                  <Input
                    id="custom-password-input"
                    type={showCustomPassword ? "text" : "password"}
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    placeholder="Enter new password (min 6 characters)"
                    minLength={6}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowCustomPassword(!showCustomPassword)}
                  >
                    {showCustomPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {customPassword && customPassword.length < 6 && (
                  <p className="text-sm text-red-600">Password must be at least 6 characters long</p>
                )}
              </div>
            )}

            <Alert>
              <AlertDescription>
                <strong>Security Notice:</strong> The new password will be displayed in plain text after reset. 
                Make sure to share it securely with the user and ask them to change it on next login.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPasswordResetDialog(null)}
              disabled={isResettingPassword}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmPasswordReset}
              disabled={
                isResettingPassword || 
                (!useRandomPassword && (!customPassword || customPassword.length < 6))
              }
              className="bg-primary hover:bg-primary/90"
            >
              {isResettingPassword ? 'Resetting...' : 'Reset Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Reset Result Dialog */}
      <Dialog open={showResetResult} onOpenChange={setShowResetResult}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-green-600">
              <KeyRound className="w-5 h-5" />
              <span>Password Reset Successful</span>
            </DialogTitle>
            <DialogDescription>
              The password has been successfully reset for <strong>{resetResult?.userName}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg border">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="font-medium">User Email:</Label>
                  <span className="text-sm text-gray-600">{resetResult?.userEmail}</span>
                </div>
                <div className="flex justify-between items-center">
                  <Label className="font-medium">New Password:</Label>
                  <div className="flex items-center space-x-2">
                    <code className="bg-white px-2 py-1 rounded border text-sm font-mono">
                      {resetResult?.newPassword}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyPasswordToClipboard}
                      className="h-8 w-8 p-0"
                      title="Copy password"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-chart-4/10 border border-chart-4/20 p-4 rounded-lg">
              <h4 className="font-medium text-chart-4 mb-2">Next Steps:</h4>
              <ul className="text-sm text-chart-4/80 space-y-1">
                <li>1. Copy the password information below</li>
                <li>2. Share it securely with the user (avoid email/chat if possible)</li>
                <li>3. Ask the user to change their password after logging in</li>
                <li>4. This dialog will close and the password will no longer be visible</li>
              </ul>
            </div>

            <Textarea
              readOnly
              value={`Password Reset Information
User: ${resetResult?.userName}
Email: ${resetResult?.userEmail}
New Password: ${resetResult?.newPassword}

Please log in with this temporary password and change it immediately for security.`}
              rows={6}
              className="text-sm font-mono"
            />
          </div>

          <DialogFooter className="space-x-2">
            <Button
              variant="outline"
              onClick={copyResetInfoToClipboard}
              className="flex items-center space-x-2"
            >
              <Copy className="w-4 h-4" />
              <span>Copy All Info</span>
            </Button>
            <Button
              onClick={() => {
                setShowResetResult(false);
                setResetResult(null);
              }}
              className="bg-chart-2 hover:bg-chart-2/90"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Details Dialog */}
      <UserDetailsDialog
        user={selectedUser}
        isOpen={showUserDetails}
        onClose={() => {
          setShowUserDetails(false);
          setSelectedUser(null);
        }}
        makeRequest={makeRequest}
        onUserUpdate={handleUserUpdate}
      />
    </div>
  );
}