'use client';

import React, { useState } from 'react';
import styles from '@/styles/BookCourse.module.css';

interface FAQItemProps {
  question: string;
  answer: string;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={styles.faqItem}>
      <div 
        className={styles.faqQuestion} 
        onClick={() => setIsOpen(!isOpen)}
      >
        {question}
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className={styles.faqIcon}
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
      {isOpen && (
        <div className={styles.faqAnswer}>
          {answer}
        </div>
      )}
    </div>
  );
};

const FAQ: React.FC = () => {
  const faqItems = [
    {
      question: "Hur anmäler jag mig till en kurs?",
      answer: "Du kan anmäla dig till våra kurser genom att klicka på 'Boka nu' på den kurs du är intresserad av. Följ sedan bokningsflödet där du anger dina uppgifter och väljer betalningsmetod."
    },
    {
      question: "Vad händer om jag behöver avboka?",
      answer: "Du kan avboka upp till 7 dagar före kursstart för full återbetalning. Vid avbokning mindre än 7 dagar före kursstart ges ingen återbetalning, men du kan överlåta din plats till någon annan."
    },
    {
      question: "Behöver jag ta med något till kursen?",
      answer: "Nej, allt material ingår i kursavgiften. Vi rekommenderar bekväma kläder som kan bli smutsiga och att du tar av smycken från händerna."
    },
    {
      question: "Hur lång tid tar det innan jag kan hämta mina färdiga verk?",
      answer: "Det tar vanligtvis 2-3 veckor innan dina verk är färdiga att hämta. Vi meddelar dig via e-post när de är klara för avhämtning."
    },
    {
      question: "Kan jag köpa presentkort?",
      answer: "Ja, vi erbjuder presentkort som kan användas till alla våra kurser och produkter. Presentkorten är giltiga i 12 månader från inköpsdatum."
    }
  ];

  return (
    <div style={{ backgroundColor: '#f9f9f9', padding: '3rem 0' }}>
      <div id="faq" className={styles.faqSection}>
        <h2 className={styles.faqTitle}>Frågor och svar</h2>
        <div className={styles.faqList}>
          {faqItems.map((item, index) => (
            <FAQItem 
              key={index} 
              question={item.question} 
              answer={item.answer} 
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default FAQ; 