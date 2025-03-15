import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// TEMPORARILY DISABLED - Only logging, no redirects
export function middleware(request: NextRequest) {
  // Just log and pass through all requests
  const url = request.nextUrl.clone();
  console.log('==== MIDDLEWARE TEMPORARILY DISABLED ====');
  console.log('URL (passing through):', url.pathname);
  
  // Always proceed without any redirects
  return NextResponse.next();
}

// Limited matcher to exclude API routes entirely
export const config = {
  matcher: [
    // Empty array to effectively disable middleware until fixed
  ]
}; 