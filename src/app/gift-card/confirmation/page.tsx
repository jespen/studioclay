'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { Container, Typography, Box, Paper, Button, CircularProgress, Divider, Card, CardContent } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import DownloadIcon from '@mui/icons-material/Download';
import EmailIcon from '@mui/icons-material/Email';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import JobProcessor from '@/components/common/JobProcessor';

interface GiftCardData {
  code?: string;
  amount?: number;
  status?: string;
  recipientName?: string;
  recipientEmail?: string;
  senderName?: string;
  message?: string;
  expiresAt?: string;
  pdfUrl?: string;
}

interface PaymentDetails {
  paymentReference?: string;
  invoiceNumber?: string;
  status?: string;
  amount?: number;
  createdAt?: string;
  productType?: string;
  userInfo?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  giftCard?: GiftCardData;
}

function ConfirmationContent() {
  const [loading, setLoading] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const reference = searchParams?.get('reference');
  
  // Hämta betalningsdetaljer baserat på referens
  useEffect(() => {
    const fetchPaymentDetails = async () => {
      if (!reference) {
        setError('Ingen betalningsreferens hittades');
        setLoading(false);
        return;
      }
      
      try {
        const response = await fetch(`/api/payments/details/${reference}`);
        
        if (!response.ok) {
          throw new Error('Kunde inte hämta betalningsinformation');
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.message || 'Ett fel uppstod');
        }
        
        setPaymentDetails(data.data);
      } catch (err) {
        console.error('Error fetching payment details:', err);
        setError(err instanceof Error ? err.message : 'Ett fel uppstod');
      } finally {
        setLoading(false);
      }
    };
    
    if (reference) {
      fetchPaymentDetails();
    } else {
      setLoading(false);
      setError('Ingen betalningsreferens angiven');
    }
  }, [reference]);
  
  // Om vi laddar, visa en laddningsindikator
  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="50vh">
          <CircularProgress size={60} thickness={4} />
          <Typography variant="h6" sx={{ mt: 3 }}>
            Laddar presentkortsinformation...
          </Typography>
        </Box>
      </Container>
    );
  }
  
  // Om fel uppstod, visa felmeddelande
  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h4" component="h1" gutterBottom color="error">
            Ett fel uppstod
          </Typography>
          <Typography variant="body1" paragraph>
            {error}
          </Typography>
          <Button
            variant="contained"
            component={Link}
            href="/"
            sx={{ mt: 2 }}
          >
            Gå till startsidan
          </Button>
        </Paper>
      </Container>
    );
  }
  
  // Om inga detaljer hittades
  if (!paymentDetails) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Presentkort hittades inte
          </Typography>
          <Typography variant="body1" paragraph>
            Vi kunde inte hitta något presentkort med den angivna referensen.
          </Typography>
          <Button
            variant="contained"
            component={Link}
            href="/"
            sx={{ mt: 2 }}
          >
            Gå till startsidan
          </Button>
        </Paper>
      </Container>
    );
  }
  
  // Formatera utgångsdatum
  const formatExpiryDate = () => {
    if (!paymentDetails.giftCard?.expiresAt) return 'Ett år från inköp';
    
    try {
      const expiryDate = new Date(paymentDetails.giftCard.expiresAt);
      return expiryDate.toLocaleDateString('sv-SE');
    } catch (e) {
      return 'Ett år från inköp';
    }
  };
  
  // Formatera betalningsvillkor
  const formatDueDate = () => {
    if (!paymentDetails.createdAt) return '';
    const dueDate = new Date(paymentDetails.createdAt);
    dueDate.setDate(dueDate.getDate() + 14); // 14 dagars betalningsvillkor
    return dueDate.toLocaleDateString('sv-SE');
  };
  
  // Huvudinnehåll för presentkortsbekräftelsesidan
  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Box display="flex" alignItems="center" mb={3}>
          <CheckCircleIcon color="success" sx={{ fontSize: 40, mr: 2 }} />
          <Typography variant="h4" component="h1" fontWeight="bold">
            Tack för ditt köp av presentkort!
          </Typography>
        </Box>
        
        <Typography variant="body1" paragraph>
          Vi har tagit emot din beställning av presentkort till Studio Clay. 
          En bekräftelse har skickats till {paymentDetails.userInfo?.email || 'din e-postadress'}.
        </Typography>
        
        {/* Presentkortsinformation */}
        <Card sx={{ mb: 4, mt: 4, backgroundColor: '#f9f9f9', border: '1px solid #e0e0e0' }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <CardGiftcardIcon color="primary" sx={{ fontSize: 30, mr: 2 }} />
              <Typography variant="h5" component="h2">
                Presentkortsinformation
              </Typography>
            </Box>
            
            <Divider sx={{ mb: 3 }} />
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {paymentDetails.giftCard?.code && (
                <Box display="flex">
                  <Typography variant="body1" sx={{ minWidth: 180 }} fontWeight="medium">
                    Presentkortskod:
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {paymentDetails.giftCard.code}
                  </Typography>
                </Box>
              )}
              
              <Box display="flex">
                <Typography variant="body1" sx={{ minWidth: 180 }} fontWeight="medium">
                  Värde:
                </Typography>
                <Typography variant="body1">
                  {paymentDetails.amount || paymentDetails.giftCard?.amount || 0} kr
                </Typography>
              </Box>
              
              {paymentDetails.giftCard?.status && (
                <Box display="flex">
                  <Typography variant="body1" sx={{ minWidth: 180 }} fontWeight="medium">
                    Status:
                  </Typography>
                  <Typography variant="body1">
                    {paymentDetails.giftCard.status === 'active' 
                      ? 'Aktivt' 
                      : paymentDetails.giftCard.status === 'pending' 
                        ? 'Väntar på betalning' 
                        : paymentDetails.giftCard.status}
                  </Typography>
                </Box>
              )}
              
              <Box display="flex">
                <Typography variant="body1" sx={{ minWidth: 180 }} fontWeight="medium">
                  Giltigt till:
                </Typography>
                <Typography variant="body1">
                  {formatExpiryDate()}
                </Typography>
              </Box>
              
              {paymentDetails.giftCard?.recipientName && (
                <Box display="flex">
                  <Typography variant="body1" sx={{ minWidth: 180 }} fontWeight="medium">
                    Mottagare:
                  </Typography>
                  <Typography variant="body1">
                    {paymentDetails.giftCard.recipientName}
                  </Typography>
                </Box>
              )}
              
              {paymentDetails.giftCard?.message && (
                <Box display="flex" flexDirection="column" sx={{ mt: 2 }}>
                  <Typography variant="body1" fontWeight="medium">
                    Meddelande:
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 1, p: 2, backgroundColor: '#fff', borderRadius: 1 }}>
                    "{paymentDetails.giftCard.message}"
                  </Typography>
                </Box>
              )}
            </Box>
            
            {paymentDetails.giftCard?.pdfUrl && (
              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  startIcon={<DownloadIcon />}
                  href={paymentDetails.giftCard.pdfUrl}
                  target="_blank"
                >
                  Ladda ner presentkortet som PDF
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
        
        {/* Betalningsinformation */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Betalningsinformation
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
            {paymentDetails.paymentReference && (
              <Box display="flex">
                <Typography variant="body1" sx={{ minWidth: 200 }} fontWeight="medium">
                  Betalningsreferens:
                </Typography>
                <Typography variant="body1">
                  {paymentDetails.paymentReference}
                </Typography>
              </Box>
            )}
            
            {paymentDetails.invoiceNumber && (
              <Box display="flex">
                <Typography variant="body1" sx={{ minWidth: 200 }} fontWeight="medium">
                  Fakturanummer:
                </Typography>
                <Typography variant="body1">
                  {paymentDetails.invoiceNumber}
                </Typography>
              </Box>
            )}
            
            {paymentDetails.status && (
              <Box display="flex">
                <Typography variant="body1" sx={{ minWidth: 200 }} fontWeight="medium">
                  Betalningsstatus:
                </Typography>
                <Typography variant="body1">
                  {paymentDetails.status === 'pending' 
                    ? 'Väntar på betalning' 
                    : paymentDetails.status === 'completed' 
                      ? 'Betald' 
                      : paymentDetails.status}
                </Typography>
              </Box>
            )}
            
            {paymentDetails.createdAt && paymentDetails.invoiceNumber && (
              <Box display="flex">
                <Typography variant="body1" sx={{ minWidth: 200 }} fontWeight="medium">
                  Betala senast:
                </Typography>
                <Typography variant="body1">
                  {formatDueDate()}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
        
        <Divider sx={{ my: 4 }} />
        
        {/* E-postinformation */}
        <Box sx={{ mt: 3, bgcolor: '#f5f5f5', p: 3, borderRadius: 2 }}>
          <Box display="flex" alignItems="center" mb={2}>
            <EmailIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="h6">
              Bekräftelse via e-post
            </Typography>
          </Box>
          <Typography variant="body1">
            En bekräftelse med alla uppgifter har skickats till din e-post. 
            {paymentDetails.invoiceNumber 
              ? ' Din faktura finns bifogad som PDF i e-postmeddelandet.' 
              : ' När betalningen är bekräftad kommer presentkortet att aktiveras.'}
          </Typography>
        </Box>
        
        {/* Knappar */}
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
          <Button
            variant="contained"
            component={Link}
            href="/"
            sx={{ minWidth: 200 }}
          >
            Återgå till butiken
          </Button>
          
          <Button
            variant="outlined"
            component={Link}
            href="/gift-card"
            sx={{ minWidth: 200 }}
          >
            Köp fler presentkort
          </Button>
        </Box>
        
        {/* Silent job processor */}
        <JobProcessor paymentReference={reference || undefined} />
      </Paper>
    </Container>
  );
}

// Add loading fallback for Suspense
function LoadingFallback() {
  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="50vh">
        <CircularProgress size={60} thickness={4} />
        <Typography variant="h6" sx={{ mt: 3 }}>
          Laddar presentkortsinformation...
        </Typography>
      </Box>
    </Container>
  );
}

export default function GiftCardConfirmation() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ConfirmationContent />
    </Suspense>
  );
} 