import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  console.log('Middleware running on path:', request.nextUrl.pathname);
  
  // Check if we're in a static export context
  const isStaticExport = process.env.NEXT_RUNTIME !== 'nodejs';
  console.log('Is static export:', isStaticExport);
  
  // If we're in a static export, simply pass through all requests
  if (isStaticExport) {
    return NextResponse.next();
  }
  
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

  // Ensure root path shows homepage
  if (request.nextUrl.pathname === '/') {
    return response;
  }
  
  // Only run admin authentication on admin dashboard routes
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
      return response;
    }
    
    // If we get here, no valid session found, redirect to login
    console.log('No valid session, redirecting to login');
    
    // Store the original url as a query parameter to redirect back after login
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