import { NextRequest, NextResponse } from 'next/server';

// Force dynamic to ensure we always get fresh cookie data
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Get cookies from the request
  const cookies = request.cookies;
  const cookieList = Array.from(cookies.getAll());
  
  // Get session-related cookies
  const sessionCookie = cookies.get('admin-session');
  const activeSessionCookie = cookies.get('admin-session-active');
  const userCookie = cookies.get('admin-user');
  
  // Get Supabase cookies
  const supabaseCookies = cookieList.filter(cookie => cookie.name.startsWith('sb-'));
  
  // Create session info object
  const sessionInfo = {
    sessionExists: !!sessionCookie,
    activeSessionExists: !!activeSessionCookie,
    userEmailExists: !!userCookie,
    userEmail: userCookie ? decodeURIComponent(userCookie.value) : null,
    cookieCount: cookieList.length,
    cookieNames: cookieList.map(cookie => cookie.name),
    hasSupabaseAuth: supabaseCookies.length > 0,
    supabaseCookies: supabaseCookies.map(cookie => cookie.name)
  };
  
  // Return the session info
  return NextResponse.json({
    sessionInfo,
    message: 'Session information retrieved successfully',
    status: 'success'
  });
} 