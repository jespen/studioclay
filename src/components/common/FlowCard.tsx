'use client';

import React from 'react';
import { Box, BoxProps } from '@mui/material';

/**
 * Shared surface for every step in the purchase flows.
 * Replaces the old elevated Paper cards so padding, radius and width stay consistent.
 */
const FlowCard: React.FC<BoxProps> = ({ children, sx, ...props }) => {
  return (
    <Box
      {...props}
      sx={[
        {
          border: '1px solid var(--border)',
          borderRadius: 3,
          boxShadow: '0 1px 2px rgba(61, 84, 74, 0.04), 0 8px 24px rgba(61, 84, 74, 0.06)',
          backgroundColor: '#fff',
          p: { xs: 2.5, sm: 4 },
          maxWidth: 880,
          mx: 'auto',
          width: '100%',
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {children}
    </Box>
  );
};

export default FlowCard;
