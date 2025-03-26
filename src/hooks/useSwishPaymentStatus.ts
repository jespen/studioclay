import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PaymentStatus, PAYMENT_STATUS } from '@/services/swish/types';

interface UseSwishPaymentStatusProps {
  paymentReference: string | null;
  courseId: string;
  onSuccess?: () => void;
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
}: UseSwishPaymentStatusProps): UseSwishPaymentStatusResult => {
  const router = useRouter();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  // Check payment status
  const checkPaymentStatus = async (directReference?: string): Promise<PaymentStatus> => {
    const reference = directReference || paymentReference || localStorage.getItem('currentPaymentReference');
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
        localStorage.setItem('bookingReference', data.data.booking.reference);
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
      localStorage.removeItem('currentPaymentReference');
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
        setPaymentStatus(PAYMENT_STATUS.ERROR);
        clearInterval(intervalId);
        return;
      }

      const currentReference = paymentReference || localStorage.getItem('currentPaymentReference');
      if (!currentReference || currentReference === 'undefined' || currentReference === 'null') {
        console.log('No valid reference available for polling');
        setPaymentStatus(PAYMENT_STATUS.ERROR);
        clearInterval(intervalId);
        return;
      }

      attempts++;
      console.log(`Payment status check attempt ${attempts}/${maxAttempts} for reference: ${currentReference}`);
      
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
            console.log('Redirecting to confirmation page');
            if (onSuccess) {
              onSuccess();
            } else {
              router.push(`/book-course/${courseId}/confirmation`);
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

    if (showPaymentDialog && (paymentReference || localStorage.getItem('currentPaymentReference'))) {
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
  }, [showPaymentDialog, paymentReference, paymentStatus, courseId, router, onSuccess]);

  return {
    paymentStatus,
    setPaymentStatus,
    showPaymentDialog,
    setShowPaymentDialog,
    handleClosePaymentDialog,
  };
}; 