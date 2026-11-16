'use client';

import React from 'react';
import { Box } from '@mui/material';
import StyledButton from './StyledButton';

interface FlowActionsProps {
  onBack?: () => void;
  backLabel?: string;
  backDisabled?: boolean;
  onNext?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  nextType?: 'button' | 'submit';
  nextEndIcon?: React.ReactNode;
  /** Small print rendered above the buttons, e.g. terms. */
  note?: React.ReactNode;
}

/**
 * Standard back / continue row. Buttons go full width and stack on small screens,
 * with the primary action first.
 */
const FlowActions: React.FC<FlowActionsProps> = ({
  onBack,
  backLabel = 'Tillbaka',
  backDisabled = false,
  onNext,
  nextLabel = 'Fortsätt',
  nextDisabled = false,
  nextType = 'button',
  nextEndIcon,
  note,
}) => {
  return (
    <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid var(--border)' }}>
      {note ? (
        <Box sx={{ mb: 2, color: 'text.secondary', fontSize: '0.75rem', lineHeight: 1.5 }}>
          {note}
        </Box>
      ) : null}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: 'stretch',
          gap: 1.5,
        }}
      >
        {onBack ? (
          <StyledButton
            secondary
            type="button"
            onClick={onBack}
            disabled={backDisabled}
            sx={{ order: { xs: 1, sm: 0 }, width: { xs: '100%', sm: 'auto' } }}
          >
            {backLabel}
          </StyledButton>
        ) : (
          <span />
        )}
        <StyledButton
          type={nextType}
          onClick={onNext}
          disabled={nextDisabled}
          endIcon={nextEndIcon}
          sx={{ order: { xs: 0, sm: 1 }, width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 180 } }}
        >
          {nextLabel}
        </StyledButton>
      </Box>
    </Box>
  );
};

export default FlowActions;
