import { createClient } from 'npm:@supabase/supabase-js';
import * as kv from './kv_store.ts';
import { Keys } from './keys.ts';
import type { AuthResult } from './types.ts';

// ============================================================================
// SHARED SUPABASE CLIENTS - Export for use in all route files
// ============================================================================

const publicAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

/**
 * Supabase client with ANON_KEY
 * ✅ Use for: User authentication, token validation
 * Exported for use in route files
 */
export const supabaseForAuth = createClient(supabaseUrl, publicAnonKey);

/**
 * Supabase client with SERVICE_ROLE_KEY
 * ✅ Use for: Admin operations, bypassing RLS policies, Supabase Storage
 * Exported for use in route files
 */
export const supabase = createClient(supabaseUrl, serviceRoleKey);

// ============================================================================
// AUTHENTICATION VALIDATION FUNCTIONS
// ============================================================================

export const requireAdmin = async (accessToken: string | undefined): Promise<AuthResult> => {
  if (!accessToken || accessToken === publicAnonKey) {
    return {
      isAdmin: false,
      error: 'Authentication required',
      status: 401
    };
  }

  // ✅ Use ANON_KEY client for token validation (correct for user tokens)
  const { data: { user }, error } = await supabaseForAuth.auth.getUser(accessToken);
  if (!user || error) {
    console.error('❌ Token validation failed:', error?.message || 'Unknown error');
    return {
      isAdmin: false,
      error: 'Invalid or expired token',
      status: 401
    };
  }

  const userProfile = await kv.get(Keys.userProfile(user.id));
  
  // Enhanced Admin Check with Multiple Fallbacks
  let isAdmin = false;
  let profileData: any = null;

  // Method 1: Check existing user profile
  if (userProfile) {
    profileData = typeof userProfile === 'string' ? JSON.parse(userProfile) : userProfile;
    isAdmin = profileData.is_admin || false;
  }

  // Method 3: Check Supabase user metadata
  if (!isAdmin && (user.user_metadata?.is_admin || user.app_metadata?.is_admin)) {
    isAdmin = true;
    profileData = {
      email: user.email,
      name: user.user_metadata?.name || user.email,
      is_admin: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await kv.set(Keys.userProfile(user.id), profileData);
  }

  // Method 4: Check admin email list (add your emails here)
  if (!isAdmin) {
    const adminEmails = [
      'garyd@mastercraftinc.com',
      'garydarling@gmail.com'
      // Add your email here to get admin access
    ];
    
    if (user.email && adminEmails.includes(user.email.toLowerCase())) {
      isAdmin = true;
      profileData = {
        email: user.email,
        name: user.user_metadata?.name || user.email,
        is_admin: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      await kv.set(Keys.userProfile(user.id), profileData);
    }
  }

  if (!isAdmin) {
    return {
      isAdmin: false,
      error: 'Admin access required',
      status: 403
    };
  }

  return {
    isAdmin: true,
    user: profileData || {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email,
      is_admin: true
    },
    status: 200
  };
};

/**
 * Validates any authenticated user access (not requiring admin)
 * 
 * @param accessToken - JWT access token from Authorization header
 * @returns AuthResult with user data or error
 * 
 * @example
 * ```typescript
 * const authResult = await requireUser(accessToken);
 * if (authResult.error) {
 *   return c.json({ error: authResult.error }, authResult.status);
 * }
 * // Use authResult.userId and authResult.user
 * ```
 */
export const requireUser = async (accessToken: string | undefined): Promise<AuthResult> => {
  if (!accessToken || accessToken === publicAnonKey) {
    return {
      isAdmin: false,
      error: 'Authentication required',
      status: 401
    };
  }

  const { data: { user }, error } = await supabaseForAuth.auth.getUser(accessToken);
  if (!user || error) {
    console.error('❌ Token validation failed:', error?.message || 'Unknown error');
    return {
      isAdmin: false,
      error: 'Invalid or expired token',
      status: 401
    };
  }

  // Check if user profile exists, get admin status
  const userProfile = await kv.get(Keys.userProfile(user.id));
  let isAdmin = false;
  
  if (userProfile) {
    const profileData = typeof userProfile === 'string' ? JSON.parse(userProfile) : userProfile;
    isAdmin = profileData.is_admin || false;
  }

  return {
    isAdmin,
    user: {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email,
      is_admin: isAdmin
    },
    status: 200
  };
};