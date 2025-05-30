import React from 'react';
import { useRouter } from 'next/navigation';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Chip, 
  Divider, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  Container,
  Alert,
  Paper,
  CircularProgress
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PeopleIcon from '@mui/icons-material/People';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonIcon from '@mui/icons-material/Person';
import CategoryIcon from '@mui/icons-material/Category';

import { GenericStep, FlowType } from '../common/BookingStepper';
import BackToCourses from '../common/BackToCourses';
import StyledButton from '../common/StyledButton';
import { CourseDetail, hasMinimalCourseData } from '@/utils/dataFetcher';
import { fetchCourseWithCache } from '@/utils/apiCache';
import '@/styles/richText.css';
import { getNextStepUrl } from '@/utils/flowNavigation';
import { setItemDetails } from '@/utils/dataStorage';

interface CourseDetailsProps {
  courseId: string;
  onNext?: (data: any) => void;
  onBack?: () => void;
}

interface Instructor {
  id: string;
  name: string;
  email?: string;
  bio?: string;
  photo_url?: string;
  created_at?: string;
  updated_at?: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

// Function to render rich text content safely
const RichTextContent = ({ content }: { content: string }) => {
  return (
    <div className="rich-text-content" dangerouslySetInnerHTML={{ __html: content }} />
  );
};

const CourseDetails: React.FC<CourseDetailsProps> = ({ courseId, onNext, onBack }) => {
  const router = useRouter();
  const [courseDetail, setCourseDetail] = React.useState<CourseDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [hasLimitedData, setHasLimitedData] = React.useState(false);

  // Load course data with cache support
  React.useEffect(() => {
    let isMounted = true;
    
    const loadCourseDetails = async () => {
      try {
        setLoading(true);
        
        // Use the cached fetch function
        const response = await fetchCourseWithCache(courseId);
        const course = response.course;
        
        // Only update state if component is still mounted
        if (isMounted) {
          setCourseDetail(course);
          setHasLimitedData(hasMinimalCourseData(course));
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading course details:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load course details');
          setLoading(false);
        }
      }
    };

    loadCourseDetails();
    
    // Clean up function
    return () => {
      isMounted = false;
    };
  }, [courseId]);

  const handleContinue = () => {
    // Make sure we save the course details to flow storage before continuing
    if (courseDetail) {
      // Save course details to flow storage
      setItemDetails(courseDetail);
      
      // Now proceed with navigation
      if (onNext) {
        onNext(courseDetail);
      } else {
        // Legacy navigation as fallback
        const nextUrl = getNextStepUrl(GenericStep.ITEM_SELECTION, FlowType.COURSE_BOOKING, courseId);
        if (nextUrl) {
          router.push(nextUrl);
        }
      }
    }
  };

  const handleBackToHome = () => {
    console.log('handleBackToHome called, onBack exist:', !!onBack);
    if (onBack) {
      console.log('Using onBack callback');
      onBack();
    } else {
      console.log('Using router fallback to navigate to home');
      // Legacy navigation as fallback
      router.push('/');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !courseDetail) {
    return (
      <Container maxWidth="lg" sx={{ pt: 4, pb: 6 }}>
        <Typography color="error">{error || 'Kunde inte hitta kursinformation'}</Typography>
        <BackToCourses position="bottom" marginY={4} />
      </Container>
    );
  }

  const availableSpots = courseDetail.availableSpots !== undefined 
    ? courseDetail.availableSpots 
    : (courseDetail.max_participants ? courseDetail.max_participants - (courseDetail.current_participants || 0) : 0);
  
  const isFullyBooked = availableSpots <= 0;

  // Format dates properly
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Kontakta oss för information';
    
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
      return dateString || 'Kontakta oss för information';
    }
  };

  // Format duration
  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'Kontakta oss för information';
    
    if (minutes < 60) {
      return `${minutes} minuter`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return hours === 1 ? '1 timme' : `${hours} timmar`;
    }
    
