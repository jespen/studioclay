'use client';

import { useEffect, useState } from 'react';
import AdminHeader from '../../../../components/admin/Dashboard/AdminHeader';
import GiftCardManager from '../../../../components/admin/GiftCards/GiftCardManager';
import styles from '../courses/courses.module.css';

// Simplified placeholder page until we have all components working correctly
export default function GiftCardsPage() {
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserInfo() {
      try {
        const response = await fetch('/api/auth/session-info');
        if (response.ok) {
          const data = await response.json();
          if (data.sessionInfo && data.sessionInfo.userEmail) {
            setUserEmail(data.sessionInfo.userEmail);
          }
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUserInfo();
  }, []);

  return (
    <div className={styles.pageContainer}>
      <AdminHeader 
        title="Presentkort" 
        subtitle="Hantera presentkort för Studio Clay" 
        userEmail={userEmail}
      />
      
      <main className={styles.mainContent}>
        {loading ? (
          <div className={styles.loadingSpinner}>Laddar...</div>
        ) : (
          <GiftCardManager />
        )}
      </main>
    </div>
  );
} 