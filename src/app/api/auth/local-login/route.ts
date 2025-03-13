import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

import crypto from 'crypto';

// This is a simplified auth system for development use
// In production, this should be replaced with proper Supabase auth
// The admin credentials should be stored securely, not in code

// Generate a secure session token
const generateSessionToken = () => {
  return crypto.randomBytes(32).toString('hex');
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

export async function POST(request: Request) {
  try {
    // Get credentials from request
    const { email, password } = await request.json();
    
    console.log('Login attempt for:', email);
    console.log('Received password length:', password?.length || 0);
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    
    // Find user - case insensitive email match
    const user = ADMIN_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      console.log('User not found:', email);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    // Debug information
    console.log('Expected password:', user.password);
    console.log('Received password:', password);
    console.log('Passwords match:', user.password === password);
    
    // Accept any of these passwords for testing purposes
    const validPasswords = [
      'StrongPassword123',
      'StrongPassword123 ',
      ' StrongPassword123',
      'StrongPassword123\n'
    ];
    
    // Simple password check
    if (!validPasswords.includes(password)) {
      console.log('Password mismatch for user:', email);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    // Create a simple session token
    const sessionToken = generateSessionToken();
    
    // Store basic user info
    const userData = {
      email: user.email,
      timestamp: Date.now(),
      // You could add more user info here in the future
    };
    
    // Encode the user data for storage in the cookie
    const sessionData = Buffer.from(JSON.stringify(userData)).toString('base64');
    
    console.log('Created new session for:', user.email);
    console.log('Session token (first 10 chars):', sessionToken.substring(0, 10) + '...');
    
    // Create response
    const response = NextResponse.json({ 
      success: true,
      message: 'Local authentication successful',
      redirect: '/admin/dashboard'
    });
    
    // Cookie configuration that should work in all browsers
    const cookieOptions = {
      path: '/',                               // Make cookie available across the entire site
      secure: process.env.NODE_ENV === 'production', // Only require HTTPS in production
      sameSite: 'lax' as const,                // Allow the cookie to be sent with same-site navigations
      maxAge: 60 * 60 * 24,                    // 1 day in seconds
    };
    
    // 1. Set the session data cookie
    response.cookies.set('admin-session-data', sessionData, {
      ...cookieOptions,
      httpOnly: true,                          // Not accessible via JavaScript 
    });
    
    // 2. Set the session token cookie 
    response.cookies.set('admin-session', sessionToken, {
      ...cookieOptions,
      httpOnly: true,                          // Not accessible via JavaScript
    });
    
    // 3. Set the active session flag (client-readable)
    response.cookies.set('admin-session-active', 'true', {
      ...cookieOptions,
      httpOnly: false,                         // Accessible via JavaScript
    });
    
    // 4. Set the user email cookie (client-readable)
    response.cookies.set('admin-user', user.email, {
      ...cookieOptions,
      httpOnly: false,                         // Accessible via JavaScript
    });
    
    // Debug cookie info
    console.log('Session cookies set for user:', user.email);
    console.log('Cookie count:', response.cookies.getAll().length);
    console.log('Cookie names:', response.cookies.getAll().map(c => c.name).join(', '));
    
    return response;
    
  } catch (err: any) {
    console.error('Local login error:', err);
    return NextResponse.json({ 
      error: 'An unexpected error occurred',
      details: err.message
    }, { status: 500 });
  }
} 