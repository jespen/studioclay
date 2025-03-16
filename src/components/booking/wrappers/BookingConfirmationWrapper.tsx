'use client';

import BookingConfirmation from '@/components/booking/BookingConfirmation';

export default function BookingConfirmationWrapper({ id }: { id: string }) {
  return <BookingConfirmation courseId={id} />;
} 