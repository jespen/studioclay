import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Export middleware function for Next.js
export function middleware(request: NextRequest) {
  // Add console logs for debugging
  const url = request.nextUrl.clone();
  console.log('==== MIDDLEWARE ====');
  console.log('URL:', url.pathname);
  
  // Temporarily simplify - only protect /admin/dashboard without redirecting
  if (url.pathname.startsWith('/admin/dashboard')) {
    // For now, just proceed without authentication checks
    console.log('Protected route detected, temporarily allowing access');
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