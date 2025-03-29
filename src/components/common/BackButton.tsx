import React from 'react';
import { useRouter } from 'next/navigation';
import { Box } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import StyledButton from './StyledButton';

interface BackButtonProps {
  position?: 'top' | 'bottom';
  marginY?: number;
  label?: string;
  url?: string;
}

/**
 * A generic back button that navigates to a specified URL
 */
const BackButton: React.FC<BackButtonProps> = ({ 
  position = 'top', 
  marginY = 2,
  label = 'Tillbaka',
  url = '/'
}) => {
  const router = useRouter();

  const handleBack = () => {
    router.push(url);
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: position === 'top' ? 'flex-start' : 'center',
        width: '100%',
        my: marginY,
        mb: position === 'top' ? 3 : marginY // Add more bottom margin when at top
      }}
    >
      <StyledButton
        secondary
        startIcon={<ArrowBackIcon />}
        onClick={handleBack}
        data-testid="back-button"
        sx={{ fontSize: '0.9rem' }}
      >
        {label}
      </StyledButton>
    </Box>
  );
};

export default BackButton; 