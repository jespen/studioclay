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
    console.log("Validating confirmation data:", {
      hasItemDetails: Boolean(itemDetails),
      hasUserInfo: Boolean(userInfo),
      hasPaymentInfo: Boolean(paymentInfo)
    });
    return Boolean(itemDetails) && Boolean(userInfo) && Boolean(paymentInfo);
  };
}

/**
 * Wrapper component for the booking confirmation page
 */
export default function BookingConfirmationWrapper({ id }: { id: string }) {
  // Create validation function inside the component
  const validateBookingData = createValidateFunction();
  
  // Function to render children with data from storage
  const renderChildren = ({ flowData }: any) => {
    console.log("BookingConfirmationWrapper renderChildren:", {
      hasFlowData: Boolean(flowData),
      itemDetailsId: flowData?.itemDetails?.id,
      hasUserInfo: Boolean(flowData?.userInfo),
      hasPaymentInfo: Boolean(flowData?.paymentInfo)
    });
    
    // Create a safe data object to pass to BookingConfirmation
    const safeData = {
      itemDetails: flowData?.itemDetails || null,
      userInfo: flowData?.userInfo || null,
      paymentInfo: flowData?.paymentInfo || null,
      flowType: FlowType.COURSE_BOOKING
    };
    
    return <BookingConfirmation courseId={id} flowData={safeData} />;
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