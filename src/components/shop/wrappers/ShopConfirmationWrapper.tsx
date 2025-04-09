'use client';

import React from 'react';
import FlowStepWrapper from '@/components/common/FlowStepWrapper';
import { FlowType, GenericStep } from '@/components/common/BookingStepper';
import GenericConfirmation from '@/components/common/GenericConfirmation';
import { FlowStateData } from '@/components/common/FlowStepWrapper';
import { createFlowValidatorFunction } from '@/utils/validation';

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
      validateData={createFlowValidatorFunction(GenericStep.CONFIRMATION, { isStrict: true })}
      itemId={productId}
      redirectOnInvalid={true} // Change to true so we are consistent with gift card
    >
      {({ flowData }) => (
        <GenericConfirmation
          flowType={FlowType.ART_PURCHASE}
          flowData={flowData}
          itemId={productId}
          orderReference={orderReference}
        />
      )}
    </FlowStepWrapper>
  );
};

export default ShopConfirmationWrapper; 