'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Typography, 
  Box, 
  Alert, 
  CircularProgress, 
  Chip
} from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';
import FlowStepWrapper from '@/components/common/FlowStepWrapper';
import { FlowType, GenericStep } from '@/components/common/BookingStepper';
import FlowCard from '@/components/common/FlowCard';
import FlowActions from '@/components/common/FlowActions';
import ItemSummary from '@/components/common/ItemSummary';
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

    const stockDetails = product.stockQuantity !== undefined && product.inStock !== false
      ? [{ icon: <InventoryIcon />, label: `${product.stockQuantity} i lager` }]
      : product.inStock === false
        ? [{ label: 'Slutsåld' }]
        : [];

    return (
      <FlowCard>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, mb: 1 }}>
          <Box 
            sx={{ 
              width: { xs: '100%', md: '46%' }, 
              height: { xs: '260px', md: '320px' },
              position: 'relative',
              borderRadius: 2,
              overflow: 'hidden',
              flexShrink: 0,
              bgcolor: '#f4f5f4'
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
            
            <Box sx={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 1 }}>
              {product.isNew && (
                <Chip label="Ny" size="small" sx={{ bgcolor: 'var(--primary)', color: 'white' }} />
              )}
              {product.discount && (
                <Chip label={`-${product.discount}%`} size="small" sx={{ bgcolor: 'var(--primary-dark)', color: 'white' }} />
              )}
            </Box>
          </Box>
          
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <ItemSummary
              title={product.title}
              details={stockDetails}
              price={product.price}
              originalPrice={product.originalPrice}
              priceNote="Inklusive moms"
            />

            <Typography variant="body1" sx={{ mb: 2 }}>
              {product.description}
            </Typography>
            
            {product.inStock === false ? (
              <Alert severity="error">
                Tyvärr är denna produkt slutsåld.
              </Alert>
            ) : (
              <Alert severity="info">
                Produkter från butiken hämtas för närvarande på Studio Clay, Norrtullsgatan 65. Leverans är inte tillgängligt.
              </Alert>
            )}
          </Box>
        </Box>

        <FlowActions
          onBack={handleBack}
          onNext={handleContinue}
          nextDisabled={product.inStock === false}
          nextLabel={product.inStock === false ? 'Slutsåld' : 'Fortsätt till dina uppgifter'}
        />
      </FlowCard>
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