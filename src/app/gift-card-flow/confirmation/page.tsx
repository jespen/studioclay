import React, { Suspense } from 'react';
import GiftCardConfirmationWrapper from '@/components/gift-card-flow/GiftCardConfirmationWrapper';

// Gift card confirmation page
const GiftCardConfirmationPage = () => {
  return (
    <Suspense fallback={<div>Laddar bekräftelse...</div>}>
      <GiftCardConfirmationWrapper />
    </Suspense>
  );
};

export default GiftCardConfirmationPage; 