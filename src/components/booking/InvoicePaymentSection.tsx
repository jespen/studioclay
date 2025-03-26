import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { Box, Grid, TextField, Typography } from '@mui/material';
import { InvoicePaymentService } from '@/services/invoice/invoicePaymentService';
import { PaymentStatus } from '@/services/swish/types';
import HomeIcon from '@mui/icons-material/Home';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import MarkunreadMailboxIcon from '@mui/icons-material/MarkunreadMailbox';

export interface InvoicePaymentSectionRef {
  handleCreatePayment: () => Promise<boolean>;
  address: string;
  postalCode: string;
  city: string;
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
  errors?: {
    address?: string;
    postalCode?: string;
    city?: string;
  };
}

interface InvoiceDetails {
  address: string;
  postalCode: string;
  city: string;
  reference?: string;
}

const InvoicePaymentSection = forwardRef<InvoicePaymentSectionRef, InvoicePaymentSectionProps>(({
  userInfo,
  courseId,
  amount,
  onPaymentComplete,
  onValidationError,
  disabled = false,
  errors = {},
}, ref) => {
  const [invoiceDetails, setInvoiceDetails] = useState<InvoiceDetails>({
    address: '',
    postalCode: '',
    city: '',
    reference: ''
  });
  const [error, setError] = useState<string>();
  const [paymentReference, setPaymentReference] = useState<string>('');

  const validateInvoiceDetails = (details: InvoiceDetails): boolean => {
    if (!details.address?.trim()) {
      const error = 'Adress är obligatoriskt';
      setError(error);
      onValidationError?.(error);
      return false;
    }

    if (!details.postalCode?.trim()) {
      const error = 'Postnummer är obligatoriskt';
      setError(error);
      onValidationError?.(error);
      return false;
    }

    const cleanPostalCode = details.postalCode.replace(/\s/g, '');
    if (!/^\d{3}\s?\d{2}$/.test(cleanPostalCode)) {
      const error = 'Ange ett giltigt postnummer (XXX XX)';
      setError(error);
      onValidationError?.(error);
      return false;
    }

    if (!details.city?.trim()) {
      const error = 'Stad är obligatoriskt';
      setError(error);
      onValidationError?.(error);
      return false;
    }

    setError(undefined);
    return true;
  };

  const handleInvoiceDetailChange = (field: keyof InvoiceDetails) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    setInvoiceDetails(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (error) {
      validateInvoiceDetails({
        ...invoiceDetails,
        [field]: value
      });
    }
  };

  const handleCreatePayment = async (): Promise<boolean> => {
    if (!validateInvoiceDetails(invoiceDetails)) {
      return false;
    }

    try {
      const invoiceService = InvoicePaymentService.getInstance();
      const paymentResult = await invoiceService.createInvoicePayment(
        courseId,
        amount,
        parseInt(userInfo.numberOfParticipants || '1'),
        userInfo,
        invoiceDetails
      );

      if (!paymentResult.success || !paymentResult.reference) {
        const error = 'Det gick inte att skapa fakturan. Försök igen senare.';
        setError(error);
        onValidationError?.(error);
        return false;
      }

      setPaymentReference(paymentResult.reference);
      onPaymentComplete(true);
      return true;
    } catch (error) {
      console.error('Error creating invoice payment:', error);
      const errorMessage = 'Det gick inte att skapa fakturan. Försök igen senare.';
      setError(errorMessage);
      onValidationError?.(errorMessage);
      return false;
    }
  };

  useImperativeHandle(ref, () => ({
    handleCreatePayment,
    address: invoiceDetails.address,
    postalCode: invoiceDetails.postalCode,
    city: invoiceDetails.city
  }));

  return (
    <Box sx={{ mt: 2, ml: 4 }}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            name="address"
            label="Adress *"
            fullWidth
            value={invoiceDetails.address}
            onChange={handleInvoiceDetailChange('address')}
            error={!!errors.address}
            helperText={errors.address}
            disabled={disabled}
            InputProps={{
              startAdornment: (
                <HomeIcon sx={{ mr: 1, color: 'text.secondary' }} />
              ),
            }}
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <TextField
            name="postalCode"
            label="Postnummer *"
            fullWidth
            value={invoiceDetails.postalCode}
            onChange={handleInvoiceDetailChange('postalCode')}
            error={!!errors.postalCode}
            helperText={errors.postalCode}
            disabled={disabled}
            InputProps={{
              startAdornment: (
                <MarkunreadMailboxIcon sx={{ mr: 1, color: 'text.secondary' }} />
              ),
            }}
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <TextField
            name="city"
            label="Stad *"
            fullWidth
            value={invoiceDetails.city}
            onChange={handleInvoiceDetailChange('city')}
            error={!!errors.city}
            helperText={errors.city}
            disabled={disabled}
            InputProps={{
              startAdornment: (
                <LocationCityIcon sx={{ mr: 1, color: 'text.secondary' }} />
              ),
            }}
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            name="reference"
            label="Fakturareferens (valfritt)"
            fullWidth
            value={invoiceDetails.reference}
            onChange={handleInvoiceDetailChange('reference')}
            disabled={disabled}
          />
        </Grid>
      </Grid>
      
      {error && (
        <Typography color="error" variant="caption" sx={{ mt: 2, display: 'block' }}>
          {error}
        </Typography>
      )}
    </Box>
  );
});

InvoicePaymentSection.displayName = 'InvoicePaymentSection';

export default InvoicePaymentSection; 