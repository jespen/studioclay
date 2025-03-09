import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
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
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Redirect to login page
        router.push('/admin');
      } else {
        console.error('Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
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
    
            </div>
          )}
          
          <div className={styles.navButtonsRow}>
            <Link href="/admin/dashboard" className={styles.navButton}>
              Dashboard
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