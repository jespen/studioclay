import React, { Suspense } from 'react';
import BookingConfirmation from '@/components/booking/BookingConfirmation';
import FlowStepWrapper from '@/components/common/FlowStepWrapper';
import { FlowType, GenericStep } from '@/components/common/BookingStepper';

// Gift card confirmation page
const GiftCardConfirmationPage = () => {
  return (
    <Suspense fallback={<div>Laddar bekräftelse...</div>}>
      <FlowStepWrapper
        flowType={FlowType.GIFT_CARD}
        activeStep={GenericStep.CONFIRMATION}
        expectedPreviousSteps={[GenericStep.PAYMENT]}
        title="Bekräftelse"
        subtitle="Tack för din beställning! Nedan hittar du information om ditt presentkort."
        itemId="gift-card"
        validateData={() => true}
      >
        {(props) => (
          <BookingConfirmation courseId="gift-card" flowData={props.flowData} />
        )}
      </FlowStepWrapper>
    </Suspense>
  );
};

export default GiftCardConfirmationPage; 