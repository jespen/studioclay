import React, { Suspense } from 'react';
import BookingConfirmationWrapper from '@/components/booking/wrappers/BookingConfirmationWrapper';

interface ConfirmationPageProps {
  params: {
    id: string;
  };
}

// Define the page component
const ConfirmationPage = ({ params }: ConfirmationPageProps) => {
  const courseId = params.id;

  return (
    <Suspense fallback={<div>Laddar bekräftelse...</div>}>
      <BookingConfirmationWrapper id={courseId} />
    </Suspense>
  );
};

export default ConfirmationPage; 