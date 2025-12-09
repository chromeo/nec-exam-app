import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

export function KvDebugger() {
  const [debugData, setDebugData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const inspectKvStore = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a9be5165/debug/kv-inspect`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = await response.json();
      console.log('🔍 KV Debug Result:', result);
      setDebugData(result);
    } catch (error) {
      console.error('Error inspecting KV store:', error);
      setDebugData({ success: false, error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>KV Store Inspector</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={inspectKvStore} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Inspecting...' : 'Inspect KV Store'}
        </Button>

        {debugData && (
          <div className="space-y-4">
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Debug Results:</h3>
              
              {debugData.success ? (
                <div className="space-y-2 text-sm">
                  <p><strong>Total Exam Results:</strong> {debugData.data.totalExamResults}</p>
                  <p><strong>Total Exam Sessions:</strong> {debugData.data.totalExamSessions}</p>
                  
                  <div>
                    <strong>KV Key Patterns:</strong>
                    <pre className="mt-1 text-xs bg-white dark:bg-gray-900 p-2 rounded">
                      {JSON.stringify(debugData.data.keyPatterns, null, 2)}
                    </pre>
                  </div>
                  
                  <div>
                    <strong>Results with Comments:</strong> {debugData.data.resultsWithComments.length}
                    {debugData.data.resultsWithComments.length > 0 && (
                      <pre className="mt-1 text-xs bg-white dark:bg-gray-900 p-2 rounded max-h-40 overflow-y-auto">
                        {JSON.stringify(debugData.data.resultsWithComments, null, 2)}
                      </pre>
                    )}
                  </div>
                  
                  <div>
                    <strong>Sample Exam Result Structure:</strong>
                    <pre className="mt-1 text-xs bg-white dark:bg-gray-900 p-2 rounded">
                      {JSON.stringify(debugData.data.sampleExamResult, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <p className="text-red-600">Error: {debugData.error}</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}