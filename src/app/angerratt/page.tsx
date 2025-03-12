'use client';

import Link from 'next/link';
import styles from '@/styles/Legal.module.css';

export default function ReturnPolicyPage() {
  return (
    <div className={styles.legalContainer}>
      <h1>Ångerrätt och reklamation</h1>
      <section className={styles.legalSection}>
        <h2>Ångerrätt</h2>
        <p>Information om din ångerrätt vid köp av våra tjänster och produkter.</p>
        
        <h2>Reklamation</h2>
        <p>Information om hur du går tillväga vid reklamation.</p>
      </section>
      <Link href="/" className={styles.backButton}>
        Tillbaka till startsidan
      </Link>
    </div>
  );
} 