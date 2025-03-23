import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Dynamic API route for authentication
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // Create response for the logout
    const response = NextResponse.json({
      message: 'Logout processed successfully',
      status: 'success'
    });

    // Explicitly clear known auth cookies to ensure they're removed
    const authCookies = [
      'admin-session',
      'admin-session-active',
      'admin-user',
      'sb-access-token',
      'sb-refresh-token',
      'supabase-auth-token'
    ];

    // Clear all auth cookies
    for (const cookieName of authCookies) {
      response.cookies.set(cookieName, '', {
        maxAge: 0,
        path: '/',
        expires: new Date(0)
      });
    }
    
    // Add cache control headers to prevent cached responses
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    response.headers.set('Clear-Site-Data', '"cookies", "storage"');
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}

// Handle logout requests 