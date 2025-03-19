'use client';

import React, { ReactNode } from 'react';
import { Container, Typography, Alert, Box } from '@mui/material';
import BookingStepper, { GenericStepper, GenericStep, FlowType } from './BookingStepper';
import BackToCourses from './BackToCourses';

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
  backButtonLabel = 'Tillbaka',
  backUrl = '/',
  className,
}) => {
  // Determine the appropriate back button component based on flow type
  const getBackButton = () => {
    if (!showBackButton) return null;
    
    switch (flowType) {
      case FlowType.COURSE_BOOKING:
        return <BackToCourses position="top" label={backButtonLabel} url={backUrl} />;
      // Add other flow types with custom back buttons if needed
      default:
        return <BackToCourses position="top" label={backButtonLabel} url={backUrl} />;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ pt: 4, pb: 6 }} className={`hide-navigation ${className || ''}`}>
      {getBackButton()}
      
      <GenericStepper activeStep={activeStep} flowType={flowType} />
      
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