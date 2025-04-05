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
  const sessionIdRef = useRef(`session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
  const sessionId = sessionIdRef.current;

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
    let intervalId: NodeJS.Timeout;
    let attempts = 0;
    const maxAttempts = 30; // 60 seconds with 2 second interval
    let redirectTimeout: NodeJS.Timeout;
    let hasCheckedWithSwish = false;

    const pollStatus = async () => {
      if (!showPaymentDialog) return;
      
      if (attempts >= maxAttempts) {
        console.log(`[${sessionId}] Status check reached max attempts (${maxAttempts}). Stopping polling.`);
        clearInterval(intervalId);
        return;
      }

      const currentReference = paymentReference || getPaymentReference();
      if (!currentReference || currentReference === 'undefined' || currentReference === 'null') {
        console.log(`[${sessionId}] No valid reference available for polling`);
        setPaymentStatus(PAYMENT_STATUS.ERROR);
        clearInterval(intervalId);
        return;
      }

      attempts++;
      console.log(`[${sessionId}] Payment status check attempt ${attempts}/${maxAttempts} for reference: ${currentReference}`);
      
      try {
        // After 20 seconds (attempt 10) with CREATED status, ask server to check with Swish directly
        if (!hasCheckedWithSwish && attempts === 10 && paymentStatus === PAYMENT_STATUS.CREATED) {
          console.log(`[${sessionId}] Midway polling - requesting server to check with Swish directly`);
          hasCheckedWithSwish = true;
          
          try {
            // Use forceCheck=true to force a direct check with Swish
            const forcedCheckResponse = await fetch(`/api/payments/status/${currentReference}?forceCheck=true`);
            const forcedCheckData = await forcedCheckResponse.json();
            
            console.log(`[${sessionId}] Forced Swish status check response:`, forcedCheckData);
            
            if (forcedCheckData.success && forcedCheckData.data?.payment?.status === PAYMENT_STATUS.PAID) {
              console.log(`[${sessionId}] Forced check returned PAID status. Updating and redirecting.`);
              setPaymentStatus(PAYMENT_STATUS.PAID);
              
              clearInterval(intervalId);
              
              redirectTimeout = setTimeout(() => {
                console.log(`[${sessionId}] Redirecting after successful payment (from forced check)`);
                if (onSuccess) {
                  onSuccess();
                } else {
                  const redirectUrl = getRedirectPath();
                  console.log(`[${sessionId}] Redirecting to:`, redirectUrl);
                  router.push(redirectUrl);
                }
              }, 1500);
              
              return;
            }
          } catch (forcedCheckError) {
            console.error(`[${sessionId}] Error in forced Swish status check:`, forcedCheckError);
          }
        }
        
        // Regular status check
        const status = await checkPaymentStatus(currentReference);
        console.log(`[${sessionId}] Poll received status:`, status);
        
        if (status !== paymentStatus) {
          console.log(`[${sessionId}] Updating payment status from`, paymentStatus, 'to', status);
          setPaymentStatus(status);
        }
        
        if (status === PAYMENT_STATUS.PAID) {
          console.log(`[${sessionId}] Payment is PAID, clearing interval and preparing redirect`);
          clearInterval(intervalId);
          
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
          clearInterval(intervalId);
        }
      } catch (error) {
        console.error(`[${sessionId}] Error in pollStatus:`, error);
      }
    };

    if (showPaymentDialog && (paymentReference || getPaymentReference())) {
      console.log(`[${sessionId}] Starting payment status polling`);
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