'use client';

import React from 'react';
import FlowStepWrapper from '../common/FlowStepWrapper';
import { FlowType, GenericStep } from '../common/BookingStepper';
import GenericConfirmation from '@/components/common/GenericConfirmation';
import { FlowStateData } from '../common/FlowStepWrapper';
import { createFlowValidatorFunction } from '@/utils/validation';

export default function GiftCardConfirmationWrapper() {
  return (
    <FlowStepWrapper
      flowType={FlowType.GIFT_CARD}
      activeStep={GenericStep.CONFIRMATION}
      expectedPreviousSteps={[GenericStep.PAYMENT]}
      title="Bekräftelse"
      subtitle="Din beställning av presentkort är klar"
      validateData={createFlowValidatorFunction(GenericStep.CONFIRMATION, { isStrict: true })}
    >
      {({ flowData }) => (
        <GenericConfirmation 
          flowType={FlowType.GIFT_CARD}
          flowData={flowData}
        />
      )}
    </FlowStepWrapper>
  );
} 