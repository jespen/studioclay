import React from 'react';
import { 
  Box, 
  Typography, 
  Grid,
  Paper 
} from '@mui/material';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import EmailIcon from '@mui/icons-material/Email';

interface GiftCardConfirmationDetailsProps {
  giftCardDetails: any;
  userInfo: any;
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

const GiftCardConfirmationDetails: React.FC<GiftCardConfirmationDetailsProps> = ({ 
  giftCardDetails, 
  userInfo 
}) => {
  // Get or generate gift card number
  const giftCardNumber = giftCardDetails?.code || giftCardDetails?.card_number || generateGiftCardNumber();
  const purchaseDate = giftCardDetails?.created_at 
    ? formatDate(giftCardDetails.created_at)
    : formatDate(new Date().toISOString());
    
  const expiryDate = giftCardDetails?.expires_at
    ? formatDate(giftCardDetails.expires_at)
    : giftCardDetails?.created_at
      ? addOneYear(giftCardDetails.created_at)
      : addOneYear(new Date().toISOString());
      
  // Ensure amount is a number and properly displayed
  const amount = typeof giftCardDetails?.amount === 'number'
    ? giftCardDetails.amount
    : Number(giftCardDetails?.amount) || 0;

  console.log('GiftCardConfirmationDetails rendering with:', {
    giftCardNumber,
    amount,
    originalAmount: giftCardDetails?.amount,
    recipient_name: giftCardDetails?.recipient_name || giftCardDetails?.recipientName,
    recipient_email: giftCardDetails?.recipient_email || giftCardDetails?.recipientEmail
  });

  return (
    <>
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
            <Typography variant="body1" fontWeight="bold">{amount} kr</Typography>
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
            Presentkortet har skickats till {giftCardDetails?.recipient_email || giftCardDetails?.recipientEmail || 'mottagaren'} och kan användas för att boka 
            kurser, workshops eller köpa produkter på vår hemsida.
          </Typography>
        </Box>
      </Box>
      
      {/* Recipient Information */}
      {giftCardDetails && (giftCardDetails.recipient_name || giftCardDetails.recipientName || giftCardDetails.recipient_email || giftCardDetails.recipientEmail) && (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <EmailIcon sx={{ mr: 1, color: 'var(--primary)' }} />
            <Typography variant="h6">Mottagarinformation</Typography>
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Avsändare</Typography>
              <Typography variant="body1">{giftCardDetails.sender_name || `${userInfo?.firstName} ${userInfo?.lastName}`}</Typography>
              <Typography variant="body1">{giftCardDetails.sender_email || userInfo?.email}</Typography>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Mottagare</Typography>
              <Typography variant="body1">{giftCardDetails.recipient_name || giftCardDetails.recipientName || 'Ej angiven'}</Typography>
              <Typography variant="body1">{giftCardDetails.recipient_email || giftCardDetails.recipientEmail || 'Ej angiven'}</Typography>
            </Grid>
            
            {(giftCardDetails.message || giftCardDetails.message) && (
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">Personligt meddelande</Typography>
                <Typography variant="body1" sx={{ fontStyle: 'italic', p: 2, bgcolor: 'rgba(84, 114, 100, 0.05)', borderRadius: 1 }}>
                  "{giftCardDetails.message || giftCardDetails.message}"
                </Typography>
              </Grid>
            )}
          </Grid>
        </Box>
      )}
      
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
          Om du eller mottagaren har några frågor, kontakta oss gärna på eva@studioclay.se.
        </Typography>
      </Box>
    </>
  );
};

export default GiftCardConfirmationDetails; 