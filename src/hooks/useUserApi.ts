import { useState } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import type { ApiResponse } from '../supabase/functions/server/types';

/**
 * User API Hook
 * 
 * For user-scoped operations (non-admin endpoints under /user/* path)
 * Uses access token for authentication but does NOT require admin privileges
 */
export const useUserApi = (accessToken?: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a9be5165`;

  const makeRequest = async <T = any>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!accessToken) {
        throw new Error('Authentication required');
      }

      const fullUrl = `${serverUrl}${endpoint}`;
      const response = await fetch(fullUrl, {
        ...options,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const responseText = await response.text();

      if (!response.ok) {
        console.error('❌ HTTP Error Response:', responseText);
        throw new Error(`HTTP status ${response.status}: ${response.statusText}`);
      }
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('🚨 Parse error:', parseError);
        console.error('📝 Raw text that failed to parse:', responseText);
        throw new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
      }
      
      setIsLoading(false);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      console.error('💥 useUserApi makeRequest error:', errorMessage);
      setError(errorMessage);
      setIsLoading(false);
      return { success: false, error: errorMessage };
    }
  };

  // Profile API (user statistics and settings)
  const profileApi = {
    getStats: () => makeRequest('/user/profile/stats'),
    updateSettings: (settings: { name?: string; email?: string }) => 
      makeRequest('/user/profile/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      }),
  };

  return {
    isLoading,
    error,
    makeRequest,
    profileApi,
  };
};
