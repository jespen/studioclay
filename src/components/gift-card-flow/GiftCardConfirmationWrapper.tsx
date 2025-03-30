'use client';

import React from 'react';
import FlowStepWrapper from '../common/FlowStepWrapper';
import { FlowType, GenericStep } from '../common/BookingStepper';
import GenericConfirmation from '@/components/common/GenericConfirmation';
import { FlowStateData } from '../common/FlowStepWrapper';

export default function GiftCardConfirmationWrapper() {
  return (
    <FlowStepWrapper
      flowType={FlowType.GIFT_CARD}
      activeStep={GenericStep.CONFIRMATION}
      expectedPreviousSteps={[GenericStep.PAYMENT]}
      title="Bekräftelse"
      subtitle="Din beställning av presentkort är klar"
      validateData={(data: FlowStateData) => {
        const { itemDetails, userInfo, paymentInfo } = data;
        console.log("Validating gift card confirmation data:", {
          hasItemDetails: Boolean(itemDetails),
          hasUserInfo: Boolean(userInfo),
          hasPaymentInfo: Boolean(paymentInfo)
        });
        return !!itemDetails && !!userInfo && !!paymentInfo;
      }}
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