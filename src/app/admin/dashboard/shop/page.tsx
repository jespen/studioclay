'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabaseInstance } from '../../../../utils/supabase';
import ProductManager from '../../../../components/admin/Shop/ProductManager';

export default function ShopAdminPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();
  const supabase = getBrowserSupabaseInstance();

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
          <h2 className="text-xl text-red-500 mb-4">{error}</h2>
          <button 
            onClick={() => router.push('/admin')}
            className="px-4 py-2 bg-black text-white rounded"
          >
            Gå till login
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && process.env.NODE_ENV === 'development') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl text-yellow-500 mb-4">Development mode: Not authenticated</h2>
          <p className="mb-4">You are viewing this page in development mode without authentication.</p>
          <button 
            onClick={() => router.push('/admin')}
            className="px-4 py-2 bg-black text-white rounded"
          >
            Gå till login
          </button>
        </div>
      </div>
    );
  }

  return <ProductManager />;
} 