'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import { Product } from './types';
import StyledButton from '../common/StyledButton';
import { saveItemDetails } from '@/utils/dataFetcher';

interface ProductDetailsProps {
  productId: string;
  onNext?: () => void;
}

const ProductDetails: React.FC<ProductDetailsProps> = ({ productId, onNext }) => {
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/products/${productId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch product: ${response.status}`);
        }
        
        const data = await response.json();
        setProduct(data);
        setLoading(false);
      } catch (err) {
        console.error('Error loading product details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load product details');
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  const handleContinue = () => {
    if (product) {
      // Save product data to be used in subsequent steps
      saveItemDetails(product);
      
      if (onNext) {
        onNext();
      } else {
        router.push(`/shop/${productId}/personal-info`);
      }
    }
  };

  const handleBackToShop = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !product) {
    return (
      <Box sx={{ my: 5 }}>
        <Typography color="error">{error || 'Kunde inte hitta produkten'}</Typography>
        <StyledButton secondary onClick={handleBackToShop} sx={{ mt: 2 }}>
          Tillbaka till butiken
        </StyledButton>
      </Box>
    );
  }

  return (
    <>
      <Typography variant="h4" component="h1" align="center" gutterBottom>
        {product.title}
      </Typography>
      
      <Paper 
        elevation={3} 
        sx={{ 
          borderRadius: 2, 
          p: { xs: 2, sm: 4 }, 
          mt: 4 
        }}
      >
        <Grid container spacing={4}>
          {/* Product Image */}
          <Grid item xs={12} md={6}>
            <Box 
              sx={{ 
                width: '100%', 
                height: { xs: '300px', md: '400px' },
                overflow: 'hidden',
                borderRadius: 2,
                bgcolor: 'grey.100'
              }}
            >
              <img 
                src={product.image} 
                alt={product.title}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain' 
                }}
              />
            </Box>
          </Grid>
          
          {/* Product Info */}
          <Grid item xs={12} md={6}>
            <Typography variant="h5" component="h2" gutterBottom>
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
                    variant="h4" 
                    component="span" 
                    sx={{ color: 'var(--primary)', fontWeight: 'bold' }}
                  >
                    {product.price} kr
                  </Typography>
                </>
              ) : (
                <Typography 
                  variant="h4" 
                  component="span" 
                  sx={{ color: 'var(--primary)', fontWeight: 'bold' }}
                >
                  {product.price} kr
                </Typography>
              )}
            </Box>
            
            <Typography variant="body1" paragraph>
              {product.description}
            </Typography>

            <Divider sx={{ my: 3 }} />
            
            <Alert severity="info" sx={{ mb: 3 }}>
              Produkter från butiken hämtas för närvarande på Studio Clay, Norrtullsgatan 65. Leverans är inte tillgängligt.
            </Alert>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
              <StyledButton 
                secondary
                onClick={handleBackToShop}
              >
                Tillbaka till butiken
              </StyledButton>
              
              <StyledButton 
                onClick={handleContinue}
              >
                Fortsätt till kassa
              </StyledButton>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </>
  );
};

export default ProductDetails; 