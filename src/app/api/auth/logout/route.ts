import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Create response with proper headers
    const response = NextResponse.json({ 
      success: true,
      message: 'Logged out successfully' 
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    
    // Clear all authentication-related cookies with full options
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      expires: new Date(0)
    };

    response.cookies.set('admin-session', '', cookieOptions);
    response.cookies.set('admin-session-active', '', cookieOptions);
    response.cookies.set('admin-user', '', cookieOptions);
    
    return response;
    
  } catch (err: any) {
    console.error('Logout error:', err);
    return NextResponse.json({ 
      success: false,
      error: 'An error occurred during logout' 
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  }
} 