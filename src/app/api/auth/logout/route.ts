import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Create response
    const response = NextResponse.json({ 
      success: true,
      message: 'Logged out successfully' 
    });
    
    // Clear the session cookie
    response.cookies.set('admin-session', '', { 
      httpOnly: true,
      expires: new Date(0),
      path: '/',
    });
    
    return response;
    
  } catch (err: any) {
    console.error('Logout error:', err);
    return NextResponse.json({ 
      success: false,
      error: 'An error occurred during logout' 
    }, { status: 500 });
  }
} 