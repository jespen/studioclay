import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-static';


export async function GET(request: NextRequest) {
  try {
    // Get all cookies for debugging
    const allCookies = request.cookies.getAll();
    console.log('All cookies found:', allCookies.map(c => c.name));
    
    // Get individual cookies
    const sessionDataCookie = request.cookies.get('admin-session-data')?.value;
    const sessionTokenCookie = request.cookies.get('admin-session')?.value;
    const activeSessionCookie = request.cookies.get('admin-session-active')?.value;
    const userEmailCookie = request.cookies.get('admin-user')?.value;
    
    // Log which cookies are present
    console.log('Session data cookie:', sessionDataCookie ? 'Yes' : 'No');
    console.log('Session token cookie:', sessionTokenCookie ? 'Yes' : 'No');
    console.log('Active session cookie:', activeSessionCookie ? 'Yes' : 'No');
    console.log('User email cookie:', userEmailCookie || 'Not found');
    
    // Check for session data cookie first (most secure)
    if (sessionDataCookie) {
      try {
        // Decode and parse the session data
        const sessionDataString = Buffer.from(sessionDataCookie, 'base64').toString('utf-8');
        const sessionData = JSON.parse(sessionDataString);
        
        // Session found - return user info
        return NextResponse.json({
          authenticated: true,
          email: sessionData.email,
          timestamp: sessionData.timestamp,
          loginTime: new Date(sessionData.timestamp).toLocaleString()
        });
      } catch (decodeError: any) {
        console.error('Error decoding session data:', decodeError);
        // Continue checking other cookies
      }
    }
    
    // Check for session token
    if (sessionTokenCookie) {
      console.log('Session token cookie found, but no session data');
      // We have a token but no data, still consider authenticated if we have a user
      if (userEmailCookie) {
        return NextResponse.json({
          authenticated: true,
          email: userEmailCookie,
          note: 'Using backup user email cookie'
        });
      }
    }
    
    // Last resort - check if active session flag is set
    if (activeSessionCookie === 'true') {
      console.log('Active session flag found, but no session data or user');
      return NextResponse.json({
        authenticated: true,
        email: 'admin@example.com', // Fallback
        note: 'Using backup active session flag'
      });
    }
    
    // No valid session found
    return NextResponse.json({ 
      authenticated: false,
      reason: 'No valid session cookies found',
      availableCookies: allCookies.map(c => c.name)
    });
    
  } catch (err: any) {
    console.error('Session check error:', err);
    return NextResponse.json({ 
      authenticated: false,
      error: 'An error occurred checking the session',
      message: err.message
    });
  }
} 