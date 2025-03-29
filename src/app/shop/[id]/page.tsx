'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CircularProgress, Box } from '@mui/material';
import { saveItemDetails } from '@/utils/dataFetcher';
import { setFlowType } from '@/utils/flowStorage';
import { FlowType, GenericStep } from '@/components/common/BookingStepper';

interface ShopProductPageProps {
  params: {
    id: string;
  };
}

const ShopProductPage: React.FC<ShopProductPageProps> = ({ params }) => {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  // Redirect to details page to follow the flow
  useEffect(() => {
    if (!isRedirecting) {
      setIsRedirecting(true);
      
      // Setup flow type
      setFlowType(FlowType.ART_PURCHASE);
      
      // Redirect to details step
      router.replace(`/shop/${params.id}/details`);
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