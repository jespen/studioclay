import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { Box } from '@mui/material';
import InvoicePaymentForm from './InvoicePaymentForm';
import InvoicePaymentDialog from './InvoicePaymentDialog';

export interface InvoicePaymentSectionRef {
  handleCreatePayment: () => Promise<boolean>;
}

interface InvoicePaymentSectionProps {
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

const InvoicePaymentSection = forwardRef<InvoicePaymentSectionRef, InvoicePaymentSectionProps>(({
  userInfo,
  courseId,
  amount,
  onPaymentComplete,
  onValidationError,
  disabled = false,
}, ref) => {
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [reference, setReference] = useState('');
  const [errors, setErrors] = useState<{
    address?: string;
    postalCode?: string;
    city?: string;
    reference?: string;
  }>({});
  const [showDialog, setShowDialog] = useState(false);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [invoiceNumber, setInvoiceNumber] = useState<string>();
  const [bookingReference, setBookingReference] = useState<string>();

  const validateFields = (): boolean => {
    const newErrors: typeof errors = {};

    if (!address.trim()) {
      newErrors.address = 'Adress är obligatoriskt';
    }

    if (!postalCode.trim()) {
      newErrors.postalCode = 'Postnummer är obligatoriskt';
    } else if (!/^\d{3}\s?\d{2}$/.test(postalCode.replace(/\s/g, ''))) {
      newErrors.postalCode = 'Ange ett giltigt postnummer (5 siffror)';
    }

    if (!city.trim()) {
      newErrors.city = 'Stad är obligatoriskt';
    }

    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      onValidationError?.(Object.values(newErrors)[0]);
      return false;
    }

    return true;
  };

  const handleCreatePayment = async (): Promise<boolean> => {
    if (!validateFields()) {
      return false;
    }

    try {
      setShowDialog(true);
      setStatus('loading');

      const response = await fetch('/api/invoice/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId,
          userInfo,
          paymentDetails: {
            method: 'invoice',
            invoiceDetails: {
              address,
              postalCode: postalCode.replace(/\s/g, ''),
              city,
              reference: reference.trim() || undefined,
            }
          },
          amount,
          numberOfParticipants: parseInt(userInfo.numberOfParticipants) || 1,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create invoice');
      }

      setInvoiceNumber(data.invoiceNumber);
      setBookingReference(data.bookingReference);
      setStatus('success');
      setShowDialog(false);
      onPaymentComplete(true);
      return true;
    } catch (error) {
      console.error('Error creating invoice:', error);
      setStatus('error');
      onValidationError?.('Det gick inte att skapa fakturan. Försök igen senare.');
      return false;
    }
  };

  useImperativeHandle(ref, () => ({
    handleCreatePayment
  }));

  const handleCloseDialog = () => {
    if (status === 'success') {
      setShowDialog(false);
      onPaymentComplete(true);
    } else if (status === 'error') {
      setShowDialog(false);
    }
  };

  return (
    <Box>
      <InvoicePaymentForm
        address={address}
        postalCode={postalCode}
        city={city}
        reference={reference}
        onAddressChange={setAddress}
        onPostalCodeChange={setPostalCode}
        onCityChange={setCity}
        onReferenceChange={setReference}
        errors={errors}
        disabled={disabled}
      />
      
      <InvoicePaymentDialog
        open={showDialog}
        onClose={handleCloseDialog}
        status={status}
        invoiceNumber={invoiceNumber}
        bookingReference={bookingReference}
      />
    </Box>
  );
});

InvoicePaymentSection.displayName = 'InvoicePaymentSection';

export default InvoicePaymentSection; 