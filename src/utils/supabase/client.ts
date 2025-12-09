/**
 * Singleton Supabase Client
 * 
 * This ensures we only create ONE Supabase client instance in the browser,
 * preventing the "Multiple GoTrueClient instances" warning.
 * 
 * All components/hooks should import this client instead of creating their own.
 */

import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

// Singleton instance
let supabaseInstance: ReturnType<typeof createClient> | null = null;

/**
 * Get the singleton Supabase client instance
 * Creates it on first call, returns same instance on subsequent calls
 */
export function getSupabaseClient() {
  if (!supabaseInstance) {
    console.log('🔐 Creating singleton Supabase client...');
    supabaseInstance = createClient(
      `https://${projectId}.supabase.co`,
      publicAnonKey
    );
  }
  return supabaseInstance;
}

/**
 * Reset the singleton (useful for testing or manual cleanup)
 */
export function resetSupabaseClient() {
  console.log('🔄 Resetting Supabase client singleton');
  supabaseInstance = null;
}

// Export the client directly for convenience
export const supabase = getSupabaseClient();
