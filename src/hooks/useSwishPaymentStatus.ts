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
  const paidStatusDetectedRef = useRef(false);

  // Check payment status
  const checkPaymentStatus = async (reference?: string): Promise<PaymentStatus | null> => {
    const paymentRef = reference || paymentReference || getPaymentReference();
    
    if (!paymentRef) {
      console.log('⚠️ No payment reference available');
      return null;
    }
    
    try {
      console.log(`🔄 [${sessionId}] Checking status for payment: ${paymentRef}`);
      
      const response = await fetch(`/api/payments/status/${paymentRef}`);
      if (!response.ok) {
        console.log(`❌ [${sessionId}] API request failed: ${response.status}`);
        return null;
      }
      
      const data = await response.json();
      console.log(`📥 [${sessionId}] API response:`, data);
      
      // Extract status from various possible locations in the response
      const status = data.data?.status || data.status;
      
      // If we have a status, validate and return it
      if (status) {
        const validStatus = getValidPaymentStatus(status);
        console.log(`📊 [${sessionId}] Extracted status: ${validStatus}`);
        return validStatus;
      }
      
      console.log(`⚠️ [${sessionId}] No status found in API response`);
      return null;
    } catch (error) {
      console.error(`❌ [${sessionId}] Error checking payment status:`, error);
      return null;
    }
  };

  // Handle closing the payment dialog
  const handleClosePaymentDialog = () => {
    console.log(`🔒 [${sessionId}] Closing payment dialog, current status: ${paymentStatus}`);
    
    // Always stop polling when dialog is closed
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
      console.log(`⏹️ [${sessionId}] Polling stopped`);
    }
    
    // Set cancelled flag if payment was not completed
    if (paymentStatus !== PAYMENT_STATUSES.PAID) {
      isCancelledRef.current = true;
      console.log(`🚫 [${sessionId}] Marking payment as cancelled`);
    }
    
    // Reset state
    setShowPaymentDialog(false);
    
    // Only reset payment status if not PAID
    if (paymentStatus !== PAYMENT_STATUSES.PAID) {
      setPaymentStatus(null);
    }
    
    // Clear the payment reference from flowStorage only if payment was not successful
    if (paymentStatus !== PAYMENT_STATUSES.PAID) {
      setPaymentReference("");
      console.log(`🗑️ [${sessionId}] Cleared payment reference`);
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
    console.log(`🛣️ [${sessionId}] Current flow type: ${flowType}`);

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

  // Process a detected payment status update
  const processStatusUpdate = (newStatus: PaymentStatus | null) => {
    // If no status or already detected PAID, do nothing
    if (!newStatus || paidStatusDetectedRef.current) return;
    
    console.log(`📝 [${sessionId}] Processing status update: ${newStatus}`);
    
    // If PAID status detected
    if (newStatus === PAYMENT_STATUSES.PAID) {
      console.log(`💰 [${sessionId}] PAID status detected!`);
      paidStatusDetectedRef.current = true;
      
      // Update localStorage
      try {
        const paymentInfo = JSON.parse(localStorage.getItem('payment_info') || '{}');
        paymentInfo.status = PAYMENT_STATUSES.PAID;
        localStorage.setItem('payment_info', JSON.stringify(paymentInfo));
        console.log(`💾 [${sessionId}] Updated localStorage payment status to PAID`);
      } catch (error) {
        console.error(`❌ [${sessionId}] Failed to update localStorage:`, error);
      }
      
      // Handle successful payment
      setTimeout(() => {
        console.log(`🚀 [${sessionId}] Handling successful payment completion`);
        if (onSuccess) {
          onSuccess();
        } else {
          const redirectUrl = getRedirectPath();
          console.log(`🔀 [${sessionId}] Redirecting to ${redirectUrl}`);
          router.push(redirectUrl);
        }
      }, 1500);
    }
    
    // Always update state with new status
    setPaymentStatus(newStatus);
  };

  // Start polling payment status
  useEffect(() => {
    // Reset cancellation flag when dialog opens
    if (showPaymentDialog) {
      isCancelledRef.current = false;
    }
    
    // If dialog not open or already detected PAID, don't poll
    if (!showPaymentDialog || paidStatusDetectedRef.current) {
      console.log(`⏹️ [${sessionId}] Not polling: dialog closed or payment already PAID`);
      return;
    }
    
    console.log(`▶️ [${sessionId}] Starting payment polling`);
    let attempts = 0;
    const MAX_ATTEMPTS = 60;
    
    // Simple polling function
    const pollStatus = async () => {
      // Stop conditions
      if (!showPaymentDialog || isCancelledRef.current || paidStatusDetectedRef.current) {
        console.log(`⏹️ [${sessionId}] Stopping poll: dialog closed, payment canceled, or PAID detected`);
        return;
      }
      
      if (attempts >= MAX_ATTEMPTS) {
        console.log(`⏹️ [${sessionId}] Stopping poll: max attempts (${MAX_ATTEMPTS}) reached`);
        return;
      }
      
      attempts++;
      console.log(`🔄 [${sessionId}] Poll attempt ${attempts}/${MAX_ATTEMPTS}`);
      
      // Check status
      const status = await checkPaymentStatus();
      
      // Process the status update
      processStatusUpdate(status);
      
      // Stop polling if payment is completed or failed
      if (status === PAYMENT_STATUSES.PAID || 
          status === PAYMENT_STATUSES.DECLINED || 
          status === PAYMENT_STATUSES.ERROR) {
        console.log(`⏹️ [${sessionId}] Stopping poll: status=${status}`);
        return;
      }
      
      // Continue polling if needed
      if (showPaymentDialog && !isCancelledRef.current && !paidStatusDetectedRef.current) {
        pollingRef.current = setTimeout(pollStatus, 2000);
      }
    };
    
    // Start polling immediately
    pollStatus();
    
    // Cleanup
    return () => {
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [showPaymentDialog, paymentReference]);

  return {
    paymentStatus,
    setPaymentStatus,
    showPaymentDialog,
    setShowPaymentDialog,
    handleClosePaymentDialog,
  };
}; 