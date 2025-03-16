'use client';

import PaymentSelection from '@/components/booking/PaymentSelection';

export default function PaymentSelectionWrapper({ id }: { id: string }) {
  return <PaymentSelection courseId={id} />;
} 