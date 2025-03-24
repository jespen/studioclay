'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Typography, Paper, Box, TextField, InputAdornment, Divider } from '@mui/material';
import GenericFlowContainer from '../common/GenericFlowContainer';
import { FlowType, GenericStep } from '../common/BookingStepper';
import StyledButton from '../common/StyledButton';
import styles from '@/styles/GiftCardSelection.module.css';

const GiftCardSelection = () => {
  const router = useRouter();
  const [amount, setAmount] = useState<string>('500');
  const [customAmount, setCustomAmount] = useState<string>('');

  const predefinedAmounts = ['500', '1000', '2000'];

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

  const handleContinue = () => {
    const finalAmount = amount === 'custom' ? customAmount : amount;
    
    // Validate amount
    if (!finalAmount || parseFloat(finalAmount) <= 0) {
      alert('Vänligen ange ett giltigt belopp');
      return;
    }
    
    // Store selected amount in sessionStorage for later steps
    sessionStorage.setItem('giftCardAmount', finalAmount);
    sessionStorage.setItem('giftCardType', 'digital');
    
    // Navigate to next step
    router.push('/gift-card-flow/recipient');
  };

  return (
    <GenericFlowContainer
      activeStep={GenericStep.ITEM_SELECTION}
      flowType={FlowType.GIFT_CARD}
      title="Välj presentkort"
      subtitle="Anpassa presentkortet med önskat belopp"
    >
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
              {amount === 'custom' ? `${customAmount} kr` : `${amount} kr`}
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
            />
          </Box>
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
                Lägg till ett personligt meddelande till mottagaren i nästa steg.
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
            onClick={() => router.push('/')}
          >
            Tillbaka
          </StyledButton>
          
          <StyledButton 
            onClick={handleContinue}
          >
            Fortsätt till dina uppgifter
          </StyledButton>
        </Box>
      </Paper>
    </GenericFlowContainer>
  );
};

export default GiftCardSelection; 