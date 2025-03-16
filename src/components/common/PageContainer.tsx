import React, { ReactNode } from 'react';
import { Container, Box, useTheme } from '@mui/material';

interface PageContainerProps {
  children: ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  centerContent?: boolean;
  paddingTop?: number;
  paddingBottom?: number;
}

/**
 * A standardized page container component for consistent spacing across pages
 */
const PageContainer: React.FC<PageContainerProps> = ({
  children,
  maxWidth = 'lg',
  centerContent = false,
  paddingTop = 4,
  paddingBottom = 6,
}) => {
  const theme = useTheme();

  return (
    <Container maxWidth={maxWidth}>
      <Box
        sx={{
          paddingTop: theme.spacing(paddingTop),
          paddingBottom: theme.spacing(paddingBottom),
          paddingX: { xs: theme.spacing(2), sm: theme.spacing(3) },
          display: 'flex',
          flexDirection: 'column',
          alignItems: centerContent ? 'center' : 'flex-start',
          textAlign: centerContent ? 'center' : 'left',
        }}
      >
        {children}
      </Box>
    </Container>
  );
};

export default PageContainer; 