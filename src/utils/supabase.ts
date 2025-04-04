import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

// Add error checking for environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables in utils/supabase.ts');
}

// Create browser client for client-side usage
export const createBrowserSupabaseClient = () => {
  return createBrowserClient(
    supabaseUrl || '', 
    supabaseKey || ''
  );
};

// Create admin client for server-side usage
export const createServerSupabaseClient = () => {
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }
  
  return createClient(supabaseUrl || '', serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

// Create a singleton instance for browser usage
let browserInstance: ReturnType<typeof createBrowserSupabaseClient>;

export const getBrowserSupabaseInstance = () => {
  if (!browserInstance) {
    browserInstance = createBrowserSupabaseClient();
  }
  return browserInstance;
};

export type Session = Awaited<ReturnType<typeof getBrowserSupabaseInstance>['auth']['getSession']>['data']['session']; 