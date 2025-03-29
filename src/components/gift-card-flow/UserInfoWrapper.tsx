'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  FormControl,
  FormHelperText,
  CircularProgress,
  Alert,
  Grid
} from '@mui/material';
import FlowStepWrapper from '../common/FlowStepWrapper';
import { FlowType, GenericStep } from '../common/BookingStepper';
import StyledButton from '../common/StyledButton';
import { setUserInfo } from '@/utils/flowStorage';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialRequirements?: string;
  numberOfParticipants: string; // Keep for compatibility with PaymentSelection
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

interface UserInfoWrapperProps {
  onNext?: (data: any) => void;
  onBack?: () => void;
}

const UserInfoWrapper: React.FC<UserInfoWrapperProps> = ({ onNext, onBack }) => {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialRequirements: '',
    numberOfParticipants: '1' // Default to 1 for gift cards
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasStoredData, setHasStoredData] = useState(false);

  // Check if there's stored user data but don't load it automatically
  useEffect(() => {
    const storedUserInfo = localStorage.getItem('userInfo');
    if (storedUserInfo) {
      try {
        // Just check if data exists, don't auto-fill
        setHasStoredData(true);
      } catch (error) {
        console.error('Error parsing stored user info:', error);
      }
    }
  }, []);

  // Function to load stored user data when requested
  const loadStoredUserData = () => {
    const storedUserInfo = localStorage.getItem('userInfo');
    if (storedUserInfo) {
      try {
        const parsedUserInfo = JSON.parse(storedUserInfo);
        setFormData(prev => ({
          ...prev,
          ...parsedUserInfo,
          numberOfParticipants: parsedUserInfo.numberOfParticipants || '1'
        }));
        setHasStoredData(false); // Hide the notice once loaded
      } catch (error) {
        console.error('Error parsing stored user info:', error);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user types
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    // Validate first name
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Förnamn är obligatoriskt';
      isValid = false;
    }

    // Validate last name
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Efternamn är obligatoriskt';
      isValid = false;
    }

    // Validate email
    if (!formData.email.trim()) {
      newErrors.email = 'E-post är obligatoriskt';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Ogiltig e-postadress';
      isValid = false;
    }

    // Validate phone
    if (!formData.phone.trim()) {
      newErrors.phone = 'Telefon är obligatoriskt';
      isValid = false;
    } else if (!/^[0-9\s\-\+]+$/.test(formData.phone)) {
      newErrors.phone = 'Ogiltigt telefonnummer';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Store user info in flow storage
      setUserInfo(formData);
      
      // Also store in localStorage for compatibility
      localStorage.setItem('userInfo', JSON.stringify(formData));
      
      // Navigate to next step
      if (onNext) {
        onNext(formData);
      } else {
        router.push('/gift-card-flow/payment');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push('/gift-card-flow/selection');
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 3 }}>
      {hasStoredData && (
        <Alert 
          severity="info" 
          sx={{ mb: 3 }}
          action={
            <Button 
              color="inherit" 
              size="small"
              onClick={loadStoredUserData}
            >
              Fyll i
            </Button>
          }
        >
          Det finns sparad kontaktinformation från tidigare köp. Vill du använda den?
        </Alert>
      )}
      
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          Dina kontaktuppgifter
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              required
              fullWidth
              label="Förnamn"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              error={!!errors.firstName}
              helperText={errors.firstName}
              margin="normal"
              disabled={isSubmitting}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              required
              fullWidth
              label="Efternamn"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              error={!!errors.lastName}
              helperText={errors.lastName}
              margin="normal"
              disabled={isSubmitting}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              required
              fullWidth
              label="E-post"
              name="email"
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              error={!!errors.email}
              helperText={errors.email}
              margin="normal"
              disabled={isSubmitting}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              required
              fullWidth
              label="Telefon"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              error={!!errors.phone}
              helperText={errors.phone}
              margin="normal"
              disabled={isSubmitting}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Särskilda önskemål (valfritt)"
              name="specialRequirements"
              multiline
              rows={3}
              value={formData.specialRequirements}
              onChange={handleChange}
              margin="normal"
              disabled={isSubmitting}
            />
          </Grid>
        </Grid>
      </Paper>
      
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
    </Box>
  );
};

const UserInfoFlowWrapper = () => {
  return (
    <FlowStepWrapper
      flowType={FlowType.GIFT_CARD}
      activeStep={GenericStep.USER_INFO}
      expectedPreviousSteps={[GenericStep.ITEM_SELECTION]}
      title="Dina uppgifter"
      subtitle="Fyll i dina kontaktuppgifter för att fortsätta"
      validateData={({ itemDetails }) => {
        // Validate that we have gift card details
        return !!itemDetails && !!itemDetails.amount;
      }}
    >
      {(props) => (
        <UserInfoWrapper onNext={props.onNext} onBack={props.onBack} />
      )}
    </FlowStepWrapper>
  );
};

export default UserInfoFlowWrapper; 