import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Dynamic API route for authentication
export const dynamic = 'force-dynamic';

export async function POST() {
  // Create response for the logout
  const response = NextResponse.json({
    message: 'Logout processed successfully',
    status: 'success'
  });
  
  // Set cookies to expire
  response.cookies.set('admin-session', '', { 
    maxAge: 0,
    path: '/',
    httpOnly: true,
    expires: new Date(0)
  });
  
  response.cookies.set('admin-session-active', '', { 
    maxAge: 0,
    path: '/',
    httpOnly: true,
    expires: new Date(0)
  });
  
  response.cookies.set('admin-user', '', { 
    maxAge: 0,
    path: '/',
    httpOnly: true,
    expires: new Date(0)
  });
  
  // Add cache control to prevent cached responses
  response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
  
  return response;
}

// Handle logout requests 