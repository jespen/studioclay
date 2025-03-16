'use client';

import CourseDetails from '@/components/booking/CourseDetails';

export default function CourseDetailsWrapper({ id }: { id: string }) {
  return <CourseDetails courseId={id} />;
} 