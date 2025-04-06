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

    // Save the cancellation info locally first for UI responsiveness
    const cancellationInfo = {
      reference: crypto.randomUUID(),
      status: 'DECLINED',
      payment_method: 'swish',
      payment_date: new Date().toISOString(),
      amount: amount,
      cancelled_by: 'user',
      cancelled_from: 'payment_dialog'
    };
    console.log('Saving cancelled payment info:', cancellationInfo);

    // Variables to track our attempts
    let success = false;
    let errorMessage = '';
    let attempts = 0;
    const maxAttempts = 2;

    // Try the main endpoint first, then fall back to the simple one if needed
    while (!success && attempts < maxAttempts) {
      attempts++;
      try {
        // Attempt to cancel the payment
        const endpoint = attempts === 1 ? '/api/payments/swish/cancel' : '/api/payments/swish/simple-cancel';
        
        console.log(`Cancellation attempt ${attempts}/${maxAttempts} using endpoint: ${endpoint}`);
        
        const cancelResponse = await fetch(endpoint, {
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
        console.log(`Cancellation API response (attempt ${attempts}):`, {
          status: cancelResponse.status,
          ok: cancelResponse.ok,
          data: responseData
        });

        // Handle response based on success status
        if ((cancelResponse.ok && responseData.success) || attempts === maxAttempts) {
          success = true;
          console.log(`Payment cancellation ${responseData.success ? 'succeeded' : 'processing'} via API`);
        } else {
          errorMessage = responseData.error || 'Unknown error';
          console.warn(`Cancellation attempt ${attempts} failed:`, errorMessage);
          
          // Only retry if this wasn't our last attempt
          if (attempts < maxAttempts) {
            console.log(`Will retry with fallback endpoint`);
          }
        }
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error during payment cancellation attempt ${attempts}:`, error);
        
        // Only retry if this wasn't our last attempt
        if (attempts < maxAttempts) {
          console.log(`Will retry with fallback endpoint due to error`);
        }
      }
    }

    // Regardless of API success, continue with the UI flow
    console.log('Payment cancellation handler called');
    setShowPaymentDialog(false);
    
    if (onPaymentCancelled) {
      onPaymentCancelled();
    } else {
      onPaymentComplete(false);
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