'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import AdminDashboard from '../../../components/admin/Dashboard/AdminDashboard';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        console.log('DashboardPage: Checking authentication status');
        
        // Try to get user from cookies first for fast rendering
        const userEmail = document.cookie
          .split(';')
          .find(c => c.trim().startsWith('admin-user='));
        
        if (userEmail) {
          const email = decodeURIComponent(userEmail.split('=')[1]);
          console.log('DashboardPage: Found admin-user cookie with email:', email);
          setUser({ email });
          setLoading(false);
          return; // Success with cookie auth
        }

        // Then verify with Supabase if no cookie found
        try {
          console.log('DashboardPage: Checking Supabase session');
          const { data, error } = await supabase.auth.getSession();
          
          if (!error && data.session) {
            console.log('DashboardPage: Found valid Supabase session for user:', data.session.user.email);
            setUser(data.session.user);
            setLoading(false);
            return; // Successfully authenticated with Supabase
          } else if (error) {
            console.error('DashboardPage: Supabase session error:', error);
          } else {
            console.log('DashboardPage: No Supabase session found');
          }
        } catch (supabaseError) {
          console.error('DashboardPage: Supabase auth error:', supabaseError);
        }

        // Check if browser has local storage Supabase session
        try {
          // Check for Supabase cookies as a last resort
          const hasSupabaseCookies = document.cookie
            .split(';')
            .some(c => c.trim().startsWith('sb-'));
            
          if (hasSupabaseCookies) {
            console.log('DashboardPage: Found Supabase cookies, trying to refresh session');
            
            // Try to refresh the session
            const { data, error } = await supabase.auth.refreshSession();
            if (!error && data.session) {
              console.log('DashboardPage: Successfully refreshed Supabase session');
              setUser(data.session.user);
              setLoading(false);
              return;
            }
          }
          
          const savedSession = localStorage.getItem('supabase.auth.token');
          if (savedSession) {
            console.log('DashboardPage: Found Supabase session in localStorage');
            
            // Try to refresh the session
            const { data, error } = await supabase.auth.refreshSession();
            if (!error && data.session) {
              console.log('DashboardPage: Successfully refreshed Supabase session');
              setUser(data.session.user);
              setLoading(false);
              return;
            }
          }
        } catch (localStorageError) {
          console.error('DashboardPage: Local storage error:', localStorageError);
        }

        // If we got here, no valid auth was found
        console.error('DashboardPage: No valid authentication found, redirecting to login');
        throw new Error('No active session found');
        
      } catch (err) {
        console.error('DashboardPage: Authentication error:', err);
        setError(err instanceof Error ? err.message : 'Authentication error');
        
        // Redirect to login on auth error
        router.push('/admin');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#547264]"></div>
          <p className="mt-2 text-gray-600">Laddar dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-6 bg-white rounded-lg shadow-lg max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">Inloggningsproblem</h2>
          <p className="text-gray-600 mb-4">Det gick inte att verifiera din inloggning: {error}</p>
          <button 
            onClick={() => router.push('/admin')}
            className="px-4 py-2 bg-[#547264] text-white rounded hover:bg-[#3e5549] transition-colors"
          >
            Gå till inloggning
          </button>
        </div>
      </div>
    );
  }

  return <AdminDashboard userName={user?.email} />;
} 