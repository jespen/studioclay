import { useState, useEffect, useRef } from 'react';
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
  const sessionIdRef = useRef(`session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
  const sessionId = sessionIdRef.current;

  // Check payment status
  const checkPaymentStatus = async (directReference?: string, bypass_cache: boolean = false): Promise<PaymentStatus> => {
    const reference = directReference || paymentReference || getPaymentReference();
    console.log(`[${sessionId}] checkPaymentStatus called with reference:`, reference, `bypass_cache: ${bypass_cache}`);
    
    if (!reference || reference === 'undefined' || reference === 'null') {
      console.error(`[${sessionId}] No valid payment reference available to check status`);
      return PAYMENT_STATUS.ERROR;
    }
    
    try {
      console.log(`[${sessionId}] Checking status for payment: ${reference}`);
      
      // Lägg till cache busting parameter för att undvika caching
      const cacheBuster = bypass_cache ? `&bypass_cache=true&_=${Date.now()}` : '';
      const response = await fetch(`/api/payments/status/${reference}${cacheBuster}`);
      const data = await response.json();
      
      // Mer detaljerad loggning av svaret för debugging
      console.log(`[${sessionId}] Status check raw response:`, data);
      
      if (!data.success) {
        console.error(`[${sessionId}] Status API reported error:`, data);
        return PAYMENT_STATUS.ERROR;
      }
      
      // Logga mer specifik information om betalningen för att hjälpa debugging
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

  // Funktion för att välja rätt redirectsida baserat på produkttyp
  const getRedirectPath = () => {
    // Om en specifik redirectPath är angiven, använd den
    if (redirectPath) {
      return redirectPath;
    }

    // Annars, använd rätt redirectsida baserat på produkttyp
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
    let hasTriedBypassCache = false;
    let consecutiveCreated = 0;

    const pollStatus = async () => {
      if (!showPaymentDialog) return;
      
      if (attempts >= maxAttempts) {
        console.log(`[${sessionId}] Status check reached max attempts (${maxAttempts}). Stopping polling.`);
        
        // En extra direktkontroll mot Swish som sista åtgärd innan vi ger upp
        try {
          console.log(`[${sessionId}] Making last-chance direct check with Swish`);
          
          const currentReference = paymentReference || getPaymentReference();
          const forcedCheckResponse = await fetch(`/api/payments/status/${currentReference}?forceCheck=true&bypass_cache=true&_=${Date.now()}`);
          const forcedCheckData = await forcedCheckResponse.json();
          
          console.log(`[${sessionId}] Last-chance forced Swish status check response:`, forcedCheckData);
          
          if (forcedCheckData.success && forcedCheckData.data?.payment?.status === PAYMENT_STATUS.PAID) {
            console.log(`[${sessionId}] Last-chance check returned PAID status. Updating and redirecting.`);
            setPaymentStatus(PAYMENT_STATUS.PAID);
            
            redirectTimeout = setTimeout(() => {
              console.log(`[${sessionId}] Redirecting after successful payment (from last-chance check)`);
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
        } catch (finalCheckError) {
          console.error(`[${sessionId}] Error in last-chance Swish status check:`, finalCheckError);
        }
        
        // Visa ett meddelande till användaren om att betalningen fortfarande behandlas
        setPaymentStatus(prev => {
          if (prev === PAYMENT_STATUS.CREATED) {
            console.log(`[${sessionId}] Payment still in CREATED state after max attempts. Showing processing message.`);
            return PAYMENT_STATUS.CREATED;
          }
          return prev;
        });
        
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
        // Efter 10 sekunder (attempt 5) med CREATED status, försök med bypass_cache
        if (!hasTriedBypassCache && attempts === 5 && paymentStatus === PAYMENT_STATUS.CREATED) {
          console.log(`[${sessionId}] Trying with bypass_cache=true to get fresh data`);
          hasTriedBypassCache = true;
          const status = await checkPaymentStatus(currentReference, true);
          console.log(`[${sessionId}] Poll with bypass_cache received status:`, status);
          
          // Kontrollera om status har ändrats
          if (status !== paymentStatus) {
            console.log(`[${sessionId}] Updating payment status from`, paymentStatus, 'to', status);
            setPaymentStatus(status);
            
            if (status === PAYMENT_STATUS.PAID) {
              console.log(`[${sessionId}] Payment is PAID after bypass_cache, clearing interval and preparing redirect`);
              clearInterval(intervalId);
              
              redirectTimeout = setTimeout(() => {
                console.log(`[${sessionId}] Redirecting after successful payment (from bypass_cache)`);
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
          }
        }
        
        // Efter 16 sekunder (attempt 8) med CREATED-status, be servern att kontrollera med Swish direkt
        if (!hasCheckedWithSwish && attempts === 8 && paymentStatus === PAYMENT_STATUS.CREATED) {
          console.log(`[${sessionId}] Midway polling - requesting server to check with Swish directly`);
          hasCheckedWithSwish = true;
          
          try {
            // Använd forceCheck=true för att tvinga en direktkontroll mot Swish
            const forcedCheckResponse = await fetch(`/api/payments/status/${currentReference}?forceCheck=true&bypass_cache=true&_=${Date.now()}`);
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
        
        // Vanlig statuskontroll
        const status = await checkPaymentStatus(currentReference);
        console.log(`[${sessionId}] Poll received status:`, status);
        
        // Öka räknaren för consecutiveCreated om status är CREATED
        if (status === PAYMENT_STATUS.CREATED) {
          consecutiveCreated++;
          
          // Om vi har fått CREATED flera gånger i rad, prova med bypass_cache=true
          if (consecutiveCreated >= 3 && !hasTriedBypassCache) {
            console.log(`[${sessionId}] Got CREATED status ${consecutiveCreated} times in a row, trying bypass_cache`);
            hasTriedBypassCache = true;
            const refreshedStatus = await checkPaymentStatus(currentReference, true);
            
            if (refreshedStatus !== PAYMENT_STATUS.CREATED) {
              console.log(`[${sessionId}] Refresh with bypass_cache changed status from CREATED to ${refreshedStatus}`);
              setPaymentStatus(refreshedStatus);
              
              if (refreshedStatus === PAYMENT_STATUS.PAID) {
                console.log(`[${sessionId}] Payment is PAID after refresh, clearing interval and preparing redirect`);
                clearInterval(intervalId);
                
                redirectTimeout = setTimeout(() => {
                  console.log(`[${sessionId}] Redirecting after successful payment (from refresh)`);
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
              
              // Återställ räknaren
              consecutiveCreated = 0;
            }
          }
        } else {
          // Återställ räknaren om status inte är CREATED
          consecutiveCreated = 0;
        }
        
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