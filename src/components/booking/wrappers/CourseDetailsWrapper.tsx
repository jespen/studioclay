'use client';

import React, { useState, useEffect, useRef } from 'react';
import CourseDetails from '@/components/booking/CourseDetails';
import FlowStepWrapper from '@/components/common/FlowStepWrapper';
import { FlowType, GenericStep } from '@/components/common/BookingStepper';
import { setFlowType, setItemId, getFlowType, getItemId } from '@/utils/dataStorage';

export default function CourseDetailsWrapper({ id }: { id: string }) {
  // Use ref instead of state to prevent re-renders
  const hasPreparedRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  
  // Set up the flow data once when the component mounts
  useEffect(() => {
    // Skip if already prepared
    if (hasPreparedRef.current) return;
    
    // Check if values have already been set correctly
    const currentFlowType = getFlowType();
    const currentItemId = getItemId();
    
    // Only update if values are different or missing
    if (currentFlowType !== FlowType.COURSE_BOOKING || currentItemId !== id) {
      // Set flow type and item ID in storage
      setFlowType(FlowType.COURSE_BOOKING);
      setItemId(id);
    }
    
    // Mark as prepared and ready
    hasPreparedRef.current = true;
    setIsReady(true);
    
    // Clean up function to reset when component unmounts or id changes
    return () => {
      hasPreparedRef.current = false;
    };
  }, [id]); // Only re-run effect if id changes
  
  if (!isReady) {
    return null; // Wait until flow is prepared
  }
  
  // Function to render children
  const renderChildren = ({ flowData, onNext, onBack }: any) => {
    console.log("CourseDetailsWrapper renderChildren:", { 
      hasFlowData: Boolean(flowData),
      flowItemDetailsId: flowData?.itemDetails?.id
    });
    
    return (
      <CourseDetails 
        courseId={id} 
        onNext={onNext}
        onBack={onBack}
      />
    );
  };
  
  return (
    <FlowStepWrapper
      flowType={FlowType.COURSE_BOOKING}
      activeStep={GenericStep.ITEM_SELECTION}
      itemId={id}
      redirectOnInvalid={false}
    >
      {renderChildren}
    </FlowStepWrapper>
  );
} 