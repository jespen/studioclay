import { useState, useEffect, useRef } from 'react';
import { PaymentStatus, PAYMENT_STATUS } from '@/services/swish/types';
import { PAYMENT_STATUSES, getValidPaymentStatus } from '@/constants/statusCodes';
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
  const checkPaymentStatus = async (directReference?: string): Promise<PaymentStatus | null> => {
    const reference = directReference || paymentReference || getPaymentReference();
    console.log(`[${sessionId}] checkPaymentStatus called with reference:`, reference);
    
    if (!reference || reference === 'undefined' || reference === 'null') {
      console.error(`[${sessionId}] No valid payment reference available to check status`);
      return null;
    }
    
    try {
      console.log(`[${sessionId}] Checking status for payment reference: ${reference} (typeof: ${typeof reference})`);
      
      const response = await fetch(`/api/payments/status/${reference}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[${sessionId}] Payment status check failed with HTTP ${response.status}: ${response.statusText}`, errorText);
        return null;
      }
      
      const data = await response.json();
      
      console.log(`[${sessionId}] Status check raw response:`, JSON.stringify(data));
      
      // First try the newest API format (data.data.status)
      if (data.data?.status) {
        const status = data.data.status.toUpperCase();
        console.log(`[${sessionId}] Payment status (newest format): ${status}`);
        
        if (data.data.booking_reference) {
          console.log(`[${sessionId}] Booking reference received:`, data.data.booking_reference);
          setBookingReference(data.data.booking_reference);
        }
        
        return mapToPaymentStatus(status);
      }
      
      // Then try the "middle" API format
      if (data.status) {
        const status = data.status.toUpperCase();
        console.log(`[${sessionId}] Payment status (middle format): ${status}`);
        
        if (data.bookingReference) {
          console.log(`[${sessionId}] Booking reference received:`, data.bookingReference);
          setBookingReference(data.bookingReference);
        }
        
        return mapToPaymentStatus(status);
      }
      
      // Finally try the oldest format for backwards compatibility
      if (data.payment?.status) {
        const status = data.payment.status.toUpperCase();
        console.log(`[${sessionId}] Payment status (old format): ${status}`);
        
        if (data.booking?.reference || data.booking?.booking_reference) {
          const ref = data.booking.reference || data.booking.booking_reference;
          console.log(`[${sessionId}] Booking reference received:`, ref);
          setBookingReference(ref);
        }
        
        return mapToPaymentStatus(status);
      }
      
      // If no status found, log it but do not generate an ERROR status
      console.log(`[${sessionId}] No payment status found in response, continuing to poll`);
      return null;
    } catch (error) {
      console.error(`[${sessionId}] Error checking payment status:`, error);
      return null;
    }
  };

  // Helper function to map status string to PaymentStatus enum
  const mapToPaymentStatus = (status: string): PaymentStatus => {
    return getValidPaymentStatus(status);
  };

  // Handle closing the payment dialog
  const handleClosePaymentDialog = () => {
    // Always stop polling when dialog is closed
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    
    // Set cancelled flag if payment was not completed
    if (paymentStatus === PAYMENT_STATUS.ERROR || 
        paymentStatus === PAYMENT_STATUS.DECLINED || 
        paymentStatus === PAYMENT_STATUS.CREATED) {
      isCancelledRef.current = true;
    }
    
    // Reset state
    setShowPaymentDialog(false);
    setPaymentStatus(null);
    
    // Clear the payment reference from flowStorage only if payment was not successful
    if (paymentStatus !== PAYMENT_STATUS.PAID) {
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
      // Don't poll if dialog is closed or payment is cancelled
      if (!showPaymentDialog || isCancelledRef.current) {
        console.log(`[${sessionId}] Polling stopped - Dialog closed or payment cancelled`);
        return;
      }
      
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
        // Stoppa pollning utan att sätta en ERROR-status
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        return;
      }

      attempts++;
      console.log(`[${sessionId}] Payment status check attempt ${attempts}/${maxAttempts} for reference: ${currentReference}`);
      
      try {
        const currentStatus = paymentStatus;
        const status = await checkPaymentStatus(currentReference);
        console.log(`[${sessionId}] Poll received status:`, status, 'current:', currentStatus);
        
        // Only update status if we got a non-null status from the API
        if (status !== null && status !== paymentStatus) {
          console.log(`[${sessionId}] Updating payment status from`, paymentStatus, 'to', status);
          setPaymentStatus(status);
        } else if (status === null) {
          console.log(`[${sessionId}] Received null status, not updating`);
        } else if (status === paymentStatus) {
          console.log(`[${sessionId}] Status unchanged: ${status}, not updating`);
        }
        
        // Handle completed states (PAID, DECLINED)
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
        } else if (status === PAYMENT_STATUS.DECLINED) {
          console.log(`[${sessionId}] Payment declined, clearing interval`);
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