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

  // return (
  //   <div className={styles.banner}>
  //     <div className={styles.container}>
  //       <div className={styles.content}>
    
  //         <p className={styles.message}>
  //           <strong>⚠️ Under uppbyggnad</strong> Denna webbplats är under uppbyggnad. Det mesta skall fungera (ej swish) men skulle du hitta något som inte fungerar - kontakta <a href="mailto:eva@studioclay.se">eva@studioclay.se </a>.
  //         </p>
  //       </div>
  //       <button
  //         onClick={dismissBanner}
  //         className={styles.closeButton}
  //         aria-label="Stäng meddelande"
  //       >
  //         <svg
  //           xmlns="http://www.w3.org/2000/svg"
  //           fill="none"
  //           viewBox="0 0 24 24"
  //           strokeWidth={1.5}
  //           stroke="currentColor"
  //           className={styles.closeIcon}
  //         >
  //           <path
  //             strokeLinecap="round"
  //             strokeLinejoin="round"
  //             d="M6 18L18 6M6 6l12 12"
  //           />
  //         </svg>
  //       </button>
  //     </div>
  //   </div>
  // );
};

export default ConstructionBanner; 