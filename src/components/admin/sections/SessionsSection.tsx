import { useState, useEffect } from "react";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Input } from "../../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { AdminSectionHeader } from "../AdminSectionHeader";
import { useAdminApi } from "../../../hooks/useAdminApi";
import { RefreshCw, Trash2, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
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
import type { AdminExamSession } from "../../../supabase/functions/server/types";

interface SessionsSectionProps {
  accessToken: string;
}

/**
 * Admin Sessions Section
 * 
 * Displays all exam sessions (in-progress exams) with ability to:
 * - View session details (start time, age, progress)
 * - Identify stale sessions (older than expected duration)
 * - Delete individual sessions
 * - Bulk cleanup stale sessions
 * 
 * NOTE: Sessions become Results when submitted (moved to Results section)
 */
export const SessionsSection = ({ accessToken }: SessionsSectionProps) => {
  const { sessionsApi, isLoading } = useAdminApi(accessToken);
  const [sessions, setSessions] = useState<AdminExamSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<AdminExamSession[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "stale">("all");
  const [sessionToDelete, setSessionToDelete] = useState<AdminExamSession | null>(null);
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  const [cleanupThreshold, setCleanupThreshold] = useState(4);

  // Load sessions
  const loadSessions = async () => {
    const result = await sessionsApi.getAll();
    if (result.success && result.data) {
      setSessions(result.data);
    } else {
      toast.error(result.error || 'Failed to load sessions');
    }
  };

  // Delete individual session
  const handleDeleteSession = async (session: AdminExamSession) => {
    const result = await sessionsApi.delete(session.id);
    if (result.success) {
      toast.success('Session deleted successfully');
      setSessions(prev => prev.filter(s => s.id !== session.id));
      setSessionToDelete(null);
    } else {
      toast.error(result.error || 'Failed to delete session');
    }
  };

  // Bulk cleanup stale sessions
  const handleCleanupStale = async () => {
    const result = await sessionsApi.cleanupStale(cleanupThreshold);
    if (result.success) {
      toast.success(`Cleaned up ${result.data?.deletedCount || 0} stale sessions`);
      setShowCleanupDialog(false);
      loadSessions(); // Reload to show updated list
    } else {
      toast.error(result.error || 'Failed to cleanup sessions');
    }
  };

  // Initial load
  useEffect(() => {
    loadSessions();
  }, [accessToken]);

  // Filter sessions
  useEffect(() => {
    let filtered = sessions;

    // Apply status filter
    if (statusFilter === "active") {
      filtered = filtered.filter(s => !s.isStale);
    } else if (statusFilter === "stale") {
      filtered = filtered.filter(s => s.isStale);
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        s =>
          s.examTitle.toLowerCase().includes(search) ||
          s.studentId.toLowerCase().includes(search) ||
          s.sessionId.toLowerCase().includes(search)
      );
    }

    setFilteredSessions(filtered);
  }, [sessions, statusFilter, searchTerm]);

  const staleCount = sessions.filter(s => s.isStale).length;
  const activeCount = sessions.length - staleCount;

  return (
    <div className="p-6 pt-0 space-y-6">
      <AdminSectionHeader
        title="Exam Sessions"
        description="Manage active and stale exam sessions (in-progress exams not yet submitted)"
      >
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadSessions}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {staleCount > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowCleanupDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Cleanup Stale ({staleCount})
            </Button>
          )}
        </div>
      </AdminSectionHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground mb-1">Total Sessions</div>
            <div className="text-2xl">{sessions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground mb-1">Active Sessions</div>
            <div className="text-2xl text-green-600 dark:text-green-400">{activeCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground mb-1">Stale Sessions</div>
            <div className="text-2xl text-orange-600 dark:text-orange-400">{staleCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search by exam, student, or session ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sessions</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="stale">Stale Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sessions List */}
      <div className="space-y-3">
        {isLoading ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              Loading sessions...
            </CardContent>
          </Card>
        ) : filteredSessions.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              {sessions.length === 0
                ? "No exam sessions found. Sessions are created when users start exams."
                : "No sessions match the current filters."}
            </CardContent>
          </Card>
        ) : (
          filteredSessions.map((session) => (
            <Card key={session.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{session.examTitle}</h3>
                      {session.isStale ? (
                        <Badge variant="destructive">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Stale
                        </Badge>
                      ) : (
                        <Badge variant="default">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Student:</span> {session.studentId}
                      </div>
                      <div>
                        <span className="font-medium">Started:</span>{" "}
                        {new Date(session.startTime).toLocaleString()}
                      </div>
                      <div>
                        <span className="font-medium">Time Limit:</span> {session.timeLimit} minutes
                      </div>
                      <div>
                        <span className="font-medium">Age:</span>{" "}
                        <span className={session.isStale ? "text-orange-600 dark:text-orange-400" : ""}>
                          {session.ageInHours} hours
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Progress:</span> {session.answersCount} / {session.questionsCount} questions
                      </div>
                      <div>
                        <span className="font-medium">Session ID:</span>{" "}
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {session.sessionId || session.id}
                        </code>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setSessionToDelete(session)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!sessionToDelete} onOpenChange={(open) => !open && setSessionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this exam session for{" "}
              <span className="font-medium">{sessionToDelete?.studentId}</span>?
              <br />
              <br />
              This will permanently remove the session and cannot be undone. The student will
              need to restart the exam from the beginning.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => sessionToDelete && handleDeleteSession(sessionToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Cleanup Dialog */}
      <AlertDialog open={showCleanupDialog} onOpenChange={setShowCleanupDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cleanup Stale Sessions</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all exam sessions older than the specified threshold.
              <br />
              <br />
              <div className="space-y-2">
                <label className="text-sm font-medium">Age Threshold (hours):</label>
                <Input
                  type="number"
                  min="1"
                  max="24"
                  value={cleanupThreshold}
                  onChange={(e) => setCleanupThreshold(parseInt(e.target.value) || 4)}
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground">
                  Sessions older than {cleanupThreshold} hours will be deleted.
                  Currently: <span className="font-medium">{staleCount} stale sessions</span>
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCleanupStale}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cleanup Stale Sessions
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
