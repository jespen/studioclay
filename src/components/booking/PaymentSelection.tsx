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

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
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
} from '@mui/material';

import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import PeopleIcon from '@mui/icons-material/People';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import InventoryIcon from '@mui/icons-material/Inventory';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import { GenericStep, FlowType } from '../common/BookingStepper';
import GenericFlowContainer from '../common/GenericFlowContainer';
import StyledButton from '../common/StyledButton';
import { v4 as uuidv4 } from 'uuid';
import SwishPaymentSection, { SwishPaymentSectionRef } from './SwishPaymentSection';
import { PaymentMethod, PaymentDetails, BaseFormErrors, InvoiceDetails } from '@/types/payment';
import { setPaymentInfo } from '@/utils/flowStorage';
import { FlowStateData } from '../common/FlowStepWrapper';
import { 
  CourseDetail, 
  UserInfo, 
  fetchCourseDetail, 
  getUserInfo 
} from '@/utils/dataFetcher';
import { 
  getPaymentReference, 
  setPaymentReference, 
  getGiftCardDetails 
} from '@/utils/flowStorage';
import { getPreviousStepUrl, getNextStepUrl } from '@/utils/flowNavigation';
import { PAYMENT_STATUSES, PAYMENT_METHODS, PRODUCT_TYPES } from '@/constants/statusCodes';
import { PaymentService } from '@/services/payment/paymentService';
import { validatePaymentRequest } from '@/lib/validation/paymentSchemas';
import { type ProductType } from '@/constants/statusCodes';
import InvoicePaymentSection, { InvoicePaymentSectionRef } from '../payment/InvoicePaymentSection';
import { StandardPaymentResponse, PaymentReferenceData } from '@/types/paymentTypes';

interface PaymentSelectionProps {
  courseId: string;
  activeStep?: number;
  flowType?: FlowType;
  onNext?: (data: any) => void;
  onBack?: () => void;
  flowData?: FlowStateData;
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
  const [courseDetail, setCourseDetail] = useState<CourseDetail | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('swish');
  const [error, setError] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  
  const [formErrors, setFormErrors] = useState<BaseFormErrors>({});
  const swishPaymentRef = useRef<SwishPaymentSectionRef>(null);
  const invoicePaymentRef = useRef<InvoicePaymentSectionRef>(null);

