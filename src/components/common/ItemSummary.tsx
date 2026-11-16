'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';

export interface SummaryDetail {
  icon?: React.ReactNode;
  label: string;
}

interface ItemSummaryProps {
  title?: string;
  details?: SummaryDetail[];
  price?: string | number | null;
  priceSuffix?: string;
  priceNote?: string;
  originalPrice?: string | number | null;
}

/**
 * Compact price + detail row used at the top of a flow step.
 * Details wrap onto a second line when they do not fit; the price stays on the right.
 */
const ItemSummary: React.FC<ItemSummaryProps> = ({
  title,
  details = [],
  price,
  priceSuffix = 'kr',
  priceNote = 'Inklusive moms',
  originalPrice,
}) => {
  const hasPrice = price !== undefined && price !== null && price !== '';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' },
        justifyContent: 'space-between',
        gap: { xs: 1.5, sm: 3 },
        pb: 2.5,
        mb: 3,
        borderBottom: '1px solid var(--border)',
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        {title && (
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 700, mb: details.length ? 1 : 0, lineHeight: 1.3 }}
          >
            {title}
          </Typography>
        )}
        {details.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {details.map((detail, index) => (
              <Box
                key={`${detail.label}-${index}`}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1.25,
                  py: 0.4,
                  borderRadius: 999,
                  bgcolor: 'rgba(84, 114, 100, 0.08)',
                  color: 'var(--primary-dark)',
                  fontSize: '0.8125rem',
                  lineHeight: 1.3,
                  whiteSpace: 'nowrap',
                  '& .MuiSvgIcon-root': { fontSize: 15 },
                }}
              >
                {detail.icon}
                {detail.label}
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {hasPrice && (
        <Box sx={{ textAlign: { xs: 'left', sm: 'right' }, flexShrink: 0 }}>
          {originalPrice ? (
            <Typography
              variant="body2"
              sx={{ textDecoration: 'line-through', color: 'text.secondary', lineHeight: 1.2 }}
            >
              {originalPrice} {priceSuffix}
            </Typography>
          ) : null}
          <Typography
            variant="h4"
            sx={{ color: 'var(--primary)', fontWeight: 700, lineHeight: 1.1, fontSize: { xs: '1.75rem', sm: '2rem' } }}
          >
            {price} {priceSuffix}
          </Typography>
          {priceNote ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
              {priceNote}
            </Typography>
          ) : null}
        </Box>
      )}
    </Box>
  );
};

export default ItemSummary;
