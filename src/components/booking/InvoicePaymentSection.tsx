import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { Box, TextField, Typography, Grid } from '@mui/material';
import { InvoicePaymentService } from '@/services/invoice/invoicePaymentService';
import InvoicePaymentDialog from './InvoicePaymentDialog';
import HomeIcon from '@mui/icons-material/Home';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import MarkunreadMailboxIcon from '@mui/icons-material/MarkunreadMailbox';
import DescriptionIcon from '@mui/icons-material/Description';

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
  errors?: {
    address?: string;
    postalCode?: string;
    city?: string;
    reference?: string;
  };
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
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [reference, setReference] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [dialogStatus, setDialogStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [invoiceNumber, setInvoiceNumber] = useState<string>();
  const [bookingReference, setBookingReference] = useState<string>();

  const handleCreatePayment = async (): Promise<boolean> => {
    // Validate form
    if (!address || !postalCode || !city) {
      onValidationError?.('Alla fält är obligatoriska');
      return false;
    }

    // Show loading dialog
    setDialogStatus('loading');
    setShowDialog(true);

    try {
      const invoiceService = InvoicePaymentService.getInstance();
      const result = await invoiceService.createInvoicePayment(
        courseId,
        amount,
        parseInt(userInfo.numberOfParticipants || '1'),
        userInfo,
        { address, postalCode, city, reference }
      );

      if (!result.success) {
        setDialogStatus('error');
        return false;
      }

      // Show success state
      setDialogStatus('success');
      setInvoiceNumber(result.invoiceNumber);
      setBookingReference(result.reference);

      // Notify parent of success
      onPaymentComplete(true);

      return true;
    } catch (error) {
      console.error('Error creating invoice:', error);
      setDialogStatus('error');
      return false;
    }
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    if (dialogStatus === 'success') {
      // Navigate to confirmation page
      window.location.href = `/book-course/${courseId}/confirmation`;
    }
  };

  useImperativeHandle(ref, () => ({
    handleCreatePayment
  }));

  return (
    <Box sx={{ mt: 2, ml: 4 }}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Adress *"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
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
            fullWidth
            label="Postnummer *"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
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
            fullWidth
            label="Stad *"
            value={city}
            onChange={(e) => setCity(e.target.value)}
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
            fullWidth
            label="Fakturareferens (valfritt)"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            error={!!errors.reference}
            helperText={errors.reference}
            disabled={disabled}
            InputProps={{
              startAdornment: (
                <DescriptionIcon sx={{ mr: 1, color: 'text.secondary' }} />
              ),
            }}
          />
        </Grid>
      </Grid>

      <InvoicePaymentDialog
        open={showDialog}
        onClose={handleCloseDialog}
        status={dialogStatus}
        invoiceNumber={invoiceNumber}
        bookingReference={bookingReference}
      />
    </Box>
  );
});

InvoicePaymentSection.displayName = 'InvoicePaymentSection';

export default InvoicePaymentSection; 