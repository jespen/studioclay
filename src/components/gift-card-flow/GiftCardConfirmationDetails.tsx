import React, { useState, useEffect } from 'react';
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

// Helper function to get gift card details from localStorage
const getGiftCardDetailsFromStorage = () => {
  try {
    // Try different keys that might contain gift card details
    const possibleKeys = ['giftCardDetails', 'gift_card_details', 'itemDetails', 'item_details'];
    
    for (const key of possibleKeys) {
      const storedData = localStorage.getItem(key);
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData);
          console.log(`Found gift card details in localStorage with key "${key}":`, parsedData);
          return parsedData;
        } catch (e) {
          console.warn(`Failed to parse JSON from localStorage key "${key}"`, e);
        }
      }
    }
    
    // Also check if we have a payment reference stored
    const paymentInfo = localStorage.getItem('payment_info') || localStorage.getItem('paymentInfo');
    if (paymentInfo) {
      try {
        const parsedPaymentInfo = JSON.parse(paymentInfo);
        console.log('Found payment info in localStorage:', parsedPaymentInfo);
        
        if (parsedPaymentInfo.reference || parsedPaymentInfo.metadata?.paymentReference) {
          return {
            payment_reference: parsedPaymentInfo.reference || parsedPaymentInfo.metadata?.paymentReference
          };
        }
      } catch (e) {
        console.warn('Failed to parse payment info from localStorage', e);
      }
    }
    
    return null;
  } catch (e) {
    console.error('Error accessing localStorage:', e);
    return null;
  }
};

