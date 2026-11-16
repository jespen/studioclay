'use client';

import Link from 'next/link';
import { Buildings, UsersThree } from '@phosphor-icons/react';
import styles from '@/styles/Hero.module.css';

interface HeroProps {
  title?: string;
  highlightedText?: string;
  description?: string;
}

const Hero = ({
  title = 'Unik drejstudio för kreativa själar, upplev skapandets magi!',
  highlightedText = 'Studio Clay -',
  description = 'En dedikerad keramikstudio som erbjuder kurser, workshops och studiotid för både privatpersoner och företag.\nUpplev konsten av lera i en kreativ och stödjande miljö.'
}: HeroProps) => {
  return (
    <section id="home" className={styles.hero}>
      <div className={styles.container}>
        <div className={styles.contentGrid}>
          <div className={styles.textContent}>
            <h1 className={styles.heading}>
              <span className={styles.brandMark}>
                <span className={styles.highlightText}>
                  <span>Studio </span>
                  <span>CLAY</span>
                </span>
                <svg className={styles.brushStroke} viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M4 14 C 60 4, 120 4, 170 10 S 260 16, 296 6" pathLength={1} />
                </svg>
              </span> {title}
            </h1>
            <p className={styles.description}>{description}</p>
            <div className={styles.buttonContainer}>
              {/* <Link href="/book-course" className={styles.primaryButton}>
                Boka en kurs
              </Link> */}
              <Link href="/contact" className={styles.secondaryButton}>
                Kontakta mig för skräddarsydda kurser
              </Link>
            </div>
            <div className={styles.clientTypes}>
              <div className={styles.clientType}>
                <Buildings className={styles.clientIcon} size={20} weight="duotone" />
                <span>Företag</span>
              </div>
              <div className={styles.clientType}>
                <UsersThree className={styles.clientIcon} size={20} weight="duotone" />
                <span>Grupper</span>
              </div>
            </div>
          </div>
          <div className={styles.imageContainer}>
            <div 
              className={styles.heroImage}
              style={{
                borderRadius: '1rem',
                height: '100%',
                width: '100%',
                position: 'relative'
              }}
            >
              <div
                className={styles.heroImageLayer}
                style={{ backgroundImage: 'url(/gallery/2.jpg)' }}
              />
              {/* <div className={styles.logo}>
                <div className={styles.logoCircle}>
                  <span className={styles.logoText}>
                    <span>Studio</span>
                    <span>Clay</span>
                  </span>
                </div>
              </div> */}
            </div>
            <div className={styles.spinBadge} aria-hidden="true">
              <svg className={styles.spinText} viewBox="0 0 100 100">
                <defs>
                  <path id="hero-badge-circle" d="M50,50 m-37,0 a37,37 0 1,1 74,0 a37,37 0 1,1 -74,0" />
                </defs>
                <text>
                  <textPath href="#hero-badge-circle" textLength="232" lengthAdjust="spacing">
                    DREJKURSER • WORKSHOPS • STUDIOTID •
                  </textPath>
                </text>
              </svg>
              <svg className={styles.spinIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 3h6M10 3v2.5c0 1-3 2.5-3 6.5 0 4.5 2.2 9 5 9s5-4.5 5-9c0-4-3-5.5-3-6.5V3" />
                <path d="M7.6 13.5h8.8" />
              </svg>
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