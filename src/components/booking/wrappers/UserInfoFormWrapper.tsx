'use client';

import UserInfoForm from '@/components/booking/UserInfoForm';

export default function UserInfoFormWrapper({ id }: { id: string }) {
  return <UserInfoForm courseId={id} />;
} 