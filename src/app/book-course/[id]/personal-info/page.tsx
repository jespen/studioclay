import { Suspense } from 'react';
import UserInfoFormWrapper from '@/components/booking/wrappers/UserInfoFormWrapper';

interface PersonalInfoPageProps {
  params: {
    id: string;
  };
}

// Server component that safely handles params
export default async function PersonalInfoPage({ params }: PersonalInfoPageProps) {
  // In Next.js 15.2+, we need to await the params
  const awaitedParams = await params;
  const id = awaitedParams.id;
  
  return (
    <Suspense fallback={<div>Loading personal info form...</div>}>
      <UserInfoFormWrapper id={id} />
    </Suspense>
  );
} 