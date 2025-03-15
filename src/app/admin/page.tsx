'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, type Session } from '@/utils/supabase';
import Image from 'next/image';
import Link from 'next/link';
import styles from './admin.module.css';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [connectionVerified, setConnectionVerified] = useState(false);
  const [isLocalAuth, setIsLocalAuth] = useState(false);
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

  // Function to set server-side cookies after successful authentication
  async function setAuthCookies(userEmail: string) {
    try {
      console.log('Setting auth cookies for:', userEmail);
      const response = await fetch('/api/auth/set-auth-cookie', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: userEmail
        }),
        credentials: 'same-origin'
      });
      
      if (!response.ok) {
        console.error('Failed to set auth cookies:', await response.text());
        return false;
      }
      
      const result = await response.json();
      console.log('Auth cookie result:', result);
      return result.success;
    } catch (error) {
      console.error('Error setting auth cookies:', error);
      return false;
    }
  }

  useEffect(() => {
    // Skip Supabase session check if using local auth
    if (isLocalAuth) return;
    
    // Check if user is already logged in
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session check error:', error);
          setDebugInfo(`Session check error: ${error.message}`);
          return;
        }
        
        setSession(data.session);
        if (data.session) {
          console.log('Login page: Found existing session, setting cookies');
          
          // Set server-side cookies that middleware can detect
          const email = data.session.user.email;
          if (email) {
            await setAuthCookies(email);
          }
          
          // Set a short timeout to ensure that cookies are set before navigation
          setTimeout(() => {
            // Use direct navigation for more reliable redirection
            window.location.href = '/admin/dashboard';
          }, 100);
        }
      } catch (err: any) {
        console.error('Error checking session:', err);
        setDebugInfo(`Error checking session: ${err.message || 'Unknown error'}`);
      }
    };

    checkSession();

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      setSession(session);
      if (session && event === 'SIGNED_IN') {
        console.log('New sign in detected, setting cookies');
        
        // Set server-side cookies that middleware can detect
        const email = session.user.email;
        if (email) {
          await setAuthCookies(email);
        }
        
        // Set a short timeout to ensure that cookies are set before navigation
        setTimeout(() => {
          // Use direct navigation for more reliable redirection
          window.location.href = '/admin/dashboard';
        }, 300);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, isLocalAuth]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDebugInfo(null);

    try {
      console.log('Attempting to sign in with:', email);
      
      // Try Supabase authentication first
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
        setDebugInfo('Supabase login successful! Setting cookies and redirecting...');
        
        // Set server-side cookies that middleware can detect
        if (data.user?.email) {
          await setAuthCookies(data.user.email);
        }
        
        // Give Supabase time to set cookies before navigating
        setTimeout(() => {
          // Use direct navigation instead of Next.js router for auth redirects
          window.location.href = '/admin/dashboard';
        }, 500);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setDebugInfo(`Error during sign in attempt: ${err.message}. Trying local auth...`);
      
      // Try local auth as fallback for any errors
      await tryLocalAuth();
    } finally {
      setLoading(false);
    }
  }
  
  async function tryLocalAuth() {
    try {
      setDebugInfo('Using local authentication...');
      
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
        credentials: 'same-origin' // Important for cookies
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
      setDebugInfo('Login successful! Redirecting to dashboard...');
      
      // Set a short timeout to ensure cookies are saved before redirect
      setTimeout(() => {
        // Use direct navigation instead of router for more reliable redirection
        window.location.href = '/admin/dashboard';
      }, 300);
    } catch (error: any) {
      console.error('Local auth request error:', error);
      setError(error.message || 'An error occurred during sign in');
      setDebugInfo(`Login failed: ${error.message}`);
    }
  }

  return (
    <div className={styles.loginContainer}>
      <div className={styles.formContainer}>
        <div className={styles.headerSection}>
          <Link href="/">
            <div className="mx-auto mb-6">
              <h1 className="text-3xl font-bold text-[#547264]">Studio Clay</h1>
            </div>
          </Link>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Admin Inloggning
          </h2>
        </div>
        
        <form onSubmit={handleSignIn} className="space-y-6">
          <div className="space-y-6">
            {/* Email Input */}
            <div className={styles.materialInput}>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="peer"
                placeholder=" "
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <label htmlFor="email-address">
                E-postadress
              </label>
            </div>

            {/* Password Input */}
            <div className={styles.materialInput}>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="peer"
                placeholder=" "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <label htmlFor="password">
                Lösenord
              </label>
            </div>
          </div>

          {error && (
            <div className={styles.errorMessage}>{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className={styles.submitButton}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loggar in...
                </span>
              ) : 'Logga in'}
            </button>
          </div>

          {/* Debug Tools - Only show in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className={styles.debugSection}>
              <p className="text-xs text-gray-500 mb-3 text-center font-medium">Felsökningsalternativ</p>
              <div className={styles.debugButtons}>
                <button
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    if (!email || !password) {
                      setError('E-post och lösenord krävs');
                      return;
                    }
                    setLoading(true);
                    try {
                      const response = await fetch('/api/auth/supabase-login-test', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({email, password: password.trim()})
                      });
                      const result = await response.json();
                      setDebugInfo(`Supabase Auth Test Resultat: ${JSON.stringify(result, null, 2)}`);
                    } catch (err: any) {
                      setDebugInfo(`Supabase Auth Test Fel: ${err.message}`);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className={`${styles.debugButton} ${styles.debugButtonBlue}`}
                >
                  Testa Supabase Auth
                </button>
                
                <button
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    if (!email || !password) {
                      setError('E-post och lösenord krävs');
                      return;
                    }
                    await tryLocalAuth();
                  }}
                  className={`${styles.debugButton} ${styles.debugButtonGreen}`}
                >
                  Testa Lokal Auth
                </button>
              </div>
              
              {debugInfo && (
                <div className={styles.debugInfo}>
                  <p className="font-medium mb-1">Debug Info:</p>
                  <div 
                    className="whitespace-pre-wrap break-all"
                    dangerouslySetInnerHTML={{ __html: debugInfo }}
                  />
                </div>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
} 