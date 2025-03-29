import React, { Suspense } from 'react';
import ShopConfirmationWrapper from '@/components/shop/wrappers/ShopConfirmationWrapper';

interface ShopConfirmationPageProps {
  params: {
    id: string;
  };
}

const ShopConfirmationPage: React.FC<ShopConfirmationPageProps> = ({ params }) => {
  return (
    <Suspense fallback={<div>Laddar bekräftelsesida...</div>}>
      <ShopConfirmationWrapper productId={params.id} />
    </Suspense>
  );
};

export default ShopConfirmationPage; 