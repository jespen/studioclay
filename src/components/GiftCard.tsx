'use client';

import { useState } from 'react';
import styles from '@/styles/GiftCard.module.css';
import Link from 'next/link';

interface CardType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const GiftCard = () => {
  const [cardType, setCardType] = useState<string>('digital');
  const [amount, setAmount] = useState<string>('500');
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
      name: 'Digitalt Presentkort',
      description: 'Skickas direkt via e-post',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="28" height="28">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'physical',
      name: 'Fysiskt Presentkort',
      description: 'Skickas med post eller hämtas i studion',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="28" height="28">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
        </svg>
      ),
    },
  ];

  const predefinedAmounts = ['500', '1000', '2000'];

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Calculate expiration date (1 year from now)
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      
      // Format amount properly
      const amountValue = amount === 'custom' 
        ? parseFloat(customAmount) || 0
        : parseFloat(amount);
      
      if (amountValue <= 0) {
        throw new Error('Vänligen ange ett giltigt belopp');
      }
      
      console.log('Submitting gift card with data:', {
        amount: amountValue,
        type: cardType,
        sender_name: formData.senderName,
        sender_email: formData.senderEmail,
        recipient_name: formData.recipientName,
        recipient_email: formData.recipientEmail,
        message: formData.message
      });
      
      // Create a gift card object
      const giftCardData = {
        amount: amountValue,
        type: cardType,
        sender_name: formData.senderName,
        sender_email: formData.senderEmail,
        recipient_name: formData.recipientName,
        recipient_email: formData.recipientEmail,
        message: formData.message,
      };
      
      // Use server API endpoint instead of direct Supabase access
      const response = await fetch('/api/gift-cards/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(giftCardData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create gift card');
      }
      
      const result = await response.json();
      console.log('Gift card created successfully:', result);
      
      // Success! Show confirmation message
      alert(`Presentkortsköp genomfört! Ditt presentkort har skapats.`);
      
      // Reset form
      setFormData({
        senderName: '',
        senderEmail: '',
        recipientName: '',
        recipientEmail: '',
        message: '',
      });
      setAmount('500');
      setCustomAmount('');
    } catch (error) {
      console.error('Error submitting gift card:', error);
      
      // Show more detailed error information
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        alert('Det gick inte att slutföra köpet: ' + error.message);
      } else {
        console.error('Non-Error object thrown:', error);
        console.error('Error type:', typeof error);
        console.error('Error JSON stringified:', JSON.stringify(error));
        
        // Special handling for empty error objects
        if (typeof error === 'object' && Object.keys(error || {}).length === 0) {
          console.error('Empty error object received. This could indicate a network issue or CORS problem.');
          alert('Serverfel: Kunde inte ansluta till databasen. Kontrollera din internetanslutning eller försök igen senare.');
        } else {
          alert('Ett oväntat fel inträffade. Försök igen eller kontakta kundtjänst. Se konsolen för detaljer.');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.container}>
        <div className={styles.backLinkContainer}>
          <Link href="/" className={styles.backLink}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Tillbaka till startsidan
          </Link>
        </div>

        <header className={styles.titleSection}>
          <h1 className={styles.title}>
            Ge bort en <span className={styles.highlightText}>Kreativ</span> upplevelse
          </h1>
          <p className={styles.description}>
            Våra presentkort är perfekta för födelsedagar, högtider eller andra speciella tillfällen. Mottagaren kan använda dem till kurser, workshops eller studiotid.
          </p>
        </header>

        <main className={styles.mainContent}>
          <div className={styles.giftCardContainer}>
            <div className={styles.giftCardPreview}>
              <div className={styles.giftCardImageContainer}>
                <img 
                  src="/pictures/finavaser.jpg"
                  alt="Studio Clay presentkort"
                  className={styles.giftCardImage}
                />
                <div className={styles.giftCardImageOverlay}>
                  <div className={styles.giftCardLabel}>Presentkort</div>
                  <div className={styles.giftCardAmount}>
                    {amount === 'custom' ? `${customAmount} kr` : `${amount} kr`}
                  </div>
                </div>
              </div>
              
              <div className={styles.giftCardInfo}>
                <div className={styles.cardTypeContainer}>
                  <h3 className={styles.sectionTitle}>Korttyp</h3>
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
                  <h3 className={styles.sectionTitle}>Belopp</h3>
                  <div className={styles.amounts}>
                    {predefinedAmounts.map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`${styles.amountButton} ${amount === value ? styles.amountSelected : ''}`}
                        onClick={() => handleAmountSelect(value)}
                      >
                        {value} kr
                      </button>
                    ))}
                  </div>
                  <div className={styles.customAmount}>
                    <input
                      type="text"
                      className={styles.customAmountInput}
                      placeholder="Ange valfritt belopp"
                      value={customAmount}
                      onChange={handleCustomAmountChange}
                    />
                    <span className={styles.currencySymbol}>kr</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>Kundinformation</h3>
              <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="senderName" className={styles.label}>Ditt namn</label>
                    <input
                      type="text"
                      id="senderName"
                      name="senderName"
                      value={formData.senderName}
                      onChange={handleChange}
                      required
                      className={styles.input}
                      placeholder="Ditt fullständiga namn"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="senderEmail" className={styles.label}>Din e-post</label>
                    <input
                      type="email"
                      id="senderEmail"
                      name="senderEmail"
                      value={formData.senderEmail}
                      onChange={handleChange}
                      required
                      className={styles.input}
                      placeholder="din.epost@exempel.se"
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="recipientName" className={styles.label}>Mottagarens namn</label>
                    <input
                      type="text"
                      id="recipientName"
                      name="recipientName"
                      value={formData.recipientName}
                      onChange={handleChange}
                      required
                      className={styles.input}
                      placeholder="Mottagarens fullständiga namn"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="recipientEmail" className={styles.label}>Mottagarens e-post (valfritt)</label>
                    <input
                      type="email"
                      id="recipientEmail"
                      name="recipientEmail"
                      value={formData.recipientEmail}
                      onChange={handleChange}
                      className={styles.input}
                      placeholder="mottagare.epost@exempel.se"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="message" className={styles.label}>Personligt meddelande</label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    className={styles.textarea}
                    placeholder="Lägg till en personlig hälsning till mottagaren..."
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Bearbetar...' : `Köp presentkort ${amount === 'custom' ? customAmount + ' kr' : amount + ' kr'}`}
                </button>
              </form>
            </div>
          </div>
        </main>

        <footer className={styles.featureSection}>
          <h2 className={styles.featureTitle}>Varför våra presentkort?</h2>
          <p className={styles.featureDesc}>
            Studio Clay presentkort ger den perfekta möjligheten att introducera någon till glädjen i att arbeta med lera eller stödja deras kreativa resa.
          </p>
          
          <div className={styles.features}>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className={styles.featureName}>Giltigt i 12 månader</h3>
              <p className={styles.featureText}>
                Mottagaren har ett helt år på sig att använda presentkortet, vilket ger gott om tid att hitta den perfekta kursen eller workshopen.
              </p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className={styles.featureName}>Full flexibilitet</h3>
              <p className={styles.featureText}>
                Kan användas till alla våra kurser, workshops, studiotid eller till och med produkter i vår butik.
              </p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                </svg>
              </div>
              <h3 className={styles.featureName}>Personlig upplevelse</h3>
              <p className={styles.featureText}>
                Lägg till ett personligt meddelande och välj mellan digital leverans eller ett fysiskt kort för att göra det extra speciellt.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default GiftCard; 