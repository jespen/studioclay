'use client';

import React, { useEffect, useState } from 'react';
import { Container, Typography, Box, Paper, Button, CircularProgress, Divider } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EmailIcon from '@mui/icons-material/Email';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PRODUCT_TYPES } from '@/constants/statusCodes';

interface PaymentDetails {
  status: string;
  invoiceNumber?: string;
  productType?: string;
  productId?: string;
  amount?: number;
  createdAt?: string;
  userInfo?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
}

export default function PaymentConfirmation({ params }: { params: { reference: string } }) {
  const [loading, setLoading] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  // Hämta betalningsinformation baserat på referensnummer
  useEffect(() => {
    const fetchPaymentDetails = async () => {
      try {
        // Hämta orderstatus från API
        const response = await fetch(`/api/payments/details/${params.reference}`);
        
        if (!response.ok) {
          throw new Error('Kunde inte hämta betalningsinformation');
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.message || 'Ett fel uppstod');
        }
        
        setPaymentDetails(data.data);
        
        // Om produkttypen är definierad och har en egen bekräftelsesida, omdirigera dit
        if (data.data.productType) {
          if (data.data.productType === PRODUCT_TYPES.COURSE && data.data.productId) {
            router.push(`/book-course?reference=${params.reference}`);
            return;
          } else if (data.data.productType === PRODUCT_TYPES.GIFT_CARD) {
            router.push(`/gift-card-flow/confirmation?reference=${params.reference}`);
            return;
          } else if (data.data.productType === PRODUCT_TYPES.ART_PRODUCT) {
            router.push(`/shop?reference=${params.reference}`);
            return;
          }
        }
      } catch (err) {
        console.error('Error fetching payment details:', err);
        setError(err instanceof Error ? err.message : 'Ett fel uppstod');
      } finally {
        setLoading(false);
      }
    };
    
    if (params.reference) {
      fetchPaymentDetails();
    }
  }, [params.reference, router]);
  
  // Om vi laddar, visa en laddningsindikator
  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="50vh">
          <CircularProgress size={60} thickness={4} />
          <Typography variant="h6" sx={{ mt: 3 }}>
            Laddar betalningsinformation...
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
            Betalning hittades inte
          </Typography>
          <Typography variant="body1" paragraph>
            Vi kunde inte hitta någon betalning med referensnummer {params.reference}.
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
  
  // Hur många dagar betalningsvillkor
  const paymentDays = 10;
  
  // Formatera datum för betalningsvillkor
  const formatDueDate = () => {
    if (!paymentDetails.createdAt) return '';
    const dueDate = new Date(paymentDetails.createdAt);
    dueDate.setDate(dueDate.getDate() + paymentDays);
    return dueDate.toLocaleDateString('sv-SE');
  };
  
  // Huvudinnehåll för bekräftelsesidan
  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Box display="flex" alignItems="center" mb={3}>
          <CheckCircleIcon color="success" sx={{ fontSize: 40, mr: 2 }} />
          <Typography variant="h4" component="h1" fontWeight="bold">
            Tack för din beställning!
          </Typography>
        </Box>
        
        <Typography variant="body1" paragraph>
          Vi har tagit emot din beställning och skickat en bekräftelse till{' '}
          <strong>{paymentDetails.userInfo?.email || 'din e-postadress'}</strong>.
        </Typography>
        
        <Divider sx={{ my: 3 }} />
        
        <Box mb={4}>
          <Typography variant="h6" gutterBottom fontWeight="medium">
            Betalningsdetaljer
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
            <Box display="flex">
              <Typography variant="body1" sx={{ minWidth: 200 }} fontWeight="medium">
                Betalningsreferens:
              </Typography>
              <Typography variant="body1">
                {params.reference}
              </Typography>
            </Box>
            
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
            
            <Box display="flex">
              <Typography variant="body1" sx={{ minWidth: 200 }} fontWeight="medium">
                Status:
              </Typography>
              <Typography variant="body1">
                {paymentDetails.status === 'pending' 
                  ? 'Väntar på betalning' 
                  : paymentDetails.status === 'completed' 
                    ? 'Betald' 
                    : paymentDetails.status}
              </Typography>
            </Box>
            
            {paymentDetails.amount && (
              <Box display="flex">
                <Typography variant="body1" sx={{ minWidth: 200 }} fontWeight="medium">
                  Belopp:
                </Typography>
                <Typography variant="body1">
                  {paymentDetails.amount} kr
                </Typography>
              </Box>
            )}
            
            {paymentDetails.createdAt && (
              <Box display="flex">
                <Typography variant="body1" sx={{ minWidth: 200 }} fontWeight="medium">
                  Betalningsvillkor:
                </Typography>
                <Typography variant="body1">
                  Betala senast {formatDueDate()} ({paymentDays} dagar)
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
        
        <Divider sx={{ my: 3 }} />
        
        <Box sx={{ mt: 3, bgcolor: '#f7f7f7', p: 3, borderRadius: 2 }}>
          <Box display="flex" alignItems="center" mb={2}>
            <EmailIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="h6">
              Bekräftelse via e-post
            </Typography>
          </Box>
          <Typography variant="body1">
            En bekräftelse med alla uppgifter har skickats till din e-post. 
            {paymentDetails.productType === PRODUCT_TYPES.GIFT_CARD && 
              ' Ditt presentkort finns bifogat som PDF i e-postmeddelandet.'}
            {paymentDetails.invoiceNumber && 
              ' Din faktura finns bifogad som PDF i e-postmeddelandet.'}
          </Typography>
        </Box>
        
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
          <Button
            variant="contained"
            component={Link}
            href="/"
            sx={{ minWidth: 200 }}
          >
            Gå till startsidan
          </Button>
          
          {paymentDetails.productType === PRODUCT_TYPES.COURSE && (
            <Button
              variant="outlined"
              component={Link}
              href="/kurser"
              sx={{ minWidth: 200 }}
            >
              Se fler kurser
            </Button>
          )}
          
          {paymentDetails.productType === PRODUCT_TYPES.ART_PRODUCT && (
            <Button
              variant="outlined"
              component={Link}
              href="/konst"
              sx={{ minWidth: 200 }}
            >
              Se mer konst
            </Button>
          )}
        </Box>
      </Paper>
    </Container>
  );
} 