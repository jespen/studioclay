'use client';

import React from 'react';
import FlowStepWrapper from '@/components/common/FlowStepWrapper';
import { FlowType, GenericStep } from '@/components/common/BookingStepper';
import PaymentSelection from '@/components/booking/PaymentSelection';
import { FlowStateData } from '@/components/common/FlowStepWrapper';

interface PaymentWrapperProps {
  productId: string;
}

const ShopPaymentWrapper: React.FC<PaymentWrapperProps> = ({ productId }) => {
  return (
    <FlowStepWrapper
      flowType={FlowType.ART_PURCHASE}
      activeStep={GenericStep.PAYMENT}
      expectedPreviousSteps={[GenericStep.ITEM_SELECTION, GenericStep.USER_INFO]}
      title="Betalning"
      subtitle="Välj betalningssätt"
      validateData={(data: FlowStateData) => {
        // Verify we have product details and user info
        return Boolean(data.itemDetails) && Boolean(data.userInfo);
      }}
      itemId={productId}
    >
      {({ onNext, onBack, flowData }) => (
        <PaymentSelection 
          courseId={productId} // Reuse the course ID parameter for the product ID
          onNext={onNext} 
          onBack={onBack}
        />
      )}
    </FlowStepWrapper>
  );
};

export default ShopPaymentWrapper; 