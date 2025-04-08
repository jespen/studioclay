import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { Box } from '@mui/material';
import { PaymentStatus, PAYMENT_STATUSES, getValidPaymentStatus } from '@/constants/statusCodes';
import SwishPaymentForm from './SwishPaymentForm';
import SwishPaymentDialog from './SwishPaymentDialog';
import { setPaymentReference, setPaymentInfo, getFlowType } from '@/utils/flowStorage';

export interface SwishPaymentSectionRef {
  handleCreatePayment: () => Promise<boolean>;
}

interface SwishPaymentSectionProps {
  userInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    numberOfParticipants: string;
  };
  courseId: string;
  amount: number;
  onPaymentComplete: (success: boolean, status: PaymentStatus) => void;
  onPaymentFailure?: (status: PaymentStatus) => void;
  onPaymentCancelled?: () => void;
  onValidationError?: (error: string) => void;
  disabled?: boolean;
}

const SwishPaymentSection = forwardRef<SwishPaymentSectionRef, SwishPaymentSectionProps>(({
  userInfo,
  courseId,
  amount,
  onPaymentComplete,
  onPaymentFailure,
  onPaymentCancelled,
  onValidationError,
  disabled = false,
}, ref) => {
  // Initialize phone number from userInfo, ensuring it starts with '0'
  const initialPhoneNumber = userInfo.phone || '';
  const [phoneNumber, setPhoneNumber] = useState(
    initialPhoneNumber.startsWith('0') ? initialPhoneNumber : `0${initialPhoneNumber}`
  );
  const [error, setError] = useState<string>();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(PAYMENT_STATUSES.CREATED);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  // Add logging for component initialization
  console.log('[SwishPaymentSection] Initialized with:', {
    courseId,
    amount,
    initialPhoneNumber,
    disabled
  });

  const validatePhoneNumber = (phone: string): boolean => {
    if (!phone) {
      const error = 'Telefonnummer är obligatoriskt för Swish-betalning';
      console.warn('[SwishPaymentSection] Phone validation failed: Empty phone number');
      setError(error);
      onValidationError?.(error);
      return false;
    }

    const cleanPhone = phone.replace(/[- ]/g, '');
    if (!/^0\d{8,9}$/.test(cleanPhone)) {
      const error = 'Ange ett giltigt svenskt mobilnummer (9-10 siffror som börjar med 0)';
      console.warn('[SwishPaymentSection] Phone validation failed:', { phone, cleanPhone });
      setError(error);
      onValidationError?.(error);
      return false;
    }

    console.log('[SwishPaymentSection] Phone validation passed:', { cleanPhone });
    setError(undefined);
    return true;
  };

  const handlePhoneNumberChange = (value: string) => {
    const formattedValue = value.startsWith('0') ? value : `0${value}`;
    setPhoneNumber(formattedValue);
    if (error) {
      validatePhoneNumber(formattedValue);
    }
  };

  const checkPaymentStatus = async (paymentReference: string, maxAttempts = 60) => {
    let attempts = 0;
    
    const pollStatus = async () => {
      if (!isPolling || attempts >= maxAttempts) {
        console.log('[SwishPaymentSection] Polling stopped:', { 
          attempts, 
          maxAttempts, 
          isPolling,
          paymentReference 
        });
        setIsPolling(false);
        return;
      }

      try {
        console.log(`[SwishPaymentSection] Checking payment status (attempt ${attempts + 1}/${maxAttempts}):`, { 
          paymentReference,
          timestamp: new Date().toISOString()
        });
        
        const response = await fetch(`/api/payments/status/${paymentReference}`);
        const data = await response.json();
        
        console.log('[SwishPaymentSection] Raw API response:', data);
        
        // Kolla om betalningen är PAID först av allt
        if (
          data.data?.status === PAYMENT_STATUSES.PAID || 
          data.status === PAYMENT_STATUSES.PAID ||
          data?.payment?.status === PAYMENT_STATUSES.PAID
        ) {
          console.log('💰 PAYMENT IS PAID!', {
            paymentReference,
            timestamp: new Date().toISOString(),
            totalAttempts: attempts + 1,
            responseData: data
          });
          
          // Uppdatera localStorage först
          try {
            const paymentInfo = JSON.parse(localStorage.getItem('payment_info') || '{}');
            paymentInfo.status = PAYMENT_STATUSES.PAID;
            localStorage.setItem('payment_info', JSON.stringify(paymentInfo));
            console.log('🔄 Updated payment status in localStorage to PAID');
          } catch (error) {
            console.error('❌ Failed to update payment status in localStorage:', error);
          }
          
          // Sen uppdatera state och avsluta polling
          setPaymentStatus(PAYMENT_STATUSES.PAID);
          setIsPolling(false);
          onPaymentComplete(true, PAYMENT_STATUSES.PAID);
          return;
        }
        
        // För andra statusar, validera och uppdatera
        const status = getValidPaymentStatus(data.data?.status || data.status || data?.payment?.status);
        
        console.log('[SwishPaymentSection] Payment status response:', { 
          status,
          rawStatus: data.data?.status || data.status || data?.payment?.status,
          paymentReference,
          responseData: data,
          attempt: attempts + 1,
          timestamp: new Date().toISOString()
        });

        if (status === PAYMENT_STATUSES.DECLINED || status === PAYMENT_STATUSES.ERROR) {
          console.warn('[SwishPaymentSection] Payment failed:', { 
            status, 
            paymentReference,
            timestamp: new Date().toISOString(),
            totalAttempts: attempts + 1
          });
          setPaymentStatus(status);
          setIsPolling(false);
          onPaymentFailure?.(status);
          return;
        }

        attempts++;
        if (isPolling) {
          setTimeout(pollStatus, 2000);
        }
      } catch (error) {
        console.error('[SwishPaymentSection] Error checking payment status:', { 
          error, 
          attempt: attempts + 1,
          paymentReference,
          timestamp: new Date().toISOString()
        });
        attempts++;
        if (isPolling) {
          setTimeout(pollStatus, 2000);
        }
      }
    };

    // Start polling
    console.log('[SwishPaymentSection] Starting payment polling for:', paymentReference);
    setIsPolling(true);
    pollStatus();
  };

  const handleCreatePayment = async (): Promise<boolean> => {
    console.log('[SwishPaymentSection] Creating payment:', { 
      phoneNumber,
      courseId,
      amount 
    });

    if (!validatePhoneNumber(phoneNumber)) {
      return false;
    }

    setPaymentStatus(PAYMENT_STATUSES.CREATED);
    setShowPaymentDialog(true);

    try {
      const cleanPhoneNumber = phoneNumber.replace(/[- ]/g, '');
      const swishPhoneNumber = cleanPhoneNumber.startsWith('0') 
        ? `46${cleanPhoneNumber.substring(1)}` 
        : cleanPhoneNumber;
      
      const flowType = getFlowType();
      const productType = flowType === 'gift_card' ? 'gift_card' 
                       : flowType === 'art_purchase' ? 'art_product' 
                       : 'course';
      
      const productId = courseId === 'gift-card' ? crypto.randomUUID() : courseId;
      
      const requestData = {
        phone_number: swishPhoneNumber,
        payment_method: 'swish',
        product_type: productType,
        product_id: productId,
        amount: amount,
        quantity: parseInt(userInfo.numberOfParticipants || '1'),
        user_info: {
          ...userInfo,
          phone: cleanPhoneNumber,
          numberOfParticipants: userInfo.numberOfParticipants || '1'
        }
      };

      console.log('[SwishPaymentSection] Sending payment request:', requestData);

      const response = await fetch('/api/payments/swish/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID()
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[SwishPaymentSection] Payment creation failed:', { 
          status: response.status,
          errorData 
        });
        setPaymentStatus(PAYMENT_STATUSES.ERROR);
        setError(errorData.message || 'Ett fel uppstod vid skapande av betalning');
        return false;
      }

      const data = await response.json();
      console.log('[SwishPaymentSection] Payment created successfully:', data);
      
      if (!data.paymentReference) {
        console.error('[SwishPaymentSection] No payment reference received');
        setPaymentStatus(PAYMENT_STATUSES.ERROR);
        setError('Ett fel uppstod vid skapande av betalning (ingen referens)');
        return false;
      }

      // Store payment reference and start polling
      setPaymentReference(data.paymentReference);
      checkPaymentStatus(data.paymentReference);
      
      return true;
    } catch (error) {
      console.error('[SwishPaymentSection] Payment creation error:', error);
      setPaymentStatus(PAYMENT_STATUSES.ERROR);
      setError('Ett fel uppstod vid skapande av betalning');
      return false;
    }
  };

  const handleCancelPayment = async () => {
    console.log('[SwishPaymentSection] Cancelling payment');
    setPaymentStatus(PAYMENT_STATUSES.DECLINED);
    setShowPaymentDialog(false);
    setIsPolling(false);
    
    if (onPaymentCancelled) {
      onPaymentCancelled();
    } else {
      onPaymentComplete(false, PAYMENT_STATUSES.DECLINED);
    }
  };

  const handleClosePaymentDialog = () => {
    console.log('[SwishPaymentSection] Closing payment dialog:', { 
      currentStatus: paymentStatus 
    });
    if (paymentStatus !== PAYMENT_STATUSES.CREATED) {
      setShowPaymentDialog(false);
    }
  };

  useImperativeHandle(ref, () => ({
    handleCreatePayment
  }));

  return (
    <Box>
      <SwishPaymentForm
        phoneNumber={phoneNumber}
        onPhoneNumberChange={handlePhoneNumberChange}
        error={error}
        disabled={disabled}
      />
      
      <SwishPaymentDialog
        open={showPaymentDialog}
        onClose={handleClosePaymentDialog}
        onCancel={handleCancelPayment}
        paymentStatus={paymentStatus}
      />
    </Box>
  );
});

SwishPaymentSection.displayName = 'SwishPaymentSection';

export default SwishPaymentSection; 