'use client';

import React from 'react';
import BookingConfirmation from '@/components/booking/BookingConfirmation';
import FlowStepWrapper from '@/components/common/FlowStepWrapper';
import { FlowType, GenericStep } from '@/components/common/BookingStepper';

/**
 * Creates a serializable validation function
 * @returns A validation function that ensures we have all required data for the confirmation page
 */
function createValidateFunction() {
  // Validate we have all necessary information
  return function validateData({ itemDetails, userInfo, paymentInfo }: any) {
    return Boolean(itemDetails) && Boolean(userInfo) && Boolean(paymentInfo);
  };
}

/**
 * Wrapper component for the booking confirmation page
 */
export default function BookingConfirmationWrapper({ id }: { id: string }) {
  // Create validation function inside the component
  const validateBookingData = createValidateFunction();
  
  // Function to render children with safe flow data
  const renderChildren = ({ flowData }: any) => {
    // Only pass the data we need to avoid serialization issues
    const safeFlowData = {
      itemDetails: flowData?.itemDetails || null,
      userInfo: flowData?.userInfo || null,
      paymentInfo: flowData?.paymentInfo || null,
      flowType: FlowType.COURSE_BOOKING
    };
    
    return <BookingConfirmation courseId={id} flowData={safeFlowData} />;
  };

  return (
    <FlowStepWrapper
      flowType={FlowType.COURSE_BOOKING}
      activeStep={GenericStep.CONFIRMATION}
      expectedPreviousSteps={[GenericStep.ITEM_SELECTION, GenericStep.USER_INFO, GenericStep.PAYMENT]}
      title="Bokningsbekräftelse"
      subtitle="Tack för din bokning!"
      itemId={id}
      // Pass the function directly - we've abstracted away the complexity
      validateData={validateBookingData}
    >
      {renderChildren}
    </FlowStepWrapper>
  );
} 