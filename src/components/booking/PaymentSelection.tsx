import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Alert,
  RadioGroup,
  FormControlLabel,
  Radio,
  CircularProgress,
  Container
} from '@mui/material';
import PaymentIcon from '@mui/icons-material/Payment';
import ReceiptIcon from '@mui/icons-material/Receipt';

import BookingStepper, { BookingStep } from '../common/BookingStepper';
import BackToCourses from '../common/BackToCourses';
import StyledButton from '../common/StyledButton';

interface PaymentSelectionProps {
  courseId: string;
}

// Mock course data - will be replaced with API call
const mockCourseDetail = {
  id: '1',
  title: 'Helgkurs i Keramik',
  price: 1995,
};

const PaymentSelection: React.FC<PaymentSelectionProps> = ({ courseId }) => {
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState<'swish' | 'invoice'>('swish');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [courseDetail, setCourseDetail] = useState(mockCourseDetail);
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    // Load user information from previous step
    const storedUserInfo = localStorage.getItem('userInfo');
    if (storedUserInfo) {
      try {
        setUserInfo(JSON.parse(storedUserInfo));
      } catch (error) {
        console.error('Failed to parse user info', error);
      }
    }
    
    // In a real implementation, fetch course details from API
  }, [courseId]);

  const handlePaymentMethodChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPaymentMethod(event.target.value as 'swish' | 'invoice');
  };

  const handleBack = () => {
    router.push(`/book-course/${courseId}/personal-info`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // In a real implementation, this would be an API call to process payment
      // For demo purposes, we'll just simulate a delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Store payment information in localStorage for the confirmation page
      localStorage.setItem('paymentInfo', JSON.stringify({
        method: paymentMethod,
        amount: courseDetail.price,
        courseId: courseId,
        timestamp: new Date().toISOString(),
      }));
      
      // Navigate to confirmation page
      router.push(`/book-course/${courseId}/confirmation`);
    } catch (error) {
      setSubmitError('Det gick inte att genomföra betalningen. Försök igen senare.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ pt: 4, pb: 6 }} className="hide-navigation">
      <BackToCourses position="top" />
      <BookingStepper activeStep={BookingStep.PAYMENT} />
      
      <Typography variant="h4" component="h1" align="center" gutterBottom>
        Betalning
      </Typography>
      
      <Typography variant="body1" align="center" paragraph>
        Välj hur du vill betala för din bokning.
      </Typography>
      
      {submitError && (
        <Alert severity="error" sx={{ my: 2 }}>
          {submitError}
        </Alert>
      )}
      
      <Grid container spacing={4} sx={{ mt: 2 }}>
        <Grid item xs={12} md={8}>
          <Paper 
            elevation={3} 
            sx={{ 
              borderRadius: 2, 
              p: { xs: 2, sm: 4 }
            }}
          >
            <form onSubmit={handleSubmit}>
              <Typography variant="h6" gutterBottom>
                Välj betalningsmetod
              </Typography>
              
              <RadioGroup
                aria-label="payment-method"
                name="payment-method"
                value={paymentMethod}
                onChange={handlePaymentMethodChange}
              >
                <Paper 
                  elevation={1} 
                  sx={{ 
                    p: 2, 
                    mb: 2, 
                    borderRadius: 1,
                    border: paymentMethod === 'swish' ? '2px solid' : '1px solid',
                    borderColor: paymentMethod === 'swish' ? 'var(--primary)' : 'var(--border)'
                  }}
                >
                  <FormControlLabel
                    value="swish"
                    control={<Radio sx={{ 
                      color: 'var(--primary)',
                      '&.Mui-checked': {
                        color: 'var(--primary)',
                      }
                    }} />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PaymentIcon sx={{ mr: 1, color: 'var(--primary)' }} />
                        <Typography variant="subtitle1">Swish</Typography>
                      </Box>
                    }
                  />
                  {paymentMethod === 'swish' && (
                    <Box sx={{ ml: 4, mt: 1 }}>
                      <Typography variant="body2">
                        Du kommer få instruktioner för att Swisha betalningen efter din bokning.
                      </Typography>
                    </Box>
                  )}
                </Paper>
                
                <Paper 
                  elevation={1} 
                  sx={{ 
                    p: 2, 
                    mb: 2, 
                    borderRadius: 1,
                    border: paymentMethod === 'invoice' ? '2px solid' : '1px solid',
                    borderColor: paymentMethod === 'invoice' ? 'var(--primary)' : 'var(--border)'
                  }}
                >
                  <FormControlLabel
                    value="invoice"
                    control={<Radio sx={{ 
                      color: 'var(--primary)',
                      '&.Mui-checked': {
                        color: 'var(--primary)',
                      }
                    }} />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <ReceiptIcon sx={{ mr: 1, color: 'var(--primary)' }} />
                        <Typography variant="subtitle1">Faktura</Typography>
                      </Box>
                    }
                  />
                  {paymentMethod === 'invoice' && (
                    <Box sx={{ ml: 4, mt: 1 }}>
                      <Typography variant="body2">
                        En faktura kommer att skickas till din e-postadress efter din bokning. Betalningstid: 10 dagar.
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </RadioGroup>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                <StyledButton
                  secondary
                  onClick={handleBack}
                  disabled={isSubmitting}
                >
                  Tillbaka
                </StyledButton>
                
                <StyledButton
                  type="submit"
                  disabled={isSubmitting}
                  startIcon={isSubmitting ? <CircularProgress size={20} sx={{ color: 'white' }} /> : undefined}
                >
                  {isSubmitting ? 'Bearbetar...' : 'Slutför bokning'}
                </StyledButton>
              </Box>
            </form>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper 
            elevation={3} 
            sx={{ 
              borderRadius: 2, 
              p: { xs: 2, sm: 3 }
            }}
          >
            <Typography variant="h6" gutterBottom>
              Sammanfattning
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1">
                {courseDetail.title}
              </Typography>
              <Typography variant="h5" sx={{ color: 'var(--primary)', mt: 1 }}>
                {courseDetail.price} kr
              </Typography>
              <Typography variant="caption" display="block" color="text.secondary">
                Inklusive moms
              </Typography>
            </Box>
            
            {userInfo && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Kontaktinformation
                </Typography>
                <Typography variant="body2">
                  {userInfo.firstName} {userInfo.lastName}
                </Typography>
                <Typography variant="body2">
                  {userInfo.email}
                </Typography>
                <Typography variant="body2">
                  {userInfo.phone}
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default PaymentSelection; 