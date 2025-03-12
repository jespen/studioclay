'use client';

import { useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/Dashboard/AdminHeader';
import GiftCardManager from '@/components/admin/GiftCards/GiftCardManager';
import styles from '../courses/courses.module.css';

export default function GiftCardsPage() {
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    // Get the user email from the cookie
    const cookies = document.cookie.split(';');
    const userCookie = cookies.find(cookie => cookie.trim().startsWith('admin-user='));
    if (userCookie) {
      const email = userCookie.split('=')[1];
      setUserName(decodeURIComponent(email));
    }
  }, []);

  return (
    <div className={styles.pageContainer}>
      <AdminHeader 
        title="Presentkort" 
        subtitle={userName ? `Välkommen, ${userName}` : 'Välkommen'} 
      />
      
      <main className={styles.mainContent}>
        <GiftCardManager showHeader={true} />
      </main>
    </div>
  );
} 