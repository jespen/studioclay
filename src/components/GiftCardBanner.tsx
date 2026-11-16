'use client';

import Link from 'next/link';
import { ArrowRight, EnvelopeSimple, Palette, SealCheck } from '@phosphor-icons/react';
import styles from '@/styles/GiftCardBanner.module.css';

const GiftCardBanner = () => {
  return (
    <section id="presentkort" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.bannerContent} data-reveal="zoom">
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
            <div className={styles.features} data-reveal-stagger>
              <div className={styles.featureItem}>
                <SealCheck size={22} weight="duotone" className={styles.featureIcon} />
                <span>Giltiga i 12 månader</span>
              </div>
              <div className={styles.featureItem}>
                <Palette size={22} weight="duotone" className={styles.featureIcon} />
                <span>För kurser och konstverk</span>
              </div>
              <div className={styles.featureItem}>
                <EnvelopeSimple size={22} weight="duotone" className={styles.featureIcon} />
                <span>Skickas direkt via e-post</span>
              </div>
            </div>
            <Link href="/gift-card-flow" className={styles.ctaButton}>
              Köp presentkort
              <ArrowRight size={16} weight="bold" className={styles.buttonIcon} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GiftCardBanner; 