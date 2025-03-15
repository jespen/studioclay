import { NextResponse } from 'next/server';

// Dynamic API route for authentication
export const dynamic = 'force-dynamic';

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

// Handle local login requests
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Validate credentials
    const user = ADMIN_USERS.find(u => u.email === email && u.password === password);
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Invalid email or password'
      }, { status: 401 });
    }

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

    // Set session cookies
    response.cookies.set('admin-session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    response.cookies.set('admin-session-active', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    response.cookies.set('admin-user', encodeURIComponent(user.email), {
      httpOnly: false, // We need this on the client
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({
      success: false,
      error: 'An error occurred during login'
    }, { status: 500 });
  }
} 