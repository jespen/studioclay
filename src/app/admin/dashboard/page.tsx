'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import Link from 'next/link';

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLocalAuth, setIsLocalAuth] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const router = useRouter();

  // Check for auth parameters in the URL
  useEffect(() => {
    // Extract URL parameters
    const params = new URLSearchParams(window.location.search);
    const source = params.get('source');
    const timestamp = params.get('ts');
    
    // Also check for user email cookie as a quick verification
    const userEmail = document.cookie.split(';').find(c => c.trim().startsWith('admin-user='));
    
    if (userEmail) {
      const email = userEmail.split('=')[1];
      console.log(`Quick cookie check found user: ${email}`);
      setDebugInfo(`Found user cookie: ${email}. Verifying session...`);
    }
    
    if (source) {
      console.log(`Dashboard loaded with source=${source}, timestamp=${timestamp}`);
      setDebugInfo(`Page loaded with ${source} authentication at ${new Date().toLocaleTimeString()}`);
      
      // If we have source parameter, we came from a successful login
      if (source === 'local') {
        setIsLocalAuth(true);
      }
    }
  }, []);

  // Check for the client-side cookie that indicates an active session
  useEffect(() => {
    // If we have the client-side cookie, we know we're authenticated
    const hasClientCookie = document.cookie.includes('admin-session-active=true');
    
    if (hasClientCookie) {
      console.log('Client-side session cookie detected');
      // We'll still do the full check, but we know we have a session
      setDebugInfo((prev) => `${prev || ''}\nSession cookie detected.`);
    }
  }, []);

  useEffect(() => {
    async function checkSession() {
      try {
        setDebugInfo((prev) => `${prev || ''}\nChecking authentication...`);
        
        // First try Supabase authentication
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Supabase session check error:', sessionError);
          setDebugInfo((prev) => `${prev || ''}\nSupabase error: ${sessionError.message}. Trying local auth...`);
          // Fall back to local auth if Supabase fails
          const localAuthSuccess = await checkLocalAuth();
          
          if (!localAuthSuccess) {
            handleAuthFailure('No valid Supabase or local session found');
          }
          return;
        }
        
        if (session) {
          console.log('Supabase session found:', session.user.email);
          setDebugInfo((prev) => `${prev || ''}\nSupabase session active for: ${session.user.email}`);
          setUser(session.user);
          setLoading(false);
          return;
        }
        
        setDebugInfo((prev) => `${prev || ''}\nNo Supabase session found. Trying local auth...`);
        // If no Supabase session, try local auth
        const localAuthSuccess = await checkLocalAuth();
        
        // If both auth methods failed, handle the failure
        if (!localAuthSuccess) {
          handleAuthFailure('No valid session found');
        }
        
      } catch (err: any) {
        console.error('Dashboard error:', err);
        setDebugInfo((prev) => `${prev || ''}\nDashboard error: ${err.message}. Trying local auth...`);
        
        // Try local auth as a fallback
        const localAuthSuccess = await checkLocalAuth();
        
        if (!localAuthSuccess) {
          handleAuthFailure(`Authentication failed: ${err.message}`);
        }
      }
    }
    
    function handleAuthFailure(message: string) {
      setDebugInfo((prev) => `${prev || ''}\n${message}. Authentication required.`);
      
      // Create a "Login" button instead of automatic redirect
      setUser(null);
      setError('Authentication required. Please log in.');
      setLoading(false);
    }
    
    checkSession();
  }, [router]);

  // Function to force a manual refresh of the session
  function refreshSession() {
    setLoading(true);
    setError(null);
    setDebugInfo('Manually refreshing session check...');
    
    // Directly call the check-session endpoint
    fetch('/api/auth/check-session?' + new Date().getTime())
      .then(response => response.json())
      .then(data => {
        console.log('Session refresh result:', data);
        if (data.authenticated) {
          setUser({ email: data.email });
          setIsLocalAuth(true);
          setDebugInfo(`Session verified for ${data.email} at ${new Date().toLocaleTimeString()}`);
        } else {
          setError('Session expired or invalid. Please log in again.');
          setDebugInfo(`Session invalid: ${data.reason}`);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Session refresh error:', err);
        setError('Error checking session: ' + err.message);
        setLoading(false);
      });
  }

  async function checkLocalAuth() {
    try {
      setDebugInfo((prev) => `${prev || ''}\nChecking local authentication...`);
      
      // Check for client-side session indicators first
      const hasActiveSessionCookie = document.cookie.includes('admin-session-active=true');
      const userEmailCookie = document.cookie.split(';').find(c => c.trim().startsWith('admin-user='));
      let userEmail = '';
      
      if (userEmailCookie) {
        userEmail = userEmailCookie.split('=')[1];
      }
      
      console.log('Client cookie check - session active:', hasActiveSessionCookie ? 'Yes' : 'No');
      console.log('Client cookie check - user email:', userEmail || 'Not found');
      
      // Even if we have the client cookie, still verify with the server
      // Check if we have a local session
      const localResponse = await fetch('/api/auth/check-session?' + new Date().getTime());
      const localResult = await localResponse.json();
      
      console.log('Local auth check result:', localResult);
      
      if (localResult.authenticated) {
        console.log('Local session active, user:', localResult.email);
        setDebugInfo((prev) => `${prev || ''}\nLocal session active for: ${localResult.email}`);
        setUser({ email: localResult.email });
        setIsLocalAuth(true);
        setLoading(false);
        return true;
      } else {
        console.log('Server reports no valid session:', localResult);
        
        // If client says we're logged in but server disagrees,
        // we might have a stale or invalid cookie
        if (hasActiveSessionCookie) {
          console.log('WARNING: Client cookie exists but server session invalid');
          setDebugInfo((prev) => `${prev || ''}\nWarning: Client reports logged in but server disagrees.`);
          
          // Clear the cookies to avoid confusion
          document.cookie = 'admin-session-active=; Max-Age=0; path=/;';
          document.cookie = 'admin-user=; Max-Age=0; path=/;';
          
          setDebugInfo((prev) => `${prev || ''}\nCleared client-side session cookies.`);
        }
      }
      
      // If we get here, no valid session was found
      console.log('No active session found');
      return false;
      
    } catch (err: any) {
      console.error('Local auth check error:', err);
      setError(`Error checking authentication: ${err.message}`);
      setDebugInfo((prev) => `${prev || ''}\nLocal auth check failed: ${err.message}`);
      setLoading(false);
      
      return false;
    }
  }

  async function handleSignOut() {
    try {
      setLoading(true);
      
      if (isLocalAuth) {
        // Clear all session cookies for local auth
        document.cookie = 'admin-session-data=; Max-Age=0; path=/;';
        document.cookie = 'admin-session=; Max-Age=0; path=/;';
        document.cookie = 'admin-session-active=; Max-Age=0; path=/;';
        document.cookie = 'admin-user=; Max-Age=0; path=/;';
        
        console.log('Cleared all session cookies');
        setDebugInfo('Local session cleared. Redirecting...');
      } else {
        // Supabase sign out
        const { error } = await supabase.auth.signOut();
        
        if (error) {
          console.error('Supabase sign out error:', error);
          setError(`Error signing out: ${error?.message || 'Unknown error'}`);
          return;
        }
        
        setDebugInfo('Supabase session cleared. Redirecting...');
      }
      
      // Show a brief message before redirecting
      setTimeout(() => {
        // Use direct browser navigation for more reliable redirect
        window.location.href = '/admin';
      }, 1000);
      
    } catch (err: any) {
      console.error('Sign out error:', err);
      setError(`Error during sign out: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  // Add a more detailed function to check cookies
  function getSessionInfo() {
    // Collect all cookie info
    const cookies = document.cookie.split(';').map(c => c.trim());
    const sessionDataCookie = cookies.find(c => c.startsWith('admin-session-data='));
    const sessionCookie = cookies.find(c => c.startsWith('admin-session='));
    const userCookie = cookies.find(c => c.startsWith('admin-user='));
    const activeCookie = cookies.find(c => c.startsWith('admin-session-active='));
    
    const userEmail = userCookie ? userCookie.split('=')[1] : 'Not found';
    const activeSession = activeCookie ? 'Yes' : 'No';
    const hasSessionData = sessionDataCookie ? 'Yes' : 'No';
    const hasSessionToken = sessionCookie ? 'Yes' : 'No';
    
    return {
      cookies: cookies.map(c => c.split('=')[0]),
      userEmail,
      activeSession,
      hasSessionData,
      hasSessionToken,
      timestamp: new Date().toLocaleTimeString()
    };
  }

  // Add this section to the UI part of your component, before the return statement:
  const dashboardModules = [
    {
      title: "Kurshantering",
      description: "Hantera kurser, kategorier och instruktörer",
      link: "/admin/dashboard/courses",
      icon: "📚"
    },
    {
      title: "Bokningar",
      description: "Hantera bokningar och deltagare",
      link: "/admin/dashboard/bookings",
      icon: "📅"
    },
    {
      title: "Inställningar",
      description: "Hantera webbplatsinställningar",
      link: "/admin/dashboard/settings",
      icon: "⚙️"
    }
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-red-500 text-xl font-semibold mb-4">Authentication Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          
          <div className="flex flex-col space-y-2">
            <button
              onClick={refreshSession}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
            >
              Retry Authentication
            </button>
            
            <a
              href="/admin"
              className="block w-full bg-indigo-600 text-center text-white py-2 px-4 rounded-md hover:bg-indigo-500"
            >
              Go to Login Page
            </a>
          </div>
          
          {debugInfo && (
            <div className="mt-4 text-gray-500 text-xs p-2 bg-gray-100 rounded">
              <p>Debug Info:</p>
              <pre className="whitespace-pre-wrap break-all">{debugInfo}</pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Admin Dashboard
            {isLocalAuth && <span className="text-sm font-normal text-gray-500 ml-2">(Local Mode)</span>}
            {!isLocalAuth && <span className="text-sm font-normal text-green-500 ml-2">(Supabase)</span>}
          </h1>
          <div className="flex space-x-2">
            <button
              onClick={refreshSession}
              className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
            >
              Verify Session
            </button>
            <button
              onClick={() => {
                const info = getSessionInfo();
                setDebugInfo(`Session check at ${info.timestamp}:
                  User: ${info.userEmail}
                  Active Session: ${info.activeSession}
                  Session Data: ${info.hasSessionData}
                  Session Token: ${info.hasSessionToken}
                  Cookies: ${info.cookies.join(', ')}
                `);
              }}
              className="px-3 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200"
            >
              Check Cookies
            </button>
            <button
              onClick={handleSignOut}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Welcome, {user?.email || getSessionInfo().userEmail}</h2>
          <p className="text-gray-600 mb-6">
            This is your admin dashboard where you'll be able to manage upcoming courses.
          </p>
          
          {/* Auth status card */}
          <div className="mb-6 bg-blue-50 p-4 rounded-md border border-blue-200">
            <h3 className="font-medium text-blue-800 mb-2">Authentication Status</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-600">Auth Mode:</div>
              <div className="font-medium">{isLocalAuth ? 'Local Authentication' : 'Supabase'}</div>
              
              <div className="text-gray-600">User Email:</div>
              <div className="font-medium">{user?.email || getSessionInfo().userEmail}</div>
              
              <div className="text-gray-600">Session Active:</div>
              <div className="font-medium">{getSessionInfo().activeSession}</div>
            </div>
          </div>
          
          {/* Placeholder for course management */}
          <div className="border rounded-md p-4 bg-gray-50">
            <p className="text-center text-gray-500">
              Course management interface will be implemented here.
            </p>
          </div>
          
          {/* Dashboard Modules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboardModules.map((module, index) => (
              <Link 
                href={module.link} 
                key={index}
                className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start">
                  <div className="text-3xl mr-4">{module.icon}</div>
                  <div>
                    <h2 className="text-xl font-bold mb-2">{module.title}</h2>
                    <p className="text-gray-600">{module.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          
          {debugInfo && (
            <div className="mt-6 text-gray-500 text-xs p-2 bg-gray-100 rounded">
              <p>Debug Info (remove in production):</p>
              <pre className="whitespace-pre-wrap break-all">{debugInfo}</pre>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 