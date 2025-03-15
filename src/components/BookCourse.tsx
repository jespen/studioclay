'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '@/styles/BookCourse.module.css';
import Courses from '@/components/Courses';

const BookCourse = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className={styles.pageContainer}>
      <div className={styles.container}>
        {/* Back to Home button */}
        <div className={styles.backButtonContainer}>
          <Link href="/" className={styles.backButton}>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              width="20" 
              height="20"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M10 19l-7-7m0 0l7-7m-7 7h18" 
              />
            </svg>
            Tillbaka till startsidan
          </Link>
        </div>

        <div className={styles.titleSection}>
          <h1 className={styles.title}>
            Boka en <span className={styles.highlightText}>Keramikkurs</span>
          </h1>
          <p className={styles.description}>
            Anmäl dig till en av våra praktiska keramikkurser och lär dig drejningstekniker från erfarna instruktörer i en kreativ och stödjande miljö.
          </p>
        </div>

        {/* Courses section using our unified Courses component */}
        {/* We set usePublicApi to false to use the same endpoint as the admin dashboard */}
        <Courses usePublicApi={false} />
      </div>
    </div>
  );
};

export default BookCourse; 