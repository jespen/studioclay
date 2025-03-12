'use client';

import Link from 'next/link';
import styles from '@/styles/Legal.module.css';

export default function PrivacyPolicyPage() {
  return (
    <div className={styles.legalContainer}>
      <h1>Behandling av personuppgifter</h1>
      <section className={styles.legalSection}>
        <h2>Personuppgiftspolicy</h2>
        <p>Information om hur vi hanterar och skyddar dina personuppgifter.</p>
        
        <h2>Dina rättigheter</h2>
        <p>Information om dina rättigheter enligt GDPR.</p>
      </section>
      <Link href="/" className={styles.backButton}>
        Tillbaka till startsidan
      </Link>
    </div>
  );
} 