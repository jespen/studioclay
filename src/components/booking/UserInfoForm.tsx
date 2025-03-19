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

interface UserInfoFormProps {
  courseId: string;
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

const UserInfoForm: React.FC<UserInfoFormProps> = ({ courseId }) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [courseDetail, setCourseDetail] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [maxParticipants, setMaxParticipants] = useState(1);
  
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
    const fetchCourseDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/courses/${courseId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch course details');
        }
        
        const data = await response.json();
        
        if (data && data.course) {
          setCourseDetail(data.course);
          
          // Calculate available spots
          const availableSpots = data.course.availableSpots !== undefined 
            ? data.course.availableSpots 
            : (data.course.max_participants ? data.course.max_participants - (data.course.current_participants || 0) : 10);
          
          setMaxParticipants(availableSpots);
        }
      } catch (error) {
        setSubmitError('Failed to fetch course details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      fetchCourseDetails();
    }
  }, [courseId]);

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
      // In a real implementation, this would be an API call
      // Mock API call with a timeout
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Store form data in localStorage or context for the next step
      localStorage.setItem('userInfo', JSON.stringify(formData));
      localStorage.setItem('courseDetail', JSON.stringify(courseDetail));
      
      // Navigate to next step
      router.push(`/book-course/${courseId}/payment`);
    } catch (error) {
      setSubmitError('Det gick inte att skicka formuläret. Försök igen senare.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    router.push(`/book-course/${courseId}`);
  };

  // Generate participant options based on available spots
  const participantOptions = () => {
    const options = [];
    for (let i = 1; i <= maxParticipants; i++) {
      options.push(
        <MenuItem key={i} value={i.toString()}>
          {i} {i === 1 ? 'person' : 'personer'}
        </MenuItem>
      );
    }
    return options;
  };

  return (
    <GenericFlowContainer 
      activeStep={1} 
      flowType={FlowType.COURSE_BOOKING}
      title="Dina uppgifter"
      subtitle="Fyll i dina personuppgifter nedan för att fortsätta med bokningen."
      alertMessage={submitError || undefined}
      alertSeverity="error"
    >
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper 
          elevation={3} 
          sx={{ 
            borderRadius: 2, 
            p: { xs: 2, sm: 4 }, 
            mt: 4 
          }}
        >
          {courseDetail && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                {courseDetail.title}
              </Typography>
              <Typography variant="body2">
                Tillgängliga platser: {maxParticipants}
              </Typography>
            </Box>
          )}

          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <FormTextField
                  label="Förnamn *"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  error={formErrors.firstName}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormTextField
                  label="Efternamn *"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  error={formErrors.lastName}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormTextField
                  label="E-post *"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  error={formErrors.email}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormTextField
                  label="Telefon *"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  error={formErrors.phone}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl 
                  fullWidth 
                  error={!!formErrors.numberOfParticipants}
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&.Mui-focused fieldset': {
                        borderColor: 'var(--primary)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'var(--primary-light)',
                      }
                    },
                    '& .MuiInputLabel-root': {
                      '&.Mui-focused': {
                        color: 'var(--primary)',
                      },
                    },
                  }}
                >
                  <InputLabel id="number-of-participants-label">Antal deltagare</InputLabel>
                  <Select
                    labelId="number-of-participants-label"
                    id="numberOfParticipants"
                    name="numberOfParticipants"
                    value={formData.numberOfParticipants}
                    onChange={handleSelectChange}
                    label="Antal deltagare *"
                  >
                    {participantOptions()}
                  </Select>
                  {formErrors.numberOfParticipants && (
                    <FormHelperText>{formErrors.numberOfParticipants}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <FormTextField
                  label="Särskilda önskemål eller behov"
                  name="specialRequirements"
                  value={formData.specialRequirements}
                  onChange={handleChange}
                  multiline
                  rows={3}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                  <StyledButton
                    secondary
                    onClick={handleBack}
                    disabled={isSubmitting}
                  >
                    Tillbaka
                  </StyledButton>
                  
                  <StyledButton
                    type="submit"
                    disabled={isSubmitting || maxParticipants <= 0}
                    startIcon={isSubmitting ? <CircularProgress size={20} sx={{ color: 'white' }} /> : undefined}
                  >
                    {isSubmitting ? 'Skickar...' : 'Fortsätt till betalning'}
                  </StyledButton>
                </Box>
              </Grid>
            </Grid>
          </form>
        </Paper>
      )}
    </GenericFlowContainer>
  );
};

export default UserInfoForm; 