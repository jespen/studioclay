'use client';

import { Suspense, useEffect } from 'react';
import GiftCardSelectionWrapper from '@/components/gift-card-flow/GiftCardSelection';
import { FlowType } from '@/components/common/BookingStepper';
import { setFlowType } from '@/utils/flowStorage';

export default function SelectionPage() {
  // Set flow type as soon as this page loads
  useEffect(() => {
    setFlowType(FlowType.GIFT_CARD);
  }, []);

  return (
    <Suspense fallback={<div>Laddar presentkort...</div>}>
      <GiftCardSelectionWrapper />
    </Suspense>
  );
} 