

import React, { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
} from '@mui/material';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

interface InvoicePaymentDialogProps {
  open: boolean;
  onClose: () => void;
  status: 'loading' | 'success' | 'error';
  invoiceNumber?: string;
  bookingReference?: string;
}

const InvoicePaymentDialog: React.FC<InvoicePaymentDialogProps> = ({
  open,
  onClose,
  status,
  invoiceNumber,
  bookingReference,
}) => {
  // Automatically close the dialog and proceed to the confirmation page on 'success'
  useEffect(() => {
    if (status === 'success' && open) {
      // Add a small delay to allow the user to see the success state
      const timer = setTimeout(() => {
        onClose();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [status, open, onClose]);

  return (
    <Dialog 
      open={open} 
      onClose={status !== 'loading' ? onClose : undefined}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReceiptIcon color="primary" />
          <Typography variant="h6">
            {status === 'loading' ? 'Skapar faktura...' : 
             status === 'success' ? 'Faktura skapad!' : 'Ett fel uppstod'}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {status === 'loading' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="body1" align="center">
              Vi skapar din faktura och skickar den till din e-postadress.
              Detta kan ta upp till 1 minut - stäng inga fönster du kommer bli omdirigerad till beräftelse sidan strax.
            </Typography>
          </Box>
        )}

        {status === 'success' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="body1" paragraph align="center">
              Din faktura har skapats framgångsrikt!
            </Typography>
            {invoiceNumber && (
              <Typography variant="body2" color="text.secondary">
                Fakturanummer: {invoiceNumber}
              </Typography>
            )}
            {bookingReference && (
              <Typography variant="body2" color="text.secondary">
                Bokningsreferens: {bookingReference}
              </Typography>
            )}
            <Typography variant="body2" sx={{ mt: 2 }} align="center">
              En bekräftelse har skickats till din e-postadress.
              <br />
              Du kommer att omdirigeras till bekräftelsesidan...
            </Typography>
          </Box>
        )}

        {status === 'error' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
            <ErrorIcon color="error" sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="body1" color="error" align="center">
              Ett fel uppstod när vi försökte skapa din faktura. 
              Vänligen försök igen eller kontakta support om problemet kvarstår.
            </Typography>
          </Box>
        )}
      </DialogContent>

      {status === 'error' && (
        <DialogActions>
          <Button onClick={onClose} variant="contained" color="primary">
            Stäng
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default InvoicePaymentDialog; 