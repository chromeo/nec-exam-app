import { useEffect, useRef, useCallback } from 'react';
import { getTimeUntilExpiry, isTokenExpiringSoon, decodeJWT } from '../utils/tokenUtils';

interface UseAutoTokenRefreshOptions {
  accessToken: string | null;
  onTokenRefreshed: (newToken: string) => void;
  onRefreshFailed: () => void;
  refreshThresholdMs?: number; // How soon before expiry to refresh (default: 10 minutes)
  checkIntervalMs?: number; // How often to check (default: 1 minute)
  inactivityTimeoutMs?: number; // Max inactivity before stopping refresh (default: 3 hours)
  enabled?: boolean;
}

/**
 * Automatically refreshes the access token before it expires - BUT ONLY IF USER IS ACTIVE
 * 
 * This hook monitors the token expiry time and user activity. It only refreshes the token
 * if the user has been active within the inactivity timeout period. This prevents
 * abandoned sessions from staying logged in forever.
 * 
 * Activity is defined as: mousedown, keydown, scroll, or touchstart events
 * 
 * @example
 * ```tsx
 * // Regular user: 3 hour inactivity timeout
 * useAutoTokenRefresh({
 *   accessToken,
 *   onTokenRefreshed: (newToken) => login(newToken),
 *   onRefreshFailed: () => logout(),
 *   inactivityTimeoutMs: 3 * 60 * 60 * 1000, // 3 hours
 * });
 * 
 * // Admin user: 48 hour inactivity timeout
 * useAutoTokenRefresh({
 *   accessToken,
 *   onTokenRefreshed: (newToken) => login(newToken),
 *   onRefreshFailed: () => logout(),
 *   inactivityTimeoutMs: 48 * 60 * 60 * 1000, // 48 hours
 * });
 * ```
 */
export const useAutoTokenRefresh = ({
  accessToken,
  onTokenRefreshed,
  onRefreshFailed,
  refreshThresholdMs = 10 * 60 * 1000, // Default: 10 minutes before expiry
  checkIntervalMs = 60 * 1000, // Default: Check every 1 minute
  inactivityTimeoutMs = 3 * 60 * 60 * 1000, // Default: 3 hours of inactivity
  enabled = true,
}: UseAutoTokenRefreshOptions) => {
  const refreshInProgressRef = useRef(false);
  const lastActivityRef = useRef(Date.now());
  const hasRefreshedRef = useRef(false);

  // Track user activity
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    // Track various user interactions
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, []);

  const refreshToken = useCallback(async () => {
    if (!accessToken || refreshInProgressRef.current) {
      return;
    }

    refreshInProgressRef.current = true;

    try {
      console.log('🔄 Auto Token Refresh: Attempting to refresh token...');

      // Use singleton Supabase client to avoid multiple instances
      const { supabase } = await import('../utils/supabase/client');

      // Get a fresh session using the refresh token
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        console.info('ℹ️ Auto Token Refresh: Could not refresh session (session may have expired):', error.message);
        onRefreshFailed();
        return;
      }

      if (data?.session?.access_token) {
        const newToken = data.session.access_token;
        
        // Decode new token to log its expiry time
        const payload = decodeJWT(newToken);
        if (payload) {
          const expiryDate = new Date(payload.exp * 1000);
          console.log('✅ Auto Token Refresh: Token refreshed successfully');
          console.log('   New token expires at:', expiryDate.toLocaleString());
          console.log('   Time until expiry:', Math.round((payload.exp * 1000 - Date.now()) / 60000), 'minutes');
        }

        // Mark that we've refreshed to prevent multiple refreshes
        hasRefreshedRef.current = true;

        // Call the callback to update the token in AuthContext
        onTokenRefreshed(newToken);
      } else {
        console.warn('⚠️ Auto Token Refresh: No access token in response');
        onRefreshFailed();
      }
    } catch (error) {
      console.warn('⚠️ Auto Token Refresh: Exception during refresh:', error);
      onRefreshFailed();
    } finally {
      refreshInProgressRef.current = false;
    }
  }, [accessToken, onTokenRefreshed, onRefreshFailed]);

  // Main monitoring effect
  useEffect(() => {
    if (!enabled || !accessToken) {
      return;
    }

    // Reset the "has refreshed" flag when we get a new token
    hasRefreshedRef.current = false;

    const checkAndRefresh = () => {
      if (!accessToken || refreshInProgressRef.current || hasRefreshedRef.current) {
        return;
      }

      const timeUntilExpiry = getTimeUntilExpiry(accessToken);

      if (timeUntilExpiry === null) {
        console.warn('⚠️ Auto Token Refresh: Invalid token format');
        return;
      }

      if (timeUntilExpiry <= 0) {
        console.warn('⚠️ Auto Token Refresh: Token already expired');
        onRefreshFailed();
        return;
      }

      // Check if user has been inactive for too long
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      const inactiveMinutes = Math.round(timeSinceLastActivity / 60000);
      
      if (timeSinceLastActivity > inactivityTimeoutMs) {
        console.warn(
          `⏰ Auto Token Refresh: User inactive for ${inactiveMinutes} minutes - NOT refreshing token. ` +
          `Session will expire naturally.`
        );
        // Don't refresh - let the token expire and trigger session expired dialog
        return;
      }

      // Check if token is expiring soon AND user is active
      if (timeUntilExpiry <= refreshThresholdMs) {
        const minutesUntilExpiry = Math.round(timeUntilExpiry / 60000);
        console.log(
          `⏰ Auto Token Refresh: Token expires in ${minutesUntilExpiry} minutes. ` +
          `User was active ${inactiveMinutes} minutes ago - refreshing now`
        );
        refreshToken();
      }
    };

    // Check immediately on mount
    checkAndRefresh();

    // Set up interval to check periodically
    const interval = setInterval(checkAndRefresh, checkIntervalMs);

    return () => {
      clearInterval(interval);
    };
  }, [accessToken, enabled, refreshThresholdMs, checkIntervalMs, refreshToken, onRefreshFailed]);

  return {
    refreshToken, // Expose manual refresh if needed
  };
};
