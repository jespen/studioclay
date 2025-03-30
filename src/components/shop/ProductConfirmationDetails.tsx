import React from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import ArtTrackIcon from '@mui/icons-material/ArtTrack';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import HomeIcon from '@mui/icons-material/Home';

interface ProductConfirmationDetailsProps {
  productDetails: any;
  userInfo: any;
}

const ProductConfirmationDetails: React.FC<ProductConfirmationDetailsProps> = ({ 
  productDetails, 
  userInfo 
}) => {
  return (
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

            {userInfo.address && (
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
  );
};

export default ProductConfirmationDetails; 