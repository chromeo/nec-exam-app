import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Separator } from '../../ui/separator';
import { Alert, AlertDescription } from '../../ui/alert';
import { AdminSectionHeader } from '../AdminSectionHeader';
import { 
  CheckCircle, 
  XCircle,
  Play,
  Globe,
  Timer,
  Download
} from 'lucide-react';

import { 
  createApiTester, 
  generateApiTestReport,
  type ApiEndpointTest 
} from '../../../utils/type-consistency';
import { projectId } from '../../../utils/supabase/info';

interface ApiValidationSectionProps {
  accessToken: string;
}

export const ApiValidationSection: React.FC<ApiValidationSectionProps> = ({ accessToken }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [apiTestResults, setApiTestResults] = useState<ApiEndpointTest[] | null>(null);
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null);

  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a9be5165`;

  const runApiContractTests = async () => {
    setIsRunning(true);
    try {
      const apiTester = createApiTester(serverUrl, accessToken);
      const results = await apiTester.testAllEndpoints();
      setApiTestResults(results);
      setLastRunTime(new Date());
    } catch (error) {
      console.error('❌ API contract tests failed:', error);
      setApiTestResults([{
        endpoint: 'All Tests',
        method: 'ERROR',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }]);
    } finally {
      setIsRunning(false);
    }
  };

  const downloadReport = () => {
    if (!apiTestResults) return;
    
    const reportContent = generateApiTestReport(apiTestResults);
    const blob = new Blob([reportContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-contract-test-report-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: 'pass' | 'fail' | 'warning' | 'error') => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'fail': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusBadge = (status: 'pass' | 'fail' | 'warning' | 'error', text: string) => {
    const variants = {
      pass: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800',
      fail: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800',
      warning: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950/30 dark:text-yellow-300 dark:border-yellow-800',
      error: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800'
    };
    
    return (
      <Badge variant="outline" className={variants[status]}>
        {getStatusIcon(status)}
        <span className="ml-1">{text}</span>
      </Badge>
    );
  };

  return (
    <div className="p-6 pt-0 space-y-6">
      <AdminSectionHeader 
        title="API Contract Testing" 
        description="Test production endpoints (admin + user-facing) to verify proper response structure and data integrity"
        icon={<Globe className="h-5 w-5" />}
      />

      {/* Control Panel */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <Play className="h-5 w-5" />
            Test Controls
          </CardTitle>
          <CardDescription>
            Run smoke tests against production API endpoints
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button 
              onClick={runApiContractTests} 
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              <Globe className="h-4 w-4" />
              {isRunning ? 'Testing...' : 'Run API Tests'}
            </Button>
            
            {lastRunTime && (
              <>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Timer className="h-4 w-4" />
                  Last run: {lastRunTime.toLocaleString()}
                </div>
                
                {apiTestResults && (
                  <Button 
                    onClick={downloadReport}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download Report
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* API Contract Test Results */}
      {apiTestResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              API Contract Test Results
              {apiTestResults.every(t => t.status === 'pass') ? 
                getStatusBadge('pass', 'ALL PASS') : 
                getStatusBadge('fail', 'SOME FAILED')
              }
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{apiTestResults.length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Endpoints</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {apiTestResults.filter(t => t.status === 'pass').length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Passed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {apiTestResults.filter(t => t.status === 'fail').length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {apiTestResults.filter(t => t.status === 'error').length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Errors</div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="font-semibold">Endpoint Test Results</h4>
              {apiTestResults.map((test, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(test.status)}
                    <span className="font-medium">{test.endpoint}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    {test.responseTime && <span>{test.responseTime}ms</span>}
                    {test.error && <span className="text-red-600">{test.error}</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>About API Contract Testing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This tool runs smoke tests against 8 key production API endpoints to verify they're responding correctly:
            </p>
            
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-semibold mb-1 text-blue-700 dark:text-blue-300">👤 User-Facing Endpoints (Critical)</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400 ml-4">
                  <li><strong>Health Check</strong> - Verifies server is running</li>
                  <li><strong>Exam Templates</strong> - Can users see available exams?</li>
                  <li><strong>Auth Check</strong> - Authentication and permissions working?</li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold mb-1 text-purple-700 dark:text-purple-300">🛠️ Admin Management Endpoints</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400 ml-4">
                  <li><strong>Questions API</strong> - Question data retrieval</li>
                  <li><strong>Templates API</strong> - Template management</li>
                  <li><strong>Results API</strong> - Exam results queries</li>
                  <li><strong>Comments API</strong> - Comment CRUD operations</li>
                  <li><strong>Categories API</strong> - Category management</li>
                </ul>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 pt-2">
              ✅ <strong>Green = All endpoints responding properly</strong><br />
              🔴 <strong>Red = Some endpoints failing or returning errors</strong>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              💡 <strong>Tip:</strong> Run this after deployments or when investigating production issues. User-facing endpoints are tested first to catch issues that would affect exam takers.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};