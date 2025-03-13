'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '@/styles/BookingConfirmation.module.css';

export default function BookingConfirmationPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to homepage after 5 seconds
    const timer = setTimeout(() => {
      router.push('/');
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen pt-[120px] pb-16">
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.iconWrapper}>
            <svg className={styles.icon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h1 className={styles.title}>Tack för din bokning!</h1>
          
          <p className={styles.message}>
            Din bokning har tagits emot och vi kommer att kontakta dig inom kort för att bekräfta din plats.
          </p>
          
          <p className={styles.message}>
            Om du har några frågor, tveka inte att kontakta oss.
          </p>
          
          <p className={styles.message}>
            Du kommer att omdirigeras till startsidan om några sekunder...
          </p>
          
          <div className={styles.actions}>
            <Link href="/" className={styles.primaryButton}>
              Tillbaka till startsidan
            </Link>
            
            <Link href="/contact" className={styles.secondaryButton}>
              Kontakta oss
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 