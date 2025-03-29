/**
 * PaymentSelection Component
 * 
 * This component handles the payment selection and processing flow in the booking process.
 * It coordinates between different payment methods (Swish and Invoice) and their respective components.
 * 
 * Component Structure:
 * - PaymentSelection (this file)
 *   ├── Swish Flow/
 *   │   ├── SwishPaymentSection.tsx # Swish coordinator
 *   │   ├── SwishPaymentForm.tsx    # Phone number input
 *   │   └── SwishPaymentDialog.tsx  # Payment status
 *   │
 *   └── Invoice Flow/
 *       ├── InvoicePaymentSection.tsx # Invoice coordinator
 *       ├── InvoicePaymentForm.tsx    # Address input
 *       └── InvoicePaymentDialog.tsx  # Payment status
 */

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Card, 
  CardContent, 
  Radio, 
  RadioGroup, 
  FormControlLabel, 
  FormControl, 
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  TextField,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';

import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import PeopleIcon from '@mui/icons-material/People';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import HomeIcon from '@mui/icons-material/Home';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import MarkunreadMailboxIcon from '@mui/icons-material/MarkunreadMailbox';

import { GenericStep, FlowType } from '../common/BookingStepper';
import GenericFlowContainer from '../common/GenericFlowContainer';
import StyledButton from '../common/StyledButton';
import { FormCheckboxField, FormTextField } from '../common/FormField';
import { sendBookingConfirmationEmail } from '@/utils/confirmationEmail';
import { v4 as uuidv4 } from 'uuid';
import SwishPaymentSection, { SwishPaymentSectionRef } from './SwishPaymentSection';
import InvoicePaymentSection, { InvoicePaymentSectionRef } from './InvoicePaymentSection';
import { PaymentMethod, PaymentDetails, BaseFormErrors, InvoiceDetails } from '@/types/payment';
import { setPaymentInfo } from '@/utils/flowStorage';
import { FlowStateData } from '../common/FlowStepWrapper';

interface PaymentSelectionProps {
  courseId: string;
  activeStep?: number;
  flowType?: FlowType;
  onNext?: (data?: any) => void;
  onBack?: () => void;
  flowData?: FlowStateData;
}

interface UserInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  numberOfParticipants: string;
  specialRequirements?: string;
}

