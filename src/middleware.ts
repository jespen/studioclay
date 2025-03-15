import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// Define public paths that don't require authentication
const publicPaths = [
  '/',
  '/admin',
  '/login',
  '/register',
  '/courses',
  '/courses/public',
  '/course/',  // Only the base of course detail pages
  '/checkout',
  '/api/courses/public',
  '/api/checkout',
  '/api/webhooks',
  '/api/admin',
  '/api/auth/set-auth-cookie',
  '/api/auth/supabase-auth-test',
  '/api/auth/local-login',
];

export async function middleware(request: NextRequest) {
  // Initialize response to modify
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create supabase server client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  const pathname = request.nextUrl.pathname;

  // Check if the path is public
  const isPublicPath = publicPaths.some(path => 
    pathname === path || 
    pathname.startsWith('/api/courses/public') || 
    pathname.startsWith('/course/') ||
    pathname.startsWith('/api/webhooks/') ||
    pathname.startsWith('/api/admin/') ||
    pathname.startsWith('/api/checkout/') ||
    pathname.startsWith('/api/auth/')
  );

  // Skip auth check for public paths
  if (isPublicPath) {
    return response;
  }

  // For API routes that aren't public, verify auth
  const isApiPath = pathname.startsWith('/api/');
  if (isApiPath) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    return response;
  }

  // For protected pages, redirect to login if not authenticated
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    const redirectUrl = new URL('/admin', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    '/admin/:path*'
  ]
}; 