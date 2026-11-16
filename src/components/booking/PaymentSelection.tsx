/**
 * PaymentSelection Component
 * 
 * This component handles the payment selection and processing flow in the booking process.
 * Invoice is the only payment method.
 */

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Radio, 
  RadioGroup, 
  FormControlLabel, 
  FormControl, 
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  TextField,
} from '@mui/material';

import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import PeopleIcon from '@mui/icons-material/People';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import EventIcon from '@mui/icons-material/Event';
import InventoryIcon from '@mui/icons-material/Inventory';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import { GenericStep, FlowType } from '../common/BookingStepper';
import GenericFlowContainer from '../common/GenericFlowContainer';
import FlowCard from '../common/FlowCard';
import FlowActions from '../common/FlowActions';
import ItemSummary, { SummaryDetail } from '../common/ItemSummary';
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
import { getPreviousStepUrl, getNextStepUrl, getStepUrl } from '@/utils/flowNavigation';
import { 
  PAYMENT_STATUSES, 
  PAYMENT_METHODS, 
  PRODUCT_TYPES,
  type PaymentStatus
} from '@/constants/statusCodes';
import { PaymentService } from '@/services/payment/paymentService';
import { validatePaymentRequest } from '@/lib/validation/paymentSchemas';
import { type ProductType } from '@/constants/statusCodes';
import InvoicePaymentSection, { InvoicePaymentSectionRef } from '../payment/InvoicePaymentSection';
import { StandardPaymentResponse, PaymentReferenceData } from '@/types/paymentTypes';
import InvoicePaymentDialog from './InvoicePaymentDialog';

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

  const hasInitialFlowData = Boolean(flowData?.itemDetails && flowData?.userInfo);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(
    hasInitialFlowData ? (flowData!.userInfo as UserInfo) : null
  );
  const [courseDetail, setCourseDetail] = useState<CourseDetail | null>(
    hasInitialFlowData ? (flowData!.itemDetails as CourseDetail) : null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(!hasInitialFlowData);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('invoice');

  const [error, setError] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  
  const [formErrors, setFormErrors] = useState<BaseFormErrors>({});
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

  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invoiceStatus, setInvoiceStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [bookingReference, setBookingReference] = useState<string>('');

  // Add an effect to ensure the dialog's state is properly managed
  useEffect(() => {
    if (isSubmitting && selectedPaymentMethod === 'invoice') {
      setInvoiceDialogOpen(true);
      setInvoiceStatus('loading');
    }
  }, [isSubmitting, selectedPaymentMethod]);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Prioritize data from flowData props
        if (flowData?.itemDetails && flowData?.userInfo) {
          setCourseDetail(flowData.itemDetails as CourseDetail);
          setUserInfo(flowData.userInfo as UserInfo);
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        const [courseData, userData] = await Promise.all([
          fetchCourseDetail(courseId),
          getUserInfo()
        ]);

        setCourseDetail(courseData);
        setUserInfo(userData);
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
      if (invoicePaymentRef.current) {
        return invoicePaymentRef.current.validateForm();
      }
    }
    
    return false;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('[PaymentSelection] Form submitted, payment method:', selectedPaymentMethod);
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    // Force open appropriate dialog immediately
    if (selectedPaymentMethod === 'invoice') {
      setInvoiceDialogOpen(true);
      setInvoiceStatus('loading');
    }
    
    try {
      if (!userInfo) {
        console.error('[PaymentSelection] No user info available');
        throw new Error('Användaruppgifter saknas');
      }
      
      console.log('[PaymentSelection] Flow type:', flowType);
      
      if (selectedPaymentMethod === 'invoice') {
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
        console.error('[PaymentSelection] No valid payment method selected');
        setFormErrors(prev => ({ ...prev, paymentMethod: 'Välj en betalningsmetod' }));
      }
    } catch (error) {
      console.error('[PaymentSelection] Error submitting payment:', error);
      setSubmitError(error instanceof Error ? error.message : 'Ett fel uppstod');
      
      // Update dialog states for errors
      if (selectedPaymentMethod === 'invoice') {
        setInvoiceStatus('error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInvoicePayment = async (): Promise<boolean> => {
    try {
      if (!invoicePaymentRef.current) {
        throw new Error('Kunde inte hitta fakturaformulär');
      }

      // Get invoice details from the invoice payment section
      const invoiceDetails = invoicePaymentRef.current.getInvoiceDetails();
      
      // Submit the invoice payment
      const result = await invoicePaymentRef.current.submitInvoicePayment();
      
      if (result) {
        // Success! Update dialog state
        setInvoiceStatus('success');
        return true;
      } else {
        // Error occurred
        setInvoiceStatus('error');
        return false;
      }
    } catch (error) {
      console.error('[PaymentSelection] Invoice payment error:', error);
      setInvoiceStatus('error');
      return false;
    }
  };

  const handlePaymentComplete = (paymentData: any) => {
    // Determine redirect path based on payment reference if available
    let redirectPath = '/';
    
    // Use flow navigation system for consistent URLs
    if (flowType === FlowType.COURSE_BOOKING) {
      redirectPath = getStepUrl(FlowType.COURSE_BOOKING, GenericStep.CONFIRMATION, courseId);
      // Add reference as query parameter for additional context
      if (paymentData?.paymentReference) {
        redirectPath += `?reference=${paymentData.paymentReference}`;
      }
    } else if (flowType === FlowType.GIFT_CARD) {
      redirectPath = getStepUrl(FlowType.GIFT_CARD, GenericStep.CONFIRMATION);
      // Add reference as query parameter for additional context
      if (paymentData?.paymentReference) {
        redirectPath += `?reference=${paymentData.paymentReference}`;
      }
    } else if (flowType === FlowType.ART_PURCHASE) {
      // For shop, we need the product ID from flowData or courseId (which serves as itemId)
      const productId = flowData?.itemDetails?.id || courseId;
      redirectPath = getStepUrl(FlowType.ART_PURCHASE, GenericStep.CONFIRMATION, productId);
      // Add reference as query parameter for additional context
      if (paymentData?.paymentReference) {
        redirectPath += `?reference=${paymentData.paymentReference}`;
      }
    } else if (paymentData?.paymentReference) {
      // Fallback to generic payment confirmation
      redirectPath = `/payment/confirmation/${paymentData.paymentReference}`;
    }
    
    console.log('[PaymentSelection] Redirecting to:', redirectPath);
    router.push(redirectPath);
    
    // Call onNext if a callback exists
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

  // Calculate price based on number of participants or gift card amount
  const calculatePrice = () => {
    // För presentkort, använd belopp från GiftCard-detaljer
    if (flowType === FlowType.GIFT_CARD) {
      return getGiftCardAmount();
    }
    
    // För konstprodukter, använd produktpris direkt
    if (flowType === FlowType.ART_PURCHASE && flowData?.itemDetails?.price) {
      return flowData.itemDetails.price;
    }
    
    // För kurser, beräkna baserat på antal deltagare
    if (!userInfo || !courseDetail || !courseDetail.price) {
      return 0;
    }
    
    const numParticipants = parseInt(userInfo.numberOfParticipants) || 1;
    return courseDetail.price * numParticipants;
  };

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
    
    console.log(`✅ Payment fully completed (including all background processing): ${paymentStatus}`, paymentData);
    
    // VIKTIGT: Uppdatera dialog-status omedelbart när API:et returnerar framgång
    if (selectedPaymentMethod === 'invoice') {
      setInvoiceStatus('success');
      setInvoiceNumber(paymentData.invoiceNumber || paymentData.invoice_number || '');
      setBookingReference(paymentData.bookingReference || paymentData.payment_reference || '');
    }
    
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

    // Bokningen är sparad. PDF och mejl skickas efter att svaret har gått tillbaka.
    console.log('Order saved, continuing to confirmation while invoice email is prepared');
    
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
    // We're now using dialogs instead of the inline processing status
    return null;
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
            color: 'var(--primary-dark)',
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

  const renderPurchaseSummary = () => {
    if (flowType === FlowType.GIFT_CARD && flowData?.itemDetails) {
      const item = flowData.itemDetails;
      const details: SummaryDetail[] = [];
      if (item.recipientName) {
        details.push({ icon: <PersonIcon />, label: item.recipientName });
      }
      return (
        <ItemSummary
          title="Presentkort"
          price={item.amount || getGiftCardAmount()}
          details={details}
        />
      );
    }

    if (flowType === FlowType.ART_PURCHASE && flowData?.itemDetails) {
      const item = flowData.itemDetails;
      const details: SummaryDetail[] = [];
      if (item.stockQuantity !== undefined) {
        details.push({ icon: <InventoryIcon />, label: `${item.stockQuantity} i lager` });
      }
      return (
        <ItemSummary
          title={item.title}
          price={item.price}
          originalPrice={item.originalPrice}
          details={details}
        />
      );
    }

    if (courseDetail && flowType !== FlowType.GIFT_CARD && flowType !== FlowType.ART_PURCHASE) {
      const details: SummaryDetail[] = [];
      if (courseDetail.start_date) {
        details.push({
          icon: <EventIcon />,
          label: new Date(courseDetail.start_date).toLocaleDateString('sv-SE', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
        });
      }
      if (courseDetail.location) {
        details.push({ icon: <LocationOnIcon />, label: courseDetail.location });
      }
      return (
        <ItemSummary
          title={courseDetail.title}
          price={calculatePrice()}
          details={details}
        />
      );
    }

    return null;
  };

  // Render the buttons
  const renderButtons = () => (
    <FlowActions
      onBack={handleBack}
      backDisabled={isSubmitting}
      onNext={(e) => handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>)}
      nextDisabled={isSubmitting}
      nextLabel={isSubmitting ? 'Bearbetar...' : 'Slutför bokning'}
      nextEndIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : undefined}
      note={
        <>
          Genom att slutföra bokningen godkänner du våra{' '}
          <a href="/villkor" target="_blank" rel="noopener noreferrer">bokningsvillkor</a>
          {' '}och{' '}
          <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">integritetspolicy</a>.
        </>
      }
    />
  );

  const handleInvoiceDialogClose = () => {
    setInvoiceDialogOpen(false);
  };
  
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
          <FlowCard>
            {renderPurchaseSummary()}
            {renderPaymentContent()}
            {renderProcessingStatus()}
            {renderButtons()}
          </FlowCard>
          
          <InvoicePaymentDialog
            open={invoiceDialogOpen}
            onClose={handleInvoiceDialogClose}
            status={invoiceStatus}
            invoiceNumber={invoiceNumber}
            bookingReference={bookingReference}
          />
        </GenericFlowContainer>
      ) : (
        <>
          {submitError && (
            <Alert severity="error" sx={{ mb: 3 }}>{submitError}</Alert>
          )}
          <FlowCard>
            {renderPurchaseSummary()}
            {renderPaymentContent()}
            {renderProcessingStatus()}
            {renderButtons()}
          </FlowCard>
          
          <InvoicePaymentDialog
            open={invoiceDialogOpen}
            onClose={handleInvoiceDialogClose}
            status={invoiceStatus}
            invoiceNumber={invoiceNumber}
            bookingReference={bookingReference}
          />
        </>
      )}
    </>
  );
};

export default PaymentSelection; 