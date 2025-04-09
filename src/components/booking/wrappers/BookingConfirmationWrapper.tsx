'use client';

import React from 'react';
import GenericConfirmation from '@/components/common/GenericConfirmation';
import FlowStepWrapper from '@/components/common/FlowStepWrapper';
import { FlowType, GenericStep } from '@/components/common/BookingStepper';
import { createFlowValidatorFunction } from '@/utils/validation';

/**
 * Wrapper component for the booking confirmation page
 */
export default function BookingConfirmationWrapper({ id }: { id: string }) {
  // Function to render children with data from storage
  const renderChildren = ({ flowData }: any) => {
    console.log("BookingConfirmationWrapper renderChildren:", {
      hasFlowData: Boolean(flowData),
      itemDetailsId: flowData?.itemDetails?.id,
      hasUserInfo: Boolean(flowData?.userInfo),
      hasPaymentInfo: Boolean(flowData?.paymentInfo)
    });
    
    return (
      <GenericConfirmation 
        flowType={FlowType.COURSE_BOOKING}
        flowData={flowData}
        itemId={id}
      />
    );
  };

  return (
    <FlowStepWrapper
      flowType={FlowType.COURSE_BOOKING}
      activeStep={GenericStep.CONFIRMATION}
      expectedPreviousSteps={[GenericStep.ITEM_SELECTION, GenericStep.USER_INFO, GenericStep.PAYMENT]}
      title="Bokningsbekräftelse"
      subtitle="Tack för din bokning!"
      itemId={id}
      // Use the standardized validation function
      validateData={createFlowValidatorFunction(GenericStep.CONFIRMATION, { isStrict: true })}
    >
      {renderChildren}
    </FlowStepWrapper>
  );
} 