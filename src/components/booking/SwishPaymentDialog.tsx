import React, { useEffect, useState } from 'react';
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
  const [processingTime, setProcessingTime] = useState(0);
  
  // Timern för att visa väntetid
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (open && paymentStatus === PAYMENT_STATUS.CREATED) {
      // Starta timer för att visa hur länge betalningen har behandlats
      timer = setInterval(() => {
        setProcessingTime(prev => prev + 1);
      }, 1000); // Uppdatera varje sekund
    } else {
      // Återställ timer om dialogrutan stängs eller status ändras
      setProcessingTime(0);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [open, paymentStatus]);
  
  // Formatera tiden i minuter och sekunder
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
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
              <strong>Se till att godkänna betalningen i Swish-appen!</strong>
            </p>
            <p className="text-center text-sm text-gray-500">
              Lämna inte sidan. Statusen uppdateras automatiskt när betalningen är klar.
              <br />
              Det kan ta upp till en minut innan bekräftelsen från Swish kommer fram.
              <br />
              <span className="font-semibold">Behandlar: {formatTime(processingTime)}</span>
            </p>
            
            {processingTime > 30 && (
              <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-md">
                <p className="text-center text-sm">
                  <strong>Systemet kontrollerar direkt med Swish för att bekräfta betalningen.</strong>
                  <br />
                  Om du redan har godkänt betalningen i Swish-appen, vänta medan vi bekräftar transaktionen.
                </p>
              </div>
            )}
            
            {processingTime > 60 && (
              <div className="mt-4 p-3 bg-yellow-50 text-yellow-700 rounded-md">
                <p className="text-center text-sm">
                  <strong>Betalningen tar längre tid än normalt.</strong>
                  <br />
                  Om du har godkänt betalningen i Swish-appen, vänta lite till.
                  <br />
                  I vissa fall kan bekräftelser från Swish ta extra tid.
                </p>
              </div>
            )}
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