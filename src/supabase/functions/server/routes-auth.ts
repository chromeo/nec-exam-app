import { Hono } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js';
import * as kv from './kv_store.ts';
import { Keys } from './keys.ts';

const auth = new Hono();

// ============================================================================
// SHARED SUPABASE CLIENTS - Export for use in other route files
// ============================================================================

/**
 * Supabase client with SERVICE_ROLE_KEY
 * Use for admin operations (bypasses RLS policies)
 * Exported for use in other route files
 */
export const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

/**
 * Supabase client with ANON_KEY
 * Use for user authentication and public operations
 * Exported for use in other route files
 */
export const supabaseForAuth = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!
);

const publicAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

// ============================================================================
// SIGNUP ENDPOINT
// ============================================================================

auth.options('/auth/signup', (c) => {
  return c.text('', 200);
});

auth.post('/auth/signup', async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true
    });
    
    if (error) {
      console.error('Signup error:', error);
      return c.json({ success: false, error: error.message }, 400);
    }
    
    // ✅ SECURE: No one gets admin by default
    // Admin status is determined by email whitelist (see requireAdmin function)
    const userProfile = {
      id: data.user.id,
      email: data.user.email,
      name,
      is_admin: false,  // ✅ Default to false
      credits: 0,
      created_at: new Date().toISOString()
    };
    
    await kv.set(Keys.userProfile(data.user.id), userProfile);
    
    console.log(`✅ New user registered: ${data.user.email}`);
    
    return c.json({
      success: true,
      data: {
        user: data.user
        // ✅ Remove is_first_user flag
      }
    });
  } catch (error) {
    console.error('❌ Signup error:', error);
    return c.json({
      success: false,
      error: 'Failed to create account'
    }, 500);
  }
});

// ============================================================================
// LOGIN ENDPOINT - CRITICAL FOR AUTHENTICATION
// ============================================================================

auth.options('/auth/login', (c) => {
  return c.text('', 200);
});

auth.post('/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('Login error:', error);
      return c.json({
        success: false,
        error: error.message
      }, 400);
    }
    return c.json({
      success: true,
      session: data.session
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    return c.json({
      success: false,
      error: 'Internal server error'
    }, 500);
  }
});

// ============================================================================
// PASSWORD RESET ENDPOINT
// ============================================================================

auth.options('/auth/request-password-reset', (c) => {
  return c.text('', 200);
});

auth.post('/auth/request-password-reset', async (c) => {
  try {
    const { email } = await c.req.json();
    
    // Note: In a production environment, you would integrate with an email service
    // For now, we'll simulate the password reset process
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    
    if (error) {
      console.error('Password reset error:', error);
      return c.json({
        success: false,
        error: error.message
      }, 400);
    }
    return c.json({
      success: true,
      message: 'If an account with that email exists, we have sent a password reset link.'
    });
  } catch (error) {
    console.error('❌ Password reset error:', error);
    return c.json({
      success: false,
      error: 'Internal server error'
    }, 500);
  }
});

// ============================================================================
// CHECK SESSION ENDPOINT
// ============================================================================

auth.get('/auth/check-session', async (c) => {
  try {
    // Get the access token from the Authorization header
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    // If no token, return no session
    if (!accessToken || accessToken === publicAnonKey) {
      return c.json({
        success: false,
        message: 'No active session'
      });
    }

    // Validate the token with Supabase
    const { data: { user }, error } = await supabaseForAuth.auth.getUser(accessToken);
    
    if (error || !user) {
      return c.json({
        success: false,
        message: 'Invalid or expired session'
      });
    }

    // Get user profile
    const userProfileKey = Keys.userProfile(user.id);
    const userProfile = await kv.get(userProfileKey);
    
    let profileData: any = null;
    if (userProfile) {
      profileData = typeof userProfile === 'string' ? JSON.parse(userProfile) : userProfile;
    }

    // Return session info
    return c.json({
      success: true,
      data: {
        access_token: accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: profileData?.name || user.user_metadata?.name || user.email
        },
        is_admin: profileData?.is_admin || false
      }
    });
  } catch (error) {
    console.error('Error checking session:', error);
    return c.json({
      success: false,
      error: 'Failed to check session'
    }, 500);
  }
});

