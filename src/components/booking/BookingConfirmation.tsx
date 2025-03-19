import React, { useEffect, useState } from 'react';
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

import { GenericStep, FlowType } from '../common/BookingStepper';
import GenericFlowContainer from '../common/GenericFlowContainer';
import StyledButton from '../common/StyledButton';
import Link from 'next/link';

interface BookingConfirmationProps {
  courseId: string;
}

interface UserInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  numberOfParticipants: string;
  specialRequirements?: string;
}

interface PaymentDetails {
  method: string;
  paymentReference?: string;
  paymentStatus?: string;
  swishPhone?: string;
  invoiceNumber?: string;
  invoiceDetails?: {
    address: string;
    postalCode: string;
    city: string;
    reference?: string;
  };
  bookingId?: string;
  emailSent?: boolean;
}

const BookingConfirmation: React.FC<BookingConfirmationProps> = ({ courseId }) => {
  const [courseDetail, setCourseDetail] = useState<any | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [bookingReference, setBookingReference] = useState<string>('');

  useEffect(() => {
    // Get data from localStorage
    const storedUserInfo = localStorage.getItem('userInfo');
    const storedCourseDetail = localStorage.getItem('courseDetail');
    const storedPaymentDetails = localStorage.getItem('paymentDetails');
    
    if (storedUserInfo) {
      setUserInfo(JSON.parse(storedUserInfo));
    }
    
    if (storedCourseDetail) {
      setCourseDetail(JSON.parse(storedCourseDetail));
    }
    
    if (storedPaymentDetails) {
      setPaymentDetails(JSON.parse(storedPaymentDetails));
    }
    
    // Generate a booking reference
    const timestamp = new Date().getTime().toString().slice(-6);
    const randomChars = Math.random().toString(36).substring(2, 5).toUpperCase();
    setBookingReference(`SC-${randomChars}-${timestamp}`);
    
    // In a real application, you would make an API call to store the booking in the database
  }, []);

  const getMethodDisplayName = (method: string) => {
    switch (method) {
      case 'credit_card':
        return 'Kreditkort';
      case 'invoice':
        return 'Faktura';
      default:
        return method;
    }
  };

  // Calculate price based on number of participants
  const calculatePrice = () => {
    if (!userInfo || !courseDetail || !courseDetail.price) return 0;
    const numParticipants = parseInt(userInfo.numberOfParticipants) || 1;
    return courseDetail.price * numParticipants;
  };

  return (
    <GenericFlowContainer 
      activeStep={3} 
      flowType={FlowType.COURSE_BOOKING}
      title="Bokningsbekräftelse"
      subtitle="Tack för din bokning! Nedan hittar du information om din bokning."
      showBackButton={false}
      backButtonLabel="Tillbaka till startsidan"
      backUrl="/"
    >
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
          Bokningsnummer: <strong>{bookingReference}</strong>
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
                
                {courseDetail.date && (
                  <ListItem disableGutters>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <EventIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={`Datum: ${courseDetail.date}`} />
                  </ListItem>
                )}
                
                {courseDetail.time && (
                  <ListItem disableGutters>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <AccessTimeIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={`Tid: ${courseDetail.time}`} />
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
                  <ListItem disableGutters sx={{ mt: 1 }}>
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
        
        {paymentDetails && (
          <List dense>
            <ListItem disableGutters>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {paymentDetails.method === 'credit_card' ? (
                  <PaymentIcon fontSize="small" />
                ) : (
                  <ReceiptIcon fontSize="small" />
                )}
              </ListItemIcon>
              <ListItemText primary={`Betalningsmetod: ${getMethodDisplayName(paymentDetails.method)}`} />
            </ListItem>
            
            <ListItem disableGutters>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <ReceiptIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary={`Totalt belopp: ${calculatePrice()} kr`}
                secondary="Inklusive moms"
              />
            </ListItem>
          </List>
        )}
        
        {paymentDetails && paymentDetails.method === 'invoice' && (
          <>
            <Alert severity="info" sx={{ mt: 2 }}>
              En faktura har skickats till din e-postadress: <strong>{userInfo?.email}</strong>. Vänligen betala inom 10 dagar från fakturadatum.
            </Alert>
            
            <Box sx={{ mt: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Fakturainformation
              </Typography>
              <List dense>
                {paymentDetails.invoiceNumber && (
                  <ListItem disableGutters>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <ReceiptIcon fontSize="small" sx={{ color: 'var(--primary)' }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary={`Fakturanummer: ${paymentDetails.invoiceNumber}`} 
                    />
                  </ListItem>
                )}
                
                {paymentDetails.invoiceDetails && (
                  <ListItem disableGutters>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <HomeIcon fontSize="small" sx={{ color: 'var(--primary)' }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary={`Fakturerad till: ${paymentDetails.invoiceDetails.address}, ${paymentDetails.invoiceDetails.postalCode} ${paymentDetails.invoiceDetails.city}`} 
                    />
                  </ListItem>
                )}
                
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <CreditCardIcon fontSize="small" sx={{ color: 'var(--primary)' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary={`Betalningsvillkor: 10 dagar`} 
                  />
                </ListItem>
              </List>
            </Box>
          </>
        )}
      </Paper>
      
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography variant="body2" paragraph>
          Om du har några frågor, vänligen kontakta oss på <strong>eva@studioclay.se</strong> eller ring <strong>079-312 06 05</strong>.
        </Typography>
        
        <StyledButton 
          component={Link} 
          href="/"
          size="large"
        >
          Tillbaka till startsidan
        </StyledButton>
      </Box>
    </GenericFlowContainer>
  );
};

export default BookingConfirmation; 