import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { PaymentStatus, PAYMENT_STATUSES } from '@/constants/statusCodes';
import SwishPaymentForm from './SwishPaymentForm';
import SwishPaymentDialog from './SwishPaymentDialog';
import { isValidSwishPhoneNumber } from '@/utils/swish/phoneNumberFormatter';
import { setPaymentReference } from '@/utils/flowStorage';
import { v4 as uuidv4 } from 'uuid';

// Add the ref interface export
export interface SwishPaymentSectionRef {
  submitSwishPayment: () => Promise<boolean>;
}

interface SwishPaymentSectionProps {
  amount: number;
  productType: 'course' | 'gift_card' | 'art_product';
  productId: string;
  userInfo: any;
  onPaymentComplete: (data: any) => void;
  onPaymentError: (error: any) => void;
  onPaymentCancelled: () => void;
}

// Convert to forwardRef implementation
const SwishPaymentSection = forwardRef<SwishPaymentSectionRef, SwishPaymentSectionProps>(({
  amount,
  productType,
  productId,
  userInfo,
  onPaymentComplete,
  onPaymentError,
  onPaymentCancelled
}, ref) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(PAYMENT_STATUSES.CREATED);
  const [paymentReference, setPaymentReferenceState] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>(userInfo?.phone || '');
  const [phoneNumberError, setPhoneNumberError] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const [swishPaymentId, setSwishPaymentId] = useState<string>();
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout>();

  console.log('[SwishPaymentSection] Initializing with props:', {
    amount,
    productType,
    productId,
    userPhone: userInfo?.phone,
    hasPaymentCompleteCallback: !!onPaymentComplete,
    hasErrorCallback: !!onPaymentError,
    hasCancelCallback: !!onPaymentCancelled
  });
  
  // Set phone number from user info when available
  useEffect(() => {
    if (userInfo?.phone && !phoneNumber) {
      console.log('[SwishPaymentSection] Setting phone from userInfo:', userInfo.phone);
      setPhoneNumber(userInfo.phone);
    }
  }, [userInfo, phoneNumber]);

  // Create idempotency key if needed
  useEffect(() => {
    if (!idempotencyKey) {
      const newKey = uuidv4();
      console.log('[SwishPaymentSection] Generated new idempotency key:', newKey);
      setIdempotencyKey(newKey);
    }
  }, [idempotencyKey]);

  // Poll for payment status updates
  useEffect(() => {
    let statusPollInterval: NodeJS.Timeout;
    
    if (paymentDialogOpen && paymentReference && paymentStatus === PAYMENT_STATUSES.CREATED) {
      console.log('[SwishPaymentSection] Starting payment status polling for reference:', paymentReference);
      
      statusPollInterval = setInterval(async () => {
        try {
          console.log('[SwishPaymentSection] Polling payment status...');
          const response = await fetch(`/api/payments/status/${paymentReference}`);
          
          if (!response.ok) {
            console.warn('[SwishPaymentSection] Status API returned non-OK response:', response.status);
            const errorText = await response.text();
            console.warn('Response text:', errorText);
            return;
          }
          
          const data = await response.json();
          console.log('[SwishPaymentSection] Payment status update:', data);
          
          if (data.data && data.data.status) {
            const newStatus = data.data.status;
            console.log('[SwishPaymentSection] Status changed to:', newStatus);
            
            if (newStatus !== paymentStatus) {
              console.log('[SwishPaymentSection] Updating payment status from', paymentStatus, 'to', newStatus);
              setPaymentStatus(newStatus);
              
              // Handle successful payment
              if (newStatus === PAYMENT_STATUSES.PAID) {
                console.log('[SwishPaymentSection] Payment successful, stopping polling');
                clearInterval(statusPollInterval);
                
                // Allow some time for the dialog to show success before proceeding
                setTimeout(() => {
                  handlePaymentSuccess(data.data);
                }, 1500);
              } 
              
              // Handle declined payment
              if (newStatus === PAYMENT_STATUSES.DECLINED) {
                console.log('[SwishPaymentSection] Payment declined, stopping polling');
                clearInterval(statusPollInterval);
                
                setTimeout(() => {
                  handlePaymentCancellation();
                }, 1500);
              }
              
              // Handle error
              if (newStatus === PAYMENT_STATUSES.ERROR) {
                console.log('[SwishPaymentSection] Payment error, stopping polling');
                clearInterval(statusPollInterval);
                
                setTimeout(() => {
                  handlePaymentError(new Error('Payment failed with status ERROR'));
                }, 1500);
              }
            }
          }
        } catch (error) {
          console.error('[SwishPaymentSection] Error polling payment status:', error);
        }
      }, 3000);
    }
    
    return () => {
      if (statusPollInterval) {
        console.log('[SwishPaymentSection] Clearing status polling interval');
        clearInterval(statusPollInterval);
      }
    };
  }, [paymentDialogOpen, paymentReference, paymentStatus]);

  // Handle phone number validation
  const handlePhoneChange = (value: string) => {
    setPhoneNumber(value);
    if (value && !isValidSwishPhoneNumber(value)) {
      setPhoneNumberError('Ange ett giltigt svenskt mobilnummer');
    } else {
      setPhoneNumberError(undefined);
    }
  };

  // Start polling for payment status
  const startPolling = useCallback((paymentId: string) => {
    // Clear any existing polling
    if (pollInterval) {
      clearInterval(pollInterval);
    }

    // Start new polling
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/payments/status/${paymentId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch payment status');
        }

        setPaymentStatus(data.paymentStatus);

        // Handle different payment statuses
        if (data.paymentStatus === PAYMENT_STATUSES.PAID) {
          clearInterval(interval);
          onPaymentComplete(data);
        } else if (data.paymentStatus === PAYMENT_STATUSES.DECLINED) {
          clearInterval(interval);
          onPaymentCancelled();
        } else if (data.paymentStatus === PAYMENT_STATUSES.ERROR) {
          clearInterval(interval);
          onPaymentError(new Error(data.errorMessage || 'Payment failed'));
        }
      } catch (error) {
        console.error('Error polling payment status:', error);
        clearInterval(interval);
        onPaymentError(error);
      }
    }, 2000); // Poll every 2 seconds

    setPollInterval(interval);
  }, [onPaymentComplete, onPaymentCancelled, onPaymentError]);

  // Cleanup polling on unmount
  React.useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [pollInterval]);

  // Handle payment initiation
  const handleSubmit = async () => {
    console.log('[SwishPaymentSection] Submit button clicked');
    if (!validateForm()) {
      console.log('[SwishPaymentSection] Form validation failed');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
      console.log('[SwishPaymentSection] Creating payment with data:', {
        phoneNumber,
        amount,
        productType,
        productId,
        idempotencyKey
      });
      
      // Generate a unique reference for this payment
      const paymentRef = `${productType.substring(0, 1)}-${Date.now()}`;
      console.log('[SwishPaymentSection] Generated payment reference:', paymentRef);
      
      // Store the reference 
      setPaymentReference(paymentRef);
      setPaymentReferenceState(paymentRef);
      
      // Construct request body
      const requestBody = {
        phone_number: phoneNumber,
        payment_method: "swish",
        product_type: productType,
        product_id: productId,
        amount: amount,
        quantity: 1,
        user_info: userInfo,
        idempotency_key: idempotencyKey
      };
      
      // Finalize by making the API request
      const response = await fetch('/api/payments/swish/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log('[SwishPaymentSection] API response status:', response.status);
      const jsonResponse = await response.json();
      console.log('[SwishPaymentSection] API response data:', jsonResponse);
      
      if (!response.ok) {
        throw new Error(jsonResponse.message || jsonResponse.error || 'Ett fel uppstod vid betalningen');
      }
      
      // Open the payment status dialog
      console.log('[SwishPaymentSection] Opening payment dialog with initial status CREATED');
      setPaymentDialogOpen(true);
      
    } catch (error) {
      console.error('[SwishPaymentSection] Payment creation error:', error);
      setError(error instanceof Error ? error.message : 'Ett fel uppstod vid betalningen');
      setIsSubmitting(false);
    }
  };

  const handlePaymentSuccess = (paymentData: any) => {
    console.log('[SwishPaymentSection] Payment success handler called with data:', paymentData);
    setIsSubmitting(false);
    
    if (onPaymentComplete) {
      console.log('[SwishPaymentSection] Calling onPaymentComplete callback');
      onPaymentComplete(paymentData);
    } else {
      console.warn('[SwishPaymentSection] No onPaymentComplete callback provided');
    }
  };

  const handlePaymentError = (error: Error) => {
    console.error('[SwishPaymentSection] Payment error handler called:', error);
    setIsSubmitting(false);
    setPaymentDialogOpen(false);
    setError(error.message);
    
    if (onPaymentError) {
      console.log('[SwishPaymentSection] Calling onPaymentError callback');
      onPaymentError(error);
    } else {
      console.warn('[SwishPaymentSection] No onPaymentError callback provided');
    }
  };

  const handlePaymentCancellation = () => {
    console.log('[SwishPaymentSection] Payment cancellation handler called');
    setIsSubmitting(false);
    setPaymentDialogOpen(false);
    
    if (onPaymentCancelled) {
      console.log('[SwishPaymentSection] Calling onPaymentCancelled callback');
      onPaymentCancelled();
    } else {
      console.warn('[SwishPaymentSection] No onPaymentCancelled callback provided');
    }
  };

  // Handle dialog close
  const handleCloseDialog = () => {
    if (paymentStatus !== PAYMENT_STATUSES.CREATED) {
      setPaymentDialogOpen(false);
    }
  };

  const validateForm = () => {
    if (!phoneNumber || !isValidSwishPhoneNumber(phoneNumber)) {
      setPhoneNumberError('Ange ett giltigt svenskt mobilnummer');
      return false;
    }
    return true;
  };

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    submitSwishPayment: async () => {
      console.log('[SwishPaymentSection] submitSwishPayment called via ref');
      try {
        await handleSubmit();
        return true;
      } catch (error) {
        console.error('[SwishPaymentSection] Error in submitSwishPayment:', error);
        return false;
      }
    }
  }));

  return (
    <Box>
      <SwishPaymentForm
        phoneNumber={phoneNumber}
        onPhoneNumberChange={handlePhoneChange}
        error={phoneNumberError}
        disabled={isSubmitting}
      />

      <SwishPaymentDialog
        open={paymentDialogOpen}
        onClose={handleCloseDialog}
        onCancel={handlePaymentCancellation}
        paymentStatus={paymentStatus}
      />
    </Box>
  );
});

export default SwishPaymentSection; 