// ============================================================================
// SESSION HEALTH ENDPOINT
// ============================================================================

auth.get('/auth/session-health', async (c) => {
  try {
    // Get the access token from the Authorization header
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ 
        success: false, 
        error: 'No access token provided' 
      }, 401);
    }

    // Verify the user exists and token is valid using Supabase
    const { data: { user }, error } = await supabaseForAuth.auth.getUser(accessToken);
    
    if (error || !user) {
      return c.json({ 
        success: false, 
        error: 'Invalid or expired session' 
      }, 401);
    }

    // Session is valid
    return c.json({ 
      success: true, 
      message: 'Session is valid',
      user_id: user.id 
    }, 200);
    
  } catch (error) {
    console.error('❌ Error in session health check:', error);
    return c.json({ 
      success: false, 
      error: 'Internal server error during session check' 
    }, 500);
  }
});

// ============================================================================
// CHECK ADMIN ENDPOINT
// ============================================================================

auth.get('/auth/check-admin', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken || accessToken === publicAnonKey) {
      return c.json({
        success: false,
        error: 'Authentication required'
      }, 401);
    }
    const { data: { user }, error: authError } = await supabaseForAuth.auth.getUser(accessToken);
    if (!user || authError) {
      return c.json({
        success: false,
        error: 'Invalid authentication'
      }, 401);
    }
    const userProfile = await kv.get(Keys.userProfile(user.id));
    if (!userProfile) {
      return c.json({
        success: false,
        error: 'User profile not found'
      }, 404);
    }
    // Make sure userProfile is an object, not a string
    const profileData = typeof userProfile === 'string' ? JSON.parse(userProfile) : userProfile;
    return c.json({
      success: true,
      data: {
        is_admin: profileData.is_admin || false,
        user_profile: profileData // Return as object, not string
      }
    });
  } catch (error) {
    console.error('Error checking admin status:', error);
    return c.json({
      success: false,
      error: 'Failed to check admin status'
    }, 500);
  }
});

// ============================================================================
// LOGOUT ENDPOINT
// ============================================================================

auth.options('/auth/logout', (c) => {
  return c.text('', 200);
});

