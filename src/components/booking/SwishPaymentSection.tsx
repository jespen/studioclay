import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { Box } from '@mui/material';
import { SwishPaymentService } from '@/services/swish/swishPaymentService';
import { PaymentStatus, PAYMENT_STATUS } from '@/services/swish/types';
import SwishPaymentForm from './SwishPaymentForm';
import SwishPaymentDialog from './SwishPaymentDialog';
import { useSwishPaymentStatus } from '@/hooks/useSwishPaymentStatus';

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
      const swishService = SwishPaymentService.getInstance();
      const paymentResult = await swishService.createSwishPayment(
        phoneNumber,
        courseId,
        amount,
        parseInt(userInfo.numberOfParticipants || '1'),
        userInfo
      );

      if (!paymentResult.success || !paymentResult.reference) {
        const error = 'Det gick inte att skapa betalningen. Försök igen senare.';
        setError(error);
        onValidationError?.(error);
        return false;
      }

      setPaymentReference(paymentResult.reference);
      setPaymentStatus(PAYMENT_STATUS.CREATED);
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