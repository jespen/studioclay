'use client';

import React from 'react';
import GiftCardConfirmation from './GiftCardConfirmation';
import FlowStepWrapper from '../common/FlowStepWrapper';
import { FlowType, GenericStep } from '../common/BookingStepper';

export default function GiftCardConfirmationWrapper() {
  return (
    <FlowStepWrapper
      flowType={FlowType.GIFT_CARD}
      activeStep={GenericStep.CONFIRMATION}
      expectedPreviousSteps={[GenericStep.PAYMENT]}
      title="Bekräftelse"
      subtitle="Din beställning av presentkort är klar"
      validateData={({ itemDetails, userInfo, paymentInfo }) => {
        return !!itemDetails && !!userInfo && !!paymentInfo;
      }}
    >
      {(props) => <GiftCardConfirmation flowData={props.flowData} />}
    </FlowStepWrapper>
  );
} 