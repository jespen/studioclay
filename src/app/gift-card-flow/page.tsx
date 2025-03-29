'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress, Typography } from '@mui/material';

export default function GiftCardFlow() {
  const router = useRouter();

  useEffect(() => {
    // Använd replace istället för push för att undvika att lägga till i historik
    router.replace('/gift-card-flow/selection');
  }, [router]);

  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '50vh'
    }}>
      <CircularProgress size={40} />
      <Typography variant="body1" sx={{ mt: 2 }}>
        Laddar presentkortsflödet...
      </Typography>
    </Box>
  );
} 