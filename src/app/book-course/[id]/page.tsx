import { Suspense } from 'react';
import CourseDetailsWrapper from '@/components/booking/wrappers/CourseDetailsWrapper';

interface CourseDetailPageProps {
  params: {
    id: string;
  };
}

// Server component that safely handles params
export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  // In Next.js 15.2+, we need to await the params
  const awaitedParams = await params;
  const id = awaitedParams.id;
  
  return (
    <Suspense fallback={<div>Loading course details...</div>}>
      <CourseDetailsWrapper id={id} />
    </Suspense>
  );
} 