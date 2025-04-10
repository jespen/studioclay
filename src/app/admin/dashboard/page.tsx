'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminDashboard from '../../../components/admin/Dashboard/AdminDashboard';
import { getBrowserSupabaseInstance } from '../../../utils/supabase';

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isDev, setIsDev] = useState(false);
  const [connectionVerified, setConnectionVerified] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [isLocalAuth, setIsLocalAuth] = useState(false);
  const [session, setSession] = useState<any>(null);
  const router = useRouter();
  const supabase = getBrowserSupabaseInstance();

  // Memoize the verification function to prevent unnecessary renders
  const verifyConnection = useCallback(async () => {
    try {
      // First check if we already have a session before testing the connection
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (sessionData.session) {
        console.log('Existing session found, skipping connection test');
        setIsAuthenticated(true);
        setUserEmail(sessionData.session.user?.email || null);
        setIsLoading(false);
        return;
      }
      
      const response = await fetch('/api/auth/supabase-auth-test');
      const result = await response.json();
      
      if (!result.success) {
        console.warn('Using local authentication as fallback');
        // Handle local auth if needed
      }
    } catch (err) {
      console.error('Connection test failed:', err);
      setError('Failed to connect to authentication service');
    } finally {
      setIsLoading(false);
    }
  }, []);  // No dependencies as all used state setters are stable

  // Only run in development mode
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setIsDev(true);
    }
  }, []);  // Empty dependency array as this only needs to run once

  // Verify connection to Supabase at startup
  useEffect(() => {
    verifyConnection();
  }, [verifyConnection]);  // Re-run when verifyConnection changes (which it shouldn't)

  useEffect(() => {
    async function checkAuthentication() {
      try {
        setIsLoading(true);
        // Check if the user is authenticated
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error checking authentication:', error);
          setError('Authentication error: ' + error.message);
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }
        
        if (!data.session) {
          console.log('No session found, redirecting to login');
          setIsAuthenticated(false);
          setIsLoading(false);
          
          // If in development, allow staying on the page for debugging
          if (process.env.NODE_ENV === 'development') {
            setError('Not authenticated. Click the button below to go to login page.');
            return;
          }
          
          // In production, always redirect
          router.push('/admin');
          return;
        }
        
        // Set user email for UI display
        if (data.session?.user?.email) {
          setUserEmail(data.session.user.email);
        }
        
        // User is authenticated, set state
        setIsAuthenticated(true);
        setIsLoading(false);
      } catch (err: any) {
        console.error('Unexpected error during authentication check:', err);
        setError('Unexpected error: ' + err.message);
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    }
    
    checkAuthentication();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p>Laddar dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
            <p className="font-bold">Fel</p>
            <p>{error}</p>
          </div>
          <button 
            onClick={() => router.push('/admin')}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Gå till inloggning
          </button>
          
          {isDev && (
            <div className="mt-8 p-4 border border-yellow-400 bg-yellow-50 rounded-lg">
              <h3 className="font-bold text-yellow-800 mb-2">Development Mode Debugging Tools</h3>
              <div className="flex flex-col space-y-2">
                <button
                  onClick={async () => {
                    try {
                      await fetch('/api/auth/local-login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: 'dev@studioclay.se', password: 'devmode' }),
                        credentials: 'same-origin'
                      });
                      // Reload the page to apply the development login
                      window.location.reload();
                    } catch (err) {
                      console.error('Dev login failed:', err);
                    }
                  }}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded"
                >
                  Dev Mode Login Override
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem('redirectAttempts', '0');
                    window.location.href = '/admin?ts=' + Date.now();
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                >
                  Reset Redirect Counter
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <AdminDashboard userEmail={userEmail} />;
} 