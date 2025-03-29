'use client';

import React from 'react';
import FlowStepWrapper from '@/components/common/FlowStepWrapper';
import { FlowType, GenericStep } from '@/components/common/BookingStepper';
import UserInfoForm from '@/components/booking/UserInfoForm';
import { FlowStateData } from '@/components/common/FlowStepWrapper';
import { Product } from '../types';
import { Alert, Box, Typography } from '@mui/material';

interface UserInfoWrapperProps {
  productId: string;
}

const ShopUserInfoWrapper: React.FC<UserInfoWrapperProps> = ({ productId }) => {
  return (
    <FlowStepWrapper
      flowType={FlowType.ART_PURCHASE}
      activeStep={GenericStep.USER_INFO}
      expectedPreviousSteps={[]}  // No previous steps required since we start here
      title="Dina uppgifter"
      subtitle="Fyll i dina kontaktuppgifter för att fortsätta"
      validateData={(data: FlowStateData) => {
        // Verify we have product details
        return Boolean(data.itemDetails);
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
            
            <UserInfoForm 
              courseId={productId} // Reuse the course ID parameter for the product ID
              onNext={onNext} 
              onBack={onBack}
            />
          </>
        );
      }}
    </FlowStepWrapper>
  );
};

export default ShopUserInfoWrapper; 