import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabaseClient as supabase } from '@/lib/supabase';
import styles from '../../../app/admin/dashboard/courses/courses.module.css';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  userEmail?: string;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ title, subtitle, userEmail }) => {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

      // Manually clear cookies in the browser too (belt and suspenders approach)
      document.cookie = 'admin-session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      document.cookie = 'admin-session-active=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      document.cookie = 'admin-user=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      
      // Find and clear any Supabase cookies
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.startsWith('sb-')) {
          const name = cookie.split('=')[0];
          document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
        }
      }

      // Small delay to ensure cookies are cleared
      await new Promise(resolve => setTimeout(resolve, 300));

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
    <header className={styles.adminHeader}>
      <div className={styles.headerLeft}>
        <h1 className={styles.headerTitle}>{title}</h1>
        {subtitle && <p className={styles.headerSubtitle}>{subtitle}</p>}
      </div>
      <div className={styles.headerRight}>
        <nav className={styles.headerNav}>
          <ul className={styles.navList}>
            <li>
              <Link href="/admin/dashboard" className={styles.navLink}>
                Kurser
              </Link>
            </li>
            <li>
              <Link href="/admin/dashboard/templates" className={styles.navLink}>
                Mallar
              </Link>
            </li>
            <li>
              <Link href="/admin/dashboard/gift-cards" className={styles.navLink}>
                Presentkort
              </Link>
            </li>
            <li>
              <Link href="/admin/dashboard/settings" className={styles.navLink}>
                Inställningar
              </Link>
            </li>
          </ul>
        </nav>
        
        <div className={styles.userActions}>
          {userEmail && (
            <span className={styles.userEmail}>{userEmail}</span>
          )}
          <button 
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={styles.logoutButton}
          >
            {isLoggingOut ? 'Loggar ut...' : 'Logga ut'}
          </button>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader; 