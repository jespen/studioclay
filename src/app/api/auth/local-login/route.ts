import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Dynamic API route for authentication
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// This is a simplified auth system for development use
// In production, this should be replaced with proper Supabase auth
// The admin credentials should be stored securely, not in code

// Generate a secure session token
const generateSessionToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Safe time-constant comparison to prevent timing attacks
const safeCompare = (a: string, b: string) => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  
  // If lengths differ, compare against a new buffer to ensure constant time
  if (bufA.length !== bufB.length) {
    const dummyBuf = Buffer.alloc(bufA.length);
    return crypto.timingSafeEqual(bufA, dummyBuf) && false;
  }
  
  return crypto.timingSafeEqual(bufA, bufB);
};

// Simplified admin users array for testing
// IMPORTANT: This is for development only; in production, these would be fetched from a secure database
const ADMIN_USERS = [
  {
    email: 'eva@studioclay.se',
    // For development testing purpose only
    password: 'StrongPassword123',
  }
];

// Handle local login requests
export async function POST(request: Request) {
  try {
    console.log('Local login API called');
    const body = await request.json().catch(e => {
      console.error('Error parsing request body:', e);
      return null;
    });
    
    if (!body || !body.email || !body.password) {
      console.warn('Missing login credentials in request');
      return NextResponse.json({
        success: false,
        error: 'Missing email or password'
      }, { status: 400 });
    }
    
    const { email, password } = body;

    // Add artificial delay to prevent timing attacks (300-500ms)
    await new Promise(r => setTimeout(r, 300 + Math.random() * 200));
    
    // Find user by email first
    const user = ADMIN_USERS.find(u => u.email === email);
    
    // Check password using constant-time comparison
    const isValid = user ? safeCompare(user.password, password) : false;
    
    if (!user || !isValid) {
      console.warn(`Failed login attempt for email: ${email.substring(0, 3)}...`);
      return NextResponse.json({
        success: false,
        error: 'Invalid email or password'
      }, { status: 401 });
    }

    console.log(`Successful local login for ${email}`);
    
    // Generate session token
    const sessionToken = generateSessionToken();

    // Create response with success
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        email: user.email
      }
    });

    // Set session cookies with explicit expiration time to debug issues
    const expirationDate = new Date();
    expirationDate.setTime(expirationDate.getTime() + (24 * 60 * 60 * 1000)); // 24 hours
    
    console.log(`Setting cookies with expiry: ${expirationDate.toISOString()}`);
    
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      expires: expirationDate
    };

    // Set session cookies
    response.cookies.set('admin-session', sessionToken, cookieOptions);
    response.cookies.set('admin-session-active', 'true', cookieOptions);
    response.cookies.set('admin-user', encodeURIComponent(user.email), {
      ...cookieOptions,
      httpOnly: false // We need this on the client
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({
      success: false,
      error: 'An error occurred during login',
      details: error.message || 'Unknown error'
    }, { status: 500 });
  }
} 