'use client';

import { useState } from 'react';
import styles from '@/styles/GiftCard.module.css';

interface CardType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const GiftCard = () => {
  const [cardType, setCardType] = useState<string>('digital');
  const [amount, setAmount] = useState<string>('100');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    senderName: '',
    senderEmail: '',
    recipientName: '',
    recipientEmail: '',
    message: '',
  });

  const cardTypes: CardType[] = [
    {
      id: 'digital',
      name: 'Digital Gift Card',
      description: 'Sent via email, instantly delivered',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="28" height="28">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'physical',
      name: 'Physical Gift Card',
      description: 'Mailed to recipient or pickup',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="28" height="28">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
        </svg>
      ),
    },
  ];

  const predefinedAmounts = ['50', '100', '150'];

  const handleCardTypeSelect = (id: string) => {
    setCardType(id);
  };

  const handleAmountSelect = (value: string) => {
    setAmount(value);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setCustomAmount(value);
      setAmount('custom');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false);
      alert('Gift card purchase successful!');
      setFormData({
        senderName: '',
        senderEmail: '',
        recipientName: '',
        recipientEmail: '',
        message: '',
      });
      setAmount('100');
      setCustomAmount('');
    }, 1500);
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.container}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>
            Give the Gift of <span className={styles.highlightText}>Creativity</span>
          </h1>
          <p className={styles.description}>
            Our gift cards are perfect for birthdays, holidays, or any special occasion. Recipients can use them for classes, workshops, or studio time.
          </p>
        </div>

        <div className={styles.content}>
          <div className={styles.giftCardImage}>
            {/* This would typically be an actual image */}
          </div>

          <div className={styles.cardOptions}>
            <h2 className={styles.cardOptionsTitle}>Customize Your Gift Card</h2>

            <div className={styles.cardTypeSection}>
              <h3 className={styles.sectionTitle}>Card Type</h3>
              <div className={styles.cardTypes}>
                {cardTypes.map((type) => (
                  <div 
                    key={type.id}
                    className={`${styles.cardType} ${cardType === type.id ? styles.cardTypeSelected : ''}`}
                    onClick={() => handleCardTypeSelect(type.id)}
                  >
                    <span className={styles.cardTypeIcon}>{type.icon}</span>
                    <span className={styles.cardTypeName}>{type.name}</span>
                    <span className={styles.cardTypeDesc}>{type.description}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.amountSection}>
              <h3 className={styles.sectionTitle}>Gift Amount</h3>
              <div className={styles.amounts}>
                {predefinedAmounts.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`${styles.amountButton} ${amount === value ? styles.amountSelected : ''}`}
                    onClick={() => handleAmountSelect(value)}
                  >
                    ${value}
                  </button>
                ))}
              </div>
              <div className={styles.customAmount}>
                <span className={styles.currencySymbol}>$</span>
                <input
                  type="text"
                  className={styles.customAmountInput}
                  placeholder="Enter custom amount"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                />
              </div>
            </div>

            <div className={styles.recipientSection}>
              <h3 className={styles.sectionTitle}>Recipient Information</h3>
              <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                  <label htmlFor="senderName" className={styles.label}>Your Name</label>
                  <input
                    type="text"
                    id="senderName"
                    name="senderName"
                    value={formData.senderName}
                    onChange={handleChange}
                    required
                    className={styles.input}
                    placeholder="Your full name"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="senderEmail" className={styles.label}>Your Email</label>
                  <input
                    type="email"
                    id="senderEmail"
                    name="senderEmail"
                    value={formData.senderEmail}
                    onChange={handleChange}
                    required
                    className={styles.input}
                    placeholder="your.email@example.com"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="recipientName" className={styles.label}>Recipient's Name</label>
                  <input
                    type="text"
                    id="recipientName"
                    name="recipientName"
                    value={formData.recipientName}
                    onChange={handleChange}
                    required
                    className={styles.input}
                    placeholder="Recipient's full name"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="recipientEmail" className={styles.label}>Recipient's Email</label>
                  <input
                    type="email"
                    id="recipientEmail"
                    name="recipientEmail"
                    value={formData.recipientEmail}
                    onChange={handleChange}
                    required={cardType === 'digital'}
                    className={styles.input}
                    placeholder="recipient.email@example.com"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="message" className={styles.label}>Personal Message</label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    className={styles.textarea}
                    placeholder="Add a personal message to the recipient..."
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Processing...' : `Purchase Gift Card ${amount === 'custom' ? '$' + customAmount : '$' + amount}`}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className={styles.featureSection}>
          <h2 className={styles.featureTitle}>Why Our Gift Cards?</h2>
          <p className={styles.featureDesc}>
            Studio Clay gift cards provide the perfect opportunity to introduce someone to the joy of working with clay or support their creative journey.
          </p>
          
          <div className={styles.features}>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className={styles.featureName}>Valid for 12 Months</h3>
              <p className={styles.featureText}>
                Recipients have a full year to use their gift card, giving them plenty of time to find the perfect class or workshop.
              </p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className={styles.featureName}>Full Flexibility</h3>
              <p className={styles.featureText}>
                Can be used for any of our classes, workshops, studio time, or even merchandise in our clay shop.
              </p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                </svg>
              </div>
              <h3 className={styles.featureName}>Personalized Experience</h3>
              <p className={styles.featureText}>
                Add a custom message and choose between digital delivery or a physical card to make it extra special.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GiftCard; 