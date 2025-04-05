import { useState, useEffect, useCallback } from 'react';
import { PaymentStatus } from '@/types/payment';
import { useRouter } from 'next/navigation';
import { getPaymentReference, setPaymentReference, setBookingReference, getFlowType } from '@/utils/flowStorage';
import { FlowType } from '@/components/common/BookingStepper';

export interface UseSwishPaymentStatusProps {
  paymentReference: string;
  courseId: string;
  onSuccess?: () => void;
  onError?: () => void;
  onDeclined?: () => void;
  onTimeout?: () => void;
  maxPollingTime?: number; // in seconds
  pollingInterval?: number; // in milliseconds
}

export function useSwishPaymentStatus({
  paymentReference,
  courseId,
  onSuccess,
  onError,
  onDeclined,
  onTimeout,
  maxPollingTime = 120, // 2 minutes max polling time
  pollingInterval = 2000, // Poll every 2 seconds
}: UseSwishPaymentStatusProps) {
  const router = useRouter();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [pollingStartTime, setPollingStartTime] = useState<number | null>(null);

  const checkPaymentStatus = useCallback(async () => {
    if (!paymentReference) return;

    try {
      const response = await fetch(`/api/payments/status/${paymentReference}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to check payment status');
      }

      const status = data.status;
      setPaymentStatus(status);

      // Handle different status cases
      switch (status) {
        case PaymentStatus.PAID:
          onSuccess?.();
          return true;
        case PaymentStatus.DECLINED:
          onDeclined?.();
          return true;
        case PaymentStatus.ERROR:
          onError?.();
          return true;
        default:
          return false;
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      setPaymentStatus(PaymentStatus.ERROR);
      onError?.();
      return true;
    }
  }, [paymentReference, onSuccess, onError, onDeclined]);

  useEffect(() => {
    let pollingInterval: NodeJS.Timeout;
    
    if (paymentReference && paymentStatus === PaymentStatus.CREATED) {
      // Start polling timer if not already started
      if (!pollingStartTime) {
        setPollingStartTime(Date.now());
      }

      pollingInterval = setInterval(async () => {
        // Check if we've exceeded max polling time
        if (pollingStartTime && Date.now() - pollingStartTime > maxPollingTime * 1000) {
          clearInterval(pollingInterval);
          setPaymentStatus(PaymentStatus.ERROR);
          onTimeout?.();
          return;
        }

        const shouldStopPolling = await checkPaymentStatus();
        if (shouldStopPolling) {
          clearInterval(pollingInterval);
        }
      }, pollingInterval);
    }

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [paymentReference, paymentStatus, pollingStartTime, maxPollingTime, pollingInterval, checkPaymentStatus, onTimeout]);

  const handleClosePaymentDialog = () => {
    setShowPaymentDialog(false);
    setPaymentStatus(null);
    setPollingStartTime(null);
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

  return {
    paymentStatus,
    setPaymentStatus,
    showPaymentDialog,
    setShowPaymentDialog,
    handleClosePaymentDialog,
  };
} 