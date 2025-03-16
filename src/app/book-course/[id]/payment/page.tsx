import { Suspense } from 'react';
import PaymentSelectionWrapper from '@/components/booking/wrappers/PaymentSelectionWrapper';

interface PaymentPageProps {
  params: {
    id: string;
  };
}

// Server component that safely handles params
export default async function PaymentPage({ params }: PaymentPageProps) {
  // In Next.js 15.2+, we need to await the params
  const id = await Promise.resolve(params.id);
  
  return (
    <Suspense fallback={<div>Loading payment options...</div>}>
      <PaymentSelectionWrapper id={id} />
    </Suspense>
  );
} 