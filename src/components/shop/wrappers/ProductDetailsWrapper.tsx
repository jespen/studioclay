'use client';

import React from 'react';
import FlowStepWrapper from '@/components/common/FlowStepWrapper';
import { FlowType, GenericStep } from '@/components/common/BookingStepper';
import ProductDetails from '../ProductDetails';
import { FlowStateData } from '@/components/common/FlowStepWrapper';

interface ProductDetailsWrapperProps {
  productId: string;
}

const ProductDetailsWrapper: React.FC<ProductDetailsWrapperProps> = ({ productId }) => {
  return (
    <FlowStepWrapper
      flowType={FlowType.ART_PURCHASE}
      activeStep={GenericStep.ITEM_SELECTION}
      title="Produktdetaljer"
      subtitle="Information om produkten"
      validateData={(data: FlowStateData) => {
        // We don't need to validate anything specific for the first step
        // Just ensure we have the product details
        return Boolean(data.itemDetails);
      }}
    >
      {({ onNext }) => (
        <ProductDetails 
          productId={productId} 
          onNext={onNext} 
        />
      )}
    </FlowStepWrapper>
  );
};

export default ProductDetailsWrapper; 