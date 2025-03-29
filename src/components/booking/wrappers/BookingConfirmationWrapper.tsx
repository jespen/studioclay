'use client';

import React from 'react';
import BookingConfirmation from '@/components/booking/BookingConfirmation';
import FlowStepWrapper from '@/components/common/FlowStepWrapper';
import { FlowType, GenericStep } from '@/components/common/BookingStepper';

// Skapa en serialiserbar validateData-funktion
function createValidateFunction() {
  // Validera att vi har all nödvändig information
  return function validateData({ itemDetails, userInfo, paymentInfo }: any) {
    return Boolean(itemDetails) && Boolean(userInfo) && Boolean(paymentInfo);
  };
}

export default function BookingConfirmationWrapper({ id }: { id: string }) {
  // Skapa validationsfunktionen inuti komponenten
  const validateBookingData = createValidateFunction();
  
  // Funktion för att rendera children
  const renderChildren = ({ flowData }: any) => {
    // Säkra bara de data vi behöver för att undvika serialiseringsproblem
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
      // Skicka funktionen direkt - vi har abstraherat bort det komplexa
      validateData={validateBookingData}
    >
      {renderChildren}
    </FlowStepWrapper>
  );
} 