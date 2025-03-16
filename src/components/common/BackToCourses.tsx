import React from 'react';
import { useRouter } from 'next/navigation';
import { Box } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import StyledButton from './StyledButton';

interface BackToCoursesProps {
  position?: 'top' | 'bottom';
  marginY?: number;
}

/**
 * A button to navigate back to the courses page
 */
const BackToCourses: React.FC<BackToCoursesProps> = ({ position = 'top', marginY = 2 }) => {
  const router = useRouter();

  const handleBackToCourses = () => {
    router.push('/courses');
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
        onClick={handleBackToCourses}
        data-testid="back-to-courses-button"
        sx={{ fontSize: '0.9rem' }}
      >
        Tillbaka till kurser
      </StyledButton>
    </Box>
  );
};

export default BackToCourses; 