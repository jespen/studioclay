'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import PaymentIcon from '@mui/icons-material/Payment';
import ArtTrackIcon from '@mui/icons-material/ArtTrack';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ReceiptIcon from '@mui/icons-material/Receipt';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import HomeIcon from '@mui/icons-material/Home';

import StyledButton from '../common/StyledButton';
import Link from 'next/link';
import { FlowStateData } from '../common/FlowStepWrapper';
import { cleanupCheckoutFlow } from '@/utils/dataStorage';

interface ShopConfirmationProps {
  flowData?: FlowStateData;
  orderReference?: string;
}

interface ProductDetails {
  id: string;
  title: string;
  price: number;
  description: string;
  image: string;
}

const ShopConfirmation: React.FC<ShopConfirmationProps> = ({ flowData, orderReference }) => {
  const params = useParams<{ id?: string }>();
  const productId = params?.id as string;
  const router = useRouter();
  
  const [productDetails, setProductDetails] = useState<ProductDetails | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [orderRef, setOrderRef] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch order information from API
  const fetchOrderByReference = async (reference: string) => {
    try {
      console.log('Fetching order by reference:', reference);
      const response = await fetch(`/api/art-orders/${reference}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch order: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch order data');
      }
      
      console.log('Received order data:', data);
      
      // Set order information
      setOrderRef(data.order.reference);
      
      // Set product details
      if (data.product) {
        setProductDetails({
          id: data.product.id,
          title: data.product.title,
          price: data.product.price,
          description: data.product.description,
          image: data.product.image
        });
      }
      
      // Set user info
      if (data.customer) {
        const customerInfo = data.customer;
        const metaUserInfo = data.meta?.user_info || {};
        
        // Combine customer data with metadata user info for complete user details
        setUserInfo({
          firstName: metaUserInfo.firstName || customerInfo.name.split(' ')[0],
          lastName: metaUserInfo.lastName || customerInfo.name.split(' ').slice(1).join(' '),
          email: customerInfo.email,
          phone: customerInfo.phone,
          // Add invoice details if available
          address: metaUserInfo.address,
          postalCode: metaUserInfo.postalCode,
          city: metaUserInfo.city
        });
      }
      
      // Set payment info
      setPaymentInfo({
        status: 'Bekräftad',
        payment_method: data.order.payment_method,
        amount: data.order.amount,
        payment_date: data.order.created_at
      });
      
      return true;
    } catch (error) {
      console.error('Error fetching order:', error);
      setError('Kunde inte hämta orderinformation');
      return false;
    }
  };

  useEffect(() => {
    console.log('ShopConfirmation mounted with flowData:', flowData, 'orderReference:', orderReference);
    
    const initializeData = async () => {
      try {
        // If we have a direct order reference from URL, use it first
        if (orderReference) {
          console.log('Using provided order reference:', orderReference);
          await fetchOrderByReference(orderReference);
        }
        // If we have flow data, use it directly
        else if (flowData && flowData.itemDetails) {
          console.log('Using flowData for order information');
          
          // Set user and payment info first
          setUserInfo(flowData.userInfo);
          
          // Get payment info from the correct place in flowData
          const payment = flowData.paymentInfo || {};
          setPaymentInfo({
            ...payment,
            status: 'Bekräftad',
            amount: payment.amount || flowData.itemDetails?.price || 0,
            payment_method: payment.payment_method || 'unknown',
            payment_date: payment.payment_date || new Date().toISOString()
          });
          setOrderRef(payment.reference || '');

          // Fetch product details
          try {
            console.log('Fetching product details for ID:', flowData.itemDetails.id);
            const response = await fetch(`/api/products/${flowData.itemDetails.id}`);
            
            if (!response.ok) {
              throw new Error(`Failed to fetch product details: ${response.statusText}`);
            }
            
            const product = await response.json();
            console.log('Received product details:', product);
            setProductDetails(product);
          } catch (error) {
            console.error('Error fetching product details:', error);
            setError('Kunde inte hämta produktinformation');
          }
        } 
        // If no flow data available but we have a reference from payment 
        else if (flowData?.paymentInfo?.reference) {
          console.log('Using payment reference to fetch order data:', flowData.paymentInfo.reference);
          await fetchOrderByReference(flowData.paymentInfo.reference);
        }
        // If we have a product ID, we need to try to fetch from URL (for cases of page reload)
        else if (productId) {
          console.log('No flowData, trying to fetch latest order for product:', productId);
          // In a real implementation, we would fetch the most recent order for this product
          // But for now, we'll show an error
          setError('För att visa orderinformation, använd länken från orderbekräftelsen');
        }
        else {
          console.error('No order data available');
          setError('Ingen orderinformation tillgänglig');
        }
      } catch (error) {
        console.error('Error in initializeData:', error);
        setError('Ett fel uppstod när orderinformationen skulle laddas');
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [flowData, productId, orderReference]);

  const handleBackToHome = () => {
    cleanupCheckoutFlow();
  };

  const getMethodDisplayName = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'swish':
        return 'Swish';
      case 'invoice':
        return 'Faktura';
      default:
        return 'Direktbetalning';
    }
  };

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

  // Display debug data source info in development mode
  const getDataSourceInfo = () => {
    if (process.env.NODE_ENV !== 'development') return null;
    
    let source = 'Unknown';
    let details = '';
    
    if (orderReference) {
      source = 'URL Reference Parameter';
      details = `Order reference: ${orderReference}`;
    } else if (flowData?.paymentInfo?.reference) {
      source = 'Flow Data (Payment Reference)';
      details = `Payment reference: ${flowData.paymentInfo.reference}`;
    } else if (flowData?.itemDetails) {
      source = 'Flow Data (Item Details)';
      details = `Product ID: ${flowData.itemDetails.id}`;
    } else if (productId) {
      source = 'URL Product ID';
      details = `Product ID: ${productId}`;
    }
    
    return (
      <Box sx={{ mb: 2, p: 1, border: '1px dashed #ccc', fontSize: '12px', color: '#666' }}>
        <strong>Debug:</strong> Data source: {source}<br />
        {details}
      </Box>
    );
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

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <CheckCircleIcon color="success" sx={{ fontSize: 40, mr: 2 }} />
        <Typography variant="h6">
          Tack för ditt köp!
        </Typography>
      </Box>
      
      {process.env.NODE_ENV === 'development' && getDataSourceInfo()}
      
      <Alert severity="info" sx={{ mb: 4 }}>
        En orderbekräftelse har skickats till din e-postadress {userInfo?.email}. Du kan behöva kontrollera din skräppost om du inte hittar e-postmeddelandet.
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
          Ordernummer: <strong>{orderRef}</strong>
        </Typography>
        
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Produktinformation
            </Typography>
            
            {productDetails && (
              <List dense>
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <ArtTrackIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={productDetails.title} 
                    primaryTypographyProps={{ fontWeight: 'bold' }}
                    secondary={productDetails.description}
                  />
                </ListItem>
                
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <LocationOnIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Upphämtningsplats" 
                    secondary="Studio Clay, Norrtullsgatan 65"
                  />
                </ListItem>
                
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <LocalShippingIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Upphämtning" 
                    secondary="Vi kontaktar dig när produkten är redo att hämtas"
                  />
                </ListItem>

                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <AttachMoneyIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Pris" 
                    secondary={`${productDetails.price} kr`}
                  />
                </ListItem>
              </List>
            )}
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Dina uppgifter
            </Typography>
            
            {userInfo && (
              <List dense>
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <PersonIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Namn"
                    secondary={`${userInfo.firstName} ${userInfo.lastName}`} 
                  />
                </ListItem>
                
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <EmailIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="E-post"
                    secondary={userInfo.email} 
                  />
                </ListItem>
                
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <PhoneIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Telefon"
                    secondary={userInfo.phone} 
                  />
                </ListItem>

                {paymentInfo?.payment_method === 'invoice' && userInfo.address && (
                  <ListItem disableGutters>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <HomeIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Fakturaadress"
                      secondary={`${userInfo.address}, ${userInfo.postalCode} ${userInfo.city}`} 
                    />
                  </ListItem>
                )}
              </List>
            )}
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 3 }} />
        
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
              
              <List dense>
                <ListItem disableGutters>
                  <ListItemText 
                    primary="Betalningsmetod" 
                    secondary={getMethodDisplayName(paymentInfo?.payment_method)} 
                  />
                </ListItem>
                
                <ListItem disableGutters>
                  <ListItemText 
                    primary="Status" 
                    secondary={paymentInfo?.status || 'Bekräftad'}
                  />
                </ListItem>
                
                <ListItem disableGutters>
                  <ListItemText 
                    primary="Betaldatum" 
                    secondary={formatDate(paymentInfo?.payment_date)} 
                  />
                </ListItem>
                
                <ListItem disableGutters>
                  <ListItemText 
                    primary="Summa" 
                    secondary={`${paymentInfo?.amount || productDetails?.price || 0} kr`} 
                  />
                </ListItem>
              </List>
            </Paper>
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" paragraph>
            Vi har skickat en orderbekräftelse via e-post med alla detaljer om ditt köp.
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

export default ShopConfirmation; 