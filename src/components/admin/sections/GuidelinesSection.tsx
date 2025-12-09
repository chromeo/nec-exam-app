import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Alert, AlertDescription } from '../../ui/alert';
import { AdminSectionHeader } from '../AdminSectionHeader';
import { parseMarkdown } from '../../../utils/markdown';
import { FileText, AlertCircle, RefreshCw, Upload } from 'lucide-react';
import { Button } from '../../ui/button';
import { projectId } from '../../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface GuidelinesSectionProps {
  accessToken: string;
}

export const GuidelinesSection = ({ accessToken }: GuidelinesSectionProps) => {
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const loadGuidelines = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a9be5165/guidelines`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to load guidelines: ${response.status}`);
      }
      const result = await response.json();
      if (result.success && result.data?.content) {
        setMarkdownContent(result.data.content);
      } else {
        throw new Error(result.error || 'No content received');
      }
    } catch (err) {
      console.error('Error loading guidelines:', err);
      setError(err instanceof Error ? err.message : 'Failed to load guidelines');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncToStorage = async () => {
    setIsSyncing(true);
    try {
      // Server will read Guidelines.md from its filesystem
      const uploadResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a9be5165/admin/guidelines/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}) // Empty body - server reads file directly
      });
      
      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || `Upload failed: ${uploadResponse.status}`);
      }
      
      const result = await uploadResponse.json();
      
      if (result.success) {
        const timestamp = new Date().toLocaleString();
        setLastSyncTime(timestamp);
        toast.success('Synced successfully', {
          description: `Guidelines.md uploaded to Supabase Storage (${result.data.size})`,
        });
        
        // Reload to show the updated content
        await loadGuidelines();
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (err) {
      console.error('❌ Sync error:', err);
      toast.error('Sync failed', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadGuidelines();
  }, []);

  const handleRefresh = () => {
    loadGuidelines();
  };

  if (isLoading) {
    return (
      <div className="p-6 pt-0">
        <AdminSectionHeader
          title="Development Guidelines"
          description="Protected code documentation and development best practices"
          icon={FileText}
        />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading guidelines...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 pt-0">
        <AdminSectionHeader
          title="Development Guidelines"
          description="Protected code documentation and development best practices"
          icon={FileText}
        />
        <Alert className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>Error loading guidelines: {error}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                className="ml-4"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 pt-0">
      <AdminSectionHeader
        title="Development Guidelines"
        description="Protected code documentation and development best practices"
        icon={FileText}
      />

      <div className="mt-6">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Guidelines.md
              </CardTitle>
              <div className="flex items-center gap-2">
                {lastSyncTime && (
                  <span className="text-xs text-muted-foreground mr-2">
                    Last synced: {lastSyncTime}
                  </span>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefresh}
                  disabled={isSyncing}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={handleSyncToStorage}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Sync to Storage
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {markdownContent ? (
              <div 
                className="markdown-body max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: parseMarkdown(markdownContent) 
                }}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No guidelines content found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Auto-Sync Workflow:</strong> When the AI assistant updates <code className="bg-muted px-1 py-0.5 rounded text-xs">/supabase/functions/server/Guidelines.md</code>, 
            click "Sync to Storage" to automatically upload the latest version to Supabase Storage. 
            The server reads the file directly from its filesystem—no manual copy-paste needed!
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};
