'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, type Session } from '@/utils/supabase';
import Image from 'next/image';
import Link from 'next/link';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [connectionVerified, setConnectionVerified] = useState(false);
  const [isLocalAuth, setIsLocalAuth] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const router = useRouter();

  // Verify connection to Supabase at startup
  useEffect(() => {
    async function verifyConnection() {
      try {
        const response = await fetch('/api/auth/supabase-auth-test');
        const result = await response.json();
        
        setConnectionVerified(result.success);
        setDebugInfo(result.success 
          ? `Connected to Supabase authentication service` 
          : `Error connecting to Supabase: ${result.error}`);
          
        if (!result.success) {
          console.warn('Using local authentication as fallback');
          setIsLocalAuth(true);
        }
      } catch (err) {
        console.error('Connection test failed:', err);
        setConnectionVerified(false);
        setIsLocalAuth(true);
        setDebugInfo('Connection test failed, using local authentication');
      }
    }
    
    verifyConnection();
  }, []);

  useEffect(() => {
    // Skip Supabase session check if using local auth
    if (isLocalAuth) return;
    
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Session check error:', error);
        setDebugInfo(`Session check error: ${error.message}`);
        return;
      }
      
      setSession(session);
      if (session) {
        router.push('/admin/dashboard');
      }
    });

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        router.push('/admin/dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, [router, isLocalAuth]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDebugInfo(null);

    try {
      console.log('Attempting to sign in with:', email);
      
      // Try Supabase authentication first, since it's working
      setDebugInfo('Trying Supabase authentication...');
      
      // Use Supabase client-side auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: password.trim(),
      });

      if (error) {
        console.error('Supabase sign in error:', error);
        setDebugInfo(`Supabase auth error: ${error.message}. Trying local auth instead...`);
        
        // Fall back to local auth
        await tryLocalAuth();
      } else {
        console.log('Supabase sign in successful:', data);
        setDebugInfo('Supabase login successful! Redirecting...');
        
        // Simple direct navigation - should work for Supabase auth
        window.location.href = `/admin/dashboard?source=supabase&ts=${Date.now()}`;
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setDebugInfo(`Error during sign in attempt: ${err.message}. Trying local auth...`);
      
      // Try local auth as fallback for any errors
      await tryLocalAuth();
    }
  }
  
  async function tryLocalAuth() {
    try {
      setDebugInfo('Using local authentication...');
      setLoading(true);
      
      // Trim password to avoid whitespace issues
      const trimmedPassword = password.trim();
      
      // Use local authentication API
      const response = await fetch('/api/auth/local-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          password: trimmedPassword
        }),
      });
      
      // Log the HTTP status
      console.log('Local auth API response status:', response.status);
      
      const result = await response.json();
      console.log('Local auth API response:', result);
      
      if (!response.ok) {
        console.error('Local auth error:', result);
        setDebugInfo(`API response: ${JSON.stringify(result)}`);
        
        throw new Error(result.error || 'Authentication failed');
      }
      
      console.log('Local authentication successful:', result);
      setDebugInfo('Login successful! Please click the button below to continue.');
      
      // Set success state to show the dashboard button
      setLoginSuccess(true);
      setLoading(false);
    } catch (error: any) {
      console.error('Local auth request error:', error);
      setError(error.message || 'An error occurred during sign in');
      setDebugInfo(`Login failed: ${error.message}`);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link href="/">
            <div className="mx-auto h-24 w-24 relative">
              <Image
                src="/logo.svg" 
                alt="Studio Clay Logo"
                width={100}
                height={100}
                priority
              />
            </div>
          </Link>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            Admin Login
          </h2>
          {isLocalAuth && (
            <p className="mt-2 text-sm text-gray-500">
              Using local authentication system
            </p>
          )}
          {!isLocalAuth && connectionVerified && (
            <p className="mt-2 text-sm text-green-500">
              Using Supabase authentication
            </p>
          )}
        </div>
        
        {/* Show login success message and dashboard button */}
        {loginSuccess ? (
          <div className="mt-8 bg-white shadow-md rounded-lg p-6 text-center">
            <div className="text-green-600 text-xl font-bold mb-3">✓ Login Successful!</div>
            <p className="mb-4 text-gray-700">You can now access the admin dashboard.</p>
            <a 
              href={`/admin/dashboard?source=local&ts=${Date.now()}`}
              className="block w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 font-medium"
            >
              Go to Dashboard →
            </a>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSignIn}>
            <div className="-space-y-px rounded-md shadow-sm">
              <div>
                <label htmlFor="email-address" className="sr-only">
                  Email address
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="relative block w-full rounded-t-md border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="relative block w-full rounded-b-md border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}
            
            {debugInfo && (
              <div className="text-gray-500 text-xs mt-2 p-2 bg-gray-100 rounded">
                <p>Debug Info (remove in production):</p>
                <div 
                  className="whitespace-pre-wrap break-all"
                  dangerouslySetInnerHTML={{ __html: debugInfo }}
                />
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-70"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>

            {/* Debug Tools - Remove in production */}
            <div className="mt-4 border-t border-gray-200 pt-4">
              <p className="text-xs text-gray-500 mb-2">Troubleshooting Options:</p>
              <div className="flex space-x-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    if (!email || !password) {
                      setError('Email and password are required');
                      return;
                    }
                    setLoading(true);
                    try {
                      // Test Supabase auth directly
                      const response = await fetch('/api/auth/supabase-login-test', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({email, password: password.trim()})
                      });
                      const result = await response.json();
                      setDebugInfo(`Supabase Auth Test Result: ${JSON.stringify(result, null, 2)}`);
                    } catch (err: any) {
                      setDebugInfo(`Supabase Auth Test Error: ${err.message}`);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded"
                >
                  Test Supabase Auth
                </button>
                
                <button
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    if (!email || !password) {
                      setError('Email and password are required');
                      return;
                    }
                    // Test local auth directly
                    await tryLocalAuth();
                  }}
                  className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded"
                >
                  Test Local Auth
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
} 