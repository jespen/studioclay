import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ErrorIcon from '@mui/icons-material/Error';
import { PaymentStatus, PAYMENT_STATUSES } from '@/constants/statusCodes';
import { FaSpinner } from 'react-icons/fa';

interface SwishPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  onCancel: () => void;
  paymentStatus: PaymentStatus;
}

const SwishPaymentDialog: React.FC<SwishPaymentDialogProps> = ({
  open,
  onClose,
  onCancel,
  paymentStatus,
}) => {
  const [processingTime, setProcessingTime] = useState(0);
  const [showError, setShowError] = useState(false);
  
  // Enhanced logging for props changes
  useEffect(() => {
    console.log('[SwishPaymentDialog] Props updated:', {
      open,
      paymentStatus,
      processingTime,
      showError
    });
  }, [open, paymentStatus, processingTime, showError]);

  // Timer to show waiting time
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (open && paymentStatus === PAYMENT_STATUSES.CREATED) {
      console.log('[SwishPaymentDialog] Starting processing timer');
      timer = setInterval(() => {
        setProcessingTime(prev => prev + 1);
      }, 1000);
    } else {
      console.log('[SwishPaymentDialog] Resetting processing timer:', {
        open,
        status: paymentStatus
      });
      setProcessingTime(0);
    }
    
    return () => {
      if (timer) {
        console.log('[SwishPaymentDialog] Clearing processing timer');
        clearInterval(timer);
      }
    };
  }, [open, paymentStatus]);

  // Only show error state after a delay
  useEffect(() => {
    let errorTimer: NodeJS.Timeout;
    
    if (paymentStatus === PAYMENT_STATUSES.ERROR) {
      console.log('[SwishPaymentDialog] Starting error timer');
      errorTimer = setTimeout(() => {
        console.log('[SwishPaymentDialog] Showing error state');
        setShowError(true);
      }, 3000);
    } else {
      console.log('[SwishPaymentDialog] Resetting error state:', {
        status: paymentStatus
      });
      setShowError(false);
    }
    
    return () => {
      if (errorTimer) {
        console.log('[SwishPaymentDialog] Clearing error timer');
        clearTimeout(errorTimer);
      }
    };
  }, [paymentStatus]);
  
  // Format time in minutes and seconds
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Handle user-initiated cancellation
  const handleCancel = () => {
    console.log('[SwishPaymentDialog] User initiated cancel');
    if (window.confirm('Är du säker på att du vill avbryta betalningen?')) {
      console.log('[SwishPaymentDialog] Cancel confirmed');
      onCancel();
    }
  };
  
  const handleClose = () => {
    console.log('[SwishPaymentDialog] Attempting to close dialog:', {
      status: paymentStatus,
      canClose: paymentStatus !== PAYMENT_STATUSES.CREATED
    });
    onClose();
  };
  
  // Log render state
  console.log('[SwishPaymentDialog] Rendering with state:', {
    open,
    paymentStatus,
    processingTime,
    showError,
    canClose: paymentStatus !== PAYMENT_STATUSES.CREATED
  });

  return (
    <Dialog 
      open={open} 
      onClose={paymentStatus !== PAYMENT_STATUSES.CREATED ? handleClose : undefined}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        Swish-betalning
      </DialogTitle>
      <DialogContent>
        {paymentStatus === PAYMENT_STATUSES.CREATED && (
          <div className="flex flex-col items-center p-4">
            <FaSpinner className="animate-spin text-primary text-2xl mb-4" />
            <h3 className="text-lg font-semibold mb-2">Betalning behandlas</h3>
            <p className="text-center mb-4">
              <br />
              <strong>Öppna Swish-appen och godkänn betalningen.</strong>
            </p>
            <p className="text-center text-sm text-gray-500">
              Stanna kvar på sidan till betalningen är genomförd. 
              <br />
              <span className="font-semibold">Behandlar: {formatTime(processingTime)}</span>
            </p>
            
            {processingTime > 30 && (
              <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-md">
                <p className="text-center text-sm">
                  <strong>Väntar på bekräftelse från Swish.</strong>
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

        {paymentStatus === PAYMENT_STATUSES.PAID && (
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

        {paymentStatus === PAYMENT_STATUSES.DECLINED && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
            <CancelIcon color="error" sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="body1" gutterBottom>
              Betalningen avbröts i Swish-appen
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Du kan stänga detta fönster och försöka igen eller välja en annan betalningsmetod
            </Typography>
          </Box>
        )}

        {(paymentStatus === PAYMENT_STATUSES.ERROR && showError) && (
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
        {paymentStatus === PAYMENT_STATUSES.CREATED && (
          <Button 
            onClick={handleCancel}
            color="error"
            variant="outlined"
          >
            Avbryt betalning
          </Button>
        )}
        {(paymentStatus === PAYMENT_STATUSES.DECLINED || 
          paymentStatus === PAYMENT_STATUSES.ERROR || 
          paymentStatus === PAYMENT_STATUSES.PAID) && (
          <Button 
            onClick={handleClose}
            variant="contained"
          >
            {paymentStatus === PAYMENT_STATUSES.PAID ? 'Fortsätt' : 'Stäng'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default SwishPaymentDialog; 