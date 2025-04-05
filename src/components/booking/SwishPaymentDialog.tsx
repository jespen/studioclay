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
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ErrorIcon from '@mui/icons-material/Error';
import { PaymentStatus, PAYMENT_STATUS } from '@/services/swish/types';
import { FaSpinner } from 'react-icons/fa';

interface SwishPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  paymentStatus: PaymentStatus | null;
}

const SwishPaymentDialog: React.FC<SwishPaymentDialogProps> = ({
  open,
  onClose,
  paymentStatus,
}) => {
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        Swish-betalning
      </DialogTitle>
      <DialogContent>
        {paymentStatus === PAYMENT_STATUS.CREATED && (
          <div className="flex flex-col items-center p-4">
            <FaSpinner className="animate-spin text-primary text-2xl mb-4" />
            <h3 className="text-lg font-semibold mb-2">Betalning behandlas</h3>
            <p className="text-center mb-4">
              Din betalning behandlas för närvarande. 
              <br />
              Se till att godkänna betalningen i Swish-appen!
            </p>
            <p className="text-center text-sm text-gray-500">
              Lämna inte sidan. Statusen uppdateras automatiskt när betalningen är klar.
              <br />
              Det kan ta upp till en minut innan bekräftelsen från Swish kommer fram.
            </p>
          </div>
        )}

        {paymentStatus === PAYMENT_STATUS.PAID && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="body1" gutterBottom>
              Betalningen är genomförd!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Du kommer att omdirigeras till bekräftelsesidan...
            </Typography>
          </Box>
        )}

        {paymentStatus === PAYMENT_STATUS.DECLINED && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
            <CancelIcon color="error" sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="body1" gutterBottom>
              Betalningen avbröts
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Du kan stänga detta fönster och försöka igen
            </Typography>
          </Box>
        )}

        {paymentStatus === PAYMENT_STATUS.ERROR && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
            <ErrorIcon color="error" sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="body1" gutterBottom>
              Det uppstod ett tekniskt problem vid behandling av din betalning
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Försök igen senare eller välj en annan betalningsmetod
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {(paymentStatus === PAYMENT_STATUS.DECLINED || paymentStatus === PAYMENT_STATUS.ERROR) && (
          <Button onClick={onClose}>Stäng</Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default SwishPaymentDialog; 