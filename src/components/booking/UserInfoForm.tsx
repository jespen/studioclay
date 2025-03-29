import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid,
  Alert, 
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  SelectChangeEvent,
} from '@mui/material';

import { GenericStep, FlowType } from '../common/BookingStepper';
import GenericFlowContainer from '../common/GenericFlowContainer';
import StyledButton from '../common/StyledButton';
import { FormTextField } from '../common/FormField';
import { setUserInfo } from '@/utils/flowStorage';

interface UserInfoFormProps {
  courseId: string;
  onNext?: () => void;
  onBack?: () => void;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  numberOfParticipants: string;
  specialRequirements: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  numberOfParticipants?: string;
}

interface CourseDetail {
  id: string;
  title: string;
  max_participants?: number;
  current_participants?: number;
  availableSpots?: number;
  price?: number;
}

const UserInfoForm: React.FC<UserInfoFormProps> = ({ courseId, onNext, onBack }) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [courseDetail, setCourseDetail] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [maxParticipants, setMaxParticipants] = useState(1);
  // Ref to track if we're already fetching data
  const isFetchingRef = React.useRef(false);
  
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    numberOfParticipants: '1',
    specialRequirements: '',
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Fetch course details to get available spots
  useEffect(() => {
    // Skip if already fetching
    if (isFetchingRef.current) return;
    
    const fetchCourseDetails = async () => {
      try {
        // Set fetching flag
        isFetchingRef.current = true;
        setLoading(true);
        
        // First check if we already have course details in localStorage or flowData
        const storedCourseDetail = localStorage.getItem('courseDetail');
        if (storedCourseDetail) {
          try {
            const parsedDetail = JSON.parse(storedCourseDetail);
            if (parsedDetail && parsedDetail.id === courseId) {
              setCourseDetail(parsedDetail);
              
              // Calculate available spots
              const availableSpots = parsedDetail.availableSpots !== undefined 
                ? parsedDetail.availableSpots 
                : (parsedDetail.max_participants ? parsedDetail.max_participants - (parsedDetail.current_participants || 0) : 10);
              
              setMaxParticipants(Math.max(1, availableSpots));
              setLoading(false);
              isFetchingRef.current = false;
              return;
            }
          } catch (err) {
            console.error('Error parsing stored course detail:', err);
            // Continue to fetch from API if parsing fails
          }
        }
        
        // If not found in localStorage, fetch from API
        const response = await fetch(`/api/courses/${courseId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch course details: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && data.course) {
          setCourseDetail(data.course);
          
          // Calculate available spots
          const availableSpots = data.course.availableSpots !== undefined 
            ? data.course.availableSpots 
            : (data.course.max_participants ? data.course.max_participants - (data.course.current_participants || 0) : 10);
          
          setMaxParticipants(Math.max(1, availableSpots));
        } else {
          throw new Error('Invalid course data format');
        }
      } catch (error) {
        console.error('Error fetching course details:', error);
        setSubmitError(error instanceof Error ? error.message : 'Failed to fetch course details. Please try again later.');
      } finally {
        setLoading(false);
        isFetchingRef.current = false;
      }
    };

    if (courseId) {
      fetchCourseDetails();
    }
    
    // Clean up fetching flag
    return () => {
      isFetchingRef.current = false;
    };
  }, [courseId]);

  // Load existing user data if available
  useEffect(() => {
    const storedUserInfo = localStorage.getItem('userInfo');
    if (storedUserInfo) {
      try {
        const parsedUserInfo = JSON.parse(storedUserInfo);
        setFormData(prevData => ({
          ...prevData,
          ...parsedUserInfo
        }));
      } catch (error) {
        console.error('Error parsing stored user info:', error);
      }
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (formErrors[name as keyof FormErrors]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user selects
    if (formErrors[name as keyof FormErrors]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    let isValid = true;

    // Required fields
    if (!formData.firstName.trim()) {
      errors.firstName = 'Förnamn är obligatoriskt';
      isValid = false;
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'Efternamn är obligatoriskt';
      isValid = false;
    }

    if (!formData.email.trim()) {
      errors.email = 'E-post är obligatoriskt';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Ogiltig e-postadress';
      isValid = false;
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Telefonnummer är obligatoriskt';
      isValid = false;
    }
    
    // Validate number of participants
    if (!formData.numberOfParticipants) {
      errors.numberOfParticipants = 'Antal deltagare är obligatoriskt';
      isValid = false;
    } else {
      const numParticipants = parseInt(formData.numberOfParticipants);
      if (isNaN(numParticipants) || numParticipants < 1 || numParticipants > maxParticipants) {
        errors.numberOfParticipants = `Antal deltagare måste vara mellan 1 och ${maxParticipants}`;
        isValid = false;
      }
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Store user info using flowStorage API
      setUserInfo(formData);
      
      // Also store in localStorage for backward compatibility
      localStorage.setItem('userInfo', JSON.stringify(formData));
      
      // Navigate to next step
      if (onNext) {
        onNext();
      } else {
        router.push(`/book-course/${courseId}/payment`);
      }
    } catch (error) {
      setSubmitError('Det gick inte att skicka formuläret. Försök igen senare.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push(`/book-course/${courseId}`);
    }
  };

  // Extract form rendering logic to a separate function for reuse
  const renderFormContent = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6}>
        <FormTextField
          required
          id="firstName"
          name="firstName"
          label="Förnamn"
          value={formData.firstName}
          onChange={handleChange}
          error={formErrors.firstName}
          disabled={isSubmitting}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormTextField
          required
          id="lastName"
          name="lastName"
          label="Efternamn"
          value={formData.lastName}
          onChange={handleChange}
          error={formErrors.lastName}
          disabled={isSubmitting}
        />
      </Grid>
      <Grid item xs={12}>
        <FormTextField
          required
          id="email"
          name="email"
          label="E-post"
          value={formData.email}
          onChange={handleChange}
          error={formErrors.email}
          disabled={isSubmitting}
        />
      </Grid>
      <Grid item xs={12}>
        <FormTextField
          required
          id="phone"
          name="phone"
          label="Telefon"
          value={formData.phone}
          onChange={handleChange}
          error={formErrors.phone}
          disabled={isSubmitting}
        />
      </Grid>
      <Grid item xs={12}>
        <FormControl fullWidth error={Boolean(formErrors.numberOfParticipants)}>
          <InputLabel id="numberOfParticipants-label">Antal personer</InputLabel>
          <Select
            labelId="numberOfParticipants-label"
            id="numberOfParticipants"
            name="numberOfParticipants"
            value={formData.numberOfParticipants}
            onChange={handleSelectChange}
            disabled={isSubmitting}
          >
            {Array.from({ length: maxParticipants }, (_, i) => i + 1).map((num) => (
              <MenuItem key={num} value={num.toString()}>
                {num} {num === 1 ? 'person' : 'personer'}
              </MenuItem>
            ))}
          </Select>
          {formErrors.numberOfParticipants && (
            <FormHelperText>{formErrors.numberOfParticipants}</FormHelperText>
          )}
        </FormControl>
      </Grid>
      <Grid item xs={12}>
        <FormTextField
          id="specialRequirements"
          name="specialRequirements"
          label="Särskilda önskemål (valfritt)"
          multiline
          rows={4}
          value={formData.specialRequirements}
          onChange={handleChange}
          disabled={isSubmitting}
        />
      </Grid>
    </Grid>
  );

  // Extract buttons rendering
  const renderButtons = () => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
      <StyledButton
        type="button"
        onClick={handleBack}
        disabled={isSubmitting}
        secondary
      >
        Tillbaka
      </StyledButton>
      <StyledButton
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? <CircularProgress size={24} /> : 'Fortsätt till betalning'}
      </StyledButton>
    </Box>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Skip GenericFlowContainer if we're inside FlowStepWrapper (indicated by onNext)
  return (
    <>
      {onNext ? (
        // When inside FlowStepWrapper (has onNext), only render the form without container
        <Box component="form" onSubmit={handleSubmit} noValidate>
          {submitError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {submitError}
            </Alert>
          )}
          <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, mb: 4, borderRadius: 2 }}>
            {renderFormContent()}
            {renderButtons()}
          </Paper>
        </Box>
      ) : (
        // Standalone rendering with GenericFlowContainer
        <GenericFlowContainer
          activeStep={GenericStep.USER_INFO}
          flowType={FlowType.COURSE_BOOKING}
          title="Dina uppgifter"
          subtitle="Fyll i dina kontaktuppgifter för att fortsätta med bokningen."
          alertMessage={submitError || undefined}
          alertSeverity="error"
        >
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, mb: 4, borderRadius: 2 }}>
              {renderFormContent()}
              {renderButtons()}
            </Paper>
          </Box>
        </GenericFlowContainer>
      )}
    </>
  );
};

export default UserInfoForm; 