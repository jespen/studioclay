import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Debug environment variables
console.log('Environment variables:', {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'present' : 'missing',
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'present' : 'missing',
  nodeEnv: process.env.NODE_ENV
});

// Ensure environment variables are present
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined');
}

// Create Supabase client with validated environment variables
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request: Request) {
  try {
    // Get the credentials from the request
    const { email, password } = await request.json();
    
    // Validate inputs
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' }, 
        { status: 400 }
      );
    }
    
    // Attempt to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('Server login error:', error);
      return NextResponse.json(
        { error: error.message }, 
        { status: 401 }
      );
    }
    
    // Return success with the session
    return NextResponse.json({ data });
    
  } catch (err: any) {
    console.error('Unexpected server error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' }, 
      { status: 500 }
    );
  }
} 