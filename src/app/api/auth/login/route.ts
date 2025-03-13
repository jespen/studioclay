import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Remove force-static since this is an API route
// export const dynamic = 'force-static';

// Add validation for required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: supabaseUrl ? 'present' : 'missing',
    key: supabaseAnonKey ? 'present' : 'missing'
  });
}

// Create a Supabase server-side client with validated environment variables
const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

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