import React from 'react';
import { Stepper, Step, StepLabel, Box, Typography, useTheme, useMediaQuery } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import PersonIcon from '@mui/icons-material/Person';
import PaymentIcon from '@mui/icons-material/Payment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ArtTrackIcon from '@mui/icons-material/ArtTrack';

/**
 * Flow types that can use the stepper
 */
export enum FlowType {
  COURSE_BOOKING = 'course_booking',
  WAITLIST = 'waitlist',
  GIFT_CARD = 'gift_card',
  ART_PURCHASE = 'art_purchase'
}

/**
 * Generic step IDs that can be used for all flows
 */
export enum GenericStep {
  ITEM_SELECTION = 0,
  DETAILS = 1,
  USER_INFO = 2,
  PAYMENT = 3,
  CONFIRMATION = 4
}

// For backward compatibility
export const BookingStep = GenericStep;

interface StepConfig {
  label: string;
  icon: React.ReactNode;
}

// Default flow configurations for different flow types
const flowConfigs: Record<FlowType, StepConfig[]> = {
  [FlowType.COURSE_BOOKING]: [
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
  ],
  [FlowType.WAITLIST]: [
    {
      label: 'Kursinformation',
      icon: <InfoIcon fontSize="small" />,
    },
    {
      label: 'Dina uppgifter',
      icon: <PersonIcon fontSize="small" />,
    },
    {
      label: 'Bekräftelse',
      icon: <CheckCircleIcon fontSize="small" />,
    },
  ],
  [FlowType.GIFT_CARD]: [
    {
      label: 'Välj kort',
      icon: <CardGiftcardIcon fontSize="small" />,
    },
    {
      label: 'Mottagare',
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
  ],
  [FlowType.ART_PURCHASE]: [
    {
      label: 'Välj konstverk',
      icon: <ArtTrackIcon fontSize="small" />,
    },
    {
      label: 'Detaljer',
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
  ],
};

interface StepperProps {
  activeStep: number;
  flowType?: FlowType;
  customSteps?: StepConfig[];
  className?: string;
}

/**
 * A reusable stepper component that shows progress for different flows
 */
const GenericStepper: React.FC<StepperProps> = ({ 
  activeStep, 
  flowType = FlowType.COURSE_BOOKING, 
  customSteps,
  className
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Use custom steps if provided, otherwise use default steps for the flow type
  const steps = customSteps || flowConfigs[flowType];

  return (
    <Box sx={{ width: '100%', mb: 4, mt: 2 }} className={className}>
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
              StepIconComponent={() => {
                // Determine if this step is active, completed, or neither
                const isActive = activeStep === index;
                const isCompleted = activeStep > index;
                const isInactive = !isActive && !isCompleted;
                
                return (
                  <Box 
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      // Different background colors based on step state
                      backgroundColor: isActive 
                        ? 'var(--primary)' 
                        : (isCompleted ? 'var(--primary-dark)' : '#e5e7eb'),
                      color: isInactive ? '#9ca3af' : 'white',
                    }}
                  >
                    {step.icon}
                  </Box>
                );
              }}
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

// For backward compatibility
const BookingStepper = GenericStepper;

export { GenericStepper };
export default BookingStepper; 