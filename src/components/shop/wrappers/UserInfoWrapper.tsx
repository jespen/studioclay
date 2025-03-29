'use client';

import React from 'react';
import FlowStepWrapper from '@/components/common/FlowStepWrapper';
import { FlowType, GenericStep } from '@/components/common/BookingStepper';
import UserInfoForm from '@/components/booking/UserInfoForm';
import { FlowStateData } from '@/components/common/FlowStepWrapper';

interface UserInfoWrapperProps {
  productId: string;
}

const ShopUserInfoWrapper: React.FC<UserInfoWrapperProps> = ({ productId }) => {
  return (
    <FlowStepWrapper
      flowType={FlowType.ART_PURCHASE}
      activeStep={GenericStep.USER_INFO}
      expectedPreviousSteps={[GenericStep.ITEM_SELECTION]}
      title="Dina uppgifter"
      subtitle="Fyll i dina kontaktuppgifter för att fortsätta"
      validateData={(data: FlowStateData) => {
        // Verify we have product details and user info
        return Boolean(data.itemDetails) && Boolean(data.userInfo);
      }}
      itemId={productId}
    >
      {({ onNext, onBack }) => (
        <UserInfoForm 
          courseId={productId} // Reuse the course ID parameter for the product ID
          onNext={onNext} 
          onBack={onBack}
        />
      )}
    </FlowStepWrapper>
  );
};

export default ShopUserInfoWrapper; 