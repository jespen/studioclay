import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Add cache-control headers in development mode
  const response = NextResponse.next();
  
  // Check if we're in development mode (localhost)
  const host = request.headers.get('host') || '';
  const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
  
  if (isLocalhost || process.env.NODE_ENV === 'development') {
    // Add no-cache headers to prevent browser caching
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  // Only run admin authentication on admin dashboard routes
  if (request.nextUrl.pathname.startsWith('/admin/dashboard')) {
    console.log('Checking session for dashboard access');
    
    // Check for session cookies
    const sessionDataCookie = request.cookies.get('admin-session-data')?.value;
    const activeSessionCookie = request.cookies.get('admin-session-active')?.value;
    const userEmailCookie = request.cookies.get('admin-user')?.value;
    
    // Allow access if ANY of these cookies exist (being more lenient)
    if (sessionDataCookie || activeSessionCookie || userEmailCookie) {
      return response;
    }
    
    // If we get here, no valid session found, redirect to login
    const url = new URL('/admin', request.url);
    url.searchParams.set('redirect', 'dashboard');
    
    return NextResponse.redirect(url);
  }
  
  // For all other routes, return the response with cache headers
  return response;
}

// Configure the middleware to run on all paths except static files
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|gif|png|svg|ico|webp)$).*)'],
}; 