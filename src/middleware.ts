import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { checkRateLimit } from './utils/security';

// Define public paths that don't require authentication
const publicPaths = [
  '/',
  '/admin',  // Login page
  '/login',
  '/register',
  '/courses',
  '/courses/public',
  '/course/',  // Course detail pages
  '/checkout',
  '/api/courses/public',
  '/api/checkout',
  '/api/auth/set-auth-cookie',
  '/api/auth/supabase-auth-test',
  '/api/auth/local-login',
  '/api/payments/swish/create',    // Verified Swish endpoint
  '/api/payments/swish/callback',  // Verified Swish callback endpoint
];

// Endpoints som kräver rate limiting
const RATE_LIMITED_ENDPOINTS = [
  '/api/payments/swish/create',    // Only rate limit Swish create endpoint
  '/api/payments/status',          // Rate limit status checks
];

// Endpoints som kräver idempotency key
const IDEMPOTENCY_REQUIRED_ENDPOINTS = [
  '/api/payments/swish/create',    // Only require idempotency for Swish create
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
    pathname.startsWith('/api/checkout/') ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/payments/status/') ||       // Allow dynamic status checks
    pathname.startsWith('/api/payments/swish/callback/')  // Allow Swish callbacks
  );

  // Skip auth check for public paths
  if (isPublicPath) {
    return response;
  }

  // Check for authentication - first try Supabase session, then fallback to custom cookies
  const isAuthenticated = await isUserAuthenticated(request, supabase);

  // For API routes that aren't public, verify auth
  const isApiPath = pathname.startsWith('/api/');
  if (isApiPath) {
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    return response;
  }

  // For protected pages, redirect to login if not authenticated
  if (!isAuthenticated) {
    const redirectUrl = new URL('/admin', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Kontrollera om detta är en API route som behöver rate limiting
  if (RATE_LIMITED_ENDPOINTS.some(endpoint => pathname.startsWith(endpoint))) {
    // Hämta IP från headers eller forwarded headers
    const ip = request.headers.get('x-real-ip') || 
               request.headers.get('x-forwarded-for')?.split(',')[0] || 
               'unknown';
               
    const isAllowed = await checkRateLimit(ip, pathname);
    
    if (!isAllowed) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Too many requests'
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
  }
  
  // Kontrollera om detta är en route som kräver idempotency key
  if (IDEMPOTENCY_REQUIRED_ENDPOINTS.some(endpoint => pathname.startsWith(endpoint))) {
    const idempotencyKey = request.headers.get('Idempotency-Key');
    
    if (!idempotencyKey) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Missing Idempotency-Key header'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
  }

  return response;
}

// Helper function to check authentication via multiple methods
async function isUserAuthenticated(request: NextRequest, supabase: any): Promise<boolean> {
  // Try Supabase session first
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      return true;
    }
  } catch (error) {
    console.error('Error checking Supabase session:', error);
    // Continue to next auth method
  }

  // Fallback to custom auth cookies
  const hasSessionCookie = request.cookies.has('admin-session');
  const hasActiveSessionCookie = request.cookies.has('admin-session-active');

  if (hasSessionCookie && hasActiveSessionCookie) {
    return true;
  }
  
  return false;
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    // Admin routes
    '/admin/:path*',
    '/api/admin/:path*',
    '/api/courses/admin/:path*',
    
    // Protected API routes (excluding public payment endpoints)
    '/api/bookings/:path*',
    '/api/payments/refund/:path*',     // Protected payment endpoints
    '/api/payments/admin/:path*',      // Protected admin payment endpoints
  ]
}; 