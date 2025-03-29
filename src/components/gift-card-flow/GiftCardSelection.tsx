'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Paper, 
  Typography, 
  Box, 
  Grid, 
  TextField, 
  Radio, 
  RadioGroup, 
  FormControlLabel, 
  FormControl, 
  FormLabel,
  Button,
  Card,
  CardContent,
  Alert,
  useMediaQuery,
  useTheme
} from '@mui/material';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import PersonIcon from '@mui/icons-material/Person';
import FlowStepWrapper from '../common/FlowStepWrapper';
import { FlowType, GenericStep } from '../common/BookingStepper';
import StyledButton from '../common/StyledButton';
import { setFlowType } from '@/utils/flowStorage';
import { saveItemDetails } from '@/utils/dataFetcher';
import styles from '@/styles/GiftCard.module.css';

interface GiftCardSelectionProps {
  onNext?: (data: any) => void;
}

interface RecipientInfo {
  name: string;
  email: string;
  message?: string;
}

interface FormErrors {
  amount?: string;
  recipientName?: string;
  recipientEmail?: string;
}

// Define gift card amounts
const GIFT_CARD_AMOUNTS = [
  { value: '500', label: '500 kr' },
  { value: '1000', label: '1 000 kr' },
  { value: '1500', label: '1 500 kr' },
  { value: '2000', label: '2 000 kr' },
  { value: 'custom', label: 'Eget belopp' }
];

const GiftCardSelection: React.FC<GiftCardSelectionProps> = ({ onNext }) => {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Initialize flow type immediately
  setFlowType(FlowType.GIFT_CARD);
  
  const [amount, setAmount] = useState<string>('1000');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [recipient, setRecipient] = useState<RecipientInfo>({
    name: '',
    email: '',
    message: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    // Initialize flow type again to ensure it persists
    setFlowType(FlowType.GIFT_CARD);
  }, []);

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(event.target.value);
    setErrors(prev => ({ ...prev, amount: undefined }));
  };

  const handleCustomAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCustomAmount(event.target.value);
    if (amount === 'custom') {
      setErrors(prev => ({ ...prev, amount: undefined }));
    }
  };

  const handleRecipientChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setRecipient(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
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
      type: 'gift-card',
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
    <Box>
      <div className={styles.mainContent}>
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
              <div className={styles.amountSection}>
                <h3 className={styles.sectionTitle}>Välj belopp för presentkortet</h3>
                <div className={styles.amounts}>
                  {GIFT_CARD_AMOUNTS.filter(item => item.value !== 'custom').map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={`${styles.amountButton} ${amount === item.value ? styles.amountSelected : ''}`}
                      onClick={() => setAmount(item.value)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className={styles.customAmount}>
                  <input
                    type="text"
                    className={styles.customAmountInput}
                    placeholder="Ange valfritt belopp"
                    value={customAmount}
                    onChange={(e) => {
                      if (/^\d*$/.test(e.target.value)) {
                        setCustomAmount(e.target.value);
                        setAmount('custom');
                      }
                    }}
                  />
                  <span className={styles.currencySymbol}>kr</span>
                </div>
                {errors.amount && (
                  <Typography color="error" variant="caption">{errors.amount}</Typography>
                )}
              </div>
            </div>
          </div>

          <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mb: 3,
              borderBottom: '1px solid #e0e0e0',
              pb: 2 
            }}>
              <PersonIcon sx={{ mr: 1, color: 'var(--primary)' }} />
              <Typography variant="h6">Mottagarens uppgifter</Typography>
            </Box>
            
            <FormControl fullWidth sx={{ mb: 3 }}>
              <TextField
                label="Mottagarens namn"
                variant="outlined"
                fullWidth
                name="name"
                value={recipient.name}
                onChange={handleRecipientChange}
                margin="normal"
                error={!!errors.recipientName}
                helperText={errors.recipientName}
              />
              
              <TextField
                label="Mottagarens e-postadress"
                variant="outlined"
                fullWidth
                name="email"
                value={recipient.email}
                onChange={handleRecipientChange}
                margin="normal"
                error={!!errors.recipientEmail}
                helperText={errors.recipientEmail}
              />
              
              <TextField
                label="Personligt meddelande (valfritt)"
                variant="outlined"
                fullWidth
                name="message"
                value={recipient.message}
                onChange={handleRecipientChange}
                margin="normal"
                multiline
                rows={4}
              />
            </FormControl>
          </Paper>
        </div>
      </div>
      
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <StyledButton onClick={handleNext}>
          Fortsätt
        </StyledButton>
      </Box>
    </Box>
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