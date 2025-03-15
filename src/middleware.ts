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
  
  // The login page is at /admin exactly
  const isLoginPage = url.pathname === '/admin';
  
  // If accessing any admin route (except the login page itself), enforce authentication
  if (url.pathname.startsWith('/admin') && !isLoginPage && !url.pathname.includes('/api/')) {
    console.log('Protected route detected, checking authentication');

    // Check for admin session cookie (our custom cookie)
    // Both cookies must be present and have valid values
    const hasAdminSession = !!adminSessionCookie && 
      !!adminSessionActiveCookie && 
      adminSessionCookie.value.length > 0 && 
      adminSessionActiveCookie.value === 'true';
    
    // Check for Supabase cookies as a fallback - only consider valid if we have at least 3 Supabase cookies
    const hasSupabaseCookies = supabaseCookies.length >= 3;
    
    console.log('Authentication check result:', { 
      hasAdminSession, 
      hasSupabaseCookies,
      adminSessionValue: adminSessionCookie?.value,
      adminSessionActiveValue: adminSessionActiveCookie?.value
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

  // For the login page itself, we should check if the user is already authenticated
  // If they are, redirect them to the dashboard instead of showing login again
  if (isLoginPage) {
    const hasAdminSession = !!adminSessionCookie && 
      !!adminSessionActiveCookie && 
      adminSessionCookie.value.length > 0 && 
      adminSessionActiveCookie.value === 'true';
    
    const hasSupabaseCookies = supabaseCookies.length >= 3;
    
    // If user is already authenticated, redirect to dashboard
    if (hasAdminSession || hasSupabaseCookies) {
      console.log('User already authenticated, redirecting to dashboard');
      const response = NextResponse.redirect(new URL('/admin/dashboard', request.url));
      response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
      return response;
    }
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