import { Suspense } from 'react';
import GiftCardSelectionWrapper from '@/components/gift-card-flow/GiftCardSelection';

export const metadata = {
  title: 'Välj Presentkort | Studio Clay',
  description: 'Välj belopp och anpassa ditt presentkort från Studio Clay.',
};

export default function SelectionPage() {
  return (
    <Suspense fallback={<div>Laddar presentkort...</div>}>
      <GiftCardSelectionWrapper />
    </Suspense>
  );
} 