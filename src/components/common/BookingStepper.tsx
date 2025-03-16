import React from 'react';
import { Stepper, Step, StepLabel, Box, Typography, useTheme, useMediaQuery } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import PersonIcon from '@mui/icons-material/Person';
import PaymentIcon from '@mui/icons-material/Payment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export enum BookingStep {
  COURSE_INFO = 0,
  USER_INFO = 1,
  PAYMENT = 2,
  CONFIRMATION = 3,
}

interface BookingStepperProps {
  activeStep: BookingStep;
}

/**
 * A stepper component that shows the booking flow progress
 */
const BookingStepper: React.FC<BookingStepperProps> = ({ activeStep }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const steps = [
    {
      label: 'Kursinformation',
      icon: <InfoIcon fontSize="small" />,
    },
    {
      label: 'Dina uppgifter',
      icon: <PersonIcon fontSize="small" />,
    },
    {
      label: 'Betalning',
      icon: <PaymentIcon fontSize="small" />,
    },
    {
      label: 'Bekräftelse',
      icon: <CheckCircleIcon fontSize="small" />,
    },
  ];

  return (
    <Box sx={{ width: '100%', mb: 4, mt: 2 }}>
      <Stepper 
        activeStep={activeStep} 
        alternativeLabel={!isMobile}
        orientation={isMobile ? 'vertical' : 'horizontal'}
        sx={{ 
          '& .MuiStepConnector-line': {
            borderColor: 'var(--border)',
          }
        }}
      >
        {steps.map((step, index) => (
          <Step key={step.label} completed={activeStep > index}>
            <StepLabel 
              StepIconComponent={() => (
                <Box 
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    backgroundColor: activeStep >= index ? 'var(--primary)' : '#e5e7eb',
                    color: activeStep >= index ? 'white' : '#9ca3af',
                  }}
                >
                  {step.icon}
                </Box>
              )}
            >
              <Typography 
                variant="body2" 
                fontWeight={activeStep === index ? 'bold' : 'normal'}
                sx={{
                  color: activeStep === index ? 'var(--primary-dark)' : 'inherit',
                }}
              >
                {step.label}
              </Typography>
            </StepLabel>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
};

export default BookingStepper; 