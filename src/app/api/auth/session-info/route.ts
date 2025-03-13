import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-static';

export async function GET(request: NextRequest) {
  try {
    // Get cookies from the request
    const cookieHeader = request.headers.get('cookie') || '';
    const cookiePairs = cookieHeader.split(';').map(cookie => cookie.trim());
    
    // Parse cookies into an object
    const cookieObj: Record<string, string> = {};
    cookiePairs.forEach(pair => {
      const [name, value] = pair.split('=');
      if (name) cookieObj[name] = value || '';
    });
    
    // Check for session cookies
    const hasSessionData = 'admin-session-data' in cookieObj;
    const hasSessionToken = 'admin-session' in cookieObj;
    const hasActiveSession = 'admin-session-active' in cookieObj;
    const hasUserEmail = 'admin-user' in cookieObj;
    
    return NextResponse.json({
      sessionExists: hasSessionToken,
      activeSessionExists: hasActiveSession,
      userEmailExists: hasUserEmail,
      userEmail: hasUserEmail ? cookieObj['admin-user'] : null,
      cookieCount: Object.keys(cookieObj).length,
      cookieNames: Object.keys(cookieObj)
    });
    
  } catch (err: any) {
    console.error('Session info error:', err);
    return NextResponse.json({ 
      error: 'An error occurred while retrieving session information', 
      message: err.message || 'Unknown error' 
    }, { status: 500 });
  }
} 