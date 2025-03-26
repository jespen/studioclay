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
  invoiceDetails?: InvoiceDetails;
}

interface FormErrors {
  method?: string;
  'invoiceDetails.address'?: string;
  'invoiceDetails.postalCode'?: string;
  'invoiceDetails.city'?: string;
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
    }
  });
  
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const swishPaymentRef = useRef<SwishPaymentSectionRef>(null);

  useEffect(() => {
    // Get the user info from localStorage
    const storedUserInfo = localStorage.getItem('userInfo');
    const storedCourseDetail = localStorage.getItem('courseDetail');
    
    if (storedUserInfo) {
      setUserInfo(JSON.parse(storedUserInfo));
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

  const validateForm = (): boolean => {
    console.log('validateForm called, payment method:', paymentDetails.method);
    const errors: FormErrors = {};
    let isValid = true;

    // Validate payment method
    if (!paymentDetails.method) {
      errors.method = 'Välj en betalningsmetod';
      isValid = false;
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

  // Create an invoice payment request
  const createInvoicePayment = async (): Promise<{success: boolean, reference: string | null}> => {
    console.log('=== Starting invoice payment creation ===');
    console.log('User info:', userInfo);
    console.log('Course ID:', courseId);
    console.log('Payment details:', paymentDetails);
    
    try {
      // Generera en unik idempotency key
      const idempotencyKey = uuidv4();
      console.log('Generated idempotency key:', idempotencyKey);
      
      console.log('Creating invoice...');
      const response = await fetch('/api/invoice/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({
          courseId,
          userInfo,
          paymentDetails: {
            ...paymentDetails,
            amount: calculatePrice()
          }
        }),
      });

      const result = await response.json();
      console.log('Invoice API response:', result);

      if (!result.success) {
        console.error('Invoice creation failed:', result.error);
        throw new Error(result.error || 'Failed to create invoice');
      }

      // Store booking reference
      if (result.data?.bookingReference) {
        console.log('Storing booking reference:', result.data.bookingReference);
        localStorage.setItem('bookingReference', result.data.bookingReference);
      }

      console.log('=== Invoice creation completed successfully ===');
      return { success: true, reference: result.data?.bookingReference || null };
    } catch (error) {
      console.error('=== Error in invoice creation ===');
      console.error('Error details:', error);
      return { success: false, reference: null };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('=== Payment submission started ===');
    console.log('Payment method:', paymentDetails.method);
    
    if (!validateForm()) {
      console.log('Form validation failed');
      console.log('Form errors:', formErrors);
      return;
    }

    console.log('Form validation passed, proceeding with submission');
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (paymentDetails.method === 'swish') {
        console.log('Processing Swish payment');
        if (swishPaymentRef.current) {
          const success = await swishPaymentRef.current.handleCreatePayment();
          if (!success) {
            throw new Error('Payment creation failed');
          }
        } else {
          throw new Error('Swish payment section not initialized');
        }
      } else {
        console.log('Processing invoice payment');
        const paymentResult = await createInvoicePayment();
        
        if (!paymentResult.success) {
          console.error('Invoice payment failed');
          throw new Error('Invoice creation failed');
        }
        
        console.log('Invoice payment successful, redirecting to confirmation');
        router.push(`/book-course/${courseId}/confirmation`);
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      setSubmitError('Det gick inte att skapa betalningen. Försök igen senare.');
    } finally {
      console.log('Payment submission completed');
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
                              <Typography>Betala med Swish</Typography>
                            </Box>
                          } 
                          sx={{ width: '100%' }}
                        />
                        {paymentDetails.method === 'swish' && userInfo && (
                          <SwishPaymentSection
                            ref={swishPaymentRef}
                            userInfo={userInfo}
                            courseId={courseId}
                            amount={calculatePrice()}
                            onPaymentComplete={(success) => {
                              if (success) {
                                router.push(`/book-course/${courseId}/confirmation`);
                              }
                            }}
                            disabled={isSubmitting}
                          />
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
    </>
  );
};

export default PaymentSelection; 