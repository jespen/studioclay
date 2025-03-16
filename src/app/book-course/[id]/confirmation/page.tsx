import { Suspense } from 'react';
import BookingConfirmationWrapper from '@/components/booking/wrappers/BookingConfirmationWrapper';

interface ConfirmationPageProps {
  params: {
    id: string;
  };
}

// Server component that safely handles params
export default async function ConfirmationPage({ params }: ConfirmationPageProps) {
  // In Next.js 15.2+, we need to await the params
  const id = await Promise.resolve(params.id);
  
  return (
    <Suspense fallback={<div>Loading confirmation...</div>}>
      <BookingConfirmationWrapper id={id} />
    </Suspense>
  );
} 