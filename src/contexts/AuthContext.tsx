import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ApiService } from '../services/apiService';
// Session monitoring removed for simplicity

interface AuthContextType {
  isLoggedIn: boolean;
  user: any;
  accessToken: string | null;
  isAdmin: boolean;
  loading: boolean;
  sessionTimedOut: boolean;
  login: (token: string, userProfile?: any, rememberMe?: boolean) => Promise<void>;
  logout: (skipServerCall?: boolean) => Promise<void>;
  logoutDueToTimeout: () => Promise<void>;
  refreshToken: (newToken: string) => void;
  clearSessionTimeoutFlag: () => void;
  // Simple auth interface
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionTimedOut, setSessionTimedOut] = useState(false);

  // Computed user object for backward compatibility
  const user = isLoggedIn && accessToken ? { accessToken, userProfile, isAdmin } : null;

  // Simple session management without complex monitoring

  const login = async (token: string, profile?: any, rememberMe: boolean = false) => {
    // console.log('🔐 AuthContext: Starting login process...');
    
    setAccessToken(token);
    setIsLoggedIn(true);
    
    if (profile) {
      setUserProfile(profile);
    }
    
    // Check admin status
    try {
      const adminResult = await ApiService.checkAdmin(token);
      
      if (adminResult.success && adminResult.data) {
        setUserProfile(adminResult.data.user_profile);
        setIsAdmin(adminResult.data.is_admin || false);
        
        // Store session persistently based on "Stay logged in" preference
        const authData = {
          accessToken: token,
          userProfile: adminResult.data.user_profile,
          isAdmin: adminResult.data.is_admin || false,
          timestamp: Date.now()
        };
        
        if (rememberMe) {
          // Persist across browser sessions
          localStorage.setItem('exam_auth', JSON.stringify(authData));
          console.info('ℹ️ Session stored in localStorage (persistent)');
        } else {
          // Clear when browser/tab closes
          sessionStorage.setItem('exam_auth', JSON.stringify(authData));
          console.info('ℹ️ Session stored in sessionStorage (temporary)');
        }
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
    
    // console.log('✅ AuthContext: Login completed');
  };

  const logout = async (skipServerCall: boolean = false) => {
    if (!skipServerCall && accessToken) {
      try {
        await ApiService.logout(accessToken);
      } catch (error) {
        // Silent failure - session might already be expired
      }
    }
    try {
      // Clear auth data from both storage types
      localStorage.removeItem('exam_auth');
      sessionStorage.removeItem('exam_auth');
      console.info('ℹ️ Session cleared from storage');
    } catch (error) {
      console.warn('Failed to clear storage:', error);
    }
    setIsLoggedIn(false);
    setAccessToken(null);
    setUserProfile(null);
    setIsAdmin(false);
    setSessionTimedOut(false);
  };

  const logoutDueToTimeout = async () => {
    setSessionTimedOut(true);
    await logout(true);
  };

  const clearSessionTimeoutFlag = () => {
    setSessionTimedOut(false);
  };

  // Silent token refresh for automatic token renewal
  const refreshTokenSilent = (newToken: string) => {
    setAccessToken(newToken);
    
    // Update stored session with new token
    try {
      // Check which storage type was used
      let storedAuth = localStorage.getItem('exam_auth');
      const isLocalStorage = !!storedAuth;
      
      if (!storedAuth) {
        storedAuth = sessionStorage.getItem('exam_auth');
      }
      
      if (storedAuth) {
        const authData = JSON.parse(storedAuth);
        authData.accessToken = newToken;
        authData.timestamp = Date.now();
        
        // Update in the same storage location
        if (isLocalStorage) {
          localStorage.setItem('exam_auth', JSON.stringify(authData));
        } else {
          sessionStorage.setItem('exam_auth', JSON.stringify(authData));
        }
      }
    } catch (error) {
      console.warn('Failed to update stored token:', error);
    }
    
    // Don't update user profile or admin status - just refresh the token
  };

  const refreshToken = (newToken: string) => {
    // console.log('🔄 AuthContext: Refreshing access token...');
    setAccessToken(newToken);
    // Keep other state (user profile, admin status) unchanged
  };

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        // console.log('🔍 AuthContext: Checking for existing session...');
        
        // First check localStorage (persistent "Stay logged in")
        let storedAuth = localStorage.getItem('exam_auth');
        let isPersistent = true;
        
        // If not in localStorage, check sessionStorage (temporary)
        if (!storedAuth) {
          storedAuth = sessionStorage.getItem('exam_auth');
          isPersistent = false;
        }
        
        if (storedAuth) {
          try {
            const authData = JSON.parse(storedAuth);
            const storageType = isPersistent ? 'localStorage' : 'sessionStorage';
            console.info(`ℹ️ Found stored session in ${storageType}`);
            
            // Restore the session
            setAccessToken(authData.accessToken);
            setUserProfile(authData.userProfile);
            setIsAdmin(authData.isAdmin || false);
            setIsLoggedIn(true);
            
            // Verify the session is still valid with the server
            const result = await ApiService.checkSession();
            if (!result.success || !result.data.access_token) {
              console.info('ℹ️ Stored session is no longer valid');
              await logout(true);
            }
          } catch (error) {
            console.error('Error parsing stored session:', error);
            await logout(true);
          }
        } else {
          // No stored session, try server-side session check (Supabase cookie)
          const result = await ApiService.checkSession();
          
          if (result.success && result.data.access_token) {
            // console.log('✅ AuthContext: Found existing session');
            await login(result.data.access_token, result.data.user_profile, false);
          } else {
            // console.log('ℹ️ AuthContext: No existing session found');
          }
        }
      } catch (error) {
        console.error('❌ AuthContext: Error checking session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  return (
    <AuthContext.Provider value={{
      isLoggedIn,
      user,
      accessToken,
      isAdmin,
      loading,
      sessionTimedOut,
      login,
      logout,
      logoutDueToTimeout,
      refreshToken: refreshTokenSilent,
      clearSessionTimeoutFlag,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};