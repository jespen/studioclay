'use client';

import React, { ReactNode } from 'react';
import { Container, Typography, Alert, Box } from '@mui/material';
import BookingStepper, { GenericStepper, GenericStep, FlowType } from './BookingStepper';
import BackToCourses from './BackToCourses';
import BackButton from './BackButton';

interface GenericFlowContainerProps {
  children: ReactNode;
  activeStep: GenericStep;
  flowType: FlowType;
  title?: string;
  subtitle?: string;
  alertMessage?: string;
  alertSeverity?: 'error' | 'warning' | 'info' | 'success';
  showBackButton?: boolean;
  backButtonLabel?: string;
  backUrl?: string;
  className?: string;
}

/**
 * A reusable container for all flow pages
 * This component standardizes the layout for all steps in different flows
 */
const GenericFlowContainer: React.FC<GenericFlowContainerProps> = ({
  children,
  activeStep,
  flowType,
  title,
  subtitle,
  alertMessage,
  alertSeverity = 'info',
  showBackButton = false,
  backButtonLabel,
  backUrl,
  className,
}) => {
  // Log the activeStep when component renders
  console.log(`GenericFlowContainer rendering with activeStep: ${activeStep}, flowType: ${flowType}`);
  
  // Ensure activeStep is a number
  const numericActiveStep = typeof activeStep === 'number' ? activeStep : GenericStep.ITEM_SELECTION;

  // Determine the appropriate back button component based on flow type
  const getBackButton = () => {
    if (!showBackButton) return null;
    
    // Default button labels and URLs for different flow types
    const defaultConfig = {
      [FlowType.COURSE_BOOKING]: {
        label: 'Tillbaka till kurser',
        url: '/courses'
      },
      [FlowType.GIFT_CARD]: {
        label: 'Tillbaka till presentkort',
        url: '/gift-card-flow'
      },
      [FlowType.ART_PURCHASE]: {
        label: 'Tillbaka till butiken',
        url: '/shop'
      },
      [FlowType.WAITLIST]: {
        label: 'Tillbaka till kurser',
        url: '/courses'
      }
    };
    
    const config = defaultConfig[flowType] || { label: 'Tillbaka', url: '/' };
    
    // User-provided values override defaults
    const label = backButtonLabel || config.label;
    const url = backUrl || config.url;
    
    // For backwards compatibility, still use BackToCourses for course booking
    if (flowType === FlowType.COURSE_BOOKING) {
      return <BackToCourses position="top" label={label} url={url} />;
    }
    
    // For all other flows, use the generic BackButton
    return <BackButton position="top" label={label} url={url} />;
  };

  return (
    <Container maxWidth="lg" sx={{ pt: 4, pb: 6 }} className={`hide-navigation ${className || ''}`}>
      {/* Debug information */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ display: 'none' }}>
          Debug: numericActiveStep={numericActiveStep}, flowType={flowType}
        </div>
      )}
      
      {getBackButton()}
      
      <GenericStepper activeStep={numericActiveStep} flowType={flowType} />
      
      {alertMessage && (
        <Alert severity={alertSeverity} sx={{ mb: 3 }}>
          {alertMessage}
        </Alert>
      )}
      
      {title && (
        <Typography variant="h4" component="h1" align="center" gutterBottom>
          {title}
        </Typography>
      )}
      
      {subtitle && (
        <Typography variant="body1" align="center" paragraph>
          {subtitle}
        </Typography>
      )}
      
      {children}
    </Container>
  );
};

export default GenericFlowContainer; 