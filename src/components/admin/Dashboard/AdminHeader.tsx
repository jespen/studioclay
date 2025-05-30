import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { getBrowserSupabaseInstance } from '@/utils/supabase';
import styles from '../../../app/admin/dashboard/courses/courses.module.css';

export interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  userEmail?: string | null;
  showBackButton?: boolean;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ title, subtitle, userEmail, showBackButton }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const supabase = getBrowserSupabaseInstance();

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

  const isActiveRoute = (href: string) => {
    // Special case for dashboard home
    if (href === '/admin/dashboard') {
      return pathname === '/admin/dashboard';
    }
    // For other routes, do exact matching
    return pathname === href;
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
            <Link 
              href="/admin/dashboard" 
              className={`${styles.navButton} ${isActiveRoute('/admin/dashboard') ? styles.activeNavButton : ''}`}
            >
              Kurser
            </Link>
        
            <Link 
              href="/admin/dashboard/gift-cards" 
              className={`${styles.navButton} ${isActiveRoute('/admin/dashboard/gift-cards') ? styles.activeNavButton : ''}`}
            >
              Presentkort
            </Link>
            
            <Link 
              href="/admin/dashboard/shop" 
              className={`${styles.navButton} ${isActiveRoute('/admin/dashboard/shop') ? styles.activeNavButton : ''}`}
            >
              Webshop
            </Link>
            
            <Link 
              href="/admin/dashboard/orders" 
              className={`${styles.navButton} ${isActiveRoute('/admin/dashboard/orders') ? styles.activeNavButton : ''}`}
            >
              Shop beställningar
            </Link>
            
            <Link 
              href="/admin/templates" 
              className={`${styles.navButton} ${isActiveRoute('/admin/templates') ? styles.activeNavButton : ''}`}
            >
              Kursmallar
            </Link>
            
            <Link 
              href="/admin/dashboard/developer" 
              className={`${styles.navButton} ${isActiveRoute('/admin/dashboard/developer') ? styles.activeNavButton : ''}`}
            >
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