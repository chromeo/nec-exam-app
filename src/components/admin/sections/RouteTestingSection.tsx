import { useState } from 'react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { AdminSectionHeader } from '../AdminSectionHeader';
import { projectId } from '../../../utils/supabase/info';

interface RouteTestResult {
  route: string;
  endpoint: string;
  description?: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
  error?: string;
  responseData?: any;
}

export const RouteTestingSection = ({ accessToken }: { accessToken: string }) => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<RouteTestResult[]>([]);

  const testRoutes = [
    { 
      name: 'Health Check', 
      endpoint: '/make-server-a9be5165/health',
      description: 'Verify server is operational'
    },
    { 
      name: 'Admin Auth Check', 
      endpoint: '/make-server-a9be5165/auth/check-admin',
      description: 'Verify admin authentication and permissions'
    },
  ];

  const testAllRoutes = async () => {
    setTesting(true);
    const testResults: RouteTestResult[] = [];

    for (const route of testRoutes) {
      const result: RouteTestResult = {
        route: route.name,
        endpoint: route.endpoint,
        description: route.description,
        status: 'pending',
      };

      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1${route.endpoint}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        // Log raw response for debugging
        const responseText = await response.text();
        console.log('📝 Raw response:', responseText);

        const data = JSON.parse(responseText);

        if (response.ok && data.success) {
          result.status = 'success';
          result.message = data.message || data.status || 'Request successful';
          result.responseData = data;
        } else {
          result.status = 'error';
          result.error = data.error || `HTTP ${response.status}: ${response.statusText}`;
        }
      } catch (error) {
        result.status = 'error';
        result.error = error instanceof Error ? error.message : 'Network error';
      }

      testResults.push(result);
      setResults([...testResults]);
    }

    setTesting(false);
  };

  const getStatusBadge = (status: RouteTestResult['status']) => {
    switch (status) {
      case 'success':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Success
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Testing...
          </Badge>
        );
    }
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return (
    <div className="p-6 pt-0 space-y-6">
      <AdminSectionHeader
        title="Route Testing"
        description="Test the new route module infrastructure"
      >
        <Button 
          onClick={testAllRoutes} 
          disabled={testing}
        >
          {testing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Testing...
            </>
          ) : (
            'Test All Routes'
          )}
        </Button>
      </AdminSectionHeader>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Test Results</span>
              <div className="flex items-center gap-2 text-sm font-normal">
                <span className="text-green-600 dark:text-green-400">
                  ✓ {successCount} passed
                </span>
                {errorCount > 0 && (
                  <span className="text-red-600 dark:text-red-400">
                    ✗ {errorCount} failed
                  </span>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.map((result, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{result.route}</span>
                      {getStatusBadge(result.status)}
                    </div>
                    {result.description && (
                      <div className="text-sm text-muted-foreground mb-1">
                        {result.description}
                      </div>
                    )}
                    <div className="text-sm text-muted-foreground font-mono">
                      GET {result.endpoint}
                    </div>
                    {result.message && (
                      <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                        ✓ {result.message}
                      </div>
                    )}
                    {result.error && (
                      <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                        ✗ {result.error}
                      </div>
                    )}
                    {result.responseData && result.status === 'success' && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                          View response data
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                          {JSON.stringify(result.responseData, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {results.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <p>Click "Test All Routes" to verify the routing infrastructure</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};