const PaymentSelection: React.FC<PaymentSelectionProps> = ({ 
  courseId, 
  activeStep, 
  flowType = FlowType.COURSE_BOOKING,
  onNext,
  onBack,
  flowData
}) => {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [courseDetail, setCourseDetail] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({
    method: 'swish'
  });
  
  const [formErrors, setFormErrors] = useState<BaseFormErrors>({});
  const swishPaymentRef = useRef<SwishPaymentSectionRef>(null);
  const invoicePaymentRef = useRef<InvoicePaymentSectionRef>(null);

  useEffect(() => {
    // Use flowData if available, fall back to localStorage for backwards compatibility
    if (flowData) {
      setUserInfo(flowData.userInfo as UserInfo);
      setCourseDetail(flowData.itemDetails);
      return;
    }
    
    // Fallback to localStorage
    const storedUserInfo = localStorage.getItem('userInfo');
    const storedCourseDetail = localStorage.getItem('courseDetail');
    
    if (storedUserInfo) {
      setUserInfo(JSON.parse(storedUserInfo));
    }
    
    if (storedCourseDetail) {
      setCourseDetail(JSON.parse(storedCourseDetail));
    }
  }, [flowData]);

  const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPaymentDetails(prev => ({ 
      ...prev, 
      [name]: value,
      // Initialize invoiceDetails when switching to invoice
      ...(value === 'invoice' && !prev.invoiceDetails ? {
        invoiceDetails: {
          address: '',
          postalCode: '',
          city: '',
          reference: ''
        }
      } : {})
    }));
    // Clear error when user selects
    if (formErrors[name as keyof BaseFormErrors]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleInvoiceDetailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    console.log('Invoice detail change:', name, value);
    
    setPaymentDetails(prev => ({
      ...prev,
      invoiceDetails: {
        ...prev.invoiceDetails as InvoiceDetails,
        [name]: value
      }
    }));
    
    // Clear error when user types
    const errorKey = `invoiceDetails.${name}` as keyof BaseFormErrors;
    if (formErrors[errorKey]) {
      setFormErrors(prev => ({ ...prev, [errorKey]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: BaseFormErrors = {};
    
    if (!paymentDetails.method) {
      newErrors.paymentMethod = 'Välj betalningsmetod';
    }

    // Each payment section handles its own validation
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      let success = false;
      
      if (paymentDetails.method === 'swish') {
        // For Swish, we just need to trigger the payment creation
        // The dialog and status handling is managed by SwishPaymentSection
        success = await swishPaymentRef.current?.handleCreatePayment() || false;
        
        if (success) {
          // Store payment info
          const paymentInfo = {
            status: 'completed',
            amount: calculatePrice(),
            payment_method: 'swish',
            payment_date: new Date().toISOString(),
            reference: uuidv4()
          };
          handlePaymentComplete(paymentInfo);
        }
      } else if (paymentDetails.method === 'invoice') {
        // For Invoice, we trigger the payment creation and wait for success
        // The InvoicePaymentSection handles the validation and creation
        success = await invoicePaymentRef.current?.handleCreatePayment() || false;
        
        if (success) {
          // Store payment info
          const paymentInfo = {
            status: 'pending',
            amount: calculatePrice(),
            payment_method: 'invoice',
            payment_date: new Date().toISOString(),
            reference: uuidv4()
          };
          handlePaymentComplete(paymentInfo);
        }
      }

      // Only show error if both payment methods failed
      if (!success) {
        setSubmitError('Det gick inte att skapa betalningen. Försök igen senare.');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setSubmitError('Det gick inte att skapa betalningen. Försök igen senare.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (flowType === FlowType.GIFT_CARD) {
      router.push('/gift-card-flow/personal-info');
    } else {
      router.push(`/book-course/${courseId}/personal-info`);
    }
  };

  // Calculate price based on number of participants
  const calculatePrice = () => {
    if (!userInfo || !courseDetail || !courseDetail.price) return 0;
    const numParticipants = parseInt(userInfo.numberOfParticipants) || 1;
    return courseDetail.price * numParticipants;
  };

  // Get the appropriate Swish logo based on theme
  const swishLogoSrc = prefersDarkMode 
    ? '/Swish Logo Secondary Dark-BG SVG.svg'
    : '/Swish Logo Secondary Light-BG SVG.svg';

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      // Clean up any stored payment references when navigating away
      localStorage.removeItem('currentPaymentReference');
    };
  }, []);

  const handlePaymentComplete = (paymentInfo: any) => {
    // Store payment info in flow storage
    setPaymentInfo(paymentInfo);
    
    // Use the onNext callback if provided (new flow system)
    if (onNext) {
      onNext(paymentInfo);
    } else {
      // Legacy navigation
      if (flowType === FlowType.COURSE_BOOKING) {
        router.push(`/book-course/${courseId}/confirmation`);
      } else if (flowType === FlowType.GIFT_CARD) {
        router.push('/gift-card-flow/confirmation');
      }
    }
  };

  // Extract the payment form content to be reused
  const renderPaymentContent = () => (
    <Grid container spacing={4}>
      <Grid item xs={12} md={7}>
        <Typography variant="h6" gutterBottom>
          Betalningsmetod
        </Typography>
        
        <form onSubmit={handleSubmit}>
          <FormControl component="fieldset" fullWidth>
            <RadioGroup
              aria-label="payment-method"
              name="method"
              value={paymentDetails.method}
              onChange={handleRadioChange}
            >
              {/* Swish Payment Option */}
              <Card 
                variant="outlined" 
                sx={{ 
                  mb: 2, 
                  border: paymentDetails.method === 'swish' ? '2px solid' : '1px solid', 
                  borderColor: paymentDetails.method === 'swish' ? 'var(--primary)' : 'divider',
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                <CardContent>
                  <FormControlLabel 
                    value="swish" 
                    control={
                      <Radio 
                        sx={{
                          color: 'rgba(0, 0, 0, 0.6)',
                          '&.Mui-checked': {
                            color: 'var(--primary)',
                          },
                        }}
                      />
                    } 
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography>Betala med Swish</Typography>
                      </Box>
                      
                    } 
                    sx={{ width: '100%' }}
                  />      
                  <Box sx={{ mt: 2, height: 30, width: 100, position: 'relative' }}>
                    <Image
                      src={swishLogoSrc}
                      alt="Swish"
                      fill
                      style={{ objectFit: 'contain' }}
                    />
                  </Box>
                  {paymentDetails.method === 'swish' && userInfo && (
                    <SwishPaymentSection
                      ref={swishPaymentRef}
                      userInfo={userInfo}
                      courseId={courseId}
                      amount={calculatePrice()}
                      onPaymentComplete={handlePaymentComplete}
                      disabled={isSubmitting}
                    />
                  )}
                </CardContent>
              </Card>
              
              {/* Invoice Payment Option */}
              <Card 
                variant="outlined" 
                sx={{ 
                  mb: 2, 
                  border: paymentDetails.method === 'invoice' ? '2px solid' : '1px solid', 
                  borderColor: paymentDetails.method === 'invoice' ? 'var(--primary)' : 'divider',
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                <CardContent>
                  <FormControlLabel 
                    value="invoice" 
                    control={
                      <Radio 
                        sx={{
                          color: 'rgba(0, 0, 0, 0.6)',
                          '&.Mui-checked': {
                            color: 'var(--primary)',
                          },
                        }}
                      />
                    } 
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <ReceiptIcon sx={{ mr: 1 }} />
                        <Typography>Faktura (10 dagars betalningsvillkor)</Typography>
                      </Box>
                    } 
                    sx={{ width: '100%' }}
                  />
                  
                  {paymentDetails.method === 'invoice' && userInfo && (
                    <InvoicePaymentSection
                      ref={invoicePaymentRef}
                      userInfo={userInfo}
                      courseId={courseId}
                      amount={calculatePrice()}
                      onPaymentComplete={handlePaymentComplete}
                      onValidationError={(error) => setFormErrors(prev => ({ ...prev, invoice: error }))}
                      disabled={isSubmitting}
                    />
                  )}
                </CardContent>
              </Card>
            </RadioGroup>
            
            {formErrors.paymentMethod && (
              <Typography color="error" variant="caption">
                {formErrors.paymentMethod}
              </Typography>
            )}
          </FormControl>
        </form>
      </Grid>
      
      {/* Order Summary */}
      <Grid item xs={12} md={5}>
        <Typography variant="h6" gutterBottom>
          Sammanfattning av bokning
        </Typography>
        
        {courseDetail && (
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                {courseDetail.title}
              </Typography>
              
              {courseDetail.start_date && (
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  Datum: {new Date(courseDetail.start_date).toLocaleDateString('sv-SE', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric'
                  })}
                </Typography>
              )}
              
              {courseDetail.start_date && (
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  Tid: {new Date(courseDetail.start_date).toLocaleTimeString('sv-SE', { 
                    hour: '2-digit', 
                    minute: '2-digit'
                  })}
                </Typography>
              )}
              
              {courseDetail.location && (
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  Plats: {courseDetail.location}
                </Typography>
              )}
            </CardContent>
          </Card>
        )}
        
        {userInfo && (
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                Personuppgifter
              </Typography>
              
              <List dense>
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <PersonIcon fontSize="small" sx={{ color: 'var(--primary)' }} />
                  </ListItemIcon>
                  <ListItemText primary={`${userInfo.firstName} ${userInfo.lastName}`} />
                </ListItem>
                
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <EmailIcon fontSize="small" sx={{ color: 'var(--primary)' }} />
                  </ListItemIcon>
                  <ListItemText primary={userInfo.email} />
                </ListItem>
                
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <PhoneIcon fontSize="small" sx={{ color: 'var(--primary)' }} />
                  </ListItemIcon>
                  <ListItemText primary={userInfo.phone} />
                </ListItem>
                
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <PeopleIcon fontSize="small" sx={{ color: 'var(--primary)' }} />
                  </ListItemIcon>
                  <ListItemText primary={`Antal deltagare: ${userInfo.numberOfParticipants}`} />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        )}
        
        <Card 
          sx={{ 
            backgroundColor: 'var(--primary-light)', 
            color: prefersDarkMode ? 'white' : 'black',
            p: 2, 
            borderRadius: 1
          }}
        >
          <Typography variant="subtitle2">
            Totalt att betala
          </Typography>
          
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            {calculatePrice()} kr
          </Typography>
          
          <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
            Inkl. moms
          </Typography>
        </Card>
      </Grid>
    </Grid>
  );

  // Render the buttons
  const renderButtons = () => (
    <>
      <Divider sx={{ my: 4 }} />
      
      <Typography variant="caption" color="text.secondary" paragraph>
        Genom att slutföra bokningen godkänner du våra <a href="/villkor" target="_blank" rel="noopener noreferrer">bokningsvillkor</a> och <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">integritetspolicy</a>.
      </Typography>
      
      <Box sx={{ display: 'flex', justifyContent: isMobile ? 'center' : 'space-between', flexDirection: isMobile ? 'column' : 'row', gap: 2, mt: 4 }}>
        <StyledButton
          secondary
          onClick={handleBack}
          disabled={isSubmitting}
          fullWidth={isMobile}
        >
          Tillbaka
        </StyledButton>
        
        <StyledButton
          onClick={(e) => {
            console.log('Submit button clicked');
            handleSubmit(e);
          }}
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={20} sx={{ color: 'white' }} /> : undefined}
          fullWidth={isMobile}
        >
          {isSubmitting ? 'Bearbetar...' : 'Slutför bokning'}
        </StyledButton>
      </Box>
    </>
  );

  return (
    <>
      {/* 
        Skip GenericFlowContainer if we're inside FlowStepWrapper 
        (indicated by presence of onNext callback and flowData)
      */}
      {!onNext || !flowData ? (
        <GenericFlowContainer 
          activeStep={activeStep || GenericStep.PAYMENT} 
          flowType={flowType}
          title="Betalning"
          subtitle="Välj din betalningsmetod och granska din bokning."
          alertMessage={submitError || undefined}
          alertSeverity="error"
        >
          <Paper 
            elevation={3} 
            sx={{ 
              borderRadius: 2, 
              p: { xs: 2, sm: 4 }, 
              mt: 4 
            }}
          >
            {renderPaymentContent()}
            {renderButtons()}
          </Paper>
        </GenericFlowContainer>
      ) : (
        // When wrapped by FlowStepWrapper, render only the Paper content
        <>
          {submitError && (
            <Alert severity="error" sx={{ mb: 3 }}>{submitError}</Alert>
          )}
          <Paper 
            elevation={3} 
            sx={{ 
              borderRadius: 2, 
              p: { xs: 2, sm: 4 }, 
              mt: 4 
            }}
          >
            {renderPaymentContent()}
            {renderButtons()}
          </Paper>
        </>
      )}
    </>
  );
};

export default PaymentSelection; 