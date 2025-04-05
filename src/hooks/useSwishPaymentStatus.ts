import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PaymentStatus, PAYMENT_STATUS } from '@/services/swish/types';
import { getPaymentReference, setPaymentReference, setBookingReference, getFlowType } from '@/utils/flowStorage';
import { FlowType } from '@/components/common/BookingStepper';

interface UseSwishPaymentStatusProps {
  paymentReference: string | null;
  courseId?: string;
  onSuccess?: () => void;
  redirectPath?: string;
}

interface UseSwishPaymentStatusResult {
  paymentStatus: PaymentStatus | null;
  setPaymentStatus: (status: PaymentStatus | null) => void;
  showPaymentDialog: boolean;
  setShowPaymentDialog: (show: boolean) => void;
  handleClosePaymentDialog: () => void;
}

export const useSwishPaymentStatus = ({
  paymentReference,
  courseId,
  onSuccess,
  redirectPath
}: UseSwishPaymentStatusProps): UseSwishPaymentStatusResult => {
  const router = useRouter();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  // Check payment status
  const checkPaymentStatus = async (directReference?: string): Promise<PaymentStatus> => {
    const reference = directReference || paymentReference || getPaymentReference();
    console.log('checkPaymentStatus called with reference:', reference);
    
    if (!reference || reference === 'undefined' || reference === 'null') {
      console.error('No valid payment reference available to check status');
      return PAYMENT_STATUS.ERROR;
    }
    
    try {
      console.log(`Checking status for payment: ${reference}`);
      const response = await fetch(`/api/payments/status/${reference}`);
      const data = await response.json();
      
      console.log('Status check response:', data);
      
      if (!data.success) {
        console.error('Status API reported error:', data);
        return PAYMENT_STATUS.ERROR;
      }
      
      if (data.data?.booking?.reference) {
        console.log('Booking reference received:', data.data.booking.reference);
        setBookingReference(data.data.booking.reference);
      }
      
      const status = data.data?.payment?.status as string;
      console.log(`Payment status: ${status}`);
      
      if (!status) {
        console.error('No payment status found in response');
        return PAYMENT_STATUS.ERROR;
      }
      
      switch (status.toUpperCase()) {
        case 'PAID':
          return PAYMENT_STATUS.PAID;
        case 'DECLINED':
          return PAYMENT_STATUS.DECLINED;
        case 'ERROR':
          return PAYMENT_STATUS.ERROR;
        case 'CREATED':
          return PAYMENT_STATUS.CREATED;
        default:
          return PAYMENT_STATUS.CREATED;
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      return PAYMENT_STATUS.ERROR;
    }
  };

  // Handle closing the payment dialog
  const handleClosePaymentDialog = () => {
    if (paymentStatus === PAYMENT_STATUS.ERROR || paymentStatus === PAYMENT_STATUS.DECLINED) {
      setShowPaymentDialog(false);
      setPaymentStatus(null);
      // Clear the payment reference from flowStorage
      setPaymentReference("");
    }
  };

  // Funktion för att välja rätt redirectsida baserat på produkttyp
  const getRedirectPath = () => {
    // Om en specifik redirectPath är angiven, använd den
    if (redirectPath) {
      return redirectPath;
    }

    // Annars, använd rätt redirectsida baserat på produkttyp
    const flowType = getFlowType();
    console.log('Current flow type:', flowType);

    switch (flowType) {
      case FlowType.GIFT_CARD:
      case 'gift_card':
        return '/presentkort/bekraftelse';
      case FlowType.ART_PURCHASE:
      case 'art_purchase':
        return '/shop/bekraftelse';
      case FlowType.COURSE_BOOKING:
      case 'course_booking':
      default:
        // För kurser, använd kurs-ID för att bygga redirectlänken
        return courseId ? `/book-course/${courseId}/confirmation` : '/bekraftelse';
    }
  };

  // Start polling payment status
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let attempts = 0;
    const maxAttempts = 15; // Minskat från 30 till 15 (= 30 sekunder med 2 sekunders intervall)
    let redirectTimeout: NodeJS.Timeout;
    let hasCheckedWithSwish = false;

    const pollStatus = async () => {
      if (!showPaymentDialog) return;
      
      if (attempts >= maxAttempts) {
        console.log('Status check reached max attempts. Stopping polling.');
        
        // Visa ett meddelande till användaren om att betalningen fortfarande behandlas
        setPaymentStatus(prev => {
          if (prev === PAYMENT_STATUS.CREATED) {
            console.log('Payment still in CREATED state after max attempts. Showing processing message.');
            return PAYMENT_STATUS.CREATED;
          }
          return prev;
        });
        
        clearInterval(intervalId);
        return;
      }

      const currentReference = paymentReference || getPaymentReference();
      if (!currentReference || currentReference === 'undefined' || currentReference === 'null') {
        console.log('No valid reference available for polling');
        setPaymentStatus(PAYMENT_STATUS.ERROR);
        clearInterval(intervalId);
        return;
      }

      attempts++;
      console.log(`Payment status check attempt ${attempts}/${maxAttempts} for reference: ${currentReference}`);
      
      // Efter 15 sekunder (attempt 8) med CREATED-status, be servern att kontrollera med Swish direkt
      if (attempts === 8 && paymentStatus === PAYMENT_STATUS.CREATED && !hasCheckedWithSwish) {
        console.log('Midway polling - requesting server to check with Swish directly');
        hasCheckedWithSwish = true;
        
        try {
          // Använd forceCheck=true för att tvinga en direktkontroll mot Swish
          const forcedCheckResponse = await fetch(`/api/payments/status/${currentReference}?forceCheck=true`);
          const forcedCheckData = await forcedCheckResponse.json();
          
          console.log('Forced Swish status check response:', forcedCheckData);
          
          if (forcedCheckData.success && forcedCheckData.data?.payment?.status === PAYMENT_STATUS.PAID) {
            console.log('Forced check returned PAID status. Updating and redirecting.');
            setPaymentStatus(PAYMENT_STATUS.PAID);
            
            clearInterval(intervalId);
            
            redirectTimeout = setTimeout(() => {
              console.log('Redirecting after successful payment (from forced check)');
              if (onSuccess) {
                onSuccess();
              } else {
                const redirectUrl = getRedirectPath();
                console.log('Redirecting to:', redirectUrl);
                router.push(redirectUrl);
              }
            }, 1500);
            
            return;
          }
        } catch (forcedCheckError) {
          console.error('Error in forced Swish status check:', forcedCheckError);
        }
      }
      
      try {
        const status = await checkPaymentStatus(currentReference);
        console.log('Poll received status:', status);
        
        if (status !== paymentStatus) {
          console.log('Updating payment status from', paymentStatus, 'to', status);
          setPaymentStatus(status);
        }
        
        if (status === PAYMENT_STATUS.PAID) {
          console.log('Payment is PAID, clearing interval and preparing redirect');
          clearInterval(intervalId);
          
          redirectTimeout = setTimeout(() => {
            console.log('Redirecting after successful payment');
            if (onSuccess) {
              onSuccess();
            } else {
              const redirectUrl = getRedirectPath();
              console.log('Redirecting to:', redirectUrl);
              router.push(redirectUrl);
            }
          }, 1500);
        } else if (status === PAYMENT_STATUS.DECLINED || status === PAYMENT_STATUS.ERROR) {
          console.log('Payment failed or declined, clearing interval');
          clearInterval(intervalId);
        }
      } catch (error) {
        console.error('Error in pollStatus:', error);
      }
    };

    if (showPaymentDialog && (paymentReference || getPaymentReference())) {
      console.log('Starting payment status polling');
      pollStatus();
      intervalId = setInterval(pollStatus, 2000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (redirectTimeout) {
        clearTimeout(redirectTimeout);
      }
    };
  }, [showPaymentDialog, paymentReference, paymentStatus, courseId, router, onSuccess, redirectPath]);

  return {
    paymentStatus,
    setPaymentStatus,
    showPaymentDialog,
    setShowPaymentDialog,
    handleClosePaymentDialog,
  };
}; 