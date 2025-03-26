import React from 'react';
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
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
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
              Detta tar bara några sekunder...
            </Typography>
          </Box>
        )}

        {status === 'success' && (
          <Box sx={{ py: 2 }}>
            <Typography variant="body1" paragraph>
              Din faktura har skapats framgångsrikt!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Fakturanummer: {invoiceNumber}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Bokningsreferens: {bookingReference}
            </Typography>
            <Typography variant="body2" sx={{ mt: 2 }}>
              En bekräftelse har skickats till din e-postadress.
            </Typography>
          </Box>
        )}

        {status === 'error' && (
          <Typography variant="body1" color="error">
            Ett fel uppstod när vi försökte skapa din faktura. 
            Vänligen försök igen eller kontakta support om problemet kvarstår.
          </Typography>
        )}
      </DialogContent>

      <DialogActions>
        {status === 'success' && (
          <Button onClick={onClose} variant="contained" color="primary">
            Stäng
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default InvoicePaymentDialog; 