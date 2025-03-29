import React, { Suspense } from 'react';
import UserInfoFlowWrapper from '@/components/gift-card-flow/UserInfoWrapper';

const GiftCardPersonalInfoPage = () => {
  return (
    <Suspense fallback={<div>Laddar användarformulär...</div>}>
      <UserInfoFlowWrapper />
    </Suspense>
  );
};

export default GiftCardPersonalInfoPage; 