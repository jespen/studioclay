'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CircularProgress, Box } from '@mui/material';
import { saveItemDetails } from '@/utils/dataFetcher';
import { setFlowType } from '@/utils/flowStorage';
import { FlowType } from '@/components/common/BookingStepper';

interface ShopProductPageProps {
  params: {
    id: string;
  };
}

const ShopProductPage: React.FC<ShopProductPageProps> = ({ params }) => {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  // Redirect to personal-info page only once
  useEffect(() => {
    if (!isRedirecting) {
      setIsRedirecting(true);
      
      // Setup flow type first to prevent infinite loop warnings
      setFlowType(FlowType.ART_PURCHASE);
      
      // Fetch product data first (if needed)
      fetch(`/api/products/${params.id}`)
        .then(res => res.json())
        .then(product => {
          // Save product details to flow storage
          if (product && !product.error) {
            saveItemDetails(product);
          }
          // Redirect to personal-info step
          router.replace(`/shop/${params.id}/personal-info`);
        })
        .catch(err => {
          console.error("Error fetching product:", err);
          // Still redirect even if fetch fails
          router.replace(`/shop/${params.id}/personal-info`);
        });
    }
  }, [params.id, router, isRedirecting]);
  
  // Render a loading state while redirecting
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
      <CircularProgress />
    </Box>
  );
};

export default ShopProductPage; 