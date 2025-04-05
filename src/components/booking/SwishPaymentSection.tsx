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

    // Show dialog immediately when payment starts
    setPaymentStatus(PaymentStatus.CREATED);
    setShowPaymentDialog(true);

    try {
      // Clean phone number by removing spaces and dashes
      const cleanPhoneNumber = phoneNumber.replace(/[- ]/g, '');
      
      const response = await fetch('/api/payments/swish/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID()
        },
        body: JSON.stringify({
          phone_number: cleanPhoneNumber,
          payment_method: 'swish',
          product_type: getFlowType() || 'course',
          product_id: courseId,
          amount: amount,
          quantity: parseInt(userInfo.numberOfParticipants || '1'),
          user_info: {
            ...userInfo,
            phone: cleanPhoneNumber, // Update phone in userInfo as well
            numberOfParticipants: userInfo.numberOfParticipants || '1'
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Payment creation failed:', errorData);
        setPaymentStatus(PaymentStatus.ERROR);
        setError(errorData.message || 'Ett fel uppstod vid skapande av betalning');
        return false;
      }

      const data = await response.json();
      setPaymentReference(data.paymentReference);
      return true;
      
    } catch (error) {
      console.error('Payment creation error:', error);
      setPaymentStatus(PaymentStatus.ERROR);
      setError('Ett fel uppstod vid skapande av betalning');
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