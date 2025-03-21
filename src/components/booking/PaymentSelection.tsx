import React, { useState, useEffect } from 'react';
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
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ErrorIcon from '@mui/icons-material/Error';

import { GenericStep, FlowType } from '../common/BookingStepper';
import GenericFlowContainer from '../common/GenericFlowContainer';
import StyledButton from '../common/StyledButton';
import { FormCheckboxField, FormTextField } from '../common/FormField';
import { sendBookingConfirmationEmail } from '@/utils/confirmationEmail';

interface PaymentSelectionProps {
  courseId: string;
}

interface UserInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  numberOfParticipants: string;
  specialRequirements?: string;
}

interface InvoiceDetails {
  address: string;
  postalCode: string;
  city: string;
  reference: string;
}

interface PaymentDetails {
  method: string;
  swishPhone?: string;
  invoiceDetails?: InvoiceDetails;
  paymentReference?: string;
  paymentStatus?: PaymentStatus;
  bookingReference?: string;
  emailSent?: boolean;
}

interface FormErrors {
  method?: string;
  'invoiceDetails.address'?: string;
  'invoiceDetails.postalCode'?: string;
  'invoiceDetails.city'?: string;
  swishPhone?: string;
}

// Payment status enum
enum PaymentStatus {
  CREATED = 'CREATED',
  PAID = 'PAID',
  DECLINED = 'DECLINED',
  ERROR = 'ERROR'
}

