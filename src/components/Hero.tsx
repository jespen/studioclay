'use client';

import Link from 'next/link';
import styles from '@/styles/Hero.module.css';

interface HeroProps {
  title?: string;
  highlightedText?: string;
  description?: string;
}

const Hero = ({
  title = 'Clay Studio för kreativa sinnen',
  highlightedText = 'Professionell',
  description = 'En dedikerad keramikstudio som erbjuder kurser, workshops och studiotid för både privatpersoner och företag. Upplev konsten av lera i en kreativ och stödjande miljö.'
}: HeroProps) => {
  return (
    <section id="home" className={styles.hero}>
      <div className={styles.container}>
        <div className={styles.contentGrid}>
          <div className={styles.textContent}>
            <h1 className={styles.heading}>
              <span className={styles.highlightText}>{highlightedText}</span> {title}
            </h1>
            <p className={styles.description}>{description}</p>
            <div className={styles.buttonContainer}>
              <Link href="/book-course" className={styles.primaryButton}>
                Boka en kurs
              </Link>
              <Link href="/contact" className={styles.secondaryButton}>
                Kontaka mig för skräddarsydda kurser
              </Link>
            </div>
            <div className={styles.clientTypes}>
              <div className={styles.clientType}>
                <svg className={styles.clientIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>Privatpersoner</span>
              </div>
              <div className={styles.clientType}>
                <svg className={styles.clientIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <path d="M3 3h18v18H3zM8 12h8M12 8v8"></path>
                </svg>
                <span>Företag</span>
              </div>
              <div className={styles.clientType}>
                <svg className={styles.clientIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <span>Grupper</span>
              </div>
            </div>
          </div>
          <div className={styles.imageContainer}>
            <div 
              className={styles.heroImage}
              style={{
                backgroundImage: 'url(/gallery/2.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: '1rem',
                height: '100%',
                width: '100%',
                position: 'relative'
              }}
            >
              {/* <div className={styles.logo}>
                <div className={styles.logoCircle}>
                  <span className={styles.logoText}>Studio Clay</span>
                </div>
              </div> */}
            </div>
          </div>
        </div>
      </div>
      
      {/* Decorative elements - made smaller */}
      <div className={styles.decorElement1}></div>
      <div className={styles.decorElement2}></div>
    </section>
  );
};

export default Hero; 