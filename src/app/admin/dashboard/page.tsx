'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
        
        // Use the session-info API route to check authentication
        const response = await fetch('/api/auth/session-info');
        
        if (!response.ok) {
          console.error('DashboardPage: Error fetching session info:', response.status);
          throw new Error('Could not authenticate');
        }
        
        const data = await response.json();
        
        if (data.sessionInfo && data.sessionInfo.activeSessionExists && data.sessionInfo.userEmail) {
          console.log('DashboardPage: Found active session for user:', data.sessionInfo.userEmail);
          setUser({ email: data.sessionInfo.userEmail });
        } else {
          console.error('DashboardPage: No valid authentication found, redirecting to login');
          throw new Error('No active session found');
        }
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