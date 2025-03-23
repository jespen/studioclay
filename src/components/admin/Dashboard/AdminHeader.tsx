import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import styles from '../../../app/admin/dashboard/courses/courses.module.css';
import { SupabaseClient } from '@supabase/supabase-js';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  userEmail?: string;
  showBackButton?: boolean;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ title, subtitle, userEmail, showBackButton }) => {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);

      // Sign out from Supabase first
      await (supabase as SupabaseClient).auth.signOut();

      // Call our logout API
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      // Clear all cookies
      document.cookie.split(';').forEach(cookie => {
        const [name] = cookie.split('=');
        document.cookie = `${name.trim()}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      });

      // Force a complete page reload to clear all state
      window.location.href = '/admin?ts=' + Date.now();
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, try to redirect
      window.location.href = '/admin?ts=' + Date.now();
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
            <Link href="/admin/templates" className={styles.navButton}>
              Kursmallar
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