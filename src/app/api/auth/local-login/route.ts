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
    const data = await request.json();
    // Implement server-side authentication logic
    return NextResponse.json({
      message: 'Login processed',
      status: 'success',
      token: generateSessionToken()
    });
  } catch (error) {
    return NextResponse.json({
      message: 'Invalid request',
      status: 'error'
    }, { status: 400 });
  }
} 