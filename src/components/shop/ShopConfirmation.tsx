'use client';

import React, { useEffect } from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemIcon, ListItemText, Divider, Alert } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonIcon from '@mui/icons-material/Person';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import EmailIcon from '@mui/icons-material/Email';
import LocalPhoneIcon from '@mui/icons-material/LocalPhone';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import StyledButton from '../common/StyledButton';
import { useRouter } from 'next/navigation';
import { getAllFlowData, clearFlowData } from '@/utils/flowStorage';
import { Product } from './types';

interface ShopConfirmationProps {
  productId: string;
}

const ShopConfirmation: React.FC<ShopConfirmationProps> = ({ productId }) => {
  const router = useRouter();
  const [flowData, setFlowData] = React.useState<any>(null);
  
  useEffect(() => {
    const data = getAllFlowData();
    setFlowData(data);
    
    // Clear flow data after loading it (to prevent reusing it if user refreshes)
    clearFlowData();
  }, []);

  const handleBackToShop = () => {
    router.push('/');
  };

  if (!flowData || !flowData.itemDetails || !flowData.userInfo) {
    return (
      <Paper 
        elevation={3} 
        sx={{ 
          borderRadius: 2, 
          p: { xs: 2, sm: 4 }, 
          mt: 4 
        }}
      >
        <Typography variant="h5" gutterBottom align="center">
          Tack för ditt köp
        </Typography>
        
        <Box sx={{ my: 4, textAlign: 'center' }}>
          <CheckCircleIcon color="success" sx={{ fontSize: 64 }} />
        </Box>
        
        <Alert severity="success" sx={{ mb: 3 }}>
          Din order har registrerats. Kontakta oss om du har några frågor.
        </Alert>
        
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <StyledButton onClick={handleBackToShop}>
            <ArrowBackIcon sx={{ mr: 1 }} />
            Tillbaka till butiken
          </StyledButton>
        </Box>
      </Paper>
    );
  }

  const product = flowData.itemDetails as Product;
  const userInfo = flowData.userInfo;

  return (
    <>
      <Typography variant="h4" component="h1" align="center" gutterBottom>
        Tack för ditt köp!
      </Typography>
      
      <Paper 
        elevation={3} 
        sx={{ 
          borderRadius: 2, 
          p: { xs: 2, sm: 4 }, 
          mt: 4 
        }}
      >
        <Box sx={{ my: 2, textAlign: 'center' }}>
          <CheckCircleIcon color="success" sx={{ fontSize: 64 }} />
        </Box>
        
        <Typography variant="h5" gutterBottom align="center">
          Din beställning är bekräftad
        </Typography>
        
        <Alert severity="info" sx={{ my: 3 }}>
          Du kan hämta din produkt på Studio Clay, Norrtullsgatan 65. Vi kommer att kontakta dig när produkten är redo att hämtas.
        </Alert>
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="h6" gutterBottom>
          Orderdetaljer
        </Typography>
        
        <List disablePadding>
          <ListItem>
            <ListItemIcon>
              <ShoppingCartIcon sx={{ color: 'var(--primary)' }} />
            </ListItemIcon>
            <ListItemText 
              primary="Produkt" 
              secondary={product.title} 
            />
            <Typography variant="body2">
              {product.price} kr
            </Typography>
          </ListItem>
          
          <Divider sx={{ my: 2 }} />
          
          <ListItem>
            <ListItemIcon>
              <PersonIcon sx={{ color: 'var(--primary)' }} />
            </ListItemIcon>
            <ListItemText 
              primary="Namn" 
              secondary={`${userInfo.firstName} ${userInfo.lastName}`} 
            />
          </ListItem>
          
          <ListItem>
            <ListItemIcon>
              <EmailIcon sx={{ color: 'var(--primary)' }} />
            </ListItemIcon>
            <ListItemText 
              primary="E-post" 
              secondary={userInfo.email} 
            />
          </ListItem>
          
          <ListItem>
            <ListItemIcon>
              <LocalPhoneIcon sx={{ color: 'var(--primary)' }} />
            </ListItemIcon>
            <ListItemText 
              primary="Telefon" 
              secondary={userInfo.phone} 
            />
          </ListItem>
        </List>
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="body1" paragraph>
          Vi har skickat en orderbekräftelse till din e-post. Om du har några frågor, vänligen kontakta oss på info@studioclay.se.
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <StyledButton onClick={handleBackToShop}>
            <ArrowBackIcon sx={{ mr: 1 }} />
            Tillbaka till butiken
          </StyledButton>
        </Box>
      </Paper>
    </>
  );
};

export default ShopConfirmation; 