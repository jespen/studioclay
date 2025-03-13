import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import styles from '../../../app/admin/dashboard/courses/courses.module.css';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ title, subtitle }) => {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Get the user email from the cookie
  useEffect(() => {
    const cookies = document.cookie.split(';');
    const userCookie = cookies.find(cookie => cookie.trim().startsWith('admin-user='));
    if (userCookie) {
      const email = userCookie.split('=')[1];
      setUserEmail(decodeURIComponent(email));
    }
  }, []);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);

      // Try to sign out from Supabase first
      await supabase.auth.signOut();

      // Then call our local logout endpoint
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        credentials: 'same-origin'
      });

      if (!response.ok) {
        throw new Error(`Logout failed: ${response.status}`);
      }

      // Clear all client-side cookies
      const clearCookie = (name: string) => {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; secure; samesite=lax`;
      };
      
      clearCookie('admin-session');
      clearCookie('admin-session-active');
      clearCookie('admin-user');

      // Small delay to ensure cookies are cleared
      await new Promise(resolve => setTimeout(resolve, 100));

      // Force a complete page reload and redirect
      window.location.href = '/admin?ts=' + Date.now();

    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, try to redirect to login
      window.location.href = '/admin?ts=' + Date.now();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <div>
          <h1 className={styles.headerTitle}>{title}</h1>
          {subtitle && <p className={styles.headerSubtitle}>{subtitle}</p>}
          
          {userEmail && (
            <div className={styles.welcomeMessage}>
              {userEmail}
            </div>
          )}
          
          <div className={styles.navButtonsRow}>
            <Link href="/admin/dashboard" className={styles.navButton}>
              Kurser
            </Link>
            <Link href="/admin/dashboard/gift-cards" className={styles.navButton}>
              Presentkort
            </Link>
            <Link href="/admin/dashboard/developer" className={styles.navButton}>
              Developer
            </Link>
            <button 
              onClick={handleLogout} 
              className={`${styles.navButton} ${styles.logoutButton}`}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? 'Loggar ut...' : 'Logga ut'}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader; 