'use client';

import React from 'react';
import UserInfoForm from '@/components/booking/UserInfoForm';
import FlowStepWrapper from '@/components/common/FlowStepWrapper';
import { FlowType, GenericStep } from '@/components/common/BookingStepper';

/**
 * Creates a serializable validation function for user info
 * @returns A string representation of a validation function
 */
function createValidateFunction() {
  return function validateUserInfoData({ itemDetails }: any) {
    // Validate that we have course details
    return Boolean(itemDetails) && Boolean(itemDetails.id);
  };
}

/**
 * Wrapper component for the user info form step
 */
export default function UserInfoFormWrapper({ id }: { id: string }) {
  // Explicit activeStep value to debug
  const activeStep = GenericStep.USER_INFO;
  console.log(`UserInfoFormWrapper rendering with id: ${id}, activeStep: ${activeStep}`);
  
  // Create validation function
  const validateUserInfoData = createValidateFunction();
  
  // Function to render children
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