'use client';

import Link from 'next/link';
import styles from '@/styles/Pricing.module.css';

const Pricing = () => {
  const pricingPlans = [
    {
      id: 1,
      name: 'Helgkurs',
      price: '3000',
      frequency: 'kr',
      sessionCount: '',
      description: 'Drejning, med inslag av korta förevisningsdrejningar som inspiration och tips för eget drejande.',
      isPopular: false,
      features: [
        { text: 'Dag 1 (5 h) - Drejning', included: true },
        { text: 'Dag 2 (5 h) - Beskickning (färdigställer)', included: true },
        { text: 'Dag 3 (ca 2 h, 3-4 veckor senare) - Glasyrtilfälle', included: true },
        { text: '3 kg lera ingår', included: true },
        { text: 'Glasering och bränningar ingår', included: true },
        { text: 'Tillgång till egen drejskiva under kursen', included: true },
      ],
      buttonText: 'Kontakta',
      buttonLink: '/contact',
      isSecondary: false,
    },
    {
      id: 2,
      name: 'Dag eller kvällskurs',
      price: '3300/4500',
      frequency: 'kr',
      sessionCount: '5 gånger/ 7 gånger',
      description: 'Egen stund vid drejskivan varje vecka. Lär om lerans olika stadier och få praktisera drejning, beskickning, dekortekniker och glasering.',
      isPopular: true,
      features: [
        { text: '3 h per tillfälle', included: true },
        { text: '5 eller 7 gånger, sista gången glasering', included: true },
        { text: '3 kg lera ingår', included: true },
        { text: 'Glasering och bränningar ingår', included: true },
        { text: 'Tillgång till egen drejskiva under kursen', included: true },
        { text: 'Inblick i keramikens grunder', included: true },
      ],
      buttonText: 'Kontakta',
      buttonLink: '/contact',
      isSecondary: false,
    },
    {
      id: 3,
      name: 'Prova-på',
      price: '800',
      frequency: 'kr',
      sessionCount: '',
      description: 'Perfekt för nybörjare som vill prova på drejning för första gången.',
      isPopular: false,
      features: [
        { text: '2 timmars session', included: true },
        { text: 'Dreja så mycket du vill/hinner', included: true },
        { text: 'Välj ut max 2 alster som bränns och glaseras', included: true },
        { text: 'Möjlighet att lägga till fler för 100 kr/st', included: true },
        { text: 'Du väljer glasyrfärg till dina alster', included: true },
        { text: 'Alster beskickas och glaseras av Studio Clay', included: true },
      ],
      buttonText: 'Kontakta',
      buttonLink: '/contact',
      isSecondary: false,
    },
  ];

  return (
    <section id="pricing" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.titleSection}>
          <h2 className={styles.title}>Priser</h2>
          <p className={styles.description}>
            Välj den kurs som passar dig bäst, från provakurser till helgkurser och regelbundna kurstillfällen.
          </p>
        </div>

        <div className={styles.pricingGrid}>
          {pricingPlans.map((plan) => (
            <div 
              key={plan.id} 
              className={`${styles.pricingCard} ${plan.isPopular ? styles.popularPlan : ''}`}
            >
              {plan.isPopular && <div className={styles.popularBadge}>Populär</div>}
              <div className={styles.cardHeader}>
                <h3 className={styles.planName}>{plan.name}</h3>
                <div className={styles.planPrice}>
                  {plan.price}
                  <span className={styles.frequency}>{plan.frequency}</span>
                </div>
                {plan.sessionCount && <div className={styles.sessionCount}>{plan.sessionCount}</div>}
                <p className={styles.planDescription}>{plan.description}</p>
              </div>

              <ul className={styles.featuresList}>
                {plan.features.map((feature, index) => (
                  <li 
                    key={index} 
                    className={`${styles.featureItem} ${!feature.included ? styles.disabledFeature : ''}`}
                  >
                    <svg 
                      className={styles.featureIcon}
                      xmlns="http://www.w3.org/2000/svg" 
                      width="16" 
                      height="16" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      {feature.included ? (
                        <path d="M20 6L9 17l-5-5" />
                      ) : (
                        <path d="M18 6L6 18M6 6l12 12" />
                      )}
                    </svg>
                    {feature.text}
                  </li>
                ))}
              </ul>

              <div className={styles.cardFooter}>
                <Link 
                  href={plan.buttonLink} 
                  className={`${styles.actionButton} ${plan.isSecondary ? styles.secondaryButton : ''}`}
                >
                  {plan.buttonText}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing; 