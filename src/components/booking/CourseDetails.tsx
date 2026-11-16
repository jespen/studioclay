import React from 'react';
import { useRouter } from 'next/navigation';
import { 
  Box, 
  Typography, 
  Container,
  Alert,
  CircularProgress
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import CategoryIcon from '@mui/icons-material/Category';

import { GenericStep, FlowType } from '../common/BookingStepper';
import BackToCourses from '../common/BackToCourses';
import StyledButton from '../common/StyledButton';
import FlowCard from '../common/FlowCard';
import FlowActions from '../common/FlowActions';
import ItemSummary, { SummaryDetail } from '../common/ItemSummary';
import RichText from '../common/RichText';
import { CourseDetail, hasMinimalCourseData } from '@/utils/dataFetcher';
import { fetchCourseWithCache } from '@/utils/apiCache';
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

  const instructorName = courseDetail.instructor
    ? (typeof courseDetail.instructor === 'object' && courseDetail.instructor !== null
        ? courseDetail.instructor.name
        : courseDetail.instructor)
    : undefined;

  const categoryName = courseDetail.category
    ? (typeof courseDetail.category === 'object' && courseDetail.category !== null
        ? courseDetail.category.name
        : courseDetail.category)
    : undefined;

  const details: SummaryDetail[] = [
    { icon: <EventIcon />, label: formatDate(courseDetail.start_date) },
    { icon: <LocationOnIcon />, label: courseDetail.location || 'Studio Clay, Norrtullsgatan 65' },
    {
      icon: <PeopleIcon />,
      label: isFullyBooked
        ? 'Fullbokad'
        : `${availableSpots} ${availableSpots === 1 ? 'plats' : 'platser'} kvar`,
    },
  ];

  if (instructorName) {
    details.push({ icon: <PersonIcon />, label: instructorName });
  }
  if (categoryName) {
    details.push({ icon: <CategoryIcon />, label: String(categoryName) });
  }

  return (
    <>
      <Typography
        variant="h4"
        component="h1"
        align="center"
        gutterBottom
        sx={{ fontSize: { xs: '1.75rem', sm: '2rem' }, letterSpacing: '-0.02em', fontWeight: 700, mb: 1 }}
      >
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
      
      <FlowCard sx={{ mt: 1 }}>
        {hasLimitedData && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Vi håller på att ladda all kursinformation. Vissa detaljer kan saknas.
          </Alert>
        )}

        <ItemSummary
          details={details}
          price={courseDetail.price || 'Kontakta oss'}
          priceSuffix={courseDetail.price ? 'kr' : ''}
          priceNote="Inklusive moms, material och verktyg"
        />

        {!isFullyBooked && availableSpots <= 3 && availableSpots > 0 && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Endast {availableSpots} {availableSpots === 1 ? 'plats' : 'platser'} kvar!
          </Alert>
        )}

        {isFullyBooked && (
          <Alert severity="error" sx={{ mb: 3 }}>
            Denna kurs är tyvärr fullbokad.
          </Alert>
        )}

        {courseDetail.rich_description ? (
          <RichText content={courseDetail.rich_description} />
        ) : (
          <Typography variant="body1">
            {courseDetail.description || 'Ingen beskrivning tillgänglig.'}
          </Typography>
        )}

        <FlowActions
          onBack={handleBackToHome}
          onNext={handleContinue}
          nextDisabled={isFullyBooked}
          nextLabel={isFullyBooked ? 'Kursen är fullbokad' : 'Fortsätt till dina uppgifter'}
        />

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
      </FlowCard>
    </>
  );
};

export default CourseDetails; 