import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Divider, 
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Container
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EmailIcon from '@mui/icons-material/Email';
import EventIcon from '@mui/icons-material/Event';
import PaymentIcon from '@mui/icons-material/Payment';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

import BookingStepper, { BookingStep } from '../common/BookingStepper';
import StyledButton from '../common/StyledButton';

interface BookingConfirmationProps {
  courseId: string;
}

// Mock course data - will be replaced with API call
const mockCourseDetail = {
  id: '1',
  title: 'Helgkurs i Keramik',
  price: 1995,
  startDate: '2023-06-10',
  endDate: '2023-06-11',
  location: 'Studio Clay, Vasagatan 15, Göteborg',
};

interface UserInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  [key: string]: any;
}

interface PaymentInfo {
  method: 'swish' | 'invoice';
  amount: number;
  timestamp: string;
  [key: string]: any;
}

const BookingConfirmation: React.FC<BookingConfirmationProps> = ({ courseId }) => {
  const router = useRouter();
  const [courseDetail, setCourseDetail] = useState(mockCourseDetail);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [bookingNumber, setBookingNumber] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load stored information
    const loadStoredInfo = () => {
      try {
        const storedUserInfo = localStorage.getItem('userInfo');
        const storedPaymentInfo = localStorage.getItem('paymentInfo');
        
        if (storedUserInfo) {
          setUserInfo(JSON.parse(storedUserInfo));
        }
        
        if (storedPaymentInfo) {
          setPaymentInfo(JSON.parse(storedPaymentInfo));
        }
        
        // Generate a random booking number for demo
        setBookingNumber(`SC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`);
        
        // In a real implementation, fetch booking details from API
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load booking information', error);
        setIsLoading(false);
      }
    };
    
    loadStoredInfo();
  }, [courseId]);

  const handleBackToHome = () => {
    // Clear localStorage when going back to home
    localStorage.removeItem('userInfo');
    localStorage.removeItem('paymentInfo');
    
    router.push('/');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sv-SE');
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ pt: 4, pb: 6 }} className="hide-navigation">
        <Typography>Laddar bekräftelse...</Typography>
      </Container>
    );
  }

  if (!userInfo || !paymentInfo) {
    return (
      <Container maxWidth="lg" sx={{ pt: 4, pb: 6 }} className="hide-navigation">
        <Alert severity="error" sx={{ mb: 4 }}>
          Kunde inte hitta bokningsinformation. Något gick fel.
        </Alert>
        <StyledButton onClick={handleBackToHome}>
          Tillbaka till startsidan
        </StyledButton>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ pt: 4, pb: 6 }} className="hide-navigation">
      <BookingStepper activeStep={BookingStep.CONFIRMATION} />
      
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <CheckCircleIcon 
          sx={{ fontSize: 80, mb: 2, color: 'var(--accent)' }} 
        />
        <Typography variant="h4" component="h1" gutterBottom>
          Tack för din bokning!
        </Typography>
        <Typography variant="body1">
          Din bokning är bekräftad och en bekräftelse har skickats till din e-post.
        </Typography>
      </Box>
      
      <Paper 
        elevation={3} 
        sx={{ 
          borderRadius: 2, 
          p: { xs: 2, sm: 4 },
          mb: 4
        }}
      >
        <Grid container spacing={4}>
          <Grid item xs={12}>
            <Typography variant="h5" gutterBottom>
              Bokningsnummer: {bookingNumber}
            </Typography>
            <Divider sx={{ my: 2 }} />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Kursinformation
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <EventIcon sx={{ color: 'var(--primary)' }} />
                </ListItemIcon>
                <ListItemText 
                  primary={courseDetail.title} 
                  secondary={`${formatDate(courseDetail.startDate)} - ${formatDate(courseDetail.endDate)}`} 
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <AccessTimeIcon sx={{ color: 'var(--primary)' }} />
                </ListItemIcon>
                <ListItemText 
                  primary="Tid" 
                  secondary="10:00 - 16:00" 
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <PaymentIcon sx={{ color: 'var(--primary)' }} />
                </ListItemIcon>
                <ListItemText 
                  primary="Betalning" 
                  secondary={`${courseDetail.price} kr via ${paymentInfo.method === 'swish' ? 'Swish' : 'Faktura'}`} 
                />
              </ListItem>
            </List>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Dina uppgifter
            </Typography>
            <List>
              <ListItem>
                <ListItemText 
                  primary={`${userInfo.firstName} ${userInfo.lastName}`} 
                  secondary={userInfo.phone} 
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <EmailIcon sx={{ color: 'var(--primary)' }} />
                </ListItemIcon>
                <ListItemText primary={userInfo.email} />
              </ListItem>
            </List>
          </Grid>
          
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              Vad händer nu?
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon sx={{ color: 'var(--accent)' }} />
                </ListItemIcon>
                <ListItemText primary="En bekräftelse har skickats till din e-post" />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon sx={{ color: 'var(--accent)' }} />
                </ListItemIcon>
                <ListItemText 
                  primary={
                    paymentInfo.method === 'swish' 
                      ? 'Din betalning via Swish har registrerats' 
                      : 'En faktura har skickats till din e-post'
                  } 
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon sx={{ color: 'var(--accent)' }} />
                </ListItemIcon>
                <ListItemText primary="Du kommer få en påminnelse via e-post dagen innan kursen" />
              </ListItem>
            </List>
          </Grid>
        </Grid>
      </Paper>
      
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <StyledButton onClick={handleBackToHome}>
          Tillbaka till startsidan
        </StyledButton>
      </Box>
    </Container>
  );
};

export default BookingConfirmation; 