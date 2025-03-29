'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Typography, 
  Paper, 
  Box, 
  Alert, 
  CircularProgress, 
  Divider, 
  Chip
} from '@mui/material';
import FlowStepWrapper from '@/components/common/FlowStepWrapper';
import { FlowType, GenericStep } from '@/components/common/BookingStepper';
import StyledButton from '@/components/common/StyledButton';
import { Product } from '@/components/shop/types';
import { saveItemDetails } from '@/utils/dataFetcher';

interface ProductDetailsPageProps {
  params: {
    id: string;
  };
}

const ProductDetailsPage: React.FC<ProductDetailsPageProps> = ({ params }) => {
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/products/${params.id}`);
        if (!response.ok) {
          throw new Error('Failed to load product details');
        }
        
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }
        
        setProduct(data);
        // Save product details to flow storage
        saveItemDetails(data);
      } catch (err) {
        console.error('Error loading product:', err);
        setError(err instanceof Error ? err.message : 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [params.id]);

  const handleContinue = () => {
    router.push(`/shop/${params.id}/personal-info`);
  };

  const handleBack = () => {
    router.push('/');
  };

  const renderContent = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (error || !product) {
      return (
        <Alert severity="error" sx={{ my: 3 }}>
          {error || 'Failed to load product details. Please try again.'}
        </Alert>
      );
    }

    return (
      <Paper elevation={3} sx={{ borderRadius: 2, p: { xs: 2, sm: 4 }, mt: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
          {/* Product Image */}
          <Box 
            sx={{ 
              width: { xs: '100%', md: '50%' }, 
              height: { xs: '300px', md: '400px' },
              position: 'relative',
              borderRadius: 1,
              overflow: 'hidden'
            }}
          >
            <img
              src={product.image}
              alt={product.title}
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover' 
              }}
            />
            
            {/* Tags */}
            <Box sx={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 1 }}>
              {product.isNew && (
                <Chip label="Ny" color="primary" size="small" />
              )}
              {product.discount && (
                <Chip label={`-${product.discount}%`} color="secondary" size="small" />
              )}
            </Box>
          </Box>
          
          {/* Product Details */}
          <Box sx={{ width: { xs: '100%', md: '50%' } }}>
            <Typography variant="h4" component="h1" gutterBottom>
              {product.title}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 2 }}>
              {product.originalPrice ? (
                <>
                  <Typography 
                    variant="body1" 
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
                    variant="h5" 
                    component="span" 
                    sx={{ color: 'var(--primary)', fontWeight: 'bold' }}
                  >
                    {product.price} kr
                  </Typography>
                </>
              ) : (
                <Typography 
                  variant="h5" 
                  component="span" 
                  sx={{ color: 'var(--primary)', fontWeight: 'bold' }}
                >
                  {product.price} kr
                </Typography>
              )}
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="body1" paragraph>
              {product.description}
            </Typography>
            
            <Alert severity="info" sx={{ mb: 3 }}>
              Produkter från butiken hämtas för närvarande på Studio Clay, Norrtullsgatan 65. Leverans är inte tillgängligt.
            </Alert>
          </Box>
        </Box>
        
        <Divider sx={{ my: 3 }} />
        
        {/* Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <StyledButton 
            secondary
            onClick={handleBack}
          >
            Tillbaka
          </StyledButton>
          
          <StyledButton 
            onClick={handleContinue}
          >
            Fortsätt till dina uppgifter
          </StyledButton>
        </Box>
      </Paper>
    );
  };

  return (
    <FlowStepWrapper
      flowType={FlowType.ART_PURCHASE}
      activeStep={GenericStep.DETAILS}
      title="Produktdetaljer"
      subtitle="Granska produkten innan du fortsätter"
      validateData={() => loading || !!product}
      itemId={params.id}
      redirectOnInvalid={!loading}
    >
      {() => renderContent()}
    </FlowStepWrapper>
  );
};

export default ProductDetailsPage; 