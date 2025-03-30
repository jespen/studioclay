'use client';

import React from 'react';
import FlowStepWrapper from '@/components/common/FlowStepWrapper';
import { FlowType, GenericStep } from '@/components/common/BookingStepper';
import ShopConfirmation from '../ShopConfirmation';
import { FlowStateData } from '@/components/common/FlowStepWrapper';

interface ShopConfirmationWrapperProps {
  productId: string;
  orderReference?: string;
}

const ShopConfirmationWrapper: React.FC<ShopConfirmationWrapperProps> = ({ 
  productId, 
  orderReference 
}) => {
  return (
    <FlowStepWrapper
      flowType={FlowType.ART_PURCHASE}
      activeStep={GenericStep.CONFIRMATION}
      expectedPreviousSteps={[GenericStep.USER_INFO, GenericStep.PAYMENT]}
      title="Bekräftelse"
      subtitle="Din beställning är bekräftad"
      validateData={(data: FlowStateData) => {
        // For confirmation, allow access even without complete data (for page reloads)
        // This is a fallback for when users reload the confirmation page
        return true;
      }}
      itemId={productId}
      redirectOnInvalid={false} // Allow viewing confirmation even if data is missing
    >
      {({ onNext, onBack, flowData }) => (
        <ShopConfirmation 
          flowData={flowData}
          orderReference={orderReference}
        />
      )}
    </FlowStepWrapper>
  );
};

export default ShopConfirmationWrapper; 