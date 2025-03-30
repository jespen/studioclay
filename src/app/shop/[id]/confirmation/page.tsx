import React, { Suspense } from 'react';
import ShopConfirmationWrapper from '@/components/shop/wrappers/ShopConfirmationWrapper';

interface ShopConfirmationPageProps {
  params: {
    id: string;
  };
  searchParams?: {
    reference?: string;
  };
}

const ShopConfirmationPage: React.FC<ShopConfirmationPageProps> = ({ params, searchParams }) => {
  // Extract the reference from searchParams if available
  const orderReference = searchParams?.reference;
  
  return (
    <Suspense fallback={<div>Laddar bekräftelsesida...</div>}>
      <ShopConfirmationWrapper 
        productId={params.id} 
        orderReference={orderReference} 
      />
    </Suspense>
  );
};

export default ShopConfirmationPage; 