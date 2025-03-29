'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Typography, Box } from '@mui/material';
import FlowStepWrapper from '../common/FlowStepWrapper';
import { FlowType, GenericStep } from '../common/BookingStepper';
import StyledButton from '../common/StyledButton';
import { setFlowType } from '@/utils/flowStorage';
import { saveItemDetails } from '@/utils/dataFetcher';
import styles from '@/styles/GiftCard.module.css';
import Link from 'next/link';

interface GiftCardSelectionProps {
  onNext?: (data: any) => void;
}

interface CardType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const GiftCardSelection: React.FC<GiftCardSelectionProps> = ({ onNext }) => {
  const router = useRouter();
  
  // Initialize flow type immediately
  setFlowType(FlowType.GIFT_CARD);
  
  const [cardType, setCardType] = useState<string>('digital');
  const [amount, setAmount] = useState<string>('500');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [recipient, setRecipient] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [errors, setErrors] = useState<{
    amount?: string;
    recipientName?: string;
    recipientEmail?: string;
  }>({});

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

  useEffect(() => {
    // Initialize flow type again to ensure it persists
    setFlowType(FlowType.GIFT_CARD);
  }, []);

  const handleCardTypeSelect = (id: string) => {
    setCardType(id);
  };

  const handleAmountSelect = (value: string) => {
    setAmount(value);
    setCustomAmount('');
    setErrors(prev => ({ ...prev, amount: undefined }));
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setCustomAmount(value);
      setAmount('custom');
      setErrors(prev => ({ ...prev, amount: undefined }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRecipient(prev => ({ ...prev, [name]: value }));
    
    // Clear error for the field being changed
    if (name === 'name') {
      setErrors(prev => ({ ...prev, recipientName: undefined }));
    } else if (name === 'email') {
      setErrors(prev => ({ ...prev, recipientEmail: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: {
      amount?: string;
      recipientName?: string;
      recipientEmail?: string;
    } = {};
    
    // Validate amount
    if (amount === 'custom') {
      if (!customAmount) {
        newErrors.amount = 'Vänligen ange ett belopp';
      } else if (isNaN(Number(customAmount)) || Number(customAmount) < 100) {
        newErrors.amount = 'Beloppet måste vara minst 100 kr';
      }
    }
    
    // Validate recipient info
    if (!recipient.name) {
      newErrors.recipientName = 'Vänligen ange mottagarens namn';
    }
    
    if (!recipient.email) {
      newErrors.recipientEmail = 'Vänligen ange mottagarens e-postadress';
    } else if (!/\S+@\S+\.\S+/.test(recipient.email)) {
      newErrors.recipientEmail = 'Vänligen ange en giltig e-postadress';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateForm()) {
      return;
    }
    
    // Calculate final amount
    const finalAmount = amount === 'custom' ? customAmount : amount;
    
    // Store gift card details
    const giftCardDetails = {
      amount: finalAmount,
      type: cardType,
      recipientName: recipient.name,
      recipientEmail: recipient.email,
      message: recipient.message
    };
    
    // Save details to flow storage
    saveItemDetails(giftCardDetails);

    // For backwards compatibility with PaymentSelection, also save as a "course"
    const fakeGiftCardCourse = {
      id: "gift-card",
      title: "Presentkort",
      description: `Presentkort på ${finalAmount} kr`,
      price: parseInt(finalAmount),
      currency: "SEK",
      max_participants: 1,
      current_participants: 0
    };
    
    // Navigate to next step
    if (onNext) {
      onNext(giftCardDetails);
    } else {
      router.push('/gift-card-flow/personal-info');
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.container}>
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
                    {amount === 'custom' ? `${customAmount || '0'} kr` : `${amount} kr`}
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
                  {errors.amount && (
                    <Typography color="error" variant="caption">{errors.amount}</Typography>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>Mottagarens uppgifter</h3>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="name" className={styles.label}>Mottagarens namn</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={recipient.name}
                    onChange={handleChange}
                    required
                    className={styles.input}
                    placeholder="Mottagarens fullständiga namn"
                  />
                  {errors.recipientName && (
                    <Typography color="error" variant="caption">{errors.recipientName}</Typography>
                  )}
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="email" className={styles.label}>Mottagarens e-post</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={recipient.email}
                    onChange={handleChange}
                    required={cardType === 'digital'}
                    className={styles.input}
                    placeholder="mottagare.epost@exempel.se"
                  />
                  {errors.recipientEmail && (
                    <Typography color="error" variant="caption">{errors.recipientEmail}</Typography>
                  )}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="message" className={styles.label}>Personligt meddelande</label>
                <textarea
                  id="message"
                  name="message"
                  value={recipient.message}
                  onChange={handleChange}
                  className={styles.textarea}
                  placeholder="Lägg till en personlig hälsning till mottagaren..."
                ></textarea>
              </div>
              
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                <StyledButton onClick={handleNext}>
                  Fortsätt till betalning
                </StyledButton>
              </Box>
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

const GiftCardSelectionWrapper = () => {
  return (
    <FlowStepWrapper
      flowType={FlowType.GIFT_CARD}
      activeStep={GenericStep.ITEM_SELECTION}
      title="Presentkort"
      subtitle="Välj belopp och ange mottagarens uppgifter"
      validateData={() => true}
    >
      {(props) => <GiftCardSelection onNext={props.onNext} />}
    </FlowStepWrapper>
  );
};

export default GiftCardSelectionWrapper; 