import React, { Suspense } from 'react';
import ShopPaymentWrapper from '@/components/shop/wrappers/PaymentWrapper';

interface ShopPaymentPageProps {
  params: {
    id: string;
  };
}

const ShopPaymentPage: React.FC<ShopPaymentPageProps> = ({ params }) => {
  return (
    <Suspense fallback={<div>Laddar betalningssida...</div>}>
      <ShopPaymentWrapper productId={params.id} />
    </Suspense>
  );
};

export default ShopPaymentPage; 