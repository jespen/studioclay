import { useState, useEffect, useRef } from 'react';
import { PaymentStatus, PAYMENT_STATUS } from '@/services/swish/types';
import { useRouter } from 'next/navigation';
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
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef(`session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
  const sessionId = sessionIdRef.current;
  const isCancelledRef = useRef(false);

  // Check payment status
  const checkPaymentStatus = async (directReference?: string): Promise<PaymentStatus> => {
    const reference = directReference || paymentReference || getPaymentReference();
    console.log(`[${sessionId}] checkPaymentStatus called with reference:`, reference);
    
    if (!reference || reference === 'undefined' || reference === 'null') {
      console.error(`[${sessionId}] No valid payment reference available to check status`);
      return PAYMENT_STATUS.ERROR;
    }
    
    try {
      console.log(`[${sessionId}] Checking status for payment: ${reference}`);
      
      const response = await fetch(`/api/payments/status/${reference}`);
      const data = await response.json();
      
      console.log(`[${sessionId}] Status check raw response:`, data);
      
      if (!data.success) {
        console.error(`[${sessionId}] Status API reported error:`, data);
        return PAYMENT_STATUS.ERROR;
      }
      
      console.log(`[${sessionId}] Payment details from status check:`, {
        id: data.data?.payment?.id,
        status: data.data?.payment?.status,
        created_at: data.data?.payment?.created_at,
        updated_at: data.data?.payment?.updated_at,
        callback_received: data.data?.payment?.callback_received,
        callback_time: data.data?.payment?.callback_time,
        direct_swish_status: data.data?.payment?.direct_swish_status
      });
      
      if (data.data?.booking?.reference) {
        console.log(`[${sessionId}] Booking reference received:`, data.data.booking.reference);
        setBookingReference(data.data.booking.reference);
      }
      
      const status = data.data?.payment?.status as string;
      console.log(`[${sessionId}] Payment status: ${status}`);
      
      if (!status) {
        console.error(`[${sessionId}] No payment status found in response`);
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
      console.error(`[${sessionId}] Error checking payment status:`, error);
      return PAYMENT_STATUS.ERROR;
    }
  };

  // Handle closing the payment dialog
  const handleClosePaymentDialog = () => {
    if (paymentStatus === PAYMENT_STATUS.ERROR || paymentStatus === PAYMENT_STATUS.DECLINED) {
      // Stop polling
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      isCancelledRef.current = true;
      setShowPaymentDialog(false);
      setPaymentStatus(null);
      // Clear the payment reference from flowStorage
      setPaymentReference("");
    }
  };

  // Function to choose correct redirect page based on product type
  const getRedirectPath = () => {
    // If a specific redirectPath is provided, use it
    if (redirectPath) {
      return redirectPath;
    }

    // Otherwise, use correct redirect page based on product type
    const flowType = getFlowType();
    console.log(`[${sessionId}] Current flow type:`, flowType);

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
        // For courses, use course ID to build redirect link
        return courseId ? `/book-course/${courseId}/confirmation` : '/bekraftelse';
    }
  };

  // Start polling payment status
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 30; // 60 seconds with 2 second interval
    let redirectTimeout: NodeJS.Timeout;

    const pollStatus = async () => {
      if (!showPaymentDialog || isCancelledRef.current) return;
      
      if (attempts >= maxAttempts) {
        console.log(`[${sessionId}] Status check reached max attempts (${maxAttempts}). Stopping polling.`);
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        return;
      }

      const currentReference = paymentReference || getPaymentReference();
      if (!currentReference || currentReference === 'undefined' || currentReference === 'null') {
        console.log(`[${sessionId}] No valid reference available for polling`);
        setPaymentStatus(PAYMENT_STATUS.ERROR);
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        return;
      }

      attempts++;
      console.log(`[${sessionId}] Payment status check attempt ${attempts}/${maxAttempts} for reference: ${currentReference}`);
      
      try {
        // Regular status check
        const status = await checkPaymentStatus(currentReference);
        console.log(`[${sessionId}] Poll received status:`, status);
        
        if (status !== paymentStatus) {
          console.log(`[${sessionId}] Updating payment status from`, paymentStatus, 'to', status);
          setPaymentStatus(status);
        }
        
        if (status === PAYMENT_STATUS.PAID) {
          console.log(`[${sessionId}] Payment is PAID, clearing interval and preparing redirect`);
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          
          redirectTimeout = setTimeout(() => {
            console.log(`[${sessionId}] Redirecting after successful payment`);
            if (onSuccess) {
              onSuccess();
            } else {
              const redirectUrl = getRedirectPath();
              console.log(`[${sessionId}] Redirecting to:`, redirectUrl);
              router.push(redirectUrl);
            }
          }, 1500);
        } else if (status === PAYMENT_STATUS.DECLINED || status === PAYMENT_STATUS.ERROR) {
          console.log(`[${sessionId}] Payment failed or declined, clearing interval`);
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
      } catch (error) {
        console.error(`[${sessionId}] Error in pollStatus:`, error);
      }
    };

    if (showPaymentDialog && (paymentReference || getPaymentReference()) && !isCancelledRef.current) {
      console.log(`[${sessionId}] Starting payment status polling`);
      pollStatus();
      pollingRef.current = setInterval(pollStatus, 2000);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
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