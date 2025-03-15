import { NextResponse } from 'next/server';

// Set this to be dynamic to ensure fresh authentication
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      console.error('No email provided to set-auth-cookie endpoint');
      return NextResponse.json(
        { success: false, error: 'No email provided' },
        { status: 400 }
      );
    }
    
    console.log('Setting auth cookies for user:', email);
    
    // Create a new response
    const response = NextResponse.json(
      { success: true, message: 'Auth cookies set successfully' }
    );
    
    // Set custom auth cookies that the middleware can detect
    const oneDay = 60 * 60 * 24;
    
    // Set a session token
    const sessionToken = Array(64)
      .fill(0)
      .map(() => Math.random().toString(36).charAt(2))
      .join('');
    
    // Set cookies that middleware can detect
    response.cookies.set('admin-session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: oneDay // 24 hours
    });

    response.cookies.set('admin-session-active', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: oneDay // 24 hours
    });

    response.cookies.set('admin-user', encodeURIComponent(email), {
      httpOnly: false, // Need to access this on the client
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: oneDay // 24 hours
    });
    
    console.log('Auth cookies set successfully for:', email);
    return response;
  } catch (error) {
    console.error('Error setting auth cookies:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 