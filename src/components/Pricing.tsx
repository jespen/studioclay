'use client';

import Link from 'next/link';
import styles from '@/styles/Pricing.module.css';

const Pricing = () => {
  const pricingPlans = [
    {
      id: 1,
      name: 'Single Session',
      price: 45,
      frequency: 'per session',
      description: 'Perfect for trying out clay working for the first time',
      isPopular: false,
      features: [
        { text: '2-hour guided session', included: true },
        { text: 'All materials included', included: true },
        { text: 'One finished piece', included: true },
        { text: 'Glazing included', included: true },
        { text: 'Studio access', included: false },
        { text: 'Private instruction', included: false },
      ],
      buttonText: 'Book a Session',
      buttonLink: '/book-course',
      isSecondary: true,
    },
    {
      id: 2,
      name: 'Beginner Course',
      price: 299,
      frequency: 'per course',
      description: 'Our most popular introductory course for new potters',
      isPopular: true,
      features: [
        { text: '4-week course (8 hours)', included: true },
        { text: 'All materials included', included: true },
        { text: 'Up to 5 finished pieces', included: true },
        { text: 'Glazing included', included: true },
        { text: '2 hours studio access weekly', included: true },
        { text: 'Group instruction', included: true },
      ],
      buttonText: 'Enroll Now',
      buttonLink: '/book-course',
      isSecondary: false,
    },
    {
      id: 3,
      name: 'Studio Membership',
      price: 150,
      frequency: 'per month',
      description: 'For experienced potters who want regular studio access',
      isPopular: false,
      features: [
        { text: 'Unlimited studio hours', included: true },
        { text: 'Clay available for purchase', included: true },
        { text: 'Storage space included', included: true },
        { text: 'Glazing included', included: true },
        { text: 'Access to all equipment', included: true },
        { text: 'Monthly workshop included', included: true },
      ],
      buttonText: 'Join Now',
      buttonLink: '/contact',
      isSecondary: false,
    },
  ];

  return (
    <section id="pricing" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.titleSection}>
          <h2 className={styles.title}>Pricing Plans</h2>
          <p className={styles.description}>
            Choose the perfect plan that fits your pottery journey, from single sessions to monthly memberships.
          </p>
        </div>

        <div className={styles.pricingGrid}>
          {pricingPlans.map((plan) => (
            <div 
              key={plan.id} 
              className={`${styles.pricingCard} ${plan.isPopular ? styles.popularPlan : ''}`}
            >
              {plan.isPopular && <div className={styles.popularBadge}>Popular</div>}
              <div className={styles.cardHeader}>
                <h3 className={styles.planName}>{plan.name}</h3>
                <div className={styles.planPrice}>
                  <span className={styles.currency}>$</span>
                  {plan.price}
                  <span className={styles.frequency}>{plan.frequency}</span>
                </div>
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