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
      label: 'Presentkort',
      icon: <CardGiftcardIcon fontSize="small" />,
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
  // Add debugging for the active step
  console.log(`GenericStepper rendering with activeStep: ${activeStep}, flowType: ${flowType}`);
  
  // Parse the active step to ensure it's a number and within valid range
  const numericActiveStep = typeof activeStep === 'number' ? activeStep : 0;
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Use custom steps if provided, otherwise use default steps for the flow type
  const steps = customSteps || flowConfigs[flowType];
  
  // Map GenericStep enum values to actual position in the stepper
  // This handles the mismatch between GenericStep enum and flowConfigs array indices
  let adjustedActiveStep = numericActiveStep;
  
  // Special mapping for COURSE_BOOKING flow because of DETAILS step
  if (flowType === FlowType.COURSE_BOOKING && !customSteps) {
    if (numericActiveStep === GenericStep.USER_INFO) {
      // USER_INFO (2) should map to index 1 in flowConfigs
      adjustedActiveStep = 1;
    } else if (numericActiveStep === GenericStep.PAYMENT) {
      // PAYMENT (3) should map to index 2 in flowConfigs
      adjustedActiveStep = 2;
    } else if (numericActiveStep === GenericStep.CONFIRMATION) {
      // CONFIRMATION (4) should map to index 3 in flowConfigs
      adjustedActiveStep = 3;
    }
  }
  
  // Make sure active step is within valid bounds
  const validActiveStep = Math.max(0, Math.min(adjustedActiveStep, steps.length - 1));
  
  if (validActiveStep !== numericActiveStep) {
    console.log(`Mapped activeStep ${numericActiveStep} to ${validActiveStep} for flow ${flowType}`);
  }

  return (
    <Box sx={{ width: '100%', mb: 4, mt: 2 }} className={className}>
      {/* Add debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ fontSize: '10px', color: '#666', textAlign: 'right', marginBottom: '4px' }}>
          Debug stepper: enum={numericActiveStep}, rendered={validActiveStep}, flow={flowType}
        </div>
      )}
      
      <Stepper 
        activeStep={validActiveStep} 
        alternativeLabel={!isMobile}
        orientation={isMobile ? 'vertical' : 'horizontal'}
        sx={{ 
          '& .MuiStepConnector-line': {
            borderColor: 'var(--border)',
          }
        }}
      >
        {steps.map((step, index) => (
          <Step key={step.label} completed={validActiveStep > index}>
            <StepLabel 
              StepIconComponent={() => {
                // Determine if this step is active, completed, or neither
                const isActive = validActiveStep === index;
                const isCompleted = validActiveStep > index;
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
                fontWeight={validActiveStep === index ? 'bold' : 'normal'}
                sx={{
                  color: validActiveStep === index ? 'var(--primary-dark)' : 'inherit',
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