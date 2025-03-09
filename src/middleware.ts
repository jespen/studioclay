import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  console.log('Middleware running on path:', request.nextUrl.pathname);
  
  // Only run on admin dashboard routes
  if (request.nextUrl.pathname.startsWith('/admin/dashboard')) {
    console.log('Checking session for dashboard access');
    
    // Check for session cookies
    const sessionDataCookie = request.cookies.get('admin-session-data')?.value;
    const activeSessionCookie = request.cookies.get('admin-session-active')?.value;
    const userEmailCookie = request.cookies.get('admin-user')?.value;
    
    console.log('Session data cookie exists:', !!sessionDataCookie);
    console.log('Active session cookie exists:', !!activeSessionCookie);
    console.log('User email cookie exists:', !!userEmailCookie);
    
    // Allow access if ANY of these cookies exist (being more lenient)
    if (sessionDataCookie || activeSessionCookie || userEmailCookie) {
      console.log('Found at least one valid session cookie, allowing access');
      return NextResponse.next();
    }
    
    // If we get here, no valid session found, redirect to login
    console.log('No valid session, redirecting to login');
    
    // Store the original url as a query parameter to redirect back after login
    const url = new URL('/admin', request.url);
    url.searchParams.set('redirect', 'dashboard');
    
    return NextResponse.redirect(url);
  }
  
  // For all other routes, continue normally
  return NextResponse.next();
}

// Configure the middleware to run only on specific paths
export const config = {
  matcher: ['/admin/dashboard/:path*'],
}; 