import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Export middleware function for Next.js
export function middleware(request: NextRequest) {
  // Add console logs for debugging
  const url = request.nextUrl.clone();
  
  // Process cookies for debugging
  const cookies = request.cookies;
  const cookieNames = Array.from(cookies.getAll()).map(cookie => cookie.name);
  
  // Get and log specific cookies we're looking for
  const supabaseCookies = Array.from(cookies.getAll())
    .filter(cookie => cookie.name.startsWith('sb-'));
  const adminSessionCookie = cookies.get('admin-session');
  const adminSessionActiveCookie = cookies.get('admin-session-active');
  
  console.log('==== MIDDLEWARE ====');
  console.log('URL:', url.pathname);
  console.log('Available cookies:', cookieNames);
  console.log('Supabase cookies:', supabaseCookies.length > 0 ? supabaseCookies.map(c => c.name) : 'none');
  console.log('Has admin-session cookie:', !!adminSessionCookie);
  console.log('Has admin-session-active cookie:', !!adminSessionActiveCookie);
  
  // If accessing admin dashboard or any sub-routes, enforce authentication
  if (url.pathname.startsWith('/admin/dashboard')) {
    console.log('Protected route detected, checking authentication');

    // Check for admin session cookie (our custom cookie)
    const hasAdminSession = !!adminSessionCookie && !!adminSessionActiveCookie;
    
    // Check for Supabase cookies as a fallback
    const hasSupabaseCookies = supabaseCookies.length > 0;
    
    console.log('Authentication check result:', { 
      hasAdminSession, 
      hasSupabaseCookies
    });
    
    // If neither custom cookie nor Supabase cookies exist, redirect to login
    if (!hasAdminSession && !hasSupabaseCookies) {
      console.log('No authentication found, redirecting to login page');
      
      // Add cache-control headers to prevent browser caching of auth failures
      const response = NextResponse.redirect(new URL('/admin', request.url));
      response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
      return response;
    }
    
    console.log('Authentication confirmed, proceeding to admin route');
    
    // Even for authenticated requests, set no-cache headers
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return response;
  }

  // For all other routes
  return NextResponse.next();
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    '/admin/:path*'
  ]
}; 