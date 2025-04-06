import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Grid,
  Paper,
  Button,
  Alert 
} from '@mui/material';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import EmailIcon from '@mui/icons-material/Email';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

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
  const [checkingPdf, setCheckingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

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

  console.log('DETAILS-1: GiftCardConfirmationDetails rendering with:', {
    giftCardNumber,
    amount,
    originalAmount: giftCardDetails?.amount,
    recipient_name: giftCardDetails?.recipient_name || giftCardDetails?.recipientName,
    recipient_email: giftCardDetails?.recipient_email || giftCardDetails?.recipientEmail,
    id: giftCardDetails?.id
  });

  // Function to check and open PDF
  const handleViewPdf = async () => {
    try {
      setCheckingPdf(true);
      setError(null);
      console.log('DETAILS-3: Checking for gift card PDF with ID:', giftCardDetails?.id);
      
      if (!giftCardDetails?.id) {
        console.error('DETAILS-ERROR-1: Missing gift card ID');
        setError('Det går inte att visa presentkortet: Saknar ID');
        setCheckingPdf(false);
        return;
      }
      
      // First check if the PDF exists in storage
      const bucketName = 'giftcards';
      const fileName = `gift-card-${giftCardNumber}.pdf`;
      const potentialPdfUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucketName}/${fileName}`;
      
      console.log('DETAILS-4: Checking if PDF exists at URL:', potentialPdfUrl);
      
      try {
        // Try to do a HEAD request to check if the file exists
        const checkResponse = await fetch(potentialPdfUrl, { method: 'HEAD' });
        
        if (checkResponse.ok) {
          // File exists, use it directly
          console.log('DETAILS-5: PDF exists, opening file');
          setPdfUrl(potentialPdfUrl);
          
          // Open PDF in new tab
          window.open(potentialPdfUrl, '_blank');
          setCheckingPdf(false);
          return;
        } else {
          console.log('DETAILS-6: PDF does not exist yet or is not accessible');
          setError(
            'Presentkortet har inte genererats ännu. Detta görs normalt automatiskt inom 10-15 minuter. ' +
            'Om du fortfarande inte kan se ditt presentkort efter denna tid, vänligen kontakta oss på ' +
            'eva@studioclay.se och ange presentkortskoden ' + giftCardNumber
          );
          setCheckingPdf(false);
          return;
        }
      } catch (checkError) {
        console.log('DETAILS-7: Error checking for existing PDF:', checkError);
        setError(
          'Kunde inte hitta presentkortet. Vänligen kontakta oss på ' +
          'eva@studioclay.se och ange presentkortskoden ' + giftCardNumber
        );
        setCheckingPdf(false);
        return;
      }
    } catch (err) {
      console.error('DETAILS-ERROR-4: Unhandled error:', err);
      setError(`Det gick inte att ladda presentkortet: ${err instanceof Error ? err.message : 'Okänt fel'}`);
    } finally {
      setCheckingPdf(false);
    }
  };

  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
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
        
        {/* PDF Download Button */}
        <Grid item xs={12} sm={6}>
          <Button
            variant="contained"
            fullWidth
            startIcon={<FileDownloadIcon />}
            onClick={handleViewPdf}
            disabled={checkingPdf}
            sx={{ mt: 2 }}
          >
            {checkingPdf ? 'Söker presentkort...' : 'Visa & ladda ner presentkort'}
          </Button>
        </Grid>
        {/* Debug info */}
        <Box sx={{ mt: 1, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            {giftCardDetails?.id ? 'Presentkorts-ID: ' + giftCardDetails.id : 'Inget presentkorts-ID hittat'}
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
         Du kommer nu få ett bekräftelsemail tillsammans med själva presentkortet. Presentkortet kan användas direkt och lösa in det mot valfri kurs eller produkt på vår hemsida.
        </Typography>
        <Typography variant="body1">
          Om du eller mottagaren av presentkortet har några frågor, kontakta eva@studioclay.se.
        </Typography>
      </Box>
    </>
  );
};

export default GiftCardConfirmationDetails; 