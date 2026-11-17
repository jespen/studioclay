'use client';

import { useEffect, useState } from 'react';
import AdminHeader from '../../../../components/admin/Dashboard/AdminHeader';
import GiftCardManager from '../../../../components/admin/GiftCards/GiftCardManager';
import styles from '../courses/courses.module.css';

// Simplified placeholder page until we have all components working correctly
export default function GiftCardsPage() {
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);

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
      }
    }

    fetchUserInfo();
  }, []);

  return (
    <div className={styles.pageContainer}>
      
      <AdminHeader 
        title="Presentkort" 
        subtitle={userEmail ? `Välkommen ${userEmail}` : 'Välkommen'} 
      />
      
      <main className={styles.mainContent}>
        <GiftCardManager />
      </main>
    </div>
  );
} 