    return `${hours} timme${hours > 1 ? 'r' : ''} och ${remainingMinutes} minuter`;
  };

  return (
    <>
      <Typography variant="h4" component="h1" align="center" gutterBottom>
        {courseDetail?.title || 'Laddar kurs...'}
      </Typography>
      
      {/* Add category description below title and above card */}
      {courseDetail?.category && typeof courseDetail.category === 'object' && courseDetail.category.description && (
        <Typography 
          variant="subtitle1" 
          align="center" 
          sx={{ 
            mb: 3, 
            fontStyle: 'italic', 
            color: 'text.secondary',
            maxWidth: '800px',
            mx: 'auto'
          }}
        >
          {courseDetail.category.description}
        </Typography>
      )}
      
      <Paper 
        elevation={3} 
        sx={{ 
          borderRadius: 2, 
          p: { xs: 2, sm: 4 }, 
          mt: 4 
        }}
      >
        {hasLimitedData && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Vi håller på att ladda all kursinformation. Vissa detaljer kan saknas.
          </Alert>
        )}
        
        {/* Course description */}
        {courseDetail.rich_description ? (
          <Box sx={{ mb: 4 }}>
            <RichTextContent content={courseDetail.rich_description} />
          </Box>
        ) : (
          <Typography variant="body1" paragraph>
            {courseDetail.description || 'Ingen beskrivning tillgänglig.'}
          </Typography>
        )}
        
        <Divider sx={{ my: 3 }} />
        
        {/* Course details */}
        <Typography variant="h6" gutterBottom>
          Kursdetaljer
        </Typography>
        
        <List sx={{ mb: 4 }}>
          <ListItem disableGutters>
            <ListItemIcon>
              <EventIcon sx={{ color: 'var(--primary)' }} />
            </ListItemIcon>
            <ListItemText 
              primary="Startdatum" 
              secondary={formatDate(courseDetail.start_date)} 
            />
          </ListItem>
          
          {/* <ListItem disableGutters>
            <ListItemIcon>
              <AccessTimeIcon sx={{ color: 'var(--primary)' }} />
            </ListItemIcon>
            <ListItemText 
              primary="Längd" 
              secondary={formatDuration(courseDetail.duration_minutes)} 
            />
          </ListItem> */}
          
          <ListItem disableGutters>
            <ListItemIcon>
              <LocationOnIcon sx={{ color: 'var(--primary)' }} />
            </ListItemIcon>
            <ListItemText 
              primary="Plats" 
              secondary={courseDetail.location || 'Studio Clay, Norrtullsgatan 65'} 
            />
          </ListItem>
          
          <ListItem disableGutters>
            <ListItemIcon>
              <PeopleIcon sx={{ color: 'var(--primary)' }} />
            </ListItemIcon>
            <ListItemText 
              primary="Deltagare" 
              secondary={`${courseDetail.current_participants || 0} av ${courseDetail.max_participants || 0} platser bokade`} 
            />
          </ListItem>
          
          {courseDetail.instructor && (
            <ListItem disableGutters>
              <ListItemIcon>
                <PersonIcon sx={{ color: 'var(--primary)' }} />
              </ListItemIcon>
              <ListItemText 
                primary="Instruktör" 
                secondary={
                  typeof courseDetail.instructor === 'object' && courseDetail.instructor !== null
                    ? courseDetail.instructor.name || 'Ingen instruktör angiven'
                    : courseDetail.instructor
                } 
              />
            </ListItem>
          )}
          
          {courseDetail.category && (
            <ListItem disableGutters>
              <ListItemIcon>
                <CategoryIcon sx={{ color: 'var(--primary)' }} />
              </ListItemIcon>
              <ListItemText 
                primary="Kategori" 
                secondary={
                  typeof courseDetail.category === 'object' && courseDetail.category !== null
                    ? courseDetail.category.name || 'Ingen kategori angiven'
                    : courseDetail.category
                } 
              />
            </ListItem>
          )}
        </List>
        
        <Divider sx={{ my: 3 }} />
        
        {/* Price information */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Kurspris
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 1 }}>
            <Typography variant="h4" sx={{ color: 'var(--primary)', mr: 1 }}>
              {courseDetail.price || 'Kontakta oss'} {courseDetail.price ? 'kr' : ''}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Inklusive moms, material och verktyg
            </Typography>
          </Box>
          
          {!isFullyBooked && availableSpots <= 3 && availableSpots > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Endast {availableSpots} {availableSpots === 1 ? 'plats' : 'platser'} kvar!
            </Alert>
          )}
          
          {isFullyBooked && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Denna kurs är tyvärr fullbokad.
            </Alert>
          )}
        </Box>
        
        {/* Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <StyledButton 
          secondary
            onClick={handleBackToHome}
            variant="outlined"
          >
            Tillbaka
          </StyledButton>
          
          <StyledButton 
            onClick={handleContinue}
            disabled={isFullyBooked}
          >
            {isFullyBooked 
              ? 'Kursen är fullbokad' 
              : 'Fortsätt till Dina uppgifter'}
          </StyledButton>
        </Box>
        
        {isFullyBooked && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <StyledButton 
              secondary
              onClick={() => router.push(`/waitlist/${courseId}`)}
            >
              Skriv upp mig på väntelista
            </StyledButton>
          </Box>
        )}
      </Paper>
    </>
  );
};

export default CourseDetails; 