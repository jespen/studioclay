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
          {/* {isLocalAuth && (
            <p className="text-sm text-gray-500">
              Använder lokalt autentiseringssystem
            </p>
          )}
          {!isLocalAuth && connectionVerified && (
            <p className="text-sm text-green-500">
              Använder Supabase autentisering
            </p>
          )} */}
        </div>
        
        {loginSuccess ? (
          <div className="text-center">
            <div className="text-green-600 text-xl font-semibold mb-3">✓ Inloggningen lyckades!</div>
            <p className="mb-6 text-gray-600">Du kan nu komma åt admin-panelen. Test</p>
            <a 
              href={`/admin/dashboard?source=local&ts=${Date.now()}`}
              className={styles.submitButton}
            >
              Gå till Dashboard test →
            </a>
          </div>
        ) : (
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

            {/* {error && (
              <div className={styles.errorMessage}>{error}</div>
            )}
            
            {debugInfo && (
              <div className={styles.debugInfo}>
                <p className="font-medium mb-1">Debug Info (ta bort i produktion):</p>
                <div 
                  className="whitespace-pre-wrap break-all"
                  dangerouslySetInnerHTML={{ __html: debugInfo }}
                />
              </div>
            )} */}

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

            {/* Debug Tools */}
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
            </div>
          </form>
        )}
      </div>
    </div>
  );
} 