  // Add invoice detail states
  const [invoiceAddress, setInvoiceAddress] = useState<string>('');
  const [invoicePostalCode, setInvoicePostalCode] = useState<string>('');
  const [invoiceCity, setInvoiceCity] = useState<string>('');
  const [invoiceReference, setInvoiceReference] = useState<string>('');

  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentProcessStarted, setPaymentProcessStarted] = useState(false);
  const [processingSteps, setProcessingSteps] = useState([
    { id: 'payment', label: 'Skapar betalning...', completed: false },
    { id: 'processing', label: 'Bearbetar betalningen...', completed: false },
    { id: 'redirect', label: 'Förbereder bekräftelse...', completed: false }
  ]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Prioritize data from flowData props
        if (flowData?.itemDetails && flowData?.userInfo) {
          setCourseDetail(flowData.itemDetails as CourseDetail);
          setUserInfo(flowData.userInfo as UserInfo);
        } else {
          // Fall back to our utilities that check both flowStorage and localStorage
          const [courseData, userData] = await Promise.all([
            fetchCourseDetail(courseId),
            getUserInfo()
          ]);
          
          setCourseDetail(courseData);
          setUserInfo(userData);
        }
      } catch (error) {
        console.error('Error loading data for payment:', error);
        setSubmitError('Det gick inte att ladda nödvändig information. Försök igen senare.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [courseId, flowData]);

  const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSelectedPaymentMethod(value as string);
    // Clear error when user selects
    if (formErrors[name as keyof BaseFormErrors]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleInvoiceDetailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    console.log('Invoice detail change:', name, value);
    
    // No need to update formErrors here as this is handled by InvoicePaymentSection
  };

  const validateForm = (): boolean => {
    setFormErrors(prev => ({ ...prev, paymentMethod: undefined }));
    
    if (selectedPaymentMethod === 'invoice') {
      // Validera fakturaformuläret via ref
      if (invoicePaymentRef.current) {
        return invoicePaymentRef.current.validateForm();
      }
    } else if (selectedPaymentMethod === 'swish') {
      // Validering av swish sker i SwishPaymentSection
      return true;
    }
    
    return false;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('[PaymentSelection] Form submitted, payment method:', selectedPaymentMethod);
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      if (!userInfo) {
        console.error('[PaymentSelection] No user info available');
        throw new Error('Användaruppgifter saknas');
      }
      
      console.log('[PaymentSelection] Flow type:', flowType);
      
      // Handle different payment methods
      if (selectedPaymentMethod === 'swish') {
        console.log('[PaymentSelection] Processing Swish payment');
        if (swishPaymentRef.current) {
          const success = await swishPaymentRef.current.submitSwishPayment();
          console.log('[PaymentSelection] Swish payment submission result:', success);
          
          if (success) {
            setIsSubmitting(false);
            return;
          } else {
            throw new Error('Betalningen kunde inte genomföras');
          }
        } else {
          console.error('[PaymentSelection] Swish section ref not available');
          throw new Error('Swish-betalningssektionen kunde inte initialiseras');
        }
      } else if (selectedPaymentMethod === 'invoice') {
        console.log('[PaymentSelection] Processing Invoice payment');
        if (invoicePaymentRef.current) {
          const isValid = validateForm();
          console.log('[PaymentSelection] Invoice form validation result:', isValid);
          
          if (isValid) {
            const success = await handleInvoicePayment();
            console.log('[PaymentSelection] Invoice payment result:', success);
            
            if (success) {
              setIsSubmitting(false);
              return;
            }
          } else {
            console.error('[PaymentSelection] Invoice form validation failed');
            throw new Error('Fyll i alla obligatoriska fält');
          }
        } else {
          console.error('[PaymentSelection] Invoice section ref not available');
          throw new Error('Fakturasektionen kunde inte initialiseras');
        }
      } else {
        console.error('[PaymentSelection] Invalid payment method selected:', selectedPaymentMethod);
        throw new Error('Välj en giltig betalningsmetod');
      }
    } catch (err) {
      console.error('[PaymentSelection] Payment submission error:', err);
      setSubmitError(err instanceof Error ? err.message : 'Ett fel uppstod');
      setIsSubmitting(false);
    }
  };

  const handleInvoicePayment = async (): Promise<boolean> => {
    console.log('[PaymentSelection] Starting invoice payment flow');
    
    if (!invoicePaymentRef.current || !userInfo) {
      console.error('[PaymentSelection] Invoice form reference is not available or userInfo is missing');
      return false;
    }
    
    // Validera formuläret med den befintliga valideringsfunktionen
    if (!invoicePaymentRef.current.validateForm()) {
      console.log('[PaymentSelection] Form validation failed');
      return false;
    }
    
    // Visa processindikatorn
    preparePaymentProcessSteps();
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // Använd den befintliga metoden för att skicka fakturabetalningen
      const success = await invoicePaymentRef.current.submitInvoicePayment();
      console.log('[PaymentSelection] Invoice payment result:', success);
      
      if (!success) {
        // Återställ processtegen vid fel
        setPaymentProcessStarted(false);
      }
      
      setIsSubmitting(false);
      return success;
    } catch (error) {
      console.error('[PaymentSelection] Error in handleInvoicePayment:', error);
      setSubmitError(error instanceof Error ? error.message : 'Ett fel uppstod');
      setIsSubmitting(false);
      
      // Återställ processtegen vid fel
      setPaymentProcessStarted(false);
      
      return false;
    }
  };

  const handleSwishPayment = async (): Promise<boolean> => {
    console.log('[PaymentSelection] Starting Swish payment flow');
    
    if (!swishPaymentRef.current) {
      console.error('[PaymentSelection] No Swish payment ref available');
      return false;
    }
    
    // Visa processindikatorn för Swish
    preparePaymentProcessSteps();
    
    try {
      const success = await swishPaymentRef.current.submitSwishPayment();
      
      if (!success) {
        // Återställ processtegen vid fel
        setPaymentProcessStarted(false);
      }
      
      return success;
    } catch (error) {
      console.error('[PaymentSelection] Error in Swish payment:', error);
      
      // Återställ processtegen vid fel
      setPaymentProcessStarted(false);
      
      return false;
    }
  };

  const handlePaymentComplete = (paymentData: any) => {
    console.log('[PaymentSelection] Payment completed:', paymentData);
    
    // Sätt success-state
    setPaymentSuccess(true);
    
    // Visa feedback till användaren innan redirect
    setProcessingSteps(current => 
      current.map(step => 
        step.id === 'payment' ? { ...step, completed: true } : step
      )
    );
    
    // Kort fördröjning för att användaren ska hinna se att betalningen lyckades
    setTimeout(() => {
      setProcessingSteps(current => 
        current.map(step => 
          step.id === 'processing' ? { ...step, completed: true } : step
        )
      );
      
      // Ytterligare fördröjning innan redirect
      setTimeout(() => {
        setProcessingSteps(current => 
          current.map(step => 
            step.id === 'redirect' ? { ...step, completed: true, label: 'Omdirigerar till bekräftelsesidan...' } : step
          )
        );
        
        // Prioritera redirect-URL från API-svar om den finns
        if (paymentData?.redirectUrl) {
          console.log('[PaymentSelection] Redirecting to URL from API:', paymentData.redirectUrl);
          router.push(paymentData.redirectUrl);
          return;
        }
        
        // Fallback till standardrutter baserat på flowType
        let redirectPath = '/payment/confirmation';
        
        if (paymentData?.paymentReference) {
          redirectPath = `/payment/confirmation/${paymentData.paymentReference}`;
        }
        
        if (flowType === FlowType.COURSE_BOOKING) {
          redirectPath = `/booking/confirmation?reference=${paymentData?.paymentReference || ''}`;
        } else if (flowType === FlowType.GIFT_CARD) {
          redirectPath = `/gift-card/confirmation?reference=${paymentData?.paymentReference || ''}`;
        } else if (flowType === FlowType.ART_PURCHASE) {
          redirectPath = `/art/confirmation?reference=${paymentData?.paymentReference || ''}`;
        }
        
        console.log('[PaymentSelection] Redirecting to:', redirectPath);
        router.push(redirectPath);
      }, 500);
    }, 1000);
    
    // Anropa även onNext om det finns en sådan callback
    if (onNext) {
      onNext(paymentData);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      // Legacy navigation as fallback
      const previousUrl = getPreviousStepUrl(GenericStep.PAYMENT, FlowType.COURSE_BOOKING, courseId);
      if (previousUrl) {
        router.push(previousUrl);
      }
    }
  };

  // Calculate price based on number of participants
  const calculatePrice = () => {
    if (!userInfo || !courseDetail || !courseDetail.price) {
      // For shop items, use the product price directly from flowData
      if (flowType === FlowType.ART_PURCHASE && flowData?.itemDetails?.price) {
        return flowData.itemDetails.price;
      }
      return 0;
    }
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
      setPaymentReference('');
    };
  }, []);

  const handlePaymentSuccess = (paymentData: any) => {
    // Determine actual payment status from paymentData
    const paymentStatus = paymentData.status || PAYMENT_STATUSES.CREATED;
    
    console.log(`Payment success handler with status: ${paymentStatus}`, paymentData);
    
    // Store payment info using PaymentService instead of direct call
    PaymentService.completePayment({
      paymentMethod: selectedPaymentMethod,
      productData: flowData?.itemDetails || courseDetail,
      userData: userInfo,
      paymentReference: paymentData.paymentId || paymentData.paymentReference,
      amount: calculatePrice(),
      status: paymentStatus,
      additionalData: paymentData
    });

    // Proceed to next step
    if (onNext) {
      onNext({
        paymentStatus: paymentStatus,
        paymentMethod: selectedPaymentMethod,
        paymentReference: paymentData.paymentId || paymentData.paymentReference
      });
    }
  };

  const handlePaymentError = (error: Error) => {
    console.error('Payment error:', error);
    setError(error.message);
  };

  const handlePaymentCancellation = () => {
    setSubmitError('Betalningen avbröts');
  };

  // Helper function to get gift card amount from localStorage
  const getGiftCardAmount = (): number => {
    try {
      interface GiftCardDetails {
        amount: number | string;
      }
      
      const giftCardDetailsData = getGiftCardDetails<GiftCardDetails>();
      if (giftCardDetailsData && giftCardDetailsData.amount) {
        // Convert to number if it's a string
        return typeof giftCardDetailsData.amount === 'string' 
          ? parseInt(giftCardDetailsData.amount, 10) 
          : giftCardDetailsData.amount;
      }
      // Fallback to courseDetail if it exists (it might be stored as a fake course)
      return courseDetail?.price || 0;
    } catch (e) {
      console.error('Error getting gift card amount:', e);
      return courseDetail?.price || 0;
    }
  };

  // Vid start av betalningsprocessen: förbered status-stegen
  const preparePaymentProcessSteps = () => {
    setPaymentProcessStarted(true);
    setProcessingSteps([
      { id: 'payment', label: 'Skapar betalning...', completed: false },
      { id: 'processing', label: 'Bearbetar betalningen...', completed: false },
      { id: 'redirect', label: 'Förbereder bekräftelse...', completed: false }
    ]);
  };

  // För att visa processindikatorn
  const renderProcessingStatus = () => {
    if (!paymentProcessStarted) return null;
    
    return (
      <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
        <Typography variant="subtitle1" gutterBottom fontWeight="medium" color="primary">
          Betalningsprocessen pågår
        </Typography>
        
        {processingSteps.map((step) => (
          <Box key={step.id} sx={{ display: 'flex', alignItems: 'center', my: 1 }}>
            {step.completed ? (
              <CheckCircleIcon color="success" sx={{ mr: 1 }} />
            ) : (
              <CircularProgress size={20} thickness={4} sx={{ mr: 1 }} />
            )}
            <Typography variant="body2">
              {step.label}
            </Typography>
          </Box>
        ))}
      </Box>
    );
  };

  // If data is loading, show loading state
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  // If data failed to load, show error
  if (!userInfo || !courseDetail) {
    return (
      <Box sx={{ my: 3 }}>
        <Alert severity="error">
          Det gick inte att ladda nödvändig information. Gå tillbaka och försök igen.
        </Alert>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          <StyledButton secondary onClick={handleBack}>
            Tillbaka
          </StyledButton>
        </Box>
      </Box>
    );
  }

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
              value={selectedPaymentMethod}
              onChange={handleRadioChange}
            >
              {/* Swish Payment Option */}
              <Card 
                variant="outlined" 
                sx={{ 
                  mb: 2, 
                  border: selectedPaymentMethod === 'swish' ? '2px solid' : '1px solid', 
                  borderColor: selectedPaymentMethod === 'swish' ? 'var(--primary)' : 'divider',
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
                      <Box sx={{ display: 'flex', alignItems: 'center', height: 30, width: 100, position: 'relative' }}>
                        <Image
                          src={swishLogoSrc}
                          alt="Betala med Swish"
                          fill
                          style={{ objectFit: 'contain' }}
                        />
                      </Box>
                    } 
                    sx={{ width: '100%' }}
                  />      
                  {selectedPaymentMethod === 'swish' && userInfo && (
                    <SwishPaymentSection
                      ref={swishPaymentRef}
                      amount={calculatePrice()}
                      productType={
                        flowType === FlowType.GIFT_CARD ? 'gift_card' : 
                        flowType === FlowType.ART_PURCHASE ? 'art_product' : 
                        'course'
                      }
                      productId={courseId}
                      userInfo={userInfo}
                      onPaymentComplete={handlePaymentComplete}
                      onPaymentError={(error) => {
                        console.error('Swish payment error:', error);
                        setSubmitError('Ett fel uppstod vid Swish-betalningen. Försök igen eller kontakta support.');
                      }}
                      onPaymentCancelled={() => {
                        console.log('Swish payment cancelled');
                        setSubmitError('Betalningen avbröts. Försök igen eller välj en annan betalningsmetod.');
                      }}
                    />
                  )}
                </CardContent>
              </Card>
              
              {/* Invoice Payment Option */}
              <Card 
                variant="outlined" 
                sx={{ 
                  mb: 2, 
                  border: selectedPaymentMethod === 'invoice' ? '2px solid' : '1px solid', 
                  borderColor: selectedPaymentMethod === 'invoice' ? 'var(--primary)' : 'divider',
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
                  
                  {selectedPaymentMethod === 'invoice' && userInfo && (
                    <InvoicePaymentSection
                      ref={invoicePaymentRef}
                      userInfo={userInfo}
                      productId={courseId}
                      amount={calculatePrice()}
                      productType={
                        flowType === FlowType.GIFT_CARD ? 'gift_card' : 
                        flowType === FlowType.ART_PURCHASE ? 'art_product' : 
                        'course'
                      }
                      onPaymentComplete={handlePaymentSuccess}
                      onValidationError={(error: string) => setFormErrors(prev => ({ ...prev, invoice: error }))}
                      onPaymentError={(error: Error) => {
                        console.error('Invoice payment error:', error);
                        setSubmitError('Ett fel uppstod vid fakturabetalningen. Försök igen eller kontakta support.');
                      }}
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
          Sammanfattning
        </Typography>
        
        {courseDetail && flowType !== FlowType.GIFT_CARD && flowType !== FlowType.ART_PURCHASE && (
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

        {/* Gift Card Summary */}
        {flowType === FlowType.GIFT_CARD && flowData?.itemDetails && (
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CardGiftcardIcon sx={{ mr: 1, color: 'var(--primary)' }} />
                <Typography variant="subtitle1" fontWeight="bold">
                  Presentkort
                </Typography>
              </Box>

              <Typography variant="body2" sx={{ mb: 0.5 }}>
                Belopp: {flowData.itemDetails.amount} kr
              </Typography>

              {flowData.itemDetails.recipientName && (
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  Till: {flowData.itemDetails.recipientName}
                </Typography>
              )}

              {flowData.itemDetails.recipientEmail && (
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  E-post: {flowData.itemDetails.recipientEmail}
                </Typography>
              )}

              {flowData.itemDetails.message && (
                <Box sx={{ mt: 1, p: 1.5, bgcolor: 'rgba(84, 114, 100, 0.05)', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                    "{flowData.itemDetails.message}"
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Shop Product Summary */}
        {flowType === FlowType.ART_PURCHASE && flowData?.itemDetails && (
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ShoppingBagIcon sx={{ mr: 1, color: 'var(--primary)' }} />
                <Typography variant="subtitle1" fontWeight="bold">
                  {flowData.itemDetails.title}
                </Typography>
              </Box>

              {/* Add product image if available */}
              {flowData.itemDetails.image && (
                <Box sx={{ width: '100%', height: 150, position: 'relative', mb: 2, borderRadius: 1, overflow: 'hidden' }}>
                  <img 
                    src={flowData.itemDetails.image} 
                    alt={flowData.itemDetails.title} 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover' 
                    }} 
                  />
                </Box>
              )}

              {/* Price information with discount if applicable */}
              <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 1 }}>
                <Typography variant="body2" sx={{ mr: 1 }}>Pris:</Typography>
                {flowData.itemDetails.originalPrice ? (
                  <>
                    <Typography 
                      variant="body2" 
                      component="span" 
                      sx={{ 
                        textDecoration: 'line-through', 
                        color: 'text.secondary',
                        mr: 1
                      }}
                    >
                      {flowData.itemDetails.originalPrice} kr
                    </Typography>
                    <Typography 
                      variant="body1" 
                      component="span" 
                      sx={{ fontWeight: 'bold', color: 'var(--primary)' }}
                    >
                      {flowData.itemDetails.price} kr
                    </Typography>
                  </>
                ) : (
                  <Typography 
                    variant="body1" 
                    component="span" 
                    sx={{ fontWeight: 'bold' }}
                  >
                    {flowData.itemDetails.price} kr
                  </Typography>
                )}
              </Box>

              {/* Description if available */}
              {flowData.itemDetails.description && (
                <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                  {flowData.itemDetails.description.length > 100 
                    ? `${flowData.itemDetails.description.slice(0, 100)}...` 
                    : flowData.itemDetails.description}
                </Typography>
              )}
              
              {/* Product category if available */}
              {flowData.itemDetails.category && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Kategori: {flowData.itemDetails.category}
                </Typography>
              )}

              {/* Stock information */}
              {flowData.itemDetails.stockQuantity !== undefined && (
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <InventoryIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {flowData.itemDetails.stockQuantity} i lager
                  </Typography>
                </Box>
              )}
              
              {/* Pickup information */}
              <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(84, 114, 100, 0.05)', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                  <LocationOnIcon sx={{ fontSize: 18, mr: 0.5, color: 'var(--primary)' }} />
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    Upphämtning
                  </Typography>
                </Box>
                <Typography variant="body2">
                  Produkten hämtas på Studio Clay, Norrtullsgatan 65, Stockholm
                </Typography>
              </Box>
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
                
                {flowType !== FlowType.ART_PURCHASE && (
                  <ListItem disableGutters>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <PeopleIcon fontSize="small" sx={{ color: 'var(--primary)' }} />
                    </ListItemIcon>
                    <ListItemText primary={`Antal deltagare: ${userInfo.numberOfParticipants}`} />
                  </ListItem>
                )}
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
            {flowType === FlowType.GIFT_CARD 
              ? `${flowData?.itemDetails?.amount || getGiftCardAmount()} kr`
              : `${calculatePrice()} kr`}
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
          type="submit"
          onClick={(e) => handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>)}
          disabled={isSubmitting}
          endIcon={isSubmitting ? <CircularProgress size={20} /> : null}
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
            {renderProcessingStatus()}
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
            {renderProcessingStatus()}
            {renderButtons()}
          </Paper>
        </>
      )}
    </>
  );
};

export default PaymentSelection; 