import { useState, useEffect, useCallback, useRef } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface SessionMonitorOptions {
  accessToken: string | null;
  onSessionExpired: () => void;
  checkInterval?: number; // in milliseconds, default 5 minutes
  enableMonitoring?: boolean;
}

interface SessionStatus {
  isValid: boolean;
  isExpired: boolean;
  lastChecked: number | null;
  error?: string;
}

/**
 * Hook to monitor session health and detect expiration
 * Periodically pings the server to check if the session is still valid
 */
export const useSessionMonitor = ({
  accessToken,
  onSessionExpired,
  checkInterval = 5 * 60 * 1000, // 5 minutes default
  enableMonitoring = true,
}: SessionMonitorOptions) => {
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>({
    isValid: true,
    isExpired: false,
    lastChecked: null,
  });

  const hasShownExpiredToast = useRef(false);
  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a9be5165`;

  /**
   * Check if the current session is still valid
   */
  const checkSessionHealth = useCallback(async (): Promise<boolean> => {
    if (!accessToken) {
      return false;
    }

    try {
      const response = await fetch(`${serverUrl}/auth/session-health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const isValid = response.ok;
      const now = Date.now();

      setSessionStatus({
        isValid,
        isExpired: !isValid,
        lastChecked: now,
      });

      // If session is invalid, trigger expiration callback
      if (!isValid && !hasShownExpiredToast.current) {
        hasShownExpiredToast.current = true;
        console.info('ℹ️ Session has expired (status:', response.status, ') - redirecting to login');
        onSessionExpired();
      }

      return isValid;
    } catch (error) {
      // Network errors during health checks are expected (offline, server unreachable, etc.)
      // Don't log as error since it's handled gracefully
      setSessionStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: Date.now(),
      }));
      return true; // Don't trigger expiration on network errors
    }
  }, [accessToken, serverUrl, onSessionExpired]);

  /**
   * Set up periodic session health checks
   */
  useEffect(() => {
    if (!enableMonitoring || !accessToken) {
      return;
    }

    // Initial check
    checkSessionHealth();

    // Set up interval for periodic checks
    const intervalId = setInterval(() => {
      checkSessionHealth();
    }, checkInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [accessToken, checkInterval, enableMonitoring, checkSessionHealth]);

  /**
   * Reset the expired toast flag when token changes
   */
  useEffect(() => {
    hasShownExpiredToast.current = false;
  }, [accessToken]);

  return {
    sessionStatus,
    checkSessionHealth,
  };
};

/**
 * Global API error interceptor to detect 401 errors
 * This intercepts fetch calls and detects session expiration
 * 
 * IMPORTANT: Not all 401s mean session expired!
 * - 401 on /docs = admin authorization issue (not session expiration)
 * - 401 on /auth/* = session expired (real expiration)
 * - 401 on /admin/* = could be either
 */
export const setupGlobalSessionMonitoring = (onSessionExpired: () => void) => {
  const originalFetch = window.fetch;
  let hasShownExpiredAlert = false;

  window.fetch = async (...args) => {
    try {
      const response = await originalFetch(...args);

      // Check for 401 Unauthorized
      if (response.status === 401 && !hasShownExpiredAlert) {
        const url = typeof args[0] === 'string' ? args[0] : args[0].url;
        
        // 🔍 Check if this is a diagnostic/testing request
        const isDiagnostic = url.includes('/health') || 
                           (args[1]?.headers as any)?._diagnostic === 'true';
        
        // 🔍 Check if this is likely a session expiration vs authorization issue
        const isSessionEndpoint = url.includes('/auth/') || 
                                 url.includes('/session');
        const isDocsEndpoint = url.includes('/docs');
        
        // Only treat as session expiration if:
        // 1. It's a session/auth endpoint (definitely session expired)
        // 2. It's NOT the docs endpoint (that's an admin auth issue)
        // 3. It's NOT a diagnostic request
        const isLikelySessionExpired = isSessionEndpoint && !isDocsEndpoint && !isDiagnostic;
        
        if (isLikelySessionExpired) {
          hasShownExpiredAlert = true;
          
          console.info('ℹ️ Session has expired - redirecting to login');
          
          // Show info toast notification (removed - auto-redirect is cleaner)
          // User will see the alert banner on login page instead
          
          // Trigger expiration callback immediately
          onSessionExpired();
        } else {
          // This is a different kind of 401 - log it but don't logout
          console.warn('⚠️ 401 Unauthorized on:', url, '(NOT treating as session expiration)');
        }
      }

      // Reset the flag on successful auth
      if (response.ok && hasShownExpiredAlert) {
        hasShownExpiredAlert = false;
      }

      return response;
    } catch (error) {
      throw error;
    }
  };

  // Return cleanup function
  return () => {
    window.fetch = originalFetch;
  };
};