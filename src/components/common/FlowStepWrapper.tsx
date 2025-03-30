'use client';

import React, { ReactNode, useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';
import { FlowType, GenericStep } from './BookingStepper';
import GenericFlowContainer from './GenericFlowContainer';
import { 
  getFlowType, 
  getAllFlowData,
  getItemDetails, 
  getUserInfo, 
  getPaymentInfo,
  setFlowType
} from '@/utils/dataStorage';
import { 
  getNextStepUrl, 
  getPreviousStepUrl, 
  getStepUrl 
} from '@/utils/flowNavigation';

export interface FlowStateData {
  flowType: FlowType;
  itemDetails: any | null;
  userInfo: any | null;
  paymentInfo: any | null;
}

export interface FlowStepWrapperProps {
  children: (props: {
    flowData: FlowStateData;
    onNext: (data?: any) => void;
    onBack: () => void;
    isLoading: boolean;
  }) => ReactNode;
  flowType: FlowType;
  activeStep: GenericStep;
  expectedPreviousSteps?: GenericStep[];
  title?: string;
  subtitle?: string;
  validateData?: Function | string;
  itemId?: string;
  redirectOnInvalid?: boolean;
}

/**
 * A wrapper component for flow steps that handles data loading, validation,
 * and navigation between steps.
 */
const FlowStepWrapper: React.FC<FlowStepWrapperProps> = ({
  children,
  flowType,
  activeStep,
  expectedPreviousSteps = [],
  title,
  subtitle,
  validateData,
  itemId,
  redirectOnInvalid = true
}) => {
  // Log the activeStep when component renders
  console.log(`FlowStepWrapper rendering with activeStep: ${activeStep}, flowType: ${flowType}`);
  
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use refs instead of state for data that might cause re-renders during redirects
  const isRedirectingRef = React.useRef(false);
  const isLoadingRef = React.useRef(true);
  const flowDataRef = React.useRef<FlowStateData>({
    flowType,
    itemDetails: null,
    userInfo: null,
    paymentInfo: null
  });
  
  // Only use state for the data that will be passed to children
  const [flowDataForChildren, setFlowDataForChildren] = useState<FlowStateData>({
    flowType,
    itemDetails: null,
    userInfo: null,
    paymentInfo: null
  });

  // Memoize the expected previous steps array to prevent unnecessary re-renders
  const memoizedExpectedSteps = useMemo(() => expectedPreviousSteps, [expectedPreviousSteps.join(',')]);
  
  // Wrap validateData in useCallback to maintain referential equality
  const memoizedValidateData = useCallback(
    (data: FlowStateData) => {
      if (typeof validateData === 'function') {
        return validateData(data);
      } else if (typeof validateData === 'string') {
        try {
          // Om validateData är en strängrepresentation av en funktion, evaluera den
          const validateFn = new Function('data', `
            const { itemDetails, userInfo, paymentInfo } = data;
            return (${validateData})(data);
          `);
          return validateFn(data);
        } catch (err) {
          console.error('Error evaluating validateData string:', err);
          return true;
        }
      }
      return true;
    },
    [validateData]
  );

  // Load and validate data
  useEffect(() => {
    // Skip if already redirecting
    if (isRedirectingRef.current) return;
    
    const loadData = async () => {
      // Don't trigger state updates if we're already loading
      if (!isLoadingRef.current) {
        isLoadingRef.current = true;
        setIsLoading(true);
      }
      
      setError(null);
      
      try {
        // Check flow type
        const currentFlowType = getFlowType();
        if (currentFlowType !== flowType) {
          console.warn(`Wrong flow type. Expected ${flowType}, got: ${currentFlowType}`);
          
          // If no flow type is set, set it now instead of redirecting
          if (!currentFlowType) {
            setFlowType(flowType);
          } else if (redirectOnInvalid && !isRedirectingRef.current) {
            isRedirectingRef.current = true;
            router.push(getStepUrl(flowType, GenericStep.ITEM_SELECTION, itemId));
            return;
          }
        }
        
        // Fetch all data
        const itemDetails = getItemDetails();
        const userInfo = getUserInfo();
        const paymentInfo = getPaymentInfo();
        
        // Update refs first (these don't trigger re-renders)
        flowDataRef.current = {
          flowType,
          itemDetails,
          userInfo,
          paymentInfo
        };
        
        // Only update state if we're not redirecting
        if (!isRedirectingRef.current) {
          // Validate required data for this step
          if (memoizedValidateData({ flowType, itemDetails, userInfo, paymentInfo })) {
            // Validate expected previous steps data
            if (memoizedExpectedSteps.length > 0) {
              const missingData = (
                (memoizedExpectedSteps.includes(GenericStep.ITEM_SELECTION) && !itemDetails) ||
                (memoizedExpectedSteps.includes(GenericStep.USER_INFO) && !userInfo) ||
                (memoizedExpectedSteps.includes(GenericStep.PAYMENT) && !paymentInfo)
              );
              
              if (missingData) {
                console.warn('Missing required data from previous steps');
                if (redirectOnInvalid) {
                  isRedirectingRef.current = true;
                  router.push(getStepUrl(flowType, GenericStep.ITEM_SELECTION, itemId));
                  return;
                }
              }
            }
            
            // Only update state with validated data if all checks pass
            setFlowDataForChildren(flowDataRef.current);
            setIsLoading(false);
            isLoadingRef.current = false;
          } else {
            console.warn('Data validation failed for step', activeStep);
            if (redirectOnInvalid) {
              isRedirectingRef.current = true;
              // Redirect to previous step or selection
              const previousStepUrl = getPreviousStepUrl(activeStep, flowType, itemId);
              router.push(previousStepUrl || getStepUrl(flowType, GenericStep.ITEM_SELECTION, itemId));
              return;
            }
          }
        }
      } catch (error) {
        console.error('Error loading flow data:', error);
        if (!isRedirectingRef.current) {
          setError('Ett fel inträffade vid laddning av flödesdata.');
          setIsLoading(false);
          isLoadingRef.current = false;
        }
      }
    };
    
    // Execute the load data function
    loadData();
    
    // Reset redirect ref when dependencies change
    return () => {
      isRedirectingRef.current = false;
    };
  }, [
    router, 
    flowType, 
    activeStep, 
    memoizedExpectedSteps,
    memoizedValidateData,
    itemId, 
    redirectOnInvalid
  ]);

  // Handle navigation to next step
  const handleNextStep = (data?: any) => {
    // Prevent navigation if already redirecting
    if (isRedirectingRef.current) return;
    
    isRedirectingRef.current = true;
    const nextStepUrl = getNextStepUrl(activeStep, flowType, itemId);
    if (nextStepUrl) {
      router.push(nextStepUrl);
    } else {
      console.warn('No next step defined for', activeStep, 'in flow', flowType);
      isRedirectingRef.current = false;
    }
  };

  // Handle navigation to previous step
  const handleBackStep = () => {
    // Prevent navigation if already redirecting
    if (isRedirectingRef.current) return;
    
    isRedirectingRef.current = true;
    const previousStepUrl = getPreviousStepUrl(activeStep, flowType, itemId);
    if (previousStepUrl) {
      router.push(previousStepUrl);
    } else {
      // If no previous step, go to the home page
      // This is especially important for the first step in the flow
      router.push('/');
    }
  };

  return (
    <GenericFlowContainer 
      activeStep={activeStep} 
      flowType={flowType}
      title={title}
      subtitle={subtitle}
    >
      {error ? (
        <Box sx={{ p: 2, color: 'error.main' }}>{error}</Box>
      ) : isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        children({
          flowData: flowDataForChildren,
          onNext: handleNextStep,
          onBack: handleBackStep,
          isLoading
        })
      )}
    </GenericFlowContainer>
  );
};

export default FlowStepWrapper; 