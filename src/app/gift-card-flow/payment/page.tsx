import React, { Suspense } from 'react';
import PaymentWrapper from '@/components/gift-card-flow/PaymentWrapper';

const GiftCardPaymentPage = () => {
  return (
    <Suspense fallback={<div>Laddar betalningssida...</div>}>
      <PaymentWrapper />
    </Suspense>
  );
};

export default GiftCardPaymentPage; 