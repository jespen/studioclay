'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  Alert
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import PeopleIcon from '@mui/icons-material/People';
import PaymentIcon from '@mui/icons-material/Payment';
import EventIcon from '@mui/icons-material/Event';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ReceiptIcon from '@mui/icons-material/Receipt';
import HomeIcon from '@mui/icons-material/Home';
import CreditCardIcon from '@mui/icons-material/CreditCard';

import StyledButton from '../common/StyledButton';
import Link from 'next/link';
import { FlowStateData } from '../common/FlowStepWrapper';
import { cleanupCheckoutFlow } from '@/utils/dataStorage';
import { 
  CourseDetail, 
  UserInfo, 
  PaymentInfo, 
  generateBookingReference, 
  getUserInfo, 
  getPaymentInfo
} from '@/utils/dataFetcher';

interface BookingConfirmationProps {
  courseId: string;
  flowData?: FlowStateData;
}

const BookingConfirmation: React.FC<BookingConfirmationProps> = ({ courseId, flowData }) => {
  const [courseDetail, setCourseDetail] = useState<CourseDetail | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [bookingReference, setBookingReference] = useState<string>('');

  useEffect(() => {
    // Use flowData if available (preferred and more efficient)
    if (flowData) {
      setCourseDetail(flowData.itemDetails as CourseDetail);
      setUserInfo(flowData.userInfo as UserInfo);
      setPaymentInfo(flowData.paymentInfo as PaymentInfo);
      
      // Generate a booking reference if not already in payment info
      if (flowData.paymentInfo && flowData.paymentInfo.reference) {
        setBookingReference(flowData.paymentInfo.reference);
      } else {
        setBookingReference(generateBookingReference());
      }
      
      return;
    }
    
    // Fallback to utility functions if flowData is not available
    setCourseDetail(null);
    setUserInfo(getUserInfo());
    setPaymentInfo(getPaymentInfo());
    
    // Generate a booking reference if needed
    const reference = getPaymentInfo()?.reference || generateBookingReference();
    setBookingReference(reference);
  }, [flowData]);

  // Handle going back to home page and clearing data
  const handleBackToHome = () => {
    // Clear all flow and localStorage data
    cleanupCheckoutFlow();
  };

  const getMethodDisplayName = (method: string) => {
    console.log('BookingConfirmation: payment method received:', method, 'paymentInfo:', paymentInfo);
    switch (method.toLowerCase()) {
      case 'swish':
        return 'Swish';
      case 'credit_card':
        return 'Kreditkort';
      case 'invoice':
        return 'Faktura';
      case 'unknown':
      case '':
      case undefined:
        return 'Faktura'; // Default till Faktura för okända värden
      default:
        console.warn('BookingConfirmation: unknown payment method:', method);
        return 'Faktura'; // Default till Faktura istället för att visa okända värden
    }
  };

  // Calculate price based on number of participants
  const calculatePrice = () => {
    if (!userInfo || !courseDetail || !courseDetail.price) return 0;
    const numParticipants = parseInt(userInfo.numberOfParticipants) || 1;
    return courseDetail.price * numParticipants;
  };

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
      return dateString;
    }
  };

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <CheckCircleIcon color="success" sx={{ fontSize: 40, mr: 2 }} />
        <Typography variant="h6">
          Din bokning är bekräftad!
        </Typography>
      </Box>
      
      <Alert severity="info" sx={{ mb: 4 }}>
        En bokningsbekräftelse har skickats till din e-postadress. Du kan behöva kontrollera din skräppost om du inte hittar e-postmeddelandet.
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
          Bokningsdetaljer
        </Typography>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          Bokningsnummer: <strong>{paymentInfo?.reference || bookingReference}</strong>
        </Typography>
        
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Kursinformation
            </Typography>
            
            {courseDetail && (
              <List dense>
                <ListItem disableGutters>
                  <ListItemText 
                    primary={courseDetail.title} 
                    primaryTypographyProps={{ fontWeight: 'bold' }} 
                  />
                </ListItem>
                
                {courseDetail.start_date && (
                  <ListItem disableGutters>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <EventIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={`Datum: ${formatDate(courseDetail.start_date)}`} />
                  </ListItem>
                )}
                
                {courseDetail.duration_minutes && (
                  <ListItem disableGutters>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <AccessTimeIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={`Längd: ${courseDetail.duration_minutes} minuter`} />
                  </ListItem>
                )}
                
                {courseDetail.location && (
                  <ListItem disableGutters>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <LocationOnIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={`Plats: ${courseDetail.location}`} />
                  </ListItem>
                )}
              </List>
            )}
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Personuppgifter
            </Typography>
            
            {userInfo && (
              <List dense>
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <PersonIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={`${userInfo.firstName} ${userInfo.lastName}`} />
                </ListItem>
                
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <EmailIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={userInfo.email} />
                </ListItem>
                
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <PhoneIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={userInfo.phone} />
                </ListItem>
                
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <PeopleIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={`Antal deltagare: ${userInfo.numberOfParticipants}`} />
                </ListItem>
                
                {userInfo.specialRequirements && (
                  <ListItem disableGutters>
                    <ListItemText 
                      primary="Särskilda önskemål:" 
                      secondary={userInfo.specialRequirements} 
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
                    primary="Betalningsmetod:" 
                    secondary={getMethodDisplayName(paymentInfo?.payment_method || 'unknown')} 
                  />
                </ListItem>
                
                <ListItem disableGutters>
                  <ListItemText 
                    primary="Status:" 
                    secondary={paymentInfo?.status === 'completed' ? 'Genomförd' : 'Väntar på verifiering'} 
                  />
                </ListItem>
                
                <ListItem disableGutters>
                  <ListItemText 
                    primary="Betaldatum:" 
                    secondary={paymentInfo?.updated_at ? formatDate(paymentInfo.updated_at) : (paymentInfo?.created_at ? formatDate(paymentInfo.created_at) : new Date().toLocaleDateString())} 
                  />
                </ListItem>
                
                <ListItem disableGutters>
                  <ListItemText 
                    primary="Summa:" 
                    secondary={`${paymentInfo?.amount || calculatePrice()} kr`} 
                  />
                </ListItem>
              </List>
            </Paper>
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" paragraph>
            Vi har skickat en bekräftelse via e-post med alla detaljer om din bokning.
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

export default BookingConfirmation; 