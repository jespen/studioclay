import React, { Suspense } from 'react';
import ShopUserInfoWrapper from '@/components/shop/wrappers/UserInfoWrapper';

interface ShopPersonalInfoPageProps {
  params: {
    id: string;
  };
}

const ShopPersonalInfoPage: React.FC<ShopPersonalInfoPageProps> = ({ params }) => {
  return (
    <Suspense fallback={<div>Laddar personuppgiftsformulär...</div>}>
      <ShopUserInfoWrapper productId={params.id} />
    </Suspense>
  );
};

export default ShopPersonalInfoPage; 