'use client';

import React, { useState, useEffect } from 'react';
import styles from '@/styles/ConstructionBanner.module.css';

// Utility function for developers to reset the banner
export const resetConstructionBanner = () => {
  localStorage.removeItem('constructionBannerDismissed');
  console.log('Construction banner reset! Refresh to see it again.');
  // For convenience in development
  window.location.reload();
};

// Make function available in the console for easy testing
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.resetConstructionBanner = resetConstructionBanner;
}

const ConstructionBanner = () => {
  const [isVisible, setIsVisible] = useState(true);

  // Add localStorage persistence for the banner state
  useEffect(() => {
    // Check if banner was previously dismissed
    const bannerDismissed = localStorage.getItem('constructionBannerDismissed');
    if (bannerDismissed === 'true') {
      setIsVisible(false);
    }
  }, []);

  const dismissBanner = () => {
    setIsVisible(false);
    // Store the dismissal in localStorage so it persists between page loads
    localStorage.setItem('constructionBannerDismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className={styles.banner}>
      <div className={styles.container}>
        <div className={styles.content}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className={styles.icon}
            width="16"
            height="16"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <p className={styles.message}>
            <strong>⚠️ Under uppbyggnad:</strong> Denna webbplats håller på att byggas. Vissa funktioner kanske inte är tillgängliga ännu.
          </p>
        </div>
        <button
          onClick={dismissBanner}
          className={styles.closeButton}
          aria-label="Stäng meddelande"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className={styles.closeIcon}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ConstructionBanner; 