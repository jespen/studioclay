'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PaymentIcon from '@mui/icons-material/Payment';

import StyledButton from './StyledButton';
import { FlowStateData } from './FlowStepWrapper';
import { FlowType } from './BookingStepper';
import { cleanupCheckoutFlow } from '@/utils/dataStorage';

import CourseConfirmationDetails from '../booking/CourseConfirmationDetails';
import GiftCardConfirmationDetails from '../gift-card-flow/GiftCardConfirmationDetails';
import ProductConfirmationDetails from '../shop/ProductConfirmationDetails';

interface GenericConfirmationProps {
  flowType: FlowType;
  flowData?: FlowStateData;
  itemId?: string;
  orderReference?: string;
}

interface CommonData {
  title: string;
  orderReference: string;
  userInfo: any;
  paymentInfo: any;
  itemDetails: any;
}

const GenericConfirmation: React.FC<GenericConfirmationProps> = ({ 
  flowType,
  flowData,
  itemId,
  orderReference
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CommonData | null>(null);

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('sv-SE', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return new Date().toLocaleDateString('sv-SE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  // Map payment method to display name
  const getMethodDisplayName = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'swish':
        return 'Swish';
      case 'invoice':
        return 'Faktura';
      case 'credit_card':
        return 'Kreditkort';
      default:
        return 'Direktbetalning';
    }
  };

  // Fetch order information from API based on flowType
  const fetchOrderByReference = async (reference: string) => {
    try {
      console.log(`Fetching ${flowType} order by reference:`, reference);
      
      let endpoint = '';
      switch (flowType) {
        case FlowType.ART_PURCHASE:
          endpoint = `/api/art-orders/by-reference/${reference}`;
          break;
        case FlowType.COURSE_BOOKING:
          endpoint = `/api/bookings/${reference}`;
          break;
        case FlowType.GIFT_CARD:
          endpoint = `/api/gift-cards/${reference}`;
          break;
        default:
          throw new Error(`Unknown flow type: ${flowType}`);
      }
      
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch order: ${response.statusText}`);
      }
      
      const responseData = await response.json();
      console.log('Received order data:', responseData);
      
      if (!responseData.success) {
        throw new Error(responseData.error || 'Failed to fetch order data');
      }
      
      return responseData;
    } catch (error) {
      console.error('Error fetching order:', error);
      setError('Kunde inte hämta orderinformation');
      return null;
    }
  };

  // Handle going back to home and clearing data
  const handleBackToHome = () => {
    cleanupCheckoutFlow();
  };

  // Initialize data from various sources
  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        
        // If we have flow data, use it directly (preferred and most complete)
        if (flowData && flowData.itemDetails) {
          console.log('Using flowData for confirmation:', flowData);
          console.log('Payment status from flowData:', flowData.paymentInfo?.status);
          
          let title = 'Din beställning är bekräftad';
          switch (flowType) {
            case FlowType.COURSE_BOOKING:
              title = 'Din bokning är bekräftad!';
              break;
            case FlowType.GIFT_CARD:
              title = 'Ditt presentkort är bekräftat!';
              break;
            case FlowType.ART_PURCHASE:
              title = 'Tack för ditt köp!';
              break;
          }
          
          setData({
            title,
            orderReference: flowData.paymentInfo?.reference || 'N/A',
            userInfo: flowData.userInfo || {},
            paymentInfo: flowData.paymentInfo || {},
            itemDetails: flowData.itemDetails || {}
          });
        }
        // If we have a direct order reference from URL, fetch data
        else if (orderReference) {
          console.log('Using provided order reference:', orderReference);
          const orderData = await fetchOrderByReference(orderReference);
          
          if (orderData) {
            setData({
              title: 'Din beställning är bekräftad',
              orderReference: orderData.reference || orderReference,
              userInfo: orderData.customer || {},
              paymentInfo: {
                payment_method: orderData.order?.payment_method,
                status: orderData.order?.payment_status || 'PAID',
                amount: orderData.order?.total_price,
                payment_date: orderData.order?.created_at
              },
              itemDetails: orderData.product || orderData.course || orderData.giftCard || {}
            });
          }
        }
        // If we have an item ID but no other data, try to load from item ID
        else if (itemId) {
          setError('För att visa orderinformation, använd länken från orderbekräftelsen');
        }
        else {
          setError('Ingen orderinformation tillgänglig');
        }
      } catch (error) {
        console.error('Error initializing data:', error);
        setError('Ett fel uppstod när orderinformationen skulle laddas');
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [flowData, flowType, itemId, orderReference]);

  // Render product-specific details based on flow type
  const renderProductDetails = () => {
    if (!data) return null;
    
    switch (flowType) {
      case FlowType.COURSE_BOOKING:
        return (
          <CourseConfirmationDetails 
            courseDetails={data.itemDetails}
            userInfo={data.userInfo}
          />
        );
      case FlowType.GIFT_CARD:
        return (
          <GiftCardConfirmationDetails 
            giftCardDetails={data.itemDetails}
            userInfo={data.userInfo}
          />
        );
      case FlowType.ART_PURCHASE:
        return (
          <ProductConfirmationDetails 
            productDetails={data.itemDetails}
            userInfo={data.userInfo}
          />
        );
      default:
        return (
          <Box sx={{ p: 2, bgcolor: '#f9f9f9', borderRadius: 1 }}>
            <Typography>
              Produktinformation är inte tillgänglig för denna ordertyp.
            </Typography>
          </Box>
        );
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Link href="/" passHref>
          <StyledButton onClick={handleBackToHome}>
            Tillbaka till startsidan
          </StyledButton>
        </Link>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          Ingen orderinformation hittades.
        </Alert>
        <Link href="/" passHref>
          <StyledButton onClick={handleBackToHome}>
            Tillbaka till startsidan
          </StyledButton>
        </Link>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <CheckCircleIcon color="success" sx={{ fontSize: 40, mr: 2 }} />
        <Typography variant="h6">
          {data.title}
        </Typography>
      </Box>
      
      <Alert severity="info" sx={{ mb: 4 }}>
        En bekräftelse har skickats till {data.userInfo?.email || 'din e-postadress'}. Du kan behöva kontrollera din skräppost om du inte hittar e-postmeddelandet.
      </Alert>
      
      <Paper 
        elevation={3} 
        sx={{ 
          borderRadius: 2, 
          p: { xs: 2, sm: 4 }, 
          mb: 4 
        }}
      >
        <Typography variant="h6" gutterBottom>
          Orderdetaljer
        </Typography>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          {flowType === FlowType.COURSE_BOOKING ? 'Bokningsnummer: ' : 'Ordernummer: '}
          <strong>{data.orderReference}</strong>
        </Typography>
        
        {/* Product-specific details rendered by specialized component */}
        {renderProductDetails()}
        
        <Divider sx={{ my: 3 }} />
        
        {/* Payment information section - common for all flow types */}
        <Typography variant="subtitle1" gutterBottom>
          Betalningsinformation
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PaymentIcon sx={{ mr: 1, color: 'var(--primary)' }} />
                <Typography variant="subtitle2">
                  Betalningsöversikt
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Betalningsmetod:</Typography>
                <Typography variant="body2">{getMethodDisplayName(data.paymentInfo?.payment_method || '')}</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Betalstatus:</Typography>
                <Typography variant="body2">
                  {(() => {
                    const status = String(data.paymentInfo?.status || '').toUpperCase();
                    if (status === 'PAID') {
                      return 'Genomförd';
                    } else if (status === 'CREATED') {
                      return 'Ej betald';
                    } else {
                      return 'Väntar på verifiering';
                    }
                  })()}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Datum:</Typography>
                <Typography variant="body2">{formatDate(data.paymentInfo?.payment_date || new Date().toISOString())}</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Summa:</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {flowType === FlowType.GIFT_CARD && data.itemDetails?.amount 
                    ? data.itemDetails.amount 
                    : data.paymentInfo?.amount || data.itemDetails?.price || 0} kr
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" paragraph>
            Vi har skickat en bekräftelse via e-post med alla detaljer om din {
              flowType === FlowType.COURSE_BOOKING 
                ? 'bokning' 
                : flowType === FlowType.GIFT_CARD 
                  ? 'beställning av presentkort' 
                  : 'beställning'
            }.
          </Typography>
          
          <Link href="/" passHref>
            <StyledButton onClick={handleBackToHome}>
              Tillbaka till startsidan
            </StyledButton>
          </Link>
        </Box>
      </Paper>
    </>
  );
};

export default GenericConfirmation; 