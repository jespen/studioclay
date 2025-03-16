import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid,
  Alert, 
  CircularProgress,
  Container
} from '@mui/material';

import BookingStepper, { BookingStep } from '../common/BookingStepper';
import BackToCourses from '../common/BackToCourses';
import StyledButton from '../common/StyledButton';
import { FormTextField, FormCheckboxField } from '../common/FormField';

interface UserInfoFormProps {
  courseId: string;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  streetAddress: string;
  postalCode: string;
  city: string;
  specialRequirements: string;
  acceptTerms: boolean;
  acceptPrivacyPolicy: boolean;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  streetAddress?: string;
  postalCode?: string;
  city?: string;
  acceptTerms?: string;
  acceptPrivacyPolicy?: string;
}

const UserInfoForm: React.FC<UserInfoFormProps> = ({ courseId }) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    streetAddress: '',
    postalCode: '',
    city: '',
    specialRequirements: '',
    acceptTerms: false,
    acceptPrivacyPolicy: false,
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (formErrors[name as keyof FormErrors]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
    // Clear error when user checks
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

    if (!formData.streetAddress.trim()) {
      errors.streetAddress = 'Gatuadress är obligatoriskt';
      isValid = false;
    }

    if (!formData.postalCode.trim()) {
      errors.postalCode = 'Postnummer är obligatoriskt';
      isValid = false;
    }

    if (!formData.city.trim()) {
      errors.city = 'Ort är obligatoriskt';
      isValid = false;
    }

    if (!formData.acceptTerms) {
      errors.acceptTerms = 'Du måste acceptera villkoren';
      isValid = false;
    }

    if (!formData.acceptPrivacyPolicy) {
      errors.acceptPrivacyPolicy = 'Du måste acceptera integritetspolicyn';
      isValid = false;
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

  return (
    <Container maxWidth="lg" sx={{ pt: 4, pb: 6 }} className="hide-navigation">
      <BackToCourses position="top" />
      <BookingStepper activeStep={BookingStep.USER_INFO} />
      
      <Typography variant="h4" component="h1" align="center" gutterBottom>
        Dina uppgifter
      </Typography>
      
      <Typography variant="body1" align="center" paragraph>
        Fyll i dina personuppgifter nedan för att fortsätta med bokningen.
      </Typography>
      
      {submitError && (
        <Alert severity="error" sx={{ my: 2 }}>
          {submitError}
        </Alert>
      )}
      
      <Paper 
        elevation={3} 
        sx={{ 
          borderRadius: 2, 
          p: { xs: 2, sm: 4 }, 
          mt: 4 
        }}
      >
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
            
            <Grid item xs={12}>
              <FormTextField
                label="Gatuadress *"
                name="streetAddress"
                value={formData.streetAddress}
                onChange={handleChange}
                error={formErrors.streetAddress}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormTextField
                label="Postnummer *"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleChange}
                error={formErrors.postalCode}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormTextField
                label="Ort *"
                name="city"
                value={formData.city}
                onChange={handleChange}
                error={formErrors.city}
                required
              />
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
              <FormCheckboxField
                name="acceptTerms"
                checked={formData.acceptTerms}
                onChange={handleCheckboxChange}
                label="Jag accepterar bokningsvillkoren *"
                error={formErrors.acceptTerms}
              />
              <Typography variant="caption" color="text.secondary">
                Genom att klicka i denna ruta accepterar du våra <a href="/terms" target="_blank" rel="noopener noreferrer">bokningsvillkor</a>.
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <FormCheckboxField
                name="acceptPrivacyPolicy"
                checked={formData.acceptPrivacyPolicy}
                onChange={handleCheckboxChange}
                label="Jag accepterar integritetspolicyn *"
                error={formErrors.acceptPrivacyPolicy}
              />
              <Typography variant="caption" color="text.secondary">
                Genom att klicka i denna ruta accepterar du vår <a href="/privacy" target="_blank" rel="noopener noreferrer">integritetspolicy</a>.
              </Typography>
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
                  disabled={isSubmitting}
                  startIcon={isSubmitting ? <CircularProgress size={20} sx={{ color: 'white' }} /> : undefined}
                >
                  {isSubmitting ? 'Skickar...' : 'Fortsätt till betalning'}
                </StyledButton>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
};

export default UserInfoForm; 