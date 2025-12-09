import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useAdminApi } from '../../hooks/useAdminApi';

interface TestResult {
  endpoint: string;
  method: string;
  success: boolean;
  status?: number;
  data?: any;
  error?: string;
  timestamp: string;
}

interface ServerDebuggerProps {
  accessToken?: string;
}

export function ServerDebugger({ accessToken }: ServerDebuggerProps) {
  const [results, setResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState<string | null>(null);
  const { makeRequest } = useAdminApi(accessToken);

  const addResult = (result: Omit<TestResult, 'timestamp'>) => {
    setResults(prev => [{
      ...result,
      timestamp: new Date().toLocaleTimeString()
    }, ...prev]);
  };

  const testEndpoint = async (endpoint: string, method: 'GET' | 'POST' = 'GET', body?: any) => {
    setTesting(endpoint);
    
    try {
      console.log(`🧪 Testing ${method} ${endpoint}`);
      
      const options: any = { method };
      if (body) {
        options.body = JSON.stringify(body);
      }
      
      const response = await makeRequest(endpoint, options);
      
      addResult({
        endpoint,
        method,
        success: true,
        data: response,
        status: 200
      });
      
      console.log(`✅ ${endpoint} success:`, response);
    } catch (error) {
      console.error(`❌ ${endpoint} failed:`, error);
      
      addResult({
        endpoint,
        method,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setTesting(null);
    }
  };

  const tests = [
    {
      name: 'Health Check',
      endpoint: '/health',
      method: 'GET' as const
    }
  ];

  const clearResults = () => setResults([]);

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle>Server Endpoint Debugger</CardTitle>
        <p className="text-sm text-muted-foreground">
          Test various server endpoints to debug the routing and authentication issues
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Test Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {tests.map(({ name, endpoint, method }) => (
              <Button
                key={endpoint}
                onClick={() => testEndpoint(endpoint, method)}
                disabled={testing !== null}
                variant="outline"
                className="h-auto p-4 flex flex-col items-start text-left"
              >
                <div className="font-medium">{name}</div>
                <div className="text-xs text-muted-foreground">{method} {endpoint}</div>
                {testing === endpoint && (
                  <div className="text-xs text-blue-600 mt-1">Testing...</div>
                )}
              </Button>
            ))}
          </div>

          {/* Clear Results */}
          {results.length > 0 && (
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Test Results ({results.length})</h3>
              <Button onClick={clearResults} variant="outline" size="sm">
                Clear Results
              </Button>
            </div>
          )}

          {/* Results */}
          <div className="space-y-4">
            {results.map((result, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={result.success ? 'default' : 'destructive'}>
                      {result.method}
                    </Badge>
                    <span className="font-medium">{result.endpoint}</span>
                    <Badge variant={result.success ? 'default' : 'destructive'}>
                      {result.success ? 'SUCCESS' : 'FAILED'}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {result.timestamp}
                  </span>
                </div>

                {result.status && (
                  <div className="text-sm text-muted-foreground mb-2">
                    Status: {result.status}
                  </div>
                )}

                {result.data && (
                  <div className="bg-muted p-3 rounded text-xs overflow-auto max-h-40">
                    <pre>{JSON.stringify(result.data, null, 2)}</pre>
                  </div>
                )}

                {result.error && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    Error: {result.error}
                  </div>
                )}
              </div>
            ))}
          </div>

          {results.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              Click a test button above to start debugging
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}