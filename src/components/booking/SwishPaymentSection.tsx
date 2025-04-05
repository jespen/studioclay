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
  onValidationError,
  disabled = false,
}, ref) => {
  const [phoneNumber, setPhoneNumber] = useState(userInfo.phone || '');
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
    setPhoneNumber(value);
    if (error) {
      validatePhoneNumber(value);
    }
  };

  const handleCreatePayment = async (): Promise<boolean> => {
    if (!validatePhoneNumber(phoneNumber)) {
      return false;
    }

    try {
      // Check if this is a gift card or product payment
      const isGiftCard = courseId === 'gift-card';
      
      // For gift cards, get the item details from flowStorage
      let itemDetails: GiftCardDetails | null = null;
      if (isGiftCard) {
        itemDetails = getGiftCardDetails() as GiftCardDetails;
      }
      
      // Check if this is an art product from the shop
      const isArtProduct = getFlowType() === 'art_purchase';
      
      const response = await fetch('/api/payments/swish/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID()
        },
        body: JSON.stringify({
          phone_number: phoneNumber,
          payment_method: 'swish',
          product_type: isGiftCard ? 'gift_card' : isArtProduct ? 'art_product' : 'course',
          product_id: isGiftCard ? '00000000-0000-0000-0000-000000000001' : courseId,
          amount: amount,
          quantity: parseInt(userInfo.numberOfParticipants || '1'),
          user_info: userInfo,
          itemDetails: itemDetails ? {
            type: itemDetails.type,
            recipientName: itemDetails.recipientName,
            recipientEmail: itemDetails.recipientEmail,
            message: itemDetails.message
          } : null
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success || !result.data?.reference) {
        const error = 'Det gick inte att skapa betalningen. Försök igen senare.';
        setError(error);
        onValidationError?.(error);
        return false;
      }

      const paymentRef = result.data.reference;
      setPaymentReference(paymentRef);
      // Store payment reference in flowStorage rather than directly in localStorage
      setPaymentReference(paymentRef);
      console.log('Swish payment created with reference:', paymentRef);
      
      setPaymentStatus(PaymentStatus.CREATED);
      setShowPaymentDialog(true);
      return true;
    } catch (error) {
      console.error('Error creating Swish payment:', error);
      const errorMessage = 'Det gick inte att skapa betalningen. Försök igen senare.';
      setError(errorMessage);
      onValidationError?.(errorMessage);
      return false;
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
        paymentStatus={paymentStatus}
      />
    </Box>
  );
});

SwishPaymentSection.displayName = 'SwishPaymentSection';

export default SwishPaymentSection; 