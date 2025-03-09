import { createClient } from '@supabase/supabase-js';

// These environment variables need to be set in .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Add validation for Supabase URL
let isValidUrl = false;
try {
  if (supabaseUrl) {
    new URL(supabaseUrl);
    isValidUrl = true;
  }
} catch (e) {
  console.error('Invalid Supabase URL format:', supabaseUrl);
}

// Log config once on client initialization (for debugging)
if (typeof window !== 'undefined') {
  console.log('Supabase URL valid:', isValidUrl);
  console.log('Supabase URL:', supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'Missing');
  console.log('Supabase Anon Key:', supabaseAnonKey ? 'Set (hidden)' : 'Missing');
}

// Create a Supabase client with proper options
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    fetch: (...args) => {
      return fetch(...args).catch(err => {
        console.error('Supabase fetch error:', err);
        throw err;
      });
    }
  }
});

// Export types for convenience
export type { User, Session } from '@supabase/supabase-js'; 