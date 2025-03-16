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
  Alert
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PeopleIcon from '@mui/icons-material/People';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonIcon from '@mui/icons-material/Person';
import CategoryIcon from '@mui/icons-material/Category';

import BookingStepper, { BookingStep } from '../common/BookingStepper';
import BackToCourses from '../common/BackToCourses';
import StyledButton from '../common/StyledButton';
import '@/styles/richText.css';

interface CourseDetailsProps {
  courseId: string;
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

interface CourseDetail {
  id: string;
  title: string;
  description?: string;
  rich_description?: string;
  start_date?: string;
  end_date?: string;
  duration_minutes?: number;
  location?: string;
  price?: number;
  max_participants?: number;
  current_participants?: number;
  features?: string[];
  image_url?: string;
  category?: string | Category;
  instructor?: string | Instructor;
  availableSpots?: number;
  template_id?: string;
}

const DEFAULT_FEATURES = [
  'Material ingår',
  'Individuell handledning',
  'Grundläggande tekniker',
  'Tillgång till verktyg',
  'Ta hem dina verk',
  'Glasering och bränning',
];

// Default values for missing data
const DEFAULT_VALUES = {
  price: 1995,
  description: 'En introduktionskurs i keramik där du får lära dig grundläggande tekniker i drejning och handbyggnad. Perfekt för nybörjare som vill prova på keramik.',
  rich_description: '',
  location: 'Studio Clay, Göteborg',
  current_participants: 0,
  max_participants: 10
};

// Function to render rich text content safely
const RichTextContent = ({ content }: { content: string }) => {
  return (
    <div className="rich-text-content" dangerouslySetInnerHTML={{ __html: content }} />
  );
};

const CourseDetails: React.FC<CourseDetailsProps> = ({ courseId }) => {
  const router = useRouter();
  const [courseDetail, setCourseDetail] = React.useState<CourseDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [hasLimitedData, setHasLimitedData] = React.useState(false);

  React.useEffect(() => {
    const fetchCourseDetail = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/courses/${courseId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch course details');
        }
        
        const data = await response.json();
        console.log('Fetched course details:', data);
        
        if (data && data.course) {
          const course = data.course;
          
          // Check if we have limited data
          const hasMinimalData = 
            !course.description && 
            !course.price && 
            !course.start_date;
            
          setHasLimitedData(hasMinimalData);
          
          // Merge with default values for missing fields
          const completeData = {
            ...DEFAULT_VALUES,
            ...course
          };
          
          setCourseDetail(completeData);
        } else {
          setError('No course data found');
        }
      } catch (err) {
        console.error('Error fetching course details:', err);
        setError('Failed to load course details');
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      fetchCourseDetail();
    }
  }, [courseId]);

  const handleContinue = () => {
    router.push(`/book-course/${courseId}/personal-info`);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ pt: 4, pb: 6 }}>
        <Typography>Laddar kursinformation...</Typography>
      </Container>
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
    : (courseDetail.max_participants ? courseDetail.max_participants - (courseDetail.current_participants || 0) : 10);
  
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
    if (!minutes) return '2-3 timmar';
    
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

  // Get features - use defaults if not provided
  const features = courseDetail.features || DEFAULT_FEATURES;

  return (
    <Container maxWidth="lg" sx={{ pt: 4, pb: 6 }} className="hide-navigation">
      <BackToCourses position="top" />
      <BookingStepper activeStep={BookingStep.COURSE_INFO} />
      
      {hasLimitedData && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Vissa kursdetaljer kan vara preliminära. Kontakta oss gärna för mer information.
        </Alert>
      )}
      
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Typography variant="h4" component="h1" gutterBottom>
            {courseDetail.title || 'Kurs'}
          </Typography>
          
          {courseDetail.rich_description ? (
            <Box sx={{ mb: 3 }}>
              <RichTextContent content={courseDetail.rich_description} />
            </Box>
          ) : (
            <Typography variant="body1" paragraph>
              {courseDetail.description || DEFAULT_VALUES.description}
            </Typography>
          )}
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h6" gutterBottom>
            Detta ingår i kursen
          </Typography>
          
          <List>
            {features.map((feature, index) => (
              <ListItem key={index} sx={{ py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <CheckCircleIcon sx={{ color: 'var(--accent)' }} fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={feature} />
              </ListItem>
            ))}
          </List>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ borderRadius: 2, overflow: 'visible', position: 'relative', mb: 4 }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" gutterBottom>
                Kursdetaljer
              </Typography>
              
              <List sx={{ pt: 0 }}>
                <ListItem>
                  <ListItemIcon>
                    <EventIcon sx={{ color: 'var(--primary)' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Datum" 
                    secondary={formatDate(courseDetail.start_date)} 
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <AccessTimeIcon sx={{ color: 'var(--primary)' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Längd" 
                    secondary={formatDuration(courseDetail.duration_minutes)} 
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <LocationOnIcon sx={{ color: 'var(--primary)' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Plats" 
                    secondary={courseDetail.location || DEFAULT_VALUES.location} 
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <PeopleIcon sx={{ color: 'var(--primary)' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Deltagare" 
                    secondary={`${courseDetail.current_participants || 0} av ${courseDetail.max_participants || DEFAULT_VALUES.max_participants} platser bokade`} 
                  />
                </ListItem>
                
                {courseDetail.instructor && (
                  <ListItem>
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
                  <ListItem>
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
            </CardContent>
          </Card>
          
          <Card elevation={3} sx={{ borderRadius: 2, overflow: 'visible', position: 'relative' }}>
            {!isFullyBooked && availableSpots <= 3 && availableSpots > 0 && (
              <Chip 
                label={`Endast ${availableSpots} ${availableSpots === 1 ? 'plats' : 'platser'} kvar!`}
                color="error"
                sx={{ 
                  position: 'absolute', 
                  top: -16, 
                  right: 16,
                  fontWeight: 'bold',
                }}
              />
            )}
            
            {isFullyBooked && (
              <Chip 
                label="Fullbokad"
                color="error"
                sx={{ 
                  position: 'absolute', 
                  top: -16, 
                  right: 16,
                  fontWeight: 'bold',
                }}
              />
            )}
            
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" gutterBottom>
                Kurspris
              </Typography>
              
              <Typography variant="h3" sx={{ color: 'var(--primary)', mb: 1 }}>
                {courseDetail.price || DEFAULT_VALUES.price} kr
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Inklusive moms, material och verktyg
              </Typography>
              
              <StyledButton 
                fullWidth 
                size="large" 
                onClick={handleContinue}
                disabled={isFullyBooked}
              >
                {isFullyBooked 
                  ? 'Kursen är fullbokad' 
                  : 'Fortsätt till bokning'}
              </StyledButton>
              
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
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default CourseDetails; 