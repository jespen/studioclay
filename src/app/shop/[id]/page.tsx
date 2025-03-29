import React, { Suspense } from 'react';
import ProductDetailsWrapper from '@/components/shop/wrappers/ProductDetailsWrapper';

interface ShopProductPageProps {
  params: {
    id: string;
  };
}

const ShopProductPage: React.FC<ShopProductPageProps> = ({ params }) => {
  return (
    <Suspense fallback={<div>Laddar produktdetaljer...</div>}>
      <ProductDetailsWrapper productId={params.id} />
    </Suspense>
  );
};

export default ShopProductPage; 