import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseClient as supabase } from '@/lib/supabase';
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
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error signing out:', error);
        // Still redirect even if there was an error, as a fallback
      }
      
      // Try to clear any auth cookies through the API
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (err) {
        console.error('Error clearing auth cookies:', err);
      }
      
      // Redirect to login page after logout
      router.push('/admin');
    } catch (error) {
      console.error('Unexpected error during logout:', error);
      // Redirect anyway as a fallback
      router.push('/admin');
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
            
            <Link href="/admin/dashboard/shop" className={styles.navButton}>
              Webshop
            </Link>
            
            <Link href="/admin/dashboard/orders" className={styles.navButton}>
              Beställningar
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