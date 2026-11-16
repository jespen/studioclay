'use client';

import React, { useState } from 'react';
import { CaretDown } from '@phosphor-icons/react';
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
        <CaretDown
          size={16}
          weight="bold"
          className={styles.faqIcon}
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
        />
      </div>
      {isOpen && (
        <div className={styles.faqAnswer} style={{ animation: 'drop-in 0.35s var(--ease-out-soft) both' }}>
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
        <h2 className={styles.faqTitle} data-reveal>Frågor och svar</h2>
        <div className={styles.faqList} data-reveal-stagger>
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