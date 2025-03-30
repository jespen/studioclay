'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Typography, Paper, Box, TextField, InputAdornment, Divider } from '@mui/material';
import FlowStepWrapper from '../common/FlowStepWrapper';
import { FlowType, GenericStep } from '../common/BookingStepper';
import StyledButton from '../common/StyledButton';
import { setFlowType } from '@/utils/flowStorage';
import { saveItemDetails, saveGiftCardDetails } from '@/utils/dataFetcher';
import { getNextStepUrl } from '@/utils/flowNavigation';
import styles from '@/styles/GiftCardSelection.module.css';

interface GiftCardSelectionProps {
  onNext?: (data: any) => void;
}

const GiftCardSelection: React.FC<GiftCardSelectionProps> = ({ onNext }) => {
  const router = useRouter();
  
  // Initialize flow type immediately
  setFlowType(FlowType.GIFT_CARD);
  
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

  const predefinedAmounts = ['500', '1000', '2000'];

  useEffect(() => {
    // Initialize flow type again to ensure it persists
    setFlowType(FlowType.GIFT_CARD);
  }, []);

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

  const handleRecipientChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
    const finalAmount = amount === 'custom' ? customAmount : amount;
    if (!finalAmount || parseInt(finalAmount) <= 0) {
      newErrors.amount = 'Vänligen ange ett giltigt belopp';
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
    const finalAmount = amount === 'custom' ? parseInt(customAmount) : parseInt(amount);
    
    // Ensure we have a valid amount (default to 500 if somehow invalid)
    if (!finalAmount || finalAmount <= 0) {
      setErrors({ amount: 'Vänligen ange ett giltigt belopp' });
      return;
    }
    
    // Store gift card details
    const giftCardDetails = {
      amount: finalAmount,
      type: 'digital',
      recipientName: recipient.name,
      recipientEmail: recipient.email,
      message: recipient.message
    };
    
    // Save details to all storage mechanisms for maximum compatibility
    saveGiftCardDetails(giftCardDetails);
    
    console.log('Gift card details saved:', giftCardDetails);

    // For backwards compatibility with PaymentSelection, also save as a "course"
    const fakeGiftCardCourse = {
      id: "gift-card",
      title: "Presentkort",
      description: `Presentkort på ${finalAmount} kr`,
      price: finalAmount,
      currency: "SEK",
      max_participants: 1,
      current_participants: 0
    };
    
    // Navigate to next step
    if (onNext) {
      onNext(giftCardDetails);
    } else {
      // Use flowNavigation to get the correct URL
      const nextUrl = getNextStepUrl(GenericStep.ITEM_SELECTION, FlowType.GIFT_CARD);
      if (nextUrl) {
        router.push(nextUrl);
      }
    }
  };

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        borderRadius: 2, 
        p: { xs: 2, sm: 4 }, 
        mt: 4 
      }}
    >
      {/* Gift Card header */}
      <Typography variant="h4" component="h2" gutterBottom sx={{ color: 'var(--primary)' }}>
        Digitalt Presentkort
      </Typography>

      <Typography variant="body1" paragraph>
        Ge bort en kreativ upplevelse från Studio Clay. Presentkortet är giltigt i 12 månader och kan användas till kurser, workshops, studiotid eller produkter.
      </Typography>

      {/* Gift Card Preview */}
      <Box className={styles.giftCardImageContainer} sx={{ my: 4, borderRadius: 2, overflow: 'hidden' }}>
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
      </Box>
      
      <Divider sx={{ my: 3 }} />

      {/* Amount Selection */}
      <Typography variant="h6" gutterBottom>
        Välj belopp
      </Typography>
      
      <Box className={styles.amountSection}>
        <Box className={styles.amountButtons}>
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
        </Box>
        
        <Box mt={2}>
          <TextField
            fullWidth
            placeholder="Ange valfritt belopp"
            variant="outlined"
            value={customAmount}
            onChange={handleCustomAmountChange}
            InputProps={{
              endAdornment: <InputAdornment position="end">kr</InputAdornment>,
            }}
            error={!!errors.amount}
            helperText={errors.amount}
          />
        </Box>
      </Box>
      
      <Divider sx={{ my: 3 }} />

      {/* Recipient Information */}
      <Typography variant="h6" gutterBottom>
        Mottagarinformation
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          label="Mottagarens namn"
          variant="outlined"
          name="name"
          value={recipient.name}
          onChange={handleRecipientChange}
          margin="normal"
          error={!!errors.recipientName}
          helperText={errors.recipientName}
          required
        />
        
        <TextField
          fullWidth
          label="Mottagarens e-postadress"
          variant="outlined"
          name="email"
          value={recipient.email}
          onChange={handleRecipientChange}
          margin="normal"
          error={!!errors.recipientEmail}
          helperText={errors.recipientEmail}
          required
        />
        
        <TextField
          fullWidth
          label="Personligt meddelande (valfritt)"
          variant="outlined"
          name="message"
          value={recipient.message}
          onChange={handleRecipientChange}
          margin="normal"
          multiline
          rows={4}
          placeholder="Lägg till en personlig hälsning till mottagaren..."
        />
      </Box>
      
      <Divider sx={{ my: 3 }} />

      {/* Features */}
      <Typography variant="h6" gutterBottom>
        Varför våra presentkort?
      </Typography>
      
      <Box className={styles.featureList}>
        <Box className={styles.featureItem}>
          <Box className={styles.featureIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </Box>
          <Box className={styles.featureText}>
            <Typography variant="subtitle1">Giltigt i 12 månader</Typography>
            <Typography variant="body2" color="text.secondary">
              Mottagaren har ett helt år på sig att använda presentkortet.
            </Typography>
          </Box>
        </Box>
        
        <Box className={styles.featureItem}>
          <Box className={styles.featureIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </Box>
          <Box className={styles.featureText}>
            <Typography variant="subtitle1">Full flexibilitet</Typography>
            <Typography variant="body2" color="text.secondary">
              Kan användas till kurser, workshops, studiotid eller produkter i butiken.
            </Typography>
          </Box>
        </Box>
        
        <Box className={styles.featureItem}>
          <Box className={styles.featureIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
            </svg>
          </Box>
          <Box className={styles.featureText}>
            <Typography variant="subtitle1">Personlig upplevelse</Typography>
            <Typography variant="body2" color="text.secondary">
              Lägg till ett personligt meddelande till mottagaren.
            </Typography>
          </Box>
        </Box>
      </Box>
      
      {/* Price display */}
      <Divider sx={{ my: 3 }} />
      
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Presentkortspris
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 1 }}>
          <Typography variant="h4" sx={{ color: 'var(--primary)', mr: 1 }}>
            {amount === 'custom' ? customAmount || '0' : amount} kr
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Inklusive moms
          </Typography>
        </Box>
      </Box>

      {/* Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <StyledButton 
          secondary 
          onClick={() => {
            // Use flowNavigation to go back to home
            router.push('/');
          }}
          sx={{ mr: 2 }}
        >
          Avbryt
        </StyledButton>
        
        <StyledButton 
          onClick={handleNext}
        >
          Fortsätt till dina uppgifter
        </StyledButton>
      </Box>
    </Paper>
  );
};

const GiftCardSelectionWrapper = () => {
  return (
    <FlowStepWrapper
      flowType={FlowType.GIFT_CARD}
      activeStep={GenericStep.ITEM_SELECTION}
      title="Välj presentkort"
      subtitle="Anpassa presentkortet med önskat belopp"
      validateData={() => true}
    >
      {(props) => <GiftCardSelection onNext={props.onNext} />}
    </FlowStepWrapper>
  );
};

export default GiftCardSelectionWrapper; 