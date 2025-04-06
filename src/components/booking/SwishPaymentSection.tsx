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
    if (!validatePhoneNumber(phoneNumber)) {
      return false;
    }

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
          'Idempotency-Key': crypto.randomUUID()
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
        return false;
      }

      const data = await response.json();
      if (!data.paymentReference) {
        console.error('No payment reference received:', data);
        setPaymentStatus(PaymentStatus.ERROR);
        setError('Ett fel uppstod vid skapande av betalning (ingen referens)');
        return false;
      }

      console.log('Payment created successfully:', {
        paymentReference: data.paymentReference,
        flowType,
        productType
      });
      
      setPaymentReference(data.paymentReference);
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
      return false;
    }
  };

  const handleCancelPayment = async () => {
    if (!paymentReference) {
      console.error('No payment reference available for cancellation');
      return;
    }

    console.log('Initiating payment cancellation for reference:', paymentReference);

    // Immediately show user that we're processing the cancellation
    setPaymentStatus(PaymentStatus.DECLINED);

    try {
      // First, cancel the payment via our API
      const cancelResponse = await fetch('/api/payments/swish/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          paymentReference,
          cancelledBy: 'user',
          cancelledFrom: 'payment_dialog'
        })
      });

      // Parse the response
      let responseData;
      try {
        responseData = await cancelResponse.json();
      } catch (parseError) {
        console.error('Failed to parse cancel response:', parseError);
        responseData = { success: false, error: 'Invalid response format' };
      }

      // Log the result for debugging
      console.log('Cancellation API response:', {
        status: cancelResponse.status,
        ok: cancelResponse.ok,
        data: responseData
      });

      // Handle response based on success status
      if (cancelResponse.ok && responseData.success) {
        console.log('Payment successfully cancelled via API');
        
        // Close dialog and complete cancellation flow
        setShowPaymentDialog(false);
        
        if (onPaymentCancelled) {
          onPaymentCancelled();
        } else {
          onPaymentComplete(false);
        }
      } else {
        console.warn('Cancellation API returned error:', responseData.error || 'Unknown error');
        
        // Even if API returns error, we should still close the dialog
        // The status will be updated by Swish callback eventually
        console.log('Continuing with cancellation flow despite API error');
        setShowPaymentDialog(false);
        
        if (onPaymentCancelled) {
          onPaymentCancelled();
        } else {
          onPaymentComplete(false);
        }
      }
    } catch (error) {
      console.error('Error during payment cancellation API call:', error);
      
      // Even if there's a network error, we should still close the dialog
      // The payment may still be cancelled on the server side
      setShowPaymentDialog(false);
      
      if (onPaymentCancelled) {
        onPaymentCancelled();
      } else {
        onPaymentComplete(false);
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