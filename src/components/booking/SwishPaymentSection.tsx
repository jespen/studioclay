import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { Box } from '@mui/material';
import { PaymentStatus } from '@/types/payment';
import SwishPaymentForm from './SwishPaymentForm';
import SwishPaymentDialog from './SwishPaymentDialog';
import { useSwishPaymentStatus } from '@/hooks/useSwishPaymentStatus';
import { getGiftCardDetails, getFlowType, setPaymentReference } from '@/utils/flowStorage';

interface GiftCardDetails {
  type: string;
  recipientName: string;
  recipientEmail: string;
  message: string;
}

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
  onPaymentComplete: (success: boolean) => void;
  onPaymentFailure?: (status: 'DECLINED' | 'ERROR') => void;
  onPaymentCancelled?: () => void;
  onValidationError?: (error: string) => void;
  disabled?: boolean;
}

// Reset version - 2024-04-05
// Reverted to stable version with Office 365 email configuration
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
  // Initialize phone number from userInfo, ensuring it starts with '0' if needed
  const initialPhoneNumber = userInfo.phone || '';
  const [phoneNumber, setPhoneNumber] = useState(
    initialPhoneNumber.startsWith('0') ? initialPhoneNumber : `0${initialPhoneNumber}`
  );
  const [error, setError] = useState<string>();
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [paymentInProgress, setPaymentInProgress] = useState<boolean>(false);
  const [isPolling, setIsPolling] = useState<boolean>(false);

  const {
    paymentStatus,
    setPaymentStatus,
    showPaymentDialog,
    setShowPaymentDialog,
    handleClosePaymentDialog,
  } = useSwishPaymentStatus({
    paymentReference,
    courseId,
    onSuccess: () => onPaymentComplete(true),
  });

  const validatePhoneNumber = (phone: string): boolean => {
    if (!phone) {
      const error = 'Telefonnummer är obligatoriskt för Swish-betalning';
      setError(error);
      onValidationError?.(error);
      return false;
    }

    const cleanPhone = phone.replace(/[- ]/g, '');
    if (!/^0\d{8,9}$/.test(cleanPhone)) {
      const error = 'Ange ett giltigt svenskt mobilnummer (9-10 siffror som börjar med 0)';
      setError(error);
      onValidationError?.(error);
      return false;
    }

    setError(undefined);
    return true;
  };

  const handlePhoneNumberChange = (value: string) => {
    // Ensure phone number starts with '0'
    const formattedValue = value.startsWith('0') ? value : `0${value}`;
    setPhoneNumber(formattedValue);
    if (error) {
      validatePhoneNumber(formattedValue);
    }
  };

  const handleCreatePayment = async (): Promise<boolean> => {
    // Prevent multiple simultaneous payment creation attempts
    if (paymentInProgress) {
      console.warn('Payment creation already in progress, ignoring duplicate call');
      return false;
    }
    
    if (!validatePhoneNumber(phoneNumber)) {
      return false;
    }

    // Mark payment creation as in progress
    setPaymentInProgress(true);
    console.log('Starting payment creation with flow type:', getFlowType());

    // Show dialog immediately when payment starts
    setPaymentStatus(PaymentStatus.CREATED);
    setShowPaymentDialog(true);

    try {
      // Clean phone number by removing spaces and dashes, then format for Swish
      const cleanPhoneNumber = phoneNumber.replace(/[- ]/g, '');
      // Convert from 07XXXXXXXX to 467XXXXXXXX format
      const swishPhoneNumber = cleanPhoneNumber.startsWith('0') 
        ? `46${cleanPhoneNumber.substring(1)}` 
        : cleanPhoneNumber;
      
      // Map flow type to product type
      const flowType = getFlowType();
      console.log('Current flow type:', flowType);
      
      let productType;
      switch (flowType) {
        case 'course_booking':
          productType = 'course';
          break;
        case 'gift_card':
          productType = 'gift_card';
          break;
        case 'art_purchase':
          productType = 'art_product';
          break;
        default:
          productType = 'course';
      }

      console.log('Mapped product type:', productType);

      // For gift cards, generate a UUID if courseId is "gift-card"
      const productId = courseId === 'gift-card' ? crypto.randomUUID() : courseId;
      console.log('Using product ID:', productId);
      
      // Generate a unique idempotency key for this request
      const idempotencyKey = crypto.randomUUID();
      
      const requestData = {
        phone_number: swishPhoneNumber,
        payment_method: 'swish',
        product_type: productType,
        product_id: productId,
        amount: amount,
        quantity: parseInt(userInfo.numberOfParticipants || '1'),
        user_info: {
          ...userInfo,
          phone: cleanPhoneNumber, // Keep original format in userInfo
          numberOfParticipants: userInfo.numberOfParticipants || '1'
        }
      };

      console.log('Sending payment request with data:', {
        ...requestData,
        phone_number: '******' + requestData.phone_number.slice(-4),
        user_info: {
          ...requestData.user_info,
          phone: '******' + requestData.user_info.phone.slice(-4)
        }
      });

      const response = await fetch('/api/payments/swish/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify(requestData),
      });

      console.log('Received API response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Payment creation failed:', {
          status: response.status,
          errorData,
          flowType,
          productType
        });
        setPaymentStatus(PaymentStatus.ERROR);
        setError(errorData.message || 'Ett fel uppstod vid skapande av betalning');
        setPaymentInProgress(false);
        return false;
      }

      const data = await response.json();
      
      // Check if this was a duplicate payment that already exists
      if (data.data?.already_exists) {
        console.log('Found existing payment with same idempotency key:', data.paymentReference);
      }
      
      if (!data.paymentReference) {
        console.error('No payment reference received:', data);
        setPaymentStatus(PaymentStatus.ERROR);
        setError('Ett fel uppstod vid skapande av betalning (ingen referens)');
        setPaymentInProgress(false);
        return false;
      }

      console.log('Payment created successfully:', {
        paymentReference: data.paymentReference,
        flowType,
        productType
      });
      
      setPaymentReference(data.paymentReference);
      setPaymentInProgress(false);
      return true;
      
    } catch (error) {
      console.error('Payment creation error:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        flowType: getFlowType(),
        productType: courseId === 'gift-card' ? 'gift_card' : getFlowType() === 'art_purchase' ? 'art_product' : 'course'
      });
      setPaymentStatus(PaymentStatus.ERROR);
      setError('Ett fel uppstod vid skapande av betalning');
      setPaymentInProgress(false);
      return false;
    }
  };

  const handleCancelPayment = async () => {
    console.log('Initiating payment cancellation for reference:', paymentReference);
    
    // Immediately update UI state to show cancellation - this improves user experience
    setPaymentStatus(PaymentStatus.DECLINED);
    
    // Close the dialog first to improve UX
    handleClosePaymentDialog();
    
    // Now attempt to cancel through the API, but don't block UI on this
    try {
      console.log('Cancellation attempt 1/2 using endpoint: /api/payments/swish/cancel');
      
      // First try using the regular cancel endpoint that updates the database
      const response = await fetch('/api/payments/swish/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentReference,
          cancelledBy: 'user',
          cancelledFrom: 'payment-dialog'
        }),
      });
      
      // Log the response for debugging
      console.log('Cancellation API response (attempt 1):', {
        status: response.status,
        ok: response.ok,
        data: await response.json().catch(() => 'Failed to parse JSON')
      });
      
      if (response.ok) {
        console.log('Payment cancellation succeeded via API');
      } else {
        // If first attempt fails, try the simple-cancel endpoint as fallback
        console.log('Cancellation attempt 2/2 using endpoint: /api/payments/swish/simple-cancel');
        const fallbackResponse = await fetch('/api/payments/swish/simple-cancel', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentReference,
            cancelledBy: 'user',
            cancelledFrom: 'payment-dialog'
          }),
        }).catch(error => {
          console.log('Fallback cancellation API error:', error);
          return null;
        });
        
        if (fallbackResponse?.ok) {
          console.log('Payment cancellation succeeded via fallback API');
        } else {
          console.log('Both cancellation attempts failed - continuing with UI update only');
        }
      }
    } catch (error) {
      // Log error but don't show to user since we already updated the UI
      console.error('Error cancelling payment:', error);
    }
    
    // Notify parent about cancellation regardless of API success
    if (onPaymentCancelled) {
      onPaymentCancelled();
    } else {
      onPaymentComplete(false);
    }
  };

  const handlePaymentStatus = async (paymentReference: string) => {
    try {
      const response = await fetch(`/api/payments/swish/status?paymentReference=${paymentReference}`);
      const data = await response.json();

      if (data.status === 'PAID') {
        setPaymentStatus('PAID');
        setIsPolling(false);
        onPaymentComplete(true);
      } else if (data.status === 'DECLINED' || data.status === 'ERROR') {
        setPaymentStatus('DECLINED');
        setIsPolling(false);
        onPaymentFailure?.(data.status === 'DECLINED' ? 'DECLINED' : 'ERROR');
      } else if (data.status === 'CREATED') {
        // Continue polling if payment is still in progress
        if (isPolling) {
          setTimeout(() => handlePaymentStatus(paymentReference), 2000);
        }
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      // Don't stop polling on network errors, as the payment might still be processing
      if (isPolling) {
        setTimeout(() => handlePaymentStatus(paymentReference), 2000);
      }
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