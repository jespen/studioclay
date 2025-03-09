'use client';

import { useState, useEffect, useCallback } from 'react';
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
        
        // Get user email from cookie for quicker display
        const userEmail = document.cookie
          .split(';')
          .find(c => c.trim().startsWith('admin-user='));
        
        if (userEmail) {
          const email = decodeURIComponent(userEmail.split('=')[1]);
          setUser({ email });
        }

        // Verify session is still valid
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          throw new Error(error.message);
        }
        
        if (!data.session) {
          // If no session found but we have cookies, likely using local auth
          const activeSessionCookie = document.cookie
            .split(';')
            .find(c => c.trim().startsWith('admin-session-active='));
            
          if (!activeSessionCookie) {
            throw new Error('No active session found');
          }
        } else if (data.session.user) {
          setUser(data.session.user);
        }
      } catch (err) {
        console.error('Authentication error:', err);
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
      <div className="loading-container">
        <p>Laddar dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>Error: {error}</p>
        <button onClick={() => router.push('/admin')}>Gå till inloggning</button>
      </div>
    );
  }

  return <AdminDashboard userName={user?.email} />;
} 