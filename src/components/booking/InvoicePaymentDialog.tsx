

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
  LinearProgress,
} from '@mui/material';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import EmailIcon from '@mui/icons-material/Email';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DoneIcon from '@mui/icons-material/Done';

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
  const [processingTime, setProcessingTime] = useState(0);

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

  // Timer to show processing time
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (open && status === 'loading') {
      console.log('[InvoicePaymentDialog] Starting processing timer');
      timer = setInterval(() => {
        setProcessingTime(prev => prev + 1);
      }, 1000);
    } else {
      console.log('[InvoicePaymentDialog] Resetting processing timer');
      setProcessingTime(0);
    }
    
    return () => {
      if (timer) {
        console.log('[InvoicePaymentDialog] Clearing processing timer');
        clearInterval(timer);
      }
    };
  }, [open, status]);

  // Format time in minutes and seconds
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

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
            <Typography variant="body1" align="center" gutterBottom>
              Vi skapar din faktura och skickar den till din e-postadress.
              Detta kan ta upp till 1 minut.
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Processar: {formatTime(processingTime)}
            </Typography>
            
            <Box sx={{ width: '100%', mt: 3 }}>
              <LinearProgress 
                variant="determinate" 
                value={Math.min(100, (processingTime / 45) * 100)} 
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
            
            {/* Step 1: Registrera betalningen */}
            <Box sx={{ 
              width: '100%', 
              mt: 4, 
              p: 2, 
              bgcolor: processingTime > 0 && processingTime <= 10 ? 'rgba(66, 133, 119, 0.1)' : 'transparent',
              borderRadius: 2,
              transition: 'background-color 0.3s ease',
              border: processingTime > 0 && processingTime <= 10 ? '1px solid rgba(66, 133, 119, 0.3)' : '1px solid transparent'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {processingTime > 0 ? <DoneIcon color="success" /> : <CircularProgress size={16} />}
                <Typography variant="body2" fontWeight={processingTime > 0 && processingTime <= 10 ? 'bold' : 'normal'}>
                  Registrerar fakturainformation
                </Typography>
              </Box>
            </Box>
            
            {/* Step 2: Generera faktura */}
            <Box sx={{ 
              width: '100%', 
              mt: 2, 
              p: 2, 
              bgcolor: processingTime > 10 && processingTime <= 20 ? 'rgba(66, 133, 119, 0.1)' : 'transparent',
              borderRadius: 2,
              transition: 'background-color 0.3s ease',
              border: processingTime > 10 && processingTime <= 20 ? '1px solid rgba(66, 133, 119, 0.3)' : '1px solid transparent'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {processingTime > 10 ? <DoneIcon color="success" /> : <CircularProgress size={16} />}
                <Typography variant="body2" fontWeight={processingTime > 10 && processingTime <= 20 ? 'bold' : 'normal'}>
                  Genererar fakturadokument <PictureAsPdfIcon fontSize="small" sx={{ ml: 0.5, fontSize: 16 }} />
                </Typography>
              </Box>
            </Box>
            
            {/* Step 3: Skapa presentkort om relevant */}
            <Box sx={{ 
              width: '100%', 
              mt: 2, 
              p: 2, 
              bgcolor: processingTime > 20 && processingTime <= 30 ? 'rgba(66, 133, 119, 0.1)' : 'transparent',
              borderRadius: 2,
              transition: 'background-color 0.3s ease',
              border: processingTime > 20 && processingTime <= 30 ? '1px solid rgba(66, 133, 119, 0.3)' : '1px solid transparent'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {processingTime > 20 ? <DoneIcon color="success" /> : <CircularProgress size={16} />}
                <Typography variant="body2" fontWeight={processingTime > 20 && processingTime <= 30 ? 'bold' : 'normal'}>
                  Förbereder och bearbetar orderinformation
                </Typography>
              </Box>
            </Box>
            
            {/* Step 4: Skicka email */}
            <Box sx={{ 
              width: '100%', 
              mt: 2, 
              p: 2, 
              bgcolor: processingTime > 30 ? 'rgba(66, 133, 119, 0.1)' : 'transparent',
              borderRadius: 2,
              transition: 'background-color 0.3s ease',
              border: processingTime > 30 ? '1px solid rgba(66, 133, 119, 0.3)' : '1px solid transparent'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {processingTime > 30 ? <DoneIcon color="success" /> : <CircularProgress size={16} />}
                <Typography variant="body2" fontWeight={processingTime > 30 ? 'bold' : 'normal'}>
                  Skickar bekräftelsemail <EmailIcon fontSize="small" sx={{ ml: 0.5, fontSize: 16 }} />
                </Typography>
              </Box>
            </Box>
            
            {processingTime > 40 && (
              <Typography variant="body2" color="primary" sx={{ mt: 3, fontWeight: 'bold' }}>
                Nästan klart! Förbereder din bekräftelsesida...
              </Typography>
            )}
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