const GiftCardConfirmationDetails: React.FC<GiftCardConfirmationDetailsProps> = ({ 
  giftCardDetails, 
  userInfo 
}) => {
  const [checkingPdf, setCheckingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadedGiftCardDetails, setLoadedGiftCardDetails] = useState<any>(null);
  const [detailsFromStorage, setDetailsFromStorage] = useState<any>(null);

  // On mount, try to get details from localStorage
  useEffect(() => {
    const storageDetails = getGiftCardDetailsFromStorage();
    if (storageDetails) {
      setDetailsFromStorage(storageDetails);
      console.log('DETAILS-STORAGE: Using gift card details from localStorage:', storageDetails);
    }
  }, []);

  // Use either loaded details from DB, passed details, or localStorage details
  const currentGiftCardDetails = loadedGiftCardDetails || giftCardDetails || detailsFromStorage;
  
  // Use payment_reference if code is not available
  const giftCardNumber = currentGiftCardDetails?.code || currentGiftCardDetails?.payment_reference;
  
  useEffect(() => {
    // If we have a payment reference but no code, try to fetch the full gift card details
    const fetchGiftCardByReference = async () => {
      if (!giftCardDetails?.code && (giftCardDetails?.payment_reference || giftCardDetails?.paymentReference || detailsFromStorage?.payment_reference)) {
        try {
          const reference = giftCardDetails?.payment_reference || giftCardDetails?.paymentReference || detailsFromStorage?.payment_reference;
          console.log('DETAILS-2: Fetching gift card details for reference:', reference);
          
          const response = await fetch(`/api/gift-cards/by-reference?reference=${reference}`);
          if (!response.ok) {
            throw new Error('Failed to fetch gift card details');
          }
          
          const data = await response.json();
          if (data.success && data.data) {
            console.log('DETAILS-2: Successfully fetched gift card details:', data.data);
            setLoadedGiftCardDetails(data.data);
          } else {
            console.error('DETAILS-2: API returned error:', data.message || 'Unknown error');
          }
        } catch (err) {
          console.error('DETAILS-2: Error fetching gift card details:', err);
        }
      }
    };
    
    fetchGiftCardByReference();
  }, [giftCardDetails, detailsFromStorage]);
  
  if (!giftCardNumber) {
    console.error('No gift card code found in details:', giftCardDetails);
  }

  const purchaseDate = currentGiftCardDetails?.created_at 
    ? formatDate(currentGiftCardDetails.created_at)
    : formatDate(new Date().toISOString());
    
  const expiryDate = currentGiftCardDetails?.expires_at
    ? formatDate(currentGiftCardDetails.expires_at)
    : currentGiftCardDetails?.created_at
      ? addOneYear(currentGiftCardDetails.created_at)
      : addOneYear(new Date().toISOString());
      
  // Ensure amount is a number and properly displayed
  const amount = typeof currentGiftCardDetails?.amount === 'number'
    ? currentGiftCardDetails.amount
    : Number(currentGiftCardDetails?.amount) || 0;

  // Extract the message from various possible locations
  const messageFromDetails = 
    typeof currentGiftCardDetails?.details === 'object' && currentGiftCardDetails?.details?.message 
      ? currentGiftCardDetails.details.message 
      : currentGiftCardDetails?.message || '';

  console.log('DETAILS-1: GiftCardConfirmationDetails rendering with:', {
    giftCardNumber,
    amount,
    originalAmount: currentGiftCardDetails?.amount,
    recipient_name: currentGiftCardDetails?.recipient_name || currentGiftCardDetails?.recipientName,
    recipient_email: currentGiftCardDetails?.recipient_email || currentGiftCardDetails?.recipientEmail,
    message: messageFromDetails,
    id: currentGiftCardDetails?.id
  });

  // Function to check and open PDF
  const handleViewPdf = async () => {
    try {
      setCheckingPdf(true);
      setError(null);
      console.log('DETAILS-3: Checking for gift card PDF with the following details:', {
        id: currentGiftCardDetails?.id,
        code: currentGiftCardDetails?.code,
        payment_reference: currentGiftCardDetails?.payment_reference || currentGiftCardDetails?.paymentReference
      });
      
      // If we don't have enough info to find the PDF
      if (!currentGiftCardDetails?.id && 
          !currentGiftCardDetails?.payment_reference && 
          !currentGiftCardDetails?.paymentReference && 
          !currentGiftCardDetails?.code) {
        console.error('DETAILS-ERROR-1: Missing all identifiers - cannot locate PDF');
        setError('Det går inte att visa presentkortet: Saknar alla nödvändiga identifierare');
        setCheckingPdf(false);
        return;
      }
      
      // Try different file name formats
      const bucketName = 'giftcards';
      const reference = currentGiftCardDetails?.payment_reference || currentGiftCardDetails?.paymentReference;
      const code = currentGiftCardDetails?.code;
      
      // List of potential file names in order of priority
      const potentialFileNames = [];
      
      if (reference) {
        potentialFileNames.push(
          `${reference.replace(/[^a-zA-Z0-9-_.]/g, '_')}.pdf`, // Clean reference
          `${reference}.pdf` // Exact reference
        );
      }
      
      if (code) {
        potentialFileNames.push(
          `${code.replace(/[^a-zA-Z0-9-_.]/g, '_')}.pdf`, // Clean code
          `${code}.pdf`, // Exact code
          `gift-card-${code}.pdf` // Legacy format
        );
      }
      
      if (currentGiftCardDetails?.id) {
        potentialFileNames.push(`giftcard-${currentGiftCardDetails.id}.pdf`);
      }
      
      console.log('DETAILS-4: Will try these potential PDF filenames:', potentialFileNames);
      
      // Try each file name until we find one that works
      for (const fileName of potentialFileNames) {
        const potentialPdfUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucketName}/${fileName}`;
      
        console.log(`DETAILS-5: Checking if PDF exists at: ${potentialPdfUrl}`);
      
      try {
        // Try to do a HEAD request to check if the file exists
        const checkResponse = await fetch(potentialPdfUrl, { method: 'HEAD' });
        
        if (checkResponse.ok) {
          // File exists, use it directly
            console.log(`DETAILS-6: PDF found at: ${potentialPdfUrl}`);
          setPdfUrl(potentialPdfUrl);
          
          // Open PDF in new tab
          window.open(potentialPdfUrl, '_blank');
          setCheckingPdf(false);
          return;
        } else {
            console.log(`DETAILS-7: PDF not found at: ${potentialPdfUrl}, status: ${checkResponse.status}`);
          }
        } catch (checkError) {
          console.error(`DETAILS-8: Error checking for PDF at ${potentialPdfUrl}:`, checkError);
        }
      }
      
      // If we get here, no PDF was found
      console.warn('DETAILS-9: No PDF found with any of the potential filenames');
      
      // Check if the background job might still be processing
      const jobCheckMessage = reference 
        ? `Bakgrundsjobbet för presentkortet (ref: ${reference}) kan fortfarande bearbetas.`
        : `Bakgrundsjobbet för presentkortet kan fortfarande bearbetas.`;
      
        setError(
        `Presentkortet har inte genererats ännu. ${jobCheckMessage} ` + 
        'Detta görs normalt automatiskt inom 10-15 minuter efter betalning. ' +
        'Om du fortfarande inte kan se ditt presentkort efter denna tid, vänligen kontakta oss på ' +
        'eva@studioclay.se och ange presentkortskoden eller referensnumret.'
        );
        setCheckingPdf(false);
    } catch (err) {
      console.error('DETAILS-ERROR-4: Unhandled error:', err);
      setError(`Det gick inte att ladda presentkortet: ${err instanceof Error ? err.message : 'Okänt fel'}`);
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
            Presentkortet har skickats till {currentGiftCardDetails?.recipient_email || currentGiftCardDetails?.recipientEmail || 'mottagaren'} och kan användas för att boka 
            kurser, workshops eller köpa produkter på vår hemsida.
          </Typography>
        </Box>
        
        {/* PDF Download Button - TEMPORARILY DISABLED
         * This functionality has been temporarily disabled due to issues with file naming and retrieval.
         * It will be reimplemented in a future update. The gift card is still sent via email.
         */}
        {/* 
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
        */}
        
        {/* Debug info */}
        {/* <Box sx={{ mt: 1, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            {currentGiftCardDetails?.id ? 'Presentkorts-ID: ' + currentGiftCardDetails.id : 'Inget presentkorts-ID hittat'}
          </Typography>
        </Box> */}
      </Box>
      
      {/* Recipient Information */}
      {currentGiftCardDetails && (currentGiftCardDetails.recipient_name || currentGiftCardDetails.recipientName || currentGiftCardDetails.recipient_email || currentGiftCardDetails.recipientEmail) && (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <EmailIcon sx={{ mr: 1, color: 'var(--primary)' }} />
            <Typography variant="h6">Mottagarinformation</Typography>
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Avsändare</Typography>
              <Typography variant="body1">{currentGiftCardDetails.sender_name || `${userInfo?.firstName} ${userInfo?.lastName}`}</Typography>
              <Typography variant="body1">{currentGiftCardDetails.sender_email || userInfo?.email}</Typography>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Mottagare</Typography>
              <Typography variant="body1">{currentGiftCardDetails.recipient_name || currentGiftCardDetails.recipientName || 'Ej angiven'}</Typography>
              <Typography variant="body1">{currentGiftCardDetails.recipient_email || currentGiftCardDetails.recipientEmail || 'Ej angiven'}</Typography>
            </Grid>
            
            {messageFromDetails && (
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">Personligt meddelande</Typography>
                <Typography variant="body1" sx={{ fontStyle: 'italic', p: 2, bgcolor: 'rgba(84, 114, 100, 0.05)', borderRadius: 1 }}>
                  "{messageFromDetails}"
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