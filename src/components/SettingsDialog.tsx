import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import {
  User,
  Lock,
  CreditCard,
  Bell,
  Download,
  Trash2,
  Mail,
  Shield,
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  Printer,
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { PrintResultsDialog } from "./PrintResultsDialog";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: {
    name: string;
    email: string;
    credits?: number;
  };
  userId: string;
  accessToken: string;
}

export function SettingsDialog({ open, onOpenChange, userProfile, userId, accessToken }: SettingsDialogProps) {
  // Account Settings State
  const [name, setName] = useState(userProfile.name);
  const [email, setEmail] = useState(userProfile.email);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Notification Preferences State
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [examReminders, setExamReminders] = useState(true);
  const [resultsNotifications, setResultsNotifications] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  // Credits State
  const [selectedCreditPackage, setSelectedCreditPackage] = useState<number | null>(null);

  // Delete Account State
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  // Print Results Dialog State
  const [showPrintDialog, setShowPrintDialog] = useState(false);

  const [saving, setSaving] = useState(false);

  const creditPackages = [
    { credits: 5, price: 9.99, popular: false },
    { credits: 10, price: 17.99, popular: true, savings: "10% off" },
    { credits: 25, price: 39.99, popular: false, savings: "20% off" },
    { credits: 50, price: 69.99, popular: false, savings: "30% off" },
  ];

  const handleUpdateProfile = async () => {
    setSaving(true);
    try {
      // TODO: Implement API call to update profile
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success("Profile Updated", {
        description: "Your profile information has been updated successfully.",
      });
    } catch (error) {
      toast.error("Update Failed", {
        description: "Failed to update profile. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Password Mismatch", {
        description: "New password and confirmation don't match.",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password Too Short", {
        description: "Password must be at least 8 characters long.",
      });
      return;
    }

    setSaving(true);
    try {
      // TODO: Implement API call to change password (password reset)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success("Password Changed", {
        description: "Your password has been updated successfully.",
      });
      
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error("Password Change Failed", {
        description: "Failed to update password. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePrintResults = () => {
    setShowPrintDialog(true);
  };

  const handleUpdateNotifications = async () => {
    setSaving(true);
    try {
      // TODO: Implement API call to update notification preferences
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success("Preferences Updated", {
        description: "Your notification preferences have been saved.",
      });
    } catch (error) {
      toast.error("Update Failed", {
        description: "Failed to update preferences. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePurchaseCredits = async (credits: number, price: number) => {
    setSaving(true);
    try {
      // TODO: Implement Stripe/payment gateway integration
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success("Purchase Successful", {
        description: `${credits} exam credits have been added to your account.`,
      });
      
      setSelectedCreditPackage(null);
    } catch (error) {
      toast.error("Purchase Failed", {
        description: "Failed to process payment. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    setSaving(true);
    try {
      // TODO: Implement data export functionality
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Create a mock export file
      const exportData = {
        user: {
          name: userProfile.name,
          email: userProfile.email,
        },
        exportDate: new Date().toISOString(),
        examHistory: [], // TODO: Add actual exam history
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exam-history-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success("Export Complete", {
        description: "Your exam history has been downloaded.",
      });
    } catch (error) {
      toast.error("Export Failed", {
        description: "Failed to export data. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation.toLowerCase() !== "delete my account") {
      toast.error("Invalid Confirmation", {
        description: "Please type the exact confirmation phrase.",
      });
      return;
    }

    setSaving(true);
    try {
      // TODO: Implement account deletion
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success("Account Deleted", {
        description: "Your account has been permanently deleted.",
      });
      
      // Close dialog and redirect to login
      setShowDeleteDialog(false);
      onOpenChange(false);
      
      // TODO: Implement logout and redirect
    } catch (error) {
      toast.error("Deletion Failed", {
        description: "Failed to delete account. Please contact support.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Settings
            </DialogTitle>
            <DialogDescription>
              Manage your account settings and preferences
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="account" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="account">
                <User className="w-4 h-4 mr-2" />
                Account
              </TabsTrigger>
              <TabsTrigger value="credits">
                <CreditCard className="w-4 h-4 mr-2" />
                Credits
              </TabsTrigger>
              <TabsTrigger value="notifications">
                <Bell className="w-4 h-4 mr-2" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="data">
                <Download className="w-4 h-4 mr-2" />
                Data
              </TabsTrigger>
            </TabsList>

            {/* Account Tab */}
            <TabsContent value="account" className="space-y-6 mt-6">
              {/* Profile Information */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-foreground mb-4">Profile Information</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <div className="flex gap-2">
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email"
                          className="flex-1"
                        />
                        <Badge variant="outline" className="self-center">
                          <Mail className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      </div>
                    </div>
                    <Button onClick={handleUpdateProfile} disabled={saving}>
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Change Password */}
                <div>
                  <h3 className="font-medium text-foreground mb-2">Reset Password</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Set a new password for your account. No current password required.
                  </p>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <div className="relative">
                        <Input
                          id="new-password"
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password (min 8 characters)"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <div className="relative">
                        <Input
                          id="confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <Button 
                      onClick={handleChangePassword} 
                      disabled={saving || !newPassword || !confirmPassword}
                      variant="secondary"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      {saving ? "Updating..." : "Update Password"}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Credits Tab */}
            <TabsContent value="credits" className="space-y-6 mt-6">
              <div>
                <div className="mb-6">
                  <h3 className="font-medium text-foreground mb-2">Current Balance</h3>
                  <div className="flex items-center gap-4">
                    <div className="text-3xl font-medium text-primary">
                      {userProfile.credits || 0}
                    </div>
                    <Badge variant="outline">Exam Credits</Badge>
                  </div>
                </div>

                <Separator className="my-6" />

                <div>
                  <h3 className="font-medium text-foreground mb-4">Purchase Credits</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Each credit allows you to take one exam. Purchase in bulk to save more!
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {creditPackages.map((pkg) => (
                      <Card 
                        key={pkg.credits}
                        className={`relative cursor-pointer transition-all ${
                          selectedCreditPackage === pkg.credits
                            ? "border-primary ring-2 ring-primary/20"
                            : "border-border hover:border-primary/50"
                        } ${pkg.popular ? "border-primary/50" : ""}`}
                        onClick={() => setSelectedCreditPackage(pkg.credits)}
                      >
                        {pkg.popular && (
                          <Badge className="absolute -top-2 -right-2 bg-primary">
                            Most Popular
                          </Badge>
                        )}
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            <span>{pkg.credits} Credits</span>
                            {selectedCreditPackage === pkg.credits && (
                              <Check className="w-5 h-5 text-primary" />
                            )}
                          </CardTitle>
                          <CardDescription>
                            ${pkg.price.toFixed(2)}
                            {pkg.savings && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                {pkg.savings}
                              </Badge>
                            )}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm text-muted-foreground">
                            ${(pkg.price / pkg.credits).toFixed(2)} per exam
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="mt-6 flex justify-end">
                    <Button
                      onClick={() => {
                        if (selectedCreditPackage) {
                          const pkg = creditPackages.find(p => p.credits === selectedCreditPackage);
                          if (pkg) {
                            handlePurchaseCredits(pkg.credits, pkg.price);
                          }
                        }
                      }}
                      disabled={!selectedCreditPackage || saving}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      {saving ? "Processing..." : "Purchase Credits"}
                    </Button>
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="bg-muted/30 p-4 rounded-lg">
                  <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Payment Information
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Secure payment processing powered by Stripe. All transactions are encrypted and secure.
                    Credits never expire and can be used for any exam on the platform.
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6 mt-6">
              <div>
                <h3 className="font-medium text-foreground mb-4">Email Notifications</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="email-notifications">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive important updates via email
                      </p>
                    </div>
                    <Switch
                      id="email-notifications"
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="exam-reminders">Exam Reminders</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified about upcoming scheduled exams
                      </p>
                    </div>
                    <Switch
                      id="exam-reminders"
                      checked={examReminders}
                      onCheckedChange={setExamReminders}
                      disabled={!emailNotifications}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="results-notifications">Exam Results</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications when exam results are ready
                      </p>
                    </div>
                    <Switch
                      id="results-notifications"
                      checked={resultsNotifications}
                      onCheckedChange={setResultsNotifications}
                      disabled={!emailNotifications}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="weekly-digest">Weekly Progress Digest</Label>
                      <p className="text-sm text-muted-foreground">
                        Get a weekly summary of your study progress
                      </p>
                    </div>
                    <Switch
                      id="weekly-digest"
                      checked={weeklyDigest}
                      onCheckedChange={setWeeklyDigest}
                      disabled={!emailNotifications}
                    />
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium text-foreground mb-3">Exam Tour Preferences</h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="reset-tour">Reset Exam Tour</Label>
                        <p className="text-sm text-muted-foreground">
                          Show the guided tour again when starting a new exam
                        </p>
                      </div>
                      <Button
                        id="reset-tour"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          localStorage.removeItem('examTourDismissed');
                          toast.success('Tour Reset', {
                            description: 'The exam tour will be shown again when you start a new exam.',
                          });
                        }}
                      >
                        Reset Tour
                      </Button>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button onClick={handleUpdateNotifications} disabled={saving}>
                      {saving ? "Saving..." : "Save Preferences"}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Data Tab */}
            <TabsContent value="data" className="space-y-6 mt-6">
              <div className="space-y-6">
                {/* Print Results */}
                <div>
                  <h3 className="font-medium text-foreground mb-4">Print Exam Results</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Generate a comprehensive printable report with filters and statistics for your exam history.
                  </p>
                  <Button onClick={handlePrintResults} variant="outline">
                    <Printer className="w-4 h-4 mr-2" />
                    Print Results
                  </Button>
                </div>

                <Separator />

                {/* Export Data */}
                <div>
                  <h3 className="font-medium text-foreground mb-4">Export Your Data</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Download a copy of your exam history, results, and profile information in JSON format.
                  </p>
                  <Button onClick={handleExportData} disabled={saving} variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    {saving ? "Exporting..." : "Export Data"}
                  </Button>
                </div>

                <Separator />

                {/* Delete Account */}
                <div>
                  <h3 className="font-medium text-destructive mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Danger Zone
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Once you delete your account, there is no going back. This action is permanent and will
                    delete all your exam history, results, and profile information.
                  </p>
                  <Button 
                    onClick={() => setShowDeleteDialog(true)} 
                    variant="destructive"
                    className="text-destructive-foreground"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                This action cannot be undone. This will permanently delete your account and remove all
                your data from our servers, including:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Your profile information</li>
                <li>All exam history and results</li>
                <li>Any purchased credits</li>
                <li>Saved progress and preferences</li>
              </ul>
              <div className="pt-4">
                <Label htmlFor="delete-confirmation" className="text-foreground">
                  Type "delete my account" to confirm:
                </Label>
                <Input
                  id="delete-confirmation"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="delete my account"
                  className="mt-2"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmation("")}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={saving || deleteConfirmation.toLowerCase() !== "delete my account"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Print Results Dialog */}
      <PrintResultsDialog
        open={showPrintDialog}
        onOpenChange={setShowPrintDialog}
        userId={userId}
        userProfile={userProfile}
        accessToken={accessToken}
      />
    </>
  );
}