'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from '../courses/courses.module.css';

// Simplified placeholder page until we have all components working correctly
export default function GiftCardsPage() {
  const [userName, setUserName] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserInfo() {
      try {
        const response = await fetch('/api/auth/session-info');
        if (response.ok) {
          const data = await response.json();
          if (data.sessionInfo && data.sessionInfo.userEmail) {
            setUserName(data.sessionInfo.userEmail);
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
      {/* Simplified header */}
      <header className={styles.adminHeader || 'p-4 bg-gray-100 flex justify-between'}>
        <div>
          <h1 className="text-2xl font-bold">Presentkort</h1>
          {userName && <p>Välkommen, {userName}</p>}
        </div>
        <nav>
          <ul className="flex space-x-4">
            <li>
              <Link href="/admin/dashboard">Kurser</Link>
            </li>
            <li>
              <Link href="/admin/dashboard/templates">Mallar</Link>
            </li>
            <li>
              <Link href="/admin/dashboard/gift-cards">Presentkort</Link>
            </li>
          </ul>
        </nav>
      </header>
      
      <main className={styles.mainContent || 'p-4'}>
        {loading ? (
          <div className={styles.loadingSpinner || 'p-4 text-center'}>Laddar...</div>
        ) : (
          <div className={styles.comingSoon || 'p-4 text-center'}>
            <h2 className="text-xl font-semibold mb-2">Presentkort-hantering</h2>
            <p>Kommer snart...</p>
          </div>
        )}
      </main>
    </div>
  );
} 