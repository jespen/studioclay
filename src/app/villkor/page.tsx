'use client';

import Link from 'next/link';
import styles from '@/styles/Legal.module.css';

export default function TermsPage() {
  return (
    <div className={styles.legalContainer}>
      <h1>Allmänna villkor</h1>
      <section className={styles.legalSection}>
        <h2>1. Allmänt</h2>
        <p>Dessa allmänna villkor gäller för alla tjänster och produkter som tillhandahålls av Studio Clay.</p>
        
        {/* Add more sections as needed */}
      </section>
      <Link href="/" className={styles.backButton}>
        Tillbaka till startsidan
      </Link>
    </div>
  );
} 