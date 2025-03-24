'use client';

import Link from 'next/link';
import styles from '@/styles/GiftCardBanner.module.css';

const GiftCardBanner = () => {
  return (
    <section id="presentkort" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.bannerContent}>
          <div className={styles.imageContainer}>
            <img 
              src="/pictures/finavaser.jpg"
              alt="Studio Clay presentkort"
              className={styles.bannerImage}
            />
            <div className={styles.imageOverlay}>
              <div className={styles.overlayLabel}>Presentkort</div>
              <div className={styles.overlayPrice}>Från 500 kr</div>
            </div>
          </div>
          
          <div className={styles.textContent}>
            <h2 className={styles.title}>Ge bort en kreativ upplevelse</h2>
            <p className={styles.description}>
              Ge bort upplevelsen av drejning till någon du tycker om. Perfekt som present för den som vill utforska keramikens värld eller om du vill ge bort ett konstverk.
            </p>
            <div className={styles.features}>
              <div className={styles.featureItem}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="18" height="18" className={styles.featureIcon}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Giltiga i 12 månader</span>
              </div>
              <div className={styles.featureItem}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="18" height="18" className={styles.featureIcon}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>För kurser och konstverk</span>
              </div>
              <div className={styles.featureItem}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="18" height="18" className={styles.featureIcon}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Skickas direkt via e-post</span>
              </div>
            </div>
            <Link href="/gift-card-flow" className={styles.ctaButton}>
              Köp presentkort
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="16" height="16" className={styles.buttonIcon}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GiftCardBanner; 