auth.post('/auth/logout', async (c) => {
  try {
    
    // Extract access token from Authorization header
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    // If no access token or it's the public anon key, still return success
    // because logout should always succeed from the user's perspective
    if (!accessToken || accessToken === publicAnonKey) {
      return c.json({
        success: true,
        message: 'Logout completed (no server session to invalidate)'
      });
    }

    // Use the service role client to sign out the user
    // This invalidates the access token on the server side
    const { error } = await supabase.auth.admin.signOut(accessToken);
    
    if (error) {
      console.error('❌ Server logout failed:', error);
      console.error('🔍 Error details:', {
        message: error.message,
        status: error.status,
        code: error.code
      });
      
      // Even if server logout fails, we should return success
      // because client-side cleanup is more important
      return c.json({
        success: true,
        message: 'Logout completed (server session invalidation failed but this is acceptable)',
        warning: error.message,
        debug: {
          serverError: error.message,
          errorCode: error.code
        }
      });
    }
    
    return c.json({
      success: true,
      message: 'Successfully logged out from server and client',
      debug: {
        sessionInvalidated: true
      }
    });

  } catch (error) {
    console.error('❌ Logout endpoint error:', error);
    console.error('🔍 Full error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Return success even on error because client-side cleanup is what matters most
    return c.json({
      success: true,
      message: 'Logout completed (server error occurred but this is acceptable)',
      warning: 'Server-side logout encountered an error',
      debug: {
        serverError: error.message,
        errorType: error.name
      }
    });
  }
});

// ============================================================================
// AUTH REDIRECT ENDPOINT
// ============================================================================
// Handles OAuth redirect - converts hash fragment to query params for Figma.site

auth.get('/auth-redirect', async (c) => {
  console.log('🔄 routes-auth.ts: Auth redirect handler invoked');
  console.log('   Purpose: Convert hash fragment → query params for Figma.site');
  console.log('   Incoming URL:', c.req.url);
  
  // Return HTML page that reads hash client-side and redirects
  const html = `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Redirecting...</title>
    <style>
      body {
        font-family: system-ui, -apple-system, sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        margin: 0;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      .container {
        text-align: center;
        padding: 2rem;
      }
      .spinner {
        border: 4px solid rgba(255,255,255,0.3);
        border-radius: 50%;
        border-top: 4px solid white;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin: 0 auto 1rem;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .debug {
        margin-top: 2rem;
        padding: 1rem;
        background: rgba(0,0,0,0.3);
        border-radius: 8px;
        font-size: 0.875rem;
        text-align: left;
        max-width: 600px;
        margin-left: auto;
        margin-right: auto;
        font-family: monospace;
      }
      .error {
        color: #ff6b6b;
        background: rgba(255,107,107,0.1);
        padding: 1rem;
        border-radius: 8px;
        margin-top: 1rem;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="spinner"></div>
      <h2>Redirecting to Password Reset...</h2>
      <p>Please wait while we set up your password reset.</p>
      <div class="debug" id="debug"></div>
    </div>

    <script>
      const debug = document.getElementById('debug');
      
      function log(message, isError = false) {
        console.log(message);
        const p = document.createElement('p');
        p.textContent = message;
        if (isError) p.className = 'error';
        debug.appendChild(p);
      }

      try {
        log('🔄 Auth redirect handler - Client-side processing');
        log('📍 Current URL: ' + window.location.href);
        
        // Read hash fragment (Supabase puts tokens here)
        const hash = window.location.hash;
        log('📋 Hash fragment: ' + (hash || '(empty)'));
        
        if (!hash || hash.length <= 1) {
          log('⚠️ No hash fragment found - tokens might be in query params already', true);
          
          // Check if tokens already in query params (shouldn't happen, but be safe)
          const search = window.location.search;
          if (search && search.includes('access_token')) {
            log('✅ Tokens found in query params, redirecting directly...');
            const redirectUrl = 'https://electrician-exam-5640.figma.site/' + search;
            log('🎯 Redirect target: ' + redirectUrl);
            window.location.href = redirectUrl;
            return;
          }
          
          // No tokens anywhere - likely an error
          log('❌ No tokens found in hash or query params', true);
          log('💡 Redirecting to site anyway (might show error page)...', true);
          setTimeout(() => {
            window.location.href = 'https://electrician-exam-5640.figma.site/';
          }, 3000);
          return;
        }
        
        // Parse hash fragment (remove leading #)
        const hashParams = new URLSearchParams(hash.slice(1));
        log('🔑 Parsed hash parameters:');
        
        // Extract all parameters
        const params = {};
        for (const [key, value] of hashParams) {
          params[key] = value;
          // Only show first 20 chars of token for security
          const displayValue = key.includes('token') && value.length > 20 
            ? value.substring(0, 20) + '...' 
            : value;
          log('   - ' + key + ': ' + displayValue);
        }
        
        // Validate required parameters
        const accessToken = params.access_token;
        const type = params.type;
        
        if (!accessToken) {
          log('❌ Missing access_token in hash fragment!', true);
        }
        
        if (!type) {
          log('❌ Missing type parameter in hash fragment!', true);
        }
        
        if (type !== 'recovery') {
          log('⚠️ Type is "' + type + '" - expected "recovery"', true);
        }
        
        // Build query string from hash params
        const queryParams = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
          queryParams.set(key, value);
        }
        
        // Build final redirect URL with query params
        const redirectUrl = 'https://electrician-exam-5640.figma.site/?' + queryParams.toString();
        
        log('✅ Converting hash → query params');
        log('🎯 Redirect target: ' + redirectUrl.substring(0, 100) + '...');
        log('🚀 Redirecting in 1 second...');
        
        // Redirect after short delay (allows user to see debug info if needed)
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 1000);
        
      } catch (error) {
        log('❌ ERROR: ' + error.message, true);
        log('💡 Redirecting to site anyway (will show error page)...', true);
        setTimeout(() => {
          window.location.href = 'https://electrician-exam-5640.figma.site/';
        }, 3000);
      }
    </script>
  </body>
  </html>`;

  return c.html(html);
});

export default auth;