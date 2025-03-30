'use client';

import React from 'react';
import PaymentSelection from '@/components/booking/PaymentSelection';
import FlowStepWrapper from '@/components/common/FlowStepWrapper';
import { FlowType, GenericStep } from '@/components/common/BookingStepper';

// Funktion för att skapa en valideringsfunktion
function createValidateFunction() {
  return function validatePaymentData({ itemDetails, userInfo }: any) {
    // Logga för felsökning
    console.log("Validating payment data:", { 
      hasItemDetails: Boolean(itemDetails), 
      hasUserInfo: Boolean(userInfo),
      itemId: itemDetails?.id,
      userFirstName: userInfo?.firstName 
    });
    
    // Validera att vi har kursdetaljer och användarinfo
    const isValid = Boolean(itemDetails) && Boolean(userInfo) &&
          Boolean(itemDetails.id) && Boolean(userInfo.firstName);
           
    console.log("Payment validation result:", isValid);
    return isValid;
  };
}

export default function PaymentSelectionWrapper({ id }: { id: string }) {
  // Skapa validationsfunktionen 
  const validatePaymentData = createValidateFunction();
  
  // Funktion för att rendera children
  const renderChildren = ({ flowData, onNext, onBack }: any) => {
    console.log("PaymentSelectionWrapper renderChildren:", {
      hasFlowData: Boolean(flowData),
      itemDetailsId: flowData?.itemDetails?.id,
      userFirstName: flowData?.userInfo?.firstName
    });
    
    return (
      <PaymentSelection 
        courseId={id} 
        flowType={FlowType.COURSE_BOOKING}
        flowData={flowData}
        onNext={onNext}
        onBack={onBack}
      />
    );
  };

  return (
    <FlowStepWrapper
      flowType={FlowType.COURSE_BOOKING}
      activeStep={GenericStep.PAYMENT}
      expectedPreviousSteps={[GenericStep.ITEM_SELECTION, GenericStep.USER_INFO]}
      title="Betalning"
      subtitle="Välj din betalningsmetod och granska din bokning"
      itemId={id}
      validateData={validatePaymentData}
    >
      {renderChildren}
    </FlowStepWrapper>
  );
} 