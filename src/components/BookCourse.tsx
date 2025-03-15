'use client';

import React from 'react';
import Courses from '@/components/Courses';
import styles from '@/styles/BookCourse.module.css';

const BookCourse = () => {
  return (
    <div className={styles.container}>
      <div className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1 className={styles.title}>Boka Din Kurs i Keramik</h1>
          <p className={styles.description}>
            Upptäck våra kurser i keramik och hantverk, designade för alla färdighetsnivåer. 
            Välj mellan prova-på-kurser, intensiva helgkurser, och regelbundna sessioner för att 
            utveckla din kreativitet och tekniska färdigheter.
          </p>
        </div>
      </div>
      
      <div className={styles.contentSection}>
        <div className={styles.sectionIntro}>
          <h2>Våra tillgängliga kurser</h2>
          <p>
            Välj den kurs som passar dig bäst. Vi erbjuder allt från introduktionskurser 
            för nybörjare till mer avancerade kurser för erfarna keramiker.
          </p>
        </div>
        
        {/* We use the Courses component which now always uses the admin endpoint */}
        <Courses />
        
        <div className={styles.bookingInfo}>
          <h3>Bokningsinformation</h3>
          <div className={styles.infoGrid}>
            <div className={styles.infoCard}>
              <h4>Betalning</h4>
              <p>Betalning sker vid bokning via kreditkort eller faktura.</p>
            </div>
            <div className={styles.infoCard}>
              <h4>Avbokning</h4>
              <p>Avbokning kan göras upp till 7 dagar före kursstart med full återbetalning.</p>
            </div>
            <div className={styles.infoCard}>
              <h4>Material</h4>
              <p>Alla nödvändiga material och verktyg ingår i kursavgiften.</p>
            </div>
            <div className={styles.infoCard}>
              <h4>Plats</h4>
              <p>Alla kurser hålls i vår studio på Vasagatan 15 i Göteborg.</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className={styles.customSection}>
        <h3>Företagsevent & Privata Kurser</h3>
        <p>
          Vi erbjuder skräddarsydda kurser för företagsevent, teambuilding eller 
          privata grupper. Kontakta oss för mer information om våra specialpaket.
        </p>
        <button className={styles.customButton}>Kontakta oss</button>
      </div>
    </div>
  );
};

export default BookCourse; 