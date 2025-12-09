import { useState, useEffect, useCallback } from 'react';
import { ApiService } from '../services/apiService';

interface UseAuthReturn {
  accessToken: string | null;
  isAuthenticated: boolean;
  userProfile: any;
  isCheckingSession: boolean;
  isAdmin: boolean;
  showResetPassword: boolean;
  setShowResetPassword: (show: boolean) => void;
  handleLoginSuccess: (token: string, profile?: any) => Promise<void>;
  handleLogout: () => Promise<void>;
  // Backward compatibility aliases
  user: { accessToken: string | null; userProfile: any; isAdmin: boolean } | null;
  loading: boolean;
}

export const useAuth = (): UseAuthReturn => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);

  const handleLoginSuccess = async (token: string, profile?: any) => {
    setAccessToken(token);
    setIsAuthenticated(true);
    
    if (profile) {
      setUserProfile(profile);
    }
    
    // Check admin status after successful login
    try {
      const adminResult = await ApiService.checkAdmin(token);
      
      if (adminResult.success && adminResult.data) {
        // Set the user profile from the API response
        setUserProfile(adminResult.data.user_profile);
        
        // Set admin status
        if (adminResult.data.is_admin) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  // BRUTE FORCE LOGOUT - If state is broken, force a complete reset
  const handleLogout = async () => {
    console.log('🚪 NUCLEAR LOGOUT INITIATED - Forcing complete app reset');
    
    try {
      // Try server logout with whatever token we might have
      const result = await ApiService.logout(accessToken);
      console.log('📡 Server logout result:', result);
    } catch (error) {
      console.warn('⚠️ Server logout failed, proceeding with nuclear reset:', error);
    }

    // NUCLEAR OPTION: Clear everything and reload
    console.log('💣 NUCLEAR LOGOUT: Clearing all storage and reloading...');
    
    try {
      // Clear ALL localStorage
      localStorage.clear();
      console.log('🗑️ Cleared ALL localStorage');
      
      // Clear ALL sessionStorage
      sessionStorage.clear();
      console.log('🗑️ Cleared ALL sessionStorage');
    } catch (error) {
      console.warn('Failed to clear storage:', error);
    }
    
    // Force page reload to completely reset React state
    console.log('🔄 FORCING PAGE RELOAD...');
    window.location.reload();
  };

  // Check for password reset flow on component mount
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const type = hashParams.get('type');
    
    if (type === 'recovery') {
      setShowResetPassword(true);
    }
  }, []);

  // Check for existing session on app load
  useEffect(() => {
    const checkSession = async () => {
      try {
        // console.log('Checking for existing session...');
        const result = await ApiService.checkSession();
        // console.log('Session check result:', result);
        
        if (result.success && result.data.access_token) {
          // console.log('Found existing session, logging in...');
          setAccessToken(result.data.access_token);
          setIsAuthenticated(true);
          setUserProfile(result.data.user_profile);
          
          // Check admin status for existing session
          try {
            const adminResult = await ApiService.checkAdmin(result.data.access_token);
            if (adminResult.success && adminResult.data.is_admin) {
              setIsAdmin(true);
            } else {
              setIsAdmin(false);
            }
          } catch (error) {
            console.error('Error checking admin status for existing session:', error);
            setIsAdmin(false);
          }
        } else {
          // console.log('No existing session found');
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkSession();
  }, []);

  return {
    accessToken,
    isAuthenticated,
    userProfile,
    isCheckingSession,
    isAdmin,
    showResetPassword,
    setShowResetPassword,
    handleLoginSuccess,
    handleLogout,
    // Backward compatibility aliases
    user: isAuthenticated && accessToken ? { accessToken, userProfile, isAdmin } : null,
    loading: isCheckingSession,
    // Include forceUpdate to ensure re-renders happen
    _forceUpdate: forceUpdate,
  };
};