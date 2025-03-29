'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid,
  Alert, 
  Divider,
  Button,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EmailIcon from '@mui/icons-material/Email';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';

import { FlowStateData } from '../common/FlowStepWrapper';
import StyledButton from '../common/StyledButton';
import { clearFlowData } from '@/utils/flowStorage';

// Define types
interface GiftCardDetails {
  amount: string;
  type: string;
  recipientName?: string;
  recipientEmail?: string;
  message?: string;
  created_at?: string;
}

interface UserInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialRequirements?: string;
}

interface PaymentInfo {
  status: string;
  method?: string;
  amount?: string;
  payment_date?: string;
}

interface GiftCardConfirmationProps {
  flowData?: FlowStateData;
}

// Generate a random gift card number
const generateGiftCardNumber = () => {
  // Format: SC-XXXX-XXXX-XXXX
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'SC-';
  for (let i = 0; i < 12; i++) {
    if (i % 4 === 0 && i > 0) result += '-';
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

// Format date to Swedish format
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Add one year to date
const addOneYear = (dateString: string) => {
  const date = new Date(dateString);
  date.setFullYear(date.getFullYear() + 1);
  return formatDate(date.toISOString());
};

const GiftCardConfirmation: React.FC<GiftCardConfirmationProps> = ({ flowData }) => {
  const router = useRouter();
  const [giftCardDetails, setGiftCardDetails] = useState<GiftCardDetails | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [giftCardNumber] = useState(generateGiftCardNumber());
  const [error, setError] = useState<string | null>(null);

  // Load data from props or flow storage
  useEffect(() => {
    if (flowData) {
      // Set data from flowData props
      setGiftCardDetails(flowData.itemDetails as GiftCardDetails);
      setUserInfo(flowData.userInfo as UserInfo);
      setPaymentInfo(flowData.paymentInfo as PaymentInfo);
    } else {
      // Fallback to local storage
      try {
        const storedUserInfo = localStorage.getItem('userInfo');
        const storedGiftCardDetails = sessionStorage.getItem('giftCardDetails');
        const storedPaymentInfo = localStorage.getItem('paymentInfo');
        
        if (storedUserInfo) setUserInfo(JSON.parse(storedUserInfo));
        if (storedGiftCardDetails) setGiftCardDetails(JSON.parse(storedGiftCardDetails));
        if (storedPaymentInfo) setPaymentInfo(JSON.parse(storedPaymentInfo));
      } catch (error) {
        console.error('Error loading stored data:', error);
        setError('Ett fel uppstod vid laddning av orderinformation.');
      }
    }
  }, [flowData]);

  const handleHome = () => {
    // Clear flow data before going home
    clearFlowData();
    sessionStorage.removeItem('giftCardAmount');
    sessionStorage.removeItem('giftCardType');
    
    router.push('/');
  };

  const purchaseDate = paymentInfo?.payment_date 
    ? formatDate(paymentInfo.payment_date)
    : formatDate(new Date().toISOString());
    
  const expiryDate = paymentInfo?.payment_date
    ? addOneYear(paymentInfo.payment_date)
    : addOneYear(new Date().toISOString());

  return (
    <Paper elevation={3} sx={{ borderRadius: 2, p: { xs: 2, sm: 4 }, mt: 4 }}>
      {error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : (
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <CheckCircleIcon 
            sx={{ 
              fontSize: 80, 
              color: 'var(--primary)', 
              mb: 2 
            }} 
          />
          <Typography variant="h4" gutterBottom>
            Din beställning är bekräftad
          </Typography>
          <Typography variant="body1" color="text.secondary">
            En orderbekräftelse har skickats till {userInfo?.email || 'din e-post'}.
          </Typography>
        </Box>
      )}
      
      {/* Gift Card Details */}
      <Box 
        sx={{ 
          mb: 4, 
          p: 3, 
          border: '1px solid #e0e0e0', 
          borderRadius: 2,
          background: '#f9f9f9'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <CardGiftcardIcon sx={{ mr: 1, color: 'var(--primary)' }} />
          <Typography variant="h6">Presentkort</Typography>
        </Box>
        
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">Presentkortsnummer</Typography>
            <Typography variant="body1" fontWeight="bold">{giftCardNumber}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">Belopp</Typography>
            <Typography variant="body1" fontWeight="bold">{giftCardDetails?.amount || '0'} kr</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">Köpdatum</Typography>
            <Typography variant="body1">{purchaseDate}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">Giltigt till</Typography>
            <Typography variant="body1">{expiryDate}</Typography>
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(84, 114, 100, 0.05)', borderRadius: 1 }}>
          <Typography variant="body2">
            Presentkortet har skickats till {giftCardDetails?.recipientEmail || 'mottagaren'} och kan användas för att boka 
            kurser, workshops eller köpa produkter på vår hemsida.
          </Typography>
        </Box>
      </Box>
      
      {/* Recipient Information */}
      {giftCardDetails && (giftCardDetails.recipientName || giftCardDetails.recipientEmail) && (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <EmailIcon sx={{ mr: 1, color: 'var(--primary)' }} />
            <Typography variant="h6">Mottagarinformation</Typography>
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Avsändare</Typography>
              <Typography variant="body1">{userInfo?.firstName} {userInfo?.lastName}</Typography>
              <Typography variant="body1">{userInfo?.email}</Typography>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Mottagare</Typography>
              <Typography variant="body1">{giftCardDetails.recipientName || 'Ej angiven'}</Typography>
              <Typography variant="body1">{giftCardDetails.recipientEmail || 'Ej angiven'}</Typography>
            </Grid>
            
            {giftCardDetails.message && (
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">Personligt meddelande</Typography>
                <Typography variant="body1" sx={{ fontStyle: 'italic', p: 2, bgcolor: 'rgba(84, 114, 100, 0.05)', borderRadius: 1 }}>
                  "{giftCardDetails.message}"
                </Typography>
              </Grid>
            )}
          </Grid>
        </Box>
      )}
      
      {/* Order Information */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <ReceiptIcon sx={{ mr: 1, color: 'var(--primary)' }} />
          <Typography variant="h6">Orderinformation</Typography>
        </Box>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">Ordernummer</Typography>
            <Typography variant="body1">{Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">Betalningssätt</Typography>
            <Typography variant="body1">{paymentInfo?.method === 'card' ? 'Kortbetalning' : (paymentInfo?.method === 'swish' ? 'Swish' : 'Faktura')}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">Totalt</Typography>
            <Typography variant="body1">{giftCardDetails?.amount || paymentInfo?.amount || '0'} kr</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">Status</Typography>
            <Typography variant="body1" sx={{ color: 'green' }}>Bekräftad</Typography>
          </Grid>
        </Grid>
      </Box>
      
      {/* What's Next */}
      <Box sx={{ mb: 4, p: 3, bgcolor: 'rgba(84, 114, 100, 0.05)', borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          Vad händer nu?
        </Typography>
        <Typography variant="body1" paragraph>
          Mottagaren har fått ett mail med presentkortet och instruktioner för hur det används.
          De kan använda presentkortet direkt och lösa in det mot valfri kurs eller produkt på vår hemsida.
        </Typography>
        <Typography variant="body1">
          Om du eller mottagaren har några frågor, kontakta oss gärna på info@studioclay.se.
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <StyledButton 
          onClick={handleHome}
          sx={{ minWidth: 200 }}
        >
          Tillbaka till startsidan
        </StyledButton>
      </Box>
    </Paper>
  );
};

export default GiftCardConfirmation; 