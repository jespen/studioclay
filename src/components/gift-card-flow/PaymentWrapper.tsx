'use client';

import React from 'react';
import PaymentSelection from '@/components/booking/PaymentSelection';
import FlowStepWrapper from '@/components/common/FlowStepWrapper';
import { FlowType, GenericStep } from '@/components/common/BookingStepper';

const PaymentWrapper = () => {
  return (
    <FlowStepWrapper
      flowType={FlowType.GIFT_CARD}
      activeStep={GenericStep.PAYMENT}
      expectedPreviousSteps={[GenericStep.USER_INFO]}
      title="Betalning"
      subtitle="Välj betalningssätt för ditt presentkort"
      itemId="gift-card"
      validateData={({itemDetails, userInfo}) => !!itemDetails && !!userInfo}
    >
      {(props) => (
        <PaymentSelection 
          courseId="gift-card"
          flowType={FlowType.GIFT_CARD}
          flowData={props.flowData}
          onNext={props.onNext}
          onBack={props.onBack}
        />
      )}
    </FlowStepWrapper>
  );
};

export default PaymentWrapper; 