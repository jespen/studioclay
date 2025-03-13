import { NextResponse } from 'next/server';

// Configure the route for static export
export const dynamic = 'force-static';
export const revalidate = 0;

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

export async function POST() {
  // Since we're using static exports, we'll handle local login on the client side
  return NextResponse.json({
    message: 'Local login is handled on the client side',
    status: 'success'
  });
} 