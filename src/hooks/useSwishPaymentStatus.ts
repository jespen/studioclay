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
  const checkPaymentStatus = async (reference?: string): Promise<PaymentStatus | null> => {
    const paymentRef = reference || paymentReference || getPaymentReference();
    
    if (!paymentRef) {
      console.log('⚠️ No payment reference available');
      return null;
    }
    
    try {
      console.log(`🔄 Checking status for payment: ${paymentRef}`);
      
      // Enkel fetch, simpel URL
      const response = await fetch(`/api/payments/status/${paymentRef}`);
      if (!response.ok) {
        console.log(`❌ API request failed: ${response.status}`);
        return null;
      }
      
      const data = await response.json();
      console.log('📥 Got API response:', data);
      
      // Kolla om betalningen är PAID först av allt
      if (
        data.data?.status === PAYMENT_STATUSES.PAID || 
        data.status === PAYMENT_STATUSES.PAID
      ) {
        console.log('💰 PAYMENT IS PAID!');
        return PAYMENT_STATUSES.PAID;
      }
      
      // För andra statusar, returnera dem direkt
      const status = data.data?.status || data.status;
      if (status) {
        return getValidPaymentStatus(status);
      }
      
      // Om inget svar, returnera null
      console.log('⚠️ No status found in API response');
      return null;
    } catch (error) {
      console.error('❌ Error checking payment status:', error);
      return null;
    }
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
    // Om dialog inte är öppen eller betalning avbruten, gör inget
    if (!showPaymentDialog || isCancelledRef.current) {
      console.log('⏹️ Not polling: dialog closed or payment canceled');
      return;
    }
    
    console.log('▶️ Starting optimized payment polling (max 15 attempts)');
    let attempts = 0;
    const MAX_ATTEMPTS = 15; // Reducerat från 60 för snabbare redirect (15×2sek = 30sek max)
    const startTime = Date.now();
    
    // Funktion för att polla status
    const pollStatus = async () => {
      // Avbryt om dialog stängts eller betalning avbrutits
      if (!showPaymentDialog || isCancelledRef.current) {
        console.log('⏹️ Stopping poll: dialog closed or payment canceled');
        return;
      }
      
      // Avbryt om max försök nåtts
      if (attempts >= MAX_ATTEMPTS) {
        console.log(`⏹️ Stopping poll: max attempts (${MAX_ATTEMPTS}) reached (${MAX_ATTEMPTS * 2} seconds)`);
        return;
      }
      
      attempts++;
      console.log(`🔄 Poll attempt ${attempts}/${MAX_ATTEMPTS} (${attempts * 2} seconds)`);
      
      // Hämta status
      const status = await checkPaymentStatus();
      console.log(`📊 Status received: ${status || 'null'}`);
      
      // MYCKET VIKTIG ÄNDRING: ALLTID uppdatera om vi får PAID
      if (status === PAYMENT_STATUSES.PAID) {
        const totalTime = Math.round((Date.now() - startTime) / 1000);
        console.log(`💰 PAYMENT IS PAID! Total time: ${totalTime}s (attempts: ${attempts})`);
        setPaymentStatus(PAYMENT_STATUSES.PAID);
        
        // NYTT: Uppdatera betalningsstatus i localStorage
        try {
          // Hämta nuvarande paymentInfo från localStorage
          const paymentInfo = JSON.parse(localStorage.getItem('payment_info') || '{}');
          
          // Uppdatera status till PAID
          paymentInfo.status = PAYMENT_STATUSES.PAID;
          
          // Spara tillbaka till localStorage
          localStorage.setItem('payment_info', JSON.stringify(paymentInfo));
          
          console.log('🔄 Updated payment status in localStorage to PAID');
        } catch (error) {
          console.error('❌ Failed to update payment status in localStorage:', error);
        }
        
        // Använd en timeout för att omdirigera användaren
        setTimeout(() => {
          console.log('🚀 Redirecting after successful payment');
          if (onSuccess) {
            onSuccess();
          } else {
            const redirectUrl = redirectPath || getRedirectPath();
            console.log(`🔀 Redirecting to ${redirectUrl}`);
            router.push(redirectUrl);
          }
        }, 500); // Reducerat från 1500ms för snabbare redirect
        
        console.log('✅ Payment confirmed as PAID - stopping all polling');
        return; // Avsluta polling
      }
      
      // För andra statusar
      if (status && status !== paymentStatus) {
        console.log(`📈 Updating status from ${paymentStatus} to ${status}`);
        setPaymentStatus(status);
        
        // Om declined eller error, stoppa polling
        if (status === PAYMENT_STATUSES.DECLINED || status === PAYMENT_STATUSES.ERROR) {
          console.log('⏹️ Payment declined or error, stopping poll');
          return;
        }
      }
      
      // Fortsätt polla om vi inte har avbrutit
      if (showPaymentDialog && !isCancelledRef.current) {
        // Smart polling: börja snabbt, sakta ner över tid
        const getPollingInterval = (attempt: number) => {
          if (attempt < 5) return 1000;    // Första 5 sekunderna: 1s intervall
          if (attempt < 15) return 2000;   // Nästa 20 sekunder: 2s intervall  
          return 5000;                     // Därefter: 5s intervall
        };
        
        setTimeout(pollStatus, getPollingInterval(attempts));
      }
    };
    
    // Starta polling direkt
    pollStatus();
    
    // Cleanup: inget att göra
    return () => {};
  }, [showPaymentDialog, paymentReference, paymentStatus, courseId, router, onSuccess, redirectPath]);

  return {
    paymentStatus,
    setPaymentStatus,
    showPaymentDialog,
    setShowPaymentDialog,
    handleClosePaymentDialog,
  };
}; 