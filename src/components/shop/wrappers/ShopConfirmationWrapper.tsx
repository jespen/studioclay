'use client';

import React from 'react';
import FlowStepWrapper from '@/components/common/FlowStepWrapper';
import { FlowType, GenericStep } from '@/components/common/BookingStepper';
import ShopConfirmation from '../ShopConfirmation';
import { FlowStateData } from '@/components/common/FlowStepWrapper';

interface ShopConfirmationWrapperProps {
  productId: string;
}

const ShopConfirmationWrapper: React.FC<ShopConfirmationWrapperProps> = ({ productId }) => {
  return (
    <FlowStepWrapper
      flowType={FlowType.ART_PURCHASE}
      activeStep={GenericStep.CONFIRMATION}
      expectedPreviousSteps={[GenericStep.ITEM_SELECTION, GenericStep.USER_INFO, GenericStep.PAYMENT]}
      title="Bekräftelse"
      subtitle="Din beställning är bekräftad"
      validateData={(data: FlowStateData) => {
        // For confirmation, we should have all data including payment info
        return Boolean(data.itemDetails) && Boolean(data.userInfo) && Boolean(data.paymentInfo);
      }}
      itemId={productId}
      redirectOnInvalid={false} // Allow viewing confirmation even if data is missing (for users who refresh the page)
    >
      {({ onNext, onBack }) => (
        <ShopConfirmation 
          productId={productId}
        />
      )}
    </FlowStepWrapper>
  );
};

export default ShopConfirmationWrapper; 