const PaymentSelection: React.FC<PaymentSelectionProps> = ({ courseId }) => {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [courseDetail, setCourseDetail] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({
    method: 'swish',
    invoiceDetails: {
      address: '',
      postalCode: '',
      city: '',
      reference: '',
    },
    swishPhone: ''
  });
  
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentReference, setPaymentReference] = useState<string>('');

  useEffect(() => {
    // Get the user info from localStorage
    const storedUserInfo = localStorage.getItem('userInfo');
    const storedCourseDetail = localStorage.getItem('courseDetail');
    
    if (storedUserInfo) {
      const userInfoData = JSON.parse(storedUserInfo);
      setUserInfo(userInfoData);
      setPaymentDetails(prev => ({
        ...prev,
        swishPhone: userInfoData.phone || ''
      }));
    }
    
    if (storedCourseDetail) {
      setCourseDetail(JSON.parse(storedCourseDetail));
    }
  }, []);

  const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPaymentDetails(prev => ({ ...prev, [name]: value }));
    // Clear error when user selects
    if (formErrors[name as keyof FormErrors]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setPaymentDetails(prev => ({ ...prev, [name]: checked }));
    // Clear error when user checks
    if (formErrors[name as keyof FormErrors]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleInvoiceDetailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPaymentDetails(prev => ({
      ...prev,
      invoiceDetails: {
        ...prev.invoiceDetails as InvoiceDetails,
        [name]: value
      }
    }));
    
    // Clear error when user types
    const errorKey = `invoiceDetails.${name}` as keyof FormErrors;
    if (formErrors[errorKey]) {
      setFormErrors(prev => ({ ...prev, [errorKey]: undefined }));
    }
  };

  const handleSwishPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setPaymentDetails(prev => ({
      ...prev,
      swishPhone: value
    }));
    
    // Clear any swish phone error
    if (formErrors.swishPhone) {
      setFormErrors(prev => ({ ...prev, swishPhone: undefined }));
    }
  };

  const validateForm = (): boolean => {
    console.log('validateForm called, payment method:', paymentDetails.method);
    const errors: FormErrors = {};
    let isValid = true;

    // Validate payment method
    if (!paymentDetails.method) {
      errors.method = 'Välj en betalningsmetod';
      isValid = false;
    }

    // Validate Swish phone number if Swish is selected
    if (paymentDetails.method === 'swish') {
      console.log('Validating Swish phone:', paymentDetails.swishPhone);
      if (!paymentDetails.swishPhone) {
        errors.swishPhone = 'Telefonnummer är obligatoriskt för Swish-betalning';
        isValid = false;
      } else {
        // Clean the phone number first
        const cleanPhone = paymentDetails.swishPhone.replace(/\s+/g, '');
        console.log('Cleaned phone number:', cleanPhone);
        // Check for valid Swedish phone format (9 or 10 digits starting with 0)
        if (!/^0\d{8,9}$/.test(cleanPhone)) {
          console.log('Phone validation failed: does not match regex pattern');
          errors.swishPhone = 'Ange ett giltigt svenskt mobilnummer (9-10 siffror som börjar med 0)';
          isValid = false;
        }
      }
    }

    // Validate invoice details if invoice is selected
    if (paymentDetails.method === 'invoice') {
      if (!paymentDetails.invoiceDetails?.address) {
        errors['invoiceDetails.address'] = 'Adress är obligatoriskt';
        isValid = false;
      }
      
      if (!paymentDetails.invoiceDetails?.postalCode) {
        errors['invoiceDetails.postalCode'] = 'Postnummer är obligatoriskt';
        isValid = false;
      }
      
      if (!paymentDetails.invoiceDetails?.city) {
        errors['invoiceDetails.city'] = 'Stad är obligatoriskt';
        isValid = false;
      }
    }

    console.log('Form validation result:', isValid, 'errors:', errors);
    setFormErrors(errors);
    return isValid;
  };

  // Create a Swish payment request
  const createSwishPayment = async (): Promise<{success: boolean, reference: string | null}> => {
    try {
      console.log('Creating Swish payment with phone number:', paymentDetails.swishPhone);
      
      const response = await fetch('/api/payments/swish/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId,
          userInfo,
          phoneNumber: paymentDetails.swishPhone,
        }),
      });

      const result = await response.json();
      console.log('Payment API response:', result);

      if (!result.success) {
        throw new Error(result.error || 'Failed to create payment');
      }

      // Extract reference from the nested data structure
      const reference = result.data?.reference;
      
      if (!reference) {
        throw new Error('No payment reference received');
      }

      // Set payment reference in component state
      setPaymentReference(reference);
      
      // Store in localStorage for persistence
      localStorage.setItem('currentPaymentReference', reference);
      
      return { success: true, reference };
    } catch (error) {
      console.error('Error in payment creation:', error);
      return { success: false, reference: null };
    }
  };

  // Check payment status
  const checkPaymentStatus = async (directReference?: string): Promise<PaymentStatus> => {
    // Use direct reference if provided, otherwise try state or localStorage
    const reference = directReference || paymentReference || localStorage.getItem('currentPaymentReference');
    console.log('checkPaymentStatus called with reference:', reference);
    
    if (!reference || reference === 'undefined' || reference === 'null') {
      console.error('No valid payment reference available to check status');
      return PaymentStatus.ERROR;
    }
    
    try {
      // Call our status API
      console.log(`Checking status for payment: ${reference}`);
      const response = await fetch(`/api/payments/status/${reference}`);
      const data = await response.json();
      
      console.log('Status check response:', data);
      
      if (!data.success) {
        console.error('Status API reported error:', data);
        return PaymentStatus.ERROR;
      }
      
      // Check if booking was created and store reference
      if (data.data?.booking?.reference) {
        console.log('Booking reference received:', data.data.booking.reference);
        localStorage.setItem('bookingReference', data.data.booking.reference);
      }
      
      // Map status string to enum
      const status = data.data?.payment?.status as string;
      console.log(`Payment status: ${status}`);
      
      if (!status) {
        console.error('No payment status found in response');
        return PaymentStatus.ERROR;
      }
      
      // Map the status from the API to our enum
      switch (status.toUpperCase()) {
        case 'PAID':
          return PaymentStatus.PAID;
        case 'DECLINED':
          return PaymentStatus.DECLINED;
        case 'ERROR':
          return PaymentStatus.ERROR;
        case 'CREATED':
          return PaymentStatus.CREATED;
        default:
          return PaymentStatus.CREATED;
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      return PaymentStatus.ERROR;
    }
  };

  // Start polling payment status
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let attempts = 0;
    const maxAttempts = 30; // Check for up to 1 minute (30 * 2 sec)
    let redirectTimeout: NodeJS.Timeout;

    const pollStatus = async () => {
      if (!showPaymentDialog) return;
      
      if (attempts >= maxAttempts) {
        console.log('Status check timed out after max attempts');
        setPaymentStatus(PaymentStatus.ERROR);
        clearInterval(intervalId);
        return;
      }

      const currentReference = paymentReference || localStorage.getItem('currentPaymentReference');
      if (!currentReference || currentReference === 'undefined' || currentReference === 'null') {
        console.log('No valid reference available for polling');
        setPaymentStatus(PaymentStatus.ERROR);
        clearInterval(intervalId);
        return;
      }

      attempts++;
      console.log(`Payment status check attempt ${attempts}/${maxAttempts} for reference: ${currentReference}`);
      
      try {
        const status = await checkPaymentStatus(currentReference);
        console.log('Poll received status:', status);
        
        // Only update status if it's different from current status
        if (status !== paymentStatus) {
          console.log('Updating payment status from', paymentStatus, 'to', status);
          setPaymentStatus(status);
        }
        
        if (status === PaymentStatus.PAID) {
          console.log('Payment is PAID, clearing interval and preparing redirect');
          clearInterval(intervalId);
          
          // Set up redirect after showing success message
          redirectTimeout = setTimeout(() => {
            console.log('Redirecting to confirmation page');
            router.push(`/book-course/${courseId}/confirmation`);
          }, 1500);
        } else if (status === PaymentStatus.DECLINED || status === PaymentStatus.ERROR) {
          console.log('Payment failed or declined, clearing interval');
          clearInterval(intervalId);
        }
      } catch (error) {
        console.error('Error in pollStatus:', error);
      }
    };

    // Only start polling if we have a payment reference and dialog is shown
    if (showPaymentDialog && (paymentReference || localStorage.getItem('currentPaymentReference'))) {
      console.log('Starting payment status polling');
      pollStatus(); // Check immediately
      intervalId = setInterval(pollStatus, 2000); // Then every 2 seconds
    }

    // Cleanup function
    return () => {
      console.log('Cleaning up payment polling');
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (redirectTimeout) {
        clearTimeout(redirectTimeout);
      }
    };
  }, [showPaymentDialog, paymentReference, paymentStatus, courseId, router]);

  // Handle closing the payment dialog
  const handleClosePaymentDialog = () => {
    // Only allow closing if there's an error or payment is declined
    if (paymentStatus === PaymentStatus.ERROR || paymentStatus === PaymentStatus.DECLINED) {
      setShowPaymentDialog(false);
      setPaymentStatus(null);
      // Clean up the stored reference
      localStorage.removeItem('currentPaymentReference');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submit button clicked');
    console.log('handleSubmit called, payment method:', paymentDetails.method);
    
    if (!validateForm()) {
      console.log('Form validation failed, stopping submission');
      console.log('Form errors:', formErrors);
      return;
    }

    console.log('Form validation passed, proceeding with submission');
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (paymentDetails.method === 'swish') {
        console.log('Processing Swish payment');
        // Create Swish payment
        const paymentResult = await createSwishPayment();
        console.log('Payment creation result:', paymentResult);
        
        if (!paymentResult.success || !paymentResult.reference) {
          throw new Error('Payment creation failed');
        }
        
        // Show payment dialog after successful payment creation
        setPaymentStatus(PaymentStatus.CREATED);
        setShowPaymentDialog(true);
        
        // The payment reference was already set by createSwishPayment
        // The useEffect will handle polling automatically
        console.log('Dialog shown, polling will start automatically');
      } else {
        // Invoice payment - store details and create invoice
        console.log('Processing invoice payment');
        
        try {
          // Call our invoice API
          console.log('Calling /api/invoice/create with data:', {
            courseId,
            userInfo,
            paymentDetails
          });
          
          const response = await fetch('/api/invoice/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              courseId,
              userInfo,
              paymentDetails
            })
          });
          
          const data = await response.json();
          console.log('Invoice API response:', data);
          
          if (!data.success) {
            console.error('API reported error:', data.error);
            throw new Error(data.error || 'Could not create invoice');
          }
          
          console.log('Invoice created successfully with number:', data.invoiceNumber);
          
          // Store payment details with invoice number in localStorage
          localStorage.setItem('paymentDetails', JSON.stringify({
            ...paymentDetails,
            bookingId: data.bookingId,
            emailSent: data.emailSent
          }));
          
          // Navigate to next step
          router.push(`/book-course/${courseId}/confirmation`);
        } catch (error) {
          console.error('Error creating invoice:', error);
          setSubmitError('Det gick inte att skapa fakturan. Försök igen senare.');
        }
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      setSubmitError('Det gick inte att skapa betalningen. Försök igen senare.');
    } finally {
      console.log('handleSubmit completed, setting isSubmitting to false');
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    router.push(`/book-course/${courseId}/personal-info`);
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

  return (
    <>
      <GenericFlowContainer 
        activeStep={2} 
        flowType={FlowType.COURSE_BOOKING}
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
                              <Box sx={{ mr: 2, height: 30, width: 100, position: 'relative' }}>
                                <Image
                                  src={swishLogoSrc}
                                  alt="Swish"
                                  fill
                                  style={{ objectFit: 'contain' }}
                                />
                              </Box>
                              <Typography>Betala med Swish</Typography>
                            </Box>
                          } 
                          sx={{ width: '100%' }}
                        />
                        {paymentDetails.method === 'swish' && userInfo && (
                          <Box sx={{ ml: 4, mt: 2 }}>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              Vi kommer skicka en betalningsförfrågan till följande telefonnummer:
                            </Typography>
                            <FormTextField
                              name="swishPhone"
                              label="Telefonnummer för Swish"
                              fullWidth
                              value={paymentDetails.swishPhone}
                              onChange={handleSwishPhoneChange}
                              error={formErrors.swishPhone}
                              helperText={formErrors.swishPhone || "T.ex. 0701234567 eller 070123456"}
                              InputProps={{
                                startAdornment: (
                                  <PhoneIcon sx={{ mr: 1, color: 'text.secondary' }} />
                                ),
                              }}
                              sx={{ maxWidth: '300px' }}
                            />
                            <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                              Betalning sker efter att bokningen har bekräftats.
                            </Typography>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                    
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
                        
                        {paymentDetails.method === 'invoice' && (
                          <Box sx={{ mt: 2, ml: 4 }}>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                              Vänligen fyll i din fakturaadress:
                            </Typography>
                            
                            <Grid container spacing={2}>
                              <Grid item xs={12}>
                                <FormTextField
                                  name="address"
                                  label="Adress *"
                                  fullWidth
                                  value={paymentDetails.invoiceDetails?.address || ''}
                                  onChange={handleInvoiceDetailChange}
                                  error={formErrors['invoiceDetails.address']}
                                  required
                                  InputProps={{
                                    startAdornment: (
                                      <HomeIcon sx={{ mr: 1, color: 'text.secondary' }} />
                                    ),
                                  }}
                                />
                              </Grid>
                              
                              <Grid item xs={12} sm={6}>
                                <FormTextField
                                  name="postalCode"
                                  label="Postnummer *"
                                  fullWidth
                                  value={paymentDetails.invoiceDetails?.postalCode || ''}
                                  onChange={handleInvoiceDetailChange}
                                  error={formErrors['invoiceDetails.postalCode']}
                                  required
                                  InputProps={{
                                    startAdornment: (
                                      <MarkunreadMailboxIcon sx={{ mr: 1, color: 'text.secondary' }} />
                                    ),
                                  }}
                                />
                              </Grid>
                              
                              <Grid item xs={12} sm={6}>
                                <FormTextField
                                  name="city"
                                  label="Stad *"
                                  fullWidth
                                  value={paymentDetails.invoiceDetails?.city || ''}
                                  onChange={handleInvoiceDetailChange}
                                  error={formErrors['invoiceDetails.city']}
                                  required
                                  InputProps={{
                                    startAdornment: (
                                      <LocationCityIcon sx={{ mr: 1, color: 'text.secondary' }} />
                                    ),
                                  }}
                                />
                              </Grid>
                              
                              <Grid item xs={12}>
                                <FormTextField
                                  name="reference"
                                  label="Fakturareferens (valfritt)"
                                  fullWidth
                                  value={paymentDetails.invoiceDetails?.reference || ''}
                                  onChange={handleInvoiceDetailChange}
                                />
                              </Grid>
                            </Grid>
                            
                            <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                              Fakturan skickas till din e-postadress efter att bokningen har bekräftats.
                            </Typography>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </RadioGroup>
                  
                  {formErrors.method && (
                    <Typography color="error" variant="caption">
                      {formErrors.method}
                    </Typography>
                  )}
                </FormControl>
              </form>
            </Grid>
            
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
        </Paper>
      </GenericFlowContainer>

      {/* Swish Payment Dialog */}
      <Dialog 
        open={showPaymentDialog} 
        onClose={handleClosePaymentDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Swish-betalning
        </DialogTitle>
        <DialogContent>
          {paymentStatus === PaymentStatus.CREATED && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
              <CircularProgress sx={{ mb: 2 }} />
              <Typography variant="body1" gutterBottom>
                Öppna Swish-appen på din mobil för att slutföra betalningen
              </Typography>
            </Box>
          )}

          {paymentStatus === PaymentStatus.PAID && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
              <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 2 }} />
              <Typography variant="body1" gutterBottom>
                Betalningen är genomförd!
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Du kommer att omdirigeras till bekräftelsesidan...
              </Typography>
            </Box>
          )}

          {paymentStatus === PaymentStatus.DECLINED && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
              <CancelIcon color="error" sx={{ fontSize: 48, mb: 2 }} />
              <Typography variant="body1" gutterBottom>
                Betalningen avbröts
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Du kan stänga detta fönster och försöka igen
              </Typography>
            </Box>
          )}

          {paymentStatus === PaymentStatus.ERROR && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
              <ErrorIcon color="error" sx={{ fontSize: 48, mb: 2 }} />
              <Typography variant="body1" gutterBottom>
                Det uppstod ett tekniskt problem vid behandling av din betalning
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Försök igen senare eller välj en annan betalningsmetod
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {(paymentStatus === PaymentStatus.DECLINED || paymentStatus === PaymentStatus.ERROR) && (
            <Button onClick={handleClosePaymentDialog}>Stäng</Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PaymentSelection; 