'use client';

import React from 'react';
import FlowStepWrapper from '@/components/common/FlowStepWrapper';
import { FlowType, GenericStep } from '@/components/common/BookingStepper';
import PaymentSelection from '@/components/booking/PaymentSelection';
import { FlowStateData } from '@/components/common/FlowStepWrapper';
import { Product } from '../types';
import { Alert, Box, Typography } from '@mui/material';

interface PaymentWrapperProps {
  productId: string;
}

const ShopPaymentWrapper: React.FC<PaymentWrapperProps> = ({ productId }) => {
  return (
    <FlowStepWrapper
      flowType={FlowType.ART_PURCHASE}
      activeStep={GenericStep.PAYMENT}
      expectedPreviousSteps={[GenericStep.USER_INFO]}
      title="Betalning"
      subtitle="Välj betalningssätt"
      validateData={(data: FlowStateData) => {
        // Verify we have product details and user info
        return Boolean(data.itemDetails) && Boolean(data.userInfo);
      }}
      itemId={productId}
    >
      {({ onNext, onBack, flowData }) => {
        const product = flowData.itemDetails as Product;
        
        return (
          <>
            {/* Visa produktinformation som en sammanfattning */}
            {product && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" gutterBottom>
                  {product.title}
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 2 }}>
                  {product.originalPrice ? (
                    <>
                      <Typography 
                        variant="body2" 
                        component="span" 
                        sx={{ 
                          textDecoration: 'line-through', 
                          color: 'text.secondary',
                          mr: 1
                        }}
                      >
                        {product.originalPrice} kr
                      </Typography>
                      <Typography 
                        variant="h6" 
                        component="span" 
                        sx={{ color: 'var(--primary)', fontWeight: 'bold' }}
                      >
                        {product.price} kr
                      </Typography>
                    </>
                  ) : (
                    <Typography 
                      variant="h6" 
                      component="span" 
                      sx={{ color: 'var(--primary)', fontWeight: 'bold' }}
                    >
                      {product.price} kr
                    </Typography>
                  )}
                </Box>
                
                <Alert severity="info" sx={{ mb: 3 }}>
                  Produkter från butiken hämtas för närvarande på Studio Clay, Norrtullsgatan 65. Leverans är inte tillgängligt.
                </Alert>
              </Box>
            )}
            
            <PaymentSelection 
              courseId={productId}
              flowType={FlowType.ART_PURCHASE}
              onNext={onNext} 
              onBack={onBack}
              flowData={flowData}
            />
          </>
        );
      }}
    </FlowStepWrapper>
  );
};

export default ShopPaymentWrapper; 