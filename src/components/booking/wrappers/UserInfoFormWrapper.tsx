'use client';

import React from 'react';
import UserInfoForm from '@/components/booking/UserInfoForm';
import FlowStepWrapper from '@/components/common/FlowStepWrapper';
import { FlowType, GenericStep } from '@/components/common/BookingStepper';

// Funktion för att skapa en valideringsfunktion
function createValidateFunction() {
  return function validateUserInfoData({ itemDetails }: any) {
    // Validera att vi har kursdetaljer
    return Boolean(itemDetails) && Boolean(itemDetails.id);
  };
}

export default function UserInfoFormWrapper({ id }: { id: string }) {
  // Explicit activeStep value to debug
  const activeStep = GenericStep.USER_INFO;
  console.log(`UserInfoFormWrapper rendering with id: ${id}, activeStep: ${activeStep}`);
  
  // Skapa validationsfunktionen
  const validateUserInfoData = createValidateFunction();
  
  // Funktion för att rendera children
  const renderChildren = ({ flowData, onNext, onBack }: any) => {
    return (
      <UserInfoForm 
        courseId={id} 
        onNext={onNext}
        onBack={onBack}
      />
    );
  };

  return (
    <FlowStepWrapper
      flowType={FlowType.COURSE_BOOKING}
      activeStep={activeStep}
      expectedPreviousSteps={[GenericStep.ITEM_SELECTION]}
      title="Dina uppgifter"
      subtitle="Fyll i dina kontaktuppgifter för att fortsätta"
      itemId={id}
      validateData={validateUserInfoData}
    >
      {renderChildren}
    </FlowStepWrapper